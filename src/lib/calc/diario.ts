import type { DiarioMental, Torneio } from "@/lib/types";
import {
  ehItm,
  investimento,
  profundidade,
  type IndiceSatelites,
} from "@/lib/calc/metricas";

export interface FaixaMental {
  torneios: number;
  /** Média de profundidade no campo, 0–1. O estimador estável. */
  profundidadeMedia: number;
  itmPct: number;
  disciplina: number;
  lucroMedio: number;
}

/**
 * Quando a resposta foi dada em relação ao torneio.
 *
 * É a distinção que separa uma conclusão honesta de uma invertida. "Dormi
 * bem?" é respondido ANTES de sentar, então uma diferença no resultado pode ser
 * lida como influência. "Houve tilt?" é respondido DEPOIS — e tilt costuma ser
 * consequência de ter perdido, não causa. Tratar os dois igual faria o produto
 * afirmar que evitar tilt melhora o resultado quando o que os dados mostram é
 * que perder provoca tilt.
 */
export type Momento = "antes" | "depois";

export interface Contraste {
  chave: string;
  pergunta: string;
  rotuloSim: string;
  rotuloNao: string;
  momento: Momento;
  /** Qual lado é o desejável — define a direção da leitura. */
  bomEhSim: boolean;
  sim: FaixaMental;
  nao: FaixaMental;
  /** Diferença de profundidade em pontos percentuais (lado bom − lado ruim). */
  diferenca: number;
  amostraSuficiente: boolean;
  leitura: string;
}

const AMOSTRA_MINIMA = 8;
/** Abaixo disso a diferença não se distingue de ruído nesta amostra. */
const LIMIAR_PONTOS = 5;

function medir(torneios: Torneio[], idx: IndiceSatelites): FaixaMental {
  const n = torneios.length;
  if (!n) {
    return { torneios: 0, profundidadeMedia: 0, itmPct: 0, disciplina: 0, lucroMedio: 0 };
  }
  const profundidades = torneios.map(profundidade).filter((p): p is number => p !== null);
  const comNota = torneios.filter((t) => t.notaDisciplina !== null);
  const lucro = torneios.reduce(
    (a, t) => a + t.premiacao - investimento(t, t.sateliteId ? idx.get(t.sateliteId) : null),
    0,
  );

  return {
    torneios: n,
    profundidadeMedia: profundidades.length
      ? profundidades.reduce((a, p) => a + p, 0) / profundidades.length
      : 0,
    itmPct: (torneios.filter(ehItm).length / n) * 100,
    disciplina: comNota.length
      ? comNota.reduce((a, t) => a + (t.notaDisciplina ?? 0), 0) / comNota.length
      : 0,
    lucroMedio: lucro / n,
  };
}

interface Definicao {
  chave: string;
  pergunta: string;
  rotuloSim: string;
  rotuloNao: string;
  momento: Momento;
  bomEhSim: boolean;
  campo: (d: DiarioMental) => boolean | null;
}

const DEFINICOES: Definicao[] = [
  {
    chave: "sono",
    pergunta: "Dormi bem?",
    rotuloSim: "Dormiu bem",
    rotuloNao: "Dormiu mal",
    momento: "antes",
    bomEhSim: true,
    campo: (d) => d.dormiuBem,
  },
  {
    chave: "calma",
    pergunta: "Estou calmo?",
    rotuloSim: "Calmo",
    rotuloNao: "Agitado",
    momento: "antes",
    bomEhSim: true,
    campo: (d) => d.calmo,
  },
  {
    chave: "recuperar",
    pergunta: "Estou tentando recuperar perdas?",
    rotuloSim: "Tentando recuperar",
    rotuloNao: "Sem essa pressão",
    momento: "antes",
    bomEhSim: false,
    campo: (d) => d.tentandoRecuperar,
  },
  {
    chave: "tilt",
    pergunta: "Houve tilt?",
    rotuloSim: "Com tilt",
    rotuloNao: "Sem tilt",
    momento: "depois",
    bomEhSim: false,
    campo: (d) => d.houveTilt,
  },
];

function redigir(def: Definicao, sim: FaixaMental, nao: FaixaMental, diferenca: number): string {
  const bom = def.bomEhSim ? def.rotuloSim.toLowerCase() : def.rotuloNao.toLowerCase();
  const ruim = def.bomEhSim ? def.rotuloNao.toLowerCase() : def.rotuloSim.toLowerCase();
  const ladoBom = def.bomEhSim ? sim : nao;
  const ladoRuim = def.bomEhSim ? nao : sim;
  const nBom = ladoBom.torneios;
  const nRuim = ladoRuim.torneios;
  const deltaItm = ladoBom.itmPct - ladoRuim.itmPct;

  if (Math.abs(diferenca) < LIMIAR_PONTOS) {
    // Profundidade parada com ITM muito diferente não é "nada acontecendo":
    // é ir igual de fundo e converter menos. Chamar isso de "sem diferença"
    // esconderia o achado mais útil deste contraste.
    if (Math.abs(deltaItm) >= 10) {
      const achado = `Você termina a alturas parecidas do campo nos dois casos, mas converte bem menos: ITM de ${ladoBom.itmPct.toFixed(0)}% ${def.momento === "antes" ? `sentando ${bom}` : `${bom}`} contra ${ladoRuim.itmPct.toFixed(0)}% ${ruim}. A diferença aparece na hora de fechar, não na de chegar.`;
      return def.momento === "depois"
        ? `${achado} Como a resposta é dada depois do jogo, leia como retrato, não como causa.`
        : achado;
    }
    return `Sem diferença clara: ${diferenca >= 0 ? "+" : "−"}${Math.abs(diferenca).toFixed(0)} pontos de profundidade entre os dois lados, dentro do que o acaso explica nesta amostra.`;
  }

  if (def.momento === "depois") {
    // Nunca em linguagem causal: esta resposta veio depois do resultado.
    return diferenca > 0
      ? `Nos ${nRuim} torneios em que você registrou ${ruim}, terminou ${Math.abs(diferenca).toFixed(0)} pontos menos fundo. Registrado depois do jogo — provavelmente é reflexo de ter perdido, não a causa.`
      : `Curiosamente, os ${nRuim} torneios com ${ruim} terminaram mais fundo. Como a resposta é dada depois do jogo, não dá para tirar conclusão de causa daqui.`;
  }

  return diferenca > 0
    ? `Sentando ${bom} você termina ${Math.abs(diferenca).toFixed(0)} pontos mais fundo no campo — ${nBom} torneios contra ${nRuim}. A resposta é dada antes de jogar, então aqui a ordem dos fatos ajuda.`
    : `Contra o esperado, sentar ${ruim} rendeu ${Math.abs(diferenca).toFixed(0)} pontos a mais nesta amostra. Vale seguir registrando antes de tirar conclusão.`;
}

export function contrastesMentais(
  diario: DiarioMental[],
  torneios: Torneio[],
  idx: IndiceSatelites,
): Contraste[] {
  const porId = new Map(torneios.map((t) => [t.id, t]));

  return DEFINICOES.map((def) => {
    const comSim: Torneio[] = [];
    const comNao: Torneio[] = [];

    for (const d of diario) {
      if (!d.torneioId) continue;
      const t = porId.get(d.torneioId);
      if (!t) continue;
      const valor = def.campo(d);
      if (valor === null) continue;
      (valor ? comSim : comNao).push(t);
    }

    const sim = medir(comSim, idx);
    const nao = medir(comNao, idx);
    const ladoBom = def.bomEhSim ? sim : nao;
    const ladoRuim = def.bomEhSim ? nao : sim;
    const diferenca = (ladoBom.profundidadeMedia - ladoRuim.profundidadeMedia) * 100;

    return {
      chave: def.chave,
      pergunta: def.pergunta,
      rotuloSim: def.rotuloSim,
      rotuloNao: def.rotuloNao,
      momento: def.momento,
      bomEhSim: def.bomEhSim,
      sim,
      nao,
      diferenca,
      amostraSuficiente: sim.torneios >= AMOSTRA_MINIMA && nao.torneios >= AMOSTRA_MINIMA,
      leitura: redigir(def, sim, nao, diferenca),
    };
  });
}

export interface ResumoDiario {
  registros: number;
  /** Check-ins ainda sem sessão fechada. */
  abertos: number;
  taxaSonoBom: number;
  taxaTilt: number;
  taxaRecuperacao: number;
}

export function resumirDiario(diario: DiarioMental[]): ResumoDiario {
  const n = diario.length;
  const comTilt = diario.filter((d) => d.houveTilt !== null);
  return {
    registros: n,
    abertos: diario.filter((d) => d.houveTilt === null).length,
    taxaSonoBom: n ? (diario.filter((d) => d.dormiuBem).length / n) * 100 : 0,
    taxaTilt: comTilt.length
      ? (comTilt.filter((d) => d.houveTilt).length / comTilt.length) * 100
      : 0,
    taxaRecuperacao: n ? (diario.filter((d) => d.tentandoRecuperar).length / n) * 100 : 0,
  };
}

/**
 * O que aconteceu historicamente quando o jogador sentou tentando recuperar
 * perdas. Alimenta a intervenção do check-in — que só é convincente com o
 * número do próprio jogador na frente, e não com um conselho genérico.
 */
export function historicoRecuperacao(
  diario: DiarioMental[],
  torneios: Torneio[],
  idx: IndiceSatelites,
) {
  const contraste = contrastesMentais(diario, torneios, idx).find((c) => c.chave === "recuperar");
  if (!contraste) return null;
  return {
    torneios: contraste.sim.torneios,
    lucroMedio: contraste.sim.lucroMedio,
    lucroMedioNormal: contraste.nao.lucroMedio,
    profundidade: contraste.sim.profundidadeMedia,
    profundidadeNormal: contraste.nao.profundidadeMedia,
    disciplina: contraste.sim.disciplina,
    disciplinaNormal: contraste.nao.disciplina,
    amostraSuficiente: contraste.amostraSuficiente,
  };
}

import type { NivelEnergia, Satelite, Torneio, ViaEntrada } from "@/lib/types";
import { NIVEIS_ENERGIA } from "@/lib/types";
import {
  custoSatelite,
  ehItm,
  ehMesaFinal,
  investimento,
  investimentoABalcao,
  type IndiceSatelites,
} from "@/lib/calc/metricas";

export interface EstatisticasSatelites {
  disputados: number;
  entradasTotais: number;
  classificados: number;
  taxaClassificacao: number;
  investido: number;
  /** Soma do buy-in de balcão das vagas conquistadas. */
  valorVagas: number;
  /**
   * Retorno sobre o investido tratando cada vaga pelo valor de face do
   * principal. É a leitura padrão de EV de satélite — e vale lembrar que ela
   * só se sustenta se o jogador realmente compraria aquele buy-in.
   */
  roi: number;
  custoMedioPorVaga: number;
  /** Valor das vagas menos TUDO que foi gasto em satélites, inclusive os perdidos. */
  economiaLiquida: number;
  minutosJogados: number;
  melhorSequencia: number;
  sequenciaAtual: number;
  /** Últimos resultados, do mais recente para o mais antigo. */
  ultimos: { id: string; classificou: boolean; data: string }[];
}

export function estatisticasSatelites(satelites: Satelite[]): EstatisticasSatelites {
  const ordenados = [...satelites].sort((a, b) => a.data.localeCompare(b.data));
  const classificados = ordenados.filter((s) => s.classificou);
  const investido = ordenados.reduce((a, s) => a + custoSatelite(s), 0);
  const valorVagas = classificados.reduce((a, s) => a + s.valorVaga, 0);

  let melhor = 0;
  let corrente = 0;
  for (const s of ordenados) {
    corrente = s.classificou ? corrente + 1 : 0;
    melhor = Math.max(melhor, corrente);
  }

  return {
    disputados: ordenados.length,
    entradasTotais: ordenados.reduce((a, s) => a + s.entradas, 0),
    classificados: classificados.length,
    taxaClassificacao: ordenados.length ? (classificados.length / ordenados.length) * 100 : 0,
    investido,
    valorVagas,
    roi: investido > 0 ? ((valorVagas - investido) / investido) * 100 : 0,
    custoMedioPorVaga: classificados.length ? investido / classificados.length : 0,
    economiaLiquida: valorVagas - investido,
    minutosJogados: ordenados.reduce((a, s) => a + s.tempoJogadoMin, 0),
    melhorSequencia: melhor,
    sequenciaAtual: corrente,
    ultimos: ordenados
      .slice(-12)
      .reverse()
      .map((s) => ({ id: s.id, classificou: s.classificou, data: s.data })),
  };
}

// ── satélite × entrada direta ──────────────────────────────────────────────

export interface DesempenhoPorVia {
  via: ViaEntrada;
  torneios: number;
  investido: number;
  retorno: number;
  lucro: number;
  /** ROI sobre o que foi efetivamente pago para entrar. */
  roi: number;
  /**
   * ROI cobrando o buy-in de balcão dos dois lados. É o número que compara
   * DESEMPENHO — o `roi` acima mistura desempenho com desconto na entrada.
   */
  roiBalcao: number;
  itmPct: number;
  mesaFinalPct: number;
  premioMedio: number;
  /** Lucro real médio por torneio: já embute desconto de entrada e desempenho. */
  lucroMedio: number;
  duracaoMediaMin: number;
  disciplina: number;
  /** Índice 0–4 na escala de energia; null quando não há registro. */
  energiaMedia: number | null;
}

function desempenho(via: ViaEntrada, torneios: Torneio[], idx: IndiceSatelites): DesempenhoPorVia {
  const grupo = torneios.filter((t) => t.via === via);
  const investido = grupo.reduce(
    (a, t) => a + investimento(t, t.sateliteId ? idx.get(t.sateliteId) : null),
    0,
  );
  const investidoBalcao = grupo.reduce((a, t) => a + investimentoABalcao(t), 0);
  const retorno = grupo.reduce((a, t) => a + t.premiacao, 0);
  const comNota = grupo.filter((t) => t.notaDisciplina !== null);
  const comEnergia = grupo.filter((t) => t.energia !== null);
  const n = grupo.length;

  return {
    via,
    torneios: n,
    investido,
    retorno,
    lucro: retorno - investido,
    roi: investido > 0 ? ((retorno - investido) / investido) * 100 : 0,
    roiBalcao: investidoBalcao > 0 ? ((retorno - investidoBalcao) / investidoBalcao) * 100 : 0,
    itmPct: n ? (grupo.filter(ehItm).length / n) * 100 : 0,
    mesaFinalPct: n ? (grupo.filter(ehMesaFinal).length / n) * 100 : 0,
    premioMedio: n ? retorno / n : 0,
    lucroMedio: n ? (retorno - investido) / n : 0,
    duracaoMediaMin: n ? grupo.reduce((a, t) => a + t.duracaoMin, 0) / n : 0,
    disciplina: comNota.length
      ? comNota.reduce((a, t) => a + (t.notaDisciplina ?? 0), 0) / comNota.length
      : 0,
    energiaMedia: comEnergia.length
      ? comEnergia.reduce(
          (a, t) => a + NIVEIS_ENERGIA.indexOf(t.energia as NivelEnergia),
          0,
        ) / comEnergia.length
      : null,
  };
}

/**
 * As duas forças opostas do satélite, em reais por torneio, e a soma delas.
 *
 * A identidade fecha exatamente: economia na entrada + diferença de
 * desempenho = diferença de lucro real. Para a entrada direta o custo pago e
 * o de balcão são o mesmo número, e é isso que faz os termos se cancelarem.
 * Mostrar a conta em vez de só o veredito é o que permite ao jogador
 * discordar com fundamento.
 */
export interface Decomposicao {
  /** Quanto o satélite economiza na vaga, por torneio. */
  economiaEntrada: number;
  /** Quanto se perde (ou ganha) jogando, por torneio. */
  diferencaDesempenho: number;
  /** A soma — igual à diferença de lucro real por torneio. */
  saldo: number;
}

export interface Comparacao {
  direto: DesempenhoPorVia;
  satelite: DesempenhoPorVia;
  decomposicao: Decomposicao;
  /**
   * Diferença de desempenho em pontos percentuais, com o custo de entrada
   * normalizado a balcão nos dois lados. Negativo = joga pior via satélite.
   */
  deltaDesempenho: number;
  /** Diferença no lucro real por torneio, em reais. É a linha de baixo. */
  deltaLucroPorTorneio: number;
  /** Quanto mais cansado chega via satélite, em passos da escala de energia. */
  deltaEnergia: number | null;
  /** Amostra suficiente para tratar a diferença como sinal, não ruído. */
  amostraSuficiente: boolean;
}

const AMOSTRA_MINIMA = 8;

export function compararVias(torneios: Torneio[], idx: IndiceSatelites): Comparacao {
  const direto = desempenho("direto", torneios, idx);
  const satelite = desempenho("satelite", torneios, idx);

  const medioBalcao = (via: ViaEntrada) => {
    const grupo = torneios.filter((t) => t.via === via);
    return grupo.length
      ? grupo.reduce((a, t) => a + investimentoABalcao(t), 0) / grupo.length
      : 0;
  };
  const medioPago = (d: DesempenhoPorVia) => (d.torneios ? d.investido / d.torneios : 0);
  const medioRetorno = (d: DesempenhoPorVia) => (d.torneios ? d.retorno / d.torneios : 0);

  const economiaEntrada = medioBalcao("satelite") - medioPago(satelite);
  const diferencaDesempenho =
    medioRetorno(satelite) -
    medioBalcao("satelite") -
    (medioRetorno(direto) - medioBalcao("direto"));

  return {
    direto,
    satelite,
    decomposicao: {
      economiaEntrada,
      diferencaDesempenho,
      saldo: economiaEntrada + diferencaDesempenho,
    },
    deltaDesempenho: satelite.roiBalcao - direto.roiBalcao,
    deltaLucroPorTorneio: satelite.lucroMedio - direto.lucroMedio,
    deltaEnergia:
      satelite.energiaMedia !== null && direto.energiaMedia !== null
        ? satelite.energiaMedia - direto.energiaMedia
        : null,
    amostraSuficiente:
      direto.torneios >= AMOSTRA_MINIMA && satelite.torneios >= AMOSTRA_MINIMA,
  };
}

// ── recomendação ───────────────────────────────────────────────────────────

export type Veredito = "favoravel" | "neutro" | "contrario";

export interface Recomendacao {
  veredito: Veredito;
  titulo: string;
  corpo: string;
  /** O que sustenta a conclusão — mostrado sob a recomendação. */
  evidencias: string[];
}

/**
 * A pergunta que a feature existe para responder.
 *
 * O veredito sai de duas forças que puxam para lados opostos e são medidas
 * separadamente: o satélite BARATEIA a entrada (ganho) e, quando cansa o
 * jogador, PIORA o desempenho na mesa (perda). Somar as duas dá o lucro real
 * por torneio, que é a linha de baixo. Sem amostra, o produto diz que ainda
 * não sabe em vez de inventar convicção.
 */
export function recomendar(
  comp: Comparacao,
  stats: EstatisticasSatelites,
  bankroll: number,
  buyInPadrao: number,
): Recomendacao {
  const evidencias: string[] = [];
  const { deltaDesempenho, deltaLucroPorTorneio, deltaEnergia, direto, satelite } = comp;

  if (stats.disputados > 0) {
    evidencias.push(
      `Você classifica em ${stats.taxaClassificacao.toFixed(0)}% dos satélites que disputa — ${stats.classificados} vagas em ${stats.disputados} tentativas.`,
    );
    evidencias.push(
      `Cada vaga saiu por ${Math.round(stats.custoMedioPorVaga)} reais, contra ${Math.round(buyInPadrao)} de balcão.`,
    );
  }

  if (!comp.amostraSuficiente) {
    return {
      veredito: "neutro",
      titulo: "Amostra ainda pequena para concluir",
      corpo: `Com ${satelite.torneios} torneios via satélite e ${direto.torneios} diretos, a diferença observada ainda cabe dentro do acaso. Continue registrando — o Oblix avisa quando o padrão se firmar.`,
      evidencias,
    };
  }

  evidencias.push(
    `Com o custo de entrada igualado a balcão dos dois lados, seu desempenho é de ${direto.roiBalcao.toFixed(0)}% entrando direto e ${satelite.roiBalcao.toFixed(0)}% via satélite.`,
  );

  if (deltaEnergia !== null && deltaEnergia <= -0.4) {
    evidencias.push(
      "Você chega mensuravelmente mais cansado nos torneios em que jogou o satélite antes.",
    );
  }

  const cabeNoBankroll = bankroll >= buyInPadrao * 20;

  if (deltaLucroPorTorneio >= 15) {
    return {
      veredito: "favoravel",
      titulo: "Os satélites estão aumentando sua lucratividade",
      corpo: `Entrar via satélite rende ${Math.round(deltaLucroPorTorneio)} reais a mais por torneio que a entrada direta. A economia na vaga mais que compensa qualquer desgaste — vale seguir priorizando o satélite.`,
      evidencias,
    };
  }

  if (deltaLucroPorTorneio <= -15) {
    return {
      veredito: "contrario",
      titulo: "Você joga melhor entrando diretamente",
      corpo: `Apesar de baratear a vaga, entrar via satélite custa ${Math.abs(Math.round(deltaLucroPorTorneio))} reais por torneio no resultado final: seu desempenho na mesa cai ${Math.abs(deltaDesempenho).toFixed(0)} pontos e come a economia.${
        cabeNoBankroll
          ? " Sua banca comporta o buy-in de balcão — a economia não está se pagando."
          : " Como a banca ainda é curta, o satélite segue defensável para controlar risco, mas sem esperar ganho."
      }`,
      evidencias,
    };
  }

  return {
    veredito: "neutro",
    titulo: "As duas vias estão empatadas",
    corpo: `A diferença no lucro por torneio é de apenas ${Math.abs(Math.round(deltaLucroPorTorneio))} reais. O que o satélite economiza na entrada, ele devolve na mesa. Decida pelo bankroll e pela agenda do dia — o histórico não aponta vantagem clara.`,
    evidencias,
  };
}

// ── energia × via ──────────────────────────────────────────────────────────

export interface EnergiaPorVia {
  nivel: NivelEnergia;
  direto: number;
  satelite: number;
}

export function distribuicaoEnergia(torneios: Torneio[]): EnergiaPorVia[] {
  return NIVEIS_ENERGIA.map((nivel) => ({
    nivel,
    direto: torneios.filter((t) => t.via === "direto" && t.energia === nivel).length,
    satelite: torneios.filter((t) => t.via === "satelite" && t.energia === nivel).length,
  }));
}

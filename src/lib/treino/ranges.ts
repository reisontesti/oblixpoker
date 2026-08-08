import { interpretarRange, type Mao } from "@/lib/treino/maos";
import type { Acao, Posicao, Situacao } from "@/lib/treino/tipos";

/**
 * A camada de dados do Treino: os ranges do Oblix.
 *
 * **Sobre a procedência (§25).** Nada aqui é copiado de solver, de curso ou de
 * ferramenta de terceiros. São ranges de referência escritos para este produto
 * a partir de princípios públicos e amplamente ensinados — posição mais
 * atrasada abre mais largo, stack mais curto empurra mais largo, pagar all-in
 * exige mais do que empurrar. São opinião declarada do Oblix, não verdade
 * absoluta, e é assim que a interface os apresenta.
 *
 * **Por que notação e não grade.** Escrever "77+, ATs+, KQs, AJo+" cabe numa
 * linha e qualquer jogador consegue revisar. Uma grade de 169 células seria
 * ilegível e ninguém revisaria — e conteúdo de poker errado num produto de
 * treinamento é pior do que conteúdo ausente.
 *
 * **Frequências.** Uma banda sem `frequencia` é 100% daquela ação. Bandas com
 * frequência menor deixam o resto para o fold, que é o padrão de tudo que não
 * aparece em banda nenhuma.
 */

export interface Banda {
  acao: Acao;
  maos: string;
  /** 0 a 1. Ausente significa 1. */
  frequencia?: number;
  tamanhoBB?: number;
}

export interface EntradaRange {
  situacao: Situacao;
  posicao: Posicao;
  /** Faixa de stack efetivo em BB, ambos inclusive. */
  stackMin: number;
  stackMax: number;
  /** Só para `vs_shove`: de que posição veio o all-in. */
  agressor?: Posicao;
  bandas: Banda[];
  explicacao: string;
}

const ABRE = (maos: string, tamanhoBB: number, frequencia?: number): Banda => ({
  acao: "raise",
  maos,
  tamanhoBB,
  frequencia,
});

// ── abertura, stacks de 25 BB para cima ────────────────────────────────────
//
// Abrir com 2,2 BB é o tamanho corrente em MTT: pressiona os blinds sem
// comprometer stack quando alguém reaumenta. A largura cresce a cada posição
// porque sobra menos gente para agir depois — no BTN só faltam dois, no UTG
// faltam sete.

const ABERTURAS: [Posicao, string, string][] = [
  [
    "UTG",
    "77+, ATs+, KTs+, QTs+, JTs, AJo+, KQo",
    "De UTG ainda faltam sete jogadores para agir. O range fecha em mãos que aguentam ser reaumentadas e jogam bem fora de posição.",
  ],
  [
    "UTG+1",
    "66+, A9s+, KTs+, QTs+, JTs, T9s, ATo+, KQo",
    "Uma cadeira depois do UTG: um adversário a menos para agir, um pouco mais de largura.",
  ],
  [
    "MP",
    "55+, A8s+, K9s+, Q9s+, J9s+, T9s, ATo+, KJo+",
    "No meio da mesa o range já inclui conectores e ases médios suited, que jogam bem em pote de dois.",
  ],
  [
    "HJ",
    "44+, A5s+, K9s+, Q9s+, J9s+, T8s+, 98s, A9o+, KJo+, QJo",
    "Do hijack em diante o roubo de blinds passa a valer: sobram três jogadores para agir.",
  ],
  [
    "CO",
    "33+, A2s+, K8s+, Q8s+, J8s+, T8s+, 97s+, 87s, A8o+, KTo+, QJo",
    "No cutoff só o botão e os blinds faltam. Abrir largo aqui é como se ganha fichas sem showdown.",
  ],
  [
    "BTN",
    "22+, A2s+, K2s+, Q5s+, J7s+, T7s+, 97s+, 87s, 76s, 65s, A2o+, K9o+, Q9o+, J9o+, T9o",
    "No botão você age por último em todas as ruas seguintes. Posição é o que sustenta abrir quase 40% das mãos.",
  ],
  [
    "SB",
    "22+, A2s+, K7s+, Q8s+, J8s+, T8s+, 97s+, 87s, 76s, A7o+, A5o, K9o+, Q9o+, JTo",
    "Do small blind só o big blind resta — mas você joga fora de posição o resto da mão, e é isso que impede abrir tão largo quanto no botão.",
  ],
];

// ── push/fold, stacks curtos ───────────────────────────────────────────────
//
// Abaixo de ~15 BB abrir sem ir all-in convida o adversário a reaumentar
// comprometendo você sem escolha. O all-in resolve isso: transforma a decisão
// em uma só e realiza toda a equity da mão de uma vez.

const PUSHES: [Posicao, number, number, string, string][] = [
  // posição, stackMin, stackMax, range, explicação
  ["UTG", 1, 7, "22+, A2s+, K8s+, QTs+, JTs, A7o+, KTo+", "Com menos de 8 BB o all-in de UTG ainda precisa respeitar sete jogadores atrás."],
  ["UTG", 8, 12, "55+, A7s+, KTs+, QJs, ATo+, KQo", "Entre 8 e 12 BB, empurrar de UTG exige mão que aguente ser paga por sete adversários."],
  ["UTG", 13, 18, "77+, ATs+, KQs, AJo+", "Perto de 15 BB ainda há espaço para abrir sem all-in; empurrar de UTG fica só com o topo."],
  ["MP", 1, 7, "22+, A2s+, K5s+, Q8s+, J9s+, T9s, A5o+, K9o+, QJo", "Sob 8 BB o tempo acabou: empurra-se largo do meio da mesa."],
  ["MP", 8, 12, "33+, A4s+, K9s+, QTs+, JTs, A9o+, KJo+", "Faixa em que a fold equity ainda é alta e o stack não aguenta esperar."],
  ["MP", 13, 18, "66+, A9s+, KJs+, AJo+, KQo", "Acima de 13 BB o all-in do meio da mesa volta a ser só com mãos fortes."],
  ["CO", 1, 7, "22+, A2s+, K2s+, Q5s+, J7s+, T7s+, 96s+, 86s+, 75s+, 65s, A2o+, K7o+, Q9o+, J9o+, T9o", "Com stack de sobrevivência no cutoff, empurra-se quase metade das mãos."],
  ["CO", 8, 12, "22+, A2s+, K7s+, Q9s+, J9s+, T9s, 98s, A7o+, K9o+, QTo+", "Faixa clássica de all-in do cutoff: fold equity contra três jogadores."],
  ["CO", 13, 18, "44+, A7s+, K9s+, QTs+, JTs, ATo+, KJo+", "Perto de 15 BB o all-in do cutoff aperta, mas segue largo comparado ao início da mesa."],
  ["BTN", 1, 7, "22+, A2s+, K2s+, Q2s+, J5s+, T6s+, 96s+, 85s+, 75s+, 64s+, 54s, A2o+, K5o+, Q8o+, J8o+, T8o+, 98o", "No botão, com stack curtíssimo, o all-in é a jogada padrão em mais da metade das mãos."],
  ["BTN", 8, 12, "22+, A2s+, K4s+, Q7s+, J8s+, T8s+, 97s+, 87s, 76s, A2o+, K8o+, Q9o+, J9o+, T9o", "Só dois jogadores atrás: a fold equity sustenta um range bem largo."],
  ["BTN", 13, 18, "22+, A2s+, K8s+, Q9s+, J9s+, T9s, 98s, A5o+, KTo+, QJo", "Acima de 13 BB o botão ainda empurra largo, mas já dá para abrir menor com o topo."],
  ["SB", 1, 7, "22+, A2s+, K2s+, Q2s+, J4s+, T6s+, 95s+, 85s+, 74s+, 64s+, 53s+, A2o+, K4o+, Q7o+, J8o+, T8o+, 97o+, 87o", "Só o big blind atrás: com stack curto, empurra-se muito largo do small blind."],
  ["SB", 8, 12, "22+, A2s+, K2s+, Q6s+, J8s+, T8s+, 97s+, 86s+, 76s, A2o+, K7o+, Q9o+, J9o+, T9o", "Um adversário só para passar por cima — e ficar fora de posição não pesa num all-in."],
  ["SB", 13, 18, "22+, A2s+, K6s+, Q8s+, J9s+, T9s, 98s, A3o+, K9o+, QTo+, JTo", "Perto de 15 BB o small blind ainda empurra largo contra um único adversário."],
];

// ── pagar um all-in ────────────────────────────────────────────────────────
//
// Pagar exige muito mais do que empurrar, e é o erro mais caro de torneio.
// Quem empurra ganha o pote na hora quando todos foldam; quem paga nunca
// ganha sem showdown. É por isso que o range de call é sempre mais estreito
// que o de push do mesmo stack.

const CALLS: [Posicao, Posicao, number, number, string, string][] = [
  // posição de quem paga, agressor, stackMin, stackMax, range, explicação
  ["BB", "BTN", 1, 7, "22+, A2s+, K5s+, Q8s+, J9s+, T9s, A2o+, K9o+, QTo+", "O botão empurra largo com stack curto, então o big blind paga largo — e já tem 1 BB investido no pote."],
  ["BB", "BTN", 8, 12, "33+, A2s+, K8s+, QTs+, JTs, A7o+, KTo+, QJo", "Contra o all-in do botão, o big blind paga com bastante mão — mas menos do que o botão empurra."],
  ["BB", "BTN", 13, 18, "55+, A5s+, KTs+, QJs, ATo+, KQo", "Acima de 13 BB pagar custa caro: o range fecha para mãos que ganham showdown."],
  ["BB", "SB", 1, 7, "22+, A2s+, K2s+, Q5s+, J7s+, T7s+, 97s+, 87s, A2o+, K6o+, Q8o+, J9o+", "O small blind empurra quase qualquer coisa com stack curto; o big blind responde largo."],
  ["BB", "SB", 8, 12, "22+, A2s+, K6s+, Q9s+, J9s+, T9s, A4o+, K9o+, QTo+", "Contra o all-in do small blind, pagar largo é correto — ele tem range muito aberto."],
  ["BB", "SB", 13, 18, "44+, A4s+, K9s+, QTs+, JTs, A9o+, KJo+", "Perto de 15 BB o call do big blind aperta bastante."],
  ["BB", "CO", 1, 7, "22+, A2s+, K7s+, Q9s+, J9s+, T9s, A5o+, K9o+, QJo", "All-in do cutoff com stack curto ainda é largo o bastante para pagar com boa parte do range."],
  ["BB", "CO", 8, 12, "44+, A5s+, K9s+, QTs+, JTs, A9o+, KJo+", "Contra o cutoff, o big blind precisa de mão de showdown."],
  ["BB", "CO", 13, 18, "66+, A9s+, KJs+, AJo+, KQo", "Acima de 13 BB, pagar o all-in do cutoff exige o topo do range."],
  ["BB", "UTG", 1, 7, "44+, A5s+, KTs+, QJs, ATo+, KQo", "All-in de UTG é forte mesmo com stack curto: pagar exige mão real."],
  ["BB", "UTG", 8, 12, "77+, ATs+, KQs, AJo+", "Contra UTG, só o topo paga."],
  ["BB", "UTG", 13, 18, "99+, AQs+, AKo", "Acima de 13 BB o all-in de UTG representa um range muito forte."],
];

export const TABELA: EntradaRange[] = [
  ...ABERTURAS.map(([posicao, maos, explicacao]): EntradaRange => ({
    situacao: "abertura",
    posicao,
    stackMin: 19,
    stackMax: 500,
    bandas: [ABRE(maos, 2.2)],
    explicacao,
  })),
  ...PUSHES.map(([posicao, stackMin, stackMax, maos, explicacao]): EntradaRange => ({
    situacao: "push",
    posicao,
    stackMin,
    stackMax,
    bandas: [{ acao: "allin", maos }],
    explicacao,
  })),
  ...CALLS.map(([posicao, agressor, stackMin, stackMax, maos, explicacao]): EntradaRange => ({
    situacao: "vs_shove",
    posicao,
    agressor,
    stackMin,
    stackMax,
    bandas: [{ acao: "call", maos }],
    explicacao,
  })),
];

/** As posições que o gerador pode usar em cada situação. */
export function posicoesDisponiveis(situacao: Situacao): Posicao[] {
  const vistas = new Set<Posicao>();
  for (const e of TABELA) if (e.situacao === situacao) vistas.add(e.posicao);
  return [...vistas];
}

export function acharEntrada(
  situacao: Situacao,
  posicao: Posicao,
  stackBB: number,
  agressor?: Posicao,
): EntradaRange | null {
  return (
    TABELA.find(
      (e) =>
        e.situacao === situacao &&
        e.posicao === posicao &&
        stackBB >= e.stackMin &&
        stackBB <= e.stackMax &&
        (agressor === undefined || e.agressor === agressor),
    ) ?? null
  );
}

/** Expande as bandas de uma entrada em mãos, uma vez só por entrada. */
const cache = new Map<EntradaRange, Map<Mao, { acao: Acao; frequencia: number; tamanhoBB?: number }[]>>();

export function acoesDaMao(
  entrada: EntradaRange,
  mao: Mao,
): { acao: Acao; frequencia: number; tamanhoBB?: number }[] {
  let mapa = cache.get(entrada);
  if (!mapa) {
    mapa = new Map();
    for (const banda of entrada.bandas) {
      const freq = banda.frequencia ?? 1;
      for (const m of interpretarRange(banda.maos)) {
        const lista = mapa.get(m) ?? [];
        lista.push({ acao: banda.acao, frequencia: freq, tamanhoBB: banda.tamanhoBB });
        mapa.set(m, lista);
      }
    }
    cache.set(entrada, mapa);
  }

  const acoes = mapa.get(mao) ?? [];
  const soma = acoes.reduce((a, x) => a + x.frequencia, 0);
  // O que sobra é fold — inclusive tudo que não apareceu em banda nenhuma.
  if (soma < 0.999) acoes.push({ acao: "fold", frequencia: 1 - soma });
  return acoes;
}

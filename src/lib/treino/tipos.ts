/**
 * Domínio do Treino.
 *
 * Separado do motor e da interface de propósito (§24 da especificação): o
 * motor recebe estado de jogo e devolve cenário e recomendação, sem saber que
 * existe tela; a tela desenha o que recebe, sem saber de onde veio. É o que
 * permite trocar a camada de dados depois — por ranges licenciados, por um
 * solver próprio — sem tocar em nada do resto.
 */

export const FASES = [
  "inicio",
  "meio",
  "fase_final",
  "bolha",
  "itm",
  "mesa_final",
] as const;

export type Fase = (typeof FASES)[number];

export const ROTULO_FASE: Record<Fase, string> = {
  inicio: "Início",
  meio: "Meio",
  fase_final: "Fase final",
  bolha: "Bolha",
  itm: "ITM",
  mesa_final: "Mesa final",
};

export const DESCRICAO_FASE: Record<Fase, string> = {
  inicio: "Stacks profundos, mesa cheia, ranges de abertura.",
  meio: "Pressão crescente entre 20 e 50 blinds.",
  fase_final: "Stacks médios e curtos, decisões de risco.",
  bolha: "Uma posição da premiação, com stacks curtos sob pressão.",
  itm: "Já premiado, jogando pelas faixas seguintes.",
  mesa_final: "Mesa curta, stacks desiguais, cada posição vale muito.",
};

/** Posições, da mais adiantada para a mais atrasada. */
export const POSICOES = ["UTG", "UTG+1", "MP", "HJ", "CO", "BTN", "SB", "BB"] as const;

export type Posicao = (typeof POSICOES)[number];

export const ACOES = ["fold", "call", "raise", "allin"] as const;

export type Acao = (typeof ACOES)[number];

export const ROTULO_ACAO: Record<Acao, string> = {
  fold: "Fold",
  call: "Call",
  raise: "Raise",
  allin: "All-in",
};

/**
 * O tipo de decisão. Para o MVP são três, e cada uma é uma pergunta diferente
 * o bastante para merecer range próprio.
 */
export type Situacao =
  /** Todos foldaram até você: abrir ou não. */
  | "abertura"
  /** Stack curto: all-in ou fold, sem meio-termo. */
  | "push"
  /** Alguém foi all-in antes de você: pagar ou não. */
  | "vs_shove";

export const ROTULO_SITUACAO: Record<Situacao, string> = {
  abertura: "Abertura",
  push: "Push/Fold",
  vs_shove: "Enfrentando all-in",
};

/** Um adversário na mesa, do ponto de vista de quem decide. */
export interface Adversario {
  posicao: Posicao;
  stackBB: number;
  /** O que ele fez antes de a ação chegar em você. */
  acao?: "fold" | "raise" | "allin";
}

/** O contexto de premiação, quando a fase o torna relevante. */
export interface ContextoPremiacao {
  jogadoresRestantes: number;
  jogadoresPremiados: number;
  /** Posição do jogador no ranking de fichas. */
  posicaoNoRanking: number;
  /** Quantos adversários estão abaixo de 10 BB — quem faz a bolha estourar. */
  stacksCurtos: number;
}

/**
 * O estado completo de uma decisão. É o que o motor recebe e o que a tela
 * desenha — as duas leem o mesmo objeto, então não há como divergirem.
 */
export interface Cenario {
  id: string;
  fase: Fase;
  situacao: Situacao;
  jogadoresNaMesa: number;
  posicao: Posicao;
  /** Stack efetivo: o menor entre o seu e o do adversário relevante. */
  stackEfetivoBB: number;
  stackBB: number;
  adversarios: Adversario[];
  mao: string;
  /** Frase que descreve o que aconteceu antes de chegar em você. */
  acaoAnterior: string;
  premiacao: ContextoPremiacao | null;
  acoesDisponiveis: Acao[];
  dificuldade: 1 | 2 | 3 | 4;
}

/** Uma ação e a frequência com que o range a toma, de 0 a 1. */
export interface AcaoRecomendada {
  acao: Acao;
  frequencia: number;
  /** Em big blinds, quando a ação tem tamanho. */
  tamanhoBB?: number;
}

export interface Recomendacao {
  acoes: AcaoRecomendada[];
  /** A de maior frequência. */
  preferida: Acao;
  explicacao: string;
  /** O aperto de bolha mudou a resposta em relação ao chip EV? */
  ajustadaPorPremiacao: boolean;
}

/**
 * Uma resposta dada pelo jogador. É a matéria-prima do perfil de treinamento:
 * sem guardar as circunstâncias, "64% de aproveitamento" não vira diagnóstico
 * nenhum — só um número que não diz o que estudar.
 */
export interface Resposta {
  id: string;
  em: string;
  fase: Fase;
  situacao: Situacao;
  posicao: Posicao;
  stackEfetivoBB: number;
  jogadoresNaMesa: number;
  mao: string;
  escolhida: Acao;
  preferida: Acao;
  /** Frequência da ação que o jogador escolheu, de 0 a 1. */
  frequenciaDaEscolha: number;
  correta: boolean;
  /** Milissegundos entre ver o cenário e responder. */
  tempoMs: number;
}

/**
 * O limiar que separa acerto de erro.
 *
 * Poker pré-flop não é binário (§8): uma mão pode ser raise 65% e fold 35%, e
 * as duas são defensáveis. Tratar a menos frequente como erro ensinaria o
 * jogador a decorar uma resposta única onde o certo é ter as duas no range.
 * Um quarto do tempo é o piso do que se considera decisão legítima.
 */
export const FREQUENCIA_MINIMA_ACERTO = 0.25;

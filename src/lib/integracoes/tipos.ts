/**
 * Integração com salas de poker — o contrato.
 *
 * O Oblix não fala PokerStars, GGPoker nem Suprema em lugar nenhum a não ser
 * dentro de `src/lib/integracoes/<sala>/`. Do lado de fora existe só o modelo
 * normalizado deste arquivo. É o que permite acrescentar uma sala sem tocar no
 * painel, no treino ou no banco de jogadores — e o que impede o formato de uma
 * sala de vazar para dentro do domínio e virar dívida.
 *
 * DUAS REGRAS QUE NÃO SE NEGOCIAM
 *
 * **Análise depois do jogo, nunca durante.** O Oblix lê arquivo que o jogador
 * exportou, e faz isso em cima do que já aconteceu. Não há HUD, não há
 * sugestão em tempo real, não há leitura da mesa aberta. Não é preferência de
 * produto: é o que separa uma ferramenta de estudo de uma ferramenta que faz o
 * jogador ser banido — e várias salas proíbem a segunda explicitamente.
 *
 * **Nada de senha.** Nenhum conector pede, guarda ou transporta credencial de
 * sala. Quando existir integração oficial, ela será por autorização do próprio
 * site (OAuth), com token do jogador — nunca com a senha dele digitada aqui.
 *
 * A `PoliticaDaSala` abaixo carrega essas restrições como DADO, e não como
 * comentário: a interface lê dali o que pode oferecer, e um conector que
 * declare um método proibido pela própria política é recusado pelo registro.
 */

import type { Modalidade } from "@/lib/types";

// ── o que uma sala permite ─────────────────────────────────────────────────

/**
 * Como os dados podem entrar.
 *
 * `api` e `oauth` não existem em nenhuma sala hoje, e estão aqui porque a
 * arquitetura precisa de lugar para eles no dia em que existirem — não porque
 * alguém os implementou.
 */
export const METODOS = [
  "historico_de_maos",
  "historico_de_torneios",
  "csv",
  "oauth",
  "api",
] as const;

export type Metodo = (typeof METODOS)[number];

export const ROTULO_METODO: Record<Metodo, string> = {
  historico_de_maos: "Histórico de mãos",
  historico_de_torneios: "Histórico de torneios",
  csv: "Planilha (CSV)",
  oauth: "Conexão oficial",
  api: "API oficial",
};

/**
 * O estado de uma sala no Oblix.
 *
 * `disponivel` só vale quando existe parser escrito E testado contra arquivo
 * de verdade. `em_desenvolvimento` é o estado honesto de quase tudo: a
 * arquitetura aceita, o parser ainda não existe. `nao_suportado` é para o caso
 * em que a sala proíbe — e aí a interface diz o motivo em vez de prometer.
 */
export type EstadoDaSala = "disponivel" | "em_desenvolvimento" | "nao_suportado";

export const ROTULO_ESTADO: Record<EstadoDaSala, string> = {
  disponivel: "Importação disponível",
  em_desenvolvimento: "Integração em desenvolvimento",
  nao_suportado: "Sem método disponível",
};

/**
 * As restrições de cada sala, como dado verificável.
 *
 * O que está aqui foi lido nos termos e nas páginas de ajuda das próprias
 * salas, e é conservador de propósito: na dúvida, o campo diz "não sei", e a
 * interface trata "não sei" como "não pode". Um produto que erra para o lado
 * permissivo aqui custa a conta do jogador, não a nossa.
 */
export interface PoliticaDaSala {
  /** Métodos que a sala documenta ou permite. */
  permitidos: Metodo[];
  /** Métodos explicitamente vedados — a interface nunca os oferece. */
  proibidos: Metodo[];
  /**
   * A sala restringe software de terceiros? Quando verdadeiro, a tela avisa,
   * porque a responsabilidade de conferir é de quem joga na conta dele.
   */
  restringeTerceiros: boolean;
  /** O que dizer sobre essas restrições, em português, sem juridiquês. */
  observacao?: string;
  /** De onde a informação saiu, para quem quiser conferir. */
  fonte?: string;
}

// ── modelo normalizado ─────────────────────────────────────────────────────

export type Posicao = "UTG" | "UTG+1" | "MP" | "HJ" | "CO" | "BTN" | "SB" | "BB";

export type Rua = "preflop" | "flop" | "turn" | "river";

export type TipoDeAcao =
  | "fold"
  | "check"
  | "call"
  | "bet"
  | "raise"
  | "all_in"
  | "ante"
  | "small_blind"
  | "big_blind";

export interface Acao {
  jogador: string;
  rua: Rua;
  tipo: TipoDeAcao;
  /** Fichas colocadas nesta ação. Zero em fold e check. */
  valor: number;
}

/**
 * A fase do torneio em que a mão aconteceu.
 *
 * Deduzida do que o arquivo informa — jogadores restantes, stack em BB,
 * distância da premiação. Quando o arquivo não traz o suficiente, fica
 * `desconhecida`, e as estatísticas por fase simplesmente não contam essa mão.
 * Chutar a fase contaminaria justamente o diagnóstico que a feature existe
 * para produzir.
 */
export const FASES_DA_MAO = [
  "inicio",
  "meio",
  "bolha",
  "pos_bolha",
  "mesa_final",
  "heads_up",
  "desconhecida",
] as const;

export type FaseDaMao = (typeof FASES_DA_MAO)[number];

export const ROTULO_FASE_MAO: Record<FaseDaMao, string> = {
  inicio: "Início",
  meio: "Meio",
  bolha: "Bolha",
  pos_bolha: "Pós-bolha",
  mesa_final: "Mesa final",
  heads_up: "Heads-up",
  desconhecida: "Fase indefinida",
};

/** Uma mão, já traduzida para a linguagem do Oblix. */
export interface Mao {
  /** Identificador da sala — usado para não contar a mesma mão duas vezes. */
  id: string;
  sala: string;
  torneioDaSala: string | null;
  data: string;
  mesa: string | null;
  /** Quem está sentado, na ordem de assento. */
  jogadores: string[];
  heroi: string;
  /** Cartas do herói, quando o arquivo as traz. */
  cartasDoHeroi: string[] | null;
  posicaoDoHeroi: Posicao | null;
  board: string[];
  acoes: Acao[];
  smallBlind: number;
  bigBlind: number;
  ante: number;
  /** Stacks no início da mão, por jogador. */
  stacks: Record<string, number>;
  /** Stack efetivo do herói em big blinds. */
  bbDoHeroi: number | null;
  pote: number;
  /** Quanto o herói ganhou (positivo) ou perdeu (negativo) nesta mão. */
  resultadoDoHeroi: number;
  /**
   * Quanto cada jogador RECOLHEU do pote. Não é lucro — é o bruto levado.
   *
   * Serve para saber quem venceu no showdown, inclusive adversários: sem isso,
   * o W$SD só existiria para o herói, e o banco de jogadores ficaria sem a
   * estatística que mais diz sobre quem paga demais.
   */
  ganhos: Record<string, number>;
  foiAoShowdown: boolean;
  fase: FaseDaMao;
}

/** O resumo de um torneio, como a sala o reporta. */
export interface TorneioDaSala {
  idDaSala: string;
  sala: string;
  nome: string;
  data: string;
  modalidade: Modalidade;
  buyIn: number;
  /** Taxa da sala, quando informada separadamente do buy-in. */
  taxa: number;
  bounty: number;
  rebuys: number;
  addons: number;
  jogadores: number;
  colocacao: number | null;
  premiacao: number;
  duracaoMin: number;
  heroi: string;
  moeda: string;
}

/** O que um arquivo produz depois de lido e normalizado. */
export interface Leitura {
  sala: string;
  torneios: TorneioDaSala[];
  maos: Mao[];
  /**
   * Candidatos a "quem é você" quando o arquivo não deixa óbvio. Com mais de
   * um, a interface pergunta em vez de escolher — e escolher errado inverteria
   * todas as estatísticas do jogador com as de um adversário.
   */
  candidatosAHeroi: string[];
  /** O que não deu para ler, dito em português. Nunca engolido. */
  avisos: string[];
}

// ── o contrato de um conector ──────────────────────────────────────────────

export interface InfoDaSala {
  /** Chave ASCII, minúscula, sem espaço — vira caminho e vira valor de coluna. */
  chave: string;
  nome: string;
  estado: EstadoDaSala;
  metodos: Metodo[];
  politica: PoliticaDaSala;
  /** Onde o jogador acha o arquivo na própria sala. */
  comoExportar?: string[];
  /** Extensões que o conector aceita. */
  extensoes: string[];
}

/**
 * Um conector de sala.
 *
 * `reconhece` e `ler` só existem quando há parser. Uma sala em
 * desenvolvimento implementa apenas `info`, e é isso que a impede de aparecer
 * como pronta: o registro deriva o estado da presença do parser, não de uma
 * flag que alguém pode esquecer de virar.
 */
export interface Conector {
  info: InfoDaSala;
  /** Este texto é desta sala? Usado na detecção automática do arquivo. */
  reconhece?: (texto: string) => boolean;
  /** Traduz o arquivo para o modelo normalizado. */
  ler?: (texto: string, nomeDoArquivo: string) => Leitura;
}

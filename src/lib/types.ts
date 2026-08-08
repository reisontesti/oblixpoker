/**
 * Domínio do Oblix.
 *
 * Decisão de modelagem central: o custo de entrada em um torneio depende da VIA.
 * Quem entra direto paga o buy-in do principal; quem entra via satélite paga o
 * custo do satélite (buy-in × entradas). É essa diferença que permite responder
 * "vale a pena jogar o satélite?" com os dados do próprio jogador.
 */

export type Modalidade = "MTT" | "Cash" | "Sit&Go" | "Home Game";

export type Objetivo = "Recreativo" | "Evolução" | "Competitivo" | "Profissional";

export type ViaEntrada = "direto" | "satelite";

export const NIVEIS_ENERGIA = [
  "muito_cansado",
  "cansado",
  "normal",
  "descansado",
  "muito_descansado",
] as const;

export type NivelEnergia = (typeof NIVEIS_ENERGIA)[number];

export const ROTULO_ENERGIA: Record<NivelEnergia, string> = {
  muito_cansado: "Muito cansado",
  cansado: "Cansado",
  normal: "Normal",
  descansado: "Descansado",
  muito_descansado: "Muito descansado",
};

export type PerfilJogador =
  | "TAG"
  | "LAG"
  | "Nit"
  | "Calling Station"
  | "Maníaco"
  | "Rock";

/** Um satélite disputado. Quando classifica, aponta para o torneio principal. */
export interface Satelite {
  id: string;
  nome: string;
  clube: string;
  /** ISO. Horário em que o satélite foi disputado. */
  data: string;
  /** Buy-in unitário do satélite. */
  buyIn: number;
  /** Quantas vezes entrou (re-entries). Custo total = buyIn × entradas. */
  entradas: number;
  jogadores: number;
  classificou: boolean;
  /** Posição final no satélite. */
  posicao: number | null;
  tempoJogadoMin: number;
  /** Valor da vaga conquistada — o buy-in do principal. */
  valorVaga: number;
  /** Preenchido quando classificou e o principal foi disputado. */
  torneioId: string | null;
  observacoes?: string;
}

/** Um torneio principal disputado. */
export interface Torneio {
  id: string;
  /** ISO. */
  data: string;
  nome: string;
  clube: string;
  modalidade: Modalidade;
  /** Buy-in de balcão do principal — o valor da vaga, sempre preenchido. */
  buyIn: number;
  rebuys: number;
  addon: number;
  jogadores: number;
  /** null enquanto o torneio está em andamento. */
  colocacao: number | null;
  premiacao: number;
  duracaoMin: number;
  via: ViaEntrada;
  /** Preenchido quando via === "satelite". */
  sateliteId: string | null;
  energia: NivelEnergia | null;
  melhorDecisao?: string;
  piorDecisao?: string;
  aprendizado?: string;
  /** 0–10, autoavaliação de disciplina. */
  notaDisciplina: number | null;
}

/**
 * Uma parada registrada durante o torneio — tipicamente no intervalo.
 *
 * Tudo é opcional de propósito. O jogador está no intervalo, com dez minutos e
 * uma fila do banheiro; exigir seis campos faria ele parar de registrar no
 * terceiro intervalo, e meia sessão anotada vale menos que nenhuma.
 */
export interface ParadaSessao {
  id: string;
  /** ISO. Quando a parada foi registrada. */
  em: string;
  /** Posição estimada no campo. */
  posicao: number | null;
  jogadoresRestantes: number | null;
  /**
   * Fichas na mesa. Sozinho este número não diz nada — 40 mil é muito no nível
   * 3 e é desespero no nível 18. O que informa é a razão com o blind, e é por
   * isso que os dois andam juntos.
   */
  fichas: number | null;
  /** Big blind vigente. */
  blind: number | null;
  energia: NivelEnergia | null;
  nota: string;
}

/** O preparo do torneio, capturado antes de a primeira mão ser distribuída. */
export interface PreparoSessao {
  data: string;
  nome: string;
  clube: string;
  modalidade: Modalidade;
  buyIn: number;
  jogadores: number;
  via: ViaEntrada;
  satelite: Omit<Satelite, "id" | "torneioId" | "valorVaga"> | null;
}

/**
 * Um torneio sendo jogado agora.
 *
 * Existe separada do `Torneio` porque durante o jogo não há resultado: não se
 * sabe a colocação, nem a premiação, nem quanto tempo vai durar. Só quando o
 * jogador é eliminado é que a sessão vira torneio — e aí a duração sai do
 * cronômetro em vez de ser lembrada por alto.
 *
 * Precisa sobreviver a fechar o aplicativo. São seis horas de clube num
 * celular, e o app vai para segundo plano dezenas de vezes.
 */
export interface SessaoAoVivo {
  id: string;
  iniciadaEm: string;
  /** Nulo enquanto o torneio está em andamento. */
  finalizadaEm: string | null;
  /** Como o jogador chegou — perguntado ANTES, não recordado depois. */
  energiaInicial: NivelEnergia;
  preparo: PreparoSessao;
  paradas: ParadaSessao[];
  /** Preenchido quando a sessão vira torneio registrado. */
  torneioId: string | null;
}

/** Movimentações de bankroll que não vêm de torneios. */
export interface MovimentoBankroll {
  id: string;
  data: string;
  tipo: "aporte" | "saque";
  valor: number;
  descricao: string;
}

/** Estatísticas técnicas de uma sessão/período. */
export interface SaudeTecnica {
  vpip: number;
  pfr: number;
  tresBet: number;
  cbet: number;
  wtsd: number;
  wsd: number;
}

/**
 * Uma medição técnica datada.
 *
 * O Oblix não importa histórico de mãos, então estes números o jogador copia
 * do tracker ou da sala. Guardar uma SÉRIE, e não dois retratos fixos de
 * "atual" e "anterior", é o que faz a cadência virar dado: quem joga todo dia
 * mede toda semana, quem joga uma vez por mês mede uma vez por mês, e o painel
 * consegue dizer há quanto tempo aquilo foi medido em vez de apresentar uma
 * amostra de oito meses com a confiança de uma de ontem.
 */
export interface MedicaoTecnica extends SaudeTecnica {
  id: string;
  /** ISO. Quando o jogador informou os números. */
  data: string;
  /** De onde vieram — para não misturar amostras de salas diferentes. */
  origem: string;
  /** Tamanho da amostra, quando o jogador souber. */
  maos: number | null;
}

export interface MetaTecnica {
  chave: keyof SaudeTecnica;
  rotulo: string;
  descricao: string;
  /** Faixa saudável para o estilo do jogador. */
  min: number;
  max: number;
}

/** Um indicador técnico confrontado com sua faixa alvo. */
export interface LinhaSaude {
  chave: keyof SaudeTecnica;
  rotulo: string;
  descricao: string;
  valor: number;
  anterior: number;
  min: number;
  max: number;
  estado: "dentro" | "acima" | "abaixo";
  /** Aproximou-se da faixa alvo desde a amostra anterior? */
  melhorou: boolean;
}

export interface Meta {
  id: string;
  titulo: string;
  detalhe: string;
  atual: number;
  alvo: number;
  unidade: "torneios" | "reais" | "nota" | "percentual";
  prazo: string;
}

export const CHAVES_META = ["mesas-finais", "banca", "disciplina", "titulos"] as const;

export type ChaveMeta = (typeof CHAVES_META)[number];

/**
 * O que o jogador define numa meta: só o ALVO e se ela está valendo.
 *
 * O valor atingido continua saindo dos registros, e é isso que impede a meta de
 * virar um checkbox — "concluída" nunca depende de alguém lembrar de marcar.
 * Pelo mesmo motivo as quatro chaves são fixas: cada uma corresponde a uma
 * métrica que o Oblix sabe medir sozinho, e uma meta livre ("estudar duas horas
 * por semana") seria uma promessa que o produto não tem como verificar.
 */
export interface MetaDefinida {
  chave: ChaveMeta;
  alvo: number;
  ativa: boolean;
  /** Metas são do ano; virou o ano, os alvos voltam ao padrão. */
  ano: number;
}

export type TipoNota = "leitura" | "tell" | "exploracao" | "geral";

/** Observação de campo, com data. O registro corrido, não o resumo curado. */
export interface NotaJogador {
  id: string;
  data: string;
  tipo: TipoNota;
  texto: string;
}

export interface Jogador {
  id: string;
  nome: string;
  clube: string;
  perfil: PerfilJogador;
  pontosFortes: string[];
  pontosFracos: string[];
  /** A linha acionável: o que fazer contra ele. É o que o Modo Mesa destaca. */
  exploracoes: string[];
  tells: string[];
  confrontos: number;
  /** Saldo em reais nos confrontos diretos, na estimativa do jogador. */
  saldoConfrontos: number;
  /**
   * Quando a leitura foi revisada pela última vez. Anotação de poker envelhece
   * — jogador estuda, muda de estilo, sobe de stake. Sem esta data, uma
   * leitura de oito meses atrás seria exibida com a mesma confiança de uma de
   * ontem.
   */
  atualizadoEm: string;
  notas: NotaJogador[];
}

/**
 * Uma entrada do diário mental.
 *
 * Nasce no check-in, ANTES de sentar — por isso `torneioId` começa nulo e só
 * é preenchido quando o torneio daquele dia é registrado. Um check-in sem
 * torneio continua sendo um registro válido: às vezes a decisão certa é
 * responder as perguntas e ir para casa.
 */
export interface DiarioMental {
  id: string;
  /** Quando o check-in foi feito. */
  data: string;
  torneioId: string | null;

  // ── antes ────────────────────────────────────────────────────────────────
  dormiuBem: boolean;
  calmo: boolean;
  /** A pergunta que existe para ser um freio, não uma estatística. */
  tentandoRecuperar: boolean;
  /** O compromisso assumido antes de sentar. */
  objetivo: string;

  // ── depois ───────────────────────────────────────────────────────────────
  /** null enquanto a sessão não foi fechada. */
  houveTilt: boolean | null;
  comoTerminei: string;
  aprendizado: string;
}

export interface Perfil {
  nome: string;
  nick: string;
  objetivo: Objetivo;
  modalidade: Modalidade;
  clubes: string[];
  buyInPadrao: number;
  bankrollInicial: string;
  desde: string;
}

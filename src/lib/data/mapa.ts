/**
 * Tradução entre o domínio (`types.ts`, camelCase) e as linhas do Postgres
 * (snake_case).
 *
 * Fica isolada num módulo puro, sem nenhuma dependência do Supabase, por dois
 * motivos. É a parte mais fácil de errar sem perceber — um `tresBet` que vira
 * `tres_bet` em cinco lugares e `tresbet` no sexto não quebra o build, só faz o
 * número sumir da tela. E, sendo pura, dá para exercitá-la contra o schema de
 * verdade num Postgres local, em ida e volta, sem projeto nenhum na nuvem.
 *
 * Duas conversões merecem atenção:
 *
 * **`numeric` volta como string.** O driver do Postgres devolve `"150.00"`,
 * não `150`, porque `numeric` tem precisão maior que o `number` do JavaScript.
 * Somar isso sem converter produziria `"150.00150.00"` — concatenação de
 * texto passando por soma de dinheiro. Todo campo monetário passa por `num()`.
 *
 * **Nulo e ausente não são a mesma coisa.** `colocacao: null` quer dizer
 * "torneio em andamento", e `energia: null` quer dizer "não informei". Coagir
 * para zero apagaria a diferença dentro das médias, em silêncio.
 */
import type { Resposta as RespostaTreino } from "@/lib/treino/tipos";
import type {
  DiarioMental,
  Jogador,
  MedicaoTecnica,
  MetaDefinida,
  MovimentoBankroll,
  NivelEnergia,
  NotaJogador,
  Satelite,
  Torneio,
  ViaEntrada,
} from "@/lib/types";

/** Uma linha crua do Postgres, antes de virar domínio. */
export type Linha = Record<string, unknown>;

const num = (v: unknown): number => {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
};

const numOuNulo = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : null;
};

const txt = (v: unknown): string => (typeof v === "string" ? v : "");
const txtOuIndefinido = (v: unknown): string | undefined => {
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? undefined : s;
};
const iso = (v: unknown): string =>
  v instanceof Date ? v.toISOString() : typeof v === "string" ? new Date(v).toISOString() : "";

const lista = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);

// ── torneios ───────────────────────────────────────────────────────────────

export const torneioParaLinha = (t: Torneio, usuarioId: string): Linha => ({
  id: t.id,
  usuario_id: usuarioId,
  data: t.data,
  nome: t.nome,
  clube: t.clube,
  modalidade: t.modalidade,
  buy_in: t.buyIn,
  rebuys: t.rebuys,
  addon: t.addon,
  jogadores: t.jogadores,
  colocacao: t.colocacao,
  premiacao: t.premiacao,
  duracao_min: t.duracaoMin,
  via: t.via,
  satelite_id: t.sateliteId,
  energia: t.energia,
  melhor_decisao: t.melhorDecisao ?? null,
  pior_decisao: t.piorDecisao ?? null,
  aprendizado: t.aprendizado ?? null,
  nota_disciplina: t.notaDisciplina,
});

export const linhaParaTorneio = (l: Linha): Torneio => ({
  id: String(l.id),
  data: iso(l.data),
  nome: txt(l.nome),
  clube: txt(l.clube),
  modalidade: l.modalidade as Torneio["modalidade"],
  buyIn: num(l.buy_in),
  rebuys: num(l.rebuys),
  addon: num(l.addon),
  jogadores: num(l.jogadores),
  colocacao: numOuNulo(l.colocacao),
  premiacao: num(l.premiacao),
  duracaoMin: num(l.duracao_min),
  via: l.via as ViaEntrada,
  sateliteId: l.satelite_id === null || l.satelite_id === undefined ? null : String(l.satelite_id),
  energia: (l.energia ?? null) as NivelEnergia | null,
  melhorDecisao: txtOuIndefinido(l.melhor_decisao),
  piorDecisao: txtOuIndefinido(l.pior_decisao),
  aprendizado: txtOuIndefinido(l.aprendizado),
  notaDisciplina: numOuNulo(l.nota_disciplina),
});

// ── satélites ──────────────────────────────────────────────────────────────

export const sateliteParaLinha = (s: Satelite, usuarioId: string): Linha => ({
  id: s.id,
  usuario_id: usuarioId,
  nome: s.nome,
  clube: s.clube,
  data: s.data,
  buy_in: s.buyIn,
  entradas: s.entradas,
  jogadores: s.jogadores,
  classificou: s.classificou,
  posicao: s.posicao,
  tempo_jogado_min: s.tempoJogadoMin,
  valor_vaga: s.valorVaga,
  torneio_id: s.torneioId,
  observacoes: s.observacoes ?? null,
});

export const linhaParaSatelite = (l: Linha): Satelite => ({
  id: String(l.id),
  nome: txt(l.nome),
  clube: txt(l.clube),
  data: iso(l.data),
  buyIn: num(l.buy_in),
  entradas: num(l.entradas),
  jogadores: num(l.jogadores),
  classificou: Boolean(l.classificou),
  posicao: numOuNulo(l.posicao),
  tempoJogadoMin: num(l.tempo_jogado_min),
  valorVaga: num(l.valor_vaga),
  torneioId: l.torneio_id === null || l.torneio_id === undefined ? null : String(l.torneio_id),
  observacoes: txtOuIndefinido(l.observacoes),
});

// ── movimentos ─────────────────────────────────────────────────────────────

export const movimentoParaLinha = (m: MovimentoBankroll, usuarioId: string): Linha => ({
  id: m.id,
  usuario_id: usuarioId,
  data: m.data,
  tipo: m.tipo,
  valor: m.valor,
  descricao: m.descricao,
});

export const linhaParaMovimento = (l: Linha): MovimentoBankroll => ({
  id: String(l.id),
  data: iso(l.data),
  tipo: l.tipo as MovimentoBankroll["tipo"],
  valor: num(l.valor),
  descricao: txt(l.descricao),
});

// ── jogadores ──────────────────────────────────────────────────────────────
//
// As notas moram noutra tabela e chegam junto pelo `select` aninhado do
// PostgREST. Aqui elas entram e saem como parte do jogador porque é assim que
// o produto pensa nelas: ninguém consulta uma nota solta.

export const jogadorParaLinha = (j: Jogador, usuarioId: string): Linha => ({
  id: j.id,
  usuario_id: usuarioId,
  nome: j.nome,
  clube: j.clube,
  perfil: j.perfil,
  pontos_fortes: j.pontosFortes,
  pontos_fracos: j.pontosFracos,
  exploracoes: j.exploracoes,
  tells: j.tells,
  confrontos: j.confrontos,
  saldo_confrontos: j.saldoConfrontos,
  atualizado_em: j.atualizadoEm,
});

export const linhaParaJogador = (l: Linha, notas: Linha[] = []): Jogador => ({
  id: String(l.id),
  nome: txt(l.nome),
  clube: txt(l.clube),
  perfil: l.perfil as Jogador["perfil"],
  pontosFortes: lista(l.pontos_fortes),
  pontosFracos: lista(l.pontos_fracos),
  exploracoes: lista(l.exploracoes),
  tells: lista(l.tells),
  confrontos: num(l.confrontos),
  saldoConfrontos: num(l.saldo_confrontos),
  atualizadoEm: iso(l.atualizado_em),
  // Mais recente primeiro: é a ordem em que o cartão de mesa lê.
  notas: notas.map(linhaParaNota).sort((a, b) => b.data.localeCompare(a.data)),
});

export const notaParaLinha = (n: NotaJogador, jogadorId: string, usuarioId: string): Linha => ({
  id: n.id,
  usuario_id: usuarioId,
  jogador_id: jogadorId,
  data: n.data,
  tipo: n.tipo,
  texto: n.texto,
});

export const linhaParaNota = (l: Linha): NotaJogador => ({
  id: String(l.id),
  data: iso(l.data),
  tipo: l.tipo as NotaJogador["tipo"],
  texto: txt(l.texto),
});

// ── diário ─────────────────────────────────────────────────────────────────

export const diarioParaLinha = (d: DiarioMental, usuarioId: string): Linha => ({
  id: d.id,
  usuario_id: usuarioId,
  data: d.data,
  torneio_id: d.torneioId,
  dormiu_bem: d.dormiuBem,
  calmo: d.calmo,
  tentando_recuperar: d.tentandoRecuperar,
  objetivo: d.objetivo,
  houve_tilt: d.houveTilt,
  como_terminei: d.comoTerminei,
  aprendizado: d.aprendizado,
});

export const linhaParaDiario = (l: Linha): DiarioMental => ({
  id: String(l.id),
  data: iso(l.data),
  torneioId: l.torneio_id === null || l.torneio_id === undefined ? null : String(l.torneio_id),
  dormiuBem: Boolean(l.dormiu_bem),
  calmo: Boolean(l.calmo),
  tentandoRecuperar: Boolean(l.tentando_recuperar),
  objetivo: txt(l.objetivo),
  // `null` aqui quer dizer "sessão ainda aberta" — diferente de "não houve
  // tilt". Boolean() apagaria a distinção que a feature inteira usa.
  houveTilt: l.houve_tilt === null || l.houve_tilt === undefined ? null : Boolean(l.houve_tilt),
  comoTerminei: txt(l.como_terminei),
  aprendizado: txt(l.aprendizado),
});

// ── saúde técnica ──────────────────────────────────────────────────────────

export const medicaoParaLinha = (m: MedicaoTecnica, usuarioId: string): Linha => ({
  id: m.id,
  usuario_id: usuarioId,
  data: m.data,
  vpip: m.vpip,
  pfr: m.pfr,
  tres_bet: m.tresBet,
  cbet: m.cbet,
  wtsd: m.wtsd,
  wsd: m.wsd,
  origem: m.origem,
  maos: m.maos,
});

export const linhaParaMedicao = (l: Linha): MedicaoTecnica => ({
  id: String(l.id),
  data: iso(l.data),
  vpip: num(l.vpip),
  pfr: num(l.pfr),
  tresBet: num(l.tres_bet),
  cbet: num(l.cbet),
  wtsd: num(l.wtsd),
  wsd: num(l.wsd),
  origem: txt(l.origem),
  maos: numOuNulo(l.maos),
});

// ── metas ──────────────────────────────────────────────────────────────────

export const metaParaLinha = (m: MetaDefinida, usuarioId: string): Linha => ({
  usuario_id: usuarioId,
  chave: m.chave,
  alvo: m.alvo,
  ativa: m.ativa,
  ano: m.ano,
});

export const linhaParaMeta = (l: Linha): MetaDefinida => ({
  chave: l.chave as MetaDefinida["chave"],
  alvo: num(l.alvo),
  ativa: Boolean(l.ativa),
  ano: num(l.ano),
});

// ── treino ─────────────────────────────────────────────────────────────────

export const respostaTreinoParaLinha = (r: RespostaTreino, usuarioId: string): Linha => ({
  id: r.id,
  usuario_id: usuarioId,
  em: r.em,
  fase: r.fase,
  situacao: r.situacao,
  posicao: r.posicao,
  stack_efetivo_bb: r.stackEfetivoBB,
  jogadores_na_mesa: r.jogadoresNaMesa,
  mao: r.mao,
  escolhida: r.escolhida,
  preferida: r.preferida,
  frequencia_da_escolha: r.frequenciaDaEscolha,
  correta: r.correta,
  tempo_ms: r.tempoMs,
});

export const linhaParaRespostaTreino = (l: Linha): RespostaTreino => ({
  id: String(l.id),
  em: iso(l.em),
  fase: l.fase as RespostaTreino["fase"],
  situacao: l.situacao as RespostaTreino["situacao"],
  posicao: l.posicao as RespostaTreino["posicao"],
  stackEfetivoBB: num(l.stack_efetivo_bb),
  jogadoresNaMesa: num(l.jogadores_na_mesa),
  mao: txt(l.mao),
  escolhida: l.escolhida as RespostaTreino["escolhida"],
  preferida: l.preferida as RespostaTreino["preferida"],
  frequenciaDaEscolha: num(l.frequencia_da_escolha),
  correta: Boolean(l.correta),
  tempoMs: num(l.tempo_ms),
});

import type { MovimentoBankroll, NivelEnergia, Satelite, Torneio } from "@/lib/types";
import { NIVEIS_ENERGIA } from "@/lib/types";

/** Posição a partir da qual não é mais mesa final num MTT de 9 lugares. */
export const LUGARES_MESA_FINAL = 9;

export type PeriodoChave = "7d" | "30d" | "90d" | "6m" | "tudo" | "manual";

export const PERIODOS: { chave: PeriodoChave; rotulo: string; dias: number | null }[] = [
  { chave: "7d", rotulo: "7 dias", dias: 7 },
  { chave: "30d", rotulo: "30 dias", dias: 30 },
  { chave: "90d", rotulo: "90 dias", dias: 90 },
  { chave: "6m", rotulo: "6 meses", dias: 182 },
  { chave: "tudo", rotulo: "Tudo", dias: null },
];

/** Intervalo escolhido a dedo, em `AAAA-MM-DD`. */
export interface PeriodoManual {
  de: string;
  ate: string;
}

export interface Janela {
  inicio: number;
  fim: number;
  /** Janela imediatamente anterior, de mesmo tamanho — base das comparações. */
  inicioAnterior: number;
  dias: number | null;
}

/**
 * O recorte de tempo que o painel inteiro obedece.
 *
 * A janela anterior tem sempre o MESMO tamanho da atual, inclusive no intervalo
 * manual: comparar sete dias contra os trinta anteriores produziria um "delta"
 * que só mede a diferença de duração. É essa simetria que torna a seta ao lado
 * de cada número honesta.
 */
export function janela(
  chave: PeriodoChave,
  referencia: Date,
  primeiroRegistro: number,
  manual?: PeriodoManual,
): Janela {
  const fim = referencia.getTime();

  if (chave === "manual" && manual) {
    // O dia final entra inteiro: quem escolhe "até 8 de agosto" espera que o
    // torneio jogado na noite do dia 8 conte.
    const inicio = new Date(`${manual.de}T00:00:00`).getTime();
    const fimDia = new Date(`${manual.ate}T23:59:59.999`).getTime();
    const span = Math.max(86_400_000, fimDia - inicio);
    return {
      inicio,
      fim: fimDia,
      inicioAnterior: inicio - span,
      dias: Math.round(span / 86_400_000),
    };
  }

  const def = PERIODOS.find((p) => p.chave === chave) ?? PERIODOS[2];
  if (def.dias === null) {
    const span = fim - primeiroRegistro;
    return { inicio: primeiroRegistro, fim, inicioAnterior: primeiroRegistro - span, dias: null };
  }
  const ms = def.dias * 86_400_000;
  return { inicio: fim - ms, fim, inicioAnterior: fim - 2 * ms, dias: def.dias };
}

const dentro = (iso: string, de: number, ate: number) => {
  const t = new Date(iso).getTime();
  return t >= de && t <= ate;
};

// ── custos ─────────────────────────────────────────────────────────────────

export const custoSatelite = (s: Satelite) => s.buyIn * s.entradas;

/**
 * Quanto custou ENTRAR no torneio. Quem entrou via satélite pagou o satélite,
 * não o buy-in de balcão — é essa distinção que faz o ROI comparativo ter
 * sentido. Sem ela, entrar via satélite pareceria sempre mais lucrativo.
 */
export function custoEntrada(t: Torneio, satelite?: Satelite | null): number {
  if (t.via === "satelite" && satelite) return custoSatelite(satelite);
  return t.buyIn;
}

export function investimento(t: Torneio, satelite?: Satelite | null): number {
  return custoEntrada(t, satelite) + t.rebuys + t.addon;
}

/**
 * Custo do torneio cobrando SEMPRE o buy-in de balcão, mesmo de quem entrou
 * via satélite.
 *
 * Existe porque comparar ROI entre as duas vias sem isso mente: uma vaga de
 * R$ 150 conquistada num satélite de R$ 20 tem denominador oito vezes menor,
 * então o ROI infla por aritmética, não por desempenho. Normalizando o custo
 * de entrada, o que sobra na diferença é como o jogador de fato jogou.
 */
export function investimentoABalcao(t: Torneio): number {
  return t.buyIn + t.rebuys + t.addon;
}

export function lucro(t: Torneio, satelite?: Satelite | null): number {
  return t.premiacao - investimento(t, satelite);
}

export const ehMesaFinal = (t: Torneio) =>
  t.colocacao !== null && t.colocacao <= LUGARES_MESA_FINAL;
export const ehItm = (t: Torneio) => t.premiacao > 0;
export const ehTitulo = (t: Torneio) => t.colocacao === 1;

// ── índice de satélites ────────────────────────────────────────────────────

export type IndiceSatelites = Map<string, Satelite>;

export function indexarSatelites(satelites: Satelite[]): IndiceSatelites {
  return new Map(satelites.map((s) => [s.id, s]));
}

const sat = (t: Torneio, idx: IndiceSatelites) =>
  t.sateliteId ? (idx.get(t.sateliteId) ?? null) : null;

// ── resumo ─────────────────────────────────────────────────────────────────

export interface Resumo {
  torneios: number;
  investido: number;
  retorno: number;
  lucro: number;
  /** Retorno sobre investimento, em pontos percentuais. */
  roi: number;
  itm: number;
  itmPct: number;
  mesasFinais: number;
  titulos: number;
  /** Média das autoavaliações de disciplina, 0–10. */
  disciplina: number;
  minutosJogados: number;
  buyInMedio: number;
  /** Maior premiação isolada do período. */
  maiorPremio: number;
}

export function resumir(
  torneios: Torneio[],
  idx: IndiceSatelites,
  satelitesAvulsos: Satelite[] = [],
): Resumo {
  const investidoTorneios = torneios.reduce((a, t) => a + investimento(t, sat(t, idx)), 0);
  const investidoAvulso = satelitesAvulsos.reduce((a, s) => a + custoSatelite(s), 0);
  const investido = investidoTorneios + investidoAvulso;
  const retorno = torneios.reduce((a, t) => a + t.premiacao, 0);
  const comNota = torneios.filter((t) => t.notaDisciplina !== null);

  return {
    torneios: torneios.length,
    investido,
    retorno,
    lucro: retorno - investido,
    roi: investido > 0 ? ((retorno - investido) / investido) * 100 : 0,
    itm: torneios.filter(ehItm).length,
    itmPct: torneios.length ? (torneios.filter(ehItm).length / torneios.length) * 100 : 0,
    mesasFinais: torneios.filter(ehMesaFinal).length,
    titulos: torneios.filter(ehTitulo).length,
    disciplina: comNota.length
      ? comNota.reduce((a, t) => a + (t.notaDisciplina ?? 0), 0) / comNota.length
      : 0,
    minutosJogados: torneios.reduce((a, t) => a + t.duracaoMin, 0),
    buyInMedio: torneios.length
      ? torneios.reduce((a, t) => a + t.buyIn, 0) / torneios.length
      : 0,
    maiorPremio: torneios.reduce((a, t) => Math.max(a, t.premiacao), 0),
  };
}

// ── série de bankroll ──────────────────────────────────────────────────────

export interface PontoBankroll {
  t: number;
  saldo: number;
  delta: number;
  rotulo: string;
  tipo: "torneio" | "satelite" | "movimento";
  /** Referência ao torneio, quando houver — alimenta o tooltip. */
  torneio?: Torneio;
}

/**
 * Linha do tempo completa do dinheiro: torneios, satélites que não viraram
 * vaga e aportes/saques, na ordem em que aconteceram.
 */
export function serieBankroll(
  torneios: Torneio[],
  satelites: Satelite[],
  movimentos: MovimentoBankroll[],
  idx: IndiceSatelites,
): PontoBankroll[] {
  type Bruto = Omit<PontoBankroll, "saldo">;
  const eventos: Bruto[] = [];

  for (const t of torneios) {
    eventos.push({
      t: new Date(t.data).getTime(),
      delta: lucro(t, sat(t, idx)),
      rotulo: t.nome,
      tipo: "torneio",
      torneio: t,
    });
  }
  // Só os satélites que não geraram vaga entram como custo isolado; os que
  // classificaram já estão embutidos no custo de entrada do principal.
  for (const s of satelites) {
    if (s.torneioId) continue;
    eventos.push({
      t: new Date(s.data).getTime(),
      delta: -custoSatelite(s),
      rotulo: s.nome,
      tipo: "satelite",
    });
  }
  for (const m of movimentos) {
    eventos.push({
      t: new Date(m.data).getTime(),
      delta: m.tipo === "aporte" ? m.valor : -m.valor,
      rotulo: m.descricao,
      tipo: "movimento",
    });
  }

  eventos.sort((a, b) => a.t - b.t);

  let saldo = 0;
  return eventos.map((e) => {
    saldo += e.delta;
    return { ...e, saldo };
  });
}

/** Saldo vigente em um instante — para variações "vs. 30 dias atrás". */
export function saldoEm(serie: PontoBankroll[], instante: number): number {
  let saldo = 0;
  for (const p of serie) {
    if (p.t > instante) break;
    saldo = p.saldo;
  }
  return saldo;
}

// ── recortes ───────────────────────────────────────────────────────────────

export interface Recorte {
  torneios: Torneio[];
  satelites: Satelite[];
  satelitesAvulsos: Satelite[];
  resumo: Resumo;
}

export function recortar(
  torneios: Torneio[],
  satelites: Satelite[],
  idx: IndiceSatelites,
  de: number,
  ate: number,
): Recorte {
  const ts = torneios.filter((t) => dentro(t.data, de, ate));
  const ss = satelites.filter((s) => dentro(s.data, de, ate));
  const avulsos = ss.filter((s) => !s.torneioId);
  return { torneios: ts, satelites: ss, satelitesAvulsos: avulsos, resumo: resumir(ts, idx, avulsos) };
}

/** Variação percentual protegida contra base zero ou negativa. */
export function variacaoPct(atual: number, anterior: number): number | null {
  if (!Number.isFinite(atual) || !Number.isFinite(anterior)) return null;
  if (anterior === 0) return null;
  return ((atual - anterior) / Math.abs(anterior)) * 100;
}

// ── energia ────────────────────────────────────────────────────────────────

/**
 * Quão fundo o jogador foi no campo, de 0 (primeiro eliminado) a 1 (campeão).
 * Existe porque ROI é péssimo estimador em amostra pequena — basta um prêmio
 * grande cair ou não para o número virar de sinal. Profundidade usa TODOS os
 * torneios do grupo, não só os premiados, então move devagar e diz a verdade
 * sobre desempenho mesmo com dez registros.
 */
export function profundidade(t: Torneio): number | null {
  if (t.colocacao === null || t.jogadores <= 1) return null;
  return 1 - (t.colocacao - 1) / (t.jogadores - 1);
}

export interface FaixaEnergia {
  nivel: NivelEnergia;
  torneios: number;
  roi: number;
  itmPct: number;
  lucro: number;
  disciplina: number;
  /** Média de `profundidade`, 0–1. O indicador estável desta faixa. */
  profundidadeMedia: number;
}

export function porEnergia(torneios: Torneio[], idx: IndiceSatelites): FaixaEnergia[] {
  return NIVEIS_ENERGIA.map((nivel) => {
    const grupo = torneios.filter((t) => t.energia === nivel);
    const r = resumir(grupo, idx);
    const profundidades = grupo.map(profundidade).filter((p): p is number => p !== null);
    return {
      nivel,
      torneios: grupo.length,
      roi: r.roi,
      itmPct: r.itmPct,
      lucro: r.lucro,
      disciplina: r.disciplina,
      profundidadeMedia: profundidades.length
        ? profundidades.reduce((a, p) => a + p, 0) / profundidades.length
        : 0,
    };
  });
}

// ── agregação mensal (para o eixo do gráfico de evolução) ──────────────────

export interface PontoMensal {
  chave: string;
  t: number;
  lucro: number;
  torneios: number;
  roi: number;
}

export function porMes(torneios: Torneio[], idx: IndiceSatelites): PontoMensal[] {
  const mapa = new Map<string, Torneio[]>();
  for (const t of torneios) {
    const d = new Date(t.data);
    const chave = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    (mapa.get(chave) ?? mapa.set(chave, []).get(chave)!).push(t);
  }
  return [...mapa.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([chave, grupo]) => {
      const r = resumir(grupo, idx);
      return {
        chave,
        t: new Date(`${chave}-01T00:00:00.000Z`).getTime(),
        lucro: r.lucro,
        torneios: grupo.length,
        roi: r.roi,
      };
    });
}

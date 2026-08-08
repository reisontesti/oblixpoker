/**
 * As 169 mãos iniciais do hold'em, e a notação que as descreve.
 *
 * Duas cartas fechadas dão 1.326 combinações, mas só 169 mãos distintas antes
 * do flop: naipe só importa por serem iguais ou diferentes. AhKh e AsKs jogam
 * exatamente igual, então ambas são "AKs".
 *
 * Isso não é detalhe de implementação — é o que torna range um objeto pequeno
 * o bastante para ser escrito à mão, revisado por uma pessoa e versionado no
 * repositório. Toda a camada de dados do treino depende disso.
 */

export const ORDEM_CARTAS = "AKQJT98765432" as const;

export type Carta = (typeof ORDEM_CARTAS)[number];

/** Notação canônica: "AA", "AKs", "AKo". */
export type Mao = string;

const valor = (c: string) => ORDEM_CARTAS.indexOf(c as Carta);

/**
 * Monta a notação a partir de duas cartas. A carta mais alta vem primeiro —
 * "KAs" e "AKs" são a mesma mão, e admitir as duas grafias espalharia a
 * ambiguidade por todo lugar que compara strings.
 */
export function nomearMao(a: string, b: string, suited: boolean): Mao {
  const [alta, baixa] = valor(a) <= valor(b) ? [a, b] : [b, a];
  if (alta === baixa) return `${alta}${baixa}`;
  return `${alta}${baixa}${suited ? "s" : "o"}`;
}

/** Todas as 169, da mais forte para a mais fraca segundo `FORCA`. */
export const TODAS_AS_MAOS: Mao[] = (() => {
  const saida: Mao[] = [];
  for (let i = 0; i < 13; i++) {
    for (let j = 0; j < 13; j++) {
      const a = ORDEM_CARTAS[i];
      const b = ORDEM_CARTAS[j];
      if (i === j) saida.push(`${a}${a}`);
      else if (i < j) saida.push(`${a}${b}s`);
      else saida.push(`${b}${a}o`);
    }
  }
  return saida;
})();

/** Quantas das 1.326 combinações cada mão representa. */
export function combinacoes(mao: Mao): number {
  if (mao.length === 2) return 6; // par: C(4,2)
  return mao.endsWith("s") ? 4 : 12;
}

const TOTAL_COMBINACOES = 1326;

/** Fração do total de mãos que um conjunto representa, de 0 a 1. */
export function porcentagemDoRange(maos: Iterable<Mao>): number {
  let combos = 0;
  for (const m of maos) combos += combinacoes(m);
  return combos / TOTAL_COMBINACOES;
}

// ── notação de range ───────────────────────────────────────────────────────

/**
 * Interpreta a notação corrente de poker.
 *
 *   "77+"        pares de 77 para cima
 *   "A2s+"       A2s até AKs
 *   "KTo+"       KTo até KQo
 *   "T9s"        exatamente essa
 *   "JTs-87s"    a escada de conectores, de 87s até JTs
 *   "22-66"      intervalo de pares
 *
 * Aceitar essa notação é o que permite escrever um range inteiro numa linha
 * legível por qualquer jogador — e revisável por qualquer jogador, que importa
 * mais: conteúdo de poker errado no produto é pior do que conteúdo ausente.
 */
export function interpretarRange(notacao: string): Set<Mao> {
  const saida = new Set<Mao>();
  for (const bruto of notacao.split(",")) {
    const parte = bruto.trim();
    if (!parte) continue;
    for (const m of interpretarParte(parte)) saida.add(m);
  }
  return saida;
}

function interpretarParte(parte: string): Mao[] {
  // Intervalo explícito: "JTs-87s" ou "22-66".
  if (parte.includes("-")) {
    const [de, ate] = parte.split("-").map((p) => p.trim());
    return escada(de, ate);
  }

  if (parte.endsWith("+")) return comMaisAcima(parte.slice(0, -1));

  return [normalizar(parte)];
}

function normalizar(m: string): Mao {
  const a = m[0].toUpperCase();
  const b = m[1].toUpperCase();
  if (a === b) return `${a}${b}`;
  const sufixo = m[2]?.toLowerCase() === "s" ? "s" : "o";
  return nomearMao(a, b, sufixo === "s");
}

/**
 * O "+" tem dois significados, e confundi-los é o erro clássico de quem
 * implementa isto: em par ele sobe o PAR ("77+" = 77,88,…,AA); em mão sem par
 * ele sobe a carta BAIXA mantendo a alta ("A2s+" = A2s…AKs, nunca K2s).
 */
function comMaisAcima(base: string): Mao[] {
  const m = normalizar(base);
  const saida: Mao[] = [];

  if (m.length === 2) {
    const i = valor(m[0]);
    for (let k = i; k >= 0; k--) saida.push(`${ORDEM_CARTAS[k]}${ORDEM_CARTAS[k]}`);
    return saida;
  }

  const alta = m[0];
  const baixa = m[1];
  const sufixo = m[2] as "s" | "o";
  const iAlta = valor(alta);
  for (let k = valor(baixa); k > iAlta; k--) {
    saida.push(`${alta}${ORDEM_CARTAS[k]}${sufixo}`);
  }
  return saida;
}

/** Escada entre duas mãos do mesmo tipo — pares ou mesmo gap. */
function escada(de: string, ate: string): Mao[] {
  const a = normalizar(de);
  const b = normalizar(ate);

  if (a.length === 2 && b.length === 2) {
    const [alto, baixo] = [valor(a[0]), valor(b[0])].sort((x, y) => x - y);
    const saida: Mao[] = [];
    for (let k = alto; k <= baixo; k++) saida.push(`${ORDEM_CARTAS[k]}${ORDEM_CARTAS[k]}`);
    return saida;
  }

  // Conectores e gappers: mantém a distância entre as cartas e desce as duas.
  const sufixo = a[2] as "s" | "o";
  const gap = valor(a[1]) - valor(a[0]);
  const inicio = Math.min(valor(a[0]), valor(b[0]));
  const fim = Math.max(valor(a[0]), valor(b[0]));
  const saida: Mao[] = [];
  for (let k = inicio; k <= fim; k++) {
    const j = k + gap;
    if (j > 12) break;
    saida.push(`${ORDEM_CARTAS[k]}${ORDEM_CARTAS[j]}${sufixo}`);
  }
  return saida;
}

// ── força relativa ─────────────────────────────────────────────────────────

/**
 * Ordem de força para sortear mãos e para desempatar.
 *
 * É uma aproximação declarada, não verdade absoluta: a força real de uma mão
 * depende de profundidade, posição e número de adversários — 76s vale mais
 * que A8o num pote de 100 BB e vale menos num all-in de 8 BB. Serve para
 * ordenar e para o gerador escolher mãos plausíveis; as DECISÕES vêm dos
 * ranges, nunca daqui.
 */
export const FORCA: Mao[] = (() => {
  const nota = (m: Mao): number => {
    const alta = valor(m[0]);
    const baixa = valor(m[1]);
    const par = m.length === 2;
    const suited = m.endsWith("s");
    if (par) return 100 - alta * 2.2;

    const gap = baixa - alta;
    let n = 62 - alta * 2.6 - baixa * 1.5;
    n -= Math.max(0, gap - 1) * 1.6; // conectividade
    if (suited) n += 5.5; // valor de naipe igual
    if (alta === 0) n += 3; // ases jogam acima do próprio ranking
    return n;
  };
  return [...TODAS_AS_MAOS].sort((a, b) => nota(b) - nota(a));
})();

const POSICAO_NA_FORCA = new Map(FORCA.map((m, i) => [m, i]));

export const forcaDe = (mao: Mao): number => POSICAO_NA_FORCA.get(mao) ?? FORCA.length;

/**
 * Confere a representação de mãos e o parser de ranges.
 *
 * É a fundação de todo o Treino: um range mal interpretado não quebra nada
 * visivelmente — só faz o produto ensinar poker errado, que é o pior defeito
 * possível numa ferramenta de treinamento. Aqui os erros aparecem.
 */
import {
  combinacoes,
  FORCA,
  interpretarRange,
  nomearMao,
  porcentagemDoRange,
  TODAS_AS_MAOS,
} from "@/lib/treino/maos";

let falhas = 0;
function conferir(rotulo: string, esperado: unknown, obtido: unknown) {
  const a = JSON.stringify(esperado);
  const b = JSON.stringify(obtido);
  const ok = a === b;
  console.log(`${ok ? "ok   " : "FALHA"}  ${rotulo.padEnd(52)} ${ok ? b : ""}`);
  if (!ok) {
    falhas++;
    console.log(`        esperado: ${a}`);
    console.log(`        obtido:   ${b}`);
  }
}

const lista = (n: string) => [...interpretarRange(n)].sort();

// ── o universo ─────────────────────────────────────────────────────────────
conferir("são 169 mãos distintas", 169, TODAS_AS_MAOS.length);
conferir("sem repetição", 169, new Set(TODAS_AS_MAOS).size);
conferir("13 pares", 13, TODAS_AS_MAOS.filter((m) => m.length === 2).length);
conferir("78 suited", 78, TODAS_AS_MAOS.filter((m) => m.endsWith("s")).length);
conferir("78 offsuit", 78, TODAS_AS_MAOS.filter((m) => m.endsWith("o")).length);

// As 1.326 combinações do baralho precisam fechar: se não fecharem, toda
// porcentagem de range exibida ao jogador estará errada.
conferir(
  "as combinações somam 1.326",
  1326,
  TODAS_AS_MAOS.reduce((a, m) => a + combinacoes(m), 0),
);
conferir("par tem 6 combos", 6, combinacoes("AA"));
conferir("suited tem 4", 4, combinacoes("AKs"));
conferir("offsuit tem 12", 12, combinacoes("AKo"));

// ── notação canônica ───────────────────────────────────────────────────────
conferir("carta alta vem primeiro", "AKs", nomearMao("K", "A", true));
conferir("par ignora naipe", "77", nomearMao("7", "7", false));

// ── o "+" e seus dois significados ─────────────────────────────────────────
// Confundir os dois e' o erro classico: em par sobe o par, em nao-par sobe
// so a carta baixa. "A2s+" jamais pode devolver K2s.
conferir("77+ sobe os pares", ["77", "88", "99", "AA", "JJ", "KK", "QQ", "TT"].sort(), lista("77+"));
conferir(
  "A2s+ mantém o ás e sobe a baixa",
  ["A2s", "A3s", "A4s", "A5s", "A6s", "A7s", "A8s", "A9s", "AJs", "AKs", "AQs", "ATs"].sort(),
  lista("A2s+"),
);
conferir("KTo+ para em KQo", ["KJo", "KQo", "KTo"].sort(), lista("KTo+"));
conferir("A2s+ não vaza para outra carta alta", false, lista("A2s+").some((m) => m[0] !== "A"));

// ── intervalos ─────────────────────────────────────────────────────────────
conferir("22-55 é intervalo fechado", ["22", "33", "44", "55"], lista("22-55"));
conferir(
  "JTs-87s desce a escada de conectores",
  ["87s", "98s", "JTs", "T9s"].sort(),
  lista("JTs-87s"),
);

// ── composição ─────────────────────────────────────────────────────────────
const abertura = interpretarRange("77+, ATs+, KQs, AJo+");
conferir("range composto soma as partes", 8 + 4 + 1 + 3, abertura.size);
conferir("contém o esperado", true, abertura.has("AA") && abertura.has("KQs") && abertura.has("AJo"));
conferir("não contém o que não foi pedido", false, abertura.has("KJs") || abertura.has("66"));

// ── porcentagem ────────────────────────────────────────────────────────────
conferir("range vazio é 0%", "0.0", (porcentagemDoRange([]) * 100).toFixed(1));
conferir("todas as mãos é 100%", "100.0", (porcentagemDoRange(TODAS_AS_MAOS) * 100).toFixed(1));
// AA sozinho: 6 de 1326.
conferir("AA é 0,45%", "0.45", (porcentagemDoRange(["AA"]) * 100).toFixed(2));
// Um range de abertura de BTN plausível fica na casa dos 40%.
const btn = interpretarRange(
  "22+, A2s+, K2s+, Q5s+, J7s+, T7s+, 97s+, 87s, 76s, 65s, A2o+, K9o+, Q9o+, J9o+, T9o",
);
const pct = porcentagemDoRange(btn) * 100;
conferir("range de BTN fica entre 35% e 50%", true, pct > 35 && pct < 50, );
console.log(`        (${pct.toFixed(1)}%)`);

// ── ordem de força ─────────────────────────────────────────────────────────
conferir("força cobre as 169", 169, FORCA.length);
conferir("AA é a mais forte", "AA", FORCA[0]);
conferir("32o é a mais fraca", "32o", FORCA.at(-1));
const indice = (m: string) => FORCA.indexOf(m);
conferir("suited vale mais que offsuit", true, indice("AKs") < indice("AKo"));
conferir("par grande acima de conector", true, indice("QQ") < indice("87s"));
conferir("AKo acima de A9s", true, indice("AKo") < indice("A9s"));

console.log(falhas === 0 ? "\nRepresentação de mãos consistente.\n" : `\n${falhas} falha(s).\n`);
process.exit(falhas === 0 ? 0 : 1);

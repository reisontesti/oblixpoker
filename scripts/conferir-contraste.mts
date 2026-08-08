/**
 * O contraste das DUAS paletas, lido do CSS de verdade.
 *
 * Este teste existe porque o modo claro nasceu de um erro que quase passou: o
 * jade #199E70 e o âmbar #D99A1F foram validados sobre a obsidiana #0E1011 e
 * dão 3,1:1 e 2,2:1 sobre branco. Clarear o tema sem trocar as matizes
 * reprovaria justamente os avisos — o vermelho de prejuízo e o âmbar de
 * atenção, que são exatamente o que ninguém pode deixar de ler.
 *
 * Lê `globals.css` em vez de repetir os valores aqui. Uma segunda lista de
 * trinta cores divergiria da primeira, e o teste passaria a atestar a si mesmo.
 */

import { readFileSync } from "node:fs";

const CSS = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

// ── extração ───────────────────────────────────────────────────────────────

/** Pega o bloco `{...}` que começa depois do seletor dado. */
function bloco(marcador: string): string {
  const i = CSS.indexOf(marcador);
  if (i < 0) throw new Error(`bloco não encontrado: ${marcador}`);
  const abre = CSS.indexOf("{", i);
  let nivel = 0;
  for (let k = abre; k < CSS.length; k++) {
    if (CSS[k] === "{") nivel++;
    else if (CSS[k] === "}" && --nivel === 0) return CSS.slice(abre + 1, k);
  }
  throw new Error(`bloco não fecha: ${marcador}`);
}

function variaveis(texto: string): Record<string, string> {
  const saida: Record<string, string> = {};
  for (const [, nome, valor] of texto.matchAll(/(--color-[\w-]+)\s*:\s*([^;]+);/g)) {
    saida[nome] = valor.trim();
  }
  return saida;
}

const ESCURO = variaveis(bloco("@theme"));
const CLARO = { ...ESCURO, ...variaveis(bloco(':root[data-tema="claro"]')) };

// ── cor ────────────────────────────────────────────────────────────────────

type RGB = [number, number, number];

function paraRgb(v: string): RGB {
  const hex = v.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgba = v.match(/rgba?\(([^)]+)\)/);
  if (rgba) {
    const [r, g, b] = rgba[1].split(",").map((x) => parseFloat(x));
    return [r, g, b];
  }
  throw new Error(`cor não reconhecida: ${v}`);
}

/** Alfa de um `rgba(...)`; 1 para tudo o mais. */
function alfa(v: string): number {
  const m = v.match(/rgba\(([^)]+)\)/);
  if (!m) return 1;
  const partes = m[1].split(",");
  return partes.length === 4 ? parseFloat(partes[3]) : 1;
}

/** Achata uma cor translúcida sobre o fundo — é o que o olho vê. */
function sobre(cor: string, fundo: RGB): RGB {
  const a = alfa(cor);
  const c = paraRgb(cor);
  return [0, 1, 2].map((i) => c[i] * a + fundo[i] * (1 - a)) as RGB;
}

const canal = (v: number) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

const luminancia = ([r, g, b]: RGB) =>
  0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);

function contraste(a: RGB, b: RGB): number {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

// ── conferência ────────────────────────────────────────────────────────────

let falhas = 0;

function checa(rotulo: string, valor: number, minimo: number) {
  const ok = valor >= minimo;
  console.log(
    `${ok ? "ok   " : "FALHA"}  ${rotulo.padEnd(52)} ${valor.toFixed(2)}:1  (mín. ${minimo})`,
  );
  if (!ok) falhas++;
}

/**
 * `4.5` é o piso de texto normal na WCAG AA; `3` vale para marca de dado e
 * texto grande. Cada par abaixo foi escolhido por aparecer de verdade no
 * produto — nada de conferir combinação que ninguém desenha.
 */
for (const [tema, P] of [
  ["escuro", ESCURO],
  ["claro", CLARO],
] as const) {
  console.log(`\n── tema ${tema} ────────────────────────────────────────────────`);

  const superficie = paraRgb(P["--color-card"]);
  const plano = paraRgb(P["--color-plane"]);

  // Texto sobre o cartão — a leitura do dia a dia.
  checa(`${tema}: tinta principal sobre cartão`, contraste(paraRgb(P["--color-ink"]), superficie), 4.5);
  checa(`${tema}: tinta secundária sobre cartão`, contraste(paraRgb(P["--color-ink-secondary"]), superficie), 4.5);
  checa(`${tema}: tinta apagada sobre cartão`, contraste(paraRgb(P["--color-ink-muted"]), superficie), 4.5);
  checa(`${tema}: tinta principal sobre o plano`, contraste(paraRgb(P["--color-ink"]), plano), 4.5);

  // Estado: lucro, prejuízo e atenção viram TEXTO no produto (o saldo de cada
  // torneio, o aviso de leitura vencida). Piso de texto, não de marca.
  checa(`${tema}: positivo como texto`, contraste(paraRgb(P["--color-positivo"]), superficie), 4.5);
  checa(`${tema}: negativo como texto`, contraste(paraRgb(P["--color-negativo"]), superficie), 4.5);
  checa(`${tema}: atenção como texto`, contraste(paraRgb(P["--color-atencao"]), superficie), 4.5);

  // Identidade: direto × satélite aparecem como pastilha com texto colorido.
  checa(`${tema}: via direta como texto`, contraste(paraRgb(P["--color-direto"]), superficie), 4.5);
  checa(`${tema}: via satélite como texto`, contraste(paraRgb(P["--color-satelite"]), superficie), 4.5);

  // Botão primário: o rótulo é `text-plane` sobre o jade.
  checa(
    `${tema}: rótulo do botão primário`,
    contraste(plano, paraRgb(P["--color-positivo"])),
    4.5,
  );

  // Rampa de energia: marca de dado, piso 3:1 — e as DUAS pontas contam. Era
  // a ponta clara que sumia sobre branco.
  for (const passo of [1, 5]) {
    checa(
      `${tema}: energia ${passo} como marca de dado`,
      contraste(paraRgb(P[`--color-energia-${passo}`]), superficie),
      3,
    );
  }

  // Traçado: o hairline é translúcido, então precisa ser achatado sobre a
  // superfície antes de medir. 1,3:1 é pouco de propósito — é fio de
  // separação, não informação; abaixo disso ele some e o cartão perde a borda.
  checa(
    `${tema}: fio de separação visível`,
    contraste(sobre(P["--color-hairline"], superficie), superficie),
    1.1,
  );
  checa(
    `${tema}: fio forte visível`,
    contraste(sobre(P["--color-hairline-strong"], superficie), superficie),
    1.2,
  );

  // Trilho de barra de progresso: o vazio precisa se distinguir do cartão.
  checa(
    `${tema}: trilho de barra distinguível`,
    contraste(sobre(P["--color-trilho"], superficie), superficie),
    1.15,
  );
}

// ── a direção da rampa ─────────────────────────────────────────────────────
//
// A rampa ordinal precisa ser MONÓTONA em luminância nos dois temas: cinco
// passos que sobem e descem não comunicam ordem nenhuma. A direção pode
// inverter entre os temas — e inverte —, mas dentro de cada um ela é reta.
console.log("\n── rampa de energia ──────────────────────────────────────────");
for (const [tema, P] of [
  ["escuro", ESCURO],
  ["claro", CLARO],
] as const) {
  const ls = [1, 2, 3, 4, 5].map((i) => luminancia(paraRgb(P[`--color-energia-${i}`])));
  const sobe = ls.every((v, i) => i === 0 || v > ls[i - 1]);
  const desce = ls.every((v, i) => i === 0 || v < ls[i - 1]);
  const ok = sobe || desce;
  console.log(
    `${ok ? "ok   " : "FALHA"}  ${`${tema}: rampa monótona`.padEnd(52)} ${sobe ? "cresce" : desce ? "decresce" : "ZIGUEZAGUE"}`,
  );
  if (!ok) falhas++;

  // Passos vizinhos precisam ser distinguíveis entre si, não só do fundo.
  const menorSalto = Math.min(...ls.slice(1).map((v, i) => Math.abs(v - ls[i])));
  const okSalto = menorSalto >= 0.03;
  console.log(
    `${okSalto ? "ok   " : "FALHA"}  ${`${tema}: passos distinguíveis entre si`.padEnd(52)} ΔL ${menorSalto.toFixed(3)} (mín. 0.030)`,
  );
  if (!okSalto) falhas++;
}

console.log(falhas === 0 ? "\nContraste válido nos dois temas.\n" : `\n${falhas} falha(s).\n`);
process.exit(falhas === 0 ? 0 : 1);

export interface Escala {
  (v: number): number;
  inverter: (px: number) => number;
  dominio: [number, number];
  alcance: [number, number];
}

export function escalaLinear(dominio: [number, number], alcance: [number, number]): Escala {
  const [d0, d1] = dominio;
  const [a0, a1] = alcance;
  const span = d1 - d0 || 1;
  const f = ((v: number) => a0 + ((v - d0) / span) * (a1 - a0)) as Escala;
  f.inverter = (px: number) => d0 + ((px - a0) / (a1 - a0 || 1)) * span;
  f.dominio = dominio;
  f.alcance = alcance;
  return f;
}

/**
 * Marcas de eixo em números redondos (0 / 2.500 / 5.000), nunca nos extremos
 * crus dos dados. Um eixo que termina em "9.973" denuncia que ninguém pensou
 * nele.
 */
export function ticksBonitos(min: number, max: number, alvo = 5): number[] {
  if (min === max) return [min];
  const bruto = (max - min) / alvo;
  const magnitude = Math.pow(10, Math.floor(Math.log10(bruto)));
  const normalizado = bruto / magnitude;
  const passo =
    (normalizado >= 7.5 ? 10 : normalizado >= 3.5 ? 5 : normalizado >= 1.5 ? 2 : 1) * magnitude;

  const inicio = Math.ceil(min / passo) * passo;
  const ticks: number[] = [];
  for (let v = inicio; v <= max + passo * 0.001; v += passo) {
    ticks.push(Math.round(v * 1e6) / 1e6);
  }
  return ticks;
}

/** Domínio arredondado para fora, para a linha não encostar na borda. */
export function dominioComFolga(valores: number[], folga = 0.12): [number, number] {
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const span = max - min || Math.abs(max) || 1;
  return [min - span * folga, max + span * folga];
}

/** Caminho SVG por segmentos retos — sem suavização que invente valores. */
export function caminhoLinha(pontos: { x: number; y: number }[]): string {
  return pontos.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
}

export function caminhoArea(
  pontos: { x: number; y: number }[],
  base: number,
): string {
  if (!pontos.length) return "";
  const primeiro = pontos[0];
  const ultimo = pontos[pontos.length - 1];
  return `${caminhoLinha(pontos)} L${ultimo.x.toFixed(2)},${base.toFixed(2)} L${primeiro.x.toFixed(2)},${base.toFixed(2)} Z`;
}

/** Índice do ponto mais próximo em x — base do crosshair. */
export function maisProximo(pontos: { x: number }[], x: number): number {
  let melhor = 0;
  let dist = Infinity;
  for (let i = 0; i < pontos.length; i++) {
    const d = Math.abs(pontos[i].x - x);
    if (d < dist) {
      dist = d;
      melhor = i;
    }
  }
  return melhor;
}

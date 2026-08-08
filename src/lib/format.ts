const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const BRL_CENTAVOS = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const NUM = new Intl.NumberFormat("pt-BR");

const DECIMAL = (casas: number) =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });

export function moeda(valor: number, centavos = false): string {
  return (centavos ? BRL_CENTAVOS : BRL).format(valor);
}

/** R$ 12,4 mil — para eixos e espaços apertados. */
export function moedaCompacta(valor: number): string {
  const abs = Math.abs(valor);
  const sinal = valor < 0 ? "−" : "";
  if (abs >= 1_000_000) return `${sinal}R$ ${DECIMAL(1).format(abs / 1_000_000)} mi`;
  if (abs >= 1_000) return `${sinal}R$ ${DECIMAL(abs >= 10_000 ? 0 : 1).format(abs / 1_000)} mil`;
  return `${sinal}R$ ${NUM.format(Math.round(abs))}`;
}

export function numero(valor: number): string {
  return NUM.format(valor);
}

export function decimal(valor: number, casas = 1): string {
  return DECIMAL(casas).format(valor);
}

export function percentual(valor: number, casas = 0): string {
  return `${DECIMAL(casas).format(valor)}%`;
}

/** Percentual com sinal explícito — para variações. */
export function variacao(valor: number, casas = 0): string {
  const s = valor > 0 ? "+" : valor < 0 ? "−" : "";
  return `${s}${DECIMAL(casas).format(Math.abs(valor))}%`;
}

/**
 * Diferença entre dois percentuais, em pontos. Sem o símbolo "%": a distância
 * entre 16% e 12% é de 4 pontos, não de 4% — escrever "+4%" ali diria outra
 * coisa e estaria errado.
 */
export function pontos(valor: number, casas = 0): string {
  const s = valor > 0 ? "+" : valor < 0 ? "−" : "";
  return `${s}${DECIMAL(casas).format(Math.abs(valor))} pts`;
}

export function moedaComSinal(valor: number): string {
  const s = valor > 0 ? "+" : valor < 0 ? "−" : "";
  return `${s}${BRL.format(Math.abs(valor))}`;
}

const MESES = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

/** 14 mar */
export function dataCurta(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`;
}

/** 14 mar 2026 */
export function dataMedia(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** mar/26 — para eixos de tempo. */
export function mesAno(iso: string): string {
  const d = new Date(iso);
  return `${MESES[d.getUTCMonth()]}/${String(d.getUTCFullYear()).slice(2)}`;
}

/** 4h 20min */
export function duracao(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = Math.round(minutos % 60);
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

/** 128h — total acumulado, sem minutos. */
export function horas(minutos: number): string {
  return `${NUM.format(Math.round(minutos / 60))}h`;
}

export function ordinal(posicao: number): string {
  return `${posicao}º`;
}

/**
 * Dia do calendário LOCAL, como `AAAA-MM-DD`.
 *
 * Existe porque comparar `toISOString().slice(0, 10)` compara em UTC: às 21h
 * em Brasília o UTC já virou o dia seguinte, e o check-in feito antes de sentar
 * deixaria de contar como "hoje" — exatamente no horário em que jogador de
 * poker usa o app.
 */
export function diaLocal(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

/** "há 3 dias" — relativo à data de referência do painel. */
export function haQuantoTempo(iso: string, referencia: Date): string {
  const dias = Math.floor((referencia.getTime() - new Date(iso).getTime()) / 86_400_000);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 7) return `há ${dias} dias`;
  if (dias < 14) return "há 1 semana";
  if (dias < 30) return `há ${Math.floor(dias / 7)} semanas`;
  if (dias < 60) return "há 1 mês";
  return `há ${Math.floor(dias / 30)} meses`;
}

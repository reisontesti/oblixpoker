import type { Mao } from "@/lib/integracoes/tipos";

/**
 * As estatísticas, contadas mão a mão.
 *
 * Guardamos CONTADORES, não percentuais. Dois motivos, e os dois importam.
 *
 * Contador soma; percentual não. Importar um segundo arquivo com 300 mãos
 * precisa somar às 8.000 anteriores, e a média de duas médias não é a média —
 * é só um número parecido o bastante para ninguém desconfiar.
 *
 * E contador carrega a amostra junto. `vpip: 24%` não diz se saiu de 12 mãos
 * ou de 1.200; `{ vpip: 288, maos: 1200 }` diz. É o que permite ao Oblix se
 * calar quando a amostra é pequena, como ele já faz no resto do produto.
 *
 * O denominador de cada estatística é a OPORTUNIDADE, nunca o total de mãos.
 * C-bet dividido por todas as mãos daria um número menor e sem sentido: só
 * quem foi o agressor pré-flop e viu o flop teve a chance de apostar.
 */

export interface Contadores {
  maos: number;

  /** Pôs dinheiro voluntariamente no pré-flop (blind não conta). */
  vpip: number;
  /** Aumentou no pré-flop. */
  pfr: number;

  /** Aumentou diante de um aumento — o 3-bet. */
  tresBet: number;
  /** Enfrentou um aumento no pré-flop, tendo ou não 3-betado. */
  tresBetOportunidades: number;

  /** Apostou no flop sendo o agressor pré-flop. */
  cbet: number;
  /** Foi agressor pré-flop e viu o flop. */
  cbetOportunidades: number;

  /** Desistiu no flop diante de uma continuação. */
  foldACbet: number;
  foldACbetOportunidades: number;

  /** Viu o flop. Denominador do WTSD. */
  viuFlop: number;
  /** Chegou ao showdown. */
  showdown: number;
  /** Venceu no showdown. Denominador é `showdown`. */
  venceuShowdown: number;

  /** Apostas e aumentos no pós-flop. */
  agressivas: number;
  /** Pagamentos no pós-flop. Denominador do fator de agressão. */
  passivas: number;
}

export const ZERADO: Contadores = {
  maos: 0,
  vpip: 0,
  pfr: 0,
  tresBet: 0,
  tresBetOportunidades: 0,
  cbet: 0,
  cbetOportunidades: 0,
  foldACbet: 0,
  foldACbetOportunidades: 0,
  viuFlop: 0,
  showdown: 0,
  venceuShowdown: 0,
  agressivas: 0,
  passivas: 0,
};

export function somar(a: Contadores, b: Contadores): Contadores {
  const saida = {} as Contadores;
  for (const k of Object.keys(ZERADO) as (keyof Contadores)[]) saida[k] = a[k] + b[k];
  return saida;
}

const AGRESSIVA = new Set(["bet", "raise", "all_in"]);

/**
 * Percorre uma mão e devolve os contadores de CADA jogador que participou.
 *
 * Uma passagem só, seguindo a ordem das ações — que é a única forma de saber
 * quem enfrentou o quê. "Fold diante de continuação" não é dedutível olhando
 * as ações isoladas: depende de quem apostou antes, na mesma rua.
 *
 * Tudo o que é "por mão" passa por um conjunto de já-contados. Sem isso, quem
 * age duas vezes no pré-flop — aumenta e depois paga o 3-bet — somava VPIP
 * duas vezes na mesma mão, e o percentual passava de 100%. Percentual acima de
 * 100 pelo menos denuncia o erro; 74% em vez de 41% não denuncia nada.
 */
export function contarMao(mao: Mao): Map<string, Contadores> {
  const por = new Map<string, Contadores>();
  const doJogador = (nome: string) => {
    let c = por.get(nome);
    if (!c) {
      c = { ...ZERADO, maos: 1 };
      por.set(nome, c);
    }
    return c;
  };

  // Todo mundo que recebeu cartas conta uma mão, mesmo quem só deu fold.
  for (const nome of mao.jogadores) doJogador(nome);

  const preflop = mao.acoes.filter((a) => a.rua === "preflop");
  const flop = mao.acoes.filter((a) => a.rua === "flop");

  /** Marca uma vez por mão e devolve se era a primeira. */
  const umaVez = (() => {
    const vistos = new Set<string>();
    return (chave: string) => {
      if (vistos.has(chave)) return false;
      vistos.add(chave);
      return true;
    };
  })();

  // ── pré-flop ────────────────────────────────────────────────────────────
  //
  // `aumentos` conta os aumentos JÁ OCORRIDOS quando cada jogador age. O big
  // blind não entra na conta: o primeiro raise é o 2-bet e o segundo é o
  // 3-bet, que é o que o nome quer dizer.
  let aumentos = 0;
  let agressorPre: string | null = null;

  for (const a of preflop) {
    if (a.tipo === "small_blind" || a.tipo === "big_blind" || a.tipo === "ante") continue;
    const c = doJogador(a.jogador);

    // Enfrentou um aumento: teve a chance de 3-betar, tendo feito ou não.
    if (aumentos >= 1 && umaVez(`3bo:${a.jogador}`)) c.tresBetOportunidades++;

    if (a.tipo === "call" || a.tipo === "bet") {
      if (umaVez(`vpip:${a.jogador}`)) c.vpip++;
    } else if ((a.tipo === "raise" || a.tipo === "all_in") && a.valor > 0) {
      // All-in pré-flop com dinheiro entrando é aumento para todo efeito.
      if (umaVez(`vpip:${a.jogador}`)) c.vpip++;
      if (umaVez(`pfr:${a.jogador}`)) c.pfr++;
      if (aumentos >= 1 && umaVez(`3b:${a.jogador}`)) c.tresBet++;
      aumentos++;
      agressorPre = a.jogador;
    }
  }

  // ── pós-flop ────────────────────────────────────────────────────────────
  //
  // "Viu o flop" fica com quem AGIU no flop. Presença sem ação não é
  // observável no arquivo, e supor presença inflaria o denominador do WTSD.
  const viramFlop = new Set(flop.map((a) => a.jogador));
  for (const nome of viramFlop) doJogador(nome).viuFlop++;

  if (agressorPre && viramFlop.has(agressorPre)) {
    const c = doJogador(agressorPre);
    c.cbetOportunidades++;
    const primeira = flop.find((x) => x.jogador === agressorPre);
    if (primeira && AGRESSIVA.has(primeira.tipo) && primeira.valor > 0) c.cbet++;
  }

  // Fold diante da continuação: conta a PRIMEIRA resposta de cada jogador que
  // agiu depois de o agressor pré-flop apostar no flop. Parar no primeiro
  // deixaria de fora todo mundo que estava atrás dele na mesa.
  const iCbet = flop.findIndex(
    (a) => a.jogador === agressorPre && AGRESSIVA.has(a.tipo) && a.valor > 0,
  );
  if (iCbet >= 0) {
    for (const a of flop.slice(iCbet + 1)) {
      if (a.jogador === agressorPre) continue;
      if (!umaVez(`fcb:${a.jogador}`)) continue;
      const c = doJogador(a.jogador);
      c.foldACbetOportunidades++;
      if (a.tipo === "fold") c.foldACbet++;
    }
  }

  for (const a of mao.acoes) {
    if (a.rua === "preflop") continue;
    const c = doJogador(a.jogador);
    if (AGRESSIVA.has(a.tipo) && a.valor > 0) c.agressivas++;
    else if (a.tipo === "call") c.passivas++;
  }

  // ── showdown ────────────────────────────────────────────────────────────
  //
  // Quem chegou ao showdown é quem não desistiu em nenhuma rua. E quem venceu
  // sai de `ganhos`, que vale para adversário também — não só para o herói.
  if (mao.foiAoShowdown) {
    const desistiram = new Set(mao.acoes.filter((a) => a.tipo === "fold").map((a) => a.jogador));
    const participaram = new Set(mao.acoes.map((a) => a.jogador));
    for (const nome of participaram) {
      if (desistiram.has(nome)) continue;
      const c = doJogador(nome);
      c.showdown++;
      if ((mao.ganhos[nome] ?? 0) > 0) c.venceuShowdown++;
    }
  }

  return por;
}

/** Junta os contadores de várias mãos, por jogador. */
export function contar(maos: Mao[]): Map<string, Contadores> {
  const total = new Map<string, Contadores>();
  for (const mao of maos) {
    for (const [nome, c] of contarMao(mao)) {
      total.set(nome, somar(total.get(nome) ?? ZERADO, c));
    }
  }
  return total;
}

// ── leitura ────────────────────────────────────────────────────────────────

/**
 * Abaixo disto o Oblix não publica percentual.
 *
 * Trinta mãos dão um VPIP com margem de erro de dezenas de pontos. Mostrar
 * "40%" com essa amostra não é impreciso, é falso — e é o número que o jogador
 * levaria para a mesa.
 */
export const AMOSTRA_MINIMA = 30;

export interface Percentual {
  valor: number | null;
  amostra: number;
}

const pct = (parte: number, todo: number, minimo = AMOSTRA_MINIMA): Percentual =>
  todo >= minimo ? { valor: (parte / todo) * 100, amostra: todo } : { valor: null, amostra: todo };

export interface Perfil {
  vpip: Percentual;
  pfr: Percentual;
  tresBet: Percentual;
  cbet: Percentual;
  foldACbet: Percentual;
  wtsd: Percentual;
  wsd: Percentual;
  /** Apostas e aumentos por pagamento no pós-flop. Nulo sem amostra. */
  agressao: number | null;
  maos: number;
}

export function perfilDe(c: Contadores): Perfil {
  return {
    vpip: pct(c.vpip, c.maos),
    pfr: pct(c.pfr, c.maos),
    tresBet: pct(c.tresBet, c.tresBetOportunidades, 15),
    cbet: pct(c.cbet, c.cbetOportunidades, 10),
    foldACbet: pct(c.foldACbet, c.foldACbetOportunidades, 10),
    wtsd: pct(c.showdown, c.viuFlop, 15),
    wsd: pct(c.venceuShowdown, c.showdown, 10),
    agressao: c.passivas >= 10 ? c.agressivas / c.passivas : null,
    maos: c.maos,
  };
}

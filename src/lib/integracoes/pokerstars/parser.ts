import {
  detectarIdioma,
  numero,
  type Vocabulario,
} from "@/lib/integracoes/pokerstars/formato";
import type {
  Acao,
  FaseDaMao,
  Leitura,
  Mao,
  Posicao,
  Rua,
  TorneioDaSala,
} from "@/lib/integracoes/tipos";

/**
 * Leitor dos arquivos do PokerStars.
 *
 * Lê dois formatos que a sala documenta e o jogador exporta sozinho: o
 * histórico de mãos e o resumo de torneio. Nada de raspagem, nada de senha,
 * nada de ler a mesa aberta — o arquivo já saiu do cliente quando chega aqui.
 *
 * O QUE ESTE PARSER SE RECUSA A FAZER
 *
 * Adivinhar. Toda linha de ação precisa casar com um verbo conhecido; a que
 * não casa marca a mão inteira como incompleta, tira ela das estatísticas e
 * vai para os avisos com o texto original. É mais trabalhoso e é o único jeito
 * de o VPIP que aparece na tela significar o que diz.
 *
 * Inferir fase de torneio que o arquivo não carrega. O histórico de mãos diz
 * quem está NA MESA, nunca quantos restam no torneio — então "bolha" e "meio
 * de torneio" não são dedutíveis de uma mão isolada. O que é exato:
 * `heads_up` (dois jogadores na mão) e `mesa_final` quando o resumo confirma
 * que o herói terminou entre os nove e a mão aconteceu na última mesa em que
 * ele sentou — para terminar entre os nove é preciso ter estado lá. O resto
 * fica `desconhecida` e não contamina diagnóstico nenhum.
 */

// ── posição ────────────────────────────────────────────────────────────────

/**
 * Nomes de posição a partir do botão, andando para trás.
 *
 * A ordem é a de quem age primeiro no pós-flop, e é assim que se lê a mesa:
 * o botão é o último, o small blind vem antes, e assim por diante.
 */
const ORDEM_DA_MESA: Posicao[] = ["BTN", "CO", "HJ", "MP", "UTG+1", "UTG"];

function posicoesPorAssento(
  assentosAtivos: number[],
  assentoDoBotao: number,
): Map<number, Posicao> {
  const saida = new Map<number, Posicao>();
  const n = assentosAtivos.length;
  if (n === 0) return saida;

  const ordenados = [...assentosAtivos].sort((a, b) => a - b);
  const iBotao = ordenados.findIndex((s) => s === assentoDoBotao);
  // Botão num assento vazio (aconteceu: dead button). Sem referência, não há
  // posição — e inventar uma jogaria o herói numa posição em que ele não
  // estava, que é o pior erro possível para o módulo de treino.
  if (iBotao < 0) return saida;

  if (n === 2) {
    // Heads-up: o botão É o small blind. Tratar como mesa cheia poria o herói
    // em "CO" numa mesa de dois.
    saida.set(ordenados[iBotao], "SB");
    saida.set(ordenados[(iBotao + 1) % 2], "BB");
    return saida;
  }

  saida.set(ordenados[iBotao], "BTN");
  saida.set(ordenados[(iBotao + 1) % n], "SB");
  saida.set(ordenados[(iBotao + 2) % n], "BB");

  // Do botão para trás: CO, HJ, MP, UTG+1, UTG — parando antes do big blind.
  let restantes = n - 3;
  let i = 1;
  while (restantes > 0 && i < ORDEM_DA_MESA.length) {
    saida.set(ordenados[(iBotao - i + n * 2) % n], ORDEM_DA_MESA[i]);
    restantes--;
    i++;
  }
  // Mesa de 10: sobra um assento sem nome na lista. Vira UTG, que é o mais
  // adiantado — e é o que ele é.
  if (restantes > 0) {
    saida.set(ordenados[(iBotao - i + n * 2) % n], "UTG");
  }
  return saida;
}

// ── data ───────────────────────────────────────────────────────────────────

/**
 * `2024/01/15 20:31:05 ET` → ISO.
 *
 * O fuso vem como sigla (ET, BRT, WET) e não como deslocamento; converter
 * exigiria uma tabela de horário de verão que envelhece. Guardamos o instante
 * local do arquivo, que é o que o jogador reconhece quando olha o histórico —
 * e é o mesmo critério de data que o resto do Oblix usa.
 */
const DATA_HORA = /(\d{4})\/(\d{2})\/(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/;

function dataDe(linha: string): string | null {
  const m = linha.match(DATA_HORA);
  if (!m) return null;
  const [, a, mes, d, h, min, s] = m;
  return `${a}-${mes}-${d}T${h}:${min}:${s}.000Z`;
}

// ── uma mão ────────────────────────────────────────────────────────────────

interface MaoEmProgresso {
  mao: Mao;
  incompleta: boolean;
  motivo: string | null;
}

function lerMao(bloco: string[], v: Vocabulario): MaoEmProgresso | null {
  const cabecalho = bloco.find((l) => v.cabecalhoMao.test(l));
  if (!cabecalho) return null;

  const id = cabecalho.match(v.cabecalhoMao)![1];
  const torneio = cabecalho.match(v.torneio)?.[1] ?? null;
  const nivel = cabecalho.match(v.nivel);
  const smallBlind = nivel ? numero(nivel[1]) : 0;
  const bigBlind = nivel ? numero(nivel[2]) : 0;
  const data = dataDe(cabecalho) ?? new Date(0).toISOString();

  const linhaMesa = bloco.find((l) => v.mesa.test(l));
  const mesa = linhaMesa?.match(v.mesa)?.[1] ?? null;
  const assentoDoBotao = Number(linhaMesa?.match(v.botao)?.[1] ?? 0);

  // ── assentos ──
  const stacks: Record<string, number> = {};
  const assentoDe = new Map<string, number>();
  for (const l of bloco) {
    const m = l.match(v.assento);
    if (!m) continue;
    const [, assento, nome, fichas] = m;
    stacks[nome] = numero(fichas);
    assentoDe.set(nome, Number(assento));
  }
  const jogadores = [...assentoDe.keys()];
  if (jogadores.length < 2) return null;

  const posicoes = posicoesPorAssento([...assentoDe.values()], assentoDoBotao);

  // ── herói e cartas ──
  const linhaCartas = bloco.find((l) => v.distribuidas.test(l));
  const casadoCartas = linhaCartas?.match(v.distribuidas);
  const heroi = casadoCartas?.[1] ?? "";
  const cartasDoHeroi = casadoCartas?.[2]?.trim().split(/\s+/).filter(Boolean) ?? null;

  // ── percurso das ruas ──
  const acoes: Acao[] = [];
  const board: string[] = [];
  let rua: Rua = "preflop";
  let ante = 0;
  let foiAoShowdown = false;
  let pote = 0;
  let incompleta = false;
  let motivo: string | null = null;
  const recolhido: Record<string, number> = {};
  /** Quanto cada jogador já colocou nesta rua — `raises ... to` é acumulado. */
  let colocadoNaRua: Record<string, number> = {};
  const investido: Record<string, number> = {};

  const somar = (jogador: string, valor: number) => {
    investido[jogador] = (investido[jogador] ?? 0) + valor;
    pote += valor;
  };

  const secoes = v.secoes;
  let passouDoCabecalho = false;

  for (const linha of bloco) {
    const l = linha.trim();
    if (!l) continue;

    // ── marcadores de rua ──
    if (secoes.holeCards.test(l)) {
      passouDoCabecalho = true;
      rua = "preflop";
      continue;
    }
    if (secoes.flop.test(l) || secoes.turn.test(l) || secoes.river.test(l)) {
      rua = secoes.flop.test(l) ? "flop" : secoes.turn.test(l) ? "turn" : "river";
      colocadoNaRua = {};
      for (const grupo of l.matchAll(/\[([^\]]+)\]/g)) {
        for (const carta of grupo[1].trim().split(/\s+/)) {
          if (!board.includes(carta)) board.push(carta);
        }
      }
      continue;
    }
    if (secoes.showdown.test(l)) {
      foiAoShowdown = true;
      rua = "river";
      continue;
    }
    if (secoes.resumo.test(l)) break;

    // ── blinds e antes (antes do HOLE CARDS) ──
    const mAnte = l.match(v.ante);
    if (mAnte) {
      ante = Math.max(ante, numero(mAnte[2]));
      somar(mAnte[1], numero(mAnte[2]));
      continue;
    }
    const mSb = l.match(v.smallBlind);
    if (mSb) {
      colocadoNaRua[mSb[1]] = numero(mSb[2]);
      somar(mSb[1], numero(mSb[2]));
      acoes.push({ jogador: mSb[1], rua: "preflop", tipo: "small_blind", valor: numero(mSb[2]) });
      continue;
    }
    const mBb = l.match(v.bigBlind);
    if (mBb) {
      colocadoNaRua[mBb[1]] = numero(mBb[2]);
      somar(mBb[1], numero(mBb[2]));
      acoes.push({ jogador: mBb[1], rua: "preflop", tipo: "big_blind", valor: numero(mBb[2]) });
      continue;
    }

    if (v.distribuidas.test(l) || v.mesa.test(l) || v.assento.test(l) || v.cabecalhoMao.test(l)) {
      continue;
    }

    const mRecolheu = l.match(v.recolheu);
    if (mRecolheu) {
      recolhido[mRecolheu[1]] = (recolhido[mRecolheu[1]] ?? 0) + numero(mRecolheu[2]);
      continue;
    }
    if (v.mostra.test(l)) continue;

    // ── ações ──
    if (!passouDoCabecalho) continue;
    if (!l.includes(":")) continue;

    let casou = false;
    for (const { padrao, tipo } of v.verbos) {
      const m = l.match(padrao);
      if (!m) continue;
      const jogador = m[1];
      // `raise` no PokerStars é "aumenta X para Y": Y é o total da rua, então
      // o que entra no pote é Y menos o que o jogador já tinha colocado.
      const total = m[2] ? numero(m[2]) : 0;
      const delta =
        tipo === "raise"
          ? Math.max(0, total - (colocadoNaRua[jogador] ?? 0))
          : tipo === "call" || tipo === "bet"
            ? total
            : 0;
      if (delta > 0) {
        colocadoNaRua[jogador] = (colocadoNaRua[jogador] ?? 0) + delta;
        somar(jogador, delta);
      }
      acoes.push({
        jogador,
        rua,
        tipo: v.allIn.test(l) ? "all_in" : tipo,
        valor: delta,
      });
      casou = true;
      break;
    }

    if (!casou) {
      // Linha que parece ação e não foi entendida. A mão inteira sai das
      // estatísticas: contar as ações que sobraram daria um VPIP inventado.
      incompleta = true;
      motivo ??= l.slice(0, 90);
    }
  }

  const bbDoHeroi = heroi && bigBlind > 0 ? (stacks[heroi] ?? 0) / bigBlind : null;

  return {
    incompleta,
    motivo,
    mao: {
      id,
      sala: "pokerstars",
      torneioDaSala: torneio,
      data,
      mesa,
      jogadores,
      heroi,
      cartasDoHeroi: cartasDoHeroi?.length ? cartasDoHeroi : null,
      posicaoDoHeroi: heroi ? (posicoes.get(assentoDe.get(heroi) ?? -1) ?? null) : null,
      board,
      acoes,
      smallBlind,
      bigBlind,
      ante,
      stacks,
      bbDoHeroi,
      pote,
      resultadoDoHeroi: heroi ? (recolhido[heroi] ?? 0) - (investido[heroi] ?? 0) : 0,
      ganhos: recolhido,
      foiAoShowdown,
      fase: jogadores.length === 2 ? "heads_up" : "desconhecida",
    },
  };
}

// ── resumo de torneio ──────────────────────────────────────────────────────

function lerResumoDeTorneio(bloco: string[], v: Vocabulario): TorneioDaSala | null {
  const cabecalho = bloco.find((l) => v.resumoTorneio.test(l));
  if (!cabecalho) return null;

  const idDaSala = cabecalho.match(v.resumoTorneio)![1];
  const texto = bloco.join("\n");

  // Linha a linha: o padrão é ancorado em `^` e `texto.match` sem a flag `m`
  // só testaria o início do bloco inteiro.
  const mBuy = bloco.map((l) => l.match(v.buyIn)).find(Boolean);
  const buyIn = mBuy ? numero(mBuy[1]) : 0;
  const taxa = mBuy ? numero(mBuy[2]) : 0;

  const mJog = bloco.map((l) => l.match(v.totalDeJogadores)).find(Boolean);
  const mCol = texto.match(v.colocacao);
  const mPremio = texto.match(v.premio);
  const mRe = bloco.map((l) => l.match(v.reentradas)).find(Boolean);
  const mInicio = bloco.map((l) => l.match(v.inicioDoTorneio)).find(Boolean);

  // O que vem depois da vírgula às vezes é o nome do torneio e às vezes é só
  // a modalidade ("No Limit Hold'em"). Sem o número junto, uma lista de dez
  // importações vira dez linhas idênticas.
  const depoisDaVirgula = cabecalho.split(",").slice(1).join(",").trim();
  const nome = depoisDaVirgula
    ? `#${idDaSala} · ${depoisDaVirgula}`
    : `Torneio #${idDaSala}`;

  return {
    idDaSala,
    sala: "pokerstars",
    nome,
    data: mInicio
      ? `${mInicio[1]}-${mInicio[2]}-${mInicio[3]}T${mInicio[4]}:${mInicio[5]}:${mInicio[6]}.000Z`
      : new Date(0).toISOString(),
    modalidade: "MTT",
    buyIn,
    taxa,
    bounty: 0,
    rebuys: mRe ? Number(mRe[1]) : 0,
    addons: 0,
    jogadores: mJog ? Number(mJog[1]) : 0,
    colocacao: mCol ? Number(mCol[1]) : null,
    premiacao: mPremio ? numero(mPremio[1]) : 0,
    duracaoMin: 0,
    heroi: "",
    moeda: texto.match(/\b(USD|EUR|BRL|R\$)\b/)?.[1] ?? "",
  };
}

// ── leitura do arquivo ─────────────────────────────────────────────────────

/**
 * Quebra o arquivo em blocos.
 *
 * O PokerStars separa mãos por linha em branco dupla, mas nem todo cliente
 * respeita isso. O corte confiável é o próprio cabeçalho: cada `PokerStars
 * Hand #` começa um bloco novo.
 */
function blocos(texto: string, v: Vocabulario): string[][] {
  const linhas = texto.split(/\r?\n/);
  const saida: string[][] = [];
  let atual: string[] = [];

  for (const l of linhas) {
    const comeca = v.cabecalhoMao.test(l) || v.resumoTorneio.test(l);
    if (comeca && atual.length) {
      saida.push(atual);
      atual = [];
    }
    atual.push(l);
  }
  if (atual.length) saida.push(atual);
  return saida.filter((b) => b.some((l) => l.trim()));
}

export function ler(texto: string, nomeDoArquivo: string): Leitura {
  const avisos: string[] = [];
  const v = detectarIdioma(texto);

  if (!v) {
    return {
      sala: "pokerstars",
      torneios: [],
      maos: [],
      candidatosAHeroi: [],
      avisos: [
        `Não reconheci ${nomeDoArquivo} como um arquivo do PokerStars. ` +
          "O Oblix lê o histórico de mãos e o resumo de torneio exportados pelo cliente, em inglês ou português.",
      ],
    };
  }

  const maos: Mao[] = [];
  const torneios: TorneioDaSala[] = [];
  let incompletas = 0;
  const motivos = new Set<string>();

  for (const bloco of blocos(texto, v)) {
    const resumo = lerResumoDeTorneio(bloco, v);
    if (resumo) {
      torneios.push(resumo);
      continue;
    }
    const lida = lerMao(bloco, v);
    if (!lida) continue;
    if (lida.incompleta) {
      incompletas++;
      if (lida.motivo) motivos.add(lida.motivo);
      continue;
    }
    maos.push(lida.mao);
  }

  if (incompletas > 0) {
    avisos.push(
      `${incompletas} ${incompletas === 1 ? "mão ficou" : "mãos ficaram"} de fora: ` +
        "há linhas que eu não sei ler, e contar as outras daria estatística errada. " +
        `Exemplo: “${[...motivos][0]}”.`,
    );
  }

  // ── quem é o herói ──
  //
  // A linha `Dealt to X` só aparece para o dono do arquivo, então na prática
  // ela responde sozinha. Mais de um nome significa arquivos de contas
  // diferentes no mesmo upload — e aí quem escolhe é o jogador.
  const candidatos = [...new Set(maos.map((m) => m.heroi).filter(Boolean))];

  // ── mesa final, quando é dedução e não chute ──
  //
  // Para terminar entre os nove é preciso ter estado na mesa final, e a mesa
  // final é a última em que o jogador sentou. As duas coisas juntas tornam a
  // classificação exata; sozinha, nenhuma delas seria.
  for (const t of torneios) {
    if (t.colocacao === null || t.colocacao > 9) continue;
    const doTorneio = maos
      .filter((m) => m.torneioDaSala === t.idDaSala)
      .sort((a, b) => a.data.localeCompare(b.data));
    const ultimaMesa = doTorneio.at(-1)?.mesa;
    if (!ultimaMesa) continue;
    for (const m of doTorneio) {
      if (m.mesa === ultimaMesa && m.fase === "desconhecida") m.fase = "mesa_final";
    }
  }

  // Só quando não houve NADA. Com mãos recusadas, o aviso anterior já
  // explicou o vazio — repetir "não encontrei nada" faria parecer que são
  // dois problemas diferentes.
  if (!maos.length && !torneios.length && incompletas === 0) {
    avisos.push(
      `${nomeDoArquivo} tem o formato do PokerStars, mas não encontrei nenhuma mão nem resumo de torneio dentro dele.`,
    );
  }

  return { sala: "pokerstars", torneios, maos, candidatosAHeroi: candidatos, avisos };
}

/** O texto é do PokerStars? Usado na detecção automática de sala. */
export function reconhece(texto: string): boolean {
  return detectarIdioma(texto) !== null;
}

/** Exportado para teste: a derivação de posição é a parte mais fácil de errar. */
export const _posicoesPorAssento = posicoesPorAssento;

export type { FaseDaMao };

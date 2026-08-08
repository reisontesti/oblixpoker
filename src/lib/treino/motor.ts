import { FORCA, TODAS_AS_MAOS, type Mao } from "@/lib/treino/maos";
import { acharEntrada, acoesDaMao, posicoesDisponiveis } from "@/lib/treino/ranges";
import {
  FREQUENCIA_MINIMA_ACERTO,
  ROTULO_ACAO,
  type Acao,
  type Adversario,
  type Cenario,
  type ContextoPremiacao,
  type Fase,
  type Posicao,
  type Recomendacao,
  type Resposta,
  type Situacao,
} from "@/lib/treino/tipos";

/**
 * O motor do Treino: gera cenários e julga respostas.
 *
 * Não conhece React, nem localStorage, nem tela. Recebe fase e perfil, devolve
 * cenário; recebe cenário e ação, devolve recomendação. É essa fronteira que
 * permite trocar a camada de dados depois sem tocar na interface — e é o que
 * torna todo o poker deste produto testável sem abrir um navegador.
 */

/** Gerador determinístico: a mesma semente devolve a mesma sessão. */
function prng(semente: number) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface PerfilDeStack {
  min: number;
  max: number;
  jogadores: [number, number];
  situacoes: Situacao[];
}

/**
 * O que cada fase significa em números.
 *
 * Não é decoração: é o que faz "bolha" apresentar decisões de bolha em vez de
 * decisões genéricas com um rótulo diferente. Stack, tamanho de mesa e tipo de
 * decisão andam juntos — mesa de 6 com 90 BB não é fase final, é outro jogo.
 */
const PERFIL_DA_FASE: Record<Fase, PerfilDeStack> = {
  inicio: { min: 40, max: 120, jogadores: [8, 9], situacoes: ["abertura"] },
  // O meio do torneio tem stacks curtos de verdade: quem perdeu um pote
  // grande está com 15 BB às duas horas de jogo.
  meio: { min: 15, max: 50, jogadores: [7, 9], situacoes: ["abertura", "push"] },
  fase_final: { min: 8, max: 30, jogadores: [6, 8], situacoes: ["abertura", "push", "vs_shove"] },
  bolha: { min: 8, max: 25, jogadores: [6, 9], situacoes: ["push", "vs_shove", "abertura"] },
  itm: { min: 8, max: 30, jogadores: [6, 9], situacoes: ["push", "abertura", "vs_shove"] },
  mesa_final: { min: 6, max: 25, jogadores: [4, 8], situacoes: ["push", "vs_shove", "abertura"] },
};

const PREMIACAO_RELEVANTE: Fase[] = ["bolha", "itm", "mesa_final"];

/** Profundidade que cada situação exige para fazer sentido, em BB. */
const STACK_DA_SITUACAO: Record<Situacao, [number, number]> = {
  abertura: [19, 120],
  push: [4, 18],
  vs_shove: [4, 18],
};

/** A interseção entre o que a fase permite e o que a situação exige. */
function faixaDe(perfil: PerfilDeStack, situacao: Situacao): [number, number] | null {
  const [sMin, sMax] = STACK_DA_SITUACAO[situacao];
  const min = Math.max(perfil.min, sMin);
  const max = Math.min(perfil.max, sMax);
  return min <= max ? [min, max] : null;
}

export interface PedidoDeCenario {
  fase: Fase;
  semente: number;
  /**
   * Situações em que o jogador vem errando mais. O gerador as prioriza — é o
   * primeiro passo do treino adaptativo, e o mínimo para o produto não repetir
   * exatamente o que a pessoa já domina.
   */
  focar?: Situacao[];
}

export function gerarCenario({ fase, semente, focar }: PedidoDeCenario): Cenario {
  const r = prng(semente);
  const entre = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  const escolher = <T>(xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];

  const perfil = PERFIL_DA_FASE[fase];

  // A situação impõe o stack, não o contrário: não existe push/fold com 40 BB
  // nem abertura padrão de 2,2 BB com 6 BB de stack. Quando a faixa da fase e a
  // da situação não se cruzam, a situação simplesmente não cabe naquela fase —
  // e é descartada, em vez de gerar um cenário impossível com o rótulo certo.
  const viaveis = perfil.situacoes.filter((s) => faixaDe(perfil, s) !== null);
  const candidatas = focar?.length ? viaveis.filter((s) => focar.includes(s)) : viaveis;
  const situacao = escolher(candidatas.length ? candidatas : viaveis);

  const jogadoresNaMesa = entre(perfil.jogadores[0], perfil.jogadores[1]);

  const faixa = faixaDe(perfil, situacao)!;
  const stackEfetivoBB = entre(faixa[0], faixa[1]);

  const posicoes = posicoesDisponiveis(situacao);
  const posicao = situacao === "vs_shove" ? "BB" : escolher(posicoes);

  // O agressor precisa vir de uma posição anterior à sua — quem já agiu.
  const agressor: Posicao | undefined =
    situacao === "vs_shove" ? escolher(["BTN", "SB", "CO", "UTG"] as const) : undefined;

  const mao = sortearMao(r);
  const adversarios = montarAdversarios(r, {
    posicao,
    jogadoresNaMesa,
    stackEfetivoBB,
    situacao,
    agressor,
  });

  const premiacao = PREMIACAO_RELEVANTE.includes(fase)
    ? montarPremiacao(r, fase, jogadoresNaMesa)
    : null;

  return {
    id: `cen-${semente}`,
    fase,
    situacao,
    jogadoresNaMesa,
    posicao,
    stackEfetivoBB,
    stackBB: stackEfetivoBB,
    adversarios,
    mao,
    acaoAnterior: descreverAcaoAnterior(situacao, agressor, stackEfetivoBB),
    premiacao,
    acoesDisponiveis:
      situacao === "abertura"
        ? ["fold", "raise"]
        : situacao === "push"
          ? ["fold", "allin"]
          : ["fold", "call"],
    dificuldade: dificultar(situacao, stackEfetivoBB, premiacao),
  };
}

/**
 * Sorteia a mão com viés para o meio da tabela.
 *
 * Uniforme entre as 169 encheria a sessão de 72o e 93o, onde a resposta é
 * sempre fold e não se aprende nada. O viés concentra onde a decisão é de
 * verdade — as mãos marginais, que é onde o dinheiro é ganho e perdido.
 */
function sortearMao(r: () => number): Mao {
  const u = r();
  // Curva em sino grosseira: duas amostras somadas puxam para o centro.
  const centro = (u + r()) / 2;
  const i = Math.min(TODAS_AS_MAOS.length - 1, Math.floor(centro * FORCA.length));
  return FORCA[i];
}

function montarAdversarios(
  r: () => number,
  ctx: {
    posicao: Posicao;
    jogadoresNaMesa: number;
    stackEfetivoBB: number;
    situacao: Situacao;
    agressor?: Posicao;
  },
): Adversario[] {
  const saida: Adversario[] = [];

  // Os que ainda vão agir depois de você — os que importam para a decisão.
  const atras: Posicao[] =
    ctx.posicao === "BTN"
      ? ["SB", "BB"]
      : ctx.posicao === "SB"
        ? ["BB"]
        : ctx.posicao === "CO"
          ? ["BTN", "SB", "BB"]
          : ctx.posicao === "BB"
            ? []
            : ["CO", "BTN", "SB", "BB"];

  for (const p of atras.slice(0, Math.max(1, ctx.jogadoresNaMesa - 4))) {
    saida.push({
      posicao: p,
      // Stacks desiguais são a regra em torneio, não a exceção. Um adversário
      // com 9 BB atrás muda completamente o que se pode abrir.
      stackBB: Math.max(2, Math.round(ctx.stackEfetivoBB * (0.4 + r() * 1.8))),
    });
  }

  if (ctx.agressor) {
    saida.unshift({
      posicao: ctx.agressor,
      stackBB: ctx.stackEfetivoBB,
      acao: "allin",
    });
  }

  return saida;
}

function montarPremiacao(r: () => number, fase: Fase, jogadoresNaMesa: number): ContextoPremiacao {
  const entre = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  if (fase === "bolha") {
    const premiados = entre(9, 27);
    return {
      // Bolha é literalmente uma posição da premiação.
      jogadoresRestantes: premiados + 1,
      jogadoresPremiados: premiados,
      posicaoNoRanking: entre(2, Math.min(8, premiados)),
      stacksCurtos: entre(1, 3),
    };
  }
  if (fase === "mesa_final") {
    const restantes = Math.min(9, jogadoresNaMesa);
    return {
      jogadoresRestantes: restantes,
      jogadoresPremiados: restantes,
      posicaoNoRanking: entre(1, restantes),
      stacksCurtos: entre(0, 2),
    };
  }
  const restantes = entre(12, 40);
  return {
    jogadoresRestantes: restantes,
    jogadoresPremiados: restantes + entre(3, 20),
    posicaoNoRanking: entre(2, 15),
    stacksCurtos: entre(0, 3),
  };
}

function descreverAcaoAnterior(
  situacao: Situacao,
  agressor: Posicao | undefined,
  stackBB: number,
): string {
  if (situacao === "vs_shove") {
    return `${agressor} vai all-in de ${stackBB} BB. Todos os outros foldam. A ação está com você.`;
  }
  return "Todos foldam até você.";
}

function dificultar(
  situacao: Situacao,
  stackBB: number,
  premiacao: ContextoPremiacao | null,
): 1 | 2 | 3 | 4 {
  if (premiacao && premiacao.jogadoresRestantes === premiacao.jogadoresPremiados + 1) return 4;
  if (situacao === "vs_shove") return 3;
  if (stackBB < 15) return 2;
  return 1;
}

// ── julgamento ─────────────────────────────────────────────────────────────

/**
 * O quanto a bolha aperta um call.
 *
 * Não é ICM de verdade — ICM entra depois (§12). É o efeito de primeira ordem
 * que qualquer jogador de torneio reconhece: na bolha, pagar um all-in e
 * perder custa a premiação inteira, enquanto foldar custa alguns blinds. O
 * produto diz isso em voz alta quando acontece, em vez de mudar a resposta em
 * silêncio.
 */
const APERTO_DE_BOLHA = 0.55;

export function avaliar(cenario: Cenario): Recomendacao {
  const agressor = cenario.adversarios.find((a) => a.acao === "allin")?.posicao;
  const entrada = acharEntrada(
    cenario.situacao,
    cenario.posicao,
    cenario.stackEfetivoBB,
    agressor,
  );

  if (!entrada) {
    return {
      acoes: [{ acao: "fold", frequencia: 1 }],
      preferida: "fold",
      explicacao:
        "Sem range de referência para esta combinação exata, o Oblix não arrisca uma recomendação.",
      ajustadaPorPremiacao: false,
    };
  }

  const brutas = acoesDaMao(entrada, cenario.mao);
  const naBolha =
    cenario.premiacao !== null &&
    cenario.premiacao.jogadoresRestantes === cenario.premiacao.jogadoresPremiados + 1;

  let acoes = brutas.map((a) => ({ ...a }));
  let ajustada = false;

  if (naBolha && cenario.situacao === "vs_shove") {
    const call = acoes.find((a) => a.acao === "call");
    if (call && call.frequencia > 0) {
      const antes = call.frequencia;
      call.frequencia = Math.max(0, call.frequencia * APERTO_DE_BOLHA);
      const fold = acoes.find((a) => a.acao === "fold");
      const devolvido = antes - call.frequencia;
      if (fold) fold.frequencia += devolvido;
      else acoes.push({ acao: "fold", frequencia: devolvido });
      // Só conta como "mudou por causa da premiação" se a preferência virou.
      ajustada = antes >= 0.5 && call.frequencia < 0.5;
    }
  }

  acoes = acoes.filter((a) => a.frequencia > 0.001).sort((a, b) => b.frequencia - a.frequencia);
  const preferida = acoes[0]?.acao ?? "fold";

  return {
    acoes,
    preferida,
    explicacao: ajustada
      ? `${entrada.explicacao} Aqui a bolha muda a conta: pagar e perder custa a premiação inteira, foldar custa alguns blinds.`
      : entrada.explicacao,
    ajustadaPorPremiacao: ajustada,
  };
}

export interface Julgamento {
  correta: boolean;
  frequenciaDaEscolha: number;
  recomendacao: Recomendacao;
  /** Frase curta que abre o feedback. */
  titulo: string;
}

export function julgar(cenario: Cenario, escolhida: Acao): Julgamento {
  const recomendacao = avaliar(cenario);
  const frequencia = recomendacao.acoes.find((a) => a.acao === escolhida)?.frequencia ?? 0;

  // Acerto por frequência, não por igualdade com a preferida (§8): uma ação
  // tomada em um quarto do tempo faz parte do range, e chamá-la de erro
  // ensinaria a decorar resposta única onde o certo é ter as duas.
  const correta =
    frequencia >= FREQUENCIA_MINIMA_ACERTO || escolhida === recomendacao.preferida;

  const titulo = correta
    ? frequencia >= 0.85
      ? `${ROTULO_ACAO[escolhida]} — correto`
      : `${ROTULO_ACAO[escolhida]} — dentro do range`
    : `${ROTULO_ACAO[recomendacao.preferida]} seria a decisão preferencial`;

  return { correta, frequenciaDaEscolha: frequencia, recomendacao, titulo };
}

// ── leitura do desempenho ──────────────────────────────────────────────────

export interface DesempenhoCategoria {
  fase: Fase;
  decisoes: number;
  acertos: number;
  aproveitamento: number;
  estado: "forte" | "normal" | "melhorar" | "critico" | "sem_dados";
}

export function classificar(aproveitamento: number, decisoes: number): DesempenhoCategoria["estado"] {
  // Abaixo de dez decisões o número diz mais sobre o acaso do que sobre o
  // jogador — o mesmo piso de amostra que o resto do Oblix respeita.
  if (decisoes < 10) return "sem_dados";
  if (aproveitamento >= 0.85) return "forte";
  if (aproveitamento >= 0.7) return "normal";
  if (aproveitamento >= 0.55) return "melhorar";
  return "critico";
}

export function desempenhoPorFase(respostas: Resposta[], fase: Fase): DesempenhoCategoria {
  const dela = respostas.filter((r) => r.fase === fase);
  const acertos = dela.filter((r) => r.correta).length;
  const aproveitamento = dela.length ? acertos / dela.length : 0;
  return {
    fase,
    decisoes: dela.length,
    acertos,
    aproveitamento,
    estado: classificar(aproveitamento, dela.length),
  };
}

export interface Recomendado {
  fase: Fase;
  motivo: string;
  decisoes: number;
}

/**
 * O próximo treino.
 *
 * Enquanto não há amostra, sugere o começo — e diz que é por isso, em vez de
 * fingir que analisou alguma coisa. Havendo amostra, aponta o pior
 * aproveitamento: é a resposta direta à pergunta que a feature existe para
 * responder, "qual parte do meu jogo precisa melhorar agora?".
 */
export function recomendarTreino(respostas: Resposta[], fases: readonly Fase[]): Recomendado {
  const medidas = fases
    .map((f) => desempenhoPorFase(respostas, f))
    .filter((d) => d.estado !== "sem_dados");

  if (!medidas.length) {
    return {
      fase: "inicio",
      motivo:
        "Você ainda não tem decisões suficientes para o Oblix apontar uma fraqueza. Comece pelo início do torneio, que é onde os ranges são mais estáveis.",
      decisoes: 25,
    };
  }

  const pior = medidas.reduce((a, b) => (a.aproveitamento <= b.aproveitamento ? a : b));
  const pct = Math.round(pior.aproveitamento * 100);
  return {
    fase: pior.fase,
    motivo: `Seu aproveitamento mais baixo está aqui: ${pct}% em ${pior.decisoes} decisões.`,
    decisoes: 25,
  };
}

/** As situações em que o jogador vem errando mais, para o gerador priorizar. */
export function situacoesFracas(respostas: Resposta[], fase: Fase): Situacao[] {
  const porSituacao = new Map<Situacao, { n: number; acertos: number }>();
  for (const r of respostas) {
    if (r.fase !== fase) continue;
    const atual = porSituacao.get(r.situacao) ?? { n: 0, acertos: 0 };
    atual.n++;
    if (r.correta) atual.acertos++;
    porSituacao.set(r.situacao, atual);
  }
  return [...porSituacao.entries()]
    .filter(([, v]) => v.n >= 8 && v.acertos / v.n < 0.7)
    .map(([s]) => s);
}

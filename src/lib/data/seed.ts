import type {
  DiarioMental,
  Jogador,
  MedicaoTecnica,
  Meta,
  MetaTecnica,
  MovimentoBankroll,
  NivelEnergia,
  Perfil,
  Satelite,
  SaudeTecnica,
  Torneio,
} from "@/lib/types";

/**
 * Base de demonstração do Oblix.
 *
 * Gerada por PRNG semeado: os mesmos registros saem no servidor e no cliente,
 * então não há divergência de hidratação nem números que mudam a cada refresh.
 * "Hoje" é uma constante e não `new Date()` — o histórico é fixo, e uma data
 * de sistema diferente não deslocaria o eixo dos gráficos.
 *
 * O viés embutido é deliberado e não está escondido do motor de análise: quem
 * entra via satélite chega mais cansado e vai um pouco menos fundo. O produto
 * não sabe disso — ele descobre nos dados, que é exatamente o que a feature de
 * satélites promete responder.
 */

export const HOJE = new Date("2026-08-07T12:00:00.000Z");

/** Uma data relativa a HOJE, para a base semeada não depender do relógio. */
const dias = (n: number) => new Date(HOJE.getTime() + n * 86_400_000);

/** mulberry32 — pequeno, rápido e estável entre execuções. */
function prng(semente: number) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r = prng(707);
const entre = (min: number, max: number) => min + r() * (max - min);
const inteiro = (min: number, max: number) => Math.floor(entre(min, max + 1));
const escolher = <T>(itens: readonly T[]) => itens[Math.floor(r() * itens.length)];
const chance = (p: number) => r() < p;

const CLUBES = [
  "Vitória Poker Club",
  "Aurora Live",
  "Clube Meridiano",
  "Nexus Poker",
  "Sala 88",
] as const;

const NOMES_TORNEIO = [
  "Deepstack",
  "Turbo Knockout",
  "Main Event",
  "Bounty Hunter",
  "Progressive KO",
  "Mystery Bounty",
  "Freezeout",
  "The Big One",
  "Quinta Deep",
  "Super Terça",
] as const;

/**
 * Buy-ins disponíveis no circuito. Qual deles o jogador compra depende da
 * banca no dia — ver a regra dos 20 buy-ins abaixo.
 */
const BUY_INS = [30, 40, 50, 60, 80, 100, 150, 200] as const;

/**
 * Gestão de banca: nunca comprar um buy-in acima de 1/20 da banca. Não é
 * enfeite — sem essa regra a série de bankroll fura o zero numa sequência
 * ruim, e banca negativa não existe. Na prática é também o que jogador de
 * verdade faz: desce de stake no downswing e sobe de volta no upswing.
 */
function buyInAcessivel(banca: number): number {
  const teto = banca / 28;
  const possiveis = BUY_INS.filter((b) => b <= teto);
  if (!possiveis.length) return BUY_INS[0];
  // Enviesado para o topo do que a banca permite, sem estourar o teto.
  const i = Math.min(possiveis.length - 1, Math.floor(Math.pow(r(), 0.75) * possiveis.length));
  return possiveis[possiveis.length - 1 - i];
}

const ESCADA_ENERGIA: NivelEnergia[] = [
  "muito_cansado",
  "cansado",
  "normal",
  "descansado",
  "muito_descansado",
];

/**
 * Curva de premiação de MTT: lei de potência sobre as posições pagas.
 * Expoente 0.88 produz ~23% para o campeão e ~1,6% para o min-cash — as
 * proporções que se vê em torneio de clube de verdade.
 */
function premiacao(posicao: number, jogadores: number, poteTotal: number): number {
  const pagos = Math.max(3, Math.round(jogadores * 0.14));
  if (posicao > pagos) return 0;
  let soma = 0;
  for (let i = 1; i <= pagos; i++) soma += 1 / Math.pow(i, 0.88);
  const fatia = 1 / Math.pow(posicao, 0.88) / soma;
  return Math.round((poteTotal * fatia) / 10) * 10;
}

/**
 * Sorteia a colocação. Expoente > 1 puxa o resultado para o topo do campo —
 * é o que separa um jogador que estuda de uma distribuição uniforme.
 */
function sortearColocacao(jogadores: number, expoente: number): number {
  const u = r();
  return Math.max(1, Math.min(jogadores, Math.ceil(jogadores * Math.pow(u, expoente))));
}

const APRENDIZADOS = [
  "Paguei um river grande fora de posição sem plano de mão. Preciso definir a linha ainda no flop.",
  "Segurei o 3bet leve contra o regular do assento 4 e funcionou — ele foldou três vezes seguidas.",
  "Fiquei impaciente na bolha e abri mãos ruins de UTG. A bolha é onde eu mais perco valor.",
  "Ajustei o sizing do cbet para 33% em board seco e a taxa de fold subiu bastante.",
  "Errei o timing do all-in com 12bb. Deveria ter shovado uma órbita antes.",
  "Li certo o tell do jogador novo: ele trava os ombros quando tem mão feita.",
  "Mesa final: fui passivo demais como chip leader. Perdi pressão que era minha.",
  "Consegui manter a leitura mesmo depois do bad beat. Evoluí no controle emocional.",
];

const MELHORES = [
  "Fold de dois pares no turn contra o nit — ele nunca blefa ali.",
  "4bet de blefe na bolha com bloqueador de ás.",
  "Call de river fino com terceiro par contra o maníaco.",
  "Shove correto com 11bb no cutoff, mesa curta.",
  "Esperei a órbita certa para atacar o short do meu lado.",
];

export const OBJETIVOS = [
  "Tomar boas decisões, independente do resultado.",
  "Jogar cada mão pelo mérito dela, sem lembrar da anterior.",
  "Sair da mesa no mesmo estado em que entrei.",
  "Respeitar meu range e não inventar linha nova hoje.",
  "Aceitar bad beat sem mudar o plano.",
] as const;

const PIORES = [
  "Call de river que sabia estar perdendo.",
  "Abri muito leve de early nos níveis altos.",
  "Não isolei o limper fraco com mão dominante.",
  "Blefei contra calling station conhecido.",
  "Joguei o satélite cansado e levei essa fadiga para o principal.",
];

// ── movimentações de banca ─────────────────────────────────────────────────

export const MOVIMENTOS: MovimentoBankroll[] = [
  {
    id: "mov-1",
    data: "2025-06-10T12:00:00.000Z",
    tipo: "aporte",
    valor: 3_000,
    descricao: "Banca inicial separada do orçamento pessoal",
  },
  {
    id: "mov-2",
    data: "2025-12-20T12:00:00.000Z",
    tipo: "aporte",
    valor: 800,
    descricao: "Aporte de fim de ano",
  },
  {
    id: "mov-3",
    data: "2026-04-12T12:00:00.000Z",
    tipo: "saque",
    valor: 900,
    descricao: "Saque programado — 1º saque de lucro",
  },
];

// ── geração ────────────────────────────────────────────────────────────────

const torneios: Torneio[] = [];
const satelites: Satelite[] = [];
const diario: DiarioMental[] = [];

let cursor = new Date("2025-06-12T19:30:00.000Z").getTime();
const FIM = new Date("2026-08-05T23:00:00.000Z").getTime();
let seqT = 0;
let seqS = 0;

/** Banca corrente durante a geração — governa a escolha de buy-in. */
let banca = 0;
let proximoMovimento = 0;

while (cursor < FIM) {
  cursor += inteiro(2, 5) * 86_400_000;
  if (cursor >= FIM) break;

  // Aportes e saques entram na banca na data em que aconteceram, antes de a
  // regra dos 20 buy-ins decidir o que o jogador pode comprar naquele dia.
  while (proximoMovimento < MOVIMENTOS.length) {
    const m = MOVIMENTOS[proximoMovimento];
    if (new Date(m.data).getTime() > cursor) break;
    banca += m.tipo === "aporte" ? m.valor : -m.valor;
    proximoMovimento++;
  }

  const clube = escolher(CLUBES);
  const buyIn = buyInAcessivel(banca);
  const data = new Date(cursor).toISOString();

  let via: "direto" | "satelite" = "direto";
  let sateliteId: string | null = null;
  let jogouPrincipal = true;
  let cansacoDoSatelite = 0;

  // ~60% dos torneios do circuito têm satélite; o jogador entra em ~78% deles.
  if (chance(0.6) && chance(0.78)) {
    const sBuyIn = Math.max(10, Math.round(buyIn / inteiro(4, 8) / 5) * 5);
    const entradas = chance(0.72) ? 1 : chance(0.7) ? 2 : 3;
    const sJogadores = inteiro(18, 96);
    const classificou = chance(0.36);
    const sPosicao = classificou
      ? inteiro(1, Math.max(2, Math.round(sJogadores * 0.12)))
      : inteiro(Math.max(3, Math.round(sJogadores * 0.14)), sJogadores);
    const tempo = classificou ? inteiro(95, 260) : inteiro(35, 165);
    const id = `sat-${++seqS}`;

    satelites.push({
      id,
      nome: `Satélite ${escolher(NOMES_TORNEIO)}`,
      clube,
      data: new Date(cursor - inteiro(3, 26) * 3_600_000).toISOString(),
      buyIn: sBuyIn,
      entradas,
      jogadores: sJogadores,
      classificou,
      posicao: sPosicao,
      tempoJogadoMin: tempo,
      valorVaga: buyIn,
      torneioId: null,
      observacoes: classificou
        ? undefined
        : chance(0.4)
          ? "Bubble do satélite. Fiquei sem fichas defendendo o big blind."
          : undefined,
    });

    banca -= sBuyIn * entradas;

    if (classificou) {
      via = "satelite";
      sateliteId = id;
      // Jogar o satélite antes cobra o preço em energia — 1 a 2 níveis.
      cansacoDoSatelite = tempo > 170 ? 2 : 1;
    } else {
      // Não classificou: às vezes compra o buy-in direto mesmo assim.
      jogouPrincipal = chance(0.38);
      if (jogouPrincipal) cansacoDoSatelite = 1;
    }
  }

  if (!jogouPrincipal) continue;

  const id = `trn-${++seqT}`;
  const jogadores = inteiro(42, 180);
  const fatorRecompra = entre(1.15, 1.5);
  const pote = Math.round(jogadores * buyIn * fatorRecompra * 0.88);

  // A energia é decidida ANTES da colocação porque é ela que causa o
  // resultado, não o contrário: cansaço → decisões piores → elimina mais
  // cedo. O satélite entra nessa cadeia como custo de energia, e é só por
  // esse caminho que ele piora o torneio. Assim a relação que o painel vai
  // exibir existe de verdade nos dados, em vez de ser afirmada por fora.
  const baseEnergia = chance(0.5) ? 3 : chance(0.6) ? 2 : 4;
  const idxEnergia = Math.max(0, Math.min(4, baseEnergia - cansacoDoSatelite));
  const energia = ESCADA_ENERGIA[idxEnergia];

  const expoente = 0.94 + idxEnergia * 0.17;
  const colocacao = sortearColocacao(jogadores, expoente);
  const premio = premiacao(colocacao, jogadores, pote);

  const rebuys = chance(0.42) ? buyIn : 0;
  const addon = chance(0.35) ? Math.round(buyIn * 0.6) : 0;

  const foiFundo = 1 - colocacao / jogadores;
  const duracaoMin = Math.round(70 + foiFundo * entre(300, 520) + entre(-25, 25));

  const tilt = chance(0.18 + (premio === 0 ? 0.12 : 0) + (idxEnergia <= 1 ? 0.1 : 0));
  const notaDisciplina =
    Math.round(
      Math.max(
        5,
        Math.min(10, 7.3 + idxEnergia * 0.42 + (tilt ? -1.5 : 0.4) + entre(-0.5, 0.6)),
      ) * 10,
    ) / 10;

  torneios.push({
    id,
    data,
    nome: `${escolher(NOMES_TORNEIO)} R$ ${buyIn}`,
    clube,
    modalidade: "MTT",
    buyIn,
    rebuys,
    addon,
    jogadores,
    colocacao,
    premiacao: premio,
    duracaoMin,
    via,
    sateliteId,
    energia,
    notaDisciplina,
    melhorDecisao: chance(0.55) ? escolher(MELHORES) : undefined,
    piorDecisao: chance(0.5) ? escolher(PIORES) : undefined,
    aprendizado: chance(0.6) ? escolher(APRENDIZADOS) : undefined,
  });

  // Fecha o caixa do dia. Quem veio de satélite já pagou a entrada no
  // satélite — cobrar o buy-in de novo aqui contaria o custo duas vezes.
  banca += premio - rebuys - addon - (via === "direto" ? buyIn : 0);

  if (sateliteId) {
    const s = satelites.find((x) => x.id === sateliteId);
    if (s) s.torneioId = id;
  }

  if (chance(0.45)) {
    diario.push({
      id: `dia-${seqT}`,
      // Check-in duas horas antes de sentar. A data sai do cursor e o objetivo
      // rotaciona por índice, de propósito: nenhum dos dois consome sorteio,
      // então a sequência do PRNG — e toda a base já calibrada — fica intacta.
      data: new Date(cursor - 2 * 3_600_000).toISOString(),
      objetivo: OBJETIVOS[seqT % OBJETIVOS.length],
      torneioId: id,
      dormiuBem: idxEnergia >= 3,
      // Estado ANTES de sentar, e por isso não pode ser derivado do tilt, que
      // é registrado depois — seriam a mesma variável com dois nomes, e a
      // análise apresentaria o mesmo achado duas vezes como se fossem dois.
      // Sem sorteio novo aqui: a sequência do PRNG precisa ficar intacta.
      calmo: idxEnergia >= 2 && cansacoDoSatelite === 0,
      tentandoRecuperar: chance(0.15),
      houveTilt: tilt,
      comoTerminei: tilt
        ? "Terminei irritado com a mão final, mas registrei a leitura antes de sair."
        : "Terminei tranquilo, com sensação de ter tomado boas decisões.",
      aprendizado: escolher(APRENDIZADOS),
    });
  }
}

export const TORNEIOS: Torneio[] = torneios.sort((a, b) => a.data.localeCompare(b.data));
export const SATELITES: Satelite[] = satelites.sort((a, b) => a.data.localeCompare(b.data));
export const DIARIO: DiarioMental[] = diario;

export const BANKROLL_INICIAL = 1_800;

export const PERFIL: Perfil = {
  nome: "Rafael Antunes",
  nick: "obliqo",
  objetivo: "evolucao",
  modalidade: "MTT",
  clubes: [...CLUBES],
  buyInPadrao: 100,
  bankrollInicial: "R$ 3.000",
  desde: "2025-06-10T00:00:00.000Z",
  foto: null,
};

export const SAUDE_ATUAL: SaudeTecnica = {
  vpip: 23.4,
  pfr: 18.1,
  tresBet: 7.2,
  cbet: 61.5,
  wtsd: 29.4,
  wsd: 53.6,
};

/** Amostra do trimestre anterior — usada para mostrar a direção da evolução. */
export const SAUDE_ANTERIOR: SaudeTecnica = {
  vpip: 27.9,
  pfr: 17.4,
  tresBet: 5.1,
  cbet: 71.2,
  wtsd: 31.2,
  wsd: 49.8,
};

/**
 * As mesmas duas amostras, agora como série datada.
 *
 * É esta forma que o produto usa; `SAUDE_ATUAL` e `SAUDE_ANTERIOR` continuam
 * exportadas só porque descrevem os números de um jeito legível no fonte. O
 * painel lê sempre as duas medições mais recentes daqui, então a demonstração
 * e os dados do jogador percorrem exatamente o mesmo caminho — sem um ramo
 * "se for demonstração" no cálculo, que é onde erro se esconde.
 */
export const MEDICOES: MedicaoTecnica[] = [
  {
    id: "med-1",
    data: dias(-104).toISOString(),
    origem: "PokerCraft",
    maos: 18_400,
    ...SAUDE_ANTERIOR,
  },
  {
    id: "med-2",
    data: dias(-12).toISOString(),
    origem: "PokerCraft",
    maos: 21_900,
    ...SAUDE_ATUAL,
  },
];

export const METAS_TECNICAS: MetaTecnica[] = [
  {
    chave: "vpip",
    rotulo: "VPIP",
    descricao: "Mãos jogadas voluntariamente",
    min: 20,
    max: 26,
  },
  { chave: "pfr", rotulo: "PFR", descricao: "Aumento pré-flop", min: 16, max: 22 },
  { chave: "tresBet", rotulo: "3-Bet", descricao: "Reaumento pré-flop", min: 6, max: 9 },
  { chave: "cbet", rotulo: "C-Bet", descricao: "Aposta de continuidade", min: 55, max: 68 },
  { chave: "wtsd", rotulo: "WTSD", descricao: "Foi ao showdown", min: 22, max: 28 },
  { chave: "wsd", rotulo: "W$SD", descricao: "Ganhou no showdown", min: 50, max: 56 },
];

export const METAS: Meta[] = [
  {
    id: "meta-1",
    titulo: "Mesas finais no ano",
    detalhe: "Chegar entre os 9 últimos",
    atual: 0, // calculado a partir dos torneios
    alvo: 10,
    unidade: "torneios",
    prazo: "31 dez 2026",
  },
  {
    id: "meta-2",
    titulo: "Banca de R$ 6.000",
    detalhe: "Sem aportes novos",
    atual: 0,
    alvo: 6_000,
    unidade: "reais",
    prazo: "31 dez 2026",
  },
  {
    id: "meta-3",
    titulo: "Disciplina média 9,0",
    detalhe: "Média móvel dos últimos 20 torneios",
    atual: 0,
    alvo: 9,
    unidade: "nota",
    prazo: "30 set 2026",
  },
  {
    id: "meta-4",
    titulo: "Primeiro título",
    detalhe: "Vencer um torneio de buy-in R$ 150+",
    atual: 0,
    alvo: 1,
    unidade: "torneios",
    prazo: "31 dez 2026",
  },
];

/**
 * Banco de adversários.
 *
 * As datas de `atualizadoEm` são deliberadamente espalhadas: algumas leituras
 * são de ontem, outras de meio ano atrás. É o que permite o Modo Mesa avisar
 * quando uma anotação está velha demais para confiar cegamente.
 */
export const JOGADORES: Jogador[] = [
  {
    id: "jog-1",
    nome: "Marcelo Prado",
    clube: "Vitória Poker Club",
    perfil: "pao_duro",
    pontosFortes: ["Muito seletivo em early", "Não paga river sem mão feita"],
    pontosFracos: ["Foldeia demais na bolha", "Nunca blefa em board conectado"],
    exploracoes: [
      "Roubar o blind dele sempre que estiver no BB",
      "Foldar dois pares no river quando ele aumenta",
    ],
    tells: ["Arruma as fichas antes de apostar forte"],
    confrontos: 22,
    saldoConfrontos: 780,
    atualizadoEm: "2026-07-28T00:00:00.000Z",
    notas: [
      {
        id: "n1",
        data: "2026-07-28T00:00:00.000Z",
        tipo: "exploracao",
        texto: "Foldou BB três vezes seguidas para open de 2.2bb. Continuar atacando.",
      },
      {
        id: "n2",
        data: "2026-05-11T00:00:00.000Z",
        tipo: "tell",
        texto: "Quando tem mão forte ele empilha as fichas antes de apostar. Consistente.",
      },
    ],
  },
  {
    id: "jog-2",
    nome: "Diego Fontes",
    clube: "Aurora Live",
    perfil: "solto_agressivo",
    pontosFortes: ["Agressivo em posição", "Bom sizing de blefe"],
    pontosFracos: ["Blefa demais em multiway", "Perde o controle depois de bad beat"],
    exploracoes: ["Pagar mais leve no river", "Isolar quando ele limpa"],
    tells: ["Fala mais quando está blefando"],
    confrontos: 31,
    saldoConfrontos: -420,
    atualizadoEm: "2026-08-02T00:00:00.000Z",
    notas: [
      {
        id: "n3",
        data: "2026-08-02T00:00:00.000Z",
        tipo: "leitura",
        texto: "Levou bad beat no nível 6 e abriu 9 das 12 mãos seguintes. O tilt dele é previsível.",
      },
    ],
  },
  {
    id: "jog-3",
    nome: "Ana Beatriz Reis",
    clube: "Clube Meridiano",
    perfil: "solido",
    pontosFortes: ["Leitura muito boa", "Ajusta rápido ao ritmo da mesa"],
    pontosFracos: ["Cautelosa em mesa curta"],
    exploracoes: ["Aumentar a pressão quando a mesa fica 5-handed"],
    tells: ["Nenhum tell físico identificado"],
    confrontos: 14,
    saldoConfrontos: -1150,
    atualizadoEm: "2026-07-19T00:00:00.000Z",
    notas: [
      {
        id: "n4",
        data: "2026-07-19T00:00:00.000Z",
        tipo: "geral",
        texto: "Melhor jogadora do clube. Evitar potes marginais fora de posição contra ela.",
      },
    ],
  },
  {
    id: "jog-4",
    nome: "Wilson Duarte",
    clube: "Sala 88",
    perfil: "paga_tudo",
    pontosFortes: ["Difícil de tirar do pote"],
    pontosFracos: ["Paga com qualquer par", "Não aumenta sem mão muito forte"],
    exploracoes: ["Apostar valor fino nas três ruas", "Nunca blefar"],
    tells: ["Suspira quando está pagando fraco"],
    confrontos: 19,
    saldoConfrontos: 1640,
    atualizadoEm: "2026-08-04T00:00:00.000Z",
    notas: [
      {
        id: "n5",
        data: "2026-08-04T00:00:00.000Z",
        tipo: "exploracao",
        texto: "Pagou três streets com terceiro par. Value bet até o river sempre.",
      },
    ],
  },
  {
    id: "jog-5",
    nome: "Rodrigo Sampaio",
    clube: "Nexus Poker",
    perfil: "maniaco",
    pontosFortes: ["Constrói potes gigantes", "Impossível de ler pelo sizing"],
    pontosFracos: ["Range muito largo", "Não desacelera quando é pago"],
    exploracoes: ["Esperar mão feita e deixar ele apostar", "Nunca tentar blefar de volta"],
    tells: ["Aposta rápido quando é blefe, devagar quando tem mão"],
    confrontos: 12,
    saldoConfrontos: 950,
    atualizadoEm: "2026-06-30T00:00:00.000Z",
    notas: [
      {
        id: "n6",
        data: "2026-06-30T00:00:00.000Z",
        tipo: "tell",
        texto: "Timing invertido: quanto mais rápido aposta, mais fraco costuma estar.",
      },
    ],
  },
  {
    id: "jog-6",
    nome: "Camila Nakamura",
    clube: "Vitória Poker Club",
    perfil: "solido",
    pontosFortes: ["3-bet bem balanceado", "Excelente na bolha"],
    pontosFracos: ["Previsível no c-bet de flop seco"],
    exploracoes: ["Flutuar em board seco e tomar o pote no turn"],
    tells: [],
    confrontos: 9,
    saldoConfrontos: -260,
    atualizadoEm: "2026-03-14T00:00:00.000Z",
    notas: [],
  },
  {
    id: "jog-7",
    nome: "Otávio Bandeira",
    clube: "Aurora Live",
    perfil: "mumia",
    pontosFortes: ["Nunca entra em pote marginal"],
    pontosFracos: ["Range ultra-previsível", "Desiste na pressão de bolha"],
    exploracoes: ["Roubar tudo dele na bolha", "Foldar quando ele aumenta de early"],
    tells: ["Só olha as cartas duas vezes quando tem par alto"],
    confrontos: 17,
    saldoConfrontos: 540,
    atualizadoEm: "2026-07-31T00:00:00.000Z",
    notas: [],
  },
  {
    id: "jog-8",
    nome: "Fernanda Klein",
    clube: "Clube Meridiano",
    perfil: "solto_agressivo",
    pontosFortes: ["Muito agressiva em heads-up", "Boa com stack curto"],
    pontosFracos: ["Superestima blefes em pote multiway"],
    exploracoes: ["Pagar mais leve quando estiver 3-handed"],
    tells: [],
    confrontos: 7,
    saldoConfrontos: 180,
    atualizadoEm: "2026-01-22T00:00:00.000Z",
    notas: [
      {
        id: "n7",
        data: "2026-01-22T00:00:00.000Z",
        tipo: "geral",
        texto: "Anotação antiga. Ela pode ter mudado de estilo — revisar no próximo encontro.",
      },
    ],
  },
  {
    id: "jog-9",
    nome: "Paulo Renato Vieira",
    clube: "Sala 88",
    perfil: "pao_duro",
    pontosFortes: ["Disciplina de fold impressionante"],
    pontosFracos: ["Não defende blind", "Só aumenta com o topo do range"],
    exploracoes: ["Open leve na posição dele", "Respeitar qualquer aumento"],
    tells: [],
    confrontos: 11,
    saldoConfrontos: 320,
    atualizadoEm: "2026-06-08T00:00:00.000Z",
    notas: [],
  },
  {
    id: "jog-10",
    nome: "Thiago Mendonça",
    clube: "Nexus Poker",
    perfil: "paga_tudo",
    pontosFortes: ["Não desiste de draw"],
    pontosFracos: ["Paga qualquer preço por draw", "Nunca calcula odds"],
    exploracoes: ["Cobrar caro no turn quando o board tem draw", "Value bet grande"],
    tells: ["Olha as fichas dele antes de pagar quando está em draw"],
    confrontos: 15,
    saldoConfrontos: 1210,
    atualizadoEm: "2026-08-01T00:00:00.000Z",
    notas: [],
  },
  {
    id: "jog-11",
    nome: "Sérgio Halim",
    clube: "Vitória Poker Club",
    perfil: "solido",
    pontosFortes: ["Joga bem stack profundo", "Boa noção de ICM"],
    pontosFracos: ["Passivo quando é chip leader"],
    exploracoes: ["Atacar quando ele estiver liderando a mesa final"],
    tells: [],
    confrontos: 13,
    saldoConfrontos: -390,
    atualizadoEm: "2026-05-27T00:00:00.000Z",
    notas: [],
  },
];

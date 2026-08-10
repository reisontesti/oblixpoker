/**
 * O vocabulário do PokerStars, por idioma.
 *
 * A ESTRUTURA do arquivo é a mesma em todos os idiomas: cabeçalho com o número
 * da mão, linhas de assento, marcadores `*** ... ***`, cartas entre colchetes.
 * O que muda são os verbos — `folds` vira `desiste`, `raises ... to` vira
 * `aumenta ... para`.
 *
 * Por isso o parser é dirigido pela estrutura e consulta esta tabela só para
 * classificar a ação. E, mais importante: **linha de ação que não casa com
 * nenhum verbo conhecido não é ignorada**. Ela marca a mão como incompleta, a
 * mão sai das estatísticas e o texto original vai para os avisos.
 *
 * Essa escolha é o coração da honestidade desta feature. Um parser que engole
 * o que não entende produz VPIP errado com cara de medido — e um jogador que
 * estuda em cima de estatística errada joga pior por causa da ferramenta.
 * Melhor recusar dez mãos e dizer quais do que aceitar mil e mentir em três.
 *
 * O inglês está completo e testado. O português está aqui porque o cliente
 * brasileiro escreve nele, e as entradas foram derivadas da estrutura do
 * próprio arquivo; qualquer verbo que eu tenha errado aparece como aviso, e
 * não como número torto.
 */

export type Idioma = "en" | "pt";

export interface Vocabulario {
  idioma: Idioma;
  /** Começo do cabeçalho de mão, sem o número. */
  cabecalhoMao: RegExp;
  torneio: RegExp;
  nivel: RegExp;
  mesa: RegExp;
  botao: RegExp;
  assento: RegExp;
  /** `Dealt to X [Ah Kd]` */
  distribuidas: RegExp;
  ante: RegExp;
  smallBlind: RegExp;
  bigBlind: RegExp;
  /** Marcadores de rua, na ordem em que aparecem. */
  secoes: { holeCards: RegExp; flop: RegExp; turn: RegExp; river: RegExp; showdown: RegExp; resumo: RegExp };
  /** Verbo → tipo de ação. A ordem importa: o mais específico primeiro. */
  verbos: { padrao: RegExp; tipo: "fold" | "check" | "call" | "bet" | "raise" }[];
  /** `X collected 1200 from pot` / `X recebeu 1200 do pote` */
  recolheu: RegExp;
  /** `X: shows [..]` / `X: mostra [..]` */
  mostra: RegExp;
  /** Sufixo de all-in na linha de ação. */
  allIn: RegExp;
  /** Cabeçalho do resumo de torneio. */
  resumoTorneio: RegExp;
  buyIn: RegExp;
  totalDeJogadores: RegExp;
  colocacao: RegExp;
  premio: RegExp;
  reentradas: RegExp;
  inicioDoTorneio: RegExp;
}

const CARTAS = String.raw`\[([^\]]*)\]`;

export const VOCABULARIOS: Vocabulario[] = [
  {
    idioma: "en",
    cabecalhoMao: /^PokerStars (?:Hand|Game) #(\d+):/,
    torneio: /Tournament #(\d+)/,
    nivel: /Level\s+\S+\s*\((\d[\d.,]*)\/(\d[\d.,]*)\)/,
    mesa: /^Table '([^']+)'\s+(\d+)-max/,
    botao: /Seat #(\d+) is the button/,
    assento: /^Seat (\d+): (.+?) \(([\d.,]+) in chips/,
    distribuidas: new RegExp(String.raw`^Dealt to (.+?) ${CARTAS}`),
    ante: /^(.+?): posts the ante ([\d.,]+)/,
    smallBlind: /^(.+?): posts small blind ([\d.,]+)/,
    bigBlind: /^(.+?): posts big blind ([\d.,]+)/,
    secoes: {
      holeCards: /^\*\*\* HOLE CARDS \*\*\*/,
      flop: /^\*\*\* (?:FIRST |SECOND )?FLOP \*\*\*/,
      turn: /^\*\*\* (?:FIRST |SECOND )?TURN \*\*\*/,
      river: /^\*\*\* (?:FIRST |SECOND )?RIVER \*\*\*/,
      showdown: /^\*\*\* SHOW ?DOWN \*\*\*/,
      resumo: /^\*\*\* SUMMARY \*\*\*/,
    },
    verbos: [
      { padrao: /^(.+?): folds/, tipo: "fold" },
      { padrao: /^(.+?): checks/, tipo: "check" },
      { padrao: /^(.+?): calls ([\d.,]+)/, tipo: "call" },
      { padrao: /^(.+?): bets ([\d.,]+)/, tipo: "bet" },
      { padrao: /^(.+?): raises [\d.,]+ to ([\d.,]+)/, tipo: "raise" },
    ],
    recolheu: /^(.+?) collected ([\d.,]+) from/,
    mostra: /^(.+?): (?:shows|mucks)/,
    allIn: /and is all-in/,
    resumoTorneio: /^PokerStars Tournament #(\d+)/,
    buyIn: /^Buy-In: \D*([\d.,]+)\D*\/\D*([\d.,]+)/,
    totalDeJogadores: /^(\d+) players/,
    colocacao: /You finished in (\d+)(?:st|nd|rd|th) place/,
    premio: /You (?:received|won) \D*([\d.,]+)/,
    reentradas: /^(\d+) re-entr/,
    inicioDoTorneio: /^Tournament started (\d{4})\/(\d{2})\/(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/,
  },
  {
    idioma: "pt",
    cabecalhoMao: /^PokerStars (?:Mão|Mao|Jogo) #(\d+):/,
    torneio: /Torneio #(\d+)/,
    nivel: /N[íi]vel\s+\S+\s*\((\d[\d.,]*)\/(\d[\d.,]*)\)/,
    mesa: /^Mesa '([^']+)'\s+(\d+)-max/,
    botao: /(?:Lugar|Assento) #(\d+) (?:é|e) o bot[ãa]o/,
    assento: /^(?:Lugar|Assento) (\d+): (.+?) \(([\d.,]+) em fichas/,
    distribuidas: new RegExp(String.raw`^Distribu[íi]das? (?:a|para) (.+?) ${CARTAS}`),
    ante: /^(.+?): paga o ante ([\d.,]+)/,
    smallBlind: /^(.+?): paga small blind ([\d.,]+)/,
    bigBlind: /^(.+?): paga big blind ([\d.,]+)/,
    secoes: {
      holeCards: /^\*\*\* CARTAS(?: FECHADAS)? \*\*\*/,
      flop: /^\*\*\* FLOP \*\*\*/,
      turn: /^\*\*\* TURN \*\*\*/,
      river: /^\*\*\* RIVER \*\*\*/,
      showdown: /^\*\*\* SHOW ?DOWN \*\*\*/,
      resumo: /^\*\*\* RESUMO \*\*\*/,
    },
    verbos: [
      { padrao: /^(.+?): (?:desiste|foldou|passa a vez)/, tipo: "fold" },
      { padrao: /^(.+?): (?:passa|check)/, tipo: "check" },
      { padrao: /^(.+?): (?:paga|iguala) ([\d.,]+)/, tipo: "call" },
      { padrao: /^(.+?): aposta ([\d.,]+)/, tipo: "bet" },
      { padrao: /^(.+?): aumenta [\d.,]+ para ([\d.,]+)/, tipo: "raise" },
    ],
    recolheu: /^(.+?) (?:recebeu|ganhou) ([\d.,]+) (?:do|de)/,
    mostra: /^(.+?): (?:mostra|descarta)/,
    allIn: /(?:e est[áa] all-in|all-in)/,
    resumoTorneio: /^PokerStars Torneio #(\d+)/,
    buyIn: /^(?:Buy-In|Entrada): \D*([\d.,]+)\D*\/\D*([\d.,]+)/,
    totalDeJogadores: /^(\d+) jogadores/,
    colocacao: /(?:Voc[êe] (?:terminou|ficou) em|Terminou em) (\d+)[ºo]? lugar/,
    premio: /Voc[êe] (?:recebeu|ganhou) \D*([\d.,]+)/,
    reentradas: /^(\d+) (?:re-entrada|reentrada)/,
    inicioDoTorneio: /^Torneio (?:come[çc]ou|iniciado) (?:em )?(\d{4})\/(\d{2})\/(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/,
  },
];

/**
 * Descobre o idioma pelo cabeçalho da primeira mão ou do resumo.
 *
 * Nulo quando nenhum bate — e aí o arquivo é recusado com uma mensagem que diz
 * o que aconteceu, em vez de ser processado por um vocabulário errado e
 * produzir zero mãos sem explicação.
 */
export function detectarIdioma(texto: string): Vocabulario | null {
  for (const v of VOCABULARIOS) {
    if (v.cabecalhoMao.test(texto) || v.resumoTorneio.test(texto)) return v;
    // O cabeçalho pode não estar na primeira linha (BOM, linha em branco).
    const linhas = texto.split(/\r?\n/).slice(0, 40);
    if (linhas.some((l) => v.cabecalhoMao.test(l) || v.resumoTorneio.test(l))) return v;
  }
  return null;
}

/**
 * Números do PokerStars: `1,234.56` em inglês, `1.234,56` em português.
 *
 * A regra que resolve os dois sem ambiguidade: o ÚLTIMO separador é o decimal
 * quando sobram uma ou duas casas depois dele; senão é separador de milhar.
 * Ler `1.234` como 1,234 transformaria um stack de mil e duzentas fichas em
 * uma ficha — e o erro passaria despercebido porque continua sendo um número.
 */
export function numero(bruto: string): number {
  // Separador solto na ponta não é separador: é pontuação da frase que a
  // captura levou junto. `"144.00."` precisa valer 144, não 14.400.
  const s = bruto.trim().replace(/\s/g, "").replace(/^[.,]+|[.,]+$/g, "");
  const ultimoPonto = s.lastIndexOf(".");
  const ultimaVirgula = s.lastIndexOf(",");
  const corte = Math.max(ultimoPonto, ultimaVirgula);

  if (corte < 0) return Number(s) || 0;

  const casas = s.length - corte - 1;
  if (casas >= 1 && casas <= 2) {
    const inteiro = s.slice(0, corte).replace(/[.,]/g, "");
    return Number(`${inteiro}.${s.slice(corte + 1)}`) || 0;
  }
  return Number(s.replace(/[.,]/g, "")) || 0;
}

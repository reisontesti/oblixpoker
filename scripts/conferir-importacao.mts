/**
 * O leitor de arquivos do PokerStars e as estatísticas que saem dele.
 *
 * O risco desta feature não é quebrar — é ler errado e continuar funcionando.
 * Um VPIP de 74% quando o certo era 41% não derruba tela nenhuma: ele aparece
 * bonito, o jogador acredita, e passa a estudar o problema errado.
 *
 * Por isso as amostras abaixo são pequenas e conferidas à MÃO, ação por ação,
 * com o valor esperado escrito ao lado. Um teste que compara o parser com ele
 * mesmo não prova nada; um que compara com a contagem manual, sim.
 */

import { contar, contarMao, perfilDe, somar, ZERADO } from "@/lib/integracoes/estatisticas";
import { numero } from "@/lib/integracoes/pokerstars/formato";
import { _posicoesPorAssento, ler } from "@/lib/integracoes/pokerstars/parser";
import { lerArquivo, SALAS } from "@/lib/integracoes/registro";

let falhas = 0;
const ok = (rotulo: string, cond: boolean, detalhe = "") => {
  console.log(`${cond ? "ok   " : "FALHA"}  ${rotulo.padEnd(56)} ${detalhe}`);
  if (!cond) falhas++;
};
const igual = (rotulo: string, esperado: unknown, obtido: unknown) =>
  ok(
    rotulo,
    JSON.stringify(esperado) === JSON.stringify(obtido),
    JSON.stringify(esperado) === JSON.stringify(obtido)
      ? String(obtido)
      : `esperado ${JSON.stringify(esperado)}, veio ${JSON.stringify(obtido)}`,
  );

// ═══ números ═══════════════════════════════════════════════════════════════
//
// `1.234` é mil duzentos e trinta e quatro, não um vírgula dois. Ler errado
// transformaria um stack de mil fichas em uma ficha — e continuaria sendo um
// número, então ninguém veria.
console.log("\n── números nos dois formatos ─────────────────────────────────");
igual("1,234.56 (inglês)", 1234.56, numero("1,234.56"));
igual("1.234,56 (português)", 1234.56, numero("1.234,56"));
igual("1.234 é milhar, não decimal", 1234, numero("1.234"));
igual("1,234 é milhar, não decimal", 1234, numero("1,234"));
igual("4.60 é decimal", 4.6, numero("4.60"));
igual("150 sem separador", 150, numero("150"));
igual("12.345.678", 12345678, numero("12.345.678"));

// ═══ posição ═══════════════════════════════════════════════════════════════
console.log("\n── posição a partir do botão ─────────────────────────────────");
{
  const p = _posicoesPorAssento([1, 2, 3, 4, 5, 6], 4);
  igual("6-max, botão no 4: assento 4", "BTN", p.get(4));
  igual("6-max, botão no 4: assento 5", "SB", p.get(5));
  igual("6-max, botão no 4: assento 6", "BB", p.get(6));
  igual("6-max, botão no 4: assento 3", "CO", p.get(3));
  igual("6-max, botão no 4: assento 1", "MP", p.get(1));
}
{
  const p = _posicoesPorAssento([2, 5], 2);
  // Heads-up: o botão é o small blind. Tratar como mesa cheia poria alguém
  // em "CO" numa mesa de dois.
  igual("heads-up: botão é SB", "SB", p.get(2));
  igual("heads-up: o outro é BB", "BB", p.get(5));
}
{
  const p = _posicoesPorAssento([1, 3, 7, 9], 9);
  igual("assentos esparsos: botão", "BTN", p.get(9));
  igual("assentos esparsos: SB é o próximo em ordem", "SB", p.get(1));
  igual("assentos esparsos: BB", "BB", p.get(3));
}
ok(
  "botão em assento vazio não inventa posição",
  _posicoesPorAssento([1, 2, 3], 8).size === 0,
  "devolve vazio em vez de chutar",
);

// ═══ uma mão conferida à mão ═══════════════════════════════════════════════
//
// Seis jogadores. Ana abre, Caio paga, o Herói 3-beta do small blind, Ana
// paga, Caio desiste. No flop o Herói aposta e Ana desiste.
//
// A contagem manual, jogador por jogador:
//   Ana    vpip 1, pfr 1, 3betOp 1 (pagou o 3-bet), 3bet 0, viuFlop 1,
//          foldACbet 1 de 1
//   Bruno  nada — desistiu diante de um aumento: 3betOp 1
//   Caio   vpip 1, pfr 0, 3betOp 1
//   Duda   3betOp 1 (desistiu diante do aumento da Ana)
//   Heroi  vpip 1, pfr 1, 3bet 1 de 1, cbet 1 de 1
//   Fabio  3betOp 1
//
// O caso que este bloco existe para travar é a Ana: ela AGE DUAS VEZES no
// pré-flop, e VPIP precisa continuar valendo 1.
const MAO = `PokerStars Hand #111: Tournament #900, $10+$1 USD Hold'em No Limit - Level III (50/100) - 2026/03/01 20:00:00 ET
Table '900 3' 6-max Seat #4 is the button
Seat 1: Ana (5000 in chips)
Seat 2: Bruno (4000 in chips)
Seat 3: Caio (3000 in chips)
Seat 4: Duda (6000 in chips)
Seat 5: Heroi (4500 in chips)
Seat 6: Fabio (2500 in chips)
Ana: posts the ante 10
Bruno: posts the ante 10
Caio: posts the ante 10
Duda: posts the ante 10
Heroi: posts the ante 10
Fabio: posts the ante 10
Heroi: posts small blind 50
Fabio: posts big blind 100
*** HOLE CARDS ***
Dealt to Heroi [Ah Kd]
Ana: raises 150 to 250
Bruno: folds
Caio: calls 250
Duda: folds
Heroi: raises 550 to 800
Fabio: folds
Ana: calls 550
Caio: folds
*** FLOP *** [7c 2d Jh]
Heroi: bets 900
Ana: folds
Heroi collected 2660 from pot
*** SUMMARY ***
Total pot 2660 | Rake 0
`;

console.log("\n── uma mão, contada à mão ────────────────────────────────────");
{
  const r = ler(MAO, "teste.txt");
  igual("uma mão lida", 1, r.maos.length);
  igual("sem avisos", 0, r.avisos.length);

  const m = r.maos[0];
  igual("herói identificado", "Heroi", m.heroi);
  igual("cartas do herói", ["Ah", "Kd"], m.cartasDoHeroi);
  igual("posição do herói", "SB", m.posicaoDoHeroi);
  igual("torneio da sala", "900", m.torneioDaSala);
  igual("big blind", 100, m.bigBlind);
  igual("ante", 10, m.ante);
  igual("stack do herói em BB", 45, m.bbDoHeroi);
  igual("board", ["7c", "2d", "Jh"], m.board);
  igual("seis jogadores", 6, m.jogadores.length);

  // O pote: 6 antes de 10 = 60, blinds 50+100 = 150, mas o SB vira parte do
  // aumento do herói. Ana 250+550=800, Caio 250, Heroi 800, Fabio 100,
  // flop 900 do herói. 60 + 800 + 250 + 800 + 100 + 900 = 2910.
  igual("pote somado das ações", 2910, m.pote);

  // Herói: 10 ante + 800 pré + 900 flop = 1710 investidos; recolheu 2660.
  igual("resultado do herói", 950, m.resultadoDoHeroi);

  const c = contarMao(m);
  const ana = c.get("Ana")!;
  igual("Ana: vpip conta UMA vez, mesmo agindo duas", 1, ana.vpip);
  igual("Ana: pfr", 1, ana.pfr);
  igual("Ana: enfrentou aumento uma vez", 1, ana.tresBetOportunidades);
  igual("Ana: não 3-betou", 0, ana.tresBet);
  igual("Ana: viu o flop", 1, ana.viuFlop);
  igual("Ana: desistiu da continuação", 1, ana.foldACbet);
  igual("Ana: teve a chance de pagar a continuação", 1, ana.foldACbetOportunidades);

  const heroi = c.get("Heroi")!;
  igual("Herói: vpip", 1, heroi.vpip);
  igual("Herói: pfr", 1, heroi.pfr);
  igual("Herói: 3-bet", 1, heroi.tresBet);
  igual("Herói: chance de 3-bet", 1, heroi.tresBetOportunidades);
  igual("Herói: continuou no flop", 1, heroi.cbet);
  igual("Herói: chance de continuar", 1, heroi.cbetOportunidades);
  igual("Herói: não foi ao showdown", 0, heroi.showdown);

  const bruno = c.get("Bruno")!;
  igual("Bruno: mão contada mesmo tendo só desistido", 1, bruno.maos);
  igual("Bruno: vpip zero", 0, bruno.vpip);
  igual("Bruno: enfrentou o aumento", 1, bruno.tresBetOportunidades);

  const caio = c.get("Caio")!;
  igual("Caio: pagou o aumento", 1, caio.vpip);
  igual("Caio: não aumentou", 0, caio.pfr);
}

// ═══ showdown, com adversário vencendo ═════════════════════════════════════
//
// O W$SD de adversário só existe porque a mão guarda `ganhos` por jogador.
// Sem isso, a estatística que mais denuncia quem paga demais ficaria só para
// o dono do arquivo.
const MAO_SHOWDOWN = `PokerStars Hand #112: Tournament #900, $10+$1 USD Hold'em No Limit - Level III (50/100) - 2026/03/01 20:05:00 ET
Table '900 3' 6-max Seat #1 is the button
Seat 1: Ana (5000 in chips)
Seat 2: Heroi (4000 in chips)
Seat 3: Caio (3000 in chips)
Ana: posts the ante 10
Heroi: posts the ante 10
Caio: posts the ante 10
Heroi: posts small blind 50
Caio: posts big blind 100
*** HOLE CARDS ***
Dealt to Heroi [Qs Qd]
Ana: raises 200 to 300
Heroi: calls 250
Caio: folds
*** FLOP *** [2c 5d 9h]
Heroi: checks
Ana: bets 400
Heroi: calls 400
*** TURN *** [2c 5d 9h] [Kc]
Heroi: checks
Ana: checks
*** RIVER *** [2c 5d 9h Kc] [3s]
Heroi: checks
Ana: bets 700
Heroi: calls 700
*** SHOW DOWN ***
Ana: shows [Kh Ks]
Heroi: mucks hand
Ana collected 2930 from pot
*** SUMMARY ***
`;

console.log("\n── showdown com adversário vencendo ──────────────────────────");
{
  const r = ler(MAO_SHOWDOWN, "teste.txt");
  const m = r.maos[0];
  const c = contarMao(m);
  const ana = c.get("Ana")!;
  const heroi = c.get("Heroi")!;

  igual("Ana chegou ao showdown", 1, ana.showdown);
  igual("Ana venceu o showdown", 1, ana.venceuShowdown);
  igual("Herói chegou ao showdown", 1, heroi.showdown);
  igual("Herói NÃO venceu", 0, heroi.venceuShowdown);
  igual("Caio desistiu: fora do showdown", 0, c.get("Caio")!.showdown);
  // Ana: aposta no flop e no river, com um check no turn = 2 agressivas.
  igual("Ana: duas agressivas no pós-flop", 2, ana.agressivas);
  // O pagamento do pré-flop não entra: o fator de agressão é pós-flop.
  igual("Herói: dois pagamentos no pós-flop", 2, heroi.passivas);
  igual("Ana continuou no flop", 1, ana.cbet);
}

// ═══ o parser se recusa a adivinhar ════════════════════════════════════════
//
// Esta é a garantia mais importante do arquivo inteiro. Uma linha de ação que
// o Oblix não entende NÃO pode virar estatística silenciosa.
const MAO_COM_LINHA_ESTRANHA = MAO.replace(
  "Caio: calls 250",
  "Caio: does something the parser has never seen 250",
);

console.log("\n── o que não é entendido não vira número ─────────────────────");
{
  const r = ler(MAO_COM_LINHA_ESTRANHA, "teste.txt");
  igual("a mão inteira sai das estatísticas", 0, r.maos.length);
  ok("um aviso só, sem repetir o vazio", r.avisos.length === 1, r.avisos[0]?.slice(0, 62));
  ok(
    "o aviso mostra a linha que travou",
    r.avisos[0]?.includes("does something"),
    "com o texto original",
  );
}

// ═══ resumo de torneio ═════════════════════════════════════════════════════
const RESUMO = `PokerStars Tournament #900, No Limit Hold'em
Buy-In: $10.00/$1.00 USD
120 players
Total Prize Pool: $1200.00 USD
Tournament started 2026/03/01 19:30:00 ET
1 re-entry
You finished in 4th place (out of 120 players).
You received $144.00.
`;

console.log("\n── resumo de torneio ─────────────────────────────────────────");
{
  const r = ler(RESUMO, "resumo.txt");
  igual("um torneio lido", 1, r.torneios.length);
  const t = r.torneios[0];
  igual("id da sala", "900", t.idDaSala);
  igual("buy-in sem a taxa", 10, t.buyIn);
  igual("taxa separada", 1, t.taxa);
  igual("total de jogadores", 120, t.jogadores);
  igual("colocação", 4, t.colocacao);
  igual("premiação", 144, t.premiacao);
  igual("re-entradas", 1, t.rebuys);
  igual("data de início", "2026-03-01T19:30:00.000Z", t.data);
  igual("moeda", "USD", t.moeda);
}

// ═══ mesa final: dedução, não chute ════════════════════════════════════════
//
// Terminar entre os nove exige ter estado na mesa final, e a mesa final é a
// última em que o jogador sentou. As duas coisas juntas tornam a classificação
// exata. Sozinha, nenhuma delas seria — e é por isso que o resto fica
// `desconhecida` em vez de virar "meio de torneio" chutado.
console.log("\n── fase da mão ───────────────────────────────────────────────");
{
  const cedo = MAO.replace("Table '900 3'", "Table '900 7'").replace("#111", "#101");
  const r = ler(`${cedo}\n\n${MAO}\n\n${RESUMO}`, "tudo.txt");
  const porId = new Map(r.maos.map((m) => [m.id, m]));
  igual("mão na última mesa vira mesa final", "mesa_final", porId.get("111")?.fase);
  igual("mão numa mesa anterior fica indefinida", "desconhecida", porId.get("101")?.fase);
}
{
  const semMesaFinal = RESUMO.replace("4th", "40th");
  const r = ler(`${MAO}\n\n${semMesaFinal}`, "tudo.txt");
  igual(
    "quem parou em 40º não ganha mesa final",
    "desconhecida",
    r.maos[0]?.fase,
  );
}
{
  const hu = `PokerStars Hand #113: Tournament #900, $10+$1 USD Hold'em No Limit - Level XX (500/1000) - 2026/03/01 23:00:00 ET
Table '900 9' 9-max Seat #1 is the button
Seat 1: Heroi (40000 in chips)
Seat 2: Ana (20000 in chips)
Heroi: posts small blind 500
Ana: posts big blind 1000
*** HOLE CARDS ***
Dealt to Heroi [As Ad]
Heroi: raises 1000 to 2000
Ana: folds
Heroi collected 2000 from pot
*** SUMMARY ***
`;
  const r = ler(hu, "hu.txt");
  igual("dois jogadores é heads-up", "heads_up", r.maos[0]?.fase);
  igual("posição do herói no heads-up", "SB", r.maos[0]?.posicaoDoHeroi);
}

// ═══ português ═════════════════════════════════════════════════════════════
const MAO_PT = `PokerStars Mão #221: Torneio #901, $10+$1 USD Hold'em No Limit - Nível III (50/100) - 2026/03/02 20:00:00 ET
Mesa '901 3' 6-max Lugar #4 é o botão
Lugar 1: Ana (5000 em fichas)
Lugar 2: Bruno (4000 em fichas)
Lugar 3: Caio (3000 em fichas)
Lugar 4: Duda (6000 em fichas)
Lugar 5: Heroi (4500 em fichas)
Lugar 6: Fabio (2500 em fichas)
Heroi: paga small blind 50
Fabio: paga big blind 100
*** CARTAS ***
Distribuídas a Heroi [Ah Kd]
Ana: aumenta 150 para 250
Bruno: desiste
Caio: paga 250
Duda: desiste
Heroi: aumenta 550 para 800
Fabio: desiste
Ana: desiste
Caio: desiste
Heroi recebeu 1400 do pote
*** RESUMO ***
`;

console.log("\n── arquivo em português ──────────────────────────────────────");
{
  const r = ler(MAO_PT, "pt.txt");
  igual("uma mão lida", 1, r.maos.length);
  igual("sem avisos", 0, r.avisos.length);
  const m = r.maos[0];
  igual("herói", "Heroi", m.heroi);
  igual("posição", "SB", m.posicaoDoHeroi);
  igual("big blind", 100, m.bigBlind);
  const c = contarMao(m);
  igual("Ana: aumentou", 1, c.get("Ana")!.pfr);
  igual("Caio: pagou", 1, c.get("Caio")!.vpip);
  igual("Herói: 3-betou", 1, c.get("Heroi")!.tresBet);
}

// ═══ soma e amostra ════════════════════════════════════════════════════════
console.log("\n── contadores somam; percentuais se calam sem amostra ────────");
{
  const r = ler(`${MAO}\n\n${MAO_SHOWDOWN}`, "duas.txt");
  const total = contar(r.maos);
  igual("Ana aparece nas duas mãos", 2, total.get("Ana")!.maos);
  igual("Ana: vpip somado", 2, total.get("Ana")!.vpip);

  const perfil = perfilDe(total.get("Ana")!);
  ok("com 2 mãos, o VPIP não é publicado", perfil.vpip.valor === null, "valor nulo");
  igual("mas a amostra é dita", 2, perfil.vpip.amostra);

  // Cem mãos idênticas: aí o percentual pode ser dito, e vale 100%.
  let cem = ZERADO;
  for (let i = 0; i < 100; i++) cem = somar(cem, { ...ZERADO, maos: 1, vpip: 1 });
  const p100 = perfilDe(cem);
  igual("com 100 mãos, VPIP é publicado", 100, p100.vpip.valor);
}

// ═══ o registro não promete o que não tem ══════════════════════════════════
console.log("\n── registro de salas ─────────────────────────────────────────");
{
  const prontas = SALAS.filter((s) => s.info.estado === "disponivel");
  igual("uma sala pronta", 1, prontas.length);
  igual("e é o PokerStars", "pokerstars", prontas[0]?.info.chave);

  for (const s of SALAS) {
    ok(
      `${s.info.nome}: estado bate com a existência do parser`,
      (s.info.estado === "disponivel") === Boolean(s.ler),
      s.info.estado,
    );
    const proibidoOferecido = s.info.metodos.filter((m) => s.info.politica.proibidos.includes(m));
    ok(
      `${s.info.nome}: não oferece método que a política proíbe`,
      proibidoOferecido.length === 0,
      proibidoOferecido.join(", ") || "nenhum",
    );
    ok(
      `${s.info.nome}: nunca oferece conexão por senha`,
      !s.info.metodos.includes("oauth") && !s.info.metodos.includes("api"),
      "só arquivo exportado pelo jogador",
    );
  }

  const r = lerArquivo("isto não é histórico de coisa nenhuma", "aleatorio.txt");
  ok("arquivo desconhecido é recusado com explicação", r.erro !== null, r.erro?.slice(0, 60));
  ok("e não devolve leitura vazia fingindo sucesso", r.leitura === null);
}

console.log(
  falhas === 0 ? "\nImportação fiel ao arquivo.\n" : `\n${falhas} falha(s).\n`,
);
process.exit(falhas === 0 ? 0 : 1);

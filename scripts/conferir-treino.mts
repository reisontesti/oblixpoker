/**
 * Confere o motor de treino.
 *
 * O risco desta feature não é quebrar — é ensinar poker errado com cara de
 * autoridade. Um cenário de push/fold com 60 BB, um range de call mais largo
 * que o de push, uma bolha que não aperta nada: tudo isso renderiza lindo e
 * está errado. Os testes atacam as propriedades que precisam valer sempre, e
 * não casos isolados.
 */
import { interpretarRange, porcentagemDoRange } from "@/lib/treino/maos";
import { avaliar, gerarCenario, julgar, recomendarTreino, desempenhoPorFase } from "@/lib/treino/motor";
import { TABELA, acharEntrada } from "@/lib/treino/ranges";
import { FASES, type Fase, type Resposta } from "@/lib/treino/tipos";

let falhas = 0;
function conferir(rotulo: string, cond: boolean, detalhe = "") {
  console.log(`${cond ? "ok   " : "FALHA"}  ${rotulo.padEnd(56)} ${detalhe}`);
  if (!cond) falhas++;
}

const pct = (n: string) => porcentagemDoRange(interpretarRange(n)) * 100;

// ══ 1. A tabela de ranges é internamente coerente ══════════════════════════
console.log("── ranges ──");

// Posição mais atrasada abre mais largo. Se isto se inverter, o produto está
// ensinando o oposto do princípio mais básico de posição.
const aberturas = ["UTG", "UTG+1", "MP", "HJ", "CO", "BTN"].map((p) => {
  const e = acharEntrada("abertura", p as never, 40)!;
  return { p, pct: pct(e.bandas[0].maos) };
});
for (let i = 1; i < aberturas.length; i++) {
  conferir(
    `${aberturas[i].p} abre mais largo que ${aberturas[i - 1].p}`,
    aberturas[i].pct > aberturas[i - 1].pct,
    `${aberturas[i - 1].pct.toFixed(0)}% → ${aberturas[i].pct.toFixed(0)}%`,
  );
}
conferir("UTG abre entre 8% e 16%", aberturas[0].pct > 8 && aberturas[0].pct < 16, `${aberturas[0].pct.toFixed(1)}%`);
conferir("BTN abre entre 33% e 55%", aberturas[5].pct > 33 && aberturas[5].pct < 55, `${aberturas[5].pct.toFixed(1)}%`);

// Stack menor empurra mais largo: com menos blinds sobra menos tempo.
for (const p of ["UTG", "MP", "CO", "BTN", "SB"] as const) {
  const curto = pct(acharEntrada("push", p, 5)!.bandas[0].maos);
  const medio = pct(acharEntrada("push", p, 10)!.bandas[0].maos);
  const longo = pct(acharEntrada("push", p, 15)!.bandas[0].maos);
  conferir(
    `${p}: empurra mais largo quanto mais curto`,
    curto > medio && medio > longo,
    `${curto.toFixed(0)}% > ${medio.toFixed(0)}% > ${longo.toFixed(0)}%`,
  );
}

// Pagar all-in é mais caro que empurrar: quem empurra ganha o pote quando
// todos foldam, quem paga nunca ganha sem showdown. O call TEM que ser mais
// estreito que o push do mesmo stack e mesma posição.
for (const stack of [5, 10, 15]) {
  const push = pct(acharEntrada("push", "BTN", stack)!.bandas[0].maos);
  const call = pct(acharEntrada("vs_shove", "BB", stack, "BTN")!.bandas[0].maos);
  conferir(
    `com ${stack} BB, o call do BB é mais estreito que o push do BTN`,
    call < push,
    `call ${call.toFixed(0)}% < push ${push.toFixed(0)}%`,
  );
}

// Quanto mais adiantada a posição do agressor, mais forte o range dele — e
// mais estreito precisa ser o call.
const contra = (agressor: string) => pct(acharEntrada("vs_shove", "BB", 10, agressor as never)!.bandas[0].maos);
conferir(
  "paga mais largo contra SB do que contra UTG",
  contra("SB") > contra("CO") && contra("CO") > contra("UTG"),
  `SB ${contra("SB").toFixed(0)}% > CO ${contra("CO").toFixed(0)}% > UTG ${contra("UTG").toFixed(0)}%`,
);

// Nenhuma faixa de stack pode ter buraco nem sobreposição na mesma posição.
for (const situacao of ["push", "vs_shove"] as const) {
  const chaves = new Set(TABELA.filter((e) => e.situacao === situacao).map((e) => `${e.posicao}|${e.agressor ?? ""}`));
  for (const chave of chaves) {
    const [posicao, agressor] = chave.split("|");
    const faixas = TABELA.filter(
      (e) => e.situacao === situacao && e.posicao === posicao && (e.agressor ?? "") === agressor,
    ).sort((a, b) => a.stackMin - b.stackMin);
    let contigua = true;
    for (let i = 1; i < faixas.length; i++) {
      if (faixas[i].stackMin !== faixas[i - 1].stackMax + 1) contigua = false;
    }
    conferir(`faixas contíguas: ${situacao} ${chave}`, contigua);
  }
}

// ══ 2. O gerador produz cenários possíveis ═════════════════════════════════
console.log("\n── gerador ──");

const problemas: string[] = [];
const vistos = { situacoes: new Set<string>(), fases: new Set<string>(), maos: new Set<string>() };

for (const fase of FASES) {
  for (let s = 0; s < 300; s++) {
    const c = gerarCenario({ fase, semente: s * 7919 + fase.length });
    vistos.situacoes.add(c.situacao);
    vistos.fases.add(c.fase);
    vistos.maos.add(c.mao);

    if (c.situacao === "push" && c.stackEfetivoBB > 18) problemas.push(`push com ${c.stackEfetivoBB} BB`);
    if (c.situacao === "abertura" && c.stackEfetivoBB < 19) problemas.push(`abertura com ${c.stackEfetivoBB} BB`);
    if (c.situacao === "vs_shove" && c.posicao !== "BB") problemas.push(`vs_shove fora do BB (${c.posicao})`);
    if (c.situacao === "vs_shove" && !c.adversarios.some((a) => a.acao === "allin"))
      problemas.push("vs_shove sem ninguém all-in");
    if (c.jogadoresNaMesa < 2 || c.jogadoresNaMesa > 9) problemas.push(`mesa de ${c.jogadoresNaMesa}`);
    if (c.stackEfetivoBB < 1) problemas.push(`stack de ${c.stackEfetivoBB} BB`);
    if (!c.acoesDisponiveis.includes("fold")) problemas.push("sem opção de fold");
    if (c.acoesDisponiveis.length < 2) problemas.push("menos de duas ações");
    // Um adversário com stack negativo ou zerado não existe.
    if (c.adversarios.some((a) => a.stackBB < 1)) problemas.push("adversário sem fichas");
  }
}
conferir("nenhum cenário impossível em 1.800 gerados", problemas.length === 0, problemas[0] ?? "");
conferir("as seis fases geram", vistos.fases.size === 6, [...vistos.fases].join(", "));
conferir("as três situações aparecem", vistos.situacoes.size === 3, [...vistos.situacoes].join(", "));
conferir("variedade de mãos", vistos.maos.size > 60, `${vistos.maos.size} mãos distintas`);

// Determinismo: a mesma semente devolve a mesma sessão, o que torna qualquer
// bug reproduzível a partir do número.
const a1 = gerarCenario({ fase: "bolha", semente: 42 });
const a2 = gerarCenario({ fase: "bolha", semente: 42 });
conferir("mesma semente, mesmo cenário", JSON.stringify(a1) === JSON.stringify(a2));

// Bolha é literalmente uma posição da premiação.
const bolha = gerarCenario({ fase: "bolha", semente: 5 });
conferir(
  "bolha fica a uma posição do prêmio",
  bolha.premiacao !== null &&
    bolha.premiacao.jogadoresRestantes === bolha.premiacao.jogadoresPremiados + 1,
  `${bolha.premiacao?.jogadoresRestantes} restantes, ${bolha.premiacao?.jogadoresPremiados} premiados`,
);
conferir("início não mostra premiação", gerarCenario({ fase: "inicio", semente: 3 }).premiacao === null);

// ══ 3. Julgamento ═════════════════════════════════════════════════════════
console.log("\n── julgamento ──");

// AA de qualquer posição, em qualquer situação, nunca é fold.
for (const [fase, semente] of [["inicio", 1], ["fase_final", 2], ["mesa_final", 3]] as const) {
  const c = { ...gerarCenario({ fase, semente }), mao: "AA" };
  const rec = avaliar(c);
  conferir(`AA não é fold em ${fase}`, rec.preferida !== "fold", `${rec.preferida} (${c.situacao})`);
}

// 72o de UTG com stack profundo é fold, sempre.
const lixo = { ...gerarCenario({ fase: "inicio", semente: 11 }), mao: "72o", posicao: "UTG" as const };
conferir("72o de UTG é fold", avaliar(lixo).preferida === "fold");

// As frequências de um cenário sempre somam 1: se não somarem, a porcentagem
// mostrada ao jogador é ficção.
let somaOk = true;
for (let s = 0; s < 400; s++) {
  const c = gerarCenario({ fase: FASES[s % 6], semente: s * 131 });
  const total = avaliar(c).acoes.reduce((a, x) => a + x.frequencia, 0);
  if (Math.abs(total - 1) > 0.002) somaOk = false;
}
conferir("frequências sempre somam 100%", somaOk);

// Escolher a ação preferida sempre conta como acerto.
let preferidaOk = true;
for (let s = 0; s < 300; s++) {
  const c = gerarCenario({ fase: FASES[s % 6], semente: s * 977 });
  const rec = avaliar(c);
  if (!julgar(c, rec.preferida).correta) preferidaOk = false;
}
conferir("a ação preferida nunca é julgada errada", preferidaOk);

// E uma ação de frequência zero nunca conta como acerto — a menos que seja a
// preferida, o que não pode acontecer.
const cAA = { ...gerarCenario({ fase: "inicio", semente: 7 }), mao: "AA" };
conferir("fold com AA não é acerto", !julgar(cAA, "fold").correta);

// ══ 4. Bolha aperta o call ════════════════════════════════════════════════
console.log("\n── bolha ──");

const semBolha = {
  ...gerarCenario({ fase: "itm", semente: 21 }),
  situacao: "vs_shove" as const,
  posicao: "BB" as const,
  stackEfetivoBB: 10,
  mao: "A9o",
  adversarios: [{ posicao: "BTN" as const, stackBB: 10, acao: "allin" as const }],
  premiacao: { jogadoresRestantes: 30, jogadoresPremiados: 40, posicaoNoRanking: 5, stacksCurtos: 1 },
};
const naBolha = {
  ...semBolha,
  premiacao: { jogadoresRestantes: 11, jogadoresPremiados: 10, posicaoNoRanking: 5, stacksCurtos: 2 },
};
const freqCall = (c: typeof semBolha) => avaliar(c).acoes.find((a) => a.acao === "call")?.frequencia ?? 0;
conferir(
  "a bolha reduz a frequência de call",
  freqCall(naBolha) < freqCall(semBolha),
  `${(freqCall(semBolha) * 100).toFixed(0)}% → ${(freqCall(naBolha) * 100).toFixed(0)}%`,
);
conferir("e a bolha nunca afrouxa o call", freqCall(naBolha) <= freqCall(semBolha));

// ══ 5. Perfil e recomendação ══════════════════════════════════════════════
console.log("\n── recomendação ──");

const resposta = (fase: Fase, correta: boolean, i: number): Resposta => ({
  id: `r${i}`,
  em: new Date().toISOString(),
  fase,
  situacao: "abertura",
  posicao: "BTN",
  stackEfetivoBB: 40,
  jogadoresNaMesa: 9,
  mao: "KJs",
  escolhida: correta ? "raise" : "fold",
  preferida: "raise",
  frequenciaDaEscolha: correta ? 1 : 0,
  correta,
  tempoMs: 3000,
});

conferir(
  "sem amostra, recomenda o início e diz por quê",
  recomendarTreino([], FASES).fase === "inicio" &&
    recomendarTreino([], FASES).motivo.includes("ainda não tem"),
);

const historico: Resposta[] = [
  ...Array.from({ length: 20 }, (_, i) => resposta("inicio", true, i)),
  ...Array.from({ length: 20 }, (_, i) => resposta("bolha", i < 8, 100 + i)),
];
const rec = recomendarTreino(historico, FASES);
conferir("aponta a fase com pior aproveitamento", rec.fase === "bolha", `${rec.fase} — ${rec.motivo}`);
conferir("aproveitamento calculado certo", desempenhoPorFase(historico, "bolha").aproveitamento === 0.4);
conferir("classifica o forte", desempenhoPorFase(historico, "inicio").estado === "forte");
conferir("classifica o crítico", desempenhoPorFase(historico, "bolha").estado === "critico");

// Abaixo do piso de amostra o Oblix se cala, como no resto do produto.
const poucas = Array.from({ length: 5 }, (_, i) => resposta("meio", false, i));
conferir("menos de 10 decisões não vira diagnóstico", desempenhoPorFase(poucas, "meio").estado === "sem_dados");

console.log(falhas === 0 ? "\nMotor de treino coerente.\n" : `\n${falhas} falha(s).\n`);
process.exit(falhas === 0 ? 0 : 1);

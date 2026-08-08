/**
 * Confere que a base vazia é um estado de primeira classe.
 *
 * Um jogador que escolhe "começar do zero" abre exatamente esta base: nenhum
 * torneio, nenhum satélite, nenhum check-in. Toda a cadeia de análise precisa
 * atravessar isso sem estourar índice e sem inventar conclusão — e é barato
 * quebrar aqui de um jeito que nenhum teste de tela pegaria, porque o painel
 * cheio da demonstração continuaria funcionando.
 */
import { contrastesMentais, resumirDiario } from "@/lib/calc/diario";
import { gerarInsights } from "@/lib/calc/insights";
import {
  indexarSatelites,
  janela,
  porEnergia,
  porMes,
  recortar,
  resumir,
  saldoEm,
  serieBankroll,
  variacaoPct,
} from "@/lib/calc/metricas";
import {
  compararVias,
  distribuicaoEnergia,
  estatisticasSatelites,
  recomendar,
} from "@/lib/calc/satelites";
import { moeda } from "@/lib/format";
import type { DiarioMental, MovimentoBankroll, Satelite, Torneio } from "@/lib/types";

const TORNEIOS: Torneio[] = [];
const SATELITES: Satelite[] = [];
const DIARIO: DiarioMental[] = [];

/** O único evento que existe logo depois do onboarding. */
const MOVIMENTOS: MovimentoBankroll[] = [
  {
    id: "mov-abertura",
    data: "2026-08-08T12:00:00.000Z",
    tipo: "aporte",
    valor: 500,
    descricao: "Banca inicial",
  },
];

const HOJE = new Date("2026-08-08T15:00:00.000Z");

let falhas = 0;
function conferir(rotulo: string, condicao: boolean, detalhe: string) {
  console.log(`${condicao ? "ok  " : "FALHA"}  ${rotulo.padEnd(46)} ${detalhe}`);
  if (!condicao) falhas++;
}

for (const [cenario, movimentos] of [
  ["nada registrado", [] as MovimentoBankroll[]],
  ["só o aporte inicial", MOVIMENTOS],
] as const) {
  console.log(`\n── ${cenario} ─────────────────────────────────────────────`);

  const idx = indexarSatelites(SATELITES);
  const serie = serieBankroll(TORNEIOS, SATELITES, movimentos, idx);

  // A linha que quebrava: `serie[0].t` sem nenhum evento na série.
  const jan = janela("tudo", HOJE, serie[0]?.t ?? HOJE.getTime());
  const bankroll = serie.at(-1)?.saldo ?? 0;

  const atual = recortar(TORNEIOS, SATELITES, idx, jan.inicio, jan.fim);
  const geral = resumir(TORNEIOS, idx, []);
  const stats = estatisticasSatelites(SATELITES);
  const comparacao = compararVias(TORNEIOS, idx);
  const recomendacao = recomendar(comparacao, stats, bankroll, 100);
  const energia = porEnergia(TORNEIOS, idx);

  const insights = gerarInsights({
    torneios: TORNEIOS,
    idx,
    geral,
    energia,
    comparacao,
    statsSat: stats,
    saude: [],
    disciplinaRecente: 0,
  });

  const contrastes = contrastesMentais(DIARIO, TORNEIOS, idx);
  const diario = resumirDiario(DIARIO);

  conferir("série de bankroll", serie.length === movimentos.length, `${serie.length} pontos`);
  conferir("banca", Number.isFinite(bankroll), moeda(bankroll));
  conferir("janela coerente", jan.inicio <= jan.fim, `${jan.inicio} → ${jan.fim}`);
  conferir("saldo em instante", Number.isFinite(saldoEm(serie, jan.inicio)), "finito");
  conferir("ROI sem divisão por zero", Number.isFinite(atual.resumo.roi), `${atual.resumo.roi}%`);
  conferir("variação protegida", variacaoPct(bankroll, 0) === null, "null com base zero");
  conferir("agregação mensal", porMes(TORNEIOS, idx).length === 0, "vazia");
  conferir("faixas de energia", energia.length === 5, "as cinco, todas zeradas");
  conferir(
    "energia por via",
    distribuicaoEnergia(TORNEIOS).every((e) => e.direto === 0 && e.satelite === 0),
    "tudo zero",
  );

  // O comportamento que importa: sem amostra, o produto se cala.
  conferir("nenhum insight inventado", insights.length === 0, `${insights.length} insights`);
  conferir(
    "veredito de satélite se abstém",
    recomendacao.veredito === "neutro" && !comparacao.amostraSuficiente,
    `"${recomendacao.titulo}"`,
  );
  conferir(
    "nenhum contraste com amostra",
    contrastes.every((c) => !c.amostraSuficiente),
    `${contrastes.length} perguntas, nenhuma concluída`,
  );
  conferir("diário zerado", diario.registros === 0 && diario.abertos === 0, "sem registros");
}

console.log(falhas === 0 ? "\nTudo certo.\n" : `\n${falhas} falha(s).\n`);
process.exit(falhas === 0 ? 0 : 1);

/** Conferência rápida da base de demonstração. Não faz parte do app. */
import { HOJE, MOVIMENTOS, SATELITES, TORNEIOS } from "@/lib/data/seed";
import {
  indexarSatelites,
  janela,
  porEnergia,
  recortar,
  resumir,
  saldoEm,
  serieBankroll,
} from "@/lib/calc/metricas";
import { compararVias, estatisticasSatelites, recomendar } from "@/lib/calc/satelites";
import { moeda, percentual } from "@/lib/format";

const idx = indexarSatelites(SATELITES);
const serie = serieBankroll(TORNEIOS, SATELITES, MOVIMENTOS, idx);
const bankroll = serie.at(-1)!.saldo;
const geral = resumir(TORNEIOS, idx, SATELITES.filter((s) => !s.torneioId));

console.log("=== base ===");
console.log("torneios:", TORNEIOS.length, "| satélites:", SATELITES.length);
console.log("período:", TORNEIOS[0].data.slice(0, 10), "→", TORNEIOS.at(-1)!.data.slice(0, 10));
console.log("pontos na série:", serie.length);

console.log("\n=== geral ===");
console.log("bankroll:", moeda(bankroll));
console.log("investido:", moeda(geral.investido), "| retorno:", moeda(geral.retorno));
console.log("lucro:", moeda(geral.lucro), "| ROI:", percentual(geral.roi, 1));
console.log("ITM:", geral.itm, `(${percentual(geral.itmPct, 1)})`);
console.log("mesas finais:", geral.mesasFinais, "| títulos:", geral.titulos);
console.log("disciplina:", geral.disciplina.toFixed(2));
console.log("horas:", (geral.minutosJogados / 60).toFixed(0));

const j30 = janela("30d", HOJE, serie[0].t);
const r30 = recortar(TORNEIOS, SATELITES, idx, j30.inicio, j30.fim);
console.log("\n=== 30 dias ===");
console.log("torneios:", r30.resumo.torneios, "| ROI:", percentual(r30.resumo.roi, 1));
console.log("lucro:", moeda(r30.resumo.lucro));
console.log("bankroll hoje vs 30d atrás:", moeda(bankroll), "vs", moeda(saldoEm(serie, j30.inicio)));

const stats = estatisticasSatelites(SATELITES);
console.log("\n=== satélites ===");
console.log("disputados:", stats.disputados, "| classificados:", stats.classificados);
console.log("taxa:", percentual(stats.taxaClassificacao, 1));
console.log("investido:", moeda(stats.investido), "| valor das vagas:", moeda(stats.valorVagas));
console.log("ROI:", percentual(stats.roi, 1), "| economia líquida:", moeda(stats.economiaLiquida));
console.log("custo médio por vaga:", moeda(stats.custoMedioPorVaga));
console.log("melhor sequência:", stats.melhorSequencia, "| horas:", (stats.minutosJogados / 60).toFixed(0));

const comp = compararVias(TORNEIOS, idx);
console.log("\n=== satélite × direto ===");
for (const d of [comp.direto, comp.satelite]) {
  console.log(
    `${d.via.padEnd(9)} n=${String(d.torneios).padStart(3)} ROIpago ${d.roi.toFixed(1).padStart(7)}%  ROIbalcao ${d.roiBalcao.toFixed(1).padStart(7)}%  ITM ${d.itmPct.toFixed(1).padStart(5)}%  MF ${d.mesaFinalPct.toFixed(1).padStart(5)}%  lucro/trn ${moeda(d.lucroMedio).padStart(9)}  energia ${d.energiaMedia?.toFixed(2)}  disc ${d.disciplina.toFixed(2)}`,
  );
}
console.log(
  "delta desempenho:", comp.deltaDesempenho.toFixed(1),
  "| delta lucro/torneio:", comp.deltaLucroPorTorneio.toFixed(0),
  "| delta energia:", comp.deltaEnergia?.toFixed(2),
  "| amostra ok:", comp.amostraSuficiente,
);

const minimo = serie.reduce((a, p) => Math.min(a, p.saldo), Infinity);
const maximo = serie.reduce((a, p) => Math.max(a, p.saldo), -Infinity);
console.log("bankroll mínimo na série:", moeda(minimo), "| máximo:", moeda(maximo));
if (minimo < 0) console.log("  !! banca ficou negativa — calibracao irreal");

const rec = recomendar(comp, stats, bankroll, 100);
console.log("\nveredito:", rec.veredito, "—", rec.titulo);
console.log(rec.corpo);
rec.evidencias.forEach((e) => console.log("  ·", e));

console.log("\n=== energia ===");
for (const f of porEnergia(TORNEIOS, idx)) {
  console.log(`${f.nivel.padEnd(18)} n=${String(f.torneios).padStart(3)}  profundidade ${(f.profundidadeMedia * 100).toFixed(1).padStart(5)}%  ITM ${f.itmPct.toFixed(1).padStart(5)}%  ROI ${f.roi.toFixed(1).padStart(8)}%  disc ${f.disciplina.toFixed(2)}`);
}

// Linha compacta para varredura de sementes.
const s30 = recortar(TORNEIOS, SATELITES, idx, j30.inicio, j30.fim);
console.log(
  `RESUMO seed=? bank=${bankroll.toFixed(0)} min=${minimo.toFixed(0)} roi=${geral.roi.toFixed(0)} itm=${geral.itmPct.toFixed(0)} mf=${geral.mesasFinais} tit=${geral.titulos} disc=${geral.disciplina.toFixed(1)} d30lucro=${s30.resumo.lucro.toFixed(0)} d30roi=${s30.resumo.roi.toFixed(0)} satN=${comp.satelite.torneios} dLucro=${comp.deltaLucroPorTorneio.toFixed(0)} vered=${rec.veredito}`,
);

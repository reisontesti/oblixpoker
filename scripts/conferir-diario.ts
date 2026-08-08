import { DIARIO, SATELITES, TORNEIOS } from "@/lib/data/seed";
import { indexarSatelites } from "@/lib/calc/metricas";
import { contrastesMentais, historicoRecuperacao, resumirDiario } from "@/lib/calc/diario";
import { moeda } from "@/lib/format";

const idx = indexarSatelites(SATELITES);
const r = resumirDiario(DIARIO);
console.log(`registros=${r.registros} abertos=${r.abertos} sonoBom=${r.taxaSonoBom.toFixed(0)}% tilt=${r.taxaTilt.toFixed(0)}% recuperando=${r.taxaRecuperacao.toFixed(0)}%\n`);

for (const c of contrastesMentais(DIARIO, TORNEIOS, idx)) {
  console.log(`${c.pergunta}  [${c.momento}]  amostra ok=${c.amostraSuficiente}`);
  console.log(`  ${c.rotuloSim.padEnd(20)} n=${String(c.sim.torneios).padStart(3)}  prof ${(c.sim.profundidadeMedia*100).toFixed(1).padStart(5)}%  ITM ${c.sim.itmPct.toFixed(0).padStart(3)}%  disc ${c.sim.disciplina.toFixed(2)}  lucro/trn ${moeda(c.sim.lucroMedio)}`);
  console.log(`  ${c.rotuloNao.padEnd(20)} n=${String(c.nao.torneios).padStart(3)}  prof ${(c.nao.profundidadeMedia*100).toFixed(1).padStart(5)}%  ITM ${c.nao.itmPct.toFixed(0).padStart(3)}%  disc ${c.nao.disciplina.toFixed(2)}  lucro/trn ${moeda(c.nao.lucroMedio)}`);
  console.log(`  diferenca=${c.diferenca.toFixed(1)} pts`);
  console.log(`  → ${c.leitura}\n`);
}

const h = historicoRecuperacao(DIARIO, TORNEIOS, idx);
console.log("intervenção do check-in:", JSON.stringify(h, null, 1));

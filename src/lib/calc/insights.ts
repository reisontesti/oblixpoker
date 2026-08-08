import type { LinhaSaude, Torneio } from "@/lib/types";
import type { FaixaEnergia, IndiceSatelites, Resumo } from "@/lib/calc/metricas";
import { ehItm, ehMesaFinal, investimento, resumir } from "@/lib/calc/metricas";
import type { Comparacao, EstatisticasSatelites } from "@/lib/calc/satelites";

export interface Insight {
  id: string;
  categoria: "Satélites" | "Disciplina" | "Técnica" | "Bankroll" | "Field";
  tom: "positivo" | "atencao" | "neutro";
  titulo: string;
  corpo: string;
}

/** Amostra abaixo disso não vira insight — vira ruído com cara de conclusão. */
const MINIMO = 6;

interface Entrada {
  torneios: Torneio[];
  idx: IndiceSatelites;
  geral: Resumo;
  energia: FaixaEnergia[];
  comparacao: Comparacao;
  statsSat: EstatisticasSatelites;
  saude: LinhaSaude[];
  disciplinaRecente: number;
}

export function gerarInsights(e: Entrada): Insight[] {
  const saida: Insight[] = [];

  // ── satélites ────────────────────────────────────────────────────────────
  if (e.comparacao.amostraSuficiente) {
    const d = e.comparacao.deltaLucroPorTorneio;
    const forte = Math.abs(d) >= 15;
    saida.push({
      id: "sat-via",
      categoria: "Satélites",
      tom: !forte ? "neutro" : d > 0 ? "positivo" : "atencao",
      titulo: !forte
        ? "Satélite e entrada direta empatam no resultado"
        : d > 0
          ? "Os satélites estão te dando lucro"
          : "Entrar direto tem rendido mais",
      corpo: !forte
        ? `A diferença é de ${Math.abs(Math.round(d))} reais por torneio — dentro do que o acaso explica.`
        : `Cada torneio jogado via satélite ${d > 0 ? "rende" : "custa"} ${Math.abs(Math.round(d))} reais ${d > 0 ? "a mais" : "a menos"} que a entrada direta, já contando a economia na vaga.`,
    });
  }

  if (e.statsSat.disputados >= MINIMO) {
    const economia = e.statsSat.custoMedioPorVaga;
    saida.push({
      id: "sat-taxa",
      categoria: "Satélites",
      tom: e.statsSat.taxaClassificacao >= 30 ? "positivo" : "neutro",
      titulo: `Você classifica em ${e.statsSat.taxaClassificacao.toFixed(0)}% dos satélites`,
      corpo: `São ${e.statsSat.classificados} vagas em ${e.statsSat.disputados} tentativas, a um custo médio de ${Math.round(economia)} reais por vaga.`,
    });
  }

  // ── energia ──────────────────────────────────────────────────────────────
  //
  // A comparação agrega as duas pontas da escala em vez de eleger o melhor e
  // o pior nível isolados. Um nível sozinho pode ter dez torneios e inverter
  // a ordem por azar — agregando, o insight para de contar que "descansado"
  // rende mais que "muito descansado", que é ruído, e passa a contar a
  // relação que existe: descansado rende mais que cansado.
  const mediaPonderada = (faixas: FaixaEnergia[]) => {
    const n = faixas.reduce((a, f) => a + f.torneios, 0);
    if (!n) return null;
    return faixas.reduce((a, f) => a + f.profundidadeMedia * f.torneios, 0) / n;
  };

  const cansado = e.energia.slice(0, 2);
  const descansado = e.energia.slice(3);
  const nCansado = cansado.reduce((a, f) => a + f.torneios, 0);
  const nDescansado = descansado.reduce((a, f) => a + f.torneios, 0);
  const pCansado = mediaPonderada(cansado);
  const pDescansado = mediaPonderada(descansado);

  if (nCansado >= MINIMO && nDescansado >= MINIMO && pCansado !== null && pDescansado !== null) {
    const distancia = (pDescansado - pCansado) * 100;
    if (Math.abs(distancia) >= 5) {
      saida.push({
        id: "energia",
        categoria: "Disciplina",
        tom: distancia > 0 ? "atencao" : "neutro",
        titulo: "Como você chega muda onde você termina",
        corpo:
          distancia > 0
            ? `Chegando descansado você termina, em média, ${distancia.toFixed(0)} pontos mais fundo no campo do que chegando cansado — ${nDescansado} torneios contra ${nCansado}.`
            : `Curiosamente, seus ${nCansado} torneios jogados cansado renderam profundidade maior que os ${nDescansado} jogados descansado. Vale continuar registrando antes de tirar conclusão.`,
      });
    }
  }

  // ── disciplina ───────────────────────────────────────────────────────────
  const comTilt = e.torneios.filter((t) => (t.notaDisciplina ?? 10) < 7);
  if (comTilt.length >= MINIMO) {
    const resumoTilt = resumir(comTilt, e.idx);
    const resto = e.torneios.filter((t) => (t.notaDisciplina ?? 10) >= 7);
    const resumoResto = resumir(resto, e.idx);
    const gap = resumoResto.itmPct - resumoTilt.itmPct;
    if (gap >= 5) {
      saida.push({
        id: "disciplina-itm",
        categoria: "Disciplina",
        tom: "atencao",
        titulo: "Nota de disciplina baixa custa dinheiro",
        corpo: `Nos ${comTilt.length} torneios em que você se avaliou abaixo de 7, sua taxa de ITM foi ${resumoTilt.itmPct.toFixed(0)}%, contra ${resumoResto.itmPct.toFixed(0)}% nos demais.`,
      });
    }
  }

  if (e.disciplinaRecente >= 8.5) {
    saida.push({
      id: "disciplina-alta",
      categoria: "Disciplina",
      tom: "positivo",
      titulo: "Sua disciplina recente está alta",
      corpo: `Média de ${e.disciplinaRecente.toFixed(1).replace(".", ",")} nos últimos 20 torneios. É o tipo de constância que sustenta resultado no longo prazo.`,
    });
  }

  // ── técnica ──────────────────────────────────────────────────────────────
  const corrigidos = e.saude.filter((s) => s.estado === "dentro" && s.melhorou);
  if (corrigidos.length) {
    saida.push({
      id: "tecnica-ok",
      categoria: "Técnica",
      tom: "positivo",
      titulo: `${corrigidos.length === 1 ? "Um indicador entrou" : `${corrigidos.length} indicadores entraram`} na faixa alvo`,
      corpo: `${corrigidos.map((s) => s.rotulo).join(", ")} ${corrigidos.length === 1 ? "voltou" : "voltaram"} para a faixa saudável desde a última amostra.`,
    });
  }

  const foraDaFaixa = e.saude.filter((s) => s.estado !== "dentro");
  if (foraDaFaixa.length) {
    const pior = foraDaFaixa[0];
    saida.push({
      id: "tecnica-fora",
      categoria: "Técnica",
      tom: "atencao",
      titulo: `${pior.rotulo} está ${pior.estado === "acima" ? "acima" : "abaixo"} da faixa`,
      corpo: `Você está em ${pior.valor.toFixed(1).replace(".", ",")}% e a faixa saudável para o seu estilo é ${pior.min}–${pior.max}%. ${pior.descricao}.`,
    });
  }

  // ── field ────────────────────────────────────────────────────────────────
  const porClube = new Map<string, Torneio[]>();
  for (const t of e.torneios) {
    (porClube.get(t.clube) ?? porClube.set(t.clube, []).get(t.clube)!).push(t);
  }
  const clubes = [...porClube.entries()]
    .filter(([, ts]) => ts.length >= MINIMO)
    .map(([clube, ts]) => ({ clube, ts, r: resumir(ts, e.idx) }))
    .sort((a, b) => b.r.roi - a.r.roi);

  if (clubes.length >= 2) {
    const top = clubes[0];
    saida.push({
      id: "clube",
      categoria: "Field",
      tom: "positivo",
      titulo: `${top.clube} é o seu melhor field`,
      corpo: `ROI de ${top.r.roi.toFixed(0)}% em ${top.ts.length} torneios, contra ${clubes[clubes.length - 1].r.roi.toFixed(0)}% no seu pior clube. Vale concentrar volume onde você já ganha.`,
    });
  }

  // ── bankroll ─────────────────────────────────────────────────────────────
  const grandes = e.torneios.filter((t) => t.buyIn >= 150);
  if (grandes.length >= MINIMO) {
    const r = resumir(grandes, e.idx);
    const pequenos = e.torneios.filter((t) => t.buyIn < 150);
    const rp = resumir(pequenos, e.idx);
    saida.push({
      id: "buyin",
      categoria: "Bankroll",
      tom: r.roi >= rp.roi ? "positivo" : "atencao",
      titulo:
        r.roi >= rp.roi
          ? "Você sustenta os buy-ins mais altos"
          : "Seus buy-ins altos ainda não se pagam",
      corpo: `ROI de ${r.roi.toFixed(0)}% em torneios de R$ 150+ contra ${rp.roi.toFixed(0)}% nos menores, em ${grandes.length} e ${pequenos.length} registros.`,
    });
  }

  const mesasFinais = e.torneios.filter(ehMesaFinal);
  if (mesasFinais.length >= 3) {
    const conversao = (e.torneios.filter(ehTituloOuVice).length / mesasFinais.length) * 100;
    saida.push({
      id: "mesa-final",
      categoria: "Técnica",
      tom: conversao >= 25 ? "positivo" : "atencao",
      titulo:
        conversao >= 25
          ? "Você fecha bem as mesas finais"
          : "Suas mesas finais param no meio",
      corpo: `Das ${mesasFinais.length} mesas finais alcançadas, ${conversao.toFixed(0)}% terminaram em 1º ou 2º lugar. É aí que mora a maior parte do prêmio.`,
    });
  }

  return saida;
}

const ehTituloOuVice = (t: Torneio) => t.colocacao !== null && t.colocacao <= 2;

/** Reexportado para o cartão de últimos torneios não reimplementar a regra. */
export { ehItm, ehMesaFinal, investimento };

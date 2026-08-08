"use client";

import { useMemo, useState } from "react";
import { CardSatelites } from "@/components/dash/CardSatelites";
import { HeroBanca } from "@/components/dash/HeroBanca";
import { Indicador } from "@/components/dash/Indicador";
import { Insights } from "@/components/dash/Insights";
import { Metas } from "@/components/dash/Metas";
import { SaudeTecnica } from "@/components/dash/SaudeTecnica";
import { UltimosTorneios } from "@/components/dash/UltimosTorneios";
import { Segmentado } from "@/components/ui/Segmentado";
import { ehItm, ehMesaFinal, PERIODOS, type PeriodoChave } from "@/lib/calc/metricas";
import { usarDemonstracao } from "@/lib/data/repositorio";
import { decimal, percentual, pontos } from "@/lib/format";
import { usePainel } from "@/lib/painel";

const BASE_PERIODO: Record<PeriodoChave, string> = {
  "30d": "vs. 30 dias anteriores",
  "90d": "vs. 90 dias anteriores",
  "6m": "vs. semestre anterior",
  tudo: "vs. primeira metade",
};

/** Agrupa uma métrica por mês para alimentar as faíscas dos indicadores. */
function porMesSimples<T>(itens: { data: string }[], calcular: (grupo: T[]) => number): number[] {
  const mapa = new Map<string, T[]>();
  for (const item of itens) {
    const d = new Date(item.data);
    const chave = `${d.getUTCFullYear()}-${String(d.getUTCMonth()).padStart(2, "0")}`;
    (mapa.get(chave) ?? mapa.set(chave, []).get(chave)!).push(item as T);
  }
  return [...mapa.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, g]) => calcular(g));
}

export default function Painel() {
  const [periodo, setPeriodo] = useState<PeriodoChave>("90d");
  const dados = usePainel(periodo);
  const { atual, anterior, geral, torneios } = dados;

  const faiscas = useMemo(() => {
    type T = (typeof torneios)[number];
    return {
      roi: porMesSimples<T>(torneios, (g) => {
        const inv = g.reduce((a, t) => a + t.buyIn + t.rebuys + t.addon, 0);
        const ret = g.reduce((a, t) => a + t.premiacao, 0);
        return inv ? ((ret - inv) / inv) * 100 : 0;
      }),
      disciplina: porMesSimples<T>(torneios, (g) => {
        const com = g.filter((t) => t.notaDisciplina !== null);
        return com.length
          ? com.reduce((a, t) => a + (t.notaDisciplina ?? 0), 0) / com.length
          : 0;
      }),
      itm: porMesSimples<T>(torneios, (g) =>
        g.length ? (g.filter(ehItm).length / g.length) * 100 : 0,
      ),
      mesasFinais: porMesSimples<T>(torneios, (g) => g.filter(ehMesaFinal).length),
    };
  }, [torneios]);

  const semDados = atual.resumo.torneios === 0;
  const primeiraVez = dados.modo === "proprio" && geral.torneios === 0;
  const metaMesasFinais = dados.metas.find((m) => m.id === "mesas-finais" && m.ativa) ?? null;
  const base = BASE_PERIODO[periodo];

  return (
    <main className="mx-auto w-full max-w-[86rem] px-4 py-8 sm:px-7 sm:py-10 lg:px-10">
      {/* Uma linha de filtro acima de tudo o que ela recorta — nunca um
          seletor por cartão, que faria os gráficos discordarem entre si. */}
      <header className="surgir flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div>
          <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-[30px]">
            {primeiraVez
              ? `Tudo pronto, ${dados.perfil.nome.split(" ")[0]}`
              : `Bom dia, ${dados.perfil.nome.split(" ")[0]}`}
          </h1>
          {/* Um painel zerado não deve se apresentar como resumo de nada:
              "0 torneios · 0 satélites · 0 horas" é uma frase que só descreve
              a própria ausência. */}
          <p className="mt-1.5 text-[13.5px] text-ink-secondary">
            {primeiraVez ? (
              <>
                O painel abre vazio e preenche sozinho.{" "}
                <button
                  type="button"
                  onClick={usarDemonstracao}
                  className="cursor-pointer text-ink underline decoration-hairline-strong underline-offset-4 transition-colors duration-200 hover:decoration-[var(--color-positivo)]"
                >
                  Ver a demonstração
                </button>{" "}
                mostra como ele fica cheio.
              </>
            ) : (
              <>
                {geral.torneios} torneios registrados · {dados.statsSat.disputados} satélites ·{" "}
                {Math.round(geral.minutosJogados / 60)} horas na mesa
              </>
            )}
          </p>
        </div>

        <Segmentado
          rotuloAcessivel="Período de análise"
          valor={periodo}
          aoMudar={setPeriodo}
          opcoes={PERIODOS.map((p) => ({ valor: p.chave, rotulo: p.rotulo }))}
        />
      </header>

      <div className="mt-7 grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-12">
          <HeroBanca dados={dados} periodo={periodo} />
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:col-span-12 lg:grid-cols-4">
          <Indicador
            atraso={60}
            rotulo="ROI do período"
            valor={semDados ? 0 : atual.resumo.roi}
            formatar={(v) => percentual(v)}
            delta={
              semDados
                ? undefined
                : {
                    texto: pontos(dados.variacaoRoi),
                    direcao:
                      dados.variacaoRoi > 0.5
                        ? "alta"
                        : dados.variacaoRoi < -0.5
                          ? "baixa"
                          : "estavel",
                    base,
                  }
            }
            nota={semDados ? "Nenhum torneio no período" : undefined}
            faisca={{ valores: faiscas.roi, descricao: "ROI mês a mês" }}
          />

          <Indicador
            atraso={120}
            rotulo="Disciplina"
            valor={semDados ? 0 : atual.resumo.disciplina}
            formatar={(v) => decimal(v, 1)}
            sufixo="/ 10"
            delta={
              semDados
                ? undefined
                : {
                    texto: decimal(Math.abs(dados.variacaoDisciplina), 1),
                    direcao:
                      dados.variacaoDisciplina > 0.05
                        ? "alta"
                        : dados.variacaoDisciplina < -0.05
                          ? "baixa"
                          : "estavel",
                    base,
                  }
            }
            faisca={{ valores: faiscas.disciplina, descricao: "Nota média de disciplina por mês" }}
          />

          {/* Segue o alvo que o jogador definiu no cartão de Metas. Repetir um
              20 fixo aqui faria o painel discordar de si mesmo assim que
              alguém trocasse a meta. */}
          <Indicador
            atraso={180}
            rotulo={`Mesas finais em ${dados.hoje.getUTCFullYear()}`}
            valor={dados.mesasFinaisAno}
            formatar={(v) => String(Math.round(v))}
            sufixo={metaMesasFinais ? `/ ${metaMesasFinais.alvo}` : undefined}
            medidor={metaMesasFinais ? dados.mesasFinaisAno / metaMesasFinais.alvo : undefined}
            nota={
              !metaMesasFinais
                ? "Sem meta definida para o ano"
                : dados.mesasFinaisAno >= metaMesasFinais.alvo
                  ? "Meta do ano concluída"
                  : `Faltam ${metaMesasFinais.alvo - dados.mesasFinaisAno} para a meta do ano`
            }
          />

          <Indicador
            atraso={240}
            rotulo="ITM do período"
            valor={semDados ? 0 : atual.resumo.itmPct}
            formatar={(v) => percentual(v)}
            delta={
              semDados
                ? undefined
                : {
                    texto: pontos(atual.resumo.itmPct - anterior.resumo.itmPct),
                    direcao:
                      atual.resumo.itmPct > anterior.resumo.itmPct + 0.5
                        ? "alta"
                        : atual.resumo.itmPct < anterior.resumo.itmPct - 0.5
                          ? "baixa"
                          : "estavel",
                    base,
                  }
            }
            faisca={{ valores: faiscas.itm, descricao: "Taxa de ITM por mês" }}
          />
        </div>

        <div className="min-w-0 lg:col-span-7">
          <SaudeTecnica
            saude={dados.saude}
            medicao={dados.medicaoAtual}
            hoje={dados.hoje}
            atraso={300}
          />
        </div>
        <div className="min-w-0 lg:col-span-5">
          <Metas metas={dados.metas} atraso={340} />
        </div>

        <div className="min-w-0 lg:col-span-5">
          <CardSatelites
            stats={dados.statsSat}
            recomendacao={dados.recomendacao}
            atraso={380}
          />
        </div>
        <div className="min-w-0 lg:col-span-7">
          <Insights insights={dados.insights.slice(0, 6)} atraso={420} />
        </div>

        <div className="min-w-0 lg:col-span-12">
          <UltimosTorneios torneios={torneios} idx={dados.idx} atraso={460} />
        </div>
      </div>
    </main>
  );
}

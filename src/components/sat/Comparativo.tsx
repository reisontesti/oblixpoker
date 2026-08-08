"use client";

import { CabecalhoPlaca, Placa } from "@/components/ui/Placa";
import { ParDeBarras } from "@/components/viz/ParDeBarras";
import { TabelaDados } from "@/components/viz/TabelaDados";
import type { Comparacao } from "@/lib/calc/satelites";
import { decimal, duracao, moeda, percentual } from "@/lib/format";

const COR_DIRETO = "var(--color-direto)";
const COR_SATELITE = "var(--color-satelite)";

export function Comparativo({ comp, atraso = 0 }: { comp: Comparacao; atraso?: number }) {
  const { direto, satelite } = comp;

  const par = (valor: (v: typeof direto) => number) =>
    [
      { rotulo: "Direto", valor: valor(direto), cor: COR_DIRETO },
      { rotulo: "Satélite", valor: valor(satelite), cor: COR_SATELITE },
    ] as [
      { rotulo: string; valor: number; cor: string },
      { rotulo: string; valor: number; cor: string },
    ];

  const metricas = [
    {
      chave: "lucro",
      titulo: "Lucro real por torneio",
      nota: "A linha de baixo: já inclui a economia na entrada e o que aconteceu na mesa",
      series: par((d) => d.lucroMedio),
      formatar: (v: number) => moeda(v),
    },
    {
      chave: "desempenho",
      titulo: "Desempenho com custo igualado",
      nota: "ROI cobrando o buy-in de balcão dos dois lados — isola como você jogou",
      series: par((d) => d.roiBalcao),
      formatar: (v: number) => percentual(v),
    },
    {
      chave: "itm",
      titulo: "Taxa de ITM",
      series: par((d) => d.itmPct),
      formatar: (v: number) => percentual(v),
    },
    {
      chave: "mf",
      titulo: "Taxa de mesa final",
      series: par((d) => d.mesaFinalPct),
      formatar: (v: number) => percentual(v),
    },
    {
      chave: "duracao",
      titulo: "Tempo médio em mesa",
      nota: "Quanto mais fundo você vai, mais tempo joga",
      series: par((d) => d.duracaoMediaMin),
      formatar: (v: number) => duracao(v),
    },
    {
      chave: "disciplina",
      titulo: "Nota média de disciplina",
      series: par((d) => d.disciplina),
      formatar: (v: number) => `${decimal(v, 1)} / 10`,
    },
  ];

  return (
    <Placa atraso={atraso}>
      <CabecalhoPlaca
        titulo="Satélite × entrada direta"
        descricao={`${direto.torneios} torneios entrando direto contra ${satelite.torneios} via satélite`}
        acessorio={
          // Duas séries: legenda sempre presente. A identidade nunca depende
          // só da cor — cada painel também rotula a linha.
          <span className="flex items-center gap-3.5 text-[12px] text-ink-secondary">
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="h-[3px] w-4 rounded-full"
                style={{ background: COR_DIRETO }}
              />
              Direto
            </span>
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="h-[3px] w-4 rounded-full"
                style={{ background: COR_SATELITE }}
              />
              Satélite
            </span>
          </span>
        }
      />

      <div className="px-6 pb-6 sm:px-7">
        <div className="divide-y divide-hairline">
          {metricas.map((m) => (
            <ParDeBarras
              key={m.chave}
              titulo={m.titulo}
              nota={m.nota}
              series={m.series}
              formatar={m.formatar}
              menorEhMelhor={m.chave === "duracao"}
            />
          ))}
        </div>

        <p className="mt-4 border-t border-hairline pt-3.5 text-[12px] leading-relaxed text-ink-muted">
          Cada painel tem escala própria porque as unidades são diferentes.
          Comparar reais com percentuais num eixo só criaria uma relação que
          não existe nos dados.
        </p>

        <TabelaDados
          legenda="Comparação entre entrada direta e via satélite em todas as métricas"
          linhas={metricas}
          chaveDe={(m) => m.chave}
          alturaMax="none"
          colunas={[
            { chave: "m", rotulo: "Métrica", render: (m) => m.titulo },
            {
              chave: "d",
              rotulo: "Direto",
              numerica: true,
              render: (m) => m.formatar(m.series[0].valor),
            },
            {
              chave: "s",
              rotulo: "Satélite",
              numerica: true,
              render: (m) => m.formatar(m.series[1].valor),
            },
          ]}
        />
      </div>
    </Placa>
  );
}

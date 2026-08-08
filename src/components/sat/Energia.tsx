"use client";

import { CabecalhoPlaca, Placa } from "@/components/ui/Placa";
import { TabelaDados } from "@/components/viz/TabelaDados";
import type { FaixaEnergia } from "@/lib/calc/metricas";
import type { EnergiaPorVia } from "@/lib/calc/satelites";
import { RAMPA_ENERGIA } from "@/lib/viz/palette";
import { ROTULO_ENERGIA, type NivelEnergia } from "@/lib/types";
import { percentual } from "@/lib/format";

interface Props {
  faixas: FaixaEnergia[];
  porVia: EnergiaPorVia[];
  atraso?: number;
}

/**
 * A ponte entre as duas metades da feature: o satélite não piora o torneio
 * por mágica — ele piora porque o jogador chega cansado. As duas colunas
 * mostram a causa (com que energia você chega, e por qual via) ao lado do
 * efeito (quão fundo você termina).
 */
export function Energia({ faixas, porVia, atraso = 0 }: Props) {
  const ordenadas = [...faixas].reverse();
  const viaPorNivel = new Map(porVia.map((v) => [v.nivel, v]));
  const maiorContagem = Math.max(1, ...porVia.map((v) => v.direto + v.satelite));

  return (
    <Placa atraso={atraso}>
      <CabecalhoPlaca
        titulo="Energia e profundidade"
        descricao="Com que disposição você senta na mesa, e onde isso te deixa no campo"
        acessorio={
          <span className="flex items-center gap-3.5 text-[12px] text-ink-secondary">
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="h-[3px] w-4 rounded-full"
                style={{ background: "var(--color-direto)" }}
              />
              Direto
            </span>
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="h-[3px] w-4 rounded-full"
                style={{ background: "var(--color-satelite)" }}
              />
              Satélite
            </span>
          </span>
        }
      />

      <div className="px-6 pb-6 sm:px-7">
        <div className="grid grid-cols-[minmax(0,auto)_1fr_1fr] gap-x-2.5 sm:gap-x-6">
          <span />
          <span className="rotulo pb-2">Por via</span>
          <span className="rotulo pb-2">Profundidade no campo</span>

          {ordenadas.map((faixa, i) => {
            const via = viaPorNivel.get(faixa.nivel);
            const total = (via?.direto ?? 0) + (via?.satelite ?? 0);
            // A rampa vai do mais cansado ao mais descansado; `ordenadas`
            // está invertida, então o índice também.
            const corRampa = RAMPA_ENERGIA[RAMPA_ENERGIA.length - 1 - i];
            const semAmostra = faixa.torneios < 3;

            return (
              <div key={faixa.nivel} className="contents">
                <span className="border-t border-hairline py-3 text-[12.5px] leading-tight text-ink-secondary sm:whitespace-nowrap">
                  {ROTULO_ENERGIA[faixa.nivel]}
                </span>

                <span className="flex items-center gap-2 border-t border-hairline py-3">
                  <span className="relative h-[12px] flex-1">
                    {/* Segmentos separados por 2px na cor da superfície —
                        um respiro, não uma borda desenhada em volta. */}
                    <span
                      className="absolute top-0 bottom-0 left-0 rounded-l-[3px]"
                      style={{
                        width: `${((via?.direto ?? 0) / maiorContagem) * 100}%`,
                        background: "var(--color-direto)",
                      }}
                    />
                    <span
                      className="absolute top-0 bottom-0 rounded-r-[3px]"
                      style={{
                        left: `calc(${((via?.direto ?? 0) / maiorContagem) * 100}% + 2px)`,
                        width: `max(0px, calc(${((via?.satelite ?? 0) / maiorContagem) * 100}% - 2px))`,
                        background: "var(--color-satelite)",
                      }}
                    />
                  </span>
                  <span className="numeros-tabulares w-6 shrink-0 text-right text-[12px] text-ink-muted">
                    {total}
                  </span>
                </span>

                <span className="flex items-center gap-2.5 border-t border-hairline py-3">
                  <span className="relative h-[12px] flex-1 overflow-hidden rounded-[3px] bg-trilho">
                    <span
                      className="absolute inset-y-0 left-0 rounded-[3px] transition-[width] duration-[1s] ease-[var(--ease-out-quint)]"
                      style={{
                        width: `${faixa.profundidadeMedia * 100}%`,
                        background: corRampa,
                        opacity: semAmostra ? 0.4 : 1,
                      }}
                    />
                  </span>
                  <span className="numeros-tabulares w-11 shrink-0 text-right text-[12.5px] font-medium text-ink">
                    {percentual(faixa.profundidadeMedia * 100)}
                  </span>
                </span>
              </div>
            );
          })}
        </div>

        <p className="mt-4 border-t border-hairline pt-3.5 text-[12px] leading-relaxed text-ink-muted">
          Profundidade é a fração do campo que ficou atrás de você: 100% seria
          vencer, 0% seria o primeiro eliminado. Ela usa todos os torneios, e
          não só os premiados, então move devagar e diz a verdade mesmo com
          poucos registros — ao contrário do ROI, que vira de sinal com um
          prêmio grande.
        </p>

        <TabelaDados
          legenda="Torneios, profundidade média e ROI por nível de energia"
          linhas={ordenadas}
          chaveDe={(f) => f.nivel}
          alturaMax="none"
          colunas={[
            {
              chave: "n",
              rotulo: "Energia",
              render: (f) => ROTULO_ENERGIA[f.nivel as NivelEnergia],
            },
            { chave: "t", rotulo: "Torneios", numerica: true, render: (f) => f.torneios },
            {
              chave: "d",
              rotulo: "Direto",
              numerica: true,
              render: (f) => viaPorNivel.get(f.nivel)?.direto ?? 0,
            },
            {
              chave: "s",
              rotulo: "Satélite",
              numerica: true,
              render: (f) => viaPorNivel.get(f.nivel)?.satelite ?? 0,
            },
            {
              chave: "p",
              rotulo: "Profundidade",
              numerica: true,
              render: (f) => percentual(f.profundidadeMedia * 100),
            },
            {
              chave: "i",
              rotulo: "ITM",
              numerica: true,
              render: (f) => percentual(f.itmPct),
            },
          ]}
        />
      </div>
    </Placa>
  );
}

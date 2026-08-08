"use client";

import { CabecalhoPlaca, Placa } from "@/components/ui/Placa";
import { Vazio } from "@/components/ui/Vazio";
import { ehMesaFinal, ehTitulo, investimento, type IndiceSatelites } from "@/lib/calc/metricas";
import { dataCurta, duracao, moeda, moedaComSinal, ordinal } from "@/lib/format";
import type { Torneio } from "@/lib/types";

interface Props {
  torneios: Torneio[];
  idx: IndiceSatelites;
  atraso?: number;
}

export function UltimosTorneios({ torneios, idx, atraso = 0 }: Props) {
  const ultimos = [...torneios].reverse().slice(0, 7);

  if (ultimos.length === 0) {
    return (
      <Placa atraso={atraso}>
        <CabecalhoPlaca titulo="Últimos torneios" descricao="Os sete registros mais recentes" />
        <Vazio
          titulo="Seu histórico começa aqui"
          corpo="Registrar leva menos de um minuto e é o que alimenta tudo o mais: banca, ROI, comparação entre as vias de entrada e a leitura de energia."
          acao={{ rotulo: "Registrar o primeiro torneio", href: "/torneios/novo" }}
        />
      </Placa>
    );
  }

  return (
    <Placa atraso={atraso}>
      <CabecalhoPlaca titulo="Últimos torneios" descricao="Os sete registros mais recentes" />
      <div className="overflow-x-auto px-3 pb-5 sm:px-4">
        <table className="w-full min-w-[38rem] border-collapse text-[13px]">
          <caption className="sr-only">
            Torneios mais recentes com data, clube, via de entrada, colocação e resultado
          </caption>
          <thead>
            <tr className="text-[10px] tracking-[0.14em] text-ink-muted uppercase">
              <th scope="col" className="px-3 pb-2 text-left font-semibold">
                Data
              </th>
              <th scope="col" className="px-3 pb-2 text-left font-semibold">
                Torneio
              </th>
              <th scope="col" className="px-3 pb-2 text-left font-semibold">
                Entrada
              </th>
              <th scope="col" className="px-3 pb-2 text-right font-semibold">
                Posição
              </th>
              <th scope="col" className="px-3 pb-2 text-right font-semibold">
                Duração
              </th>
              <th scope="col" className="px-3 pb-2 text-right font-semibold">
                Resultado
              </th>
            </tr>
          </thead>
          <tbody>
            {ultimos.map((t) => {
              const sat = t.sateliteId ? idx.get(t.sateliteId) : null;
              const saldo = t.premiacao - investimento(t, sat);
              const titulo = ehTitulo(t);
              const mesaFinal = ehMesaFinal(t);

              return (
                <tr
                  key={t.id}
                  className="border-t border-hairline transition-colors duration-200 hover:bg-white/[0.025]"
                >
                  <td className="numeros-tabulares px-3 py-2.5 whitespace-nowrap text-ink-muted">
                    {dataCurta(t.data)}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="block max-w-[16rem] truncate text-ink">{t.nome}</span>
                    <span className="block max-w-[16rem] truncate text-[11.5px] text-ink-muted">
                      {t.clube} · {t.jogadores} jogadores
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
                      style={{
                        color: t.via === "satelite" ? "var(--color-satelite)" : "var(--color-direto)",
                        background: "color-mix(in oklab, currentColor 12%, transparent)",
                      }}
                    >
                      {t.via === "satelite" ? "Satélite" : "Direto"}
                    </span>
                  </td>
                  <td className="numeros-tabulares px-3 py-2.5 text-right whitespace-nowrap">
                    <span className={titulo || mesaFinal ? "font-semibold text-ink" : "text-ink-secondary"}>
                      {t.colocacao !== null ? ordinal(t.colocacao) : "—"}
                    </span>
                    {/* Conquista não ganha matiz própria: ganha luz. */}
                    {titulo && (
                      <span className="ml-1.5 text-[10px] font-semibold tracking-wide text-ink drop-shadow-[0_0_8px_rgba(242,244,243,0.55)]">
                        TÍTULO
                      </span>
                    )}
                    {!titulo && mesaFinal && (
                      <span className="ml-1.5 text-[10px] text-ink-secondary">MF</span>
                    )}
                  </td>
                  <td className="numeros-tabulares px-3 py-2.5 text-right whitespace-nowrap text-ink-muted">
                    {duracao(t.duracaoMin)}
                  </td>
                  <td
                    className="numeros-tabulares px-3 py-2.5 text-right font-medium whitespace-nowrap"
                    style={{
                      color: saldo >= 0 ? "var(--color-positivo)" : "var(--color-negativo)",
                    }}
                  >
                    {moedaComSinal(saldo)}
                    <span className="block text-[11px] font-normal text-ink-muted">
                      {t.premiacao > 0 ? `prêmio ${moeda(t.premiacao)}` : "sem prêmio"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Placa>
  );
}

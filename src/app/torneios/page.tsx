"use client";

import Link from "next/link";
import { useState } from "react";
import { CabecalhoPlaca, Placa } from "@/components/ui/Placa";
import { Segmentado } from "@/components/ui/Segmentado";
import { ehItm, ehMesaFinal, ehTitulo, investimento } from "@/lib/calc/metricas";
import { ehRegistroProprio, remover } from "@/lib/data/repositorio";
import { dataMedia, duracao, moeda, moedaComSinal, ordinal, percentual } from "@/lib/format";
import { usePainel } from "@/lib/painel";

type Filtro = "todos" | "premiados" | "satelite" | "meus";

export default function Torneios() {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const dados = usePainel("tudo");
  const { geral, idx } = dados;

  const lista = [...dados.torneios]
    .reverse()
    .filter((t) =>
      filtro === "premiados"
        ? ehItm(t)
        : filtro === "satelite"
          ? t.via === "satelite"
          : filtro === "meus"
            ? ehRegistroProprio(t.id)
            : true,
    );

  return (
    <main className="mx-auto w-full max-w-[86rem] px-4 py-8 sm:px-7 sm:py-10 lg:px-10">
      <header className="surgir flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div>
          <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-[30px]">
            Torneios
          </h1>
          <p className="mt-1.5 text-[13.5px] text-ink-secondary">
            {geral.torneios} registros · {percentual(geral.itmPct)} de ITM ·{" "}
            {geral.mesasFinais} mesas finais · {geral.titulos}{" "}
            {geral.titulos === 1 ? "título" : "títulos"}
          </p>
        </div>

        <Link
          href="/torneios/novo"
          className="rounded-xl bg-[var(--color-positivo)] px-5 py-2.5 text-[13.5px] font-semibold text-plane transition-opacity duration-200 hover:opacity-90"
        >
          Registrar torneio
        </Link>
      </header>

      <div className="mt-7">
        <Placa>
          <CabecalhoPlaca
            titulo="Histórico"
            descricao={`${lista.length} ${lista.length === 1 ? "torneio" : "torneios"} neste filtro`}
            acessorio={
              <Segmentado
                rotuloAcessivel="Filtrar torneios"
                valor={filtro}
                aoMudar={setFiltro}
                opcoes={[
                  { valor: "todos", rotulo: "Todos" },
                  { valor: "premiados", rotulo: "Premiados" },
                  { valor: "satelite", rotulo: "Satélite" },
                  { valor: "meus", rotulo: "Meus" },
                ]}
              />
            }
          />

          <div className="overflow-x-auto px-3 pb-5 sm:px-4">
            <table className="w-full min-w-[48rem] border-collapse text-[13px]">
              <caption className="sr-only">
                Todos os torneios registrados, com via de entrada, colocação e resultado
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
                    Investido
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
                  <th scope="col" className="px-3 pb-2 text-right font-semibold">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {lista.map((t) => {
                  const sat = t.sateliteId ? idx.get(t.sateliteId) : null;
                  const investido = investimento(t, sat);
                  const saldo = t.premiacao - investido;
                  const proprio = ehRegistroProprio(t.id);

                  return (
                    <tr
                      key={t.id}
                      className="group border-t border-hairline transition-colors duration-200 hover:bg-white/[0.025]"
                    >
                      <td className="numeros-tabulares px-3 py-2.5 whitespace-nowrap text-ink-muted">
                        {dataMedia(t.data)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="flex items-center gap-2">
                          <span className="max-w-[15rem] truncate text-ink">{t.nome}</span>
                          {proprio && (
                            <span className="shrink-0 rounded-full border border-hairline px-1.5 py-px text-[9.5px] tracking-wide text-ink-muted">
                              seu
                            </span>
                          )}
                        </span>
                        <span className="block max-w-[15rem] truncate text-[11.5px] text-ink-muted">
                          {t.clube} · {t.jogadores} jogadores
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium"
                          style={{
                            color:
                              t.via === "satelite"
                                ? "var(--color-satelite)"
                                : "var(--color-direto)",
                            background: "color-mix(in oklab, currentColor 12%, transparent)",
                          }}
                        >
                          {t.via === "satelite" ? "Satélite" : "Direto"}
                        </span>
                      </td>
                      <td className="numeros-tabulares px-3 py-2.5 text-right whitespace-nowrap text-ink-secondary">
                        {moeda(investido)}
                      </td>
                      <td className="numeros-tabulares px-3 py-2.5 text-right whitespace-nowrap">
                        <span
                          className={
                            ehTitulo(t) || ehMesaFinal(t)
                              ? "font-semibold text-ink"
                              : "text-ink-secondary"
                          }
                        >
                          {t.colocacao !== null ? ordinal(t.colocacao) : "—"}
                        </span>
                        {ehTitulo(t) && (
                          <span className="ml-1.5 text-[10px] font-semibold tracking-wide text-ink drop-shadow-[0_0_8px_rgba(242,244,243,0.55)]">
                            TÍTULO
                          </span>
                        )}
                        {!ehTitulo(t) && ehMesaFinal(t) && (
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
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {/* Só o que o jogador registrou pode ser apagado — a
                            base de demonstração é leitura. */}
                        {proprio && (
                          <button
                            type="button"
                            onClick={() => remover(t.id)}
                            className="cursor-pointer text-[11.5px] text-ink-faint opacity-0 transition-all duration-200 group-hover:opacity-100 hover:text-[var(--color-negativo)] focus-visible:opacity-100"
                          >
                            Apagar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {lista.length === 0 && (
              <div className="px-3 py-12 text-center">
                <p className="text-[13.5px] text-ink-secondary">
                  {filtro === "meus"
                    ? "Você ainda não registrou nenhum torneio."
                    : "Nenhum torneio neste filtro."}
                </p>
                {filtro === "meus" && (
                  <Link
                    href="/torneios/novo"
                    className="mt-4 inline-block rounded-xl border border-hairline px-4 py-2 text-[13px] font-medium text-ink transition-colors duration-200 hover:border-hairline-strong hover:bg-white/4"
                  >
                    Registrar o primeiro
                  </Link>
                )}
              </div>
            )}
          </div>
        </Placa>
      </div>
    </main>
  );
}

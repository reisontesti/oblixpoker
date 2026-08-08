"use client";

import { useState } from "react";
import { CabecalhoPlaca, Placa } from "@/components/ui/Placa";
import { Segmentado } from "@/components/ui/Segmentado";
import { custoSatelite, investimento } from "@/lib/calc/metricas";
import { dataCurta, duracao, moeda, moedaComSinal, ordinal } from "@/lib/format";
import type { Satelite, Torneio } from "@/lib/types";

type Filtro = "todos" | "classificados" | "perdidos";

interface Props {
  satelites: Satelite[];
  torneios: Torneio[];
  atraso?: number;
}

export function Historico({ satelites, torneios, atraso = 0 }: Props) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const porId = new Map(torneios.map((t) => [t.id, t]));

  const lista = [...satelites]
    .reverse()
    .filter((s) =>
      filtro === "todos" ? true : filtro === "classificados" ? s.classificou : !s.classificou,
    );

  return (
    <Placa atraso={atraso}>
      <CabecalhoPlaca
        titulo="Histórico de satélites"
        descricao={`${satelites.length} registros · quando classifica, o Oblix liga o satélite ao principal`}
        acessorio={
          <Segmentado
            rotuloAcessivel="Filtrar satélites"
            valor={filtro}
            aoMudar={setFiltro}
            opcoes={[
              { valor: "todos", rotulo: "Todos" },
              { valor: "classificados", rotulo: "Vagas" },
              { valor: "perdidos", rotulo: "Perdidos" },
            ]}
          />
        }
      />

      <div className="overflow-x-auto px-3 pb-5 sm:px-4">
        <table className="w-full min-w-[46rem] border-collapse text-[13px]">
          <caption className="sr-only">
            Satélites disputados, custo, resultado e o torneio principal correspondente
          </caption>
          <thead>
            <tr className="text-[10px] tracking-[0.14em] text-ink-muted uppercase">
              <th scope="col" className="px-3 pb-2 text-left font-semibold">
                Data
              </th>
              <th scope="col" className="px-3 pb-2 text-left font-semibold">
                Satélite
              </th>
              <th scope="col" className="px-3 pb-2 text-right font-semibold">
                Custo
              </th>
              <th scope="col" className="px-3 pb-2 text-right font-semibold">
                Posição
              </th>
              <th scope="col" className="px-3 pb-2 text-right font-semibold">
                Tempo
              </th>
              <th scope="col" className="px-3 pb-2 text-left font-semibold">
                Principal
              </th>
            </tr>
          </thead>
          <tbody>
            {lista.map((s) => {
              const principal = s.torneioId ? porId.get(s.torneioId) : null;
              const saldo = principal ? principal.premiacao - investimento(principal, s) : null;

              return (
                <tr
                  key={s.id}
                  className="border-t border-hairline transition-colors duration-200 hover:bg-white/[0.025]"
                >
                  <td className="numeros-tabulares px-3 py-2.5 whitespace-nowrap text-ink-muted">
                    {dataCurta(s.data)}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="block max-w-[15rem] truncate text-ink">{s.nome}</span>
                    <span className="block max-w-[15rem] truncate text-[11.5px] text-ink-muted">
                      {s.clube} · {s.jogadores} jogadores
                      {s.entradas > 1 && ` · ${s.entradas} entradas`}
                    </span>
                  </td>
                  <td className="numeros-tabulares px-3 py-2.5 text-right whitespace-nowrap text-ink-secondary">
                    {moeda(custoSatelite(s))}
                    <span className="block text-[11px] text-ink-muted">
                      vaga de {moeda(s.valorVaga)}
                    </span>
                  </td>
                  <td className="numeros-tabulares px-3 py-2.5 text-right whitespace-nowrap">
                    <span className={s.classificou ? "font-medium text-ink" : "text-ink-muted"}>
                      {s.posicao !== null ? ordinal(s.posicao) : "—"}
                    </span>
                    <span
                      className="block text-[11px] font-medium"
                      style={{
                        color: s.classificou
                          ? "var(--color-positivo)"
                          : "var(--color-ink-faint)",
                      }}
                    >
                      {s.classificou ? "✓ vaga" : "eliminado"}
                    </span>
                  </td>
                  <td className="numeros-tabulares px-3 py-2.5 text-right whitespace-nowrap text-ink-muted">
                    {duracao(s.tempoJogadoMin)}
                  </td>
                  <td className="px-3 py-2.5">
                    {principal ? (
                      <span className="flex items-baseline gap-2">
                        <span aria-hidden className="text-ink-faint">
                          →
                        </span>
                        <span className="min-w-0">
                          <span className="block max-w-[13rem] truncate text-[12.5px] text-ink-secondary">
                            {principal.nome}
                          </span>
                          <span
                            className="numeros-tabulares block text-[11.5px] font-medium"
                            style={{
                              color:
                                (saldo ?? 0) >= 0
                                  ? "var(--color-positivo)"
                                  : "var(--color-negativo)",
                            }}
                          >
                            {ordinal(principal.colocacao ?? 0)} · {moedaComSinal(saldo ?? 0)}
                          </span>
                        </span>
                      </span>
                    ) : (
                      <span className="text-[12px] text-ink-faint">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {lista.length === 0 && (
          <p className="px-3 py-8 text-center text-[13px] text-ink-muted">
            Nenhum satélite neste filtro.
          </p>
        )}
      </div>
    </Placa>
  );
}

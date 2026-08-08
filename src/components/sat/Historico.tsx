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

      {/* ── celular: cartões ──
          A tabela de seis colunas pedia 736px de largura mínima e empurrava a
          página inteira para o lado. O cartão diz o mesmo com rótulo onde a
          coluna dizia com posição. */}
      <ul className="lg:hidden">
        {lista.map((s) => {
          const principal = s.torneioId ? porId.get(s.torneioId) : null;
          const saldo = principal ? principal.premiacao - investimento(principal, s) : null;

          return (
            <li key={s.id} className="border-t border-hairline px-5 py-4 first:border-t-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[15px] leading-snug font-medium text-ink">
                    {s.nome}
                  </p>
                  <p className="numeros-tabulares mt-1 truncate text-[12px] text-ink-muted">
                    {dataCurta(s.data)} · {s.clube}
                    {s.entradas > 1 && ` · ${s.entradas} entradas`}
                  </p>
                </div>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[12px] font-medium whitespace-nowrap"
                  style={{
                    color: s.classificou ? "var(--color-positivo)" : "var(--color-ink-muted)",
                    background: "color-mix(in oklab, currentColor 13%, transparent)",
                  }}
                >
                  {s.classificou ? "✓ Vaga" : "Eliminado"}
                </span>
              </div>

              <div className="numeros-tabulares mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[12.5px] text-ink-secondary">
                <span>{moeda(custoSatelite(s))} de custo</span>
                <span className="text-ink-muted">vaga de {moeda(s.valorVaga)}</span>
                <span className="text-ink-muted">
                  {s.posicao !== null ? ordinal(s.posicao) : "—"} de {s.jogadores}
                </span>
                <span className="text-ink-muted">{duracao(s.tempoJogadoMin)}</span>
              </div>

              {principal && (
                <p className="mt-2 flex items-baseline gap-2 border-t border-hairline pt-2 text-[12.5px]">
                  <span aria-hidden className="text-ink-faint">
                    →
                  </span>
                  <span className="min-w-0 flex-1 truncate text-ink-secondary">
                    {principal.nome}
                  </span>
                  <span
                    className="numeros-tabulares shrink-0 font-medium"
                    style={{
                      color:
                        (saldo ?? 0) >= 0 ? "var(--color-positivo)" : "var(--color-negativo)",
                    }}
                  >
                    {ordinal(principal.colocacao ?? 0)} · {moedaComSinal(saldo ?? 0)}
                  </span>
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {/* A tabela rola por DENTRO de si mesma. Sem isto, a 1024px — laptop
          pequeno, tablet deitado — as sete colunas mais os 248px da lateral
          passavam da tela e empurravam a página inteira para o lado. */}
      {/* `relative` não é decoração: `sr-only` posiciona em `absolute`, e um
          absoluto só é recortado por ancestral POSICIONADO. Sem isto, a
          legenda invisível da tabela escapava do rolador, ia parar a 1072px e
          esticava o documento inteiro — 48px de rolagem horizontal cuja causa
          não aparecia em tela nenhuma. */}
      <div className="relative hidden overflow-x-auto px-4 pb-5 lg:block">
        <table className="w-full min-w-[46rem] border-collapse text-[13px]">
          <caption className="sr-only">
            Satélites disputados, custo, resultado e o torneio principal correspondente
          </caption>
          <thead>
            <tr className="text-[11px] tracking-[0.14em] text-ink-muted uppercase">
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
                  className="border-t border-hairline transition-colors duration-200 hover:bg-realce-tenue"
                >
                  <td className="numeros-tabulares px-3 py-2.5 whitespace-nowrap text-ink-muted">
                    {dataCurta(s.data)}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="block max-w-[15rem] truncate text-ink">{s.nome}</span>
                    <span className="block max-w-[15rem] truncate text-[12px] text-ink-muted">
                      {s.clube} · {s.jogadores} jogadores
                      {s.entradas > 1 && ` · ${s.entradas} entradas`}
                    </span>
                  </td>
                  <td className="numeros-tabulares px-3 py-2.5 text-right whitespace-nowrap text-ink-secondary">
                    {moeda(custoSatelite(s))}
                    <span className="block text-[12px] text-ink-muted">
                      vaga de {moeda(s.valorVaga)}
                    </span>
                  </td>
                  <td className="numeros-tabulares px-3 py-2.5 text-right whitespace-nowrap">
                    <span className={s.classificou ? "font-medium text-ink" : "text-ink-muted"}>
                      {s.posicao !== null ? ordinal(s.posicao) : "—"}
                    </span>
                    <span
                      className="block text-[12px] font-medium"
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
                            className="numeros-tabulares block text-[12px] font-medium"
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
      </div>

      {lista.length === 0 && (
        <p className="px-5 py-10 text-center text-[13px] text-ink-muted">
          Nenhum satélite neste filtro.
        </p>
      )}
    </Placa>
  );
}

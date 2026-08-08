"use client";

import { Numero } from "@/components/ui/Numero";
import { Delta } from "@/components/ui/Delta";
import { useState } from "react";
import { Banca } from "@/components/dash/Banca";
import { Vazio } from "@/components/ui/Vazio";
import { CurvaBankroll } from "@/components/viz/CurvaBankroll";
import { TabelaDados } from "@/components/viz/TabelaDados";
import type { DadosPainel } from "@/lib/painel";
import { dataMedia, moeda, moedaComSinal, variacao } from "@/lib/format";

const rotuloPeriodo: Record<string, string> = {
  "7d": "nos últimos 7 dias",
  manual: "no período escolhido",
  "30d": "nos últimos 30 dias",
  "90d": "nos últimos 90 dias",
  "6m": "nos últimos 6 meses",
  tudo: "desde o início",
};

export function HeroBanca({ dados, periodo }: { dados: DadosPainel; periodo: string }) {
  const { bankroll, variacaoBankroll, serie, serieRecorte, geral } = dados;
  const [ajustando, setAjustando] = useState(false);
  const pico = serie.reduce((a, p) => Math.max(a, p.saldo), 0);
  const noPico = bankroll >= pico - 0.5;
  const variacaoAbsoluta = bankroll - dados.bankrollAntes;

  // Uma curva precisa de dois pontos para existir. Com um só — ou nenhum —
  // não há reta a traçar, e `CurvaBankroll` leria índices que não existem.
  const paraPlotar = serieRecorte.length >= 2 ? serieRecorte : serie.slice(-2);
  const temCurva = paraPlotar.length >= 2;

  return (
    <section className="placa surgir grao relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -inset-px overflow-hidden rounded-[20px]">
        <div className="absolute -top-52 left-1/4 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(25,158,112,0.18),transparent)] blur-3xl" />
      </div>
      <div aria-hidden className="grao-camada rounded-[20px]" />

      <div className="relative px-6 pt-6 sm:px-8 sm:pt-8">
        <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-6">
          <div>
            {/* O ajuste da banca mora no cartão da banca. Quem percebe que o
                número está errado é exatamente quem acabou de olhar para ele —
                mandar essa pessoa procurar um menu de configurações seria
                perder a intenção no caminho. */}
            <span className="flex items-center gap-2.5">
              <h2 className="rotulo">Banca</h2>
              <button
                type="button"
                onClick={() => setAjustando(true)}
                className="cursor-pointer rounded-md px-1.5 py-0.5 text-[10.5px] font-medium text-ink-muted transition-colors duration-200 hover:bg-white/6 hover:text-ink"
              >
                aportes e saques
              </button>
            </span>
            {/* Figura herói: uma por tela, na mesma sans do resto, com
                algarismos proporcionais — tabulares deixariam o número solto. */}
            <p className="mt-3">
              <Numero
                valor={bankroll}
                formatar={(v) => moeda(v)}
                duracao={1400}
                className="text-[clamp(2.75rem,7vw,4.25rem)] leading-[0.95] font-semibold tracking-[-0.035em] text-ink"
              />
            </p>
            {variacaoBankroll !== null && (
              <Delta
                className="mt-3.5 text-[14px]"
                texto={`${variacao(variacaoBankroll, 1)} · ${moedaComSinal(variacaoAbsoluta)}`}
                direcao={variacaoAbsoluta > 0 ? "alta" : variacaoAbsoluta < 0 ? "baixa" : "estavel"}
                base={rotuloPeriodo[periodo] ?? ""}
              />
            )}
          </div>

          <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:gap-x-12">
            <div>
              <dt className="rotulo">Pico histórico</dt>
              <dd className="numeros-tabulares mt-2 text-[19px] font-medium text-ink">
                {moeda(pico)}
              </dd>
              <dd className="mt-0.5 text-[11.5px] text-ink-muted">
                {/* Com um evento só, "você está no topo" é verdade vazia: o
                    topo e o fundo são o mesmo ponto. */}
                {serie.length <= 1
                  ? "Só o aporte inicial, por enquanto"
                  : noPico
                    ? "Você está no topo"
                    : `Faltam ${moeda(pico - bankroll)}`}
              </dd>
            </div>
            <div>
              <dt className="rotulo">Lucro acumulado</dt>
              <dd
                className="numeros-tabulares mt-2 text-[19px] font-medium"
                style={{
                  color: geral.lucro >= 0 ? "var(--color-positivo)" : "var(--color-negativo)",
                }}
              >
                {moedaComSinal(geral.lucro)}
              </dd>
              <dd className="mt-0.5 text-[11.5px] text-ink-muted">
                em {geral.torneios} torneios
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {!temCurva ? (
        <div className="relative">
          <Vazio
            titulo="A curva da sua banca começa no primeiro registro"
            corpo="Cada torneio, satélite e aporte vira um ponto aqui, na ordem em que aconteceu. Bastam dois para a linha aparecer."
            acao={{ rotulo: "Registrar um torneio", href: "/torneios/novo" }}
          />
        </div>
      ) : (
        <>
          <div className="relative mt-6 min-w-0 px-2 pb-2 sm:px-3">
            <CurvaBankroll serie={paraPlotar} />
          </div>

          <div className="relative px-6 pb-5 sm:px-8">
            <TabelaDados
              legenda="Movimentações da banca no período, em ordem cronológica"
              linhas={[...paraPlotar].reverse()}
              chaveDe={(p) => `${p.t}-${p.rotulo}`}
              colunas={[
                {
                  chave: "data",
                  rotulo: "Data",
                  render: (p) => dataMedia(new Date(p.t).toISOString()),
                },
                { chave: "evento", rotulo: "Evento", render: (p) => p.rotulo },
                {
                  chave: "delta",
                  rotulo: "Resultado",
                  numerica: true,
                  render: (p) => moedaComSinal(p.delta),
                },
                {
                  chave: "saldo",
                  rotulo: "Banca",
                  numerica: true,
                  render: (p) => moeda(p.saldo),
                },
              ]}
            />
          </div>
        </>
      )}

      {ajustando && <Banca aoFechar={() => setAjustando(false)} />}
    </section>
  );
}

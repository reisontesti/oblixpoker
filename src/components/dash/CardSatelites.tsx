"use client";

import Link from "next/link";
import { CabecalhoPlaca, Placa } from "@/components/ui/Placa";
import { Vazio } from "@/components/ui/Vazio";
import type { EstatisticasSatelites, Recomendacao } from "@/lib/calc/satelites";
import { moeda, percentual } from "@/lib/format";

const VEREDITO = {
  favoravel: { rotulo: "Compensa", cor: "var(--color-positivo)", icone: "✓" },
  neutro: { rotulo: "Empatado", cor: "var(--color-ink-secondary)", icone: "=" },
  contrario: { rotulo: "Não compensa", cor: "var(--color-atencao)", icone: "!" },
} as const;

interface Props {
  stats: EstatisticasSatelites;
  recomendacao: Recomendacao;
  atraso?: number;
}

export function CardSatelites({ stats, recomendacao, atraso = 0 }: Props) {
  const v = VEREDITO[recomendacao.veredito];

  // Sem nenhum satélite disputado, os quatro números seriam zero e o selo
  // diria "Empatado" — uma conclusão sobre uma comparação que não existe.
  if (stats.disputados === 0) {
    return (
      <Placa atraso={atraso}>
        <CabecalhoPlaca titulo="Satélites" descricao="Vale a pena jogar o satélite?" />
        <Vazio
          titulo="A pergunta que o Oblix existe para responder"
          corpo="O satélite barateia a vaga e cobra em energia. Registrando os torneios em que você jogou satélite antes, o Oblix mede as duas forças separadamente e diz de que lado o saldo fica — no seu caso, não no do jogador médio."
          acao={{ rotulo: "Registrar um torneio", href: "/torneios/novo" }}
        />
      </Placa>
    );
  }

  return (
    <Placa atraso={atraso}>
      <CabecalhoPlaca
        titulo="Satélites"
        descricao="Vale a pena jogar o satélite?"
        acessorio={
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium"
            style={{ color: v.cor, background: "color-mix(in oklab, currentColor 13%, transparent)" }}
          >
            <span aria-hidden className="text-[9px]">
              {v.icone}
            </span>
            {v.rotulo}
          </span>
        }
      />

      <div className="px-6 pb-6 sm:px-7">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
          <div>
            <dt className="rotulo">Classificação</dt>
            <dd className="numeros-tabulares mt-1.5 text-[24px] font-semibold text-ink">
              {percentual(stats.taxaClassificacao)}
            </dd>
            <dd className="text-[12px] text-ink-muted">
              {stats.classificados} de {stats.disputados} satélites
            </dd>
          </div>
          <div>
            <dt className="rotulo">Custo por vaga</dt>
            <dd className="numeros-tabulares mt-1.5 text-[24px] font-semibold text-ink">
              {moeda(stats.custoMedioPorVaga)}
            </dd>
            <dd className="text-[12px] text-ink-muted">contra o buy-in de balcão</dd>
          </div>
          <div>
            <dt className="rotulo">Economia líquida</dt>
            <dd
              className="numeros-tabulares mt-1.5 text-[19px] font-medium"
              style={{
                color:
                  stats.economiaLiquida >= 0 ? "var(--color-positivo)" : "var(--color-negativo)",
              }}
            >
              {moeda(stats.economiaLiquida)}
            </dd>
            <dd className="text-[12px] text-ink-muted">já descontando os que perdeu</dd>
          </div>
          <div>
            <dt className="rotulo">Melhor sequência</dt>
            <dd className="numeros-tabulares mt-1.5 text-[19px] font-medium text-ink">
              {stats.melhorSequencia} seguidos
            </dd>
            <dd className="text-[12px] text-ink-muted">vagas consecutivas</dd>
          </div>
        </dl>

        <div className="mt-6 border-t border-hairline pt-4">
          <p className="rotulo">Últimos resultados</p>
          <ol className="mt-2.5 flex flex-wrap gap-1.5" aria-label="Resultados recentes em satélites">
            {[...stats.ultimos].reverse().map((u) => (
              <li
                key={u.id}
                title={u.classificou ? "Classificou" : "Não classificou"}
                className="size-2.5 rounded-full"
                style={{
                  background: u.classificou ? "var(--color-positivo)" : "transparent",
                  border: u.classificou ? "none" : "1px solid var(--color-hairline-strong)",
                }}
              >
                <span className="sr-only">
                  {u.classificou ? "Classificou" : "Não classificou"}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-2.5 flex items-center gap-4 text-[12px] text-ink-muted">
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="size-2.5 rounded-full"
                style={{ background: "var(--color-positivo)" }}
              />
              classificou
            </span>
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="size-2.5 rounded-full border border-hairline-strong"
              />
              não classificou
            </span>
          </p>
        </div>

        <Link
          href="/satelites"
          className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-hairline bg-sunken px-4 py-3 transition-colors duration-200 hover:border-hairline-strong hover:bg-raised"
        >
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-medium text-ink">
              {recomendacao.titulo}
            </span>
            <span className="block text-[12px] text-ink-muted">Ver a análise completa</span>
          </span>
          <span aria-hidden className="shrink-0 text-ink-muted">
            →
          </span>
        </Link>
      </div>
    </Placa>
  );
}

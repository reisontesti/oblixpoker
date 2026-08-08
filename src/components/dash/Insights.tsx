"use client";

import { CabecalhoPlaca, Placa } from "@/components/ui/Placa";
import { Vazio } from "@/components/ui/Vazio";
import type { Insight } from "@/lib/calc/insights";

const TOM = {
  positivo: { cor: "var(--color-positivo)", icone: "✓", leitura: "Positivo" },
  atencao: { cor: "var(--color-atencao)", icone: "!", leitura: "Atenção" },
  neutro: { cor: "var(--color-ink-muted)", icone: "•", leitura: "Neutro" },
} as const;

export function Insights({ insights, atraso = 0 }: { insights: Insight[]; atraso?: number }) {
  return (
    <Placa atraso={atraso}>
      <CabecalhoPlaca
        titulo="Insights"
        descricao="Padrões que o Oblix encontrou no seu histórico"
      />

      {/* Nenhum insight não é falha: é o piso de amostra funcionando. Abaixo
          de 6 registros por recorte o Oblix se cala em vez de transformar
          ruído em conclusão, e o estado vazio precisa dizer isso — senão
          parece que o produto não faz nada. */}
      {insights.length === 0 && (
        <Vazio
          titulo="Ainda não há padrão para apontar"
          corpo="O Oblix só afirma alguma coisa quando tem amostra que sustente: a partir de seis registros por recorte. Antes disso, o que apareceria aqui seria acaso com cara de conclusão."
          acao={{ rotulo: "Registrar um torneio", href: "/torneios/novo" }}
        />
      )}

      <ul className="px-6 pb-6 sm:px-7">
        {insights.map((insight) => {
          const tom = TOM[insight.tom];
          return (
            <li
              key={insight.id}
              className="group flex gap-3.5 border-t border-hairline py-4 first:border-t-0 first:pt-1"
            >
              {/* Ponto de estado com ícone: a cor nunca informa sozinha. */}
              <span
                aria-hidden
                className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[12px] font-bold"
                style={{
                  color: tom.cor,
                  background: "color-mix(in oklab, currentColor 14%, transparent)",
                }}
              >
                {tom.icone}
              </span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <span className="text-[13.5px] leading-snug font-medium text-ink">
                    {insight.titulo}
                  </span>
                  <span className="rounded-full border border-hairline px-2 py-0.5 text-[12px] tracking-wide text-ink-muted">
                    {insight.categoria}
                  </span>
                  <span className="sr-only">{tom.leitura}</span>
                </span>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-secondary">
                  {insight.corpo}
                </p>
              </span>
            </li>
          );
        })}
      </ul>
    </Placa>
  );
}

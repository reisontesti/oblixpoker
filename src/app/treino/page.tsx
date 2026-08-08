"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Placa } from "@/components/ui/Placa";
import { desempenhoPorFase, recomendarTreino } from "@/lib/treino/motor";
import { DESCRICAO_FASE, FASES, ROTULO_FASE, type Fase } from "@/lib/treino/tipos";
import { useRegistros } from "@/lib/painel";

/**
 * A tela que responde "o que você quer treinar hoje?".
 *
 * O treino recomendado vem primeiro e ocupa o herói porque é a resposta à
 * pergunta que a feature existe para responder: qual parte do jogo precisa
 * melhorar AGORA. As categorias vêm depois, para quem já sabe o que quer.
 *
 * Cada categoria mostra o próprio aproveitamento — e se cala abaixo de dez
 * decisões, como o resto do Oblix. Um "40%" tirado de duas respostas diria
 * mais sobre o acaso do que sobre o jogador.
 */

const ESTADO = {
  forte: { rotulo: "Forte", cor: "var(--color-positivo)", icone: "✓" },
  normal: { rotulo: "No caminho", cor: "var(--color-ink-secondary)", icone: "→" },
  melhorar: { rotulo: "Precisa melhorar", cor: "var(--color-atencao)", icone: "!" },
  critico: { rotulo: "Crítico", cor: "var(--color-negativo)", icone: "!" },
  sem_dados: { rotulo: "Sem amostra", cor: "var(--color-ink-faint)", icone: "·" },
} as const;

export default function Treino() {
  const { treino } = useRegistros();

  const desempenhos = useMemo(
    () => FASES.map((f) => desempenhoPorFase(treino, f)),
    [treino],
  );
  const recomendado = useMemo(() => recomendarTreino(treino, FASES), [treino]);

  const total = treino.length;
  const acertos = treino.filter((r) => r.correta).length;

  return (
    <main className="mx-auto w-full max-w-[76rem] px-4 py-8 sm:px-7 sm:py-10 lg:px-10">
      <header className="surgir">
        <h1 className="texto-display text-ink">
          Treino
        </h1>
        <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-ink-secondary">
          {total > 0
            ? `${total} decisões respondidas · ${Math.round((acertos / total) * 100)}% de aproveitamento geral`
            : "Situações reais de torneio, uma decisão por vez. O Oblix acompanha onde você erra e passa a insistir exatamente ali."}
        </p>
      </header>

      {/* ── treino recomendado ── */}
      <section className="placa grao surgir relative mt-7 overflow-hidden">
        <div aria-hidden className="grao-camada rounded-[20px]" />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/3 h-72 w-[34rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-positivo)_16%,transparent),transparent)] blur-2xl"
        />
        <div className="relative flex flex-wrap items-end justify-between gap-x-8 gap-y-5 px-6 py-7 sm:px-8">
          <div className="min-w-0 max-w-xl">
            <p className="rotulo">Seu próximo treino</p>
            <h2 className="texto-display mt-2.5 text-ink">
              {ROTULO_FASE[recomendado.fase]}
            </h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-secondary">
              {recomendado.motivo}
            </p>
          </div>
          <Link
            href={`/treino/sessao?fase=${recomendado.fase}&n=${recomendado.decisoes}`}
            className="shrink-0 cursor-pointer rounded-xl bg-[var(--color-positivo)] px-6 py-3 text-[14px] font-semibold text-plane transition-transform duration-200 hover:brightness-110 active:scale-[0.985]"
          >
            Começar treino
          </Link>
        </div>
      </section>

      {/* ── categorias ── */}
      <h2 className="surgir mt-8 text-[12px] font-semibold tracking-[0.16em] text-ink-muted uppercase">
        Escolher a fase
      </h2>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {desempenhos.map((d, i) => (
          <Cartao key={d.fase} fase={d.fase} atraso={60 + i * 40} desempenho={d} />
        ))}
      </div>

      <p className="surgir mt-8 max-w-2xl text-[12px] leading-relaxed text-ink-muted">
        As recomendações do Oblix são referência própria, construída a partir de princípios
        públicos de torneio — posição mais atrasada abre mais largo, stack mais curto empurra mais
        largo, pagar all-in exige mais do que empurrar. Não são saída de solver, e o produto diz
        isso em vez de fingir autoridade que não tem.
      </p>
    </main>
  );
}

function Cartao({
  fase,
  desempenho,
  atraso,
}: {
  fase: Fase;
  desempenho: ReturnType<typeof desempenhoPorFase>;
  atraso: number;
}) {
  const e = ESTADO[desempenho.estado];
  const pct = Math.round(desempenho.aproveitamento * 100);

  return (
    <Placa atraso={atraso}>
      <Link href={`/treino/sessao?fase=${fase}&n=25`} className="block px-5 py-5 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-ink">{ROTULO_FASE[fase]}</h3>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">
              {DESCRICAO_FASE[fase]}
            </p>
          </div>
          <span
            className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium"
            style={{ color: e.cor, background: "color-mix(in oklab, currentColor 13%, transparent)" }}
          >
            <span aria-hidden className="text-[9px]">
              {e.icone}
            </span>
            {e.rotulo}
          </span>
        </div>

        {desempenho.estado === "sem_dados" ? (
          <p className="mt-4 text-[12px] text-ink-faint">
            {desempenho.decisoes === 0
              ? "Nenhuma decisão ainda"
              : `${desempenho.decisoes} de 10 decisões para o Oblix opinar`}
          </p>
        ) : (
          <>
            <div className="mt-4 flex items-baseline gap-2.5">
              <span className="numeros-tabulares text-[26px] font-semibold text-ink">{pct}%</span>
              <span className="text-[12px] text-ink-muted">
                em {desempenho.decisoes} decisões
              </span>
            </div>
            <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-trilho">
              <div
                className="h-full rounded-full transition-[width] duration-[1.2s] ease-[var(--ease-out-quint)]"
                style={{ width: `${pct}%`, background: e.cor }}
              />
            </div>
          </>
        )}
      </Link>
    </Placa>
  );
}

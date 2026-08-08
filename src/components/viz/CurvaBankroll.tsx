"use client";

import { useMemo, useState } from "react";
import type { PontoBankroll } from "@/lib/calc/metricas";
import { dataMedia, moeda, moedaCompacta, moedaComSinal } from "@/lib/format";
import {
  caminhoArea,
  caminhoLinha,
  dominioComFolga,
  escalaLinear,
  maisProximo,
  ticksBonitos,
} from "@/lib/viz/escala";
import { useLargura } from "@/lib/viz/useLargura";

const MARGEM = { topo: 18, direita: 18, base: 30, esquerda: 62 };
const ALTURA = 260;

interface Props {
  serie: PontoBankroll[];
}

/**
 * Curva de banca. Série única: sem caixa de legenda — o título do cartão já
 * diz o que está plotado, e um quadradinho com uma cor só repetiria o título
 * gastando espaço.
 */
export function CurvaBankroll({ serie }: Props) {
  const { ref, largura } = useLargura<HTMLDivElement>();
  const [cursor, setCursor] = useState<number | null>(null);

  const larguraPlot = Math.max(120, largura - MARGEM.esquerda - MARGEM.direita);
  const alturaPlot = ALTURA - MARGEM.topo - MARGEM.base;

  const { pontos, y, ticksY, ticksX, base } = useMemo(() => {
    const xs = serie.map((p) => p.t);
    const ys = serie.map((p) => p.saldo);
    const x = escalaLinear(
      [Math.min(...xs), Math.max(...xs)],
      [MARGEM.esquerda, MARGEM.esquerda + larguraPlot],
    );
    const y = escalaLinear(dominioComFolga(ys, 0.14), [
      MARGEM.topo + alturaPlot,
      MARGEM.topo,
    ]);
    const pontos = serie.map((p) => ({ x: x(p.t), y: y(p.saldo), dado: p }));

    // Marcas de mês no eixo x, sem repetir o mesmo rótulo duas vezes.
    const vistos = new Set<string>();
    const ticksX: { px: number; rotulo: string }[] = [];
    for (const p of serie) {
      const d = new Date(p.t);
      const chave = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      ticksX.push({
        px: x(p.t),
        rotulo: new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" })
          .format(d)
          .replace(".", ""),
      });
    }

    return {
      pontos,
      y,
      ticksY: ticksBonitos(y.dominio[0], y.dominio[1], 4),
      ticksX: ticksX.filter((_, i) => i % (ticksX.length > 9 ? 2 : 1) === 0),
      base: MARGEM.topo + alturaPlot,
    };
  }, [serie, larguraPlot, alturaPlot]);

  const ativo = cursor === null ? null : pontos[cursor];
  const ultimo = pontos[pontos.length - 1];
  const emAlta = serie[serie.length - 1].saldo >= serie[0].saldo;
  const cor = emAlta ? "var(--color-positivo)" : "var(--color-negativo)";

  function mover(ev: React.MouseEvent<SVGRectElement>) {
    const caixa = ev.currentTarget.getBoundingClientRect();
    setCursor(maisProximo(pontos, ev.clientX - caixa.left + MARGEM.esquerda));
  }

  function teclado(ev: React.KeyboardEvent<SVGRectElement>) {
    if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;
    ev.preventDefault();
    const passo = ev.key === "ArrowRight" ? 1 : -1;
    setCursor((c) => {
      const base = c ?? pontos.length - 1;
      return Math.max(0, Math.min(pontos.length - 1, base + passo));
    });
  }

  return (
    <div className="relative w-full min-w-0">
      {/* Régua de altura zero. Medir o próprio contêiner do SVG criaria um
          laço: o SVG largo alarga o contêiner, a medição confirma a largura
          grande e o gráfico nunca encolhe — que era exatamente o que
          estourava a viewport no celular. Uma régua vazia não pode ser
          inflada pelo conteúdo, então ela reporta o espaço realmente
          disponível. */}
      <div ref={ref} aria-hidden className="h-0 w-full" />
      <svg
        width={largura}
        height={ALTURA}
        className="block max-w-full overflow-visible"
        role="img"
        aria-label={`Evolução da banca de ${dataMedia(new Date(serie[0].t).toISOString())} a ${dataMedia(new Date(serie[serie.length - 1].t).toISOString())}. Saldo atual ${moeda(serie[serie.length - 1].saldo)}.`}
      >
        <defs>
          <linearGradient id="lavagem-banca" x1="0" y1="0" x2="0" y2="1">
            {/* Lavagem a 10% da matiz da série — nunca um bloco saturado. */}
            <stop offset="0%" stopColor={cor} stopOpacity="0.16" />
            <stop offset="100%" stopColor={cor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grade: fio de 1px sólido, um passo acima da superfície */}
        {ticksY.map((t) => (
          <g key={t}>
            <line
              x1={MARGEM.esquerda}
              x2={MARGEM.esquerda + larguraPlot}
              y1={y(t)}
              y2={y(t)}
              stroke="var(--color-grid)"
              strokeWidth="1"
            />
            <text
              x={MARGEM.esquerda - 12}
              y={y(t)}
              textAnchor="end"
              dominantBaseline="middle"
              className="numeros-tabulares fill-[var(--color-ink-muted)] text-[12px]"
            >
              {moedaCompacta(t)}
            </text>
          </g>
        ))}

        {ticksX.map((t) => (
          <text
            key={t.px}
            x={t.px}
            y={ALTURA - 8}
            textAnchor="middle"
            className="fill-[var(--color-ink-muted)] text-[12px]"
          >
            {t.rotulo}
          </text>
        ))}

        {/* Traço e marcador final revelados juntos, da esquerda para a
            direita. Fora deste grupo o marcador apareceria sozinho no fim da
            linha antes de a linha chegar até ele. */}
        <g style={{ animation: "oblix-revelar 1.3s var(--ease-out-quint) both" }}>
          <path d={caminhoArea(pontos, base)} fill="url(#lavagem-banca)" />
          <path
            d={caminhoLinha(pontos)}
            fill="none"
            stroke={cor}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {/* Anel na cor da superfície: o marcador continua legível onde
              cruza a própria linha. */}
          <circle cx={ultimo.x} cy={ultimo.y} r="7" fill={cor} opacity="0.18" />
          <circle
            cx={ultimo.x}
            cy={ultimo.y}
            r="4.5"
            fill={cor}
            stroke="var(--color-card)"
            strokeWidth="2"
          />
        </g>

        {ativo && (
          <g pointerEvents="none">
            <line
              x1={ativo.x}
              x2={ativo.x}
              y1={MARGEM.topo}
              y2={base}
              stroke="var(--color-hairline-strong)"
              strokeWidth="1"
            />
            <circle
              cx={ativo.x}
              cy={ativo.y}
              r="4.5"
              fill={cor}
              stroke="var(--color-card)"
              strokeWidth="2"
            />
          </g>
        )}

        {/* Alvo de interação: cobre o plot inteiro, então não é preciso
            acertar o ponto — a leitura acompanha o eixo x. */}
        <rect
          x={MARGEM.esquerda}
          y={MARGEM.topo}
          width={larguraPlot}
          height={alturaPlot}
          fill="transparent"
          tabIndex={0}
          role="application"
          aria-label="Explorar a curva. Use as setas esquerda e direita."
          className="cursor-crosshair focus:outline-none"
          onMouseMove={mover}
          onMouseLeave={() => setCursor(null)}
          onKeyDown={teclado}
          onBlur={() => setCursor(null)}
        />
      </svg>

      {ativo && (
        <div
          className="pointer-events-none absolute z-20 w-52 rounded-xl border border-hairline-strong bg-raised/95 p-3 shadow-2xl backdrop-blur-md"
          style={{
            left: Math.min(Math.max(ativo.x - 104, 0), Math.max(0, largura - 208)),
            top: Math.max(0, ativo.y - 96),
          }}
        >
          <p className="text-[12px] text-ink-muted">
            {dataMedia(new Date(ativo.dado.t).toISOString())}
          </p>
          <p className="mt-1 truncate text-[13px] font-medium text-ink">{ativo.dado.rotulo}</p>
          <div className="mt-2.5 flex items-baseline justify-between gap-3 border-t border-hairline pt-2.5">
            <span className="text-[12px] text-ink-muted">Banca</span>
            <span className="numeros-tabulares text-[14px] font-semibold text-ink">
              {moeda(ativo.dado.saldo)}
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-3">
            <span className="text-[12px] text-ink-muted">Resultado</span>
            <span
              className="numeros-tabulares text-[13px] font-medium"
              style={{
                color:
                  ativo.dado.delta >= 0 ? "var(--color-positivo)" : "var(--color-negativo)",
              }}
            >
              {moedaComSinal(ativo.dado.delta)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

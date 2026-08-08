"use client";

import { useMemo } from "react";
import type { PontoSessao } from "@/lib/calc/sessao";
import { ZONA_CRITICA_BB } from "@/lib/calc/sessao";
import { duracao } from "@/lib/format";
import { caminhoArea, caminhoLinha, dominioComFolga, escalaLinear, ticksBonitos } from "@/lib/viz/escala";
import { MARCA, TINTA } from "@/lib/viz/palette";
import { useLargura } from "@/lib/viz/useLargura";

const MARGEM = { topo: 16, direita: 16, base: 26, esquerda: 44 };
const ALTURA = 168;

/**
 * A trajetória do torneio, em dois pequenos múltiplos empilhados.
 *
 * Stack em big blinds e fração do campo eliminada são grandezas diferentes —
 * uma é razão de fichas, a outra é proporção de gente — e por isso vão em
 * painéis separados com escala própria, e nunca num segundo eixo y. Sobrepor
 * as duas faria o cruzamento das linhas parecer significado, quando é só
 * coincidência de unidade.
 *
 * A leitura combinada é o que interessa: stack caindo enquanto o campo cai
 * junto é ficar no mesmo lugar; stack caindo com o campo parado é perder
 * terreno de verdade.
 */
export function CurvaSessao({ pontos }: { pontos: PontoSessao[] }) {
  const { ref, largura } = useLargura<HTMLDivElement>();

  const comBb = pontos.filter((p) => p.bb !== null);
  const comCampo = pontos.filter((p) => p.campoEliminado !== null);

  if (comBb.length < 2 && comCampo.length < 2) return null;

  return (
    <div ref={ref} className="min-w-0 space-y-4">
      {comBb.length >= 2 && (
        <Painel
          largura={largura}
          pontos={comBb}
          valorDe={(p) => p.bb!}
          rotulo="Stack, em big blinds"
          formatarY={(v) => String(Math.round(v))}
          cor={TINTA.positivo}
          // A faixa abaixo de 15 BBs é onde o torneio deixa de ter jogo
          // pós-flop e vira all-in ou fold. Marcá-la explica de um golpe por
          // que uma queda ali pesa mais que a mesma queda lá em cima.
          faixaCritica={ZONA_CRITICA_BB}
        />
      )}
      {comCampo.length >= 2 && (
        <Painel
          largura={largura}
          pontos={comCampo}
          valorDe={(p) => p.campoEliminado! * 100}
          rotulo="Campo já eliminado"
          formatarY={(v) => `${Math.round(v)}%`}
          cor={TINTA.direto}
        />
      )}
    </div>
  );
}

interface PainelProps {
  largura: number;
  pontos: PontoSessao[];
  valorDe: (p: PontoSessao) => number;
  rotulo: string;
  formatarY: (v: number) => string;
  cor: string;
  faixaCritica?: number;
}

function Painel({ largura, pontos, valorDe, rotulo, formatarY, cor, faixaCritica }: PainelProps) {
  const larguraPlot = Math.max(120, largura - MARGEM.esquerda - MARGEM.direita);
  const alturaPlot = ALTURA - MARGEM.topo - MARGEM.base;

  const { caminho, area, marcadores, ticksY, ticksX, yDe } = useMemo(() => {
    const xs = pontos.map((p) => p.minuto);
    const ys = pontos.map(valorDe);
    const x = escalaLinear(
      [Math.min(...xs), Math.max(...xs)],
      [MARGEM.esquerda, MARGEM.esquerda + larguraPlot],
    );
    const y = escalaLinear(dominioComFolga(ys, 0.16), [MARGEM.topo + alturaPlot, MARGEM.topo]);
    const pts = pontos.map((p) => ({ x: x(p.minuto), y: y(valorDe(p)), dado: p }));

    return {
      caminho: caminhoLinha(pts),
      area: caminhoArea(pts, MARGEM.topo + alturaPlot),
      marcadores: pts,
      ticksY: ticksBonitos(y.dominio[0], y.dominio[1], 3).map((v) => ({ v, py: y(v) })),
      ticksX: xs.map((m) => ({ m, px: x(m) })),
      yDe: y,
    };
  }, [pontos, valorDe, larguraPlot, alturaPlot]);

  const idGrad = `sessao-${rotulo.replace(/\W/g, "")}`;

  return (
    <figure className="min-w-0">
      <figcaption className="rotulo mb-1">{rotulo}</figcaption>
      <svg
        width={largura}
        height={ALTURA}
        role="img"
        aria-label={`${rotulo} ao longo do torneio, ${pontos.length} registros.`}
        className="overflow-visible"
      >
        <defs>
          <linearGradient id={idGrad} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={cor} stopOpacity="0.18" />
            <stop offset="100%" stopColor={cor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticksY.map(({ v, py }) => (
          <g key={v}>
            <line
              x1={MARGEM.esquerda}
              x2={MARGEM.esquerda + larguraPlot}
              y1={py}
              y2={py}
              stroke={TINTA.grade}
              strokeWidth={1}
            />
            <text x={MARGEM.esquerda - 8} y={py + 3.5} textAnchor="end" fontSize={10} fill={TINTA.tintaFraca}>
              {formatarY(v)}
            </text>
          </g>
        ))}

        {faixaCritica !== undefined && (
          <line
            x1={MARGEM.esquerda}
            x2={MARGEM.esquerda + larguraPlot}
            y1={yDe(faixaCritica)}
            y2={yDe(faixaCritica)}
            stroke={TINTA.atencao}
            strokeWidth={1}
            strokeDasharray="3 3"
            opacity={0.7}
          />
        )}

        <path d={area} fill={`url(#${idGrad})`} />
        <path
          d={caminho}
          fill="none"
          stroke={cor}
          strokeWidth={MARCA.linha}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {marcadores.map((m, i) => (
          <circle
            key={i}
            cx={m.x}
            cy={m.y}
            r={MARCA.raioMarcador - 1}
            fill={cor}
            stroke={TINTA.superficie}
            strokeWidth={1.5}
          />
        ))}

        {ticksX.map(({ m, px }, i) =>
          i === 0 || i === ticksX.length - 1 || ticksX.length <= 5 ? (
            <text
              key={i}
              x={px}
              y={ALTURA - 8}
              textAnchor={i === 0 ? "start" : i === ticksX.length - 1 ? "end" : "middle"}
              fontSize={10}
              fill={TINTA.tintaFraca}
            >
              {duracao(Math.round(m))}
            </text>
          ) : null,
        )}
      </svg>
      {faixaCritica !== undefined && (
        <p className="mt-1 text-[12px] text-ink-muted">
          A linha tracejada marca {faixaCritica} blinds — abaixo dela o jogo vira all-in ou fold.
        </p>
      )}
    </figure>
  );
}

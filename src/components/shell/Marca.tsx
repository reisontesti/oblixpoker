"use client";

import { useId } from "react";

/**
 * Marca do Oblix: um losango — o naipe de ouros reduzido à geometria — com um
 * corte interno que sugere o monólito do nome. Sem literalidade de cassino,
 * sem carta de baralho desenhada.
 *
 * O `id` do degradê sai de `useId()`, e não de uma constante. Com id fixo, as
 * duas marcas da página compartilhavam o mesmo `url(#oblix-marca)` — e a
 * PRIMEIRA do documento é a da barra lateral, que abaixo de `lg` está em
 * `display: none`. Um servidor de pintura dentro de uma subárvore não
 * renderizada não pinta: no celular, a marca da folha de conta aparecia
 * simplesmente vazia. Levou uma captura de tela para notar.
 */
export function Marca({ tamanho = 26 }: { tamanho?: number }) {
  const id = useId();
  const degrade = `oblix-marca-${id}`;

  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <defs>
        <linearGradient id={degrade} x1="16" y1="1" x2="16" y2="31" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4fe0ab" />
          <stop offset="1" stopColor="#199e70" />
        </linearGradient>
      </defs>
      <path
        d="M16 1.6 30.4 16 16 30.4 1.6 16 16 1.6Z"
        stroke={`url(#${degrade})`}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M16 8.8 23.2 16 16 23.2 8.8 16 16 8.8Z" fill={`url(#${degrade})`} opacity="0.92" />
    </svg>
  );
}

export function Logotipo({ compacto = false }: { compacto?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <Marca tamanho={compacto ? 22 : 26} />
      {!compacto && (
        <span className="text-[17px] font-semibold tracking-[0.24em] text-ink">OBLIX</span>
      )}
    </span>
  );
}

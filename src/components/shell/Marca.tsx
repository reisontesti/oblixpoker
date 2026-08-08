/**
 * Marca do Oblix: um losango — o naipe de ouros reduzido à geometria — com um
 * corte interno que sugere o monólito do nome. Sem literalidade de cassino,
 * sem carta de baralho desenhada.
 */
export function Marca({ tamanho = 26 }: { tamanho?: number }) {
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
        <linearGradient id="oblix-marca" x1="16" y1="1" x2="16" y2="31" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4fe0ab" />
          <stop offset="1" stopColor="#199e70" />
        </linearGradient>
      </defs>
      <path
        d="M16 1.6 30.4 16 16 30.4 1.6 16 16 1.6Z"
        stroke="url(#oblix-marca)"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M16 8.8 23.2 16 16 23.2 8.8 16 16 8.8Z" fill="url(#oblix-marca)" opacity="0.92" />
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

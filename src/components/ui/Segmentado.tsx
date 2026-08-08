"use client";

interface Opcao<T extends string> {
  valor: T;
  rotulo: string;
}

interface SegmentadoProps<T extends string> {
  opcoes: Opcao<T>[];
  valor: T;
  aoMudar: (v: T) => void;
  rotuloAcessivel: string;
}

/**
 * Seletor segmentado. O indicador é um bloco que desliza atrás do rótulo —
 * um estado só, movendo-se, em vez de dois piscando.
 */
export function Segmentado<T extends string>({
  opcoes,
  valor,
  aoMudar,
  rotuloAcessivel,
}: SegmentadoProps<T>) {
  const indice = Math.max(
    0,
    opcoes.findIndex((o) => o.valor === valor),
  );

  return (
    <div
      role="radiogroup"
      aria-label={rotuloAcessivel}
      className="relative inline-flex rounded-full border border-hairline bg-sunken p-1"
    >
      <div
        aria-hidden
        className="absolute top-1 bottom-1 rounded-full bg-raised ring-1 ring-white/8 transition-[left,width] duration-400 ease-[var(--ease-out-quint)]"
        style={{
          left: `calc(${(indice / opcoes.length) * 100}% + 4px)`,
          width: `calc(${100 / opcoes.length}% - 8px)`,
        }}
      />
      {opcoes.map((o) => {
        const ativo = o.valor === valor;
        return (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={ativo}
            onClick={() => aoMudar(o.valor)}
            className={`relative z-10 flex-1 cursor-pointer rounded-full px-3.5 py-1.5 text-[12.5px] font-medium whitespace-nowrap transition-colors duration-200 ${
              ativo ? "text-ink" : "text-ink-muted hover:text-ink-secondary"
            }`}
          >
            {o.rotulo}
          </button>
        );
      })}
    </div>
  );
}

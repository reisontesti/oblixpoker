import type { ReactNode } from "react";

interface PlacaProps {
  children: ReactNode;
  className?: string;
  /** Atraso da entrada, em ms — escalona a revelação da grade. */
  atraso?: number;
  /** Realce ambiente atrás do cartão. Reservado ao herói. */
  luz?: boolean;
}

export function Placa({ children, className = "", atraso = 0, luz = false }: PlacaProps) {
  return (
    <section
      className={`placa surgir grao relative ${className}`}
      style={{ animationDelay: `${atraso}ms` }}
    >
      {luz && (
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-px overflow-hidden rounded-[20px]"
        >
          <div className="absolute -top-40 left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(25,158,112,0.16),transparent)] blur-2xl" />
        </div>
      )}
      <div aria-hidden className="grao-camada rounded-[20px]" />
      <div className="relative">{children}</div>
    </section>
  );
}

interface CabecalhoProps {
  titulo: string;
  descricao?: string;
  acessorio?: ReactNode;
}

export function CabecalhoPlaca({ titulo, descricao, acessorio }: CabecalhoProps) {
  return (
    <header className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 sm:px-7">
      <div className="min-w-0">
        <h2 className="rotulo">{titulo}</h2>
        {descricao && (
          <p className="mt-1.5 text-[13px] leading-snug text-ink-secondary">{descricao}</p>
        )}
      </div>
      {acessorio && <div className="shrink-0">{acessorio}</div>}
    </header>
  );
}

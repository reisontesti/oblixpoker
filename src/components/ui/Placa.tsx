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
          <div className="absolute -top-40 left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-positivo)_16%,transparent),transparent)] blur-2xl" />
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
  // Empilha no celular. Lado a lado, o acessório (quase sempre um seletor de
  // filtro) espremia o título até uma palavra por linha e depois passava por
  // cima dele — os dois `shrink-0` brigando pela mesma linha de 340px.
  return (
    <header className="flex flex-col gap-3 px-5 pt-5 pb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-7">
      <div className="min-w-0">
        <h2 className="rotulo">{titulo}</h2>
        {descricao && (
          <p className="mt-1.5 text-[13px] leading-snug text-ink-secondary">{descricao}</p>
        )}
      </div>
      {acessorio && <div className="min-w-0 sm:shrink-0">{acessorio}</div>}
    </header>
  );
}

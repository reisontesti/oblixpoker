import type { ReactNode } from "react";
import { Revelar } from "@/components/site/Revelar";

/**
 * As peças repetidas da página de apresentação.
 *
 * Existem para a página inteira falar a mesma medida: uma largura de coluna,
 * um respiro entre seções, um tamanho de título. Uma landing em que cada bloco
 * inventa o próprio espaçamento é exatamente o que faz um produto parecer
 * template — e é o oposto do que esta página precisa dizer.
 */

export function Secao({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      // `scroll-mt` porque o cabeçalho é fixo: sem ele, um link de âncora
      // encosta o título embaixo da barra e some.
      className={`mx-auto w-full max-w-[76rem] scroll-mt-20 px-4 py-16 sm:px-7 sm:py-24 lg:px-10 ${className}`}
    >
      {children}
    </section>
  );
}

export function Titulo({
  sobretitulo,
  children,
  apoio,
  centro = false,
}: {
  sobretitulo?: string;
  children: ReactNode;
  apoio?: ReactNode;
  centro?: boolean;
}) {
  return (
    <Revelar className={centro ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {sobretitulo && <p className="rotulo">{sobretitulo}</p>}
      <h2
        className={`text-[27px] leading-[1.12] font-semibold tracking-[-0.025em] text-ink sm:text-[38px] ${
          sobretitulo ? "mt-3" : ""
        }`}
      >
        {children}
      </h2>
      {apoio && (
        <p className="mt-4 text-[15px] leading-relaxed text-ink-secondary sm:text-[16.5px]">
          {apoio}
        </p>
      )}
    </Revelar>
  );
}

/** Cartão da grade de recursos. O glifo é traço, nunca ilustração colorida. */
export function CartaoRecurso({
  titulo,
  corpo,
  glifo,
  atraso = 0,
}: {
  titulo: string;
  corpo: string;
  glifo: ReactNode;
  atraso?: number;
}) {
  return (
    <Revelar
      atraso={atraso}
      className="placa grao group relative overflow-hidden p-5 transition-[border-color,transform] duration-300 hover:-translate-y-0.5 sm:p-6"
    >
      <div aria-hidden className="grao-camada rounded-[20px]" />
      <div className="relative">
        <span
          aria-hidden
          className="grid size-10 place-items-center rounded-xl border border-hairline bg-sunken text-ink-secondary transition-colors duration-300 group-hover:border-hairline-strong group-hover:text-ink"
        >
          {glifo}
        </span>
        <h3 className="texto-subtitulo mt-4 text-ink">{titulo}</h3>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-secondary">{corpo}</p>
      </div>
    </Revelar>
  );
}

/** Frase que carrega a seção sozinha. Uma por página, no máximo duas. */
export function Destaque({ children }: { children: ReactNode }) {
  return (
    <Revelar className="mx-auto max-w-3xl text-center">
      <p className="text-[19px] leading-[1.45] font-medium tracking-[-0.015em] text-ink sm:text-[24px]">
        {children}
      </p>
    </Revelar>
  );
}

const traco = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const Glifo = ({ children }: { children: ReactNode }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
    {children}
  </svg>
);

export const GLIFOS = {
  banca: (
    <Glifo>
      <path {...traco} d="M2.5 14.5 7 9l3.5 3L17.5 5" />
      <path {...traco} d="M13.5 5h4v4" />
    </Glifo>
  ),
  torneio: (
    <Glifo>
      <path {...traco} d="M6.5 3h7v4a3.5 3.5 0 0 1-7 0V3Z" />
      <path {...traco} d="M13.5 4.5H16V6a2.5 2.5 0 0 1-2.5 2.5M6.5 4.5H4V6a2.5 2.5 0 0 0 2.5 2.5" />
      <path {...traco} d="M10 10.5V14m-2.5 3h5" />
    </Glifo>
  ),
  desempenho: (
    <Glifo>
      <path {...traco} d="M3.5 16.5v-5M8 16.5V6M12.5 16.5v-7M17 16.5V3.5" />
    </Glifo>
  ),
  jogadores: (
    <Glifo>
      <circle {...traco} cx="8" cy="7.5" r="2.8" />
      <path {...traco} d="M3 16.5c0-2.5 2.2-4.2 5-4.2s5 1.7 5 4.2" />
      <path {...traco} d="M14 6.2a2.6 2.6 0 0 1 0 5m1 5.3c0-1.7-.6-3-1.6-3.8" />
    </Glifo>
  ),
  treino: (
    <Glifo>
      <circle {...traco} cx="10" cy="10" r="6.5" />
      <circle {...traco} cx="10" cy="10" r="2.6" />
      <path {...traco} d="M10 1.8v2.2M10 16v2.2M1.8 10h2.2M16 10h2.2" />
    </Glifo>
  ),
  evolucao: (
    <Glifo>
      <path {...traco} d="M16.5 6.5A7 7 0 1 0 17 10" />
      <path {...traco} d="M13 6.5h4v-4" />
      <circle {...traco} cx="10" cy="10" r="2.2" />
    </Glifo>
  ),
  satelite: (
    <Glifo>
      <circle {...traco} cx="10" cy="10" r="3" />
      <ellipse {...traco} cx="10" cy="10" rx="8" ry="3.6" transform="rotate(-28 10 10)" />
    </Glifo>
  ),
  importar: (
    <Glifo>
      <path {...traco} d="M10 2.5v9m0 0 3-3m-3 3-3-3" />
      <path {...traco} d="M3 12.5v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
    </Glifo>
  ),
  diario: (
    <Glifo>
      <path {...traco} d="M5 3.5h9a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 14 17.5H5V3.5Z" />
      <path {...traco} d="M5 3.5a1.5 1.5 0 0 0 0 3h1.5M8.5 8h4M8.5 11h4" />
    </Glifo>
  ),
} as const;

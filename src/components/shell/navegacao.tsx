import type { ReactNode } from "react";

export interface ItemNav {
  href: string;
  rotulo: string;
  icone: ReactNode;
  /** Seções previstas no roteiro mas ainda não construídas. */
  emBreve?: boolean;
}

const traco = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const Icone = ({ children }: { children: ReactNode }) => (
  <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden className="shrink-0">
    {children}
  </svg>
);

export const NAVEGACAO: ItemNav[] = [
  {
    href: "/",
    rotulo: "Painel",
    icone: (
      <Icone>
        <path {...traco} d="M3 11.5 10 5l7 6.5" />
        <path {...traco} d="M5 10.5V16h10v-5.5" />
      </Icone>
    ),
  },
  {
    href: "/mesa",
    rotulo: "Mesa",
    icone: (
      <Icone>
        <ellipse {...traco} cx="10" cy="10" rx="7.5" ry="5" />
        <path {...traco} d="M2.5 10v2.5c0 2.8 3.4 5 7.5 5s7.5-2.2 7.5-5V10" />
      </Icone>
    ),
  },
  {
    href: "/satelites",
    rotulo: "Satélites",
    icone: (
      <Icone>
        <circle {...traco} cx="10" cy="10" r="3" />
        <ellipse {...traco} cx="10" cy="10" rx="8" ry="3.6" transform="rotate(-28 10 10)" />
      </Icone>
    ),
  },
  {
    href: "/torneios",
    rotulo: "Torneios",
    icone: (
      <Icone>
        <path {...traco} d="M6.5 3h7v4a3.5 3.5 0 0 1-7 0V3Z" />
        <path {...traco} d="M13.5 4.5H16V6a2.5 2.5 0 0 1-2.5 2.5M6.5 4.5H4V6a2.5 2.5 0 0 0 2.5 2.5" />
        <path {...traco} d="M10 10.5V14m-2.5 3h5" />
      </Icone>
    ),
  },
  {
    href: "/jogadores",
    rotulo: "Jogadores",
    icone: (
      <Icone>
        <circle {...traco} cx="8" cy="7.5" r="2.8" />
        <path {...traco} d="M3 16.5c0-2.5 2.2-4.2 5-4.2s5 1.7 5 4.2" />
        <path {...traco} d="M14 6.2a2.6 2.6 0 0 1 0 5m1 5.3c0-1.7-.6-3-1.6-3.8" />
      </Icone>
    ),
  },
  {
    href: "/diario",
    rotulo: "Diário",
    icone: (
      <Icone>
        <path {...traco} d="M5 3.5h9a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 14 17.5H5V3.5Z" />
        <path {...traco} d="M5 3.5a1.5 1.5 0 0 0 0 3h1.5M8.5 8h4M8.5 11h4" />
      </Icone>
    ),
  },
];

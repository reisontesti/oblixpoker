import type { ReactNode } from "react";

/**
 * Os destinos do Oblix, em duas camadas.
 *
 * A barra do celular tinha sete destinos mais o botão de conta. A 320px isso
 * dá 37px por item — menos que a largura de um polegar — e os rótulos
 * apareciam a 9,5px. Uma barra assim não é navegação, é uma fileira de erros
 * de toque esperando para acontecer.
 *
 * `PRINCIPAIS` são quatro, escolhidos pelo que o jogador faz com frequência:
 * ver como está (Painel), registrar (Torneios), estudar (Treino) e consultar
 * adversário (Jogadores). Com o "Mais", a barra fecha em cinco alvos de 60px+.
 *
 * `SECUNDARIOS` não são menos importantes — são menos frequentes. Mesa,
 * Satélites e Diário abrem de dentro do "Mais" no celular e continuam na
 * lateral no desktop, onde há espaço para os sete de uma vez.
 */

export interface ItemNav {
  href: string;
  rotulo: string;
  icone: ReactNode;
  /** Frase curta no menu "Mais" — a lateral do desktop não usa. */
  resumo?: string;
}

const traco = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const Icone = ({ children }: { children: ReactNode }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden className="shrink-0">
    {children}
  </svg>
);

export const PAINEL: ItemNav = {
  href: "/painel",
  rotulo: "Painel",
  resumo: "Banca, ROI e o que fazer agora",
  icone: (
    <Icone>
      <path {...traco} d="M3 11.5 10 5l7 6.5" />
      <path {...traco} d="M5 10.5V16h10v-5.5" />
    </Icone>
  ),
};

export const TORNEIOS: ItemNav = {
  href: "/torneios",
  rotulo: "Torneios",
  resumo: "Histórico e registro de resultados",
  icone: (
    <Icone>
      <path {...traco} d="M6.5 3h7v4a3.5 3.5 0 0 1-7 0V3Z" />
      <path {...traco} d="M13.5 4.5H16V6a2.5 2.5 0 0 1-2.5 2.5M6.5 4.5H4V6a2.5 2.5 0 0 0 2.5 2.5" />
      <path {...traco} d="M10 10.5V14m-2.5 3h5" />
    </Icone>
  ),
};

export const TREINO: ItemNav = {
  href: "/treino",
  rotulo: "Treino",
  resumo: "Decisões de torneio, uma por vez",
  icone: (
    <Icone>
      {/* Alvo: o treino existe para mirar a fraqueza, não para praticar tudo. */}
      <circle {...traco} cx="10" cy="10" r="6.5" />
      <circle {...traco} cx="10" cy="10" r="2.6" />
      <path {...traco} d="M10 1.8v2.2M10 16v2.2M1.8 10h2.2M16 10h2.2" />
    </Icone>
  ),
};

export const JOGADORES: ItemNav = {
  href: "/jogadores",
  rotulo: "Jogadores",
  resumo: "Leituras e notas dos adversários",
  icone: (
    <Icone>
      <circle {...traco} cx="8" cy="7.5" r="2.8" />
      <path {...traco} d="M3 16.5c0-2.5 2.2-4.2 5-4.2s5 1.7 5 4.2" />
      <path {...traco} d="M14 6.2a2.6 2.6 0 0 1 0 5m1 5.3c0-1.7-.6-3-1.6-3.8" />
    </Icone>
  ),
};

export const MESA: ItemNav = {
  href: "/mesa",
  rotulo: "Mesa",
  resumo: "Os adversários da mesa de agora, de relance",
  icone: (
    <Icone>
      <ellipse {...traco} cx="10" cy="10" rx="7.5" ry="5" />
      <path {...traco} d="M2.5 10v2.5c0 2.8 3.4 5 7.5 5s7.5-2.2 7.5-5V10" />
    </Icone>
  ),
};

export const SATELITES: ItemNav = {
  href: "/satelites",
  rotulo: "Satélites",
  resumo: "Vale a pena jogar o satélite?",
  icone: (
    <Icone>
      <circle {...traco} cx="10" cy="10" r="3" />
      <ellipse {...traco} cx="10" cy="10" rx="8" ry="3.6" transform="rotate(-28 10 10)" />
    </Icone>
  ),
};

export const DIARIO: ItemNav = {
  href: "/diario",
  rotulo: "Diário",
  resumo: "Check-in mental antes e depois de sentar",
  icone: (
    <Icone>
      <path {...traco} d="M5 3.5h9a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 14 17.5H5V3.5Z" />
      <path {...traco} d="M5 3.5a1.5 1.5 0 0 0 0 3h1.5M8.5 8h4M8.5 11h4" />
    </Icone>
  ),
};

export const PLATAFORMAS: ItemNav = {
  href: "/plataformas",
  rotulo: "Plataformas",
  resumo: "Importe o seu histórico das salas",
  icone: (
    <Icone>
      {/* Duas superfícies ligadas: o arquivo de lá entrando aqui. */}
      <rect {...traco} x="2.5" y="4" width="7" height="12" rx="1.6" />
      <rect {...traco} x="12.5" y="7" width="5" height="9" rx="1.4" />
      <path {...traco} d="M9.5 10h3" />
    </Icone>
  ),
};

export const PERFIL: ItemNav = {
  href: "/perfil",
  rotulo: "Perfil",
  resumo: "Seu nome, sua foto e como você joga",
  icone: (
    <Icone>
      <circle {...traco} cx="10" cy="7" r="3.2" />
      <path {...traco} d="M4 17c0-3 2.7-4.8 6-4.8s6 1.8 6 4.8" />
    </Icone>
  ),
};

export const CONFIGURACOES: ItemNav = {
  href: "/configuracoes",
  rotulo: "Configurações",
  resumo: "Aparência, conta e privacidade",
  icone: (
    <Icone>
      <circle {...traco} cx="10" cy="10" r="2.6" />
      <path
        {...traco}
        d="M10 2.6v1.8M10 15.6v1.8M17.4 10h-1.8M4.4 10H2.6M15.2 4.8l-1.3 1.3M6.1 13.9l-1.3 1.3M15.2 15.2l-1.3-1.3M6.1 6.1 4.8 4.8"
      />
    </Icone>
  ),
};

/** Os quatro da barra do celular, antes do "Mais". */
export const PRINCIPAIS: ItemNav[] = [PAINEL, TORNEIOS, TREINO, JOGADORES];

/** O que o "Mais" abre no celular. */
export const SECUNDARIOS: ItemNav[] = [MESA, SATELITES, DIARIO, PLATAFORMAS];

/** A lateral do desktop mostra tudo — lá cabe. */
export const NAVEGACAO: ItemNav[] = [
  PAINEL,
  TORNEIOS,
  TREINO,
  JOGADORES,
  MESA,
  SATELITES,
  DIARIO,
  PLATAFORMAS,
];

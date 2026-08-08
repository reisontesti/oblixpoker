"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/**
 * O botão do Oblix.
 *
 * Existe porque havia trinta e poucas variações do mesmo botão espalhadas pelo
 * código — cada tela com o seu raio, o seu padding e a sua ideia de quanto o
 * verde deve clarear no hover. Um produto que faz isso parece cinco produtos.
 *
 * Duas regras estão embutidas e não são negociáveis por quem usa o componente.
 *
 * **Altura mínima de toque.** Nenhum tamanho desce de 44px de altura no
 * celular. A auditoria encontrou dezenove alvos abaixo disso, vários deles em
 * ações principais — "Cancelar" tinha 20px de altura, o que é menos que a
 * largura de um dedo.
 *
 * **`carregando` desabilita.** Toda ação que vai à rede passa por aqui, e o
 * duplo toque em conexão ruim é a forma mais comum de registrar um torneio
 * duas vezes.
 */

export type TomBotao = "primario" | "secundario" | "discreto" | "perigo";
export type TamanhoBotao = "medio" | "grande";

interface Comum {
  children: ReactNode;
  tom?: TomBotao;
  tamanho?: TamanhoBotao;
  /** Ocupa a linha inteira — o padrão no celular para a ação principal. */
  largo?: boolean;
  className?: string;
}

type Props = Comum &
  (
    | { href: string; aoClicar?: never; carregando?: never; desabilitado?: never; tipo?: never }
    | {
        href?: never;
        aoClicar?: () => void;
        carregando?: boolean;
        desabilitado?: boolean;
        tipo?: "button" | "submit";
      }
  );

const TOM: Record<TomBotao, string> = {
  primario:
    "bg-[var(--color-positivo)] text-plane font-semibold hover:brightness-110 active:brightness-95",
  secundario:
    "border border-hairline bg-raised text-ink font-medium hover:border-hairline-strong active:bg-realce",
  discreto:
    "border border-transparent text-ink-secondary font-medium hover:bg-realce hover:text-ink",
  perigo:
    "border border-hairline text-[var(--color-negativo)] font-medium hover:border-[var(--color-negativo)] hover:bg-[color-mix(in_oklab,var(--color-negativo)_10%,transparent)]",
};

const TAMANHO: Record<TamanhoBotao, string> = {
  medio: "min-h-[var(--toque)] px-4 text-[14px] rounded-xl",
  grande: "min-h-[52px] px-6 text-[15px] rounded-2xl",
};

const BASE =
  "inline-flex cursor-pointer items-center justify-center gap-2 text-center " +
  "transition-[filter,background-color,border-color,transform] duration-200 " +
  "active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100";

export function Botao({
  children,
  tom = "secundario",
  tamanho = "medio",
  largo = false,
  className = "",
  ...resto
}: Props) {
  const classe = `${BASE} ${TOM[tom]} ${TAMANHO[tamanho]} ${largo ? "w-full" : ""} ${className}`;

  if ("href" in resto && resto.href) {
    return (
      <Link href={resto.href} className={classe}>
        {children}
      </Link>
    );
  }

  const { aoClicar, carregando = false, desabilitado = false, tipo = "button" } = resto;
  return (
    <button
      type={tipo}
      onClick={aoClicar}
      disabled={desabilitado || carregando}
      aria-busy={carregando || undefined}
      className={classe}
    >
      {carregando && <Girando />}
      {children}
    </button>
  );
}

/** O indicador de espera. Discreto de propósito: informa, não entretém. */
export function Girando({ tamanho = 14 }: { tamanho?: number }) {
  return (
    <svg
      aria-hidden
      width={tamanho}
      height={tamanho}
      viewBox="0 0 16 16"
      className="shrink-0 animate-spin"
      style={{ animationDuration: "0.7s" }}
    >
      <circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.25" />
      <path
        d="M8 1.6a6.4 6.4 0 0 1 6.4 6.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

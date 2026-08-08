"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

/**
 * A superfície sobreposta do Oblix: folha por baixo no celular, cartão
 * centralizado a partir de `sm`.
 *
 * Um diálogo centralizado no celular é um erro caro e discreto: ele nasce no
 * meio da tela, onde o polegar não chega, e o botão de confirmar acaba embaixo
 * do teclado quando há um campo dentro. A folha resolve os dois de uma vez —
 * ela sobe do lado onde a mão está e o conteúdo rola por dentro dela.
 *
 * O que este componente garante e as telas não precisam repetir:
 *
 * · Escape e toque fora fecham.
 * · O corpo da página não rola por trás (`overflow: hidden` enquanto aberta).
 * · O foco entra na folha e não sai dela pelo Tab, e volta para quem a abriu.
 * · O rodapé de ações fica FORA do trecho que rola, sempre alcançável, com o
 *   `env(safe-area-inset-bottom)` da barra de gestos somado por baixo.
 */

interface FolhaProps {
  titulo: string;
  /** Some visualmente mas continua nomeando o diálogo para leitores de tela. */
  tituloOculto?: boolean;
  descricao?: string;
  children: ReactNode;
  /** Ações fixas no rodapé. Nunca rolam junto com o conteúdo. */
  rodape?: ReactNode;
  aoFechar: () => void;
  /** Largura máxima no desktop. */
  largura?: "estreita" | "media" | "larga";
}

const LARGURA = {
  estreita: "sm:max-w-[26rem]",
  media: "sm:max-w-[34rem]",
  larga: "sm:max-w-[44rem]",
} as const;

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Folha({
  titulo,
  tituloOculto = false,
  descricao,
  children,
  rodape,
  aoFechar,
  largura = "media",
}: FolhaProps) {
  const caixa = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const alvo = caixa.current;
    // O primeiro elemento focável, ou a própria folha quando não há nenhum —
    // sem isso o foco ficaria no botão que abriu, atrás do véu.
    const primeiro = alvo?.querySelector<HTMLElement>(FOCAVEIS);
    if (primeiro) primeiro.focus();
    else alvo?.focus();

    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") return aoFechar();
      if (e.key !== "Tab" || !alvo) return;

      // Sem a trava, o Tab sai da folha e passeia pela página atrás dela —
      // que está inerte para o mouse e continua alcançável pelo teclado.
      const itens = [...alvo.querySelectorAll<HTMLElement>(FOCAVEIS)].filter(
        (el) => el.offsetParent !== null,
      );
      if (!itens.length) return;
      const primeiro = itens[0];
      const ultimo = itens[itens.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    };

    window.addEventListener("keydown", aoTeclar);
    const rolagem = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = rolagem;
      anterior?.focus?.();
    };
  }, [aoFechar]);

  return (
    <div
      className="esmaecer fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
      style={{ background: "var(--veu)", backdropFilter: "blur(16px)" }}
      onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}
    >
      <div
        ref={caixa}
        role="dialog"
        aria-modal
        aria-labelledby={`${id}-titulo`}
        tabIndex={-1}
        className={`subir placa grao relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-b-none sm:rounded-b-[20px] ${LARGURA[largura]}`}
      >
        <div aria-hidden className="grao-camada" />

        {/* A alça. Não faz nada sozinha — diz "isto sai por baixo", que é a
            informação que o dedo precisa antes de tentar. */}
        <div aria-hidden className="relative pt-2.5 pb-1 sm:hidden">
          <span className="mx-auto block h-1 w-9 rounded-full bg-hairline-strong" />
        </div>

        <header className="relative flex items-start justify-between gap-4 px-5 pt-4 pb-3 sm:px-7 sm:pt-6">
          <div className="min-w-0">
            <h2
              id={`${id}-titulo`}
              className={tituloOculto ? "sr-only" : "texto-titulo text-ink"}
            >
              {titulo}
            </h2>
            {descricao && (
              <p className="texto-apoio mt-2 text-ink-secondary">{descricao}</p>
            )}
          </div>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="-mt-1 -mr-1.5 grid size-11 shrink-0 cursor-pointer place-items-center rounded-full text-ink-muted transition-colors duration-200 hover:bg-realce hover:text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-7">
          {children}
        </div>

        {rodape && (
          <div
            className="relative border-t border-hairline bg-card/60 px-5 pt-4 sm:px-7"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          >
            {rodape}
          </div>
        )}

        {!rodape && (
          <div
            aria-hidden
            className="relative sm:hidden"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          />
        )}
      </div>
    </div>
  );
}

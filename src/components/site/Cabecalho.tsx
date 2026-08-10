"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Logotipo } from "@/components/shell/Marca";

/**
 * A barra da página de apresentação.
 *
 * Fina, quase invisível no topo do herói, e ganhando fundo assim que a página
 * rola — o suficiente para o logotipo não brigar com o conteúdo e para o
 * caminho de entrada continuar à mão em qualquer altura da leitura.
 *
 * O rótulo do botão muda para quem já usou o Oblix neste navegador: "Começar"
 * é convite para quem chega, e vira ruído para quem já tem painel. A checagem
 * roda depois da montagem, e não no HTML — o servidor não tem como saber de
 * quem é o navegador, e adivinhar produziria uma troca de texto piscando na
 * cara de todo mundo.
 */

const CHAVE_CONTA = "oblix:conta:v1";

/**
 * Rolagem e `localStorage` são estado EXTERNO ao React, e é assim que se lê os
 * dois: com `useSyncExternalStore`. Um efeito que chama `setState` no corpo
 * para copiar valor de fora provoca um render em cascata a cada montagem — e
 * aqui o instantâneo do servidor ainda precisa ser diferente do cliente, que é
 * exatamente o caso que esta API existe para resolver.
 */
function assinarRolagem(aoMudar: () => void) {
  window.addEventListener("scroll", aoMudar, { passive: true });
  return () => window.removeEventListener("scroll", aoMudar);
}

/** Não muda durante a visita: quem entrou pelo site não cria conta sem sair daqui. */
const semMudanca = () => () => {};

function leuConta() {
  try {
    return localStorage.getItem(CHAVE_CONTA) !== null;
  } catch {
    return false; // navegação privada: trata como visitante novo
  }
}

export function Cabecalho() {
  const rolou = useSyncExternalStore(
    assinarRolagem,
    () => window.scrollY > 12,
    () => false,
  );
  const jaUsou = useSyncExternalStore(semMudanca, leuConta, () => false);

  return (
    <header
      className={`sticky top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300 ${
        rolou ? "border-b border-hairline bg-plane/80 backdrop-blur-xl" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-[76rem] items-center justify-between gap-4 px-4 py-3 sm:px-7 lg:px-10">
        <Link
          href="/"
          aria-label="Oblix — página inicial"
          className="-mx-2 flex min-h-[var(--toque)] items-center rounded-xl px-2 transition-colors duration-200 hover:bg-realce"
        >
          <Logotipo />
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Atalhos">
          <Link
            href="#produto"
            className="hidden min-h-[var(--toque)] items-center rounded-xl px-3.5 text-[13.5px] font-medium text-ink-secondary transition-colors duration-200 hover:bg-realce hover:text-ink sm:inline-flex"
          >
            O que faz
          </Link>
          <Link
            href="#treino"
            className="hidden min-h-[var(--toque)] items-center rounded-xl px-3.5 text-[13.5px] font-medium text-ink-secondary transition-colors duration-200 hover:bg-realce hover:text-ink sm:inline-flex"
          >
            Treino
          </Link>
          <Link
            href="/painel"
            className="inline-flex min-h-[var(--toque)] items-center rounded-xl bg-[var(--color-positivo)] px-4 text-[13.5px] font-semibold text-plane transition-[filter,transform] duration-200 hover:brightness-110 active:scale-[0.99]"
          >
            {jaUsou ? "Abrir meu painel" : "Começar"}
          </Link>
        </nav>
      </div>
    </header>
  );
}

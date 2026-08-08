"use client";

import { useSyncExternalStore } from "react";

/**
 * O tema do Oblix, em três estados e uma só fonte de verdade.
 *
 * A PREFERÊNCIA é o que o jogador escolheu: `sistema`, `claro` ou `escuro`.
 * O TEMA RESOLVIDO é o que a tela mostra: só `claro` ou `escuro`. A separação
 * importa porque "sistema" não é um visual — é uma regra que muda de resposta
 * quando o aparelho entra no modo noturno com o app aberto.
 *
 * Quem escreve no `<html>` é sempre esta camada, nunca o CSS. Resolver
 * `prefers-color-scheme` dentro de uma media query obrigaria a repetir a
 * paleta inteira em dois blocos, e duas listas de trinta cores divergem — é
 * questão de tempo. Aqui a resolução acontece uma vez, em JavaScript, e o CSS
 * tem um seletor só: `[data-tema="claro"]`.
 */

export type Preferencia = "sistema" | "claro" | "escuro";
export type TemaResolvido = "claro" | "escuro";

export const CHAVE_TEMA = "oblix:tema";

export const ROTULO_PREFERENCIA: Record<Preferencia, string> = {
  sistema: "Do sistema",
  claro: "Claro",
  escuro: "Escuro",
};

export const DESCRICAO_PREFERENCIA: Record<Preferencia, string> = {
  sistema: "Acompanha o modo noturno do aparelho",
  claro: "Sempre claro, mesmo à noite",
  escuro: "Sempre escuro — como o Oblix nasceu",
};

/**
 * O script que roda antes da primeira pintura.
 *
 * Vai inline no `<head>` porque é a única posição em que ele ganha do
 * navegador: qualquer coisa depois do primeiro byte de `<body>` significa uma
 * tela escura piscando para quem escolheu o claro. Mesmo motivo pelo qual ele
 * é uma string e não um módulo — precisa ser síncrono e sem rede.
 *
 * `try/catch` porque `localStorage` lança em navegação privada de algumas
 * versões do Safari, e um app que não abre por causa da cor é pior do que um
 * app que abre na cor errada.
 */
export const SCRIPT_TEMA = `(function(){try{
var p=localStorage.getItem(${JSON.stringify(CHAVE_TEMA)})||"sistema";
var e=p==="sistema"?(matchMedia("(prefers-color-scheme: light)").matches?"claro":"escuro"):p;
document.documentElement.dataset.tema=e;
var m=document.querySelector('meta[name="theme-color"]');
if(m)m.setAttribute("content",e==="claro"?"#f4f6f5":"#08090a");
}catch(_){document.documentElement.dataset.tema="escuro";}})();`;

// ── estado observável ──────────────────────────────────────────────────────

let preferencia: Preferencia = "sistema";
let resolvido: TemaResolvido = "escuro";
let iniciado = false;
const ouvintes = new Set<() => void>();

/** Um objeto estável por mudança: `useSyncExternalStore` compara identidade. */
let instantaneo: { preferencia: Preferencia; tema: TemaResolvido } = {
  preferencia,
  tema: resolvido,
};

function avisar() {
  instantaneo = { preferencia, tema: resolvido };
  for (const o of ouvintes) o();
}

const sistemaPrefereClaro = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: light)").matches;

function resolver(p: Preferencia): TemaResolvido {
  return p === "sistema" ? (sistemaPrefereClaro() ? "claro" : "escuro") : p;
}

function aplicar() {
  resolvido = resolver(preferencia);
  const raiz = document.documentElement;
  raiz.dataset.tema = resolvido;
  // A cor da barra do navegador no Android e da barra de status no iOS. Sem
  // isto o topo da tela continua obsidiana num app claro.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", resolvido === "claro" ? "#f4f6f5" : "#08090a");
  avisar();
}

function iniciar() {
  if (iniciado || typeof window === "undefined") return;
  iniciado = true;

  const guardado = localStorage.getItem(CHAVE_TEMA);
  if (guardado === "claro" || guardado === "escuro" || guardado === "sistema") {
    preferencia = guardado;
  }
  aplicar();

  // Só interessa enquanto a preferência for "sistema" — mas o ouvinte fica de
  // pé sempre, porque a pessoa pode voltar para "sistema" sem recarregar.
  window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
    if (preferencia === "sistema") aplicar();
  });

  // Liberado só agora: a transição de cor existe para a TROCA de tema, não
  // para a primeira pintura, onde ela apareceria como um flash animado.
  requestAnimationFrame(() => document.documentElement.setAttribute("data-tema-pronto", ""));
}

export function definirTema(p: Preferencia) {
  preferencia = p;
  try {
    localStorage.setItem(CHAVE_TEMA, p);
  } catch {
    // Sem persistência a escolha vale só para esta aba — melhor do que falhar.
  }
  aplicar();
}

function assinar(ouvinte: () => void) {
  iniciar();
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

const NO_SERVIDOR = { preferencia: "sistema" as Preferencia, tema: "escuro" as TemaResolvido };

export function useTema() {
  return useSyncExternalStore(assinar, () => instantaneo, () => NO_SERVIDOR);
}

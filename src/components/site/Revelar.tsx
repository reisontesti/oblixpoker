"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import { moeda, percentual } from "@/lib/format";

/**
 * Entrada por rolagem, para a página de apresentação.
 *
 * Diferente do `surgir` do produto, que dispara no carregamento: aqui o
 * conteúdo é longo e a maior parte nasce fora da tela. Animar tudo de uma vez
 * significaria animar para ninguém — e deixar tudo estático faria uma página
 * de duas mil pixels parecer um documento.
 *
 * Três cuidados que separam isto de "animação de landing page":
 *
 * · Dispara UMA vez. Elemento que reanima ao rolar de volta vira enjoo.
 * · O conteúdo já está no HTML e no fluxo — a animação mexe em opacidade e
 *   deslocamento, nunca em `display`. E o estado escondido depende da classe
 *   `com-js` na raiz: sem JavaScript ele nem chega a existir, então quem
 *   desliga scripts recebe a página inteira em vez de duas mil pixels em
 *   branco.
 * · `prefers-reduced-motion` já é respeitado globalmente, e aqui há uma
 *   segunda rede: sem `IntersectionObserver`, tudo nasce visível.
 */

interface Props {
  children: ReactNode;
  /** Escalona a entrada de uma fileira de cartões. */
  atraso?: number;
  className?: string;
  como?: ElementType;
}

export function Revelar({ children, atraso = 0, className = "", como: Como = "div" }: Props) {
  const alvo = useRef<HTMLElement>(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const el = alvo.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisivel(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada.isIntersecting) return;
        setVisivel(true);
        obs.disconnect();
      },
      // A margem negativa embaixo faz a animação começar quando o bloco já
      // entrou de verdade, e não no instante em que a primeira linha aparece.
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <Como
      ref={alvo}
      className={`transition-[opacity,transform] duration-[0.7s] ease-[var(--ease-out-quint)] ${
        visivel ? "" : "a-revelar"
      } ${className}`}
      style={{ transitionDelay: `${atraso}ms` }}
    >
      {children}
    </Como>
  );
}

/**
 * Número que conta até o valor quando entra na tela.
 *
 * Só para os números da vitrine. No produto, número que anima é número que
 * mente por um instante — e o painel existe justamente para não mentir.
 *
 * O formato chega como NOME, e não como função. Quem chama é um componente de
 * servidor, e função não atravessa essa fronteira — passar `formatar` direto
 * quebra a build com "Functions cannot be passed to Client Components". Um
 * nome atravessa; a função mora deste lado.
 */
const FORMATOS = {
  inteiro: (v: number) => String(Math.round(v)),
  percentual: (v: number) => percentual(v),
  moeda: (v: number) => moeda(v),
} as const;

export type FormatoDeNumero = keyof typeof FORMATOS;

export function NumeroQueConta({
  ate,
  formato,
  duracao = 1100,
  className = "",
}: {
  ate: number;
  formato: FormatoDeNumero;
  duracao?: number;
  className?: string;
}) {
  const alvo = useRef<HTMLSpanElement>(null);
  const [valor, setValor] = useState(0);

  useEffect(() => {
    const el = alvo.current;
    const reduzido =
      typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!el || reduzido || typeof IntersectionObserver === "undefined") {
      setValor(ate);
      return;
    }

    let quadro = 0;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const inicio = performance.now();
      const passo = (agora: number) => {
        const t = Math.min(1, (agora - inicio) / duracao);
        // Mesma curva do resto do produto: rápido no começo, pousando devagar.
        setValor(ate * (1 - (1 - t) ** 4));
        if (t < 1) quadro = requestAnimationFrame(passo);
      };
      quadro = requestAnimationFrame(passo);
    });
    obs.observe(el);
    return () => {
      obs.disconnect();
      cancelAnimationFrame(quadro);
    };
  }, [ate, duracao]);

  return (
    <span ref={alvo} className={`numeros-tabulares ${className}`}>
      {FORMATOS[formato](valor)}
    </span>
  );
}

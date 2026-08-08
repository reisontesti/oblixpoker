"use client";

import { useEffect, useRef, useState } from "react";

interface NumeroProps {
  valor: number;
  /** Recebe o valor corrente da contagem e devolve o texto exibido. */
  formatar: (v: number) => string;
  className?: string;
  duracao?: number;
  atraso?: number;
}

/**
 * Número que sobe até o valor final ao aparecer.
 *
 * O elemento nasce com opacidade 0 pela animação de entrada do CSS, e a
 * contagem roda dentro dessa mesma janela. Assim o servidor já entrega o
 * valor final no HTML — nada de divergência de hidratação, nada de piscar o
 * número certo antes de voltar para zero — e sem JavaScript o texto correto
 * continua lá.
 */
export function Numero({
  valor,
  formatar,
  className = "",
  duracao = 1100,
  atraso = 0,
}: NumeroProps) {
  const [corrente, setCorrente] = useState(valor);
  const [alvoAnterior, setAlvoAnterior] = useState(valor);
  const quadro = useRef<number>(0);

  // Ajuste durante a renderização, e não dentro de um efeito: quando o
  // período muda e um novo valor chega, o número correto já sai no primeiro
  // quadro. Fazer isso num efeito pintaria o valor velho antes de corrigir.
  if (alvoAnterior !== valor) {
    setAlvoAnterior(valor);
    setCorrente(valor);
  }

  useEffect(() => {
    const semMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (semMovimento) return;

    const inicio = performance.now() + atraso;
    const passo = (agora: number) => {
      const decorrido = agora - inicio;
      if (decorrido < 0) {
        quadro.current = requestAnimationFrame(passo);
        return;
      }
      const p = Math.min(1, decorrido / duracao);
      // easeOutQuint: chega rápido e assenta devagar — a sensação de precisão.
      const eased = 1 - Math.pow(1 - p, 5);
      setCorrente(valor * eased);
      if (p < 1) quadro.current = requestAnimationFrame(passo);
      else setCorrente(valor);
    };

    quadro.current = requestAnimationFrame(passo);

    // Rede de segurança: requestAnimationFrame para de ser chamado quando a
    // aba vai para segundo plano, e a contagem congelaria num valor
    // intermediário — um número errado exibido como se fosse o real. Este
    // temporizador garante o valor final mesmo que os quadros nunca cheguem.
    const travar = setTimeout(() => {
      cancelAnimationFrame(quadro.current);
      setCorrente(valor);
    }, atraso + duracao + 120);

    return () => {
      cancelAnimationFrame(quadro.current);
      clearTimeout(travar);
    };
  }, [valor, duracao, atraso]);

  return <span className={className}>{formatar(corrente)}</span>;
}

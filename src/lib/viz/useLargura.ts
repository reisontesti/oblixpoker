"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * Largura real do contêiner, para o SVG ser desenhado em pixels verdadeiros.
 * Esticar um viewBox com preserveAspectRatio="none" seria mais simples e
 * deformaria todo texto e toda espessura de traço junto.
 *
 * A medição roda em useLayoutEffect, antes da pintura: com useEffect o
 * gráfico aparecia por um quadro na largura padrão e só depois pulava para a
 * largura real — visível como um salto, e capturável por qualquer screenshot
 * tirado nesse intervalo.
 */
export function useLargura<T extends HTMLElement>(inicial = 720) {
  const ref = useRef<T>(null);
  const [largura, setLargura] = useState(inicial);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const medir = (w: number) => {
      if (w > 0) setLargura((atual) => (Math.abs(atual - w) > 0.5 ? w : atual));
    };

    medir(el.getBoundingClientRect().width);

    const observador = new ResizeObserver(([entrada]) => medir(entrada.contentRect.width));
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  return { ref, largura };
}

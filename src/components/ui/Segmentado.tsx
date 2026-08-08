"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Opcao<T extends string> {
  valor: T;
  rotulo: string;
}

interface SegmentadoProps<T extends string> {
  opcoes: Opcao<T>[];
  valor: T;
  aoMudar: (v: T) => void;
  rotuloAcessivel: string;
  className?: string;
}

/**
 * Seletor segmentado. O indicador é um bloco que desliza atrás do rótulo —
 * um estado só, movendo-se, em vez de dois piscando.
 *
 * Três correções de celular moram aqui.
 *
 * **Altura.** Os botões tinham 31px. Um filtro que é a primeira coisa que se
 * toca numa tela de lista não pode ter alvo menor que o dedo.
 *
 * **O que fazer quando não cabe.** Cinco opções a 320px estouram a linha, e a
 * saída anterior — deixar transbordar — empurrava a página inteira para o
 * lado. Agora a fila rola por dentro de si mesma e traz a opção ativa à vista.
 *
 * **O indicador é MEDIDO, não calculado por fração.** `left: i/n%` só acerta
 * quando todos os segmentos têm a mesma largura e nada rola; com "Premiados"
 * ao lado de "Meus", dentro de uma faixa rolável, o bloco parava a meio
 * caminho do rótulo que deveria marcar.
 */
export function Segmentado<T extends string>({
  opcoes,
  valor,
  aoMudar,
  rotuloAcessivel,
  className = "",
}: SegmentadoProps<T>) {
  const caixa = useRef<HTMLDivElement>(null);
  const [marca, setMarca] = useState<{ left: number; width: number } | null>(null);

  const medir = useCallback(() => {
    const ativo = caixa.current?.querySelector<HTMLElement>('[aria-checked="true"]');
    if (!ativo) return;
    setMarca({ left: ativo.offsetLeft, width: ativo.offsetWidth });
    ativo.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, []);

  useEffect(() => {
    medir();
    // As larguras mudam quando a fonte carrega e quando a tela gira; sem o
    // observador o bloco fica onde estava na primeira medição.
    const obs = new ResizeObserver(medir);
    if (caixa.current) obs.observe(caixa.current);
    return () => obs.disconnect();
  }, [medir, valor, opcoes]);

  return (
    <div
      ref={caixa}
      role="radiogroup"
      aria-label={rotuloAcessivel}
      className={`fila-rolavel relative max-w-full rounded-full border border-hairline bg-sunken p-1 ${className}`}
    >
      {marca && (
        <div
          aria-hidden
          className="absolute top-1 bottom-1 rounded-full bg-raised ring-1 ring-hairline-strong transition-[left,width] duration-400 ease-[var(--ease-out-quint)]"
          style={{ left: marca.left, width: marca.width }}
        />
      )}
      {opcoes.map((o) => {
        const ativo = o.valor === valor;
        return (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={ativo}
            onClick={() => aoMudar(o.valor)}
            className={`relative z-10 min-h-[40px] flex-1 cursor-pointer rounded-full px-4 text-[13px] font-medium whitespace-nowrap transition-colors duration-200 ${
              ativo ? "text-ink" : "text-ink-muted hover:text-ink-secondary"
            }`}
          >
            {o.rotulo}
          </button>
        );
      })}
    </div>
  );
}

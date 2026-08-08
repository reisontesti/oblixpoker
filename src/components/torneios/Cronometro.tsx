"use client";

import { useEffect, useState } from "react";

/**
 * O relógio da sessão.
 *
 * Conta a partir do instante gravado, e não somando segundos num intervalo —
 * o navegador congela `setInterval` quando a aba vai para segundo plano, e o
 * Oblix passa a maior parte do torneio exatamente assim, no bolso de alguém.
 * Recalcular a diferença a cada tique faz o número estar certo mesmo depois de
 * quatro horas de tela apagada.
 */
export function Cronometro({ desde, ate }: { desde: string; ate?: string | null }) {
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    if (ate) return;
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [ate]);

  const fim = ate ? new Date(ate).getTime() : agora;
  const segundos = Math.max(0, Math.floor((fim - new Date(desde).getTime()) / 1000));
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;

  return (
    <span
      className="numeros-tabulares tracking-[-0.02em]"
      role="timer"
      aria-label={`${h} horas e ${m} minutos de torneio`}
    >
      {h > 0 && `${h}:`}
      {String(m).padStart(h > 0 ? 2 : 1, "0")}:{String(s).padStart(2, "0")}
    </span>
  );
}

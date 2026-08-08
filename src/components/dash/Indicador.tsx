"use client";

import type { ReactNode } from "react";
import { Delta } from "@/components/ui/Delta";
import { Numero } from "@/components/ui/Numero";
import { Faisca } from "@/components/viz/Faisca";

interface Props {
  rotulo: string;
  valor: number;
  formatar: (v: number) => string;
  /** Sufixo fixo ao lado do número — "/ 20", "/ 10". Não entra na contagem. */
  sufixo?: string;
  delta?: { texto: string; direcao: "alta" | "baixa" | "estavel"; base: string };
  faisca?: { valores: number[]; descricao: string };
  medidor?: number;
  nota?: string;
  atraso?: number;
  rodape?: ReactNode;
}

export function Indicador({
  rotulo,
  valor,
  formatar,
  sufixo,
  delta,
  faisca,
  medidor,
  nota,
  atraso = 0,
  rodape,
}: Props) {
  return (
    <article
      className="placa surgir grao group relative overflow-hidden p-5 transition-transform duration-500 ease-[var(--ease-out-quint)] hover:-translate-y-0.5 sm:p-6"
      style={{ animationDelay: `${atraso}ms` }}
    >
      <div aria-hidden className="grao-camada rounded-[20px]" />
      <div className="relative">
        <h3 className="rotulo">{rotulo}</h3>

        <p className="mt-3.5 flex items-baseline gap-1.5">
          <Numero
            valor={valor}
            formatar={formatar}
            atraso={atraso}
            className="text-[34px] leading-none font-semibold tracking-[-0.028em] text-ink sm:text-[38px]"
          />
          {sufixo && (
            <span className="text-[17px] leading-none font-medium text-ink-faint">{sufixo}</span>
          )}
        </p>

        {delta && (
          <Delta texto={delta.texto} direcao={delta.direcao} base={delta.base} className="mt-2.5" />
        )}
        {!delta && nota && <p className="mt-2.5 text-[13px] text-ink-muted">{nota}</p>}

        {medidor !== undefined && (
          <div className="mt-4">
            <div className="h-1 overflow-hidden rounded-full bg-trilho">
              <div
                className="h-full rounded-full bg-[var(--color-positivo)] transition-[width] duration-[1.2s] ease-[var(--ease-out-quint)]"
                style={{ width: `${Math.min(100, medidor * 100)}%` }}
              />
            </div>
            {delta && nota && <p className="mt-2 text-[12px] text-ink-muted">{nota}</p>}
          </div>
        )}

        {faisca && (
          <div className="mt-4 opacity-80 transition-opacity duration-300 group-hover:opacity-100">
            <Faisca valores={faisca.valores} descricao={faisca.descricao} />
          </div>
        )}

        {rodape}
      </div>
    </article>
  );
}

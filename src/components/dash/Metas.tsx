"use client";

import { CabecalhoPlaca, Placa } from "@/components/ui/Placa";
import type { EstadoMeta, MetaCalculada } from "@/lib/painel";

const ESTADO: Record<EstadoMeta, { rotulo: string; cor: string; icone: string }> = {
  concluida: { rotulo: "Concluída", cor: "var(--color-positivo)", icone: "✓" },
  no_ritmo: { rotulo: "No ritmo", cor: "var(--color-positivo)", icone: "→" },
  atencao: { rotulo: "Atrás do ritmo", cor: "var(--color-atencao)", icone: "!" },
  // Quem ainda não registrou nada não está atrasado — não começou. Acusar
  // atraso em âmbar no primeiro minuto de uso é o produto repreendendo alguém
  // por não ter jogado ainda, e o âmbar perde o significado quando é o estado
  // padrão de todo mundo.
  nao_comecou: { rotulo: "A começar", cor: "var(--color-ink-muted)", icone: "·" },
};

export function Metas({ metas, atraso = 0 }: { metas: MetaCalculada[]; atraso?: number }) {
  const concluidas = metas.filter((m) => m.estado === "concluida").length;

  return (
    <Placa atraso={atraso}>
      <CabecalhoPlaca
        titulo="Metas do ano"
        descricao={
          concluidas
            ? `${concluidas} de ${metas.length} já conquistadas`
            : "O progresso que não aparece no extrato"
        }
      />
      <ul className="px-6 pb-6 sm:px-7">
        {metas.map((meta) => {
          const estado = ESTADO[meta.estado];
          return (
            <li key={meta.id} className="border-t border-hairline py-4 first:border-t-0 first:pt-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-medium text-ink">
                    {meta.titulo}
                  </span>
                  <span className="block truncate text-[11.5px] text-ink-muted">
                    {meta.detalhe}
                  </span>
                </span>
                <span className="numeros-tabulares shrink-0 text-[13px] text-ink-secondary">
                  <span className="font-semibold text-ink">{meta.formatar(meta.atual)}</span>
                  <span className="text-ink-faint"> / {meta.formatar(meta.alvo)}</span>
                </span>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/7">
                  <div
                    className="h-full rounded-full transition-[width] duration-[1.4s] ease-[var(--ease-out-quint)]"
                    style={{ width: `${meta.progresso * 100}%`, background: estado.cor }}
                  />
                </div>
                <span
                  className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium"
                  style={{ color: estado.cor }}
                >
                  <span aria-hidden className="text-[9px]">
                    {estado.icone}
                  </span>
                  {estado.rotulo}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </Placa>
  );
}

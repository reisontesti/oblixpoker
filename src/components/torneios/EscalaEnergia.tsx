"use client";

import { NIVEIS_ENERGIA, ROTULO_ENERGIA, type NivelEnergia } from "@/lib/types";
import { RAMPA_ENERGIA } from "@/lib/viz/palette";

interface Props {
  valor: NivelEnergia;
  aoMudar: (v: NivelEnergia) => void;
}

/**
 * "Como você chegou para jogar?" — a pergunta que liga o satélite ao
 * resultado.
 *
 * A escala é ordinal, então a cor é uma matiz só clareando com a disposição,
 * nunca cores diferentes por nível: matizes distintas sugeririam categorias
 * independentes em vez de uma régua. A altura da barra repete a mesma ordem,
 * para a informação não depender da cor.
 */
export function EscalaEnergia({ valor, aoMudar }: Props) {
  return (
    <fieldset>
      <legend className="text-[12.5px] font-medium text-ink-secondary">
        Como você chegou para jogar?
      </legend>
      <p className="mt-0.5 text-[12px] text-ink-muted">
        É com isso que o Oblix descobre se jogar o satélite antes derruba sua
        performance no principal.
      </p>

      <div className="mt-3 grid grid-cols-5 gap-1.5" role="radiogroup">
        {NIVEIS_ENERGIA.map((nivel, i) => {
          const ativo = nivel === valor;
          const cor = RAMPA_ENERGIA[i];
          return (
            <button
              key={nivel}
              type="button"
              role="radio"
              aria-checked={ativo}
              onClick={() => aoMudar(nivel)}
              className={`group cursor-pointer rounded-xl border px-1.5 pt-3 pb-2 transition-all duration-200 ${
                ativo
                  ? "border-transparent bg-raised ring-1 ring-[var(--color-positivo)]"
                  : "border-hairline bg-sunken hover:border-hairline-strong"
              }`}
            >
              <span className="flex h-9 items-end justify-center">
                <span
                  className="w-full rounded-[3px] transition-all duration-300"
                  style={{
                    height: `${30 + i * 17.5}%`,
                    background: cor,
                    opacity: ativo ? 1 : 0.42,
                  }}
                />
              </span>
              <span
                className={`mt-2 block text-center text-[12px] leading-tight ${
                  ativo ? "font-medium text-ink" : "text-ink-muted"
                }`}
              >
                {ROTULO_ENERGIA[nivel]}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

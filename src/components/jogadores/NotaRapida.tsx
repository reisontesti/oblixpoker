"use client";

import { useState } from "react";
import { adicionarNota } from "@/lib/data/repositorio";
import { ROTULO_NOTA } from "@/lib/jogadores";
import type { TipoNota } from "@/lib/types";

const TIPOS: TipoNota[] = ["leitura", "tell", "exploracao", "geral"];

/**
 * Captura de observação em duas toques: escolher o tipo e escrever.
 *
 * A fricção aqui é o que decide se o CRM tem valor. No meio de um torneio,
 * qualquer coisa mais longa que isso não é preenchida — e um banco de
 * adversários vazio não ajuda ninguém.
 */
export function NotaRapida({
  idJogador,
  aoSalvar,
}: {
  idJogador: string;
  aoSalvar?: () => void;
}) {
  const [tipo, setTipo] = useState<TipoNota>("leitura");
  const [texto, setTexto] = useState("");

  function salvar() {
    if (!texto.trim()) return;
    adicionarNota(idJogador, tipo, texto);
    setTexto("");
    aoSalvar?.();
  }

  return (
    <div className="surgir rounded-xl border border-hairline bg-sunken p-3">
      <div className="flex flex-wrap gap-1.5">
        {TIPOS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTipo(t)}
            aria-pressed={t === tipo}
            className={`cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors duration-200 ${
              t === tipo
                ? "bg-raised text-ink ring-1 ring-[var(--color-positivo)]"
                : "text-ink-muted hover:text-ink-secondary"
            }`}
          >
            {ROTULO_NOTA[t]}
          </button>
        ))}
      </div>

      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          // Enter salva; Shift+Enter quebra linha. Numa mão em andamento,
          // procurar o botão custa tempo que não existe.
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            salvar();
          }
        }}
        rows={2}
        placeholder="Foldou BB três vezes seguidas para open pequeno."
        aria-label="Texto da observação"
        className="mt-2.5 w-full resize-y rounded-lg border border-hairline bg-plane px-3 py-2 text-[13px] leading-relaxed text-ink placeholder:text-ink-faint focus:border-[var(--color-positivo)] focus:outline-none"
      />

      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-[10.5px] text-ink-faint">Enter salva · Shift+Enter quebra linha</span>
        <button
          type="button"
          onClick={salvar}
          disabled={!texto.trim()}
          className="cursor-pointer rounded-lg bg-[var(--color-positivo)] px-3.5 py-1.5 text-[12.5px] font-semibold text-plane transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
        >
          Anotar
        </button>
      </div>
    </div>
  );
}

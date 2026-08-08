"use client";

import { useState } from "react";
import { Segmentado } from "@/components/ui/Segmentado";
import { PERIODOS, type PeriodoChave, type PeriodoManual } from "@/lib/calc/metricas";
import { dataMedia } from "@/lib/format";

/**
 * O recorte de tempo do painel inteiro.
 *
 * O intervalo manual fica atrás de um botão, e não como uma sexta pastilha na
 * régua: ele não é "mais um período", é uma pergunta com dois campos. Misturá-lo
 * com as opções de um toque faria a linha inteira parecer mais cara de usar do
 * que é.
 */
interface Props {
  valor: PeriodoChave;
  manual: PeriodoManual | null;
  aoMudar: (chave: PeriodoChave, manual: PeriodoManual | null) => void;
  /** Dia de hoje, `AAAA-MM-DD` — teto dos campos de data. */
  hoje: string;
}

export function SeletorPeriodo({ valor, manual, aoMudar, hoje }: Props) {
  const [abrindo, setAbrindo] = useState(false);
  const [de, setDe] = useState(manual?.de ?? "");
  const [ate, setAte] = useState(manual?.ate ?? hoje);

  const invalido = de !== "" && ate !== "" && de > ate;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Segmentado
        rotuloAcessivel="Período de análise"
        valor={valor === "manual" ? "manual" : valor}
        aoMudar={(v) => {
          setAbrindo(false);
          aoMudar(v as PeriodoChave, null);
        }}
        opcoes={PERIODOS.map((p) => ({ valor: p.chave, rotulo: p.rotulo }))}
      />

      <div className="relative">
        <button
          type="button"
          onClick={() => setAbrindo((a) => !a)}
          aria-expanded={abrindo}
          className={`cursor-pointer rounded-xl border px-3 py-1.5 text-[12.5px] font-medium transition-colors duration-200 ${
            valor === "manual"
              ? "border-transparent bg-raised text-ink ring-1 ring-[var(--color-positivo)]"
              : "border-hairline text-ink-secondary hover:border-hairline-strong hover:text-ink"
          }`}
        >
          {valor === "manual" && manual
            ? `${dataMedia(manual.de)} – ${dataMedia(manual.ate)}`
            : "Escolher datas"}
        </button>

        {abrindo && (
          <div className="placa surgir absolute right-0 z-30 mt-2 w-[19rem] p-4">
            <p className="text-[12.5px] font-medium text-ink">Intervalo personalizado</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-ink-muted">
              A comparação usa o período anterior de mesmo tamanho, para a seta ao lado de cada
              número continuar significando alguma coisa.
            </p>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="flex flex-col">
                <span className="text-[11.5px] text-ink-secondary">De</span>
                <input
                  type="date"
                  value={de}
                  max={hoje}
                  onChange={(e) => setDe(e.target.value)}
                  className="mt-1 rounded-lg border border-hairline bg-sunken px-2.5 py-1.5 text-[12.5px] text-ink focus:border-[var(--color-positivo)] focus:outline-none"
                />
              </label>
              <label className="flex flex-col">
                <span className="text-[11.5px] text-ink-secondary">Até</span>
                <input
                  type="date"
                  value={ate}
                  max={hoje}
                  onChange={(e) => setAte(e.target.value)}
                  className="mt-1 rounded-lg border border-hairline bg-sunken px-2.5 py-1.5 text-[12.5px] text-ink focus:border-[var(--color-positivo)] focus:outline-none"
                />
              </label>
            </div>

            {invalido && (
              <p role="alert" className="mt-2 text-[11.5px]" style={{ color: "var(--color-negativo)" }}>
                A data inicial precisa vir antes da final.
              </p>
            )}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={!de || !ate || invalido}
                onClick={() => {
                  aoMudar("manual", { de, ate });
                  setAbrindo(false);
                }}
                className="flex-1 cursor-pointer rounded-lg bg-[var(--color-positivo)] px-3 py-2 text-[12.5px] font-semibold text-plane transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
              >
                Aplicar
              </button>
              <button
                type="button"
                onClick={() => setAbrindo(false)}
                className="cursor-pointer rounded-lg border border-hairline px-3 py-2 text-[12.5px] text-ink-secondary transition-colors duration-200 hover:text-ink"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

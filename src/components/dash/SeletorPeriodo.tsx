"use client";

import { useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { Folha } from "@/components/ui/Folha";
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
 *
 * A pergunta abre numa FOLHA, e não num pop-up ancorado. O pop-up trazia dois
 * problemas que só apareciam no celular: 19rem de largura não cabem numa tela
 * de 320px, e ele disputava empilhamento com os cartões animados abaixo — que
 * usam `transform` e portanto criam contexto próprio. A folha não tem âncora,
 * não tem z-index para negociar, e põe os dois campos de data onde o polegar
 * alcança.
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
    <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
      <Segmentado
        className="min-w-0 flex-1 sm:flex-none"
        rotuloAcessivel="Período de análise"
        valor={valor === "manual" ? "manual" : valor}
        aoMudar={(v) => aoMudar(v as PeriodoChave, null)}
        opcoes={PERIODOS.map((p) => ({ valor: p.chave, rotulo: p.rotulo }))}
      />

      <button
        type="button"
        onClick={() => setAbrindo(true)}
        aria-label={
          valor === "manual" && manual
            ? `Intervalo de ${dataMedia(manual.de)} a ${dataMedia(manual.ate)}. Trocar.`
            : "Escolher um intervalo de datas"
        }
        className={`grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl border transition-colors duration-200 ${
          valor === "manual"
            ? "border-transparent bg-raised text-ink ring-1 ring-[var(--color-positivo)]"
            : "border-hairline text-ink-secondary hover:border-hairline-strong hover:text-ink"
        }`}
      >
        <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden>
          <rect
            x="3"
            y="4.5"
            width="14"
            height="12"
            rx="2.5"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M3 8.5h14M7 2.8v3M13 2.8v3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {abrindo && (
        <Folha
          titulo="Intervalo personalizado"
          descricao="A comparação usa o período anterior de mesmo tamanho, para a seta ao lado de cada número continuar significando alguma coisa."
          largura="estreita"
          aoFechar={() => setAbrindo(false)}
          rodape={
            <div className="flex gap-2">
              <Botao tom="discreto" aoClicar={() => setAbrindo(false)}>
                Cancelar
              </Botao>
              <Botao
                tom="primario"
                largo
                desabilitado={!de || !ate || invalido}
                aoClicar={() => {
                  aoMudar("manual", { de, ate });
                  setAbrindo(false);
                }}
              >
                Aplicar
              </Botao>
            </div>
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <CampoData rotulo="De" valor={de} max={hoje} aoMudar={setDe} />
            <CampoData rotulo="Até" valor={ate} max={hoje} aoMudar={setAte} />
          </div>

          {invalido && (
            <p role="alert" className="mt-3 text-[12.5px]" style={{ color: "var(--color-negativo)" }}>
              A data inicial precisa vir antes da final.
            </p>
          )}
        </Folha>
      )}
    </div>
  );
}

function CampoData({
  rotulo,
  valor,
  max,
  aoMudar,
}: {
  rotulo: string;
  valor: string;
  max: string;
  aoMudar: (v: string) => void;
}) {
  return (
    <label className="flex flex-col">
      <span className="text-[12.5px] font-medium text-ink-secondary">{rotulo}</span>
      <input
        type="date"
        value={valor}
        max={max}
        onChange={(e) => aoMudar(e.target.value)}
        className="mt-2 min-h-[var(--toque)] rounded-xl border border-hairline bg-sunken px-3 text-[16px] text-ink transition-colors duration-200 focus:border-[var(--color-positivo)] focus:outline-none sm:text-[14px]"
      />
    </label>
  );
}

"use client";

import { CabecalhoPlaca, Placa } from "@/components/ui/Placa";
import { Vazio } from "@/components/ui/Vazio";
import { TabelaDados } from "@/components/viz/TabelaDados";
import type { LinhaSaude } from "@/lib/types";
import { decimal } from "@/lib/format";

const ESTADO = {
  dentro: { rotulo: "Na faixa", cor: "var(--color-positivo)", icone: "✓" },
  acima: { rotulo: "Acima", cor: "var(--color-atencao)", icone: "▲" },
  abaixo: { rotulo: "Abaixo", cor: "var(--color-atencao)", icone: "▼" },
} as const;

/**
 * Um trilho por indicador, com a faixa saudável marcada e o valor atual como
 * ponto. O leitor vê de um golpe se está dentro, de que lado saiu e quanto
 * andou desde a amostra anterior — três informações sem três gráficos.
 */
function Trilho({ linha }: { linha: LinhaSaude }) {
  const teto = Math.max(linha.valor, linha.anterior, linha.max) * 1.28;
  const pct = (v: number) => `${Math.max(0, Math.min(100, (v / teto) * 100))}%`;
  const estado = ESTADO[linha.estado];

  return (
    <li className="py-3.5 first:pt-0 last:pb-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex min-w-0 items-baseline gap-2.5">
          <span className="text-[13.5px] font-medium text-ink">{linha.rotulo}</span>
          <span className="truncate text-[11.5px] text-ink-muted">{linha.descricao}</span>
        </span>
        <span className="flex shrink-0 items-baseline gap-2.5">
          <span className="numeros-tabulares text-[14px] font-semibold text-ink">
            {decimal(linha.valor, 1)}%
          </span>
          <span
            className="inline-flex items-center gap-1 text-[11px] font-medium"
            style={{ color: estado.cor }}
          >
            <span aria-hidden className="text-[8px]">
              {estado.icone}
            </span>
            {estado.rotulo}
          </span>
        </span>
      </div>

      <div className="relative mt-2.5 h-6">
        <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-white/6" />
        {/* Faixa alvo */}
        <div
          className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full"
          style={{
            left: pct(linha.min),
            width: `calc(${pct(linha.max)} - ${pct(linha.min)})`,
            background: "color-mix(in oklab, var(--color-positivo) 45%, transparent)",
          }}
        />
        {/* Amostra anterior, como referência apagada */}
        <div
          className="absolute top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-white/22"
          style={{ left: pct(linha.anterior) }}
          aria-hidden
        />
        {/* Valor atual: anel na cor da superfície para não sumir sobre a faixa */}
        <div
          className="absolute top-1/2 size-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-[var(--color-card)]"
          style={{ left: pct(linha.valor), background: estado.cor }}
          aria-hidden
        />
      </div>
    </li>
  );
}

export function SaudeTecnica({ saude, atraso = 0 }: { saude: LinhaSaude[]; atraso?: number }) {
  const dentro = saude.filter((s) => s.estado === "dentro").length;

  // VPIP, PFR e 3bet vêm de histórico de mãos, que o Oblix ainda não importa.
  // Preencher com estimativa seria atribuir ao jogador um estilo que ninguém
  // mediu — e este cartão é justamente o que ele consultaria para se corrigir.
  if (saude.length === 0) {
    return (
      <Placa atraso={atraso}>
        <CabecalhoPlaca
          titulo="Saúde técnica"
          descricao="VPIP, PFR, 3bet e agressão pós-flop"
        />
        <Vazio
          titulo="Estes números vêm do histórico de mãos"
          corpo="O Oblix ainda não importa histórico da sala, e prefere deixar o espaço em branco a estimar o seu estilo de jogo por aproximação. O resto do painel funciona sem eles."
        />
      </Placa>
    );
  }

  return (
    <Placa atraso={atraso}>
      <CabecalhoPlaca
        titulo="Saúde técnica"
        descricao={`${dentro} de ${saude.length} indicadores dentro da faixa saudável para o seu estilo`}
      />
      <div className="px-6 pb-5 sm:px-7">
        <ul className="divide-y divide-hairline">
          {saude.map((linha) => (
            <Trilho key={linha.chave} linha={linha} />
          ))}
        </ul>

        <div className="mt-4 flex items-center gap-4 border-t border-hairline pt-3.5 text-[11px] text-ink-muted">
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-[3px] w-4 rounded-full"
              style={{ background: "color-mix(in oklab, var(--color-positivo) 45%, transparent)" }}
            />
            faixa alvo
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-3 w-px bg-white/22" />
            trimestre anterior
          </span>
        </div>

        <TabelaDados
          legenda="Indicadores técnicos, valor atual, amostra anterior e faixa alvo"
          linhas={saude}
          chaveDe={(l) => l.chave}
          alturaMax="none"
          colunas={[
            { chave: "ind", rotulo: "Indicador", render: (l) => l.rotulo },
            {
              chave: "atual",
              rotulo: "Atual",
              numerica: true,
              render: (l) => `${decimal(l.valor, 1)}%`,
            },
            {
              chave: "ant",
              rotulo: "Anterior",
              numerica: true,
              render: (l) => `${decimal(l.anterior, 1)}%`,
            },
            {
              chave: "faixa",
              rotulo: "Faixa alvo",
              numerica: true,
              render: (l) => `${l.min}–${l.max}%`,
            },
            { chave: "estado", rotulo: "Estado", render: (l) => ESTADO[l.estado].rotulo },
          ]}
        />
      </div>
    </Placa>
  );
}

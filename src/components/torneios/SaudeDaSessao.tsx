"use client";

import { useState } from "react";
import { CampoNumero, CampoTexto } from "@/components/ui/Campo";
import { METAS_TECNICAS } from "@/lib/data/seed";
import { haQuantoTempo } from "@/lib/format";
import type { EntradaMedicao } from "@/lib/data/repositorio";
import type { MedicaoTecnica, SaudeTecnica } from "@/lib/types";

/**
 * Os números técnicos, informados na hora de registrar o torneio.
 *
 * O Oblix não importa histórico de mãos, então quem digita é o jogador — e o
 * momento certo é este, porque é quando ele já está com a sala aberta e
 * pensando na sessão. A cadência sai do próprio uso: quem joga todo dia atualiza
 * quase sempre, quem joga uma vez por mês atualiza uma vez por mês.
 *
 * Duas escolhas evitam que isso vire pedágio:
 *
 * **Vem fechado e é opcional.** O torneio se registra sem tocar aqui, e o passo
 * não bloqueia nada. Um campo obrigatório que a pessoa não tem como responder
 * na hora — porque não abriu o tracker — faria ela inventar número, que é
 * pior do que não ter.
 *
 * **Já vem preenchido com a última medição.** Na maioria das vezes os números
 * mal se moveram, então confirmar é um clique. É o que torna razoável oferecer
 * isso a cada torneio em vez de uma vez por mês.
 */
interface Props {
  ultima: MedicaoTecnica | null;
  hoje: Date;
  valor: EntradaMedicao | null;
  aoMudar: (v: EntradaMedicao | null) => void;
}

const VAZIA: SaudeTecnica = { vpip: 0, pfr: 0, tresBet: 0, cbet: 0, wtsd: 0, wsd: 0 };

export function SaudeDaSessao({ ultima, hoje, valor, aoMudar }: Props) {
  const [aberto, setAberto] = useState(false);

  const partida: EntradaMedicao = {
    ...(ultima ? { ...VAZIA, ...extrair(ultima) } : VAZIA),
    origem: ultima?.origem ?? "",
    maos: null,
  };
  const atual = valor ?? partida;

  const definir = <K extends keyof EntradaMedicao>(chave: K, v: EntradaMedicao[K]) =>
    aoMudar({ ...atual, [chave]: v });

  // PFR é subconjunto de VPIP: não se aumenta sem pagar para ver. Números
  // trocados de lugar na digitação são o erro mais provável aqui, e passariam
  // despercebidos num painel de tendência.
  const erroPfr =
    valor && valor.pfr > valor.vpip ? "PFR não pode passar do VPIP" : undefined;

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="w-full cursor-pointer rounded-2xl border border-dashed border-hairline-strong px-5 py-4 text-left transition-colors duration-200 hover:border-[var(--color-positivo)]/50 hover:bg-white/[0.02]"
      >
        <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="text-[13.5px] font-medium text-ink">
            Atualizar meus números técnicos
          </span>
          <span className="text-[12px] text-[var(--color-positivo)]">Opcional +</span>
        </span>
        <span className="mt-1 block text-[12px] leading-relaxed text-ink-secondary">
          {ultima
            ? `VPIP, PFR e companhia — a última medição é de ${haQuantoTempo(ultima.data, hoje)}.`
            : "VPIP, PFR e companhia, copiados do seu tracker ou da sala. É o que preenche o cartão de saúde técnica no painel."}
        </span>
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-hairline bg-sunken p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-[13.5px] font-medium text-ink">Números técnicos</h3>
        <button
          type="button"
          onClick={() => {
            setAberto(false);
            aoMudar(null);
          }}
          className="cursor-pointer text-[12px] text-ink-muted transition-colors duration-200 hover:text-ink"
        >
          Agora não
        </button>
      </div>
      <p className="mt-1 text-[12px] leading-relaxed text-ink-secondary">
        {ultima
          ? `Já preenchidos com a medição de ${haQuantoTempo(ultima.data, hoje)}. Ajuste só o que mudou.`
          : "Copie do seu tracker ou do relatório da sala. Todos em porcentagem."}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {METAS_TECNICAS.map((m) => (
          <CampoNumero
            key={m.chave}
            rotulo={m.rotulo}
            dica={`Faixa ${m.min}–${m.max}%`}
            valor={atual[m.chave]}
            aoMudar={(v) => definir(m.chave, v ?? 0)}
            sufixo="%"
            min={0}
            max={100}
            passo={0.1}
            erro={m.chave === "pfr" ? erroPfr : undefined}
          />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CampoTexto
          rotulo="De onde vieram"
          dica="Para não misturar amostras de salas diferentes"
          valor={atual.origem}
          aoMudar={(v) => definir("origem", v)}
          placeholder="PokerCraft, Hand2Note, a própria sala…"
        />
        <CampoNumero
          rotulo="Mãos na amostra"
          dica="Opcional — ajuda a saber o quanto confiar"
          valor={atual.maos}
          aoMudar={(v) => definir("maos", v)}
          min={0}
          placeholder="20.000"
        />
      </div>
    </div>
  );
}

const extrair = (m: MedicaoTecnica): SaudeTecnica => ({
  vpip: m.vpip,
  pfr: m.pfr,
  tresBet: m.tresBet,
  cbet: m.cbet,
  wtsd: m.wtsd,
  wsd: m.wsd,
});

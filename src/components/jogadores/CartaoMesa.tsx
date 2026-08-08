"use client";

import { useState } from "react";
import { NotaRapida } from "@/components/jogadores/NotaRapida";
import { SeloPerfil } from "@/components/jogadores/SeloPerfil";
import { alternarNaMesa } from "@/lib/data/repositorio";
import { haQuantoTempo, moedaComSinal } from "@/lib/format";
import { frescor, PERFIL_META, ROTULO_NOTA } from "@/lib/jogadores";
import { useRegistros } from "@/lib/painel";
import type { Jogador } from "@/lib/types";

/**
 * O adversário como ele precisa ser lido numa mesa ao vivo: nome, perfil e a
 * linha acionável primeiro. Pontos fortes, histórico e o registro de notas
 * ficam atrás de um toque — informação de estudo, não de mão em andamento.
 */
export function CartaoMesa({ jogador }: { jogador: Jogador }) {
  const { hoje } = useRegistros();
  const [aberto, setAberto] = useState(false);
  const [anotando, setAnotando] = useState(false);

  const meta = PERFIL_META[jogador.perfil];
  const idade = frescor(jogador.atualizadoEm, hoje);
  const oportunidade = meta.risco === "baixo";

  return (
    <article
      className="placa-sutil relative overflow-hidden"
      style={
        oportunidade
          ? { boxShadow: "inset 3px 0 0 0 var(--color-positivo)" }
          : meta.risco === "alto"
            ? { boxShadow: "inset 3px 0 0 0 var(--color-atencao)" }
            : undefined
      }
    >
      <div className="p-4 sm:p-5">
        {/* Selo ao lado do nome, e não na ponta oposta do cartão: ancorado à
            direita ele descia de linha sempre que a linha de metadados era
            longa, e o perfil ficava desalinhado de um cartão para o outro. */}
        <header>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <h3 className="text-[16px] leading-tight font-semibold text-ink">{jogador.nome}</h3>
            <SeloPerfil perfil={jogador.perfil} />
          </div>
          <p className="mt-1.5 text-[11.5px] text-ink-muted">
            {jogador.clube} · {jogador.confrontos} confrontos ·{" "}
            <span
              style={{
                color:
                  jogador.saldoConfrontos >= 0
                    ? "var(--color-positivo)"
                    : "var(--color-negativo)",
              }}
            >
              {moedaComSinal(jogador.saldoConfrontos)}
            </span>
          </p>
        </header>

        <p className="mt-3 text-[13px] leading-relaxed text-ink-secondary">{meta.descricao}</p>

        {jogador.exploracoes.length > 0 && (
          <div className="mt-4">
            <p className="rotulo">Como explorar</p>
            <ul className="mt-2 space-y-1.5">
              {jogador.exploracoes.map((e) => (
                <li key={e} className="flex gap-2.5 text-[14px] leading-snug text-ink">
                  <span aria-hidden className="mt-[3px] shrink-0 text-ink-faint">
                    →
                  </span>
                  {e}
                </li>
              ))}
            </ul>
          </div>
        )}

        {jogador.tells.length > 0 && (
          <div className="mt-4">
            <p className="rotulo">Tells</p>
            <ul className="mt-1.5 space-y-1">
              {jogador.tells.map((t) => (
                <li key={t} className="text-[13px] leading-snug text-ink-secondary">
                  {t}
                </li>
              ))}
            </ul>
          </div>
        )}

        {idade.aviso && (
          <p
            className="mt-4 flex items-start gap-2 rounded-lg border border-hairline px-3 py-2 text-[11.5px] leading-snug"
            style={{ color: "var(--color-atencao)" }}
          >
            <span aria-hidden>!</span>
            <span>
              {idade.aviso} — revisada {haQuantoTempo(jogador.atualizadoEm, hoje)}.
            </span>
          </p>
        )}

        {aberto && (
          <div className="surgir mt-4 space-y-4 border-t border-hairline pt-4">
            {jogador.pontosFortes.length > 0 && (
              <div>
                <p className="rotulo">Pontos fortes</p>
                <ul className="mt-1.5 space-y-1">
                  {jogador.pontosFortes.map((p) => (
                    <li key={p} className="text-[12.5px] text-ink-secondary">
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {jogador.pontosFracos.length > 0 && (
              <div>
                <p className="rotulo">Pontos fracos</p>
                <ul className="mt-1.5 space-y-1">
                  {jogador.pontosFracos.map((p) => (
                    <li key={p} className="text-[12.5px] text-ink-secondary">
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {jogador.notas.length > 0 && (
              <div>
                <p className="rotulo">Registro</p>
                <ul className="mt-2 space-y-2.5">
                  {jogador.notas.map((n) => (
                    <li key={n.id} className="border-l border-hairline pl-3">
                      <p className="text-[10.5px] tracking-wide text-ink-muted">
                        {ROTULO_NOTA[n.tipo]} · {haQuantoTempo(n.data, hoje)}
                      </p>
                      <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-secondary">
                        {n.texto}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {anotando && (
          <div className="mt-4">
            <NotaRapida idJogador={jogador.id} aoSalvar={() => setAnotando(false)} />
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-hairline pt-3">
          <button
            type="button"
            onClick={() => setAnotando((a) => !a)}
            className="cursor-pointer text-[12.5px] font-medium text-[var(--color-positivo)] transition-opacity duration-200 hover:opacity-80"
          >
            {anotando ? "Cancelar" : "Anotar"}
          </button>
          <button
            type="button"
            onClick={() => setAberto((a) => !a)}
            aria-expanded={aberto}
            className="cursor-pointer text-[12.5px] text-ink-muted transition-colors duration-200 hover:text-ink-secondary"
          >
            {aberto ? "Menos" : `Detalhes${jogador.notas.length ? ` (${jogador.notas.length})` : ""}`}
          </button>
          <button
            type="button"
            onClick={() => alternarNaMesa(jogador.id)}
            className="ml-auto cursor-pointer text-[12.5px] text-ink-faint transition-colors duration-200 hover:text-[var(--color-negativo)]"
          >
            Saiu da mesa
          </button>
        </div>
      </div>
    </article>
  );
}

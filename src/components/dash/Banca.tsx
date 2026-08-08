"use client";

import { useState } from "react";
import { anunciar } from "@/components/ui/Aviso";
import { Botao } from "@/components/ui/Botao";
import { CampoNumero, CampoTexto } from "@/components/ui/Campo";
import { useConfirmacao } from "@/components/ui/Confirmar";
import { Folha } from "@/components/ui/Folha";
import { Vazio } from "@/components/ui/Vazio";
import {
  atualizarMovimento,
  ehRegistroProprio,
  registrarMovimento,
  removerMovimento,
} from "@/lib/data/repositorio";
import { dataMedia, moeda } from "@/lib/format";
import { useRegistros } from "@/lib/painel";
import type { MovimentoBankroll } from "@/lib/types";

/**
 * Aportes e saques da banca.
 *
 * Sem eles a curva mente nos dois números que o jogador mais olha: um saque de
 * R$ 900 que o Oblix não conhece vira prejuízo no gráfico, e um aporte novo
 * vira lucro. Nenhum dos dois é resultado de poker, e tratá-los como tal
 * inventaria um desempenho que não existiu.
 *
 * A banca inicial não é um conceito à parte — é o primeiro aporte. Por isso se
 * corrige aqui, pelo mesmo caminho: quem digitou 5.000 em vez de 500 no
 * cadastro não precisa recomeçar.
 */
export function Banca({ aoFechar }: { aoFechar: () => void }) {
  const { movimentos, modo } = useRegistros();
  const [editando, setEditando] = useState<MovimentoBankroll | "novo" | null>(null);
  const { dialogo, confirmar } = useConfirmacao();

  const total = movimentos.reduce((a, m) => a + (m.tipo === "aporte" ? m.valor : -m.valor), 0);

  return (
    <>
      <Folha
        titulo={editando ? "Movimentação" : "Aportes e saques"}
        descricao={
          editando
            ? undefined
            : "Dinheiro que entra ou sai da banca sem ser resultado de poker. Registrar mantém a curva honesta — sem isso, um saque aparece como prejuízo e um aporte como lucro."
        }
        largura="media"
        aoFechar={aoFechar}
        rodape={
          editando ? undefined : (
            <Botao tom="primario" largo aoClicar={() => setEditando("novo")}>
              Registrar aporte ou saque
            </Botao>
          )
        }
      >
        {editando ? (
          <Formulario
            movimento={editando === "novo" ? null : editando}
            aoConcluir={() => setEditando(null)}
          />
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-3 rounded-xl border border-hairline bg-sunken px-4 py-3">
              <span className="text-[12.5px] text-ink-secondary">Aportado menos sacado</span>
              <span className="numeros-tabulares text-[16px] font-semibold text-ink">
                {moeda(total)}
              </span>
            </div>

            {movimentos.length === 0 ? (
              <Vazio
                titulo="Nenhuma movimentação registrada"
                corpo="O primeiro aporte é a sua banca inicial. A partir dele, a curva do painel passa a ter um ponto de partida real."
              />
            ) : (
              <ul className="mt-2 divide-y divide-hairline">
                {[...movimentos].reverse().map((m) => {
                  const proprio = ehRegistroProprio(m.id);
                  return (
                    <li key={m.id} className="py-3">
                      <div className="flex items-baseline gap-3">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] text-ink">
                            {m.descricao || (m.tipo === "aporte" ? "Aporte" : "Saque")}
                          </span>
                          <span className="block text-[12px] text-ink-muted">
                            {dataMedia(m.data)}
                            {!proprio && " · demonstração"}
                          </span>
                        </span>
                        <span
                          className="numeros-tabulares shrink-0 text-[14px] font-medium"
                          style={{
                            color:
                              m.tipo === "aporte"
                                ? "var(--color-positivo)"
                                : "var(--color-negativo)",
                          }}
                        >
                          {m.tipo === "aporte" ? "+" : "−"}
                          {moeda(m.valor)}
                        </span>
                      </div>

                      {/* Visíveis, não escondidas atrás de hover: no celular
                          "hover" não acontece, e sem elas não havia como
                          corrigir um valor digitado errado. */}
                      {proprio && (
                        <div className="mt-1 flex gap-1">
                          <Botao tom="discreto" aoClicar={() => setEditando(m)}>
                            Editar
                          </Botao>
                          <Botao
                            tom="discreto"
                            aoClicar={() =>
                              confirmar({
                                titulo: `Apagar este ${m.tipo}?`,
                                corpo: `${moeda(m.valor)} de ${
                                  m.tipo === "aporte" ? "aporte" : "saque"
                                } saem da curva de banca. Não há como desfazer.`,
                                rotuloAcao: "Apagar movimentação",
                                aoConfirmar: () => {
                                  removerMovimento(m.id);
                                  anunciar("Movimentação apagada.", "neutro");
                                },
                              })
                            }
                          >
                            Apagar
                          </Botao>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {modo === "demonstracao" && (
              <p className="mt-4 text-[12px] leading-relaxed text-ink-muted">
                As movimentações da base de demonstração são leitura. O que você registrar aqui
                entra por cima e pode ser editado.
              </p>
            )}
          </>
        )}
      </Folha>
      {dialogo}
    </>
  );
}

function Formulario({
  movimento,
  aoConcluir,
}: {
  movimento: MovimentoBankroll | null;
  aoConcluir: () => void;
}) {
  const { diaCorrente } = useRegistros();
  const [tipo, setTipo] = useState<"aporte" | "saque">(movimento?.tipo ?? "aporte");
  const [valor, setValor] = useState<number | null>(movimento?.valor ?? null);
  const [data, setData] = useState(
    movimento ? movimento.data.slice(0, 10) : (diaCorrente ?? ""),
  );
  const [descricao, setDescricao] = useState(movimento?.descricao ?? "");
  const [tentou, setTentou] = useState(false);

  const erroValor = tentou && (!valor || valor <= 0) ? "Informe um valor maior que zero" : undefined;

  function salvar() {
    setTentou(true);
    if (!valor || valor <= 0 || !data) return;
    const entrada = {
      data: new Date(`${data}T12:00:00`).toISOString(),
      tipo,
      valor,
      descricao: descricao.trim(),
    };
    if (movimento) atualizarMovimento(movimento.id, entrada);
    else registrarMovimento(entrada);
    anunciar(movimento ? "Movimentação atualizada." : `${tipo === "aporte" ? "Aporte" : "Saque"} registrado.`);
    aoConcluir();
  }

  return (
    <div className="space-y-4">
      <div
        role="radiogroup"
        aria-label="Tipo de movimentação"
        className="grid grid-cols-2 gap-2"
      >
        {(["aporte", "saque"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={tipo === t}
            onClick={() => setTipo(t)}
            className={`min-h-[var(--toque)] cursor-pointer rounded-xl border px-3 text-[14px] font-medium transition-all duration-200 ${
              tipo === t
                ? "border-transparent bg-raised text-ink ring-1 ring-[var(--color-positivo)]"
                : "border-hairline text-ink-secondary hover:border-hairline-strong"
            }`}
          >
            {t === "aporte" ? "Aporte" : "Saque"}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <CampoNumero
          rotulo="Valor"
          valor={valor}
          aoMudar={setValor}
          prefixo="R$"
          min={1}
          erro={erroValor}
        />
        <CampoTexto rotulo="Data" tipo="date" valor={data} aoMudar={setData} />
      </div>

      <CampoTexto
        rotulo="Descrição"
        dica="Opcional — para você lembrar depois"
        valor={descricao}
        aoMudar={setDescricao}
        placeholder={tipo === "aporte" ? "Banca inicial" : "Saque de lucro"}
      />

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row">
        <Botao tom="discreto" aoClicar={aoConcluir}>
          Cancelar
        </Botao>
        <Botao tom="primario" largo aoClicar={salvar}>
          {movimento ? "Salvar alteração" : "Registrar"}
        </Botao>
      </div>
    </div>
  );
}

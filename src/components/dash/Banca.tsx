"use client";

import { useEffect, useState } from "react";
import { CampoNumero, CampoTexto } from "@/components/ui/Campo";
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

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    window.addEventListener("keydown", aoTeclar);
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = anterior;
    };
  }, [aoFechar]);

  const total = movimentos.reduce((a, m) => a + (m.tipo === "aporte" ? m.valor : -m.valor), 0);

  return (
    <div
      role="dialog"
      aria-modal
      aria-labelledby="banca-titulo"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-plane/80 px-4 py-10 backdrop-blur-xl"
    >
      <div className="placa grao surgir relative w-full max-w-[32rem] px-6 py-7 sm:px-8">
        <div aria-hidden className="grao-camada rounded-[20px]" />
        <button
          type="button"
          onClick={aoFechar}
          aria-label="Fechar"
          className="absolute top-4 right-4 z-10 grid size-8 cursor-pointer place-items-center rounded-full text-ink-muted transition-colors duration-200 hover:bg-white/6 hover:text-ink"
        >
          <span aria-hidden className="text-[15px] leading-none">
            ×
          </span>
        </button>

        <div className="relative">
          <h2
            id="banca-titulo"
            className="text-[20px] leading-tight font-semibold tracking-[-0.02em] text-ink"
          >
            Aportes e saques
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-secondary">
            Dinheiro que entra ou sai da banca sem ser resultado de poker. Registrar mantém a
            curva honesta — sem isso, um saque aparece como prejuízo e um aporte como lucro.
          </p>

          {editando ? (
            <Formulario
              movimento={editando === "novo" ? null : editando}
              aoConcluir={() => setEditando(null)}
            />
          ) : (
            <>
              <div className="mt-5 flex items-baseline justify-between gap-3 rounded-xl border border-hairline bg-sunken px-4 py-3">
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
                <ul className="mt-4 divide-y divide-hairline">
                  {[...movimentos].reverse().map((m) => {
                    const proprio = ehRegistroProprio(m.id);
                    return (
                      <li key={m.id} className="flex items-baseline gap-3 py-3">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] text-ink">
                            {m.descricao || (m.tipo === "aporte" ? "Aporte" : "Saque")}
                          </span>
                          <span className="block text-[11.5px] text-ink-muted">
                            {dataMedia(m.data)}
                          </span>
                        </span>
                        <span
                          className="numeros-tabulares shrink-0 text-[13.5px] font-medium"
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
                        {proprio ? (
                          <span className="flex shrink-0 gap-2.5">
                            <button
                              type="button"
                              onClick={() => setEditando(m)}
                              className="cursor-pointer text-[11.5px] text-ink-muted transition-colors duration-200 hover:text-ink"
                            >
                              editar
                            </button>
                            <button
                              type="button"
                              onClick={() => removerMovimento(m.id)}
                              className="cursor-pointer text-[11.5px] text-ink-faint transition-colors duration-200 hover:text-[var(--color-negativo)]"
                            >
                              apagar
                            </button>
                          </span>
                        ) : (
                          <span className="shrink-0 text-[11px] text-ink-faint">demonstração</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              <button
                type="button"
                onClick={() => setEditando("novo")}
                className="mt-5 w-full cursor-pointer rounded-xl bg-[var(--color-positivo)] px-5 py-3 text-[14px] font-semibold text-plane transition-transform duration-200 hover:brightness-110 active:scale-[0.99]"
              >
                Registrar aporte ou saque
              </button>

              {modo === "demonstracao" && (
                <p className="mt-3 text-[11.5px] leading-relaxed text-ink-muted">
                  As movimentações da base de demonstração são leitura. O que você registrar aqui
                  entra por cima e pode ser editado.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
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
    aoConcluir();
  }

  return (
    <div className="mt-5 space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {(["aporte", "saque"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={tipo === t}
            onClick={() => setTipo(t)}
            className={`cursor-pointer rounded-xl border px-3 py-2.5 text-[13.5px] font-medium transition-all duration-200 ${
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

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={salvar}
          className="flex-1 cursor-pointer rounded-xl bg-[var(--color-positivo)] px-4 py-2.5 text-[13.5px] font-semibold text-plane transition-opacity duration-200 hover:opacity-90"
        >
          {movimento ? "Salvar alteração" : "Registrar"}
        </button>
        <button
          type="button"
          onClick={aoConcluir}
          className="cursor-pointer rounded-xl border border-hairline px-4 py-2.5 text-[13.5px] font-medium text-ink-secondary transition-colors duration-200 hover:text-ink"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

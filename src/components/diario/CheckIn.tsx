"use client";

import { useState } from "react";
import { CampoEscolha, CampoSelecao } from "@/components/ui/Campo";
import { registrarCheckIn } from "@/lib/data/repositorio";
import { OBJETIVOS } from "@/lib/data/seed";
import { decimal, moeda, percentual } from "@/lib/format";
import type { historicoRecuperacao } from "@/lib/calc/diario";

type Resposta = "sim" | "nao";
type Fase = "perguntas" | "pausa" | "compromisso";

interface Props {
  historico: ReturnType<typeof historicoRecuperacao>;
  aoConcluir: (jogou: boolean) => void;
}

/**
 * A pausa que a pergunta existe para provocar.
 *
 * Não é sermão: é o histórico do próprio jogador, e a saída "vou jogar mesmo
 * assim" continua sendo um botão de verdade. Um freio que não pode ser solto
 * vira obstáculo, e o jogador simplesmente para de responder a pergunta com
 * sinceridade — que é o único jeito de esta feature perder o valor todo.
 */
function Pausa({
  historico,
  aoSeguir,
  aoDesistir,
}: {
  historico: Props["historico"];
  aoSeguir: () => void;
  aoDesistir: () => void;
}) {
  const temDados = historico && historico.torneios > 0;

  return (
    <div className="surgir">
      <p
        className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11.5px] font-medium"
        style={{
          color: "var(--color-atencao)",
          background: "color-mix(in oklab, currentColor 13%, transparent)",
        }}
      >
        <span aria-hidden>!</span>
        Vale parar um minuto
      </p>

      <h3 className="mt-4 text-[20px] leading-snug font-semibold tracking-[-0.02em] text-ink sm:text-[23px]">
        Jogar para recuperar é a decisão mais cara do poker.
      </h3>

      <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-ink-secondary">
        O buy-in de hoje não sabe quanto você perdeu ontem. Entrar tentando
        zerar o prejuízo empurra para potes marginais e torna a mão seguinte
        pior do que ela precisaria ser.
      </p>

      {temDados && historico.amostraSuficiente && (
        <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-4 border-t border-hairline pt-5 sm:grid-cols-3">
          <div>
            <dt className="rotulo">Lucro médio assim</dt>
            <dd
              className="numeros-tabulares mt-1.5 text-[19px] font-medium"
              style={{
                color:
                  historico.lucroMedio >= 0
                    ? "var(--color-positivo)"
                    : "var(--color-negativo)",
              }}
            >
              {moeda(historico.lucroMedio)}
            </dd>
            <dd className="text-[11px] text-ink-muted">
              contra {moeda(historico.lucroMedioNormal)} nos demais
            </dd>
          </div>
          <div>
            <dt className="rotulo">Profundidade</dt>
            <dd className="numeros-tabulares mt-1.5 text-[19px] font-medium text-ink">
              {percentual(historico.profundidade * 100)}
            </dd>
            <dd className="text-[11px] text-ink-muted">
              contra {percentual(historico.profundidadeNormal * 100)}
            </dd>
          </div>
          <div>
            <dt className="rotulo">Disciplina</dt>
            <dd className="numeros-tabulares mt-1.5 text-[19px] font-medium text-ink">
              {decimal(historico.disciplina, 1)}
            </dd>
            <dd className="text-[11px] text-ink-muted">
              contra {decimal(historico.disciplinaNormal, 1)}
            </dd>
          </div>
        </dl>
      )}

      {temDados && !historico.amostraSuficiente && (
        <p className="mt-5 rounded-xl border border-hairline bg-sunken px-4 py-3 text-[12.5px] leading-relaxed text-ink-muted">
          Você registrou esse estado {historico.torneios}{" "}
          {historico.torneios === 1 ? "vez" : "vezes"} até aqui — ainda pouco
          para o Oblix mostrar um número seu com honestidade. Ele avisa quando
          houver amostra.
        </p>
      )}

      <div className="mt-7 flex flex-col gap-2 border-t border-hairline pt-5 sm:flex-row">
        <button
          type="button"
          onClick={aoDesistir}
          className="flex-1 cursor-pointer rounded-xl bg-[var(--color-positivo)] px-4 py-3 text-[13.5px] font-semibold text-plane transition-opacity duration-200 hover:opacity-90"
        >
          Melhor não jogar hoje
        </button>
        <button
          type="button"
          onClick={aoSeguir}
          className="flex-1 cursor-pointer rounded-xl border border-hairline px-4 py-3 text-[13.5px] font-medium text-ink-secondary transition-colors duration-200 hover:border-hairline-strong hover:text-ink"
        >
          Vou jogar mesmo assim
        </button>
      </div>
    </div>
  );
}

export function CheckIn({ historico, aoConcluir }: Props) {
  const [fase, setFase] = useState<Fase>("perguntas");
  const [dormiu, setDormiu] = useState<Resposta>("sim");
  const [calmo, setCalmo] = useState<Resposta>("sim");
  const [recuperar, setRecuperar] = useState<Resposta>("nao");
  const [objetivo, setObjetivo] = useState<string>(OBJETIVOS[0]);

  function avancar() {
    setFase(recuperar === "sim" ? "pausa" : "compromisso");
  }

  function salvar(jogou: boolean) {
    registrarCheckIn({
      dormiuBem: dormiu === "sim",
      calmo: calmo === "sim",
      tentandoRecuperar: recuperar === "sim",
      objetivo: jogou ? objetivo : "Reconheci o estado e escolhi não jogar hoje.",
    });
    aoConcluir(jogou);
  }

  return (
    <section className="placa grao surgir relative overflow-hidden">
      <div aria-hidden className="grao-camada rounded-[20px]" />
      <div className="relative px-6 py-7 sm:px-8 sm:py-8">
        {fase === "perguntas" && (
          <>
            <h2 className="rotulo">Check-in de hoje</h2>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink">
              Três perguntas antes de sentar. Responder com sinceridade vale mais
              que responder bonito — é você que vai ler isso depois.
            </p>

            <div className="mt-7 space-y-6">
              <CampoEscolha
                rotulo="Dormi bem?"
                valor={dormiu}
                aoMudar={setDormiu}
                opcoes={[
                  { valor: "sim", rotulo: "Sim" },
                  { valor: "nao", rotulo: "Não" },
                ]}
              />
              <CampoEscolha
                rotulo="Estou calmo?"
                valor={calmo}
                aoMudar={setCalmo}
                opcoes={[
                  { valor: "sim", rotulo: "Sim" },
                  { valor: "nao", rotulo: "Não" },
                ]}
              />
              <CampoEscolha
                rotulo="Estou tentando recuperar perdas?"
                dica="A resposta honesta aqui é a que mais protege a sua banca."
                valor={recuperar}
                aoMudar={setRecuperar}
                opcoes={[
                  { valor: "nao", rotulo: "Não" },
                  { valor: "sim", rotulo: "Sim" },
                ]}
              />
            </div>

            <button
              type="button"
              onClick={avancar}
              className="mt-8 w-full cursor-pointer rounded-xl bg-[var(--color-positivo)] px-5 py-3 text-[13.5px] font-semibold text-plane transition-opacity duration-200 hover:opacity-90 sm:w-auto"
            >
              Continuar
            </button>
          </>
        )}

        {fase === "pausa" && (
          <Pausa
            historico={historico}
            aoSeguir={() => setFase("compromisso")}
            aoDesistir={() => salvar(false)}
          />
        )}

        {fase === "compromisso" && (
          <div className="surgir">
            <h2 className="rotulo">Objetivo de hoje</h2>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink">
              O resultado não está sob seu controle. A qualidade das decisões
              está — escolha o compromisso que você quer cobrar de si mesmo hoje.
            </p>

            <div className="mt-6 max-w-xl">
              <CampoSelecao
                rotulo="Meu objetivo"
                valor={objetivo}
                aoMudar={setObjetivo}
                opcoes={OBJETIVOS.map((o) => ({ valor: o, rotulo: o }))}
              />
            </div>

            <div className="mt-7 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => salvar(true)}
                className="cursor-pointer rounded-xl bg-[var(--color-positivo)] px-6 py-3 text-[13.5px] font-semibold text-plane transition-opacity duration-200 hover:opacity-90"
              >
                Assinar e jogar
              </button>
              <button
                type="button"
                onClick={() => setFase("perguntas")}
                className="cursor-pointer px-4 py-3 text-[13.5px] font-medium text-ink-secondary transition-colors duration-200 hover:text-ink"
              >
                Voltar
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

"use client";

import { useMemo, useState } from "react";
import { CheckIn } from "@/components/diario/CheckIn";
import { CabecalhoPlaca, Placa } from "@/components/ui/Placa";
import { Vazio } from "@/components/ui/Vazio";
import { CampoEscolha, CampoTextoLongo } from "@/components/ui/Campo";
import { indexarSatelites } from "@/lib/calc/metricas";
import {
  contrastesMentais,
  historicoRecuperacao,
  resumirDiario,
  type Contraste,
} from "@/lib/calc/diario";
import { fecharSessao } from "@/lib/data/repositorio";
import { dataMedia, decimal, diaLocal, haQuantoTempo, moeda, percentual } from "@/lib/format";
import { useRegistros } from "@/lib/painel";
import type { DiarioMental } from "@/lib/types";
import { anunciar } from "@/components/ui/Aviso";

const soData = (iso: string) => diaLocal(new Date(iso));

/** Barra dupla comparando os dois lados de uma pergunta do check-in. */
function BarraContraste({ contraste }: { contraste: Contraste }) {
  const { sim, nao, bomEhSim } = contraste;
  const teto = Math.max(sim.profundidadeMedia, nao.profundidadeMedia, 0.01);

  const lados = [
    { rotulo: contraste.rotuloSim, faixa: sim, bom: bomEhSim },
    { rotulo: contraste.rotuloNao, faixa: nao, bom: !bomEhSim },
  ];

  return (
    <div className="space-y-[3px]">
      {lados.map((lado) => (
        <div key={lado.rotulo} className="flex items-center gap-2.5">
          <span className="w-32 shrink-0 text-[12px] text-ink-muted">{lado.rotulo}</span>
          <span className="relative h-[13px] flex-1">
            <span
              className="absolute inset-y-0 left-0 rounded-r-[3px] transition-[width] duration-[900ms] ease-[var(--ease-out-quint)]"
              style={{
                width: `${(lado.faixa.profundidadeMedia / teto) * 100}%`,
                background: lado.bom ? "var(--color-positivo)" : "var(--color-atencao)",
                opacity: lado.faixa.torneios === 0 ? 0.25 : 1,
              }}
            />
          </span>
          <span className="numeros-tabulares w-11 shrink-0 text-right text-[12.5px] font-medium text-ink">
            {percentual(lado.faixa.profundidadeMedia * 100)}
          </span>
          <span className="numeros-tabulares w-8 shrink-0 text-right text-[12px] text-ink-faint">
            {lado.faixa.torneios}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Fecho da sessão: as três perguntas do "depois". */
function Fechamento({ registro }: { registro: DiarioMental }) {
  const [tilt, setTilt] = useState<"sim" | "nao">("nao");
  const [comoTerminei, setComoTerminei] = useState("");
  const [aprendizado, setAprendizado] = useState("");

  return (
    <div className="surgir mt-5 space-y-5 border-t border-hairline pt-5">
      <CampoEscolha
        rotulo="Houve tilt?"
        valor={tilt}
        aoMudar={setTilt}
        opcoes={[
          { valor: "nao", rotulo: "Não" },
          { valor: "sim", rotulo: "Sim" },
        ]}
      />
      <CampoTextoLongo
        rotulo="Como terminei?"
        valor={comoTerminei}
        aoMudar={setComoTerminei}
        linhas={2}
        placeholder="Terminei tranquilo, com sensação de ter tomado boas decisões."
      />
      <CampoTextoLongo
        rotulo="Aprendizado"
        valor={aprendizado}
        aoMudar={setAprendizado}
        linhas={2}
        placeholder="A bolha é onde eu mais perco valor."
      />
      <button
        type="button"
        onClick={() =>
          {
            fecharSessao(registro.id, {
              houveTilt: tilt === "sim",
              comoTerminei: comoTerminei.trim(),
              aprendizado: aprendizado.trim(),
            });
            anunciar("Sessão fechada no diário.");
          }
        }
        className="cursor-pointer rounded-xl bg-[var(--color-positivo)] px-5 py-2.5 text-[13.5px] font-semibold text-plane transition-opacity duration-200 hover:opacity-90"
      >
        Fechar a sessão
      </button>
    </div>
  );
}

export default function Diario() {
  const registros = useRegistros();
  const [refeito, setRefeito] = useState(false);
  const [encerrouSemJogar, setEncerrouSemJogar] = useState(false);

  const idx = useMemo(() => indexarSatelites(registros.satelites), [registros.satelites]);
  const contrastes = useMemo(
    () => contrastesMentais(registros.diario, registros.torneios, idx),
    [registros.diario, registros.torneios, idx],
  );
  const resumo = resumirDiario(registros.diario);
  const historico = historicoRecuperacao(registros.diario, registros.torneios, idx);

  const hoje = registros.diaCorrente;
  const checkInDeHoje = hoje
    ? [...registros.diario].reverse().find((d) => soData(d.data) === hoje)
    : undefined;
  const abertos = [...registros.diario].reverse().filter((d) => d.houveTilt === null);

  const comAmostra = contrastes.filter((c) => c.amostraSuficiente);
  const semAmostra = contrastes.filter((c) => !c.amostraSuficiente);

  return (
    <main className="mx-auto w-full max-w-[76rem] px-4 py-8 sm:px-7 sm:py-10 lg:px-10">
      <header className="surgir">
        <h1 className="texto-display text-ink">
          Diário mental
        </h1>
        <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-ink-secondary">
          {resumo.registros} registros · {percentual(resumo.taxaSonoBom)} das noites bem
          dormidas · tilt em {percentual(resumo.taxaTilt)} das sessões fechadas. O estado
          com que você senta é a única variável que você controla antes da primeira carta.
        </p>
      </header>

      <div className="mt-7 grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-7">
          {!checkInDeHoje || refeito ? (
            <CheckIn
              historico={historico}
              aoConcluir={(jogou) => {
                setRefeito(false);
                setEncerrouSemJogar(!jogou);
              }}
            />
          ) : (
            <Placa>
              <CabecalhoPlaca
                titulo="Check-in de hoje"
                descricao={dataMedia(checkInDeHoje.data)}
                acessorio={
                  <button
                    type="button"
                    onClick={() => setRefeito(true)}
                    className="cursor-pointer text-[12px] text-ink-muted transition-colors duration-200 hover:text-ink"
                  >
                    Refazer
                  </button>
                }
              />
              <div className="px-6 pb-6 sm:px-7">
                {encerrouSemJogar && (
                  <p
                    className="mb-5 rounded-xl px-4 py-3 text-[13px] leading-relaxed"
                    style={{
                      color: "var(--color-positivo)",
                      background: "color-mix(in oklab, currentColor 10%, transparent)",
                    }}
                  >
                    Reconhecer o estado e não jogar é uma decisão de jogador
                    profissional. Este check-in fica registrado como tal.
                  </p>
                )}

                <dl className="grid grid-cols-3 gap-4">
                  {[
                    { rotulo: "Dormiu bem", valor: checkInDeHoje.dormiuBem, bomEhSim: true },
                    { rotulo: "Calmo", valor: checkInDeHoje.calmo, bomEhSim: true },
                    {
                      rotulo: "Recuperando",
                      valor: checkInDeHoje.tentandoRecuperar,
                      bomEhSim: false,
                    },
                  ].map((item) => {
                    const bom = item.bomEhSim ? item.valor : !item.valor;
                    return (
                      <div key={item.rotulo}>
                        <dt className="rotulo">{item.rotulo}</dt>
                        <dd
                          className="mt-1.5 flex items-center gap-1.5 text-[15px] font-medium"
                          style={{
                            color: bom ? "var(--color-positivo)" : "var(--color-atencao)",
                          }}
                        >
                          <span aria-hidden className="text-[10px]">
                            {bom ? "✓" : "!"}
                          </span>
                          {item.valor ? "Sim" : "Não"}
                        </dd>
                      </div>
                    );
                  })}
                </dl>

                <div className="mt-5 border-t border-hairline pt-4">
                  <p className="rotulo">Compromisso assinado</p>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-ink">
                    {checkInDeHoje.objetivo}
                  </p>
                </div>

                {checkInDeHoje.houveTilt === null && <Fechamento registro={checkInDeHoje} />}
              </div>
            </Placa>
          )}

          {abertos.length > 1 && (
            <p className="mt-3 text-[12px] text-ink-muted">
              {abertos.length - (checkInDeHoje?.houveTilt === null ? 1 : 0)} sessões de
              outros dias ainda sem fechamento.
            </p>
          )}
        </div>

        <div className="min-w-0 lg:col-span-5">
          <Placa atraso={80}>
            <CabecalhoPlaca
              titulo="O que seus registros mostram"
              descricao="Profundidade média no campo em cada estado — a barra maior é a melhor"
            />
            {/* Sem nenhum torneio registrado não há o que cruzar: os dois
                lados de cada pergunta teriam zero registros, e a lista de
                "ainda sem amostra" viraria uma parede de zeros. */}
            {registros.torneios.length === 0 ? (
              <Vazio
                titulo="Aqui o seu estado encontra o seu resultado"
                corpo="Cada check-in é cruzado com o torneio daquele dia. Depois de alguns registros, o Oblix mostra quanto dormir bem, chegar calmo ou tentar recuperar perdas mudou a distância que você percorreu no campo."
                acao={{ rotulo: "Registrar um torneio", href: "/torneios/novo" }}
              />
            ) : (
            <div className="space-y-5 px-6 pb-6 sm:px-7">
              {comAmostra.map((c) => (
                <div key={c.chave}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <p className="text-[12.5px] font-medium text-ink-secondary">{c.pergunta}</p>
                    {c.momento === "depois" && (
                      <span className="text-[12px] text-ink-faint">respondido depois</span>
                    )}
                  </div>
                  <div className="mt-2.5">
                    <BarraContraste contraste={c} />
                  </div>
                  <p className="mt-2.5 text-[12px] leading-relaxed text-ink-muted">{c.leitura}</p>
                </div>
              ))}

              {semAmostra.length > 0 && (
                <div className="border-t border-hairline pt-4">
                  <p className="rotulo">Ainda sem amostra</p>
                  <ul className="mt-2 space-y-1.5">
                    {semAmostra.map((c) => (
                      <li key={c.chave} className="text-[12px] leading-snug text-ink-muted">
                        {c.pergunta} — {c.sim.torneios} contra {c.nao.torneios} registros.
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="border-t border-hairline pt-3.5 text-[12px] leading-relaxed text-ink-muted">
                Profundidade usa todos os torneios, e não só os premiados, então
                move devagar e resiste a um prêmio grande isolado. Perguntas
                respondidas depois do jogo aparecem marcadas: elas descrevem a
                sessão, mas não provam causa.
              </p>
            </div>
            )}
          </Placa>
        </div>

        <div className="min-w-0 lg:col-span-12">
          <Placa atraso={140}>
            <CabecalhoPlaca
              titulo="Histórico"
              descricao={`${registros.diario.length} check-ins registrados`}
            />
            <ul className="px-6 pb-6 sm:px-7">
              {[...registros.diario]
                .reverse()
                .slice(0, 12)
                .map((d) => {
                  const torneio = d.torneioId
                    ? registros.torneios.find((t) => t.id === d.torneioId)
                    : null;
                  return (
                    <li
                      key={d.id}
                      className="grid gap-x-6 gap-y-2 border-t border-hairline py-4 first:border-t-0 sm:grid-cols-[8rem_1fr]"
                    >
                      <div>
                        <p className="text-[12.5px] text-ink-secondary">{dataMedia(d.data)}</p>
                        <p className="text-[12px] text-ink-faint">
                          {haQuantoTempo(d.data, registros.hoje)}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
                          {[
                            { r: "dormiu bem", v: d.dormiuBem, bom: true },
                            { r: "calmo", v: d.calmo, bom: true },
                            { r: "recuperando", v: d.tentandoRecuperar, bom: false },
                            ...(d.houveTilt !== null
                              ? [{ r: "tilt", v: d.houveTilt, bom: false }]
                              : []),
                          ]
                            .filter((c) => c.v)
                            .map((c) => (
                              <span
                                key={c.r}
                                style={{
                                  color: c.bom
                                    ? "var(--color-positivo)"
                                    : "var(--color-atencao)",
                                }}
                              >
                                {c.r}
                              </span>
                            ))}
                          {d.houveTilt === null && (
                            <span className="text-ink-faint">sessão em aberto</span>
                          )}
                        </div>
                        <p className="mt-1.5 text-[13px] leading-relaxed text-ink">
                          {d.objetivo}
                        </p>
                        {d.aprendizado && (
                          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
                            {d.aprendizado}
                          </p>
                        )}
                        {torneio && (
                          <p className="numeros-tabulares mt-1.5 text-[12px] text-ink-muted">
                            → {torneio.nome} · {torneio.colocacao}º de {torneio.jogadores} ·{" "}
                            {torneio.premiacao > 0
                              ? moeda(torneio.premiacao)
                              : "sem prêmio"}{" "}
                            · disciplina {decimal(torneio.notaDisciplina ?? 0, 1)}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
            </ul>

            {registros.diario.length === 0 && (
              <Vazio
                titulo="Nenhum check-in registrado ainda"
                corpo="O check-in leva quinze segundos e é respondido antes de sentar. Com o tempo, ele responde a pergunta mais cara do poker: em que estado você joga bem, e em qual seria melhor ir para casa."
              />
            )}
          </Placa>
        </div>
      </div>
    </main>
  );
}

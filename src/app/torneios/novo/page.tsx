"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Conclusao } from "@/components/torneios/Conclusao";
import { EscalaEnergia } from "@/components/torneios/EscalaEnergia";
import { SaudeDaSessao } from "@/components/torneios/SaudeDaSessao";
import {
  CampoEscolha,
  CampoNumero,
  CampoTexto,
  CampoTextoLongo,
} from "@/components/ui/Campo";
import { registrar, registrarMedicao, type EntradaMedicao } from "@/lib/data/repositorio";
import { moeda, moedaComSinal } from "@/lib/format";
import { useClubes, useRegistros } from "@/lib/painel";
import type { NivelEnergia, Torneio } from "@/lib/types";

const PASSOS = [
  { chave: "torneio", rotulo: "O torneio" },
  { chave: "satelite", rotulo: "O satélite" },
  { chave: "resultado", rotulo: "O resultado" },
  { chave: "sessao", rotulo: "A sessão" },
] as const;

interface Formulario {
  data: string;
  nome: string;
  clube: string;
  buyIn: number | null;
  jogadores: number | null;

  jogouSatelite: "sim" | "nao";
  satNome: string;
  satBuyIn: number | null;
  satEntradas: number | null;
  satJogadores: number | null;
  satClassificou: "sim" | "nao";
  satPosicao: number | null;
  satHoras: number | null;
  satMinutos: number | null;
  satObs: string;

  colocacao: number | null;
  premiacao: number | null;
  rebuys: number | null;
  addon: number | null;
  horas: number | null;
  minutos: number | null;

  energia: NivelEnergia;
  notaDisciplina: number;
  melhorDecisao: string;
  piorDecisao: string;
  aprendizado: string;
}

/**
 * O formulário nasce neutro de propósito.
 *
 * Data, clube e buy-in padrão dependem de quem é o jogador, e no primeiro
 * render o cliente ainda não sabe — precisa concordar com o HTML do servidor,
 * que só conhece a demonstração. Preencher aqui entregaria a um jogador de
 * verdade a data congelada do seed e o buy-in de outra pessoa. Os padrões
 * entram logo depois, quando o repositório resolve a conta.
 */
const INICIAL: Formulario = {
  data: "",
  nome: "",
  clube: "",
  buyIn: null,
  jogadores: null,

  jogouSatelite: "nao",
  satNome: "",
  satBuyIn: null,
  satEntradas: 1,
  satJogadores: null,
  satClassificou: "nao",
  satPosicao: null,
  satHoras: null,
  satMinutos: null,
  satObs: "",

  colocacao: null,
  premiacao: 0,
  rebuys: 0,
  addon: 0,
  horas: null,
  minutos: null,

  energia: "normal",
  notaDisciplina: 8,
  melhorDecisao: "",
  piorDecisao: "",
  aprendizado: "",
};

const emMinutos = (h: number | null, m: number | null) => (h ?? 0) * 60 + (m ?? 0);

export default function NovoTorneio() {
  const { perfil, diaCorrente, hoje, medicoes } = useRegistros();
  const clubes = useClubes();
  const ultimaMedicao = medicoes.at(-1) ?? null;

  const [passo, setPasso] = useState(0);
  const [form, setForm] = useState<Formulario>(INICIAL);
  const [semeadoCom, setSemeadoCom] = useState<string | null>(null);
  const [tentouAvancar, setTentouAvancar] = useState(false);
  const [medicao, setMedicao] = useState<EntradaMedicao | null>(null);
  const [salvo, setSalvo] = useState<{ torneio: Torneio; investimento: number } | null>(null);

  // Os padrões do jogador entram uma vez só, assim que o cliente resolve quem
  // ele é, e só onde ele ainda não digitou nada.
  //
  // O ajuste acontece durante o render, e não num efeito, porque é disso que
  // se trata: estado derivado que precisa acompanhar uma fonte externa. React
  // re-renderiza antes de pintar, então o campo nunca chega a aparecer com o
  // valor errado — um efeito produziria o pisca e uma cascata de renders.
  if (diaCorrente && semeadoCom !== diaCorrente) {
    setSemeadoCom(diaCorrente);
    setForm((f) => ({
      ...f,
      data: f.data || diaCorrente,
      clube: f.clube || (clubes[0] ?? ""),
      buyIn: f.buyIn ?? perfil.buyInPadrao,
    }));
  }

  const definir = <K extends keyof Formulario>(chave: K, valor: Formulario[K]) =>
    setForm((f) => ({ ...f, [chave]: valor }));

  // A via não é perguntada: ela é consequência de ter jogado o satélite E
  // classificado. Perguntar de novo abriria espaço para os dois campos se
  // contradizerem no banco.
  const via = form.jogouSatelite === "sim" && form.satClassificou === "sim" ? "satelite" : "direto";

  const custoSatelite = (form.satBuyIn ?? 0) * (form.satEntradas ?? 0);
  const custoEntrada = via === "satelite" ? custoSatelite : (form.buyIn ?? 0);
  const investimento = custoEntrada + (form.rebuys ?? 0) + (form.addon ?? 0);
  const saldo = (form.premiacao ?? 0) - investimento;

  const erros = useMemo(() => {
    const e: Partial<Record<keyof Formulario, string>> = {};
    if (passo === 0) {
      if (!form.data) e.data = "Informe a data";
      if (!form.nome.trim()) e.nome = "Dê um nome ao torneio";
      if (!form.buyIn || form.buyIn <= 0) e.buyIn = "Informe o buy-in de balcão";
      if (!form.jogadores || form.jogadores < 2) e.jogadores = "Informe quantos jogadores entraram";
    }
    if (passo === 1 && form.jogouSatelite === "sim") {
      if (!form.satBuyIn || form.satBuyIn <= 0) e.satBuyIn = "Informe o buy-in do satélite";
      if (!form.satEntradas || form.satEntradas < 1) e.satEntradas = "Ao menos uma entrada";
      if (form.satClassificou === "sim" && (!form.satPosicao || form.satPosicao < 1)) {
        e.satPosicao = "Informe a posição final";
      }
    }
    if (passo === 2) {
      if (!form.colocacao || form.colocacao < 1) e.colocacao = "Informe sua colocação";
      else if (form.jogadores && form.colocacao > form.jogadores) {
        e.colocacao = `Não pode ser maior que ${form.jogadores} jogadores`;
      }
      if (form.premiacao === null || form.premiacao < 0) e.premiacao = "Use 0 se não premiou";
      if (emMinutos(form.horas, form.minutos) <= 0) e.horas = "Informe quanto tempo jogou";
    }
    return e;
  }, [passo, form]);

  const podeAvancar = Object.keys(erros).length === 0;

  function avancar() {
    setTentouAvancar(true);
    if (!podeAvancar) return;
    setTentouAvancar(false);
    if (passo < PASSOS.length - 1) {
      setPasso(passo + 1);
      return;
    }
    concluir();
  }

  function concluir() {
    const iso = new Date(`${form.data}T20:00:00.000Z`).toISOString();
    const torneio = registrar({
      torneio: {
        data: iso,
        nome: form.nome.trim(),
        clube: form.clube,
        modalidade: perfil.modalidade,
        buyIn: form.buyIn ?? 0,
        rebuys: form.rebuys ?? 0,
        addon: form.addon ?? 0,
        jogadores: form.jogadores ?? 0,
        colocacao: form.colocacao,
        premiacao: form.premiacao ?? 0,
        duracaoMin: emMinutos(form.horas, form.minutos),
        via,
        energia: form.energia,
        notaDisciplina: form.notaDisciplina,
        melhorDecisao: form.melhorDecisao.trim() || undefined,
        piorDecisao: form.piorDecisao.trim() || undefined,
        aprendizado: form.aprendizado.trim() || undefined,
      },
      satelite:
        form.jogouSatelite === "sim"
          ? {
              nome: form.satNome.trim() || `Satélite ${form.nome.trim()}`,
              clube: form.clube,
              data: new Date(`${form.data}T16:00:00.000Z`).toISOString(),
              buyIn: form.satBuyIn ?? 0,
              entradas: form.satEntradas ?? 1,
              jogadores: form.satJogadores ?? 0,
              classificou: form.satClassificou === "sim",
              posicao: form.satPosicao,
              tempoJogadoMin: emMinutos(form.satHoras, form.satMinutos),
              observacoes: form.satObs.trim() || undefined,
            }
          : null,
    });
    // A medição é gravada como registro próprio, com a data de agora. Ela
    // descreve o estado do jogo naquele momento, não o torneio — e é por isso
    // que sobrevive mesmo se o torneio for apagado depois.
    if (medicao && medicao.pfr <= medicao.vpip) registrarMedicao(medicao);

    setSalvo({ torneio, investimento });
  }

  if (salvo) {
    return (
      <main className="mx-auto w-full max-w-[86rem] px-4 py-10 sm:px-7 lg:px-10">
        <Conclusao
          torneio={salvo.torneio}
          investimento={salvo.investimento}
          aoRegistrarOutro={() => {
            setForm({ ...INICIAL });
            setPasso(0);
            setSalvo(null);
          }}
        />
      </main>
    );
  }

  const erro = (chave: keyof Formulario) => (tentouAvancar ? erros[chave] : undefined);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-7 sm:py-10">
      <header className="surgir flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-[28px]">
            Registrar torneio
          </h1>
          <p className="mt-1 text-[13px] text-ink-secondary">
            Cada registro afina as conclusões do painel.
          </p>
        </div>
        <Link
          href="/torneios"
          className="shrink-0 text-[13px] text-ink-muted transition-colors duration-200 hover:text-ink"
        >
          Cancelar
        </Link>
      </header>

      {/* Trilha de passos: mostra onde está e quanto falta, sem prometer que
          dá para pular adiante — os passos dependem uns dos outros. */}
      <ol className="surgir mt-7 flex gap-1.5" aria-label="Etapas do registro">
        {PASSOS.map((p, i) => {
          const feito = i < passo;
          const atual = i === passo;
          return (
            <li key={p.chave} className="flex-1">
              <div
                className="h-[3px] rounded-full transition-colors duration-300"
                style={{
                  background: feito || atual ? "var(--color-positivo)" : "var(--color-grid)",
                  opacity: feito ? 0.55 : 1,
                }}
              />
              <span
                className={`mt-2 block text-[11px] ${atual ? "font-medium text-ink" : "text-ink-muted"}`}
              >
                {p.rotulo}
              </span>
            </li>
          );
        })}
      </ol>

      <section className="placa grao surgir relative mt-5 overflow-hidden">
        <div aria-hidden className="grao-camada rounded-[20px]" />
        <div className="relative space-y-5 px-5 py-6 sm:px-7 sm:py-7">
          {passo === 0 && (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                <CampoTexto
                  rotulo="Data"
                  tipo="date"
                  valor={form.data}
                  aoMudar={(v) => definir("data", v)}
                  erro={erro("data")}
                />
                <CampoTexto
                  rotulo="Clube"
                  valor={form.clube}
                  aoMudar={(v) => definir("clube", v)}
                  sugestoes={clubes}
                  placeholder="Onde você jogou"
                />
              </div>
              <CampoTexto
                rotulo="Nome do torneio"
                placeholder="Main Event R$ 100"
                valor={form.nome}
                aoMudar={(v) => definir("nome", v)}
                erro={erro("nome")}
              />
              <div className="grid gap-5 sm:grid-cols-2">
                <CampoNumero
                  rotulo="Buy-in de balcão"
                  dica="O valor da vaga, mesmo que você tenha entrado por satélite"
                  valor={form.buyIn}
                  aoMudar={(v) => definir("buyIn", v)}
                  prefixo="R$"
                  min={0}
                  erro={erro("buyIn")}
                />
                <CampoNumero
                  rotulo="Jogadores no campo"
                  valor={form.jogadores}
                  aoMudar={(v) => definir("jogadores", v)}
                  min={2}
                  placeholder="0"
                  erro={erro("jogadores")}
                />
              </div>
            </>
          )}

          {passo === 1 && (
            <>
              <CampoEscolha
                rotulo="Você jogou satélite para este torneio?"
                dica="Se não jogou, seguimos direto para o resultado."
                valor={form.jogouSatelite}
                aoMudar={(v) => definir("jogouSatelite", v)}
                opcoes={[
                  { valor: "nao", rotulo: "Não", detalhe: "Comprei a vaga" },
                  { valor: "sim", rotulo: "Sim", detalhe: "Disputei o satélite" },
                ]}
              />

              {form.jogouSatelite === "sim" && (
                <div className="surgir space-y-5 border-t border-hairline pt-5">
                  <CampoTexto
                    rotulo="Nome do satélite"
                    dica="Opcional"
                    placeholder={form.nome ? `Satélite ${form.nome}` : "Satélite Main Event"}
                    valor={form.satNome}
                    aoMudar={(v) => definir("satNome", v)}
                  />
                  <div className="grid gap-5 sm:grid-cols-3">
                    <CampoNumero
                      rotulo="Buy-in"
                      valor={form.satBuyIn}
                      aoMudar={(v) => definir("satBuyIn", v)}
                      prefixo="R$"
                      min={0}
                      erro={erro("satBuyIn")}
                    />
                    <CampoNumero
                      rotulo="Entradas"
                      dica="Com re-entries"
                      valor={form.satEntradas}
                      aoMudar={(v) => definir("satEntradas", v)}
                      min={1}
                      erro={erro("satEntradas")}
                    />
                    <CampoNumero
                      rotulo="Jogadores"
                      valor={form.satJogadores}
                      aoMudar={(v) => definir("satJogadores", v)}
                      min={0}
                      placeholder="0"
                    />
                  </div>

                  <CampoEscolha
                    rotulo="Classificou?"
                    valor={form.satClassificou}
                    aoMudar={(v) => definir("satClassificou", v)}
                    opcoes={[
                      { valor: "nao", rotulo: "Não", detalhe: "Fui eliminado" },
                      { valor: "sim", rotulo: "Sim", detalhe: "Ganhei a vaga" },
                    ]}
                  />

                  <div className="grid gap-5 sm:grid-cols-3">
                    <CampoNumero
                      rotulo="Posição final"
                      valor={form.satPosicao}
                      aoMudar={(v) => definir("satPosicao", v)}
                      min={1}
                      placeholder="0"
                      erro={erro("satPosicao")}
                    />
                    <CampoNumero
                      rotulo="Horas"
                      valor={form.satHoras}
                      aoMudar={(v) => definir("satHoras", v)}
                      min={0}
                      placeholder="0"
                    />
                    <CampoNumero
                      rotulo="Minutos"
                      valor={form.satMinutos}
                      aoMudar={(v) => definir("satMinutos", v)}
                      min={0}
                      max={59}
                      placeholder="0"
                    />
                  </div>

                  <CampoTextoLongo
                    rotulo="Observações"
                    dica="Opcional"
                    placeholder="Bubble do satélite, fiquei sem fichas defendendo o big blind."
                    valor={form.satObs}
                    aoMudar={(v) => definir("satObs", v)}
                    linhas={2}
                  />

                  {form.satClassificou === "sim" && (
                    <p className="rounded-xl border border-hairline bg-sunken px-4 py-3 text-[12.5px] leading-relaxed text-ink-secondary">
                      Vaga conquistada por{" "}
                      <strong className="font-semibold text-ink">{moeda(custoSatelite)}</strong> em
                      vez de {moeda(form.buyIn ?? 0)}. O Oblix vai contar este torneio como entrada
                      via satélite e ligar os dois registros.
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {passo === 2 && (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                <CampoNumero
                  rotulo="Sua colocação"
                  valor={form.colocacao}
                  aoMudar={(v) => definir("colocacao", v)}
                  min={1}
                  placeholder="0"
                  erro={erro("colocacao")}
                />
                <CampoNumero
                  rotulo="Premiação"
                  dica="0 se não premiou"
                  valor={form.premiacao}
                  aoMudar={(v) => definir("premiacao", v)}
                  prefixo="R$"
                  min={0}
                  erro={erro("premiacao")}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <CampoNumero
                  rotulo="Rebuys"
                  dica="Total gasto, não a quantidade"
                  valor={form.rebuys}
                  aoMudar={(v) => definir("rebuys", v)}
                  prefixo="R$"
                  min={0}
                />
                <CampoNumero
                  rotulo="Add-on"
                  valor={form.addon}
                  aoMudar={(v) => definir("addon", v)}
                  prefixo="R$"
                  min={0}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <CampoNumero
                  rotulo="Horas jogadas"
                  valor={form.horas}
                  aoMudar={(v) => definir("horas", v)}
                  min={0}
                  placeholder="0"
                  erro={erro("horas")}
                />
                <CampoNumero
                  rotulo="Minutos"
                  valor={form.minutos}
                  aoMudar={(v) => definir("minutos", v)}
                  min={0}
                  max={59}
                  placeholder="0"
                />
              </div>

              {/* Retorno imediato: o jogador vê a conta fechar enquanto digita,
                  em vez de descobrir o resultado só depois de salvar. */}
              <dl className="grid grid-cols-3 gap-4 rounded-xl border border-hairline bg-sunken px-4 py-3.5">
                <div>
                  <dt className="rotulo">Investido</dt>
                  <dd className="numeros-tabulares mt-1 text-[15px] font-medium text-ink">
                    {moeda(investimento)}
                  </dd>
                </div>
                <div>
                  <dt className="rotulo">Entrada</dt>
                  <dd className="mt-1 text-[13px] text-ink-secondary">
                    {via === "satelite" ? "Via satélite" : "Direta"}
                  </dd>
                </div>
                <div>
                  <dt className="rotulo">Resultado</dt>
                  <dd
                    className="numeros-tabulares mt-1 text-[15px] font-medium"
                    style={{
                      color: saldo >= 0 ? "var(--color-positivo)" : "var(--color-negativo)",
                    }}
                  >
                    {moedaComSinal(saldo)}
                  </dd>
                </div>
              </dl>
            </>
          )}

          {passo === 3 && (
            <>
              <EscalaEnergia valor={form.energia} aoMudar={(v) => definir("energia", v)} />

              <div className="border-t border-hairline pt-5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[12.5px] font-medium text-ink-secondary">
                    Nota de disciplina
                  </span>
                  <span className="numeros-tabulares text-[17px] font-semibold text-ink">
                    {form.notaDisciplina.toFixed(1).replace(".", ",")}
                    <span className="text-[12px] font-normal text-ink-faint"> / 10</span>
                  </span>
                </div>
                <p className="mt-0.5 text-[11.5px] text-ink-muted">
                  Quanto você jogou o seu jogo, independente do resultado.
                </p>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={0.5}
                  value={form.notaDisciplina}
                  onChange={(e) => definir("notaDisciplina", Number(e.target.value))}
                  aria-label="Nota de disciplina, de 0 a 10"
                  className="mt-3 w-full accent-[var(--color-positivo)]"
                />
              </div>

              <div className="space-y-5 border-t border-hairline pt-5">
                <CampoTextoLongo
                  rotulo="Melhor decisão"
                  dica="Opcional"
                  placeholder="Fold de dois pares no turn contra o nit."
                  valor={form.melhorDecisao}
                  aoMudar={(v) => definir("melhorDecisao", v)}
                  linhas={2}
                />
                <CampoTextoLongo
                  rotulo="Pior decisão"
                  dica="Opcional"
                  placeholder="Call de river que eu sabia estar perdendo."
                  valor={form.piorDecisao}
                  aoMudar={(v) => definir("piorDecisao", v)}
                  linhas={2}
                />
                <CampoTextoLongo
                  rotulo="Aprendizado"
                  dica="Opcional — é o que você vai reler daqui a três meses"
                  placeholder="A bolha é onde eu mais perco valor."
                  valor={form.aprendizado}
                  aoMudar={(v) => definir("aprendizado", v)}
                />

                <SaudeDaSessao
                  ultima={ultimaMedicao}
                  hoje={hoje}
                  valor={medicao}
                  aoMudar={setMedicao}
                />
              </div>
            </>
          )}
        </div>
      </section>

      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            setTentouAvancar(false);
            setPasso(Math.max(0, passo - 1));
          }}
          disabled={passo === 0}
          className="cursor-pointer rounded-xl border border-hairline px-4 py-2.5 text-[13.5px] font-medium text-ink-secondary transition-colors duration-200 hover:border-hairline-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
        >
          Voltar
        </button>

        <button
          type="button"
          onClick={avancar}
          className="cursor-pointer rounded-xl bg-[var(--color-positivo)] px-6 py-2.5 text-[13.5px] font-semibold text-plane transition-opacity duration-200 hover:opacity-90"
        >
          {passo === PASSOS.length - 1 ? "Salvar torneio" : "Continuar"}
        </button>
      </div>

      {tentouAvancar && !podeAvancar && (
        <p role="alert" className="mt-3 text-right text-[12px]" style={{ color: "var(--color-negativo)" }}>
          Confira os campos marcados acima.
        </p>
      )}
    </main>
  );
}

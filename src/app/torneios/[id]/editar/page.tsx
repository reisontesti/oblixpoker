"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { EscalaEnergia } from "@/components/torneios/EscalaEnergia";
import { CampoEscolha, CampoNumero, CampoTexto, CampoTextoLongo } from "@/components/ui/Campo";
import { Vazio } from "@/components/ui/Vazio";
import { atualizarTorneio, ehRegistroProprio } from "@/lib/data/repositorio";
import { moeda } from "@/lib/format";
import { useClubes, useRegistros } from "@/lib/painel";
import type { NivelEnergia } from "@/lib/types";
import { anunciar } from "@/components/ui/Aviso";

/**
 * Corrigir um torneio já registrado.
 *
 * Existe porque a alternativa era punitiva além da conta: um dígito errado na
 * premiação custava apagar o registro e digitar as quinze respostas de novo. O
 * erro mais comum que existe não pode ter o preço mais alto do produto — é
 * assim que alguém decide parar de registrar.
 *
 * Tudo numa tela só, sem etapas. O assistente de criação existe para guiar quem
 * está preenchendo pela primeira vez; quem veio corrigir já sabe o que quer
 * mudar e só precisa chegar no campo.
 */
export default function EditarTorneio() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { torneios, satelites, perfil } = useRegistros();
  const clubes = useClubes();

  const torneio = torneios.find((t) => t.id === id) ?? null;
  const satelite = satelites.find((s) => s.torneioId === id) ?? null;

  // Tipado à mão porque `CampoNumero` devolve `null` quando o campo é apagado:
  // deixar a inferência partir dos valores iniciais fixaria `number` e recusaria
  // exatamente o estado intermediário de quem está corrigindo um número.
  interface Formulario {
    data: string;
    nome: string;
    clube: string;
    buyIn: number | null;
    jogadores: number | null;
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
    jogouSatelite: string;
    satNome: string;
    satBuyIn: number | null;
    satEntradas: number | null;
    satJogadores: number | null;
    satClassificou: string;
    satPosicao: number | null;
  }

  const [form, setForm] = useState<Formulario>(() => ({
    data: torneio ? torneio.data.slice(0, 10) : "",
    nome: torneio?.nome ?? "",
    clube: torneio?.clube ?? "",
    buyIn: torneio?.buyIn ?? null,
    jogadores: torneio?.jogadores ?? null,
    colocacao: torneio?.colocacao ?? null,
    premiacao: torneio?.premiacao ?? 0,
    rebuys: torneio?.rebuys ?? 0,
    addon: torneio?.addon ?? 0,
    horas: torneio ? Math.floor(torneio.duracaoMin / 60) : null,
    minutos: torneio ? torneio.duracaoMin % 60 : null,
    energia: (torneio?.energia ?? "normal") as NivelEnergia,
    notaDisciplina: torneio?.notaDisciplina ?? 8,
    melhorDecisao: torneio?.melhorDecisao ?? "",
    piorDecisao: torneio?.piorDecisao ?? "",
    aprendizado: torneio?.aprendizado ?? "",
    jogouSatelite: satelite ? "sim" : "nao",
    satNome: satelite?.nome ?? "",
    satBuyIn: satelite?.buyIn ?? null,
    satEntradas: satelite?.entradas ?? 1,
    satJogadores: satelite?.jogadores ?? null,
    satClassificou: satelite?.classificou ? "sim" : "nao",
    satPosicao: satelite?.posicao ?? null,
  }));
  const [tentou, setTentou] = useState(false);

  const definir = <K extends keyof typeof form>(chave: K, valor: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [chave]: valor }));

  if (!torneio || !ehRegistroProprio(torneio.id)) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-7 sm:py-10">
        <div className="placa grao relative overflow-hidden">
          <div aria-hidden className="grao-camada rounded-[20px]" />
          <Vazio
            titulo={torneio ? "Este torneio é da demonstração" : "Torneio não encontrado"}
            corpo={
              torneio
                ? "A base de demonstração é leitura: editá-la faria os números do onboarding divergirem entre dois navegadores. Só o que você registrou pode ser corrigido."
                : "Ele pode ter sido apagado, ou o endereço está errado."
            }
            acao={{ rotulo: "Ver o histórico", href: "/torneios" }}
          />
        </div>
      </main>
    );
  }

  // A via continua deduzida, e não perguntada: só é entrada via satélite quem
  // jogou E classificou. Reabrir isso num campo à parte deixaria os dados se
  // contradizerem justamente na coluna de que todo o comparativo depende.
  const via = form.jogouSatelite === "sim" && form.satClassificou === "sim" ? "satelite" : "direto";
  const duracaoMin = (form.horas ?? 0) * 60 + (form.minutos ?? 0);

  const erros = {
    nome: !form.nome.trim() ? "Dê um nome ao torneio" : undefined,
    buyIn: !form.buyIn || form.buyIn <= 0 ? "Informe o buy-in de balcão" : undefined,
    jogadores: !form.jogadores || form.jogadores < 2 ? "Informe o campo" : undefined,
    colocacao:
      form.colocacao && form.jogadores && form.colocacao > form.jogadores
        ? `Não pode passar de ${form.jogadores}`
        : undefined,
    horas: duracaoMin <= 0 ? "Informe quanto tempo jogou" : undefined,
  };
  const erro = (c: keyof typeof erros) => (tentou ? erros[c] : undefined);
  const valido = !Object.values(erros).some(Boolean);

  function salvar() {
    setTentou(true);
    if (!valido) return;

    atualizarTorneio(
      id,
      {
        data: new Date(`${form.data}T20:00:00.000Z`).toISOString(),
        nome: form.nome.trim(),
        clube: form.clube,
        modalidade: torneio!.modalidade || perfil.modalidade,
        buyIn: form.buyIn ?? 0,
        rebuys: form.rebuys ?? 0,
        addon: form.addon ?? 0,
        jogadores: form.jogadores ?? 0,
        colocacao: form.colocacao,
        premiacao: form.premiacao ?? 0,
        duracaoMin,
        via,
        energia: form.energia,
        notaDisciplina: form.notaDisciplina,
        melhorDecisao: form.melhorDecisao.trim() || undefined,
        piorDecisao: form.piorDecisao.trim() || undefined,
        aprendizado: form.aprendizado.trim() || undefined,
      },
      form.jogouSatelite === "sim"
        ? {
            nome: form.satNome.trim() || `Satélite ${form.nome.trim()}`,
            clube: form.clube,
            data: satelite?.data ?? new Date(`${form.data}T16:00:00.000Z`).toISOString(),
            buyIn: form.satBuyIn ?? 0,
            entradas: form.satEntradas ?? 1,
            jogadores: form.satJogadores ?? 0,
            classificou: form.satClassificou === "sim",
            posicao: form.satPosicao,
            tempoJogadoMin: satelite?.tempoJogadoMin ?? 0,
            observacoes: satelite?.observacoes,
          }
        : null,
    );
    anunciar("Torneio atualizado.");
    router.push("/torneios");
  }

  const custoEntrada =
    via === "satelite" ? (form.satBuyIn ?? 0) * (form.satEntradas ?? 0) : (form.buyIn ?? 0);
  const saldo = (form.premiacao ?? 0) - (custoEntrada + (form.rebuys ?? 0) + (form.addon ?? 0));

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-7 sm:py-10">
      <header className="surgir flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="texto-display text-ink">
            Corrigir torneio
          </h1>
          <p className="mt-1 truncate text-[13px] text-ink-secondary">{torneio.nome}</p>
        </div>
        <Link
          href="/torneios"
          className="shrink-0 text-[13px] text-ink-muted transition-colors duration-200 hover:text-ink"
        >
          Cancelar
        </Link>
      </header>

      <section className="placa grao surgir relative mt-6 overflow-hidden">
        <div aria-hidden className="grao-camada rounded-[20px]" />
        <div className="relative space-y-5 px-5 py-6 sm:px-7">
          <div className="grid gap-5 sm:grid-cols-2">
            <CampoTexto rotulo="Data" tipo="date" valor={form.data} aoMudar={(v) => definir("data", v)} />
            <CampoTexto
              rotulo="Clube"
              valor={form.clube}
              aoMudar={(v) => definir("clube", v)}
              sugestoes={clubes}
            />
          </div>
          <CampoTexto
            rotulo="Nome do torneio"
            valor={form.nome}
            aoMudar={(v) => definir("nome", v)}
            erro={erro("nome")}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <CampoNumero
              rotulo="Buy-in de balcão"
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
              erro={erro("jogadores")}
            />
          </div>

          <div className="border-t border-hairline pt-5">
            <CampoEscolha
              rotulo="Jogou satélite para entrar?"
              valor={form.jogouSatelite}
              aoMudar={(v) => definir("jogouSatelite", v)}
              opcoes={[
                { valor: "nao", rotulo: "Não" },
                { valor: "sim", rotulo: "Sim" },
              ]}
            />
          </div>

          {form.jogouSatelite === "sim" && (
            <div className="space-y-5 rounded-2xl border border-hairline bg-sunken p-5">
              <CampoTexto
                rotulo="Nome do satélite"
                valor={form.satNome}
                aoMudar={(v) => definir("satNome", v)}
                placeholder={`Satélite ${form.nome}`}
              />
              <div className="grid gap-5 sm:grid-cols-2">
                <CampoNumero
                  rotulo="Buy-in do satélite"
                  valor={form.satBuyIn}
                  aoMudar={(v) => definir("satBuyIn", v)}
                  prefixo="R$"
                  min={0}
                />
                <CampoNumero
                  rotulo="Entradas"
                  dica="Contando re-entries"
                  valor={form.satEntradas}
                  aoMudar={(v) => definir("satEntradas", v)}
                  min={1}
                />
              </div>
              <CampoEscolha
                rotulo="Classificou?"
                dica="É isto que define se a entrada foi via satélite"
                valor={form.satClassificou}
                aoMudar={(v) => definir("satClassificou", v)}
                opcoes={[
                  { valor: "nao", rotulo: "Não" },
                  { valor: "sim", rotulo: "Sim" },
                ]}
              />
              <div className="grid gap-5 sm:grid-cols-2">
                <CampoNumero
                  rotulo="Posição no satélite"
                  valor={form.satPosicao}
                  aoMudar={(v) => definir("satPosicao", v)}
                  min={1}
                />
                <CampoNumero
                  rotulo="Jogadores no satélite"
                  valor={form.satJogadores}
                  aoMudar={(v) => definir("satJogadores", v)}
                  min={2}
                />
              </div>
            </div>
          )}

          <div className="grid gap-5 border-t border-hairline pt-5 sm:grid-cols-2">
            <CampoNumero
              rotulo="Colocação"
              valor={form.colocacao}
              aoMudar={(v) => definir("colocacao", v)}
              min={1}
              erro={erro("colocacao")}
            />
            <CampoNumero
              rotulo="Premiação"
              valor={form.premiacao}
              aoMudar={(v) => definir("premiacao", v)}
              prefixo="R$"
              min={0}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <CampoNumero
              rotulo="Rebuys"
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
              rotulo="Horas"
              valor={form.horas}
              aoMudar={(v) => definir("horas", v)}
              min={0}
              erro={erro("horas")}
            />
            <CampoNumero
              rotulo="Minutos"
              valor={form.minutos}
              aoMudar={(v) => definir("minutos", v)}
              min={0}
              max={59}
            />
          </div>

          <div className="border-t border-hairline pt-5">
            <EscalaEnergia valor={form.energia} aoMudar={(v) => definir("energia", v)} />
          </div>

          <fieldset>
            <legend className="text-[12.5px] font-medium text-ink-secondary">
              Nota de disciplina
            </legend>
            <div className="mt-3 flex items-center gap-4">
              <input
                type="range"
                min={0}
                max={10}
                step={0.5}
                value={form.notaDisciplina}
                onChange={(e) => definir("notaDisciplina", Number(e.target.value))}
                aria-label="Nota de disciplina de 0 a 10"
                className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-trilho accent-[var(--color-positivo)]"
              />
              <span className="numeros-tabulares w-12 text-right text-[17px] font-semibold text-ink">
                {form.notaDisciplina.toFixed(1).replace(".", ",")}
              </span>
            </div>
          </fieldset>

          <div className="grid gap-5 sm:grid-cols-2">
            <CampoTextoLongo
              rotulo="Melhor decisão"
              valor={form.melhorDecisao}
              aoMudar={(v) => definir("melhorDecisao", v)}
              linhas={2}
            />
            <CampoTextoLongo
              rotulo="Pior decisão"
              valor={form.piorDecisao}
              aoMudar={(v) => definir("piorDecisao", v)}
              linhas={2}
            />
          </div>
          <CampoTextoLongo
            rotulo="Aprendizado"
            valor={form.aprendizado}
            aoMudar={(v) => definir("aprendizado", v)}
          />

          <div className="flex flex-wrap items-baseline justify-between gap-3 rounded-xl border border-hairline bg-sunken px-4 py-3">
            <span className="text-[12.5px] text-ink-secondary">
              Entrada {via === "satelite" ? "via satélite" : "direta"} · investido{" "}
              {moeda(custoEntrada + (form.rebuys ?? 0) + (form.addon ?? 0))}
            </span>
            <span
              className="numeros-tabulares text-[15px] font-semibold"
              style={{ color: saldo >= 0 ? "var(--color-positivo)" : "var(--color-negativo)" }}
            >
              {saldo >= 0 ? "+" : "−"}
              {moeda(Math.abs(saldo))}
            </span>
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={salvar}
        className="surgir mt-5 w-full cursor-pointer rounded-xl bg-[var(--color-positivo)] px-5 py-3.5 text-[14.5px] font-semibold text-plane transition-transform duration-200 hover:brightness-110 active:scale-[0.99]"
      >
        Salvar correção
      </button>
    </main>
  );
}

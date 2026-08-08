"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Conclusao } from "@/components/torneios/Conclusao";
import { CurvaSessao } from "@/components/viz/CurvaSessao";
import { CampoNumero, CampoTextoLongo } from "@/components/ui/Campo";
import { Vazio } from "@/components/ui/Vazio";
import { concluirSessao } from "@/lib/data/repositorio";
import { curvaSessao, duracaoMin, lerSessao } from "@/lib/calc/sessao";
import { duracao, moeda } from "@/lib/format";
import { useRegistros } from "@/lib/painel";
import type { Torneio } from "@/lib/types";

/**
 * O fim do torneio: só aqui aparecem colocação e premiação.
 *
 * Duas perguntas que o formulário retroativo faz não existem nesta tela.
 * **Duração** vem do cronômetro, e não da memória de quem acabou de ser
 * eliminado às três da manhã. **Energia** foi respondida no começo, quando
 * ainda descrevia como a pessoa chegou — perguntada agora seria recordação
 * contaminada pelo resultado, e é justamente essa a variável que o Oblix cruza
 * com o desempenho.
 */
export default function Fechar() {
  const router = useRouter();
  const { sessao } = useRegistros();

  const [colocacao, setColocacao] = useState<number | null>(null);
  const [premiacao, setPremiacao] = useState<number | null>(0);
  const [rebuys, setRebuys] = useState<number | null>(0);
  const [addon, setAddon] = useState<number | null>(0);
  const [nota, setNota] = useState(8);
  const [melhor, setMelhor] = useState("");
  const [pior, setPior] = useState("");
  const [aprendizado, setAprendizado] = useState("");
  const [tentou, setTentou] = useState(false);
  const [salvo, setSalvo] = useState<{ torneio: Torneio; investimento: number } | null>(null);

  const curva = useMemo(() => (sessao ? curvaSessao(sessao) : []), [sessao]);

  if (salvo) {
    return (
      <main className="mx-auto w-full max-w-[86rem] px-4 py-10 sm:px-7 lg:px-10">
        <Conclusao
          torneio={salvo.torneio}
          investimento={salvo.investimento}
          aoRegistrarOutro={() => router.push("/torneios/novo")}
        />
      </main>
    );
  }

  if (!sessao) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-7 sm:py-10">
        <div className="placa grao relative overflow-hidden">
          <div aria-hidden className="grao-camada rounded-[20px]" />
          <Vazio
            titulo="Nenhuma sessão para fechar"
            corpo="Esta tela encerra um torneio que estava sendo acompanhado ao vivo. Não há nenhum em andamento agora."
            acao={{ rotulo: "Registrar um torneio", href: "/torneios/novo" }}
          />
        </div>
      </main>
    );
  }

  const erroColocacao =
    tentou && (!colocacao || colocacao < 1)
      ? "Informe em que lugar você terminou"
      : tentou && colocacao && colocacao > sessao.preparo.jogadores
        ? `Não pode ser maior que ${sessao.preparo.jogadores} jogadores`
        : undefined;

  // Relógio real, não o "hoje" do painel — ver a nota em `ao-vivo/page.tsx`.
  const agora = new Date();
  const minutos = duracaoMin(sessao, agora);
  const leitura = lerSessao(sessao, agora);

  function concluir() {
    setTentou(true);
    if (!colocacao || colocacao < 1 || colocacao > sessao!.preparo.jogadores) return;

    const investimento =
      (sessao!.preparo.via === "satelite" && sessao!.preparo.satelite
        ? sessao!.preparo.satelite.buyIn * sessao!.preparo.satelite.entradas
        : sessao!.preparo.buyIn) +
      (rebuys ?? 0) +
      (addon ?? 0);

    const torneio = concluirSessao({
      colocacao,
      premiacao: premiacao ?? 0,
      rebuys: rebuys ?? 0,
      addon: addon ?? 0,
      notaDisciplina: nota,
      melhorDecisao: melhor.trim() || undefined,
      piorDecisao: pior.trim() || undefined,
      aprendizado: aprendizado.trim() || undefined,
    });
    if (torneio) setSalvo({ torneio, investimento });
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-7 sm:py-10">
      <header className="surgir flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-[24px] leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-[28px]">
            Como terminou?
          </h1>
          <p className="mt-1 text-[13px] text-ink-secondary">
            {sessao.preparo.nome} · {duracao(minutos)} de jogo ·{" "}
            {sessao.paradas.length}{" "}
            {sessao.paradas.length === 1 ? "intervalo registrado" : "intervalos registrados"}
          </p>
        </div>
        <Link
          href="/torneios/ao-vivo"
          className="shrink-0 text-[13px] text-ink-muted transition-colors duration-200 hover:text-ink"
        >
          Voltar
        </Link>
      </header>

      {curva.length >= 2 && (
        <section className="placa grao surgir relative mt-6 overflow-hidden">
          <div aria-hidden className="grao-camada rounded-[20px]" />
          <div className="relative px-5 py-5 sm:px-6">
            <h2 className="rotulo">Sua trajetória</h2>
            {leitura && (
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-secondary">{leitura}</p>
            )}
            <div className="mt-4 min-w-0">
              <CurvaSessao pontos={curva} />
            </div>
          </div>
        </section>
      )}

      <section className="placa grao surgir relative mt-4 overflow-hidden">
        <div aria-hidden className="grao-camada rounded-[20px]" />
        <div className="relative space-y-5 px-5 py-6 sm:px-7">
          <div className="grid gap-5 sm:grid-cols-2">
            <CampoNumero
              rotulo="Colocação"
              dica={`Entre ${sessao.preparo.jogadores} jogadores`}
              valor={colocacao}
              aoMudar={setColocacao}
              min={1}
              max={sessao.preparo.jogadores}
              erro={erroColocacao}
            />
            <CampoNumero
              rotulo="Premiação"
              dica="Use 0 se não premiou"
              valor={premiacao}
              aoMudar={setPremiacao}
              prefixo="R$"
              min={0}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <CampoNumero
              rotulo="Rebuys"
              dica="Total gasto em re-entradas"
              valor={rebuys}
              aoMudar={setRebuys}
              prefixo="R$"
              min={0}
            />
            <CampoNumero
              rotulo="Add-on"
              valor={addon}
              aoMudar={setAddon}
              prefixo="R$"
              min={0}
            />
          </div>

          <fieldset>
            <legend className="text-[12.5px] font-medium text-ink-secondary">
              Nota de disciplina
            </legend>
            <p className="mt-0.5 text-[11.5px] text-ink-muted">
              Quanto você jogou pelo plano, e não pelo impulso. É a autoavaliação que o painel
              cruza com o resultado.
            </p>
            <div className="mt-3 flex items-center gap-4">
              <input
                type="range"
                min={0}
                max={10}
                step={0.5}
                value={nota}
                onChange={(e) => setNota(Number(e.target.value))}
                aria-label="Nota de disciplina de 0 a 10"
                className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/12 accent-[var(--color-positivo)]"
              />
              <span className="numeros-tabulares w-12 text-right text-[17px] font-semibold text-ink">
                {nota.toFixed(1).replace(".", ",")}
              </span>
            </div>
          </fieldset>

          <div className="grid gap-5 sm:grid-cols-2">
            <CampoTextoLongo
              rotulo="Melhor decisão"
              dica="Opcional"
              valor={melhor}
              aoMudar={setMelhor}
              linhas={2}
            />
            <CampoTextoLongo
              rotulo="Pior decisão"
              dica="Opcional"
              valor={pior}
              aoMudar={setPior}
              linhas={2}
            />
          </div>

          <CampoTextoLongo
            rotulo="Aprendizado"
            dica="Opcional — é o que você vai reler daqui a três meses"
            valor={aprendizado}
            aoMudar={setAprendizado}
          />

          {premiacao !== null && premiacao > 0 && (
            <p className="rounded-xl border border-hairline bg-sunken px-4 py-3 text-[12.5px] text-ink-secondary">
              Premiação de {moeda(premiacao)}. O Oblix vai perguntar se você quer apoiar o
              projeto — e &ldquo;agora não&rdquo; é uma resposta como qualquer outra.
            </p>
          )}
        </div>
      </section>

      <button
        type="button"
        onClick={concluir}
        className="surgir mt-5 w-full cursor-pointer rounded-xl bg-[var(--color-positivo)] px-5 py-3.5 text-[14.5px] font-semibold text-plane transition-transform duration-200 hover:brightness-110 active:scale-[0.99]"
      >
        Registrar torneio
      </button>
    </main>
  );
}

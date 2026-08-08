"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Placa } from "@/components/ui/Placa";
import { registrarResposta } from "@/lib/data/repositorio";
import { gerarCenario, julgar, situacoesFracas, type Julgamento } from "@/lib/treino/motor";
import {
  FASES,
  ROTULO_ACAO,
  ROTULO_FASE,
  ROTULO_SITUACAO,
  type Acao,
  type Cenario,
  type Fase,
  type Situacao,
} from "@/lib/treino/tipos";
import { useRegistros } from "@/lib/painel";

/**
 * A sessão de treino.
 *
 * Tudo aqui obedece a uma regra: **durante a decisão, só o que é preciso para
 * decidir; depois dela, o que é preciso para aprender** (§26). Explicação antes
 * da resposta seria colar; informação de menos depois seria um quiz.
 *
 * O ciclo é curto de propósito — ver, decidir, entender, próxima. Um treino que
 * exige rolar a tela entre cada mão não é usado no intervalo de um torneio.
 */
/**
 * O relógio, fora do componente.
 *
 * `Date.now` é impuro, e a regra de pureza do React vale para tudo que mora no
 * corpo de um componente — mesmo dentro de um manipulador, onde na prática é
 * seguro. Isolar num módulo deixa a intenção explícita em vez de silenciar o
 * aviso.
 */
const agora = () => Date.now();

/** Fora do componente pelo mesmo motivo que `agora`: `Math.random` é impura. */
const novaSemente = () => Math.floor(Math.random() * 1e9);

export default function Sessao() {
  return (
    <Suspense fallback={null}>
      <Conteudo />
    </Suspense>
  );
}

function Conteudo() {
  const params = useSearchParams();
  const { treino, pronto } = useRegistros();

  const fase = (FASES.includes(params.get("fase") as Fase) ? params.get("fase") : "inicio") as Fase;
  const total = Math.max(1, Math.min(100, Number(params.get("n") ?? 25) || 25));

  /**
   * A semente nasce DEPOIS da montagem, não durante o render.
   *
   * Sorteá-la no render faria o servidor gerar um cenário e o cliente gerar
   * outro — a página é pré-renderizada, então os dois acontecem de verdade e a
   * hidratação quebra. O mesmo vale para o foco adaptativo, que depende do
   * histórico local: no servidor ele é sempre vazio.
   *
   * Uma vez sorteada, não muda: a sessão inteira é reproduzível a partir do
   * número, e nenhum re-render troca o cenário embaixo de quem está decidindo.
   */
  const [semente, setSemente] = useState<number | null>(null);
  const [focar, setFocar] = useState<Situacao[]>([]);

  // Semeia no primeiro render em que o cliente já leu o histórico — `pronto`
  // é falso no servidor, então lá só sai o esqueleto e a hidratação bate.
  // Ajustar estado durante o render (e não num efeito) é o caminho que o React
  // recomenda para estado derivado: re-renderiza antes de pintar, sem cascata.
  if (pronto && semente === null) {
    setSemente(novaSemente());
    setFocar(situacoesFracas(treino, fase));
  }

  const [indice, setIndice] = useState(0);
  const [julgamento, setJulgamento] = useState<Julgamento | null>(null);
  const [acertos, setAcertos] = useState(0);
  const [sequencia, setSequencia] = useState(0);
  const [terminou, setTerminou] = useState(false);
  const abertoEm = useRef(0);

  const cenario = useMemo(
    () => (semente === null ? null : gerarCenario({ fase, semente: semente + indice * 7919, focar })),
    [fase, semente, indice, focar],
  );

  // O relógio começa quando o cenário APARECE, não quando o componente monta:
  // é o tempo de decisão que interessa, e ele também não pode ser lido durante
  // o render — leitura impura produz valores que mudam a cada re-render.
  useEffect(() => {
    abertoEm.current = agora();
  }, [cenario?.id]);

  function responder(acao: Acao) {
    if (julgamento || !cenario) return;
    const j = julgar(cenario, acao);
    setJulgamento(j);
    if (j.correta) {
      setAcertos((a) => a + 1);
      setSequencia((s) => s + 1);
    } else {
      setSequencia(0);
    }
    registrarResposta({
      fase: cenario.fase,
      situacao: cenario.situacao,
      posicao: cenario.posicao,
      stackEfetivoBB: cenario.stackEfetivoBB,
      jogadoresNaMesa: cenario.jogadoresNaMesa,
      mao: cenario.mao,
      escolhida: acao,
      preferida: j.recomendacao.preferida,
      frequenciaDaEscolha: j.frequenciaDaEscolha,
      correta: j.correta,
      tempoMs: agora() - abertoEm.current,
    });
  }

  function proxima() {
    if (indice + 1 >= total) {
      setTerminou(true);
      return;
    }
    setIndice((i) => i + 1);
    setJulgamento(null);
  }

  if (terminou) {
    return <Fim fase={fase} total={total} acertos={acertos} />;
  }

  // Enquanto a semente não existe, servidor e cliente desenham a mesma coisa.
  if (!cenario) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-7 sm:py-8">
        <div className="h-64 animate-pulse rounded-[20px] border border-hairline bg-sunken" />
      </main>
    );
  }

  const pct = Math.round((acertos / Math.max(1, indice + (julgamento ? 1 : 0))) * 100);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-7 sm:py-8">
      <header className="surgir flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="flex items-baseline gap-3">
          <span className="numeros-tabulares text-[13px] font-medium text-ink">
            Decisão {indice + 1}/{total}
          </span>
          <span className="text-[12px] text-ink-muted">{ROTULO_FASE[fase]}</span>
        </div>
        <div className="flex items-baseline gap-4 text-[12px] text-ink-muted">
          {indice > 0 && <span className="numeros-tabulares">{pct}% de acerto</span>}
          {sequencia >= 3 && (
            <span style={{ color: "var(--color-positivo)" }}>{sequencia} seguidas</span>
          )}
          <Link
            href="/treino"
            className="-my-2 flex min-h-[var(--toque)] items-center rounded-lg px-2.5 transition-colors duration-200 hover:bg-realce hover:text-ink"
          >
            Sair
          </Link>
        </div>
      </header>

      <div className="surgir mt-3 h-[3px] overflow-hidden rounded-full bg-trilho">
        <div
          className="h-full rounded-full bg-[var(--color-positivo)] transition-[width] duration-500"
          style={{ width: `${(indice / total) * 100}%` }}
        />
      </div>

      <MesaDaDecisao cenario={cenario} />

      {julgamento ? (
        <Feedback julgamento={julgamento} aoContinuar={proxima} />
      ) : (
        <div className="surgir mt-4 grid grid-cols-2 gap-2.5">
          {cenario.acoesDisponiveis.map((acao) => (
            <button
              key={acao}
              type="button"
              onClick={() => responder(acao)}
              className={`cursor-pointer rounded-2xl px-5 py-4 text-[15px] font-semibold transition-transform duration-200 active:scale-[0.985] ${
                acao === "fold"
                  ? "border border-hairline text-ink-secondary hover:border-hairline-strong hover:text-ink"
                  : "bg-[var(--color-positivo)] text-plane hover:brightness-110"
              }`}
            >
              {ROTULO_ACAO[acao]}
            </button>
          ))}
        </div>
      )}
    </main>
  );
}

/**
 * A mesa como o jogador precisa lê-la para decidir.
 *
 * A mão vem grande e no centro: é o dado que o olho procura primeiro. Stack e
 * posição vêm logo acima porque mudam o significado da mão — KJs no botão com
 * 40 BB e KJs em UTG com 12 BB são decisões opostas.
 */
function MesaDaDecisao({ cenario }: { cenario: Cenario }) {
  const naipes = ["♠", "♥"];
  return (
    <section className="placa grao surgir relative mt-4 overflow-hidden">
      <div aria-hidden className="grao-camada rounded-[20px]" />
      <div className="relative px-5 py-6 sm:px-7">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <span className="rotulo">
            {ROTULO_FASE[cenario.fase]} · {ROTULO_SITUACAO[cenario.situacao]}
          </span>
          <span className="text-[12px] text-ink-muted">
            {cenario.jogadoresNaMesa} na mesa
          </span>
        </div>

        <div className="mt-5 flex flex-wrap items-baseline gap-x-8 gap-y-3">
          <span>
            <span className="numeros-tabulares text-[34px] leading-none font-semibold text-ink">
              {cenario.stackEfetivoBB}
            </span>
            <span className="ml-1.5 text-[14px] text-ink-secondary">BB</span>
          </span>
          <span className="text-[15px] text-ink">
            Você está no <strong className="font-semibold">{cenario.posicao}</strong>
          </span>
        </div>

        {cenario.premiacao && (
          <p className="mt-3 rounded-xl border border-hairline bg-sunken px-3.5 py-2.5 text-[12.5px] leading-relaxed text-ink-secondary">
            {cenario.premiacao.jogadoresRestantes} jogadores restantes ·{" "}
            {cenario.premiacao.jogadoresPremiados} premiam · você é o{" "}
            {cenario.premiacao.posicaoNoRanking}º em fichas
            {cenario.premiacao.stacksCurtos > 0 &&
              ` · ${cenario.premiacao.stacksCurtos} ${cenario.premiacao.stacksCurtos === 1 ? "stack abaixo" : "stacks abaixo"} de 10 BB`}
          </p>
        )}

        {cenario.adversarios.length > 0 && (
          <>
            {/* Sem este rótulo, "7 na mesa" ao lado de três stacks lidos como
                lista completa parece contradição. São os que AINDA VÃO AGIR —
                os únicos cujos stacks mudam a decisão, porque são eles que
                podem reaumentar. */}
            <p className="mt-4 text-[12px] font-semibold tracking-[0.16em] text-ink-faint uppercase">
              {cenario.situacao === "vs_shove" ? "Na mão" : "Ainda vão agir"}
            </p>
            <ul className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1.5">
              {cenario.adversarios.map((a) => (
                <li key={a.posicao} className="text-[12.5px] text-ink-secondary">
                <span className="text-ink-muted">{a.posicao}</span>{" "}
                <span className="numeros-tabulares">{a.stackBB} BB</span>
                {a.acao === "allin" && (
                  <span className="ml-1.5 font-medium" style={{ color: "var(--color-atencao)" }}>
                    all-in
                  </span>
                )}
              </li>
              ))}
            </ul>
          </>
        )}

        <p className="mt-4 text-[13px] text-ink-secondary">{cenario.acaoAnterior}</p>

        <div className="mt-5 flex items-center justify-center gap-2.5 border-t border-hairline pt-6">
          {[cenario.mao[0], cenario.mao[1]].map((carta, i) => {
            const mesmoNaipe = cenario.mao.endsWith("s");
            const naipe = mesmoNaipe ? naipes[0] : naipes[i];
            const vermelho = naipe === "♥";
            return (
              <span
                key={i}
                className="grid h-[74px] w-[54px] place-items-center rounded-xl border border-hairline-strong bg-raised"
              >
                <span className="text-center leading-none">
                  <span className="block text-[26px] font-semibold text-ink">{carta}</span>
                  <span
                    className="mt-0.5 block text-[15px]"
                    style={{ color: vermelho ? "var(--color-negativo)" : "var(--color-ink-secondary)" }}
                  >
                    {naipe}
                  </span>
                </span>
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Feedback({
  julgamento,
  aoContinuar,
}: {
  julgamento: Julgamento;
  aoContinuar: () => void;
}) {
  const { correta, recomendacao, titulo, frequenciaDaEscolha } = julgamento;
  const cor = correta ? "var(--color-positivo)" : "var(--color-atencao)";

  return (
    <section className="placa grao surgir relative mt-4 overflow-hidden">
      <div aria-hidden className="grao-camada rounded-[20px]" />
      <div className="relative px-5 py-5 sm:px-7">
        <p className="text-[16px] font-semibold" style={{ color: cor }}>
          {titulo}
        </p>

        {/* As frequências, sempre. Poker pré-flop não é binário, e mostrar a
            mistura ensina a pensar em range em vez de decorar resposta. */}
        <ul className="mt-4 space-y-2">
          {recomendacao.acoes.map((a) => (
            <li key={a.acao} className="flex items-center gap-3">
              <span className="w-14 shrink-0 text-[12.5px] text-ink-secondary">
                {ROTULO_ACAO[a.acao]}
              </span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-trilho">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${a.frequencia * 100}%`,
                    background: a.acao === recomendacao.preferida ? cor : "var(--color-ink-faint)",
                  }}
                />
              </span>
              <span className="numeros-tabulares w-10 shrink-0 text-right text-[12.5px] text-ink">
                {Math.round(a.frequencia * 100)}%
              </span>
              {a.tamanhoBB && (
                <span className="w-14 shrink-0 text-[12px] text-ink-muted">{a.tamanhoBB} BB</span>
              )}
            </li>
          ))}
        </ul>

        {!correta && frequenciaDaEscolha > 0 && (
          <p className="mt-3 text-[12px] text-ink-muted">
            Sua escolha não está fora do range — ela aparece em{" "}
            {Math.round(frequenciaDaEscolha * 100)}% das vezes —, mas há uma opção melhor aqui.
          </p>
        )}

        <p className="mt-4 border-t border-hairline pt-4 text-[13px] leading-relaxed text-ink-secondary">
          {recomendacao.explicacao}
        </p>

        <button
          type="button"
          onClick={aoContinuar}
          autoFocus
          className="mt-5 w-full cursor-pointer rounded-xl bg-raised px-5 py-3 text-[14px] font-semibold text-ink ring-1 ring-hairline-strong transition-colors duration-200 hover:bg-white/8"
        >
          Próxima decisão
        </button>
      </div>
    </section>
  );
}

function Fim({ fase, total, acertos }: { fase: Fase; total: number; acertos: number }) {
  const { treino } = useRegistros();
  const pct = Math.round((acertos / total) * 100);
  const fracas = situacoesFracas(treino, fase);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-7">
      <Placa luz>
        <div className="px-6 py-9 text-center sm:px-8">
          <p className="rotulo">Treino concluído</p>
          <p className="mt-4 text-[clamp(3rem,12vw,4.5rem)] leading-none font-semibold text-ink">
            {pct}%
          </p>
          <p className="mt-3 text-[13.5px] text-ink-secondary">
            {acertos} de {total} decisões em {ROTULO_FASE[fase]}
          </p>

          {fracas.length > 0 && (
            <p className="mx-auto mt-6 max-w-sm rounded-xl border border-hairline bg-sunken px-4 py-3 text-[12.5px] leading-relaxed text-ink-secondary">
              Sua maior dificuldade nesta fase:{" "}
              <strong className="font-medium text-ink">{ROTULO_SITUACAO[fracas[0]]}</strong>. O
              Oblix vai insistir nisso no próximo treino.
            </p>
          )}

          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <Link
              href={`/treino/sessao?fase=${fase}&n=${total}`}
              className="cursor-pointer rounded-xl bg-[var(--color-positivo)] px-6 py-3 text-[14px] font-semibold text-plane transition-transform duration-200 hover:brightness-110 active:scale-[0.985]"
            >
              Treinar de novo
            </Link>
            <Link
              href="/treino"
              className="cursor-pointer rounded-xl border border-hairline px-6 py-3 text-[14px] font-medium text-ink-secondary transition-colors duration-200 hover:border-hairline-strong hover:text-ink"
            >
              Ver todas as fases
            </Link>
          </div>
        </div>
      </Placa>
    </main>
  );
}

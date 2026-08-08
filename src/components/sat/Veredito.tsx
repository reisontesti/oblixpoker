"use client";

import type { Decomposicao, Recomendacao } from "@/lib/calc/satelites";
import { moedaComSinal } from "@/lib/format";

const ESTILO = {
  favoravel: {
    rotulo: "Compensa jogar o satélite",
    cor: "var(--color-positivo)",
    icone: "✓",
  },
  neutro: {
    rotulo: "Sem vantagem clara",
    cor: "var(--color-ink-secondary)",
    icone: "=",
  },
  contrario: {
    rotulo: "Melhor entrar direto",
    cor: "var(--color-atencao)",
    icone: "!",
  },
} as const;

/**
 * A resposta, em cima de tudo. O Oblix não parte do princípio de que satélite
 * é bom nem de que é ruim — mostra o veredito e, logo abaixo, as contas que
 * levaram até ele, para o jogador poder discordar com fundamento.
 */
/** Uma parcela da conta: rótulo, valor com sinal e a explicação em uma linha. */
function Parcela({
  rotulo,
  valor,
  descricao,
  destaque = false,
}: {
  rotulo: string;
  valor: number;
  descricao: string;
  destaque?: boolean;
}) {
  const cor = valor >= 0 ? "var(--color-positivo)" : "var(--color-negativo)";
  return (
    <div className={destaque ? "sm:pl-6 sm:border-l sm:border-hairline" : ""}>
      <p className="rotulo">{rotulo}</p>
      <p
        className={`numeros-tabulares mt-2 font-semibold ${destaque ? "text-[28px]" : "text-[22px]"}`}
        style={{ color: cor }}
      >
        {moedaComSinal(valor)}
      </p>
      <p className="mt-1 text-[11.5px] leading-snug text-ink-muted">{descricao}</p>
    </div>
  );
}

export function Veredito({
  recomendacao,
  decomposicao,
  amostraSuficiente,
}: {
  recomendacao: Recomendacao;
  decomposicao: Decomposicao;
  amostraSuficiente: boolean;
}) {
  const estilo = ESTILO[recomendacao.veredito];

  return (
    <section className="placa surgir grao relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px overflow-hidden rounded-[20px]"
      >
        <div
          className="absolute -top-48 left-0 h-96 w-[38rem] rounded-full blur-3xl"
          style={{
            background: `radial-gradient(closest-side, color-mix(in oklab, ${estilo.cor} 16%, transparent), transparent)`,
          }}
        />
      </div>
      <div aria-hidden className="grao-camada rounded-[20px]" />

      <div className="relative px-6 py-7 sm:px-8 sm:py-9">
        <span
          className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11.5px] font-medium"
          style={{
            color: estilo.cor,
            background: "color-mix(in oklab, currentColor 13%, transparent)",
          }}
        >
          <span aria-hidden className="text-[10px]">
            {estilo.icone}
          </span>
          {estilo.rotulo}
        </span>

        <h2 className="mt-5 max-w-2xl text-[clamp(1.5rem,3.4vw,2.1rem)] leading-[1.15] font-semibold tracking-[-0.024em] text-ink">
          {recomendacao.titulo}
        </h2>

        <p className="mt-4 max-w-2xl text-[14.5px] leading-relaxed text-ink-secondary">
          {recomendacao.corpo}
        </p>

        {amostraSuficiente && (
          <div className="mt-8 border-t border-hairline pt-6">
            <p className="rotulo">A conta, por torneio</p>
            <div className="mt-4 grid gap-6 sm:grid-cols-3">
              <Parcela
                rotulo="Economia na vaga"
                valor={decomposicao.economiaEntrada}
                descricao="O que o satélite poupa na entrada"
              />
              <Parcela
                rotulo="Diferença na mesa"
                valor={decomposicao.diferencaDesempenho}
                descricao="O que muda no seu desempenho jogando"
              />
              <Parcela
                rotulo="Saldo"
                valor={decomposicao.saldo}
                descricao="A soma das duas — o efeito real no bolso"
                destaque
              />
            </div>
          </div>
        )}

        {recomendacao.evidencias.length > 0 && (
          <div className="mt-7 border-t border-hairline pt-5">
            <p className="rotulo">No que isso se apoia</p>
            <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {recomendacao.evidencias.map((evidencia) => (
                <li key={evidencia} className="flex gap-2.5">
                  <span aria-hidden className="mt-[7px] size-1 shrink-0 rounded-full bg-ink-faint" />
                  <span className="text-[12.5px] leading-relaxed text-ink-secondary">
                    {evidencia}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

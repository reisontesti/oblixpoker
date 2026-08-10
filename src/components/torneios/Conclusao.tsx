"use client";

import Link from "next/link";
import { useState } from "react";
import { CampoNumero } from "@/components/ui/Campo";
import { Pix, pixConfigurado } from "@/components/torneios/Pix";
import { moeda, moedaComSinal, ordinal } from "@/lib/format";
import type { Torneio } from "@/lib/types";

interface Props {
  torneio: Torneio;
  investimento: number;
  aoRegistrarOutro: () => void;
}

const FATIAS = [0.05, 0.1, 0.15];

/**
 * O pedido de apoio do PRD, mostrado só quando houve premiação.
 *
 * Regra que este componente segue de propósito: "Agora não" é um botão de
 * verdade, do mesmo tamanho e com o mesmo contraste dos outros. Um produto
 * gratuito que esconde a saída do pedido de doação deixa de parecer gratuito —
 * e o PRD é explícito de que o Oblix é grátis e continua grátis.
 */
function PedidoDeApoio({ premiacao }: { premiacao: number }) {
  const [escolha, setEscolha] = useState<number | "outro" | null>(null);
  const [outroValor, setOutroValor] = useState<number | null>(null);
  const [estado, setEstado] = useState<"perguntando" | "agradecendo" | "dispensado">(
    "perguntando",
  );

  const valorEscolhido =
    escolha === "outro" ? outroValor : escolha !== null ? Math.round(premiacao * escolha) : null;

  if (estado === "agradecendo") {
    // Com Pix configurado, o agradecimento JÁ é o meio de pagar: mandar a
    // pessoa para outra tela depois de ela decidir apoiar é onde a intenção
    // morre. Sem chave configurada, o texto diz a verdade em vez de encenar
    // uma transação que não existe.
    if (pixConfigurado && valorEscolhido && valorEscolhido > 0) {
      return <Pix valor={valorEscolhido} />;
    }
    return (
      <div className="surgir rounded-2xl border border-hairline bg-sunken px-5 py-6 text-center">
        <p className="text-[15px] font-medium text-ink">Obrigado de verdade.</p>
        <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-ink-secondary">
          Sua intenção de apoiar {valorEscolhido ? `com ${moeda(valorEscolhido)} ` : ""}
          ficou registrada. O meio de pagamento ainda não está ligado — quando
          estiver, o Oblix te avisa. Nada é cobrado agora.
        </p>
      </div>
    );
  }

  if (estado === "dispensado") {
    return (
      <div className="rounded-2xl border border-hairline bg-sunken px-5 py-5 text-center">
        <p className="text-[13px] text-ink-secondary">
          Combinado. O Oblix segue gratuito, e o pedido não volta neste torneio.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-hairline bg-sunken p-5 sm:p-6">
      <p className="text-[15px] leading-snug font-medium text-ink">
        Parabéns! Se o Oblix contribuiu para essa conquista, considere apoiar o
        projeto.
      </p>
      <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">
        O produto é gratuito e continua gratuito — com ou sem apoio, nada aqui
        fica bloqueado.
      </p>

      <div className="mt-5 grid grid-cols-3 gap-2">
        {FATIAS.map((fatia) => {
          const ativo = escolha === fatia;
          return (
            <button
              key={fatia}
              type="button"
              onClick={() => setEscolha(fatia)}
              aria-pressed={ativo}
              className={`cursor-pointer rounded-xl border px-3 py-3 transition-all duration-200 ${
                ativo
                  ? "border-transparent bg-raised ring-1 ring-[var(--color-positivo)]"
                  : "border-hairline hover:border-hairline-strong"
              }`}
            >
              <span
                className={`block text-[16px] font-semibold ${ativo ? "text-ink" : "text-ink-secondary"}`}
              >
                {Math.round(fatia * 100)}%
              </span>
              <span className="numeros-tabulares mt-0.5 block text-[12px] text-ink-muted">
                {moeda(premiacao * fatia)}
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setEscolha("outro")}
        aria-pressed={escolha === "outro"}
        className={`mt-2 w-full cursor-pointer rounded-xl border px-3 py-2.5 text-[13px] transition-all duration-200 ${
          escolha === "outro"
            ? "border-transparent bg-raised text-ink ring-1 ring-[var(--color-positivo)]"
            : "border-hairline text-ink-secondary hover:border-hairline-strong hover:text-ink"
        }`}
      >
        Outro valor
      </button>

      {escolha === "outro" && (
        <div className="mt-3">
          <CampoNumero
            rotulo="Quanto você gostaria de apoiar?"
            valor={outroValor}
            aoMudar={setOutroValor}
            prefixo="R$"
            min={1}
            placeholder="0"
          />
        </div>
      )}

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={!valorEscolhido || valorEscolhido <= 0}
          onClick={() => setEstado("agradecendo")}
          className="flex-1 cursor-pointer rounded-xl bg-[var(--color-positivo)] px-4 py-2.5 text-[13.5px] font-semibold text-plane transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
        >
          {valorEscolhido
            ? pixConfigurado
              ? `Apoiar com ${moeda(valorEscolhido)} via Pix`
              : `Apoiar com ${moeda(valorEscolhido)}`
            : "Apoiar o projeto"}
        </button>
        <button
          type="button"
          onClick={() => setEstado("dispensado")}
          className="flex-1 cursor-pointer rounded-xl border border-hairline px-4 py-2.5 text-[13.5px] font-medium text-ink-secondary transition-colors duration-200 hover:border-hairline-strong hover:text-ink"
        >
          Agora não
        </button>
      </div>
    </div>
  );
}

export function Conclusao({ torneio, investimento, aoRegistrarOutro }: Props) {
  const saldo = torneio.premiacao - investimento;
  const premiado = torneio.premiacao > 0;
  const titulo = torneio.colocacao === 1;
  const mesaFinal = torneio.colocacao !== null && torneio.colocacao <= 9;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <section className="placa grao surgir relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-px overflow-hidden rounded-[20px]"
        >
          <div
            className="absolute -top-44 left-1/2 h-80 w-[34rem] -translate-x-1/2 rounded-full blur-3xl"
            style={{
              // Pelo token, e não por rgba fixo: no tema claro um halo branco
              // sobre branco não existe, e o verde precisa ser o verde escuro.
              background: premiado
                ? "radial-gradient(closest-side, color-mix(in oklab, var(--color-positivo) 22%, transparent), transparent)"
                : "radial-gradient(closest-side, var(--color-realce-forte), transparent)",
            }}
          />
        </div>
        <div aria-hidden className="grao-camada rounded-[20px]" />

        <div className="relative px-6 py-8 text-center sm:px-9 sm:py-10">
          <p className="rotulo">{premiado ? "Torneio registrado" : "Registrado"}</p>

          {/* Conquista não recebe matiz própria — recebe destaque. O halo
              branco só funcionava no escuro; sobre o claro ele sumia, e a
              única marca de um título vencido desaparecia com o tema. */}
          {titulo && (
            <p
              className="mt-4 inline-block rounded-full px-3 py-1 text-[12px] font-semibold tracking-[0.22em]"
              style={{
                color: "var(--color-atencao)",
                background: "color-mix(in oklab, var(--color-atencao) 14%, transparent)",
              }}
            >
              TÍTULO
            </p>
          )}

          <p className="mt-3">
            <span
              className="text-[clamp(2.5rem,8vw,3.75rem)] leading-none font-semibold tracking-[-0.035em]"
              style={{
                color: premiado ? "var(--color-positivo)" : "var(--color-ink)",
              }}
            >
              {premiado ? moeda(torneio.premiacao) : ordinal(torneio.colocacao ?? 0)}
            </span>
          </p>

          <p className="mt-3.5 text-[14px] text-ink-secondary">
            {torneio.colocacao !== null && premiado && (
              <>
                {ordinal(torneio.colocacao)} lugar entre {torneio.jogadores} jogadores
                {mesaFinal && !titulo && " · mesa final"}
              </>
            )}
            {!premiado && `de ${torneio.jogadores} jogadores · sem premiação`}
          </p>
          <p className="mt-1 text-[12.5px] text-ink-muted">
            {torneio.nome} · {torneio.clube}
            {torneio.via === "satelite" && " · entrou via satélite"}
          </p>

          <dl className="mx-auto mt-7 grid max-w-sm grid-cols-2 gap-x-8 border-t border-hairline pt-5">
            <div>
              <dt className="rotulo">Investido</dt>
              <dd className="numeros-tabulares mt-1.5 text-[17px] font-medium text-ink">
                {moeda(investimento)}
              </dd>
            </div>
            <div>
              <dt className="rotulo">Resultado</dt>
              <dd
                className="numeros-tabulares mt-1.5 text-[17px] font-medium"
                style={{
                  color: saldo >= 0 ? "var(--color-positivo)" : "var(--color-negativo)",
                }}
              >
                {moedaComSinal(saldo)}
              </dd>
            </div>
          </dl>

          {!premiado && (
            <p className="mx-auto mt-6 max-w-md text-[13px] leading-relaxed text-ink-secondary">
              Torneio sem prêmio ainda é dado. Ele entra no seu ROI, na leitura de
              energia e na comparação entre satélite e entrada direta — é assim
              que a amostra vira conclusão.
            </p>
          )}
        </div>
      </section>

      {premiado && (
        <div className="mt-4">
          <PedidoDeApoio premiacao={torneio.premiacao} />
        </div>
      )}

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link
          href="/painel"
          className="rounded-xl border border-hairline px-5 py-2.5 text-center text-[13.5px] font-medium text-ink transition-colors duration-200 hover:border-hairline-strong hover:bg-realce"
        >
          Ver no painel
        </Link>
        <button
          type="button"
          onClick={aoRegistrarOutro}
          className="cursor-pointer rounded-xl px-5 py-2.5 text-[13.5px] font-medium text-ink-secondary transition-colors duration-200 hover:text-ink"
        >
          Registrar outro torneio
        </button>
      </div>
    </div>
  );
}

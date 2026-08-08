"use client";

import { useEffect, useState } from "react";
import { Marca } from "@/components/shell/Marca";
import { CampoEscolha, CampoNumero, CampoTexto } from "@/components/ui/Campo";
import { comecarDoZero, usarDemonstracao } from "@/lib/data/repositorio";
import { FormularioAcesso } from "@/components/conta/Conta";
import { supabaseConfigurado } from "@/lib/supabase/cliente";
import { moeda } from "@/lib/format";
import {
  DETALHE_OBJETIVO,
  MODALIDADES,
  OBJETIVOS,
  type Modalidade,
  type Objetivo,
  type Perfil,
} from "@/lib/types";

/**
 * As boas-vindas — a única tela do Oblix que aparece antes de qualquer dado.
 *
 * Ela existe para resolver uma ambiguidade que só o produto pode desfazer: o
 * painel abre com 14 meses de histórico semeado, e sem esta pergunta o jogador
 * não tem como saber que aquele ROI não é o dele. Um selo discreto não bastaria
 * — o número está grande no meio da tela e será lido como verdade.
 *
 * Aparece SOBRE o painel, não no lugar dele. A demonstração ao fundo é o
 * argumento: dá para ver o que o produto faz enquanto se decide, em vez de
 * escolher no escuro entre dois botões.
 *
 * Nenhum dos caminhos é destrutivo, e por isso nenhum pede confirmação. As duas
 * bases moram em baldes separados; trocar de uma para a outra devolve tudo
 * onde estava.
 */

const OPCOES_OBJETIVO = OBJETIVOS.map((o) => ({
  valor: o,
  rotulo: o,
  detalhe: DETALHE_OBJETIVO[o],
}));

const OPCOES_MODALIDADE = MODALIDADES.map((m) => ({ valor: m, rotulo: m }));

export type Etapa = "escolha" | "perfil" | "entrar";

interface Props {
  /** "perfil" quando o jogador já decidiu e só falta se apresentar. */
  etapaInicial?: Etapa;
  /**
   * Só existe quando as boas-vindas foram reabertas de dentro do produto. Na
   * primeira visita não há como fechar: a escolha é o que dá sentido a tudo
   * que aparece depois.
   */
  aoFechar?: () => void;
}

export function BemVindo({ etapaInicial = "escolha", aoFechar }: Props) {
  const [etapa, setEtapa] = useState<Etapa>(etapaInicial);

  const [nome, setNome] = useState("");
  const [objetivo, setObjetivo] = useState<Objetivo>("Evolução");
  const [modalidade, setModalidade] = useState<Modalidade>("MTT");
  const [banca, setBanca] = useState<number | null>(null);
  const [buyIn, setBuyIn] = useState<number | null>(100);
  const [tentou, setTentou] = useState(false);

  // Enquanto as boas-vindas estão abertas, o painel atrás não deve rolar: a
  // decisão é modal de verdade, não um cartaz que se empurra para cima.
  useEffect(() => {
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = anterior;
    };
  }, []);

  useEffect(() => {
    if (!aoFechar) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aoFechar]);

  const erroNome = tentou && !nome.trim() ? "Diga como quer ser chamado" : undefined;
  const erroBuyIn =
    tentou && (buyIn === null || buyIn <= 0) ? "Informe o buy-in que você costuma jogar" : undefined;

  function concluir() {
    setTentou(true);
    if (!nome.trim() || buyIn === null || buyIn <= 0) return;

    const bancaInicial = Math.max(0, banca ?? 0);
    const primeiro = nome.trim().split(/\s+/)[0];

    const perfil: Perfil = {
      nome: nome.trim(),
      nick: primeiro.toLowerCase(),
      objetivo,
      modalidade,
      clubes: [],
      buyInPadrao: buyIn,
      bankrollInicial: moeda(bancaInicial),
      desde: new Date().toISOString(),
      foto: null,
    };

    comecarDoZero(perfil, bancaInicial);
  }

  return (
    <div
      role="dialog"
      aria-modal
      aria-labelledby="bem-vindo-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-plane/80 px-4 py-10 backdrop-blur-xl"
    >
      <div className="placa grao surgir relative w-full max-w-[34rem] px-6 py-8 sm:px-9 sm:py-10">
        <div aria-hidden className="grao-camada rounded-[20px]" />
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-px overflow-hidden rounded-[20px]"
        >
          <div className="absolute -top-40 left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-positivo)_18%,transparent),transparent)] blur-2xl" />
        </div>

        {aoFechar && (
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="absolute top-4 right-4 z-10 grid size-8 cursor-pointer place-items-center rounded-full text-ink-muted transition-colors duration-200 hover:bg-realce hover:text-ink"
          >
            <span aria-hidden className="text-[15px] leading-none">
              ×
            </span>
          </button>
        )}

        <div className="relative">
          {etapa === "escolha" ? (
            <>
              <Marca tamanho={34} />
              <h1
                id="bem-vindo-titulo"
                className="mt-6 text-[28px] leading-[1.15] font-semibold tracking-[-0.025em] text-ink sm:text-[32px]"
              >
                Bem-vindo ao Oblix
              </h1>
              <p className="mt-3 max-w-[30rem] text-[14.5px] leading-relaxed text-ink-secondary">
                O Oblix lê o seu histórico e responde o que a planilha esconde: se o satélite
                compensa, quanto o cansaço custa na mesa, para onde a banca está indo de verdade.
              </p>

              <div className="mt-8 flex flex-col gap-3">
                <Caminho
                  titulo="Explorar a demonstração"
                  corpo="14 meses de histórico de um jogador fictício — 101 torneios e 56 satélites. Tudo funciona, nada é seu."
                  acao="Ver a demonstração"
                  aoEscolher={usarDemonstracao}
                />
                <Caminho
                  destaque
                  titulo="Começar com os meus dados"
                  corpo="Painel em branco, esperando o seu primeiro torneio. A demonstração continua disponível quando quiser voltar."
                  acao="Configurar meu perfil"
                  aoEscolher={() => setEtapa("perfil")}
                />
              </div>

              {/* Quem já tem conta precisa de uma saída aqui. Sem ela, a
                  primeira visita obrigava a escolher demonstração ou começar do
                  zero antes de conseguir entrar — e no celular, onde a barra
                  lateral não existe, não havia saída nenhuma. Fica discreto
                  porque é o caminho de quem volta, não o de quem chega. */}
              {supabaseConfigurado && (
                <button
                  type="button"
                  onClick={() => setEtapa("entrar")}
                  className="mt-6 w-full cursor-pointer text-[12.5px] text-ink-secondary transition-colors duration-200 hover:text-ink"
                >
                  Já tenho conta — <span className="font-medium text-ink">entrar</span>
                </button>
              )}

              <p className="mt-6 text-[12px] leading-relaxed text-ink-muted">
                {supabaseConfigurado
                  ? "Sem conta, tudo fica gravado neste navegador. Com conta, os seus registros existem em qualquer aparelho."
                  : "Tudo fica gravado neste navegador. Não há conta, servidor nem cobrança."}
              </p>
            </>
          ) : etapa === "entrar" ? (
            <>
              <button
                type="button"
                onClick={() => setEtapa("escolha")}
                className="cursor-pointer text-[12.5px] text-ink-muted transition-colors duration-200 hover:text-ink"
              >
                ← Voltar
              </button>
              <div className="mt-1">
                <FormularioAcesso />
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setEtapa("escolha")}
                className="cursor-pointer text-[12.5px] text-ink-muted transition-colors duration-200 hover:text-ink"
              >
                ← Voltar
              </button>

              <h1
                id="bem-vindo-titulo"
                className="mt-5 text-[26px] leading-[1.15] font-semibold tracking-[-0.025em] text-ink sm:text-[29px]"
              >
                Vamos abrir a sua banca
              </h1>
              <p className="mt-2.5 text-[14px] leading-relaxed text-ink-secondary">
                Cinco campos, uma vez só. Dá para mudar tudo depois.
              </p>

              <div className="mt-7 flex flex-col gap-5">
                <CampoTexto
                  rotulo="Como quer ser chamado"
                  valor={nome}
                  aoMudar={setNome}
                  placeholder="Seu nome ou nick"
                  erro={erroNome}
                />

                <CampoEscolha
                  rotulo="O que o poker é para você"
                  valor={objetivo}
                  aoMudar={setObjetivo}
                  opcoes={OPCOES_OBJETIVO}
                />

                <CampoEscolha
                  rotulo="Modalidade principal"
                  valor={modalidade}
                  aoMudar={setModalidade}
                  opcoes={OPCOES_MODALIDADE}
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <CampoNumero
                    rotulo="Banca inicial"
                    dica="Entra como o primeiro aporte da curva"
                    valor={banca}
                    aoMudar={setBanca}
                    prefixo="R$"
                    min={0}
                    placeholder="0"
                  />
                  <CampoNumero
                    rotulo="Buy-in padrão"
                    dica="O torneio que você mais joga"
                    valor={buyIn}
                    aoMudar={setBuyIn}
                    prefixo="R$"
                    min={1}
                    erro={erroBuyIn}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={concluir}
                className="mt-8 w-full cursor-pointer rounded-xl bg-[var(--color-positivo)] px-5 py-3 text-[14px] font-semibold text-plane transition-transform duration-200 hover:brightness-110 active:scale-[0.985]"
              >
                Abrir meu painel
              </button>

              <p className="mt-4 text-[12px] leading-relaxed text-ink-muted">
                O painel vai abrir vazio — é assim que tem que ser. Ele preenche sozinho conforme
                você registra.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Caminho({
  titulo,
  corpo,
  acao,
  destaque = false,
  aoEscolher,
}: {
  titulo: string;
  corpo: string;
  acao: string;
  destaque?: boolean;
  aoEscolher: () => void;
}) {
  return (
    <button
      type="button"
      onClick={aoEscolher}
      className={`group cursor-pointer rounded-2xl border px-5 py-4 text-left transition-all duration-200 ${
        destaque
          ? "border-transparent bg-raised ring-1 ring-[var(--color-positivo)]/45 hover:ring-[var(--color-positivo)]"
          : "border-hairline bg-sunken hover:border-hairline-strong"
      }`}
    >
      <span className="block text-[15px] font-medium text-ink">{titulo}</span>
      <span className="mt-1.5 block text-[13px] leading-relaxed text-ink-secondary">{corpo}</span>
      <span
        className={`mt-3 flex items-center gap-1.5 text-[12.5px] font-medium ${
          destaque ? "text-[var(--color-positivo)]" : "text-ink-muted group-hover:text-ink"
        }`}
      >
        {acao}
        <span
          aria-hidden
          className="transition-transform duration-200 group-hover:translate-x-0.5"
        >
          →
        </span>
      </span>
    </button>
  );
}

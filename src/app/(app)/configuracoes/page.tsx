"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PainelConta, useEstadoDaConta } from "@/components/conta/Conta";
import { Instalar } from "@/components/shell/Instalar";
import { Avatar } from "@/components/ui/Avatar";
import { anunciar } from "@/components/ui/Aviso";
import { Botao } from "@/components/ui/Botao";
import { useConfirmacao } from "@/components/ui/Confirmar";
import { Placa } from "@/components/ui/Placa";
import { lerProprios, limparProprios, usarModo } from "@/lib/data/repositorio";
import { useRegistros } from "@/lib/painel";
import {
  DESCRICAO_PREFERENCIA,
  ROTULO_PREFERENCIA,
  definirTema,
  useTema,
  type Preferencia,
} from "@/lib/tema";

/**
 * Configurações — quatro assuntos, nenhum inventado.
 *
 * A régua para entrar aqui foi: existe alguém que precisa mudar isto? Idioma
 * não entrou (o Oblix é pt-BR por decisão de produto, não por padrão),
 * notificações não entraram (não existem), moeda não entrou (real, e um
 * seletor de moeda sem conversão só produziria números errados com outro
 * símbolo na frente).
 *
 * Privacidade é a seção que mais importa e a que menos aparenta: um painel de
 * poker guarda quanto a pessoa ganha, contra quem joga e o que ela escreveu
 * sobre a própria cabeça depois de perder. Ela precisa saber onde isso está e
 * conseguir apagar.
 */

const TEMAS: Preferencia[] = ["sistema", "claro", "escuro"];

function Secao({
  titulo,
  descricao,
  children,
  atraso,
}: {
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
  atraso?: number;
}) {
  return (
    <Placa className="mt-4 px-5 py-6 sm:px-7" atraso={atraso}>
      <h2 className="rotulo">{titulo}</h2>
      {descricao && <p className="texto-legenda mt-1.5 text-ink-secondary">{descricao}</p>}
      <div className="mt-5">{children}</div>
    </Placa>
  );
}

export default function Configuracoes() {
  const registros = useRegistros();
  const { perfil, modo, pronto } = registros;
  const { usuario, comNuvem, cor, resumo } = useEstadoDaConta();
  const { preferencia } = useTema();
  const [conta, setConta] = useState(false);
  const { dialogo, confirmar } = useConfirmacao();

  // Lido a cada render, e de propósito: `useRegistros` já avisa a cada
  // mudança, e o custo é ler um objeto que está na memória. `pronto` entra na
  // dependência porque antes da hidratação não há base própria para contar.
  const proprios = useMemo(
    () => (pronto ? lerProprios() : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pronto, registros],
  );

  const totalProprio = proprios
    ? proprios.torneios.length +
      proprios.satelites.length +
      proprios.movimentos.length +
      Object.keys(proprios.jogadores).length +
      proprios.diario.length +
      proprios.medicoes.length +
      proprios.treino.length
    : 0;

  return (
    <main className="mx-auto w-full max-w-[46rem] px-4 py-7 pb-10 sm:px-7 sm:py-10 lg:px-10">
      <header className="surgir">
        <h1 className="texto-display text-ink">Configurações</h1>
        <p className="texto-apoio mt-1.5 text-ink-secondary">
          Aparência, conta e o que fazer com os seus dados.
        </p>
      </header>

      {/* ── aparência ── */}
      <Secao
        titulo="Aparência"
        descricao="A escolha fica gravada neste aparelho e vale na próxima vez que você abrir."
        atraso={40}
      >
        <div
          role="radiogroup"
          aria-label="Tema do Oblix"
          className="grid gap-2 sm:grid-cols-3"
        >
          {TEMAS.map((t) => {
            const ativo = preferencia === t;
            return (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={ativo}
                onClick={() => {
                  definirTema(t);
                  anunciar(`Tema: ${ROTULO_PREFERENCIA[t].toLowerCase()}.`, "neutro");
                }}
                className={`min-h-[var(--toque)] cursor-pointer rounded-xl border px-3.5 py-3 text-left transition-all duration-200 ${
                  ativo
                    ? "border-transparent bg-raised text-ink ring-1 ring-[var(--color-positivo)]"
                    : "border-hairline bg-sunken text-ink-secondary hover:border-hairline-strong hover:text-ink"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Amostra tema={t} />
                  <span className="text-[13.5px] font-medium">{ROTULO_PREFERENCIA[t]}</span>
                </span>
                <span className="mt-1 block text-[12px] leading-snug text-ink-muted">
                  {DESCRICAO_PREFERENCIA[t]}
                </span>
              </button>
            );
          })}
        </div>
      </Secao>

      {/* ── conta ── */}
      <Secao titulo="Conta" atraso={80}>
        <Link
          href="/perfil"
          className="flex min-h-[64px] items-center gap-3.5 rounded-2xl border border-hairline bg-sunken px-3.5 transition-colors duration-200 hover:border-hairline-strong"
        >
          <Avatar nome={perfil.nome} foto={perfil.foto} tamanho={42} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14.5px] font-medium text-ink">
              {perfil.nome}
            </span>
            <span className="block truncate text-[12px] text-ink-muted">
              Nome, apelido, foto e padrões de jogo
            </span>
          </span>
          <span aria-hidden className="text-ink-faint">
            ›
          </span>
        </Link>

        {comNuvem ? (
          <div className="mt-3 rounded-2xl border border-hairline bg-sunken p-4">
            <p className="flex items-center gap-2 text-[13.5px] font-medium text-ink">
              <span
                aria-hidden
                className="size-1.5 shrink-0 rounded-full"
                style={{ background: cor }}
              />
              {usuario ? usuario.email : "Sem conta neste aparelho"}
            </p>
            <p className="texto-legenda mt-1.5 text-ink-secondary">
              {usuario
                ? resumo
                : "Os seus registros moram só neste navegador. Com conta, eles existem em qualquer aparelho onde você entrar."}
            </p>
            <Botao className="mt-3" aoClicar={() => setConta(true)}>
              {usuario ? "Gerenciar conta" : "Entrar ou criar conta"}
            </Botao>
          </div>
        ) : (
          <p className="texto-legenda mt-3 text-ink-muted">
            Este Oblix está sem servidor configurado: tudo funciona, e tudo fica gravado apenas
            neste navegador.
          </p>
        )}

        <Instalar />
      </Secao>

      {/* ── dados ── */}
      <Secao
        titulo="Base em uso"
        descricao="O Oblix guarda duas bases separadas. Trocar de uma para a outra não apaga nada."
        atraso={120}
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <Escolha
            ativo={modo === "demonstracao"}
            titulo="Demonstração"
            corpo="14 meses de um jogador fictício"
            aoEscolher={() => usarModo("demonstracao")}
          />
          <Escolha
            ativo={modo === "proprio"}
            titulo="Meus dados"
            corpo={
              totalProprio === 0
                ? "Ainda vazia"
                : `${totalProprio} ${totalProprio === 1 ? "registro" : "registros"}`
            }
            aoEscolher={() => usarModo("proprio")}
          />
        </div>
      </Secao>

      {/* ── privacidade ── */}
      <Secao
        titulo="Privacidade"
        descricao="Onde os seus dados estão e como tirá-los daqui."
        atraso={160}
      >
        <p className="texto-legenda text-ink-secondary">
          {usuario
            ? "Os seus registros ficam na sua conta, protegidos por regra de linha: nenhuma consulta do Oblix consegue devolver a linha de outro jogador. Uma cópia fica neste aparelho para o app funcionar sem sinal."
            : "Os seus registros estão apenas neste navegador. Não saem daqui, não são enviados a servidor nenhum e somem se você limpar os dados do site."}
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Botao
            aoClicar={() => {
              // Lido na hora do clique, não do render: é o estado do momento
              // do pedido que a pessoa espera encontrar no arquivo.
              const dados = JSON.stringify(lerProprios(), null, 2);
              const url = URL.createObjectURL(new Blob([dados], { type: "application/json" }));
              const a = document.createElement("a");
              a.href = url;
              a.download = `oblix-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
              anunciar("Cópia baixada.");
            }}
          >
            Baixar uma cópia
          </Botao>
          <Botao
            tom="perigo"
            aoClicar={() =>
              confirmar({
                titulo: "Apagar tudo o que você registrou?",
                corpo: `Isto remove ${totalProprio} ${
                  totalProprio === 1 ? "registro" : "registros"
                } — torneios, satélites, adversários, diário e treino. Não há como desfazer. A base de demonstração não é afetada.`,
                rotuloAcao: "Apagar meus dados",
                aoConfirmar: () => {
                  limparProprios();
                  anunciar("Os seus registros foram apagados.", "neutro");
                },
              })
            }
          >
            Apagar meus dados
          </Botao>
        </div>
      </Secao>

      {conta && <PainelConta aoFechar={() => setConta(false)} />}
      {dialogo}
    </main>
  );
}

/** Um quadradinho com as duas superfícies do tema — mostra em vez de descrever. */
function Amostra({ tema }: { tema: Preferencia }) {
  const { tema: atual } = useTema();
  const efetivo = tema === "sistema" ? atual : tema;
  const claro = efetivo === "claro";
  return (
    <span
      aria-hidden
      className="grid size-4 shrink-0 place-items-center overflow-hidden rounded-full ring-1 ring-hairline-strong"
      style={{ background: claro ? "#f4f6f5" : "#08090a" }}
    >
      <span
        className="block size-2 rounded-full"
        style={{ background: claro ? "#0c7a55" : "#199e70" }}
      />
    </span>
  );
}

function Escolha({
  ativo,
  titulo,
  corpo,
  aoEscolher,
}: {
  ativo: boolean;
  titulo: string;
  corpo: string;
  aoEscolher: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={ativo}
      onClick={aoEscolher}
      className={`min-h-[var(--toque)] flex-1 cursor-pointer rounded-xl border px-3.5 py-3 text-left transition-all duration-200 ${
        ativo
          ? "border-transparent bg-raised text-ink ring-1 ring-[var(--color-positivo)]"
          : "border-hairline bg-sunken text-ink-secondary hover:border-hairline-strong hover:text-ink"
      }`}
    >
      <span className="block text-[13.5px] font-medium">{titulo}</span>
      <span className="mt-0.5 block text-[12px] text-ink-muted">{corpo}</span>
    </button>
  );
}

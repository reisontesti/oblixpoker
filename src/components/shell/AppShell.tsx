"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Conta } from "@/components/conta/Conta";
import { BemVindo, type Etapa } from "@/components/onboarding/BemVindo";
import { Instalar, RegistrarOffline } from "@/components/shell/Instalar";
import { Logotipo } from "@/components/shell/Marca";
import {
  CONFIGURACOES,
  NAVEGACAO,
  PERFIL,
  PRINCIPAIS,
  SECUNDARIOS,
  type ItemNav,
} from "@/components/shell/navegacao";
import { Avatar } from "@/components/ui/Avatar";
import { Avisos, AvisosDaNuvem } from "@/components/ui/Aviso";
import { Girando } from "@/components/ui/Botao";
import { Folha } from "@/components/ui/Folha";
import { usarModo } from "@/lib/data/repositorio";
import { ROTULO_OBJETIVO } from "@/lib/types";
import { useRegistros } from "@/lib/painel";

/** O item ativo inclui as subpáginas: `/torneios/novo` acende "Torneios". */
function estaAtivo(caminho: string, href: string) {
  return href === "/" ? caminho === "/" : caminho === href || caminho.startsWith(`${href}/`);
}

function ItensLaterais() {
  const caminho = usePathname();

  return (
    <>
      {NAVEGACAO.map((item) => {
        const ativo = estaAtivo(caminho, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={ativo ? "page" : undefined}
            className={`flex min-h-[var(--toque)] items-center gap-3 rounded-xl px-3 text-[14px] font-medium transition-colors duration-200 ${
              ativo
                ? "bg-raised text-ink ring-1 ring-hairline-strong"
                : "text-ink-secondary hover:bg-realce hover:text-ink"
            }`}
          >
            <span
              aria-hidden
              className={`transition-colors duration-200 ${ativo ? "text-[var(--color-positivo)]" : ""}`}
            >
              {item.icone}
            </span>
            {item.rotulo}
          </Link>
        );
      })}
    </>
  );
}

/**
 * A barra do celular: quatro destinos e o "Mais".
 *
 * A versão anterior tinha oito alvos. A 320px isso dava 37px por item, com
 * rótulos a 9,5px — abaixo de qualquer régua de toque e de leitura. Quatro
 * mais um dá 60px+ de largura e 56px de altura em todo aparelho testado.
 */
function BarraInferior({ aoAbrirMais }: { aoAbrirMais: () => void }) {
  const caminho = usePathname();
  const noMais = [...SECUNDARIOS, PERFIL, CONFIGURACOES].some((i) =>
    estaAtivo(caminho, i.href),
  );

  const classe = (ativo: boolean) =>
    `flex min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl py-1.5 transition-colors duration-200 ${
      ativo ? "text-ink" : "text-ink-muted"
    }`;

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch gap-0.5 border-t border-hairline bg-plane/90 px-1.5 pt-1.5 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}
    >
      {PRINCIPAIS.map((item) => {
        const ativo = estaAtivo(caminho, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={ativo ? "page" : undefined}
            className={classe(ativo)}
          >
            <span
              aria-hidden
              className={`grid size-5 place-items-center transition-colors duration-200 ${
                ativo ? "text-[var(--color-positivo)]" : ""
              }`}
            >
              {item.icone}
            </span>
            <span className="max-w-full truncate text-[12px] font-medium">{item.rotulo}</span>
          </Link>
        );
      })}

      <button
        type="button"
        onClick={aoAbrirMais}
        aria-haspopup="dialog"
        className={classe(noMais)}
      >
        <span
          aria-hidden
          className={`grid size-5 place-items-center transition-colors duration-200 ${
            noMais ? "text-[var(--color-positivo)]" : ""
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <circle cx="4.2" cy="10" r="1.5" />
            <circle cx="10" cy="10" r="1.5" />
            <circle cx="15.8" cy="10" r="1.5" />
          </svg>
        </span>
        <span className="text-[12px] font-medium">Mais</span>
      </button>
    </nav>
  );
}

function LinhaDoMenu({
  item,
  ativo,
  aoIr,
}: {
  item: ItemNav;
  ativo: boolean;
  aoIr: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={aoIr}
      aria-current={ativo ? "page" : undefined}
      className={`flex min-h-[56px] items-center gap-3.5 rounded-2xl px-3.5 transition-colors duration-200 ${
        ativo ? "bg-raised text-ink ring-1 ring-hairline-strong" : "text-ink hover:bg-realce"
      }`}
    >
      <span aria-hidden className="text-ink-secondary">
        {item.icone}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-medium">{item.rotulo}</span>
        {item.resumo && (
          <span className="block truncate text-[12px] text-ink-muted">{item.resumo}</span>
        )}
      </span>
      <span aria-hidden className="text-ink-faint">
        ›
      </span>
    </Link>
  );
}

/** O que não coube na barra — com resumo, porque aqui há espaço para explicar. */
function MenuMais({ aoFechar }: { aoFechar: () => void }) {
  const caminho = usePathname();
  const { perfil, modo } = useRegistros();

  return (
    <Folha titulo="Mais" tituloOculto aoFechar={aoFechar} largura="estreita">
      <Link
        href={PERFIL.href}
        onClick={aoFechar}
        className="flex min-h-[64px] items-center gap-3.5 rounded-2xl border border-hairline bg-sunken px-3.5 transition-colors duration-200 hover:border-hairline-strong"
      >
        <Avatar nome={perfil.nome} foto={perfil.foto} tamanho={42} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium text-ink">{perfil.nome}</span>
          <span className="block truncate text-[12px] text-ink-muted">
            {modo === "demonstracao"
              ? "Base de demonstração"
              : `${ROTULO_OBJETIVO[perfil.objetivo]} · ${perfil.modalidade}`}
          </span>
        </span>
        <span aria-hidden className="text-ink-faint">
          ›
        </span>
      </Link>

      <div className="mt-4 flex flex-col gap-1">
        {SECUNDARIOS.map((i) => (
          <LinhaDoMenu
            key={i.href}
            item={i}
            ativo={estaAtivo(caminho, i.href)}
            aoIr={aoFechar}
          />
        ))}
      </div>

      {/* Configurações leva a conta junto: o painel de conta é uma folha, e
          abrir folha de dentro de folha deixaria duas alças na tela. */}
      <div className="mt-4 flex flex-col gap-1 border-t border-hairline pt-4">
        <LinhaDoMenu
          item={CONFIGURACOES}
          ativo={estaAtivo(caminho, CONFIGURACOES.href)}
          aoIr={aoFechar}
        />
      </div>
    </Folha>
  );
}

/**
 * A faixa que declara a base de demonstração.
 *
 * Existe porque o painel exibe R$ 9.400 de banca e 78% de ROI em tipografia
 * grande, e número grande é lido como verdade. Um jogador que abriu o Oblix
 * pela primeira vez precisa conseguir responder "isso é meu?" sem procurar.
 *
 * Fica no topo da coluna de conteúdo, e não na barra lateral, justamente
 * porque a barra lateral some no celular — que é onde o Oblix é usado.
 */
function FaixaDemonstracao({ aoSair }: { aoSair: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 border-b border-hairline bg-raised/50 pl-4 backdrop-blur-xl sm:pl-7 lg:pl-10">
      <span className="flex items-center gap-2 py-2 text-[12.5px] text-ink-secondary">
        <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-[var(--color-atencao)]" />
        <span>
          <strong className="font-medium text-ink">Demonstração</strong>
          <span className="hidden sm:inline"> — nenhum destes números é seu.</span>
        </span>
      </span>
      <button
        type="button"
        onClick={aoSair}
        className="flex min-h-[var(--toque)] shrink-0 cursor-pointer items-center px-4 text-[12.5px] font-medium text-[var(--color-positivo)] transition-colors duration-200 hover:bg-realce sm:px-7 lg:px-10"
      >
        Usar meus dados →
      </button>
    </div>
  );
}

/**
 * Enquanto a base vem da nuvem.
 *
 * Não é um esqueleto, e isso é uma escolha. O Oblix já tem o que mostrar: o
 * espelho local entra antes da rede e o painel aparece cheio no mesmo
 * instante. Cobrir dados verdadeiros com retângulos cinza seria esconder
 * informação para simular trabalho.
 *
 * O que falta é dizer que aqueles números podem estar alguns minutos
 * atrasados — e é só isso que esta faixa diz. Some sozinha quando a nuvem
 * responde, e `role="status"` a anuncia sem interromper a leitura.
 */
function FaixaSincronizando() {
  return (
    <div
      role="status"
      className="esmaecer flex items-center gap-2 border-b border-hairline bg-raised/40 px-4 py-1.5 text-[12.5px] text-ink-secondary backdrop-blur-xl sm:px-7 lg:px-10"
    >
      <Girando tamanho={12} />
      Buscando os seus registros — o que está na tela é a cópia deste aparelho.
    </div>
  );
}

function FaixaSessao({ nome }: { nome: string }) {
  return (
    <Link
      href="/torneios/ao-vivo"
      className="flex min-h-[38px] flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-hairline bg-[var(--color-positivo)]/12 px-4 py-1.5 transition-colors duration-200 hover:bg-[var(--color-positivo)]/18 sm:px-7 lg:px-10"
    >
      <span className="flex min-w-0 items-center gap-2 text-[12.5px] text-ink-secondary">
        <span
          aria-hidden
          className="size-1.5 shrink-0 animate-pulse rounded-full bg-[var(--color-positivo)]"
        />
        <span className="truncate">
          <strong className="font-medium text-ink">{nome}</strong> em andamento
        </span>
      </span>
      <span className="shrink-0 text-[12.5px] font-medium text-[var(--color-positivo)]">
        Voltar ao torneio →
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { perfil, modo, pronto, decidiu, temPerfilProprio, sessao, sincronizando } =
    useRegistros();
  const [reaberto, setReaberto] = useState<Etapa | null>(null);
  const [mais, setMais] = useState(false);
  const caminho = usePathname();

  // Trocar de tela com o menu aberto deixaria a folha por cima do destino.
  // Os links do menu já fecham ao serem tocados; isto cobre o resto — voltar
  // pelo botão do navegador, um redirecionamento, um atalho de teclado.
  const [caminhoDoMenu, setCaminhoDoMenu] = useState(caminho);
  if (caminhoDoMenu !== caminho) {
    setCaminhoDoMenu(caminho);
    if (mais) setMais(false);
  }

  // Só depois que o cliente lê a conta: antes disso, "não decidiu" é ignorância
  // e não resposta, e as boas-vindas piscariam a cada carregamento.
  const boasVindas: Etapa | null = pronto && !decidiu ? "escolha" : reaberto;

  // Quem já se apresentou uma vez não precisa preencher de novo: a base
  // própria continua no lugar em que ficou, e a troca é imediata.
  const irParaMeusDados = () =>
    temPerfilProprio ? usarModo("proprio") : setReaberto("perfil");

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      {/* No desktop a lateral tem sete destinos mais conta e configurações;
          sem este atalho, quem navega por teclado passa por todos eles em
          CADA página antes de chegar ao conteúdo. Fica invisível até receber
          foco, que é quando ele importa. */}
      <a
        href="#conteudo"
        className="sr-only z-[70] focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:inline-flex focus:min-h-[var(--toque)] focus:items-center focus:rounded-xl focus:border focus:border-hairline focus:bg-raised focus:px-4 focus:text-[14px] focus:font-medium focus:text-ink"
      >
        Pular para o conteúdo
      </a>

      {/* Instalado no iPhone, o conteúdo sobe até o topo da tela. Os glifos da
          barra de status são brancos (`black-translucent`), então esta faixa é
          escura nos DOIS temas — no claro ela lê como moldura do aparelho. */}
      <div
        aria-hidden
        className="fixed inset-x-0 top-0 z-50 bg-[#08090a]"
        style={{ height: "env(safe-area-inset-top)" }}
      />

      {/* Coluna de navegação — some no celular, onde a barra inferior assume */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-hairline bg-plane/70 px-4 py-6 backdrop-blur-xl lg:flex">
        <Link href="/" className="mb-9 px-2">
          <Logotipo />
        </Link>

        <nav className="flex flex-col gap-1" aria-label="Seções do Oblix">
          <ItensLaterais />
        </nav>

        <div className="mt-auto">
          <Link
            href={PERFIL.href}
            className="flex items-center gap-3 rounded-2xl border border-hairline bg-sunken p-3 transition-colors duration-200 hover:border-hairline-strong"
          >
            <Avatar nome={perfil.nome} foto={perfil.foto} tamanho={36} />
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium text-ink">
                {perfil.nome}
              </span>
              <span className="block truncate text-[12px] text-ink-muted">
                {modo === "demonstracao"
                  ? "Base de demonstração"
                  : `${ROTULO_OBJETIVO[perfil.objetivo]} · ${perfil.modalidade}`}
              </span>
            </span>
          </Link>
          <Link
            href={CONFIGURACOES.href}
            className={`mt-1 flex min-h-[var(--toque)] items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition-colors duration-200 ${
              estaAtivo(caminho, CONFIGURACOES.href)
                ? "bg-raised text-ink ring-1 ring-hairline-strong"
                : "text-ink-secondary hover:bg-realce hover:text-ink"
            }`}
          >
            <span aria-hidden className="text-ink-muted">
              {CONFIGURACOES.icone}
            </span>
            Configurações
          </Link>
          <Conta />
          <Instalar />
        </div>
      </aside>

      <div
        id="conteudo"
        tabIndex={-1}
        className="min-w-0 pb-[calc(4.75rem+env(safe-area-inset-bottom))] outline-none lg:pb-0"
      >
        {/* Sem depender de `decidiu`: a base é a de demonstração desde o
            primeiro byte de HTML, e é aí que a faixa precisa estar. Amarrá-la
            à decisão criaria um salto de layout logo depois da hidratação. */}
        {modo === "demonstracao" && <FaixaDemonstracao aoSair={irParaMeusDados} />}
        {sincronizando && <FaixaSincronizando />}
        {/* Um torneio em andamento precisa ser reencontrável de qualquer tela:
            o jogador abre o app no intervalo, seis horas depois de começar, e
            não deve ter que lembrar por onde entrou. */}
        {sessao && !sessao.finalizadaEm && <FaixaSessao nome={sessao.preparo.nome} />}
        {children}
      </div>

      <BarraInferior aoAbrirMais={() => setMais(true)} />
      {mais && <MenuMais aoFechar={() => setMais(false)} />}

      <Avisos />
      <AvisosDaNuvem />
      <RegistrarOffline />

      {boasVindas && (
        <BemVindo
          etapaInicial={boasVindas}
          aoFechar={decidiu ? () => setReaberto(null) : undefined}
        />
      )}
    </div>
  );
}

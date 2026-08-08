"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Conta } from "@/components/conta/Conta";
import { BemVindo, type Etapa } from "@/components/onboarding/BemVindo";
import { Logotipo } from "@/components/shell/Marca";
import { NAVEGACAO } from "@/components/shell/navegacao";
import { usarModo } from "@/lib/data/repositorio";
import { useRegistros } from "@/lib/painel";

function Itens({ compacto = false }: { compacto?: boolean }) {
  const caminho = usePathname();

  return (
    <>
      {NAVEGACAO.map((item) => {
        const ativo = caminho === item.href;
        const conteudo = (
          <>
            <span
              aria-hidden
              className={`transition-colors duration-200 ${ativo ? "text-[var(--color-positivo)]" : ""}`}
            >
              {item.icone}
            </span>
            <span className={compacto ? "text-[9.5px] font-medium" : "text-[13.5px] font-medium"}>
              {item.rotulo}
            </span>
          </>
        );

        if (item.emBreve) {
          return (
            <span
              key={item.href}
              title="Em breve"
              aria-disabled
              className={`flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-ink-faint ${
                compacto ? "min-w-0 flex-1 flex-col gap-1 px-1 py-1.5" : ""
              }`}
            >
              {conteudo}
            </span>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={ativo ? "page" : undefined}
            className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-200 ${
              compacto ? "min-w-0 flex-1 flex-col gap-1 px-1 py-1.5" : ""
            } ${
              ativo
                ? "bg-raised text-ink ring-1 ring-white/8"
                : "text-ink-secondary hover:bg-white/4 hover:text-ink"
            }`}
          >
            {conteudo}
          </Link>
        );
      })}
    </>
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
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-b border-hairline bg-raised/40 px-4 py-2 backdrop-blur-xl sm:px-7 lg:px-10">
      <span className="flex items-center gap-2 text-[12px] text-ink-secondary">
        <span
          aria-hidden
          className="size-1.5 shrink-0 rounded-full bg-[var(--color-atencao)]"
        />
        Você está vendo uma <strong className="font-medium text-ink">base de demonstração</strong>.
        Nenhum destes números é seu.
      </span>
      <button
        type="button"
        onClick={aoSair}
        className="shrink-0 cursor-pointer text-[12px] font-medium text-[var(--color-positivo)] transition-opacity duration-200 hover:opacity-80"
      >
        Usar meus dados →
      </button>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { perfil, modo, pronto, decidiu, temPerfilProprio } = useRegistros();
  const [reaberto, setReaberto] = useState<Etapa | null>(null);

  // Só depois que o cliente lê a conta: antes disso, "não decidiu" é ignorância
  // e não resposta, e as boas-vindas piscariam a cada carregamento.
  const boasVindas: Etapa | null = pronto && !decidiu ? "escolha" : reaberto;

  // Quem já se apresentou uma vez não precisa preencher de novo: a base
  // própria continua no lugar em que ficou, e a troca é imediata.
  const irParaMeusDados = () =>
    temPerfilProprio ? usarModo("proprio") : setReaberto("perfil");

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      {/* Coluna de navegação — some no mobile, onde a barra inferior assume */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-hairline bg-plane/70 px-4 py-6 backdrop-blur-xl lg:flex">
        <Link href="/" className="mb-9 px-2">
          <Logotipo />
        </Link>

        <nav className="flex flex-col gap-1" aria-label="Seções do Oblix">
          <Itens />
        </nav>

        <div className="mt-auto">
          <div className="flex items-center gap-3 rounded-2xl border border-hairline bg-sunken p-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#1fb583] to-[#0f5f44] text-[13px] font-semibold text-plane">
              {perfil.nick.slice(0, 2).toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium text-ink">
                {perfil.nome}
              </span>
              <span className="block truncate text-[11px] text-ink-muted">
                {modo === "demonstracao"
                  ? "Base de demonstração"
                  : `${perfil.objetivo} · ${perfil.modalidade}`}
              </span>
            </span>
          </div>
          <Conta />
        </div>
      </aside>

      <div className="min-w-0 pb-24 lg:pb-0">
        {/* Sem depender de `decidiu`: a base é a de demonstração desde o
            primeiro byte de HTML, e é aí que a faixa precisa estar. Amarrá-la
            à decisão criaria um salto de layout logo depois da hidratação. */}
        {modo === "demonstracao" && <FaixaDemonstracao aoSair={irParaMeusDados} />}
        {children}
      </div>

      {/* Barra inferior no mobile */}
      <nav
        aria-label="Seções do Oblix"
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around gap-1 border-t border-hairline bg-plane/85 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden"
      >
        <Itens compacto />
      </nav>

      {boasVindas && (
        <BemVindo
          etapaInicial={boasVindas}
          aoFechar={decidiu ? () => setReaberto(null) : undefined}
        />
      )}
    </div>
  );
}

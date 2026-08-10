import Link from "next/link";
import { Logotipo } from "@/components/shell/Marca";

/**
 * Rodapé da apresentação.
 *
 * Só entra link que leva a algum lugar de verdade. "Termos" e "Contato"
 * ficaram de fora de propósito: um é compromisso jurídico e o outro é um
 * endereço pessoal — as duas coisas são de quem mantém o Oblix decidir, não de
 * quem escreve a página. Link para página inexistente numa landing é a
 * primeira coisa que denuncia um produto que não existe.
 */

const SECOES: { titulo: string; itens: { rotulo: string; href: string }[] }[] = [
  {
    titulo: "Produto",
    itens: [
      { rotulo: "O que faz", href: "/#produto" },
      { rotulo: "O painel", href: "/#painel" },
      { rotulo: "Bankroll", href: "/#bankroll" },
      { rotulo: "Satélites", href: "/#satelites" },
    ],
  },
  {
    titulo: "Usar",
    itens: [
      { rotulo: "Treino", href: "/#treino" },
      { rotulo: "Banco de jogadores", href: "/#jogadores" },
      { rotulo: "Abrir o painel", href: "/painel" },
    ],
  },
  {
    titulo: "Sobre",
    itens: [{ rotulo: "Privacidade", href: "/privacidade" }],
  },
];

export function Rodape() {
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto w-full max-w-[76rem] px-4 py-12 sm:px-7 sm:py-16 lg:px-10">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logotipo />
            <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-ink-secondary">
              Plataforma de performance para jogadores de poker. Registre, entenda e evolua.
            </p>
          </div>

          {SECOES.map((s) => (
            <nav key={s.titulo} aria-label={s.titulo}>
              <p className="rotulo">{s.titulo}</p>
              <ul className="mt-3 space-y-0.5">
                {s.itens.map((i) => (
                  <li key={i.rotulo}>
                    <Link
                      href={i.href}
                      className="-mx-2 flex min-h-[var(--toque)] items-center rounded-lg px-2 text-[13.5px] text-ink-secondary transition-colors duration-200 hover:bg-realce hover:text-ink"
                    >
                      {i.rotulo}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-hairline pt-6">
          <p className="text-[12.5px] text-ink-muted">
            Oblix — Poker Performance Platform
          </p>
          <p className="text-[12.5px] text-ink-muted">
            Feito para quem leva o poker a sério.
          </p>
        </div>
      </div>
    </footer>
  );
}

"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/**
 * O estado vazio do Oblix.
 *
 * Um painel recém-aberto é quase todo composto por estas caixas, então elas
 * carregam mais peso do que o nome sugere: são a primeira coisa que um jogador
 * de verdade lê no produto. Duas regras as governam.
 *
 * **Dizem o que aquele espaço vai mostrar, não que ele está vazio.** "Sem
 * dados" é informação que o próprio branco já deu. "Aqui vai aparecer quanto o
 * cansaço te custa por torneio" é a promessa que faz valer a pena registrar o
 * primeiro.
 *
 * **Quando existe um próximo passo, ele é um botão.** Um estado vazio que
 * termina em elogio ao silêncio deixa o jogador sem saber por onde começar.
 */
interface VazioProps {
  titulo: string;
  corpo: string;
  /** O próximo passo, quando existe um óbvio. */
  acao?: { rotulo: string; href: string } | { rotulo: string; aoClicar: () => void };
  /** Marca d'água discreta acima do texto. */
  glifo?: ReactNode;
  className?: string;
}

const CLASSE_ACAO =
  "mt-5 inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-hairline " +
  "bg-raised px-4 py-2 text-[13px] font-medium text-ink transition-colors duration-200 " +
  "hover:border-hairline-strong";

export function Vazio({ titulo, corpo, acao, glifo, className = "" }: VazioProps) {
  return (
    <div
      className={`flex flex-col items-center px-6 py-12 text-center sm:py-14 ${className}`}
    >
      {glifo && (
        <span aria-hidden className="mb-4 text-[22px] text-ink-faint">
          {glifo}
        </span>
      )}
      <p className="text-[14.5px] font-medium text-ink">{titulo}</p>
      <p className="mt-2 max-w-[30rem] text-[13px] leading-relaxed text-ink-secondary">{corpo}</p>

      {acao &&
        ("href" in acao ? (
          <Link href={acao.href} className={CLASSE_ACAO}>
            {acao.rotulo}
            <span aria-hidden>→</span>
          </Link>
        ) : (
          <button type="button" onClick={acao.aoClicar} className={CLASSE_ACAO}>
            {acao.rotulo}
          </button>
        ))}
    </div>
  );
}

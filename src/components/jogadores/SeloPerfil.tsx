import { COR_RISCO, PERFIL_META } from "@/lib/jogadores";
import { ROTULO_PERFIL, type PerfilJogador } from "@/lib/types";

/**
 * O nome do perfil sempre aparece — a cor apenas reforça se é ameaça ou
 * oportunidade. Quem não distingue as cores lê exatamente a mesma coisa.
 */
export function SeloPerfil({
  perfil,
  tamanho = "normal",
}: {
  perfil: PerfilJogador;
  tamanho?: "normal" | "grande";
}) {
  const meta = PERFIL_META[perfil];
  const cor = COR_RISCO[meta.risco];

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full font-medium ${
        tamanho === "grande" ? "px-3 py-1 text-[12.5px]" : "px-2.5 py-0.5 text-[12px]"
      }`}
      style={{ color: cor, background: "color-mix(in oklab, currentColor 13%, transparent)" }}
    >
      <span
        aria-hidden
        className="size-1.5 rounded-full"
        style={{ background: cor }}
      />
      {ROTULO_PERFIL[perfil]}
    </span>
  );
}

interface DeltaProps {
  /** Já formatado — o componente não decide casas decimais nem moeda. */
  texto: string;
  direcao: "alta" | "baixa" | "estavel";
  /** Contexto obrigatório: "este mês", "vs. 30 dias". Um delta sem base mente. */
  base: string;
  /** Quando cair é bom (ex.: tempo gasto), inverte a leitura de cor. */
  cairEhBom?: boolean;
  className?: string;
}

/**
 * Variação com seta + texto. A cor nunca carrega o significado sozinha: a
 * seta e o rótulo dizem a mesma coisa, então a informação sobrevive a
 * daltonismo, impressão em cinza e modo de alto contraste.
 */
export function Delta({ texto, direcao, base, cairEhBom = false, className = "" }: DeltaProps) {
  const bom = cairEhBom ? direcao === "baixa" : direcao === "alta";
  const cor =
    direcao === "estavel"
      ? "text-ink-secondary"
      : bom
        ? "text-[var(--color-positivo)]"
        : "text-[var(--color-negativo)]";

  const seta = direcao === "alta" ? "▲" : direcao === "baixa" ? "▼" : "—";

  return (
    <p className={`flex flex-wrap items-baseline gap-x-1.5 text-[13px] ${className}`}>
      <span className={`${cor} inline-flex items-baseline gap-1 font-medium`}>
        <span aria-hidden className="text-[9px]">
          {seta}
        </span>
        <span className="numeros-tabulares">{texto}</span>
      </span>
      <span className="text-ink-muted">{base}</span>
    </p>
  );
}

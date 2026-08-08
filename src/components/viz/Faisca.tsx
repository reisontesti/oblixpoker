import { caminhoLinha, dominioComFolga, escalaLinear } from "@/lib/viz/escala";

interface Props {
  valores: number[];
  largura?: number;
  altura?: number;
  cor?: string;
  /** Rótulo para leitores de tela — a faísca sozinha não diz nada. */
  descricao: string;
}

/**
 * Faísca de apoio ao número: mostra a forma da série, não os valores. Por
 * isso não tem eixo nem rótulo — quem precisa do valor tem o número grande
 * ao lado e a tabela no cartão.
 */
export function Faisca({
  valores,
  largura = 132,
  altura = 34,
  cor = "var(--color-positivo)",
  descricao,
}: Props) {
  if (valores.length < 2) return null;

  const x = escalaLinear([0, valores.length - 1], [1.5, largura - 1.5]);
  const y = escalaLinear(dominioComFolga(valores, 0.2), [altura - 2.5, 2.5]);
  const pontos = valores.map((v, i) => ({ x: x(i), y: y(v) }));
  const fim = pontos[pontos.length - 1];

  return (
    <svg
      width={largura}
      height={altura}
      viewBox={`0 0 ${largura} ${altura}`}
      className="overflow-visible"
      role="img"
      aria-label={descricao}
    >
      <path
        d={caminhoLinha(pontos)}
        fill="none"
        stroke={cor}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.55"
      />
      <circle cx={fim.x} cy={fim.y} r="2.75" fill={cor} stroke="var(--color-card)" strokeWidth="2" />
    </svg>
  );
}

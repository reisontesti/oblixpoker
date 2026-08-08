/**
 * Registro das decisões de cor do Oblix, e os tokens que os gráficos usam.
 *
 * Os VALORES moram em `globals.css` — em dois temas. Aqui ficam os nomes e o
 * porquê. Uma segunda tabela de hex neste arquivo divergiria da primeira no
 * dia em que um tom fosse ajustado, e o registro passaria a documentar um
 * produto que não existe mais.
 *
 * O que foi apurado, para não ser re-derivado:
 *
 *   Tríade em tela simultânea — jade · azul · laranja
 *     No escuro (superfície #0E1011): --pairs all, CVD ΔE 9.4 (deutan, alvo
 *     ≥ 8) · visão normal ΔE 20.9 (piso ≥ 15) · contraste 5.60 / 5.24 / 4.91.
 *     No claro (superfície #FFFFFF) as três matizes são outras, escurecidas:
 *     5.34 / 6.13 / 5.84. Clarear as do escuro reprovaria — o jade cai para
 *     3,1:1 e o âmbar para 2,2:1 sobre branco.
 *
 *   Teto de 3 séries simultâneas: nenhum conjunto de 4 matizes passa
 *   --pairs all nas faixas do modo escuro. Acima de 3, dobrar em "Outros"
 *   ou facetar — nunca gerar uma quarta matiz.
 *
 *   Rampa ordinal (energia): 5 passos de uma matiz, monótona em luminância
 *   dentro de cada tema, ΔL ≥ 0.03 entre vizinhos, e as duas pontas ≥ 3:1
 *   contra a superfície. A DIREÇÃO inverte entre os temas, de propósito.
 *
 * `scripts/conferir-contraste.mts` reconfere tudo isto lendo o CSS, e é ele —
 * não este comentário — que impede a regressão.
 *
 * Divisão de papéis — o ponto que evita ambiguidade no produto:
 *   · jade / vermelho / âmbar são ESTADO (lucro, prejuízo, atenção). Nunca
 *     viram "série 4". Sempre acompanhados de ícone + rótulo.
 *   · azul e laranja são IDENTIDADE (entrada direta × via satélite) e não
 *     carregam juízo de bom/ruim — é justamente o que o produto quer
 *     descobrir dos dados, então a cor não pode antecipar a resposta.
 *   · conquista (título, mesa final) usa o âmbar com rótulo escrito. Antes
 *     era "luz" — tinta branca com brilho —, que só existe no escuro: sobre
 *     o tema claro a única marca de um título vencido desaparecia.
 */

/**
 * As cores por TOKEN — é isto que os componentes usam.
 *
 * Gravar hex direto num `stroke` congela o tema: `#74dfb8` sobre branco dá
 * 1,3:1 e a marca de dado simplesmente some. Passando pelo token, a mesma
 * marca vira o par escurecido quando o tema é claro.
 *
 * Funciona em atributo de SVG (`stroke={TINTA.grade}`), e não só em `style`:
 * o Chrome resolve `var()` na camada de atributo de apresentação. Verificado
 * em tela, nos dois temas.
 */
export const TINTA = {
  positivo: "var(--color-positivo)",
  positivoDim: "var(--color-positivo-dim)",
  negativo: "var(--color-negativo)",
  negativoDim: "var(--color-negativo-dim)",
  atencao: "var(--color-atencao)",
  direto: "var(--color-direto)",
  satelite: "var(--color-satelite)",
  superficie: "var(--color-card)",
  plano: "var(--color-plane)",
  grade: "var(--color-grid)",
  eixo: "var(--color-axis)",
  tinta: "var(--color-ink)",
  tintaSecundaria: "var(--color-ink-secondary)",
  tintaFraca: "var(--color-ink-muted)",
} as const;

/**
 * Rampa ordinal de energia, do mais cansado ao mais descansado.
 *
 * A DIREÇÃO se inverte entre os temas, e é de propósito: no escuro, mais
 * energia é mais clara; no claro, mais energia é mais saturada. Manter o hex
 * fixo deixaria o passo "muito descansado" quase invisível sobre branco — que
 * é justamente a faixa onde o jogador vai bem e o produto precisa mostrar.
 */
export const RAMPA_ENERGIA = [
  "var(--color-energia-1)",
  "var(--color-energia-2)",
  "var(--color-energia-3)",
  "var(--color-energia-4)",
  "var(--color-energia-5)",
] as const;

/** Especificações fixas de marca, iguais em todo gráfico. */
export const MARCA = {
  /** Linha: 2px, junta e ponta arredondadas. */
  linha: 2,
  /** Marcador ≥ 8px de diâmetro. */
  raioMarcador: 4.5,
  /** Anel na cor da superfície, 2px, para o marcador continuar legível. */
  anel: 2,
  /** Preenchimento de área: matiz da série a ~10%. */
  opacidadeArea: 0.1,
  /** Barra: no máximo 24px, ponta arredondada 4px. */
  espessuraMaxBarra: 24,
  raioBarra: 4,
  /** Respiro de 2px na cor da superfície entre marcas que se tocam. */
  respiro: 2,
} as const;

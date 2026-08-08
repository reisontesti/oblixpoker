/**
 * Registro das decisões de cor do Oblix.
 *
 * Toda cor de dado aqui foi passada pelo validador de paleta (modo dark,
 * superfície #0E1011). Resultados registrados para não serem re-derivados:
 *
 *   Tríade em tela simultânea — jade #199e70 · azul #3987e5 · laranja #d95926
 *     --pairs all: CVD ΔE 9.4 (deutan, alvo ≥ 8) · visão normal ΔE 20.9
 *     (piso ≥ 15) · contraste 5.60 / 4.72 / 4.42 :1 — todas ≥ 3:1.
 *
 *   Teto de 3 séries simultâneas: nenhum conjunto de 4 matizes passa
 *   --pairs all nas faixas do modo dark. Acima de 3, dobrar em "Outros"
 *   ou facetar — nunca gerar uma quarta matiz.
 *
 *   Rampa ordinal (energia): 5 passos de uma matiz, ΔL ≥ 0.06 entre
 *   vizinhos, ponta clara 2.95:1 sobre a superfície.
 *
 * Divisão de papéis — o ponto que evita ambiguidade no produto:
 *   · jade / vermelho / âmbar são ESTADO (lucro, prejuízo, atenção). Nunca
 *     viram "série 4". Sempre acompanhados de ícone + rótulo.
 *   · azul e laranja são IDENTIDADE (entrada direta × via satélite) e não
 *     carregam juízo de bom/ruim — é justamente o que o produto quer
 *     descobrir dos dados, então a cor não pode antecipar a resposta.
 *   · conquista (título, mesa final) não recebe matiz: recebe LUZ — tinta
 *     branca e brilho. Evita disputar significado com o âmbar e é o que dá
 *     o acabamento premium.
 */

export const CORES = {
  positivo: "#199e70",
  positivoDim: "#0f5f44",
  negativo: "#e05a5a",
  negativoDim: "#7a2f2f",
  atencao: "#d99a1f",
  direto: "#3987e5",
  satelite: "#d95926",
  superficie: "#0e1011",
  plano: "#08090a",
  grade: "#1c2021",
  eixo: "#2a2f30",
  tinta: "#f2f4f3",
  tintaSecundaria: "#9ba3a1",
  tintaFraca: "#6b7573",
} as const;

/** Rampa ordinal de energia, do mais cansado ao mais descansado. */
export const RAMPA_ENERGIA = [
  "#146b4e",
  "#178d63",
  "#1cae7b",
  "#38c795",
  "#74dfb8",
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

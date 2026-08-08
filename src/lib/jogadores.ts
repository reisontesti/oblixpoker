import type { PerfilJogador, TipoNota } from "@/lib/types";

/**
 * O que cada perfil significa na prática.
 *
 * A cor aqui não é decoração nem uma matiz por categoria — seis matizes de
 * badge seriam ruído puro numa tela que se lê de relance embaixo da mesa. Ela
 * codifica uma coisa só: este adversário é ameaça ou é oportunidade. E nunca
 * informa sozinha, porque o nome do perfil está sempre ao lado.
 */
export type Risco = "alto" | "medio" | "baixo";

export const PERFIL_META: Record<
  PerfilJogador,
  { risco: Risco; resumo: string; descricao: string }
> = {
  TAG: {
    risco: "alto",
    resumo: "Sólido",
    descricao: "Joga poucas mãos e joga bem. Evite potes marginais fora de posição.",
  },
  LAG: {
    risco: "alto",
    resumo: "Agressivo",
    descricao: "Range largo com agressão. Pague mais leve e deixe ele errar.",
  },
  Maníaco: {
    risco: "medio",
    resumo: "Imprevisível",
    descricao: "Constrói potes gigantes sem mão. Espere mão feita e deixe ele apostar.",
  },
  Nit: {
    risco: "baixo",
    resumo: "Explorável",
    descricao: "Foldeia demais. Roube os blinds e respeite qualquer aumento.",
  },
  Rock: {
    risco: "baixo",
    resumo: "Previsível",
    descricao: "Só entra com o topo do range. Ataque os blinds e saia quando ele acordar.",
  },
  "Calling Station": {
    risco: "baixo",
    resumo: "Paga demais",
    descricao: "Paga com qualquer coisa. Aposte valor nas três ruas e nunca blefe.",
  },
};

export const PERFIS = Object.keys(PERFIL_META) as PerfilJogador[];

export const COR_RISCO: Record<Risco, string> = {
  alto: "var(--color-atencao)",
  medio: "var(--color-ink-secondary)",
  baixo: "var(--color-positivo)",
};

export const ROTULO_NOTA: Record<TipoNota, string> = {
  leitura: "Leitura",
  tell: "Tell",
  exploracao: "Exploração",
  geral: "Geral",
};

/**
 * Idade da anotação, em dias, e o quanto ainda dá para confiar nela.
 *
 * Leitura de poker envelhece: o adversário estuda, muda de stake, corrige o
 * vazamento que você anotou. Passados uns meses, exibir a nota com a mesma
 * confiança de uma de ontem é pior do que não exibir nada — leva a decidir com
 * informação vencida.
 */
export function frescor(atualizadoEm: string, referencia: Date) {
  const dias = Math.floor(
    (referencia.getTime() - new Date(atualizadoEm).getTime()) / 86_400_000,
  );
  if (dias <= 45) return { dias, estado: "fresca" as const, aviso: null };
  if (dias <= 120)
    return { dias, estado: "envelhecendo" as const, aviso: "Leitura de alguns meses atrás" };
  return {
    dias,
    estado: "vencida" as const,
    aviso: "Leitura antiga — confirme antes de confiar",
  };
}

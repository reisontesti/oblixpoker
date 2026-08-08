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
  Sólido: {
    risco: "alto",
    resumo: "Joga bem",
    descricao: "Entra em poucas mãos e joga todas bem. Evite potes marginais fora de posição.",
  },
  "Solto agressivo": {
    risco: "alto",
    resumo: "Pressiona sempre",
    descricao: "Abre muita mão e aposta em todas as ruas. Pague mais leve e deixe ele errar.",
  },
  Maníaco: {
    risco: "medio",
    resumo: "Imprevisível",
    descricao: "Constrói potes gigantes sem mão. Espere mão feita e deixe ele apostar sozinho.",
  },
  "Pão-duro": {
    risco: "baixo",
    resumo: "Só entra com o topo",
    descricao: "Foldeia demais esperando mão grande. Roube os blinds e respeite qualquer aumento.",
  },
  Múmia: {
    risco: "baixo",
    resumo: "Não se move",
    descricao: "Passivo e travado: quase nunca aumenta. Ataque os blinds e saia quando ele acordar.",
  },
  "Paga-tudo": {
    risco: "baixo",
    resumo: "Não solta nada",
    descricao: "Paga com qualquer coisa até o river. Aposte valor nas três ruas e nunca blefe.",
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

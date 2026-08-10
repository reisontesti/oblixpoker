import { DIARIO, MOVIMENTOS, SATELITES, TORNEIOS } from "@/lib/data/seed";
import {
  indexarSatelites,
  porEnergia,
  resumir,
  serieBankroll,
  type PontoBankroll,
} from "@/lib/calc/metricas";
import { estatisticasSatelites } from "@/lib/calc/satelites";
import { desempenhoPorFase } from "@/lib/treino/motor";
import { FASES } from "@/lib/treino/tipos";

/**
 * Os números que a página de apresentação mostra.
 *
 * Saem da MESMA base de demonstração que o produto abre, passando pelos mesmos
 * cálculos — `resumir`, `serieBankroll`, `estatisticasSatelites`. Não são
 * escritos à mão numa constante.
 *
 * A diferença importa por dois motivos. Um: a vitrine não pode prometer uma
 * tela que o produto não entrega, e números datilografados divergem no dia em
 * que a métrica muda de definição. Dois: se a demonstração for ajustada, a
 * apresentação acompanha sozinha.
 *
 * São de um jogador FICTÍCIO, e a página diz isso onde os mostra. Um resultado
 * inventado apresentado como de usuário seria a única mentira que uma
 * ferramenta de dados não pode contar.
 *
 * Calculado no servidor, em tempo de build: a página é estática e não gasta um
 * byte de JavaScript do visitante para exibir isto.
 */

const IDX = indexarSatelites(SATELITES);

export const RESUMO = resumir(
  TORNEIOS,
  IDX,
  SATELITES.filter((s) => !s.torneioId),
);

export const SERIE: PontoBankroll[] = serieBankroll(TORNEIOS, SATELITES, MOVIMENTOS, IDX);

export const BANCA = SERIE.at(-1)?.saldo ?? 0;

export const PICO = SERIE.reduce((m, p) => Math.max(m, p.saldo), 0);

export const SATS = estatisticasSatelites(SATELITES);

export const ENERGIA = porEnergia(TORNEIOS, IDX);

export const HORAS = Math.round(RESUMO.minutosJogados / 60);

export const APORTADO = MOVIMENTOS.filter((m) => m.tipo === "aporte").reduce(
  (a, m) => a + m.valor,
  0,
);

export const SACADO = MOVIMENTOS.filter((m) => m.tipo === "saque").reduce(
  (a, m) => a + m.valor,
  0,
);

export const CHECKINS = DIARIO.length;

/**
 * A leitura de energia mais expressiva, para a seção de evolução.
 *
 * "Mais expressiva" é a de maior distância da faixa central em profundidade
 * média, entre as que têm amostra — a mesma régua de três torneios que o
 * produto usa antes de opinar. Sem amostra, devolve nulo e a seção mostra o
 * mecanismo em vez de um número.
 */
export const CONTRASTE_ENERGIA = (() => {
  const comAmostra = ENERGIA.filter((f) => f.torneios >= 3);
  if (comAmostra.length < 2) return null;
  const melhor = comAmostra.reduce((a, b) => (b.profundidadeMedia > a.profundidadeMedia ? b : a));
  const pior = comAmostra.reduce((a, b) => (b.profundidadeMedia < a.profundidadeMedia ? b : a));
  return { melhor, pior };
})();

/** As seis fases do Treino, com o rótulo e a descrição que o produto usa. */
export const FASES_DE_TREINO = FASES.map((f) => f);

/** Só para provar que a régua de amostra existe: sem histórico, não opina. */
export const TREINO_SEM_HISTORICO = desempenhoPorFase([], FASES[0]);

import type { ParadaSessao, SessaoAoVivo } from "@/lib/types";

/**
 * Leitura de uma sessão ao vivo.
 *
 * A régua aqui é **big blinds, não fichas**. Quarenta mil fichas é uma
 * montanha no nível 3 e é desespero no nível 18; quem joga torneio pensa em
 * "tenho 22 blinds", porque é isso que decide se dá para esperar mão ou se já
 * é hora de empurrar. Um gráfico de fichas subiria a sessão inteira mesmo com
 * o jogador afundando, já que os blinds crescem junto — mediria a estrutura do
 * torneio, não o desempenho de ninguém.
 *
 * A segunda régua é **quanto do campo já saiu**. Perder metade das fichas
 * enquanto metade do campo é eliminada não é perder terreno; é ficar no mesmo
 * lugar. As duas leituras juntas contam a história que uma sozinha não conta.
 */

/** Big blinds na mesa. Nulo quando falta um dos dois lados da razão. */
export function bigBlinds(p: ParadaSessao): number | null {
  if (!p.fichas || !p.blind || p.blind <= 0) return null;
  return p.fichas / p.blind;
}

/** Minutos desde o início do torneio. */
export function minutosDesdeInicio(sessao: SessaoAoVivo, iso: string): number {
  return Math.max(0, (new Date(iso).getTime() - new Date(sessao.iniciadaEm).getTime()) / 60_000);
}

/** Duração total; enquanto corre, conta até o instante informado. */
export function duracaoMin(sessao: SessaoAoVivo, agora: Date): number {
  const fim = sessao.finalizadaEm ? new Date(sessao.finalizadaEm) : agora;
  return Math.max(0, Math.round((fim.getTime() - new Date(sessao.iniciadaEm).getTime()) / 60_000));
}

export interface PontoSessao {
  minuto: number;
  bb: number | null;
  /**
   * Fração do campo já eliminada, de 0 a 1. É a mesma ideia de
   * `profundidade()` nos torneios fechados, medida no meio do caminho.
   */
  campoEliminado: number | null;
  posicao: number | null;
  parada: ParadaSessao;
}

export function curvaSessao(sessao: SessaoAoVivo): PontoSessao[] {
  const total = sessao.preparo.jogadores;
  return [...sessao.paradas]
    .sort((a, b) => a.em.localeCompare(b.em))
    .map((parada) => ({
      minuto: minutosDesdeInicio(sessao, parada.em),
      bb: bigBlinds(parada),
      campoEliminado:
        parada.jogadoresRestantes && total > 1
          ? Math.min(1, Math.max(0, (total - parada.jogadoresRestantes) / (total - 1)))
          : null,
      posicao: parada.posicao,
      parada,
    }));
}

export interface ResumoSessao {
  paradas: number;
  duracaoMin: number;
  /** Primeira e última leitura de stack, em big blinds. */
  bbInicial: number | null;
  bbFinal: number | null;
  bbPico: number | null;
  bbVale: number | null;
  /** Quantas leituras de stack existem — abaixo de duas não há curva. */
  leiturasDeStack: number;
  /** Quantas vezes o stack cruzou para baixo de 15 BBs (zona de shove). */
  vezesEmZonaCritica: number;
}

/** Onde o jogo deixa de ter jogadas pós-flop e vira all-in ou fold. */
export const ZONA_CRITICA_BB = 15;

export function resumirSessao(sessao: SessaoAoVivo, agora: Date): ResumoSessao {
  const curva = curvaSessao(sessao);
  const bbs = curva.map((p) => p.bb).filter((b): b is number => b !== null);

  return {
    paradas: sessao.paradas.length,
    duracaoMin: duracaoMin(sessao, agora),
    bbInicial: bbs[0] ?? null,
    bbFinal: bbs.at(-1) ?? null,
    bbPico: bbs.length ? Math.max(...bbs) : null,
    bbVale: bbs.length ? Math.min(...bbs) : null,
    leiturasDeStack: bbs.length,
    vezesEmZonaCritica: bbs.filter((b) => b < ZONA_CRITICA_BB).length,
  };
}

/**
 * A frase que o painel mostra sobre a sessão.
 *
 * Só afirma o que duas leituras sustentam. Com uma parada só não há trajetória
 * — e inventar narrativa a partir de um ponto é exatamente o tipo de conclusão
 * que o resto do Oblix se recusa a tirar.
 */
export function lerSessao(sessao: SessaoAoVivo, agora: Date): string | null {
  const r = resumirSessao(sessao, agora);
  if (r.leiturasDeStack < 2 || r.bbInicial === null || r.bbFinal === null) return null;

  const delta = r.bbFinal - r.bbInicial;
  const horas = (r.duracaoMin / 60).toFixed(1).replace(".", ",");

  if (r.vezesEmZonaCritica > 0 && r.bbFinal >= ZONA_CRITICA_BB) {
    return `Você esteve abaixo de ${ZONA_CRITICA_BB} blinds em ${r.vezesEmZonaCritica} ${
      r.vezesEmZonaCritica === 1 ? "intervalo" : "intervalos"
    } e voltou — terminou o registro com ${Math.round(r.bbFinal)}.`;
  }
  if (Math.abs(delta) < 5) {
    return `Stack quase parado ao longo de ${horas}h: de ${Math.round(r.bbInicial)} para ${Math.round(r.bbFinal)} blinds.`;
  }
  return delta > 0
    ? `Você construiu stack: de ${Math.round(r.bbInicial)} para ${Math.round(r.bbFinal)} blinds em ${horas}h.`
    : `Seu stack encolheu de ${Math.round(r.bbInicial)} para ${Math.round(r.bbFinal)} blinds em ${horas}h.`;
}

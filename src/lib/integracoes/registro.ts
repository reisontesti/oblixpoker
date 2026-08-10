import { bodog } from "@/lib/integracoes/bodog";
import { ggpoker } from "@/lib/integracoes/ggpoker";
import { pokerstars } from "@/lib/integracoes/pokerstars";
import { suprema } from "@/lib/integracoes/suprema";
import { wptGlobal } from "@/lib/integracoes/wpt-global";
import type { Conector, EstadoDaSala, Leitura } from "@/lib/integracoes/tipos";

/**
 * O registro de salas.
 *
 * Acrescentar uma sala é acrescentar uma pasta em `integracoes/` e um item
 * nesta lista. Nada mais no Oblix precisa saber que ela existe — o painel, o
 * treino e o banco de jogadores trabalham sobre o modelo normalizado.
 *
 * DUAS INVARIANTES, verificadas aqui e não confiadas ao cuidado de quem
 * escreve o próximo conector:
 *
 * 1. **O estado é derivado, não declarado.** Uma sala só é `disponivel` se
 *    tiver `ler`. Sem isso, bastaria alguém esquecer de virar uma flag para o
 *    produto prometer importação que não existe.
 *
 * 2. **A política manda no que é oferecido.** Um método listado em `metodos`
 *    que a própria política proíbe é removido — não é sinalizado num comentário
 *    para alguém ler depois.
 */

const BRUTOS: Conector[] = [pokerstars, ggpoker, suprema, wptGlobal, bodog];

function conferir(c: Conector): Conector {
  const metodos = c.info.metodos.filter((m) => !c.info.politica.proibidos.includes(m));

  const estado: EstadoDaSala = c.ler
    ? "disponivel"
    : c.info.politica.permitidos.length === 0 && c.info.politica.restringeTerceiros
      ? "em_desenvolvimento"
      : "em_desenvolvimento";

  return { ...c, info: { ...c.info, metodos, estado } };
}

export const SALAS: Conector[] = BRUTOS.map(conferir);

export const salaPorChave = (chave: string) => SALAS.find((s) => s.info.chave === chave) ?? null;

export const SALAS_PRONTAS = SALAS.filter((s) => s.info.estado === "disponivel");

/**
 * De qual sala é este arquivo?
 *
 * Pergunta a cada conector que sabe se reconhecer. Nulo quando nenhum
 * responde — e aí a interface diz que não reconheceu, em vez de tentar ler com
 * um parser qualquer e devolver zero mãos sem explicação.
 */
export function detectarSala(texto: string): Conector | null {
  return SALAS.find((s) => s.reconhece?.(texto)) ?? null;
}

export interface ResultadoDaLeitura {
  leitura: Leitura | null;
  sala: Conector | null;
  erro: string | null;
}

/** Lê um arquivo, descobrindo sozinho de qual sala ele é. */
export function lerArquivo(texto: string, nome: string): ResultadoDaLeitura {
  const sala = detectarSala(texto);
  if (!sala || !sala.ler) {
    return {
      leitura: null,
      sala,
      erro:
        `Não reconheci ${nome}. Hoje o Oblix lê o histórico de mãos e o resumo de torneio do ` +
        "PokerStars. As outras salas estão registradas, mas ainda sem formato de importação confirmado.",
    };
  }
  return { leitura: sala.ler(texto, nome), sala, erro: null };
}

import { contar, somar, ZERADO, type Contadores } from "@/lib/integracoes/estatisticas";
import type { Leitura, Mao, TorneioDaSala } from "@/lib/integracoes/tipos";
import type { Torneio } from "@/lib/types";

/**
 * Da leitura do arquivo para o domínio do Oblix.
 *
 * A DECISÃO QUE GOVERNA ESTE ARQUIVO: as mãos NÃO são guardadas.
 *
 * Um torneio de 200 mãos vira 200 registros de 1 a 2 kB. Cem torneios seriam
 * 30 MB — seis vezes o que cabe no `localStorage`, e uma leitura pesada em
 * toda abertura do app para quem tem conta. Guardar tudo "porque um dia pode
 * ser útil" seria trocar o funcionamento de hoje por uma possibilidade.
 *
 * O que fica é o que responde às perguntas: CONTADORES por jogador e por
 * torneio. Eles somam, carregam a amostra junto e permitem recortar por
 * período — que é tudo o que as estatísticas da spec precisam. As mãos
 * cumpriram o papel delas ao serem contadas.
 *
 * O efeito colateral é de privacidade, e é bem-vindo: o arquivo é lido no
 * navegador, vira número, e o texto com as cartas de todo mundo nunca chega a
 * lugar nenhum.
 */

// ── impressão digital ──────────────────────────────────────────────────────

/**
 * O que identifica um torneio de forma estável entre importações.
 *
 * Sala e id da sala bastariam se o id fosse sempre confiável. Não é: resumos
 * antigos e alguns formatos não trazem. Por isso a digital cai para nome +
 * data + herói quando falta o id — e a data entra só até o dia, porque o mesmo
 * torneio aparece com horários levemente diferentes no resumo e nas mãos.
 */
export function digital(t: { sala: string; idDaSala: string; nome: string; data: string; heroi: string }) {
  const dia = t.data.slice(0, 10);
  return t.idDaSala
    ? `${t.sala}:${t.idDaSala}:${t.heroi}`
    : `${t.sala}:${t.nome}:${dia}:${t.heroi}`;
}

// ── estatísticas guardadas ─────────────────────────────────────────────────

/**
 * Contadores de um jogador num torneio.
 *
 * A granularidade é o torneio, e não o período, porque é ela que permite todos
 * os recortes depois: últimos 30 dias, últimos 90, todo o período, por sala,
 * por stake. Guardar já agregado por mês fecharia portas que não custam nada
 * manter abertas.
 */
export interface Observacao {
  id: string;
  sala: string;
  /** Nome na sala. `null` quando é o próprio jogador. */
  adversario: string | null;
  /** Id do torneio no Oblix. */
  torneioId: string;
  data: string;
  contadores: Contadores;
  /**
   * A digital do torneio de origem, guardada na linha do próprio jogador.
   *
   * Guardada, e não recalculada: reconstruí-la a partir do torneio do Oblix
   * exigiria o id da sala e o nome do herói, que não sobrevivem à
   * normalização. A trava de duplicata falharia em silêncio — e falhar em
   * silêncio numa trava de duplicata significa a banca contando o mesmo
   * prêmio duas vezes.
   */
  digitalDoTorneio?: string;
}

// ── plano de importação ────────────────────────────────────────────────────

export interface TorneioAImportar {
  digital: string;
  /** Já existe no Oblix? Aí a interface pergunta antes de duplicar. */
  duplicado: boolean;
  torneio: Omit<Torneio, "id" | "sateliteId">;
  /** Contadores do herói neste torneio. */
  heroi: Contadores;
  /** Contadores de cada adversário neste torneio. */
  adversarios: { nome: string; contadores: Contadores }[];
  maos: number;
}

export interface Plano {
  sala: string;
  heroi: string;
  torneios: TorneioAImportar[];
  avisos: string[];
}

/** Minutos entre a primeira e a última mão. Zero com menos de duas. */
function duracaoDe(maos: Mao[]): number {
  if (maos.length < 2) return 0;
  const t = maos.map((m) => new Date(m.data).getTime()).sort((a, b) => a - b);
  return Math.max(0, Math.round((t[t.length - 1] - t[0]) / 60_000));
}

/**
 * Monta o plano sem gravar nada.
 *
 * Separado da gravação de propósito: é o plano que a tela mostra antes de
 * confirmar, e é ele que diz "este torneio já está no Oblix". Uma importação
 * que grava enquanto explica não tem como ser cancelada no meio.
 */
export function planejar(
  leitura: Leitura,
  heroi: string,
  digitaisExistentes: Set<string>,
): Plano {
  const avisos = [...leitura.avisos];
  const minhas = leitura.maos.filter((m) => m.heroi === heroi || m.jogadores.includes(heroi));

  // As mãos, agrupadas pelo torneio da sala. Mão sem torneio é cash game — e o
  // Oblix hoje é de torneio, então ela é contada nos adversários mas não vira
  // registro de torneio.
  const porTorneio = new Map<string, Mao[]>();
  for (const m of minhas) {
    const chave = m.torneioDaSala ?? "";
    (porTorneio.get(chave) ?? porTorneio.set(chave, []).get(chave)!).push(m);
  }

  const resumos = new Map(leitura.torneios.map((t) => [t.idDaSala, t]));
  const torneios: TorneioAImportar[] = [];

  for (const [idDaSala, maos] of porTorneio) {
    if (!idDaSala) continue;
    const resumo: TorneioDaSala | undefined = resumos.get(idDaSala);

    const contagem = contar(maos);
    const doHeroi = contagem.get(heroi) ?? ZERADO;
    const adversarios = [...contagem.entries()]
      .filter(([nome]) => nome !== heroi)
      .map(([nome, contadores]) => ({ nome, contadores }));

    const data = resumo?.data ?? maos[0].data;
    const nome = resumo?.nome ?? `Torneio ${idDaSala}`;
    const dig = digital({ sala: leitura.sala, idDaSala, nome, data, heroi });

    // Sem resumo de torneio não há colocação nem premiação: o histórico de
    // mãos não carrega o resultado. O registro entra com o que se sabe, e a
    // tela diz o que falta — em vez de inventar um quarto lugar.
    if (!resumo) {
      avisos.push(
        `O torneio ${idDaSala} veio sem resumo: dá para saber as mãos, não a colocação nem o prêmio. ` +
          "Importe também o resumo do torneio, ou complete na tela de edição.",
      );
    }

    torneios.push({
      digital: dig,
      duplicado: digitaisExistentes.has(dig),
      maos: maos.length,
      heroi: doHeroi,
      adversarios,
      torneio: {
        data,
        nome,
        clube: leitura.sala === "pokerstars" ? "PokerStars" : leitura.sala,
        modalidade: resumo?.modalidade ?? "MTT",
        buyIn: (resumo?.buyIn ?? 0) + (resumo?.taxa ?? 0),
        rebuys: (resumo?.rebuys ?? 0) * ((resumo?.buyIn ?? 0) + (resumo?.taxa ?? 0)),
        addon: 0,
        jogadores: resumo?.jogadores ?? 0,
        colocacao: resumo?.colocacao ?? null,
        premiacao: resumo?.premiacao ?? 0,
        duracaoMin: resumo?.duracaoMin || duracaoDe(maos),
        via: "direto",
        // Energia e disciplina são autoavaliação: o arquivo não sabe como a
        // pessoa estava, e preencher com um valor médio criaria um dado falso
        // dentro da análise que mais depende de sinceridade.
        energia: null,
        notaDisciplina: null,
      },
    });
  }

  return { sala: leitura.sala, heroi, torneios, avisos };
}

/** Junta observações do mesmo jogador — a soma que os contadores permitem. */
export function totalizar(observacoes: Observacao[]): Map<string, Contadores> {
  const saida = new Map<string, Contadores>();
  for (const o of observacoes) {
    const chave = o.adversario ?? "";
    saida.set(chave, somar(saida.get(chave) ?? ZERADO, o.contadores));
  }
  return saida;
}

/** Recorta por janela de dias antes de totalizar. `null` = todo o período. */
export function recortar(observacoes: Observacao[], dias: number | null, agora: Date) {
  if (dias === null) return observacoes;
  const limite = agora.getTime() - dias * 86_400_000;
  return observacoes.filter((o) => new Date(o.data).getTime() >= limite);
}

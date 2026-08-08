"use client";

import { useMemo, useSyncExternalStore } from "react";
import { METAS_TECNICAS } from "@/lib/data/seed";
import {
  assinar,
  obterInstantaneo,
  obterInstantaneoServidor,
  type Estado,
} from "@/lib/data/repositorio";
import {
  ehMesaFinal,
  ehTitulo,
  indexarSatelites,
  janela,
  porEnergia,
  porMes,
  recortar,
  resumir,
  saldoEm,
  serieBankroll,
  variacaoPct,
  type PeriodoChave,
  type PeriodoManual,
} from "@/lib/calc/metricas";
import {
  compararVias,
  distribuicaoEnergia,
  estatisticasSatelites,
  recomendar,
} from "@/lib/calc/satelites";
import type { ChaveMeta, LinhaSaude, MedicaoTecnica } from "@/lib/types";
import { gerarInsights } from "@/lib/calc/insights";

/**
 * Base viva: começa na demonstração e passa a incluir o que o jogador
 * registrou assim que o localStorage é lido, no cliente. No modo próprio a
 * base semeada some por inteiro e sobra só o que ele registrou.
 */
export function useRegistros(): Estado {
  return useSyncExternalStore(assinar, obterInstantaneo, obterInstantaneoServidor);
}

/**
 * Os clubes que este jogador conhece, para autocompletar os formulários.
 *
 * Sai do que ele já registrou, e não de uma lista fixa: na demonstração vem do
 * perfil semeado, e para quem começou do zero nasce vazio e cresce a cada
 * torneio digitado.
 */
export function useClubes(): string[] {
  const registros = useRegistros();
  return useMemo(() => {
    const vistos = new Set<string>(registros.perfil.clubes);
    for (const t of registros.torneios) if (t.clube) vistos.add(t.clube);
    for (const s of registros.satelites) if (s.clube) vistos.add(s.clube);
    for (const j of registros.jogadores) if (j.clube) vistos.add(j.clube);
    return [...vistos].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [registros]);
}

export type EstadoMeta = "concluida" | "no_ritmo" | "atencao" | "nao_comecou";

export interface MetaCalculada {
  id: ChaveMeta;
  titulo: string;
  detalhe: string;
  atual: number;
  alvo: number;
  /** Desligada some do cartão, mas continua editável no modo de edição. */
  ativa: boolean;
  progresso: number;
  estado: EstadoMeta;
  formatar: (v: number) => string;
  /** Como o alvo se comporta no campo de edição. */
  editar: {
    rotulo: string;
    prefixo?: string;
    passo: number;
    minimo: number;
    maximo?: number;
  };
}

/**
 * Onde "no ritmo" começa, como fração do alvo.
 *
 * Uma régua relativa e não um número absoluto: quem troca 20 mesas finais por
 * 6 continua sendo lido com o mesmo critério, e nenhuma meta editada passa a
 * nascer atrasada por acidente.
 */
const DOIS_TERCOS = 2 / 3;

/**
 * Confronta a última medição técnica com a faixa saudável e com a penúltima.
 *
 * Sem medição nenhuma devolve vazio, e o cartão explica de onde esses números
 * vêm — estimar o estilo de jogo de alguém por aproximação seria pior do que
 * não mostrar nada, justamente no cartão que a pessoa consultaria para se
 * corrigir. Com uma só, a coluna "anterior" repete a atual: não há evolução a
 * mostrar ainda, e inventar um ponto de partida criaria uma seta falsa.
 */
function avaliarSaude(medicoes: MedicaoTecnica[]): LinhaSaude[] {
  const atual = medicoes.at(-1);
  if (!atual) return [];
  const anterior = medicoes.at(-2) ?? atual;

  return METAS_TECNICAS.map((m) => {
    const valor = atual[m.chave];
    const antes = anterior[m.chave];
    const distancia = (v: number) => (v < m.min ? m.min - v : v > m.max ? v - m.max : 0);
    return {
      chave: m.chave,
      rotulo: m.rotulo,
      descricao: m.descricao,
      valor,
      anterior: antes,
      min: m.min,
      max: m.max,
      estado: valor < m.min ? "abaixo" : valor > m.max ? "acima" : "dentro",
      melhorou: distancia(valor) < distancia(antes),
    };
  });
}

export function usePainel(periodo: PeriodoChave, manual?: PeriodoManual) {
  const registros = useRegistros();
  // Desmembrado para o memo comparar os valores, e não a identidade do objeto:
  // um literal recriado a cada render invalidaria o cálculo inteiro sempre.
  const de = manual?.de;
  const ate = manual?.ate;

  return useMemo(() => {
    const { torneios: TORNEIOS, satelites: SATELITES, movimentos: MOVIMENTOS } = registros;
    const HOJE = registros.hoje;
    const ANO_CORRENTE = HOJE.getUTCFullYear();
    const noAnoCorrente = (iso: string) => new Date(iso).getUTCFullYear() === ANO_CORRENTE;

    const IDX = indexarSatelites(SATELITES);
    const SERIE = serieBankroll(TORNEIOS, SATELITES, MOVIMENTOS, IDX);

    // Base vazia é o estado normal de quem acabou de começar, não um caso de
    // erro: sem nenhum evento, a janela "tudo" começa hoje mesmo e o saldo é
    // zero. Ler `SERIE[0]` direto quebraria o painel no primeiro segundo de uso.
    const jan = janela(periodo, HOJE, SERIE[0]?.t ?? HOJE.getTime(), de && ate ? { de, ate } : undefined);
    const atual = recortar(TORNEIOS, SATELITES, IDX, jan.inicio, jan.fim);
    const anterior = recortar(TORNEIOS, SATELITES, IDX, jan.inicioAnterior, jan.inicio);

    const bankroll = SERIE.at(-1)?.saldo ?? 0;
    const bankrollAntes = saldoEm(SERIE, jan.inicio);
    const serieRecorte = SERIE.filter((p) => p.t >= jan.inicio && p.t <= jan.fim);

    const geral = resumir(
      TORNEIOS,
      IDX,
      SATELITES.filter((s) => !s.torneioId),
    );

    const statsSat = estatisticasSatelites(SATELITES);
    const comparacao = compararVias(TORNEIOS, IDX);
    const recomendacao = recomendar(comparacao, statsSat, bankroll, registros.perfil.buyInPadrao);

    const disciplinaRecente = (() => {
      const ultimos = TORNEIOS.filter((t) => t.notaDisciplina !== null).slice(-20);
      if (!ultimos.length) return 0;
      return ultimos.reduce((a, t) => a + (t.notaDisciplina ?? 0), 0) / ultimos.length;
    })();

    const mesasFinaisAno = TORNEIOS.filter((t) => noAnoCorrente(t.data) && ehMesaFinal(t)).length;
    const titulosAno = TORNEIOS.filter((t) => noAnoCorrente(t.data) && ehTitulo(t)).length;

    // A meta de banca acompanha de onde o jogador partiu: dobrar os R$ 500 de
    // quem está começando é uma meta; os R$ 12.000 fixos da demonstração seriam
    // um número estrangeiro, longe o bastante para a barra nunca sair do lugar.
    const aportado = MOVIMENTOS.filter((m) => m.tipo === "aporte").reduce(
      (a, m) => a + m.valor,
      0,
    );
    const metaBanca =
      registros.modo === "demonstracao"
        ? 12_000
        : Math.max(1_000, Math.ceil((aportado * 2) / 500) * 500);

    // Antes do primeiro torneio nenhuma meta tem ritmo do qual se atrasar.
    const aindaNaoComecou = TORNEIOS.length === 0;
    const ritmo = (concluida: boolean, noRitmo: boolean): EstadoMeta =>
      concluida ? "concluida" : aindaNaoComecou ? "nao_comecou" : noRitmo ? "no_ritmo" : "atencao";

    // O alvo do jogador vence o padrão; "no ritmo" é sempre dois terços do
    // caminho, seja o alvo dele ou o nosso. Amarrar a régua ao alvo em vez de
    // fixá-la em número absoluto é o que mantém a leitura coerente quando
    // alguém troca 20 mesas finais por 6.
    const alvoDe = (chave: ChaveMeta, padrao: number) =>
      registros.metas[chave]?.alvo ?? padrao;
    const ativa = (chave: ChaveMeta) => registros.metas[chave]?.ativa ?? true;

    const alvoMesasFinais = alvoDe("mesas-finais", 20);
    const alvoBanca = alvoDe("banca", metaBanca);
    const alvoDisciplina = alvoDe("disciplina", 9);
    const alvoTitulos = alvoDe("titulos", 3);

    const metas: MetaCalculada[] = [
      {
        id: "mesas-finais",
        titulo: `Mesas finais em ${ANO_CORRENTE}`,
        detalhe: "Chegar entre os 9 últimos",
        atual: mesasFinaisAno,
        alvo: alvoMesasFinais,
        ativa: ativa("mesas-finais"),
        progresso: Math.min(1, mesasFinaisAno / alvoMesasFinais),
        estado: ritmo(
          mesasFinaisAno >= alvoMesasFinais,
          mesasFinaisAno >= alvoMesasFinais * DOIS_TERCOS,
        ),
        formatar: (v) => String(Math.round(v)),
        editar: { rotulo: "Mesas finais no ano", passo: 1, minimo: 1 },
      },
      {
        id: "banca",
        titulo: `Banca de R$ ${alvoBanca.toLocaleString("pt-BR")}`,
        detalhe: "Sem aportes novos",
        atual: bankroll,
        alvo: alvoBanca,
        ativa: ativa("banca"),
        progresso: Math.min(1, bankroll / alvoBanca),
        estado: ritmo(bankroll >= alvoBanca, bankroll >= alvoBanca * DOIS_TERCOS),
        formatar: (v) => `R$ ${Math.round(v).toLocaleString("pt-BR")}`,
        editar: { rotulo: "Banca que quero alcançar", prefixo: "R$", passo: 100, minimo: 100 },
      },
      {
        id: "disciplina",
        titulo: `Disciplina média ${alvoDisciplina.toFixed(1).replace(".", ",")}`,
        detalhe: "Média dos últimos 20 torneios",
        atual: disciplinaRecente,
        alvo: alvoDisciplina,
        ativa: ativa("disciplina"),
        progresso: Math.min(1, disciplinaRecente / alvoDisciplina),
        estado: ritmo(
          disciplinaRecente >= alvoDisciplina,
          disciplinaRecente >= alvoDisciplina * DOIS_TERCOS,
        ),
        formatar: (v) => v.toFixed(1).replace(".", ","),
        editar: { rotulo: "Nota média de disciplina", passo: 0.5, minimo: 1, maximo: 10 },
      },
      {
        id: "titulos",
        titulo: `Títulos em ${ANO_CORRENTE}`,
        detalhe: "Vencer um torneio inteiro",
        atual: titulosAno,
        alvo: alvoTitulos,
        ativa: ativa("titulos"),
        progresso: Math.min(1, titulosAno / alvoTitulos),
        estado: ritmo(titulosAno >= alvoTitulos, titulosAno >= alvoTitulos * DOIS_TERCOS),
        formatar: (v) => String(Math.round(v)),
        editar: { rotulo: "Títulos no ano", passo: 1, minimo: 1 },
      },
    ];

    const saude = avaliarSaude(registros.medicoes);
    const energia = porEnergia(TORNEIOS, IDX);

    return {
      insights: gerarInsights({
        torneios: TORNEIOS,
        idx: IDX,
        geral,
        energia,
        comparacao,
        statsSat,
        saude,
        disciplinaRecente,
      }),
      modo: registros.modo,
      perfil: registros.perfil,
      hoje: HOJE,
      janela: jan,
      atual,
      anterior,
      geral,
      serie: SERIE,
      serieRecorte,
      bankroll,
      bankrollAntes,
      variacaoBankroll: variacaoPct(bankroll, bankrollAntes),
      variacaoRoi: atual.resumo.roi - anterior.resumo.roi,
      variacaoDisciplina: atual.resumo.disciplina - anterior.resumo.disciplina,
      torneios: TORNEIOS,
      satelites: SATELITES,
      idx: IDX,
      registrosProprios: registros.proprios,
      statsSat,
      comparacao,
      recomendacao,
      energia,
      energiaPorVia: distribuicaoEnergia(TORNEIOS),
      mensal: porMes(TORNEIOS, IDX),
      saude,
      medicaoAtual: registros.medicoes.at(-1) ?? null,
      metas,
      disciplinaRecente,
      mesasFinaisAno,
      titulosAno,
    };
  }, [periodo, de, ate, registros]);
}

export type DadosPainel = ReturnType<typeof usePainel>;

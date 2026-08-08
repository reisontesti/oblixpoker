"use client";

import { useMemo, useSyncExternalStore } from "react";
import { METAS_TECNICAS, SAUDE_ANTERIOR, SAUDE_ATUAL } from "@/lib/data/seed";
import {
  assinar,
  obterInstantaneo,
  obterInstantaneoServidor,
  type Estado,
  type ModoBase,
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
} from "@/lib/calc/metricas";
import {
  compararVias,
  distribuicaoEnergia,
  estatisticasSatelites,
  recomendar,
} from "@/lib/calc/satelites";
import type { LinhaSaude } from "@/lib/types";
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
  id: string;
  titulo: string;
  detalhe: string;
  atual: number;
  alvo: number;
  progresso: number;
  estado: EstadoMeta;
  formatar: (v: number) => string;
}

/**
 * Indicadores técnicos (VPIP, PFR, 3bet…) só existem na demonstração.
 *
 * Eles vêm de histórico de mãos, e o Oblix ainda não importa nenhum. Exibir a
 * amostra semeada para quem está nos próprios dados seria atribuir ao jogador
 * um estilo de jogo que ninguém mediu — pior do que não mostrar nada. No modo
 * próprio o cartão fica vazio e diz por quê.
 */
function avaliarSaude(modo: ModoBase): LinhaSaude[] {
  if (modo !== "demonstracao") return [];
  return METAS_TECNICAS.map((m) => {
    const valor = SAUDE_ATUAL[m.chave];
    const anterior = SAUDE_ANTERIOR[m.chave];
    const distancia = (v: number) => (v < m.min ? m.min - v : v > m.max ? v - m.max : 0);
    return {
      chave: m.chave,
      rotulo: m.rotulo,
      descricao: m.descricao,
      valor,
      anterior,
      min: m.min,
      max: m.max,
      estado: valor < m.min ? "abaixo" : valor > m.max ? "acima" : "dentro",
      melhorou: distancia(valor) < distancia(anterior),
    };
  });
}

export function usePainel(periodo: PeriodoChave) {
  const registros = useRegistros();

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
    const jan = janela(periodo, HOJE, SERIE[0]?.t ?? HOJE.getTime());
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

    const metas: MetaCalculada[] = [
      {
        id: "mesas-finais",
        titulo: `Mesas finais em ${ANO_CORRENTE}`,
        detalhe: "Chegar entre os 9 últimos",
        atual: mesasFinaisAno,
        alvo: 20,
        progresso: Math.min(1, mesasFinaisAno / 20),
        estado: ritmo(mesasFinaisAno >= 20, mesasFinaisAno >= 12),
        formatar: (v) => String(Math.round(v)),
      },
      {
        id: "banca",
        titulo: `Banca de R$ ${metaBanca.toLocaleString("pt-BR")}`,
        detalhe: "Sem aportes novos",
        atual: bankroll,
        alvo: metaBanca,
        progresso: Math.min(1, bankroll / metaBanca),
        estado: ritmo(bankroll >= metaBanca, bankroll >= metaBanca * 0.66),
        formatar: (v) => `R$ ${Math.round(v).toLocaleString("pt-BR")}`,
      },
      {
        id: "disciplina",
        titulo: "Disciplina média 9,0",
        detalhe: "Média dos últimos 20 torneios",
        atual: disciplinaRecente,
        alvo: 9,
        progresso: Math.min(1, disciplinaRecente / 9),
        estado: ritmo(disciplinaRecente >= 9, disciplinaRecente >= 8),
        formatar: (v) => v.toFixed(1).replace(".", ","),
      },
      {
        id: "titulos",
        titulo: `Títulos em ${ANO_CORRENTE}`,
        detalhe: "Vencer um torneio inteiro",
        atual: titulosAno,
        alvo: 3,
        progresso: Math.min(1, titulosAno / 3),
        estado: ritmo(titulosAno >= 3, titulosAno >= 2),
        formatar: (v) => String(Math.round(v)),
      },
    ];

    const saude = avaliarSaude(registros.modo);
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
      metas,
      disciplinaRecente,
      mesasFinaisAno,
      titulosAno,
    };
  }, [periodo, registros]);
}

export type DadosPainel = ReturnType<typeof usePainel>;

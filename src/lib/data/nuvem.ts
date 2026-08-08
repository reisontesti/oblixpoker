"use client";

import { obterSupabase } from "@/lib/supabase/cliente";
import {
  diarioParaLinha,
  jogadorParaLinha,
  linhaParaDiario,
  linhaParaJogador,
  linhaParaMedicao,
  linhaParaMeta,
  linhaParaMovimento,
  linhaParaSatelite,
  linhaParaTorneio,
  medicaoParaLinha,
  metaParaLinha,
  movimentoParaLinha,
  notaParaLinha,
  sateliteParaLinha,
  torneioParaLinha,
  type Linha,
} from "@/lib/data/mapa";
import type { Registros } from "@/lib/data/repositorio";
import type { Jogador, Perfil } from "@/lib/types";

/**
 * A base do jogador no Postgres.
 *
 * O modelo é **carregar tudo uma vez e escrever atravessando**: a base inteira
 * vem numa leva no login e vive em memória; cada alteração muda a memória na
 * hora e vai para o banco em seguida.
 *
 * Parece antiquado e é o certo aqui. O painel calcula banca, ROI e comparação
 * entre vias sobre a série COMPLETA — nenhuma tela mostra uma página de
 * resultados — então paginar não economizaria nada e só adiaria o primeiro
 * render. E manter a leitura síncrona é o que preserva todas as telas como
 * estão: transformar `usePainel` em assíncrono espalharia estado de carregando
 * por trinta componentes para servir algumas centenas de linhas.
 *
 * A escrita não bloqueia a interface. O jogador registra um torneio e vê o
 * painel mudar na hora; se a rede falhar, o erro sobe por `aoFalhar` e o
 * registro continua em memória. Poker se anota no celular, no clube, com sinal
 * ruim — travar a tela esperando um POST seria o pior desenho possível.
 */

export type Tabela =
  | "torneios"
  | "satelites"
  | "movimentos"
  | "jogadores"
  | "notas_jogador"
  | "diario"
  | "saude_tecnica"
  | "metas";

/** Avisado quando uma escrita falha — a interface decide o que dizer. */
let aoFalhar: ((erro: string) => void) | null = null;
export const definirTratadorDeFalha = (f: (erro: string) => void) => {
  aoFalhar = f;
};

const falhou = (contexto: string, erro: { message: string }) => {
  console.error(`[oblix] ${contexto}:`, erro.message);
  aoFalhar?.(`Não consegui salvar ${contexto}. Está gravado neste aparelho e vai subir na próxima vez.`);
};

// ── leitura ────────────────────────────────────────────────────────────────

export interface BaseDaNuvem {
  registros: Registros;
  perfil: Perfil | null;
}

/**
 * Traz tudo do usuário logado. As consultas vão em paralelo porque não
 * dependem umas das outras — o vínculo entre satélite e torneio é resolvido
 * por id, em memória, e não por join.
 */
export async function carregarDaNuvem(): Promise<BaseDaNuvem | null> {
  const sb = obterSupabase();
  if (!sb) return null;

  const [perfis, torneios, satelites, movimentos, jogadores, notas, diario, medicoes, metas] =
    await Promise.all([
      sb.from("perfis").select("*").maybeSingle(),
      sb.from("torneios").select("*").order("data"),
      sb.from("satelites").select("*").order("data"),
      sb.from("movimentos").select("*").order("data"),
      sb.from("jogadores").select("*").order("nome"),
      sb.from("notas_jogador").select("*").order("data", { ascending: false }),
      sb.from("diario").select("*").order("data"),
      sb.from("saude_tecnica").select("*").order("data"),
      sb.from("metas").select("*"),
    ]);

  const erro = [perfis, torneios, satelites, movimentos, jogadores, notas, diario, medicoes, metas]
    .map((r) => r.error)
    .find(Boolean);
  if (erro) {
    falhou("os seus dados", erro);
    return null;
  }

  // As notas chegam soltas e são agrupadas aqui: o produto nunca lê uma nota
  // fora do adversário a que ela pertence.
  const notasPorJogador = new Map<string, Linha[]>();
  for (const n of (notas.data ?? []) as Linha[]) {
    const id = String(n.jogador_id);
    (notasPorJogador.get(id) ?? notasPorJogador.set(id, []).get(id)!).push(n);
  }

  const listaJogadores: Record<string, Jogador> = {};
  for (const l of (jogadores.data ?? []) as Linha[]) {
    const j = linhaParaJogador(l, notasPorJogador.get(String(l.id)) ?? []);
    listaJogadores[j.id] = j;
  }

  const registros: Registros = {
    torneios: ((torneios.data ?? []) as Linha[]).map(linhaParaTorneio),
    satelites: ((satelites.data ?? []) as Linha[]).map(linhaParaSatelite),
    movimentos: ((movimentos.data ?? []) as Linha[]).map(linhaParaMovimento),
    jogadores: listaJogadores,
    // Mesa em andamento e sessão ao vivo são estado do APARELHO, não da conta.
    // Quem está sentado com você agora, e o torneio que você está jogando
    // neste momento, não fazem sentido em outro dispositivo — ninguém começa
    // um torneio no celular e termina no computador.
    mesaAtual: [],
    sessao: null,
    diario: ((diario.data ?? []) as Linha[]).map(linhaParaDiario),
    medicoes: ((medicoes.data ?? []) as Linha[]).map(linhaParaMedicao),
    metas: Object.fromEntries(
      ((metas.data ?? []) as Linha[]).map((l) => {
        const m = linhaParaMeta(l);
        return [`${m.ano}:${m.chave}`, m];
      }),
    ),
  };

  const perfil = perfis.data ? linhaParaPerfil(perfis.data as Linha) : null;
  return { registros, perfil };
}

// ── escrita ────────────────────────────────────────────────────────────────

export async function salvarPerfil(perfil: Perfil, usuarioId: string) {
  const sb = obterSupabase();
  if (!sb) return;
  const { error } = await sb.from("perfis").upsert(perfilParaLinha(perfil, usuarioId));
  if (error) falhou("o seu perfil", error);
}

export async function gravar(tabela: Tabela, linha: Linha, contexto: string) {
  const sb = obterSupabase();
  if (!sb) return;
  const { error } = await sb.from(tabela).upsert(linha);
  if (error) falhou(contexto, error);
}

export async function apagar(tabela: Tabela, coluna: string, valor: string, contexto: string) {
  const sb = obterSupabase();
  if (!sb) return;
  const { error } = await sb.from(tabela).delete().eq(coluna, valor);
  if (error) falhou(contexto, error);
}

/**
 * Sobe o adversário e as notas dele juntos.
 *
 * O jogador precisa existir antes das notas por causa da chave estrangeira —
 * é a única ordem que importa em toda a camada de escrita.
 */
export async function gravarJogador(j: Jogador, usuarioId: string) {
  const sb = obterSupabase();
  if (!sb) return;
  const { error } = await sb.from("jogadores").upsert(jogadorParaLinha(j, usuarioId));
  if (error) return falhou("o adversário", error);
  if (!j.notas.length) return;
  const { error: erroNotas } = await sb
    .from("notas_jogador")
    .upsert(j.notas.map((n) => notaParaLinha(n, j.id, usuarioId)));
  if (erroNotas) falhou("as anotações", erroNotas);
}

// ── migração do que já estava neste navegador ──────────────────────────────

/**
 * Sobe para a conta o que o jogador registrou antes de ter conta.
 *
 * Ordem obrigatória: satélites antes de torneios (o torneio referencia o
 * satélite), e o vínculo de volta depois dos dois. Os ids locais vão junto —
 * são UUIDs válidos e preservá-los mantém intactos os vínculos que já existem
 * entre torneio, satélite e diário.
 */
export async function migrarParaNuvem(r: Registros, usuarioId: string): Promise<string | null> {
  const sb = obterSupabase();
  if (!sb) return "Sem projeto configurado.";

  // `PromiseLike` e não `Promise`: o construtor de consulta do PostgREST é
  // "thenable" — só dispara quando alguém dá await nele — e não é uma Promise
  // completa. Exigir Promise aqui rejeitaria exatamente o valor que se quer.
  type Consulta = () => PromiseLike<{ error: { message: string } | null }>;
  const passos: [string, Consulta][] = [
    [
      "satélites",
      () =>
        sb.from("satelites").upsert(
          r.satelites.map((s) => ({ ...sateliteParaLinha(s, usuarioId), torneio_id: null })),
        ),
    ],
    [
      "torneios",
      () => sb.from("torneios").upsert(r.torneios.map((t) => torneioParaLinha(t, usuarioId))),
    ],
    [
      "vínculos de satélite",
      () => sb.from("satelites").upsert(r.satelites.map((s) => sateliteParaLinha(s, usuarioId))),
    ],
    [
      "movimentos",
      () => sb.from("movimentos").upsert(r.movimentos.map((m) => movimentoParaLinha(m, usuarioId))),
    ],
    [
      "adversários",
      () =>
        sb
          .from("jogadores")
          .upsert(Object.values(r.jogadores).map((j) => jogadorParaLinha(j, usuarioId))),
    ],
    [
      "anotações",
      () =>
        sb.from("notas_jogador").upsert(
          Object.values(r.jogadores).flatMap((j) =>
            j.notas.map((n) => notaParaLinha(n, j.id, usuarioId)),
          ),
        ),
    ],
    ["diário", () => sb.from("diario").upsert(r.diario.map((d) => diarioParaLinha(d, usuarioId)))],
    [
      "medições técnicas",
      () => sb.from("saude_tecnica").upsert(r.medicoes.map((m) => medicaoParaLinha(m, usuarioId))),
    ],
    [
      "metas",
      () =>
        sb.from("metas").upsert(Object.values(r.metas).map((m) => metaParaLinha(m, usuarioId))),
    ],
  ];

  for (const [nome, executar] of passos) {
    const { error } = await executar();
    if (error) return `Falhou ao subir ${nome}: ${error.message}`;
  }
  return null;
}

// ── perfil ─────────────────────────────────────────────────────────────────

const perfilParaLinha = (p: Perfil, usuarioId: string): Linha => ({
  id: usuarioId,
  nome: p.nome,
  nick: p.nick,
  objetivo: p.objetivo,
  modalidade: p.modalidade,
  buy_in_padrao: p.buyInPadrao,
  desde: p.desde,
});

const linhaParaPerfil = (l: Linha): Perfil => ({
  nome: String(l.nome ?? ""),
  nick: String(l.nick ?? ""),
  objetivo: l.objetivo as Perfil["objetivo"],
  modalidade: l.modalidade as Perfil["modalidade"],
  clubes: [],
  buyInPadrao: Number(l.buy_in_padrao ?? 100),
  bankrollInicial: "",
  desde: l.desde ? new Date(String(l.desde)).toISOString() : new Date().toISOString(),
});

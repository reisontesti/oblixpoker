/**
 * Ida e volta entre o domínio e o Postgres, contra o schema de verdade.
 *
 * Grava um registro de cada tipo com a migração real aplicada, lê de volta e
 * exige que volte idêntico. É o teste que pega a classe de erro mais provável
 * desta camada e a mais silenciosa: um `tresBet` que virou `tres_bet` em cinco
 * lugares e `tresbet` no sexto não quebra o build — só faz o número sumir da
 * tela. Também prova que `numeric` volta convertido para número, e não como a
 * string que o driver entrega.
 *
 * Roda sem Docker e sem projeto na nuvem: PGlite é Postgres de verdade em WASM.
 */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
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
import type {
  DiarioMental,
  Jogador,
  MedicaoTecnica,
  MetaDefinida,
  MovimentoBankroll,
  Satelite,
  Torneio,
} from "@/lib/types";

// Todas as migrações, em ordem — o schema real é a soma delas. Testar só a
// primeira deixaria de fora exatamente as mudanças recentes, que são as que
// ainda não foram exercitadas por ninguém.
const PASTA = new URL("../supabase/migrations/", import.meta.url);
const MIGRACOES = readdirSync(PASTA)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => new URL(f, PASTA));
const USUARIO = "11111111-1111-1111-1111-111111111111";

const db = new PGlite();
let falhas = 0;

function conferir(rotulo: string, esperado: unknown, obtido: unknown) {
  const a = JSON.stringify(esperado);
  const b = JSON.stringify(obtido);
  const ok = a === b;
  console.log(`${ok ? "ok   " : "FALHA"}  ${rotulo}`);
  if (!ok) {
    falhas++;
    console.log(`        esperado: ${a}`);
    console.log(`        obtido:   ${b}`);
  }
}

// Os papéis que o Supabase já traz e o Postgres puro não. Aqui o teste roda
// como superusuário de propósito: quem exerce a RLS é `conferir-schema.mts`,
// e este confere outra coisa — se a tradução volta fiel.
await db.exec(`
  create role anon;
  create role authenticated;
  create schema auth;
  create table auth.users (id uuid primary key);
  create table auth._sessao (uid uuid);
  insert into auth._sessao values ('${USUARIO}');
  create function auth.uid() returns uuid language sql stable as
    $$ select uid from auth._sessao limit 1 $$;
`);
for (const m of MIGRACOES) await db.exec(readFileSync(m, "utf8"));
await db.exec(`insert into auth.users values ('${USUARIO}');`);

/** Insere a linha mapeada e devolve o que o Postgres guardou de fato. */
async function idaEVolta(tabela: string, linha: Linha): Promise<Linha> {
  const colunas = Object.keys(linha);
  const marcadores = colunas.map((_, i) => `$${i + 1}`).join(", ");
  const r = await db.query(
    `insert into public.${tabela} (${colunas.join(", ")}) values (${marcadores}) returning *`,
    colunas.map((c) => linha[c] as never),
  );
  return r.rows[0] as Linha;
}

// ── satélite ───────────────────────────────────────────────────────────────
const satelite: Satelite = {
  id: "aaaaaaaa-0000-4000-8000-000000000001",
  nome: "Satélite do Main",
  clube: "Clube Meridiano",
  data: "2026-08-01T16:00:00.000Z",
  buyIn: 22.5,
  entradas: 3,
  jogadores: 64,
  classificou: true,
  posicao: 2,
  tempoJogadoMin: 95,
  valorVaga: 300,
  torneioId: null,
  observacoes: "Entrei três vezes, classifiquei na última.",
};
conferir(
  "satélite",
  satelite,
  linhaParaSatelite(await idaEVolta("satelites", sateliteParaLinha(satelite, USUARIO))),
);

// ── torneio, com todos os opcionais preenchidos ────────────────────────────
const torneio: Torneio = {
  id: "bbbbbbbb-0000-4000-8000-000000000001",
  data: "2026-08-01T20:00:00.000Z",
  nome: "Main Event",
  clube: "Clube Meridiano",
  modalidade: "MTT",
  buyIn: 300,
  rebuys: 150.5,
  addon: 100,
  jogadores: 212,
  colocacao: 7,
  premiacao: 1840.25,
  duracaoMin: 431,
  via: "satelite",
  sateliteId: satelite.id,
  energia: "cansado",
  melhorDecisao: "Fold de dois pares no turn.",
  piorDecisao: "Blefei contra calling station.",
  aprendizado: "A bolha é onde eu mais perco valor.",
  notaDisciplina: 7.5,
};
conferir(
  "torneio (opcionais preenchidos)",
  torneio,
  linhaParaTorneio(await idaEVolta("torneios", torneioParaLinha(torneio, USUARIO))),
);

// ── torneio em andamento: os nulos precisam continuar nulos ────────────────
const emAndamento: Torneio = {
  ...torneio,
  id: "bbbbbbbb-0000-4000-8000-000000000002",
  via: "direto",
  sateliteId: null,
  colocacao: null,
  energia: null,
  notaDisciplina: null,
  melhorDecisao: undefined,
  piorDecisao: undefined,
  aprendizado: undefined,
  premiacao: 0,
};
conferir(
  "torneio em andamento (nulos preservados)",
  emAndamento,
  linhaParaTorneio(await idaEVolta("torneios", torneioParaLinha(emAndamento, USUARIO))),
);

// ── movimento ──────────────────────────────────────────────────────────────
const movimento: MovimentoBankroll = {
  id: "cccccccc-0000-4000-8000-000000000001",
  data: "2026-01-15T12:00:00.000Z",
  tipo: "saque",
  valor: 1250.75,
  descricao: "Primeiro saque de lucro",
};
conferir(
  "movimento",
  movimento,
  linhaParaMovimento(await idaEVolta("movimentos", movimentoParaLinha(movimento, USUARIO))),
);

// ── jogador com notas ──────────────────────────────────────────────────────
const jogador: Jogador = {
  id: "dddddddd-0000-4000-8000-000000000001",
  nome: "Marcos do 7",
  clube: "Nexus Poker",
  perfil: "Paga-tudo",
  pontosFortes: ["Paciente na bolha", "Lê bem o showdown"],
  pontosFracos: ["Paga demais no river"],
  exploracoes: ["Value bet fino sempre", "Nunca blefar"],
  tells: ["Arruma as fichas antes de apostar forte"],
  confrontos: 14,
  saldoConfrontos: -320.5,
  atualizadoEm: "2026-07-20T10:00:00.000Z",
  notas: [
    {
      id: "eeeeeeee-0000-4000-8000-000000000002",
      data: "2026-07-20T10:00:00.000Z",
      tipo: "exploracao",
      texto: "Pagou três streets com terceiro par.",
    },
    {
      id: "eeeeeeee-0000-4000-8000-000000000001",
      data: "2026-05-02T10:00:00.000Z",
      tipo: "tell",
      texto: "Respira fundo quando está blefando.",
    },
  ],
};
const linhaJogador = await idaEVolta("jogadores", jogadorParaLinha(jogador, USUARIO));
const linhasNotas: Linha[] = [];
// Inserido fora de ordem de propósito: a ordenação é responsabilidade do mapa,
// e o cartão de mesa depende de a nota mais recente vir primeiro.
for (const n of [jogador.notas[1], jogador.notas[0]]) {
  linhasNotas.push(await idaEVolta("notas_jogador", notaParaLinha(n, jogador.id, USUARIO)));
}
conferir("jogador com notas (mais recente primeiro)", jogador, linhaParaJogador(linhaJogador, linhasNotas));

// ── diário: sessão fechada e sessão aberta ─────────────────────────────────
const fechada: DiarioMental = {
  id: "ffffffff-0000-4000-8000-000000000001",
  data: "2026-08-01T18:00:00.000Z",
  torneioId: torneio.id,
  dormiuBem: true,
  calmo: false,
  tentandoRecuperar: true,
  objetivo: "Jogar cada mão pelo mérito dela.",
  houveTilt: false,
  comoTerminei: "Cansado, mas satisfeito.",
  aprendizado: "Consegui não perseguir a perda.",
};
conferir("diário (sessão fechada)", fechada, linhaParaDiario(await idaEVolta("diario", diarioParaLinha(fechada, USUARIO))));

const aberta: DiarioMental = {
  ...fechada,
  id: "ffffffff-0000-4000-8000-000000000002",
  torneioId: null,
  // Este null é o que separa "sessão ainda aberta" de "não houve tilt".
  houveTilt: null,
  comoTerminei: "",
  aprendizado: "",
};
conferir("diário (sessão aberta, houveTilt null)", aberta, linhaParaDiario(await idaEVolta("diario", diarioParaLinha(aberta, USUARIO))));

// ── medição técnica ────────────────────────────────────────────────────────
const medicao: MedicaoTecnica = {
  id: "99999999-0000-4000-8000-000000000001",
  data: "2026-08-01T19:00:00.000Z",
  vpip: 24.5,
  pfr: 19.2,
  tresBet: 7.1,
  cbet: 62,
  wtsd: 25,
  wsd: 54,
  origem: "PokerCraft",
  maos: 21900,
};
conferir(
  "medição técnica",
  medicao,
  linhaParaMedicao(await idaEVolta("saude_tecnica", medicaoParaLinha(medicao, USUARIO))),
);

// ── meta ───────────────────────────────────────────────────────────────────
const meta: MetaDefinida = { chave: "mesas-finais", alvo: 6, ativa: false, ano: 2026 };
conferir("meta", meta, linhaParaMeta(await idaEVolta("metas", metaParaLinha(meta, USUARIO))));

// ── numeric não pode voltar como string ────────────────────────────────────
const lido = linhaParaTorneio(
  (await db.query(`select * from public.torneios where id = $1`, [torneio.id])).rows[0] as Linha,
);
conferir("dinheiro volta como número, não string", "number", typeof lido.premiacao);
conferir("soma de dinheiro é soma, não concatenação", 450.5, lido.buyIn + lido.rebuys);

console.log(falhas === 0 ? "\nMapeamento fiel nos dois sentidos.\n" : `\n${falhas} falha(s).\n`);
process.exit(falhas === 0 ? 0 : 1);

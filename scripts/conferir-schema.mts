import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";

// Todas as migrações, em ordem — o schema real é a soma delas.
const PASTA = new URL("../supabase/migrations/", import.meta.url);
const MIGRACOES = readdirSync(PASTA)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => new URL(f, PASTA));

const db = new PGlite();
let falhas = 0;

const ok = (rotulo: string, cond: boolean, detalhe = "") => {
  console.log(`${cond ? "ok   " : "FALHA"}  ${rotulo.padEnd(52)} ${detalhe}`);
  if (!cond) falhas++;
};

/** Espera que a instrução seja RECUSADA — é assim que se testa uma restrição. */
async function recusa(rotulo: string, sql: string, trecho: string) {
  try {
    await db.exec(sql);
    ok(rotulo, false, "foi aceito, e não deveria");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    ok(rotulo, msg.includes(trecho), `→ ${msg.split("\n")[0].slice(0, 70)}`);
  }
}

// ── stub do que o Supabase fornece ─────────────────────────────────────────
//
// `authenticated` é um papel que existe no Supabase e não no Postgres puro, e
// `auth.uid()` lê o JWT da requisição. Aqui viram um papel de verdade e uma
// tabelinha de sessão — o suficiente para RLS ser exercida como em produção,
// que é o único jeito de o teste significar alguma coisa.
await db.exec(`
  create role anon;
  create role authenticated;
  create schema auth;
  create table auth.users (id uuid primary key);
  create table auth._sessao (uid uuid);
  insert into auth._sessao values (null);
  create function auth.uid() returns uuid language sql stable security definer as
    $$ select uid from auth._sessao limit 1 $$;
  grant usage on schema auth to authenticated;
  grant execute on function auth.uid() to authenticated;
`);

// ── a migração de verdade ──────────────────────────────────────────────────
for (const m of MIGRACOES) await db.exec(readFileSync(m, "utf8"));
console.log("migração aplicada sem erro de sintaxe\n");

await db.exec(`
  grant usage on schema public to authenticated;
  grant all on all tables in schema public to authenticated;
`);

const ANA = "11111111-1111-1111-1111-111111111111";
const BRUNO = "22222222-2222-2222-2222-222222222222";
await db.exec(`insert into auth.users values ('${ANA}'), ('${BRUNO}');`);

// Sair do papel de superusuário é essencial: superusuário ignora RLS, e o
// teste inteiro passaria sem provar nada.
const entrarComo = (uid: string) =>
  db.exec(`reset role; update auth._sessao set uid = '${uid}'; set role authenticated;`);
const comoAdmin = (sql: string) => db.exec(`reset role; ${sql} set role authenticated;`);

// ── estrutura ──────────────────────────────────────────────────────────────
const tabelas = await db.query(
  `select tablename, rowsecurity from pg_tables where schemaname = 'public' order by tablename`,
);
// Nomeadas, e não contadas: um número só diz que algo mudou; a lista diz o quê.
const ESPERADAS = [
  "diario", "jogadores", "mesa_atual", "metas", "movimentos", "notas_jogador",
  "perfis", "satelites", "saude_tecnica", "torneios", "treino_respostas",
];
const criadas = tabelas.rows.map((t) => (t as { tablename: string }).tablename).sort();
const faltando = ESPERADAS.filter((t) => !criadas.includes(t));
ok("todas as tabelas criadas", faltando.length === 0, faltando.length ? `faltam: ${faltando}` : `${criadas.length} tabelas`);
ok(
  "RLS ligada em TODAS",
  tabelas.rows.every((t) => (t as { rowsecurity: boolean }).rowsecurity),
  tabelas.rows.filter((t) => !(t as { rowsecurity: boolean }).rowsecurity).map((t) => (t as { tablename: string }).tablename).join(",") || "nenhuma sem RLS",
);

// ── nenhum acento dentro de restrição ──────────────────────────────────────
//
// Este teste nasceu de duas ocorrências em produção. `jogadores.perfil`
// guardava 'Pão-duro' num CHECK, e o byte acentuado se corrompeu em algum
// salto entre editor, área de transferência e normalização Unicode: a
// restrição passou a recusar exatamente o valor que deveria aceitar. Meses
// depois a mesma coisa apareceu em `perfis.objetivo`, com 'Evolu√ß√£o'
// gravado — e essa era a opção que o cadastro oferece SELECIONADA, então
// qualquer pessoa que aceitasse o padrão tinha o perfil recusado, em silêncio.
//
// A regra que sai daí: valor que vive dentro de um CHECK é chave ASCII, e o
// português mora num mapa de rótulos no código. Isto aqui é o que impede a
// terceira vez.
const restricoes = await db.query<{ tabela: string; nome: string; definicao: string }>(
  `select conrelid::regclass::text as tabela, conname as nome,
          pg_get_constraintdef(oid) as definicao
     from pg_constraint
    where connamespace = 'public'::regnamespace and contype = 'c'`,
);
const acentuadas = restricoes.rows.filter((r) => /[^\x00-\x7F]/.test(r.definicao));
ok(
  "nenhuma restrição CHECK com byte não-ASCII",
  acentuadas.length === 0,
  acentuadas.length
    ? acentuadas.map((r) => `${r.tabela}.${r.nome}`).join(", ")
    : `${restricoes.rows.length} restrições conferidas`,
);

// ── restrições de domínio ──────────────────────────────────────────────────
await entrarComo(ANA);
await db.exec(`
  insert into public.perfis (id, nome, nick, objetivo, modalidade, buy_in_padrao)
  values ('${ANA}', 'Ana', 'ana', 'competitivo', 'MTT', 50);
`);

await db.exec(`
  insert into public.torneios (id, usuario_id, data, nome, buy_in, jogadores, colocacao, premiacao)
  values ('33333333-3333-3333-3333-333333333333', '${ANA}', now(), 'Terça R$ 50', 50, 48, 4, 380);
`);
ok("torneio direto aceito", true, "via='direto' sem satélite");

await recusa(
  "via='satelite' sem vínculo é recusada",
  `insert into public.torneios (usuario_id, data, nome, buy_in, via)
   values ('${ANA}', now(), 'Main', 300, 'satelite');`,
  "via_satelite_exige_vinculo",
);

await recusa(
  "via='direto' COM vínculo também é recusada",
  `insert into public.satelites (id, usuario_id, nome, data, buy_in)
     values ('44444444-4444-4444-4444-444444444444', '${ANA}', 'Sat', now(), 20);
   insert into public.torneios (usuario_id, data, nome, buy_in, via, satelite_id)
     values ('${ANA}', now(), 'Main', 300, 'direto', '44444444-4444-4444-4444-444444444444');`,
  "via_satelite_exige_vinculo",
);

await recusa(
  "PFR acima de VPIP é recusado",
  `insert into public.saude_tecnica (usuario_id, vpip, pfr, tres_bet, cbet, wtsd, wsd)
   values ('${ANA}', 18, 23, 7, 60, 26, 52);`,
  "pfr_nao_excede_vpip",
);

await recusa(
  "nota de disciplina fora de 0–10 é recusada",
  `insert into public.torneios (usuario_id, data, nome, buy_in, nota_disciplina)
   values ('${ANA}', now(), 'X', 50, 11);`,
  "nota_disciplina",
);

await recusa(
  "meta de chave desconhecida é recusada",
  `insert into public.metas (usuario_id, chave, alvo, ano)
   values ('${ANA}', 'estudar-mais', 10, 2026);`,
  "metas_chave_check",
);

// ── o ciclo satélite ↔ torneio, na ordem que o app usa ─────────────────────
await db.exec(`
  insert into public.satelites (id, usuario_id, nome, data, buy_in, classificou, valor_vaga)
    values ('55555555-5555-5555-5555-555555555555', '${ANA}', 'Sat do Main', now(), 20, true, 300);
  insert into public.torneios (id, usuario_id, data, nome, buy_in, via, satelite_id)
    values ('66666666-6666-6666-6666-666666666666', '${ANA}', now(), 'Main', 300, 'satelite',
            '55555555-5555-5555-5555-555555555555');
  update public.satelites set torneio_id = '66666666-6666-6666-6666-666666666666'
    where id = '55555555-5555-5555-5555-555555555555';
`);
ok("ciclo satélite↔torneio fecha sem FK deferida", true, "satélite → torneio → vínculo");

// ── RLS: o que realmente importa ───────────────────────────────────────────
const meus = await db.query(`select count(*)::int as n from public.torneios`);
ok("Ana enxerga os torneios dela", (meus.rows[0] as { n: number }).n === 2, `${(meus.rows[0] as { n: number }).n} torneios`);

await entrarComo(BRUNO);
const dela = await db.query(`select count(*)::int as n from public.torneios`);
ok("Bruno NÃO enxerga nada da Ana", (dela.rows[0] as { n: number }).n === 0, `${(dela.rows[0] as { n: number }).n} torneios visíveis`);

const perfis = await db.query(`select count(*)::int as n from public.perfis`);
ok("Bruno NÃO enxerga o perfil da Ana", (perfis.rows[0] as { n: number }).n === 0, `${(perfis.rows[0] as { n: number }).n} perfis`);

await recusa(
  "Bruno não grava linha carimbada com o id da Ana",
  `insert into public.torneios (usuario_id, data, nome, buy_in)
   values ('${ANA}', now(), 'Invasão', 50);`,
  "row-level security",
);

const apagou = await db.query(`delete from public.torneios returning id`);
ok("DELETE de Bruno não alcança a Ana", apagou.rows.length === 0, `${apagou.rows.length} linhas`);

await entrarComo(ANA);
const sobrou = await db.query(`select count(*)::int as n from public.torneios`);
ok("torneios da Ana continuam intactos", (sobrou.rows[0] as { n: number }).n === 2, `${(sobrou.rows[0] as { n: number }).n} torneios`);

// ── cascata ao apagar a conta ──────────────────────────────────────────────
await comoAdmin(`delete from auth.users where id = '${ANA}';`);
await entrarComo(ANA);
const orfaos = await db.query(
  `select (select count(*) from public.torneios)
        + (select count(*) from public.satelites)
        + (select count(*) from public.perfis) as n`,
);
ok("apagar a conta leva os dados junto", Number((orfaos.rows[0] as { n: number }).n) === 0, `${(orfaos.rows[0] as { n: number }).n} órfãos`);

console.log(falhas === 0 ? "\nSchema válido.\n" : `\n${falhas} falha(s).\n`);
process.exit(falhas === 0 ? 0 : 1);

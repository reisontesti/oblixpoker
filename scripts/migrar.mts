/**
 * Aplica as migrações no Postgres do Supabase.
 *
 * Existe porque colar SQL no editor do painel se mostrou pouco confiável: por
 * quatro vezes o editor respondeu "Success" e a restrição no banco não mudou,
 * sem nenhum sinal de que algo tinha falhado. Um caminho que não avisa quando
 * não funciona é pior do que um que quebra.
 *
 * Aqui cada arquivo roda numa transação e o script CONFERE o resultado antes
 * de dizer que terminou — se a verificação não bater, sai com erro.
 *
 * Requer `DATABASE_URL` em `.env.local`. Nada disso é usado pelo app: o
 * cliente fala com o Supabase pela chave `anon`, sob RLS.
 *
 *   npx tsx scripts/migrar.mts            # aplica todas, em ordem
 *   npx tsx scripts/migrar.mts <arquivo>  # aplica uma só
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import pg from "pg";

const raiz = new URL("../", import.meta.url);
const pasta = new URL("supabase/migrations/", raiz);

function lerEnv(): string {
  const texto = readFileSync(new URL(".env.local", raiz), "utf8");
  const linha = texto.split("\n").find((l) => l.startsWith("DATABASE_URL="));
  if (!linha) throw new Error("DATABASE_URL não está em .env.local");
  return linha.slice("DATABASE_URL=".length).trim();
}

const alvo = process.argv[2];
const arquivos = readdirSync(pasta)
  .filter((f) => f.endsWith(".sql"))
  .filter((f) => !alvo || f.includes(alvo))
  .sort();

if (!arquivos.length) {
  console.error("Nenhuma migração encontrada.");
  process.exit(1);
}

const cliente = new pg.Client({
  connectionString: lerEnv(),
  // O pooler do Supabase exige TLS, e o certificado é de uma cadeia que o Node
  // não traz. Verificar o host não agrega aqui: a conexão é para uma máquina
  // de desenvolvimento aplicar DDL, não um caminho de dados de usuário.
  ssl: { rejectUnauthorized: false },
});

await cliente.connect();
const { rows: quem } = await cliente.query("select current_database() as bd, version() as v");
console.log(`conectado em ${quem[0].bd} · ${String(quem[0].v).split(" ").slice(0, 2).join(" ")}\n`);

for (const arquivo of arquivos) {
  const sql = readFileSync(fileURLToPath(new URL(arquivo, pasta)), "utf8");
  process.stdout.write(`${arquivo} … `);
  try {
    // Transação por arquivo: uma migração que falha no meio não deixa o banco
    // num estado que ninguém previu.
    await cliente.query("begin");
    await cliente.query(sql);
    await cliente.query("commit");
    console.log("aplicada");
  } catch (e) {
    await cliente.query("rollback");
    console.log("FALHOU");
    console.error(`  ${e instanceof Error ? e.message : String(e)}`);
    await cliente.end();
    process.exit(1);
  }
}

// ── conferência ────────────────────────────────────────────────────────────
// Aplicar sem conferir foi exatamente o que deixou quatro tentativas passarem
// por concluídas.
const { rows: restricoes } = await cliente.query(
  `select conname, pg_get_constraintdef(oid) as definicao
     from pg_constraint
    where conrelid = 'public.jogadores'::regclass and contype = 'c'`,
);
console.log("\nrestrições em jogadores:");
for (const r of restricoes) console.log(`  ${r.conname}: ${r.definicao}`);

const { rows: perfis } = await cliente.query(
  "select distinct perfil from public.jogadores order by perfil",
);
console.log(`\nperfis gravados: ${perfis.map((p) => p.perfil).join(", ") || "(nenhum)"}`);

const esperadas = ["solido", "solto_agressivo", "maniaco", "pao_duro", "mumia", "paga_tudo"];
const def = restricoes.find((r) => r.conname === "jogadores_perfil_check")?.definicao ?? "";
const faltando = esperadas.filter((c) => !def.includes(`'${c}'`));

await cliente.end();

if (faltando.length) {
  console.error(`\nFALHA: a restrição não contém ${faltando.join(", ")}`);
  process.exit(1);
}
console.log("\nSchema conferido: as seis chaves ASCII estão na restrição.");

-- ═══════════════════════════════════════════════════════════════════════════
-- Oblix — schema inicial
--
-- Espelha `src/lib/types.ts`. Os identificadores ficam em pt-BR como o resto
-- do projeto: o domínio é descrito em português (banca, buy-in, mesa final,
-- satélite) e traduzir só a camada de dados criaria tradução mental a cada
-- consulta.
--
-- Três decisões atravessam o arquivo inteiro:
--
-- 1. TODA tabela carrega `usuario_id` e tem RLS ligada, sem exceção. Um painel
--    de poker guarda quanto a pessoa ganha, contra quem joga e o que ela
--    escreveu sobre a própria cabeça depois de perder. Não existe linha aqui
--    que possa vazar para outro usuário.
--
-- 2. Enums viram `text` + CHECK, e não tipos enumerados do Postgres. Eles
--    correspondem a uniões de string do TypeScript que ainda vão mudar
--    (modalidades, perfis de adversário), e ALTER TYPE em produção é bem mais
--    caro do que trocar um CHECK.
--
-- 3. Dinheiro é `numeric(12,2)`, nunca `float`. Buy-in, premiação e banca são
--    somados centenas de vezes para formar a curva; ponto flutuante acumularia
--    erro justamente na figura herói do painel.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── perfil ─────────────────────────────────────────────────────────────────
--
-- Uma linha por usuário, com a chave primária sendo o próprio id do auth. É o
-- que dispensa `usuario_id` aqui e torna a política de RLS uma comparação
-- direta com `auth.uid()`.
create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  nick text not null,
  objetivo text not null
    check (objetivo in ('Recreativo', 'Evolução', 'Competitivo', 'Profissional')),
  modalidade text not null
    check (modalidade in ('MTT', 'Cash', 'Sit&Go', 'Home Game')),
  buy_in_padrao numeric(12,2) not null default 100 check (buy_in_padrao > 0),
  desde timestamptz not null default now(),
  criado_em timestamptz not null default now()
);

-- ── satélites ──────────────────────────────────────────────────────────────
--
-- Criado ANTES de `torneios` de propósito. As duas tabelas se referenciam, e
-- resolver o ciclo por ordem de inserção (satélite → torneio → vínculo de
-- volta) evita constraints deferidas, que são fáceis de configurar errado e
-- difíceis de depurar meses depois.
create table public.satelites (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  nome text not null,
  clube text not null default '',
  data timestamptz not null,
  buy_in numeric(12,2) not null check (buy_in >= 0),
  -- Custo total do satélite = buy_in × entradas. Re-entry é a regra e não a
  -- exceção nesses torneios, então guardar só o buy-in unitário mentiria.
  entradas integer not null default 1 check (entradas >= 1),
  jogadores integer not null default 0 check (jogadores >= 0),
  classificou boolean not null default false,
  posicao integer check (posicao is null or posicao >= 1),
  tempo_jogado_min integer not null default 0 check (tempo_jogado_min >= 0),
  valor_vaga numeric(12,2) not null default 0 check (valor_vaga >= 0),
  torneio_id uuid,
  observacoes text,
  criado_em timestamptz not null default now()
);

-- ── torneios ───────────────────────────────────────────────────────────────
create table public.torneios (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  data timestamptz not null,
  nome text not null,
  clube text not null default '',
  modalidade text not null default 'MTT'
    check (modalidade in ('MTT', 'Cash', 'Sit&Go', 'Home Game')),
  -- Buy-in DE BALCÃO, sempre preenchido, mesmo para quem entrou via satélite:
  -- é o valor da vaga, e é ele que permite comparar as duas vias com o custo
  -- de entrada normalizado.
  buy_in numeric(12,2) not null check (buy_in >= 0),
  rebuys numeric(12,2) not null default 0 check (rebuys >= 0),
  addon numeric(12,2) not null default 0 check (addon >= 0),
  jogadores integer not null default 0 check (jogadores >= 0),
  -- Nulo enquanto o torneio está em andamento.
  colocacao integer check (colocacao is null or colocacao >= 1),
  premiacao numeric(12,2) not null default 0 check (premiacao >= 0),
  duracao_min integer not null default 0 check (duracao_min >= 0),
  via text not null default 'direto' check (via in ('direto', 'satelite')),
  satelite_id uuid references public.satelites (id) on delete set null,
  energia text
    check (energia is null or energia in
      ('muito_cansado', 'cansado', 'normal', 'descansado', 'muito_descansado')),
  melhor_decisao text,
  pior_decisao text,
  aprendizado text,
  nota_disciplina numeric(3,1)
    check (nota_disciplina is null or nota_disciplina between 0 and 10),
  criado_em timestamptz not null default now(),

  -- A via não é digitada pelo jogador: ela é consequência de ter jogado o
  -- satélite E classificado. O banco recusa a contradição que o formulário já
  -- evita, porque é dessa coluna que todo o comparativo depende.
  constraint via_satelite_exige_vinculo
    check ((via = 'satelite') = (satelite_id is not null))
);

alter table public.satelites
  add constraint satelites_torneio_id_fkey
  foreign key (torneio_id) references public.torneios (id) on delete set null;

-- ── movimentações de banca ─────────────────────────────────────────────────
create table public.movimentos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  data timestamptz not null,
  tipo text not null check (tipo in ('aporte', 'saque')),
  valor numeric(12,2) not null check (valor >= 0),
  descricao text not null default '',
  criado_em timestamptz not null default now()
);

-- ── banco de adversários ───────────────────────────────────────────────────
create table public.jogadores (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  nome text not null,
  clube text not null default '',
  perfil text not null default 'TAG'
    check (perfil in ('TAG', 'LAG', 'Nit', 'Calling Station', 'Maníaco', 'Rock')),
  pontos_fortes text[] not null default '{}',
  pontos_fracos text[] not null default '{}',
  -- A linha acionável: o que fazer contra ele. É o que o Modo Mesa destaca.
  exploracoes text[] not null default '{}',
  tells text[] not null default '{}',
  confrontos integer not null default 0 check (confrontos >= 0),
  saldo_confrontos numeric(12,2) not null default 0,
  -- Domínio, não auditoria: é a data em que a LEITURA foi revisada, e é ela
  -- que faz uma anotação de oito meses aparecer com aviso. Por isso o app a
  -- preenche explicitamente e nenhum gatilho encosta nela.
  atualizado_em timestamptz not null default now(),
  criado_em timestamptz not null default now()
);

create table public.notas_jogador (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  jogador_id uuid not null references public.jogadores (id) on delete cascade,
  data timestamptz not null default now(),
  tipo text not null default 'geral'
    check (tipo in ('leitura', 'tell', 'exploracao', 'geral')),
  texto text not null,
  criado_em timestamptz not null default now()
);

-- Quem está sentado com o jogador agora. Sobrevive a fechar o app no meio do
-- torneio, que é exatamente quando o Modo Mesa é usado.
create table public.mesa_atual (
  usuario_id uuid not null references auth.users (id) on delete cascade,
  jogador_id uuid not null references public.jogadores (id) on delete cascade,
  entrou_em timestamptz not null default now(),
  primary key (usuario_id, jogador_id)
);

-- ── diário mental ──────────────────────────────────────────────────────────
--
-- Nasce no check-in, ANTES de sentar — por isso `torneio_id` e os campos de
-- fechamento começam nulos. Um check-in sem torneio continua sendo registro
-- válido: às vezes a decisão certa é responder as perguntas e ir para casa.
create table public.diario (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  data timestamptz not null default now(),
  torneio_id uuid references public.torneios (id) on delete set null,

  dormiu_bem boolean not null,
  calmo boolean not null,
  -- A pergunta que existe para ser um freio, não uma estatística.
  tentando_recuperar boolean not null,
  objetivo text not null default '',

  -- Nulo enquanto a sessão não foi fechada.
  houve_tilt boolean,
  como_terminei text not null default '',
  aprendizado text not null default '',
  criado_em timestamptz not null default now()
);

-- ── saúde técnica ──────────────────────────────────────────────────────────
--
-- Uma linha por medição, e não duas colunas fixas de "atual" e "anterior".
--
-- Estes números o jogador copia do tracker ou da sala e informa quando vai
-- sentar — pode ser todo dia ou uma vez por ano, dependendo de quanto ele
-- joga. Guardando a série, a cadência passa a ser um dado (o painel sabe dizer
-- "medido há cinco meses" e desconfiar na medida certa) em vez de uma
-- suposição embutida no schema.
create table public.saude_tecnica (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  data timestamptz not null default now(),
  vpip numeric(5,2) not null check (vpip between 0 and 100),
  pfr numeric(5,2) not null check (pfr between 0 and 100),
  tres_bet numeric(5,2) not null check (tres_bet between 0 and 100),
  cbet numeric(5,2) not null check (cbet between 0 and 100),
  wtsd numeric(5,2) not null check (wtsd between 0 and 100),
  wsd numeric(5,2) not null check (wsd between 0 and 100),
  -- De onde vieram, para o jogador não misturar amostras de salas diferentes.
  origem text not null default '',
  maos integer check (maos is null or maos >= 0),
  criado_em timestamptz not null default now(),

  -- PFR é subconjunto de VPIP: não se pode aumentar sem pagar para ver.
  -- Números trocados de lugar na hora de digitar são o erro mais provável
  -- aqui, e passariam despercebidos num painel de tendência.
  constraint pfr_nao_excede_vpip check (pfr <= vpip)
);

-- ── metas ──────────────────────────────────────────────────────────────────
--
-- Só o ALVO é do jogador; o valor atingido continua sendo calculado dos
-- registros. É o que impede a meta de virar um checkbox: cada uma das quatro
-- corresponde a uma métrica que o Oblix já sabe medir sozinho, então "concluída"
-- nunca depende de alguém se lembrar de marcar.
create table public.metas (
  usuario_id uuid not null references auth.users (id) on delete cascade,
  chave text not null
    check (chave in ('mesas-finais', 'banca', 'disciplina', 'titulos')),
  alvo numeric(12,2) not null check (alvo > 0),
  ativa boolean not null default true,
  ano integer not null,
  atualizado_em timestamptz not null default now(),
  primary key (usuario_id, chave, ano)
);

-- ── índices ────────────────────────────────────────────────────────────────
--
-- Todo acesso do produto é "tudo deste usuário, em ordem de data" — o painel
-- carrega a base inteira e recorta em memória, porque as comparações entre
-- períodos precisam da série completa de qualquer jeito.
create index torneios_usuario_data_idx on public.torneios (usuario_id, data);
create index satelites_usuario_data_idx on public.satelites (usuario_id, data);
create index satelites_torneio_idx on public.satelites (torneio_id) where torneio_id is not null;
create index movimentos_usuario_data_idx on public.movimentos (usuario_id, data);
create index jogadores_usuario_nome_idx on public.jogadores (usuario_id, nome);
create index notas_jogador_idx on public.notas_jogador (jogador_id, data desc);
create index diario_usuario_data_idx on public.diario (usuario_id, data);
create index saude_tecnica_usuario_data_idx on public.saude_tecnica (usuario_id, data desc);

-- ── Row Level Security ─────────────────────────────────────────────────────
--
-- Ligada em todas as tabelas. Sem uma política que case, o Postgres não
-- devolve linha nenhuma — o padrão é negar, e é assim que se quer.
--
-- Cada política repete a condição em USING e WITH CHECK de propósito: USING
-- decide o que se pode LER e alterar; WITH CHECK decide o que se pode GRAVAR.
-- Só com as duas é que um usuário fica impedido de escrever uma linha
-- carimbada com o id de outro.
alter table public.perfis enable row level security;
alter table public.torneios enable row level security;
alter table public.satelites enable row level security;
alter table public.movimentos enable row level security;
alter table public.jogadores enable row level security;
alter table public.notas_jogador enable row level security;
alter table public.mesa_atual enable row level security;
alter table public.diario enable row level security;
alter table public.saude_tecnica enable row level security;
alter table public.metas enable row level security;

create policy "perfil próprio" on public.perfis
  for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "torneios próprios" on public.torneios
  for all to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

create policy "satélites próprios" on public.satelites
  for all to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

create policy "movimentos próprios" on public.movimentos
  for all to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

create policy "jogadores próprios" on public.jogadores
  for all to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

create policy "notas próprias" on public.notas_jogador
  for all to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

create policy "mesa própria" on public.mesa_atual
  for all to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

create policy "diário próprio" on public.diario
  for all to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

create policy "saúde técnica própria" on public.saude_tecnica
  for all to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

create policy "metas próprias" on public.metas
  for all to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

-- ===========================================================================
-- Treino: o historico de decisoes
--
-- Arquivo em ASCII puro, como os outros: valor de coluna sujeito a CHECK nao
-- carrega acento neste projeto.
--
-- Uma linha por DECISAO, e nao um agregado por categoria. O agregado se
-- calcula a qualquer momento a partir das linhas, mas o caminho inverso e'
-- impossivel: guardando so "64% em fase final" nunca se descobre que o erro
-- estava concentrado em enfrentar all-in de 15 BB no cutoff -- que e'
-- justamente o diagnostico que a feature existe para dar.
-- ===========================================================================

create table public.treino_respostas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  em timestamptz not null default now(),

  fase text not null
    check (fase in ('inicio', 'meio', 'fase_final', 'bolha', 'itm', 'mesa_final')),
  situacao text not null
    check (situacao in ('abertura', 'push', 'vs_shove')),
  posicao text not null
    check (posicao in ('UTG', 'UTG+1', 'MP', 'HJ', 'CO', 'BTN', 'SB', 'BB')),

  stack_efetivo_bb numeric(6,1) not null check (stack_efetivo_bb > 0),
  jogadores_na_mesa integer not null check (jogadores_na_mesa between 2 and 10),
  mao text not null,

  escolhida text not null check (escolhida in ('fold', 'call', 'raise', 'allin')),
  preferida text not null check (preferida in ('fold', 'call', 'raise', 'allin')),
  -- Frequencia com que o range toma a acao ESCOLHIDA. Guardar isso, e nao so
  -- o acerto, e' o que permite distinguir um erro grosseiro de uma escolha
  -- defensavel que calhou de nao ser a mais frequente.
  frequencia_da_escolha numeric(4,3) not null check (frequencia_da_escolha between 0 and 1),
  correta boolean not null,
  tempo_ms integer not null check (tempo_ms >= 0),

  criado_em timestamptz not null default now()
);

create index treino_respostas_usuario_em_idx
  on public.treino_respostas (usuario_id, em desc);
-- O diagnostico por categoria e' a consulta quente da tela de Treino.
create index treino_respostas_diagnostico_idx
  on public.treino_respostas (usuario_id, fase, situacao);

alter table public.treino_respostas enable row level security;

create policy "respostas de treino proprias" on public.treino_respostas
  for all to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

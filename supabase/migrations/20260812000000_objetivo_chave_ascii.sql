-- ═══════════════════════════════════════════════════════════════════════════
-- `perfis.objetivo` com chave ASCII
--
-- A restrição em produção estava assim:
--
--   CHECK (objetivo = ANY (ARRAY['Recreativo', 'Evolu√ß√£o', 'Competitivo',
--                                'Profissional']))
--
-- Ela aceitava três dos quatro valores. O quarto — 'Evolução' — era
-- justamente o que o Oblix oferece SELECIONADO no cadastro, então qualquer
-- pessoa que aceitasse o padrão e criasse conta teria o perfil recusado pelo
-- banco. Silenciosamente: a gravação falha, o espelho local continua certo, e
-- o nome só some quando ela entra de outro aparelho.
--
-- Já aconteceu uma vez, com `jogadores.perfil`, e foi corrigido lá com esta
-- mesma convenção — chave ASCII na coluna, rótulo em português no código. O
-- `objetivo` ficou de fora na ocasião. Um acento dentro de um CHECK viaja por
-- área de transferência, editor de SQL e normalização Unicode até um dos
-- saltos corromper o byte, e a restrição passa a recusar exatamente o valor
-- que deveria aceitar.
--
-- Traduz ANTES de trocar a restrição: na ordem inversa, o CHECK novo recusaria
-- as linhas antigas e a migração falharia pela metade. A comparação usa
-- `like 'Evolu%'` de propósito — o valor gravado pode estar em qualquer um dos
-- estados de corrupção, e comparar por igualdade com o acento correto seria
-- repetir o erro que causou tudo isto.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.perfis drop constraint if exists perfis_objetivo_check;

update public.perfis set objetivo = case
  when objetivo = 'Recreativo'   then 'recreativo'
  when objetivo like 'Evolu%'    then 'evolucao'
  when objetivo = 'Competitivo'  then 'competitivo'
  when objetivo = 'Profissional' then 'profissional'
  else objetivo
end;

alter table public.perfis
  alter column objetivo set default 'evolucao',
  add constraint perfis_objetivo_check check (
    objetivo in ('recreativo', 'evolucao', 'competitivo', 'profissional')
  );

-- Conferência no próprio arquivo, lendo a restrição COMO ELA FICOU GRAVADA.
-- É esse o ponto: o defeito não estava no texto que se escreve, estava nos
-- bytes que chegam. Se qualquer uma das quatro chaves não estiver lá, isto
-- lança e a transação inteira volta atrás.
do $$
declare
  definicao text;
  chave text;
begin
  select pg_get_constraintdef(oid) into definicao
    from pg_constraint
   where conrelid = 'public.perfis'::regclass and conname = 'perfis_objetivo_check';

  foreach chave in array array['recreativo', 'evolucao', 'competitivo', 'profissional'] loop
    if position(chave in definicao) = 0 then
      raise exception 'chave % ausente da restrição gravada: %', chave, definicao;
    end if;
  end loop;

  if definicao ~ '[^[:ascii:]]' then
    raise exception 'a restrição gravada tem byte não-ASCII: %', definicao;
  end if;
end $$;

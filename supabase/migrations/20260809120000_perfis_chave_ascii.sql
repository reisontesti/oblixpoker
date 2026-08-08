-- ===========================================================================
-- Perfis de adversario: chave ASCII no banco, rotulo na interface
--
-- ESTE ARQUIVO E' 100% ASCII, DE PROPOSITO -- sem acentos nem em comentario.
-- Tentativas anteriores falharam e o arquivo estava integro em UTF-8/NFC, o
-- que aponta para corrupcao entre o arquivo e o editor de SQL. Texto sem
-- acento nao tem como ser corrompido.
--
-- A traducao nao compara com literais acentuados: remove tudo que nao e' ASCII
-- e compara o esqueleto que sobra, o que vale em NFC, em NFD e em texto ja
-- corrompido. 'Solido' vira 'Slido' em NFC e 'Solido' em NFD, entao cada
-- perfil lista as duas formas. O underscore fica preservado para a migracao
-- ser idempotente.
--
-- Termina com um SELECT: sem ele, o editor responde "Success" mesmo quando o
-- resultado nao e' o esperado, e nao ha como distinguir aplicado de ignorado.
-- ===========================================================================

alter table public.jogadores drop constraint if exists jogadores_perfil_check;
alter table public.jogadores alter column perfil drop default;

update public.jogadores set perfil = case
  lower(regexp_replace(perfil, '[^a-zA-Z _-]', '', 'g'))
  when 'slido'           then 'solido'
  when 'solido'          then 'solido'
  when 'tag'             then 'solido'
  when 'solto agressivo' then 'solto_agressivo'
  when 'solto_agressivo' then 'solto_agressivo'
  when 'lag'             then 'solto_agressivo'
  when 'manaco'          then 'maniaco'
  when 'maniaco'         then 'maniaco'
  when 'po-duro'         then 'pao_duro'
  when 'pao-duro'        then 'pao_duro'
  when 'pao_duro'        then 'pao_duro'
  when 'nit'             then 'pao_duro'
  when 'mmia'            then 'mumia'
  when 'mumia'           then 'mumia'
  when 'rock'            then 'mumia'
  when 'paga-tudo'       then 'paga_tudo'
  when 'paga_tudo'       then 'paga_tudo'
  when 'calling station' then 'paga_tudo'
  -- Valor irreconhecivel vira o perfil neutro em vez de travar a migracao.
  else 'solido'
end;

alter table public.jogadores alter column perfil set default 'solido';
alter table public.jogadores add constraint jogadores_perfil_check
  check (perfil in ('solido','solto_agressivo','maniaco','pao_duro','mumia','paga_tudo'));

select pg_get_constraintdef(oid) as restricao_ativa
  from pg_constraint where conname = 'jogadores_perfil_check';

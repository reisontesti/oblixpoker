-- ===========================================================================
-- Perfis de adversario: chave ASCII no banco, rotulo na interface
--
-- ESTE ARQUIVO E' 100% ASCII, DE PROPOSITO. Sem acentos, sem travessoes, sem
-- caixa de comentario desenhada. A migracao anterior falhou duas vezes porque
-- os acentos se corrompiam entre o arquivo e o editor de SQL -- o arquivo
-- estava integro em UTF-8/NFC, mas alguma etapa do caminho mudava os bytes, e
-- o CHECK passava a recusar exatamente os valores que deveria aceitar.
-- Texto que nao tem acento nao tem como ser corrompido.
--
-- A traducao nao compara com literais acentuados. Ela remove tudo que nao for
-- ASCII e compara o esqueleto que sobra, o que funciona em NFC, em NFD e ate
-- em texto ja corrompido:
--
--   'Solido'  em NFC -> 'Slido'      (o acento e' um caractere so)
--   'Solido'  em NFD -> 'Solido'     (o acento e' marca combinante separada)
--   'Pao-duro' NFC   -> 'Po-duro'
--   'Pao-duro' NFD   -> 'Pao-duro'
--
-- Por isso cada perfil lista as duas formas. O underscore fica na lista de
-- caracteres preservados para a migracao ser idempotente: rodar de novo sobre
-- 'pao_duro' devolve 'pao_duro'.
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
  -- Valor irreconhecivel vira o perfil neutro em vez de travar a migracao:
  -- perder a leitura de um adversario e' ruim, travar o banco de todos e' pior.
  else 'solido'
end;

alter table public.jogadores
  alter column perfil set default 'solido',
  add constraint jogadores_perfil_check check (
    perfil in ('solido', 'solto_agressivo', 'maniaco', 'pao_duro', 'mumia', 'paga_tudo')
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- Perfis de adversário em português de mesa
--
-- TAG, LAG, nit e calling station são jargão importado que só significa alguma
-- coisa para quem estudou em inglês. O Modo Mesa é lido de relance, embaixo da
-- mesa, muitas vezes por quem joga em clube e nunca abriu um curso — e um
-- rótulo que precisa ser traduzido mentalmente custa o segundo que a leitura
-- tinha para valer.
--
-- Traduz os dados antes de trocar a restrição: na ordem inversa, o CHECK novo
-- recusaria as linhas antigas e a migração falharia pela metade.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.jogadores drop constraint if exists jogadores_perfil_check;

update public.jogadores set perfil = case perfil
  when 'TAG' then 'Sólido'
  when 'LAG' then 'Solto agressivo'
  when 'Nit' then 'Pão-duro'
  when 'Rock' then 'Múmia'
  when 'Calling Station' then 'Paga-tudo'
  else perfil
end;

alter table public.jogadores
  alter column perfil set default 'Sólido',
  add constraint jogadores_perfil_check check (
    perfil in ('Sólido', 'Solto agressivo', 'Maníaco', 'Pão-duro', 'Múmia', 'Paga-tudo')
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- Perfis de adversário: chave ASCII, rótulo na interface
--
-- Corrige a migração anterior, que gravava o rótulo acentuado ("Pão-duro")
-- como valor de coluna. Em produção o resultado foi o pior possível: a
-- restrição passou a aceitar só os dois perfis SEM acento e a recusar os
-- quatro com acento — o acento se corrompeu em algum salto entre o arquivo, a
-- área de transferência e o editor de SQL, e o CHECK deixou de reconhecer
-- exatamente o valor que deveria aceitar.
--
-- A lição é geral: valor de coluna sujeito a `CHECK` não deve carregar acento.
-- A chave vira ASCII e o português passa a viver em `ROTULO_PERFIL`, no
-- cliente — que é a convenção que `NivelEnergia` já seguia neste projeto.
--
-- A tradução usa `unaccent`-por-substituição em vez de comparar com os
-- literais acentuados, justamente porque não dá para confiar que eles
-- cheguem aqui intactos.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.jogadores drop constraint if exists jogadores_perfil_check;
alter table public.jogadores alter column perfil drop default;

update public.jogadores set perfil = case
  -- Normaliza acento e caixa antes de comparar: o que chega pode estar em
  -- NFC, em NFD ou corrompido, e nenhuma dessas formas casa por igualdade.
  when lower(translate(perfil, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
                               'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'))
       in ('solido', 'tag')                 then 'solido'
  when lower(translate(perfil, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
                               'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'))
       in ('solto agressivo', 'lag')        then 'solto_agressivo'
  when lower(translate(perfil, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
                               'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'))
       in ('maniaco')                       then 'maniaco'
  when lower(translate(perfil, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
                               'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'))
       in ('pao-duro', 'nit')               then 'pao_duro'
  when lower(translate(perfil, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
                               'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'))
       in ('mumia', 'rock')                 then 'mumia'
  when lower(translate(perfil, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
                               'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'))
       in ('paga-tudo', 'calling station')  then 'paga_tudo'
  -- Qualquer coisa irreconhecível vira o perfil neutro em vez de bloquear a
  -- migração: perder a leitura de um adversário é ruim, travar o banco de
  -- todos é pior.
  else 'solido'
end;

alter table public.jogadores
  alter column perfil set default 'solido',
  add constraint jogadores_perfil_check check (
    perfil in ('solido', 'solto_agressivo', 'maniaco', 'pao_duro', 'mumia', 'paga_tudo')
  );

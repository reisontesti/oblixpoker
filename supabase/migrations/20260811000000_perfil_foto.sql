-- ═══════════════════════════════════════════════════════════════════════════
-- Foto de perfil
--
-- Coluna de texto e não bucket de Storage. O Oblix funciona inteiro sem conta
-- — quem nunca se cadastrou tem perfil só no navegador —, e um caminho de
-- storage no `localStorage` seria um link para lugar nenhum. Como `data:` URI,
-- a foto acompanha o perfil nos dois modos pelo mesmo caminho.
--
-- O tamanho é contido no cliente, que reduz para 256px antes de gravar, e
-- reforçado aqui: um `data:` URI de 256px em JPEG fica em torno de 40 kB, e
-- 200 kB dá folga de sobra para quem mandar PNG. Sem o teto, a primeira foto
-- vinda direto da câmera põe 4 MB numa linha que é lida em toda sincronização.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.perfis
  add column if not exists foto text
    check (foto is null or (foto like 'data:image/%' and length(foto) <= 200000));

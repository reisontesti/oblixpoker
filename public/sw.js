/**
 * Service worker do Oblix.
 *
 * Fecha o último buraco da resiliência: o espelho local já mantinha os dados
 * de pé com o app aberto, mas recarregar a página sem sinal não passava — o
 * navegador não conseguia nem buscar o app. Seis horas de clube num celular
 * incluem trocar de aba, o sistema descartar a página e o jogador reabrir.
 *
 * Três regras, e a mais importante é a terceira:
 *
 * 1. NAVEGAÇÃO vai à rede primeiro e cai no cache quando falha. Rede primeiro
 *    porque um app de registro não pode servir uma versão velha enquanto há
 *    conexão; o cache é rede de segurança, não fonte de verdade.
 *
 * 2. ESTÁTICOS do Next (`/_next/static/`) vêm do cache primeiro. Os nomes
 *    carregam hash do conteúdo, então nunca ficam obsoletos: se o nome é o
 *    mesmo, o arquivo é o mesmo.
 *
 * 3. SUPABASE nunca passa por aqui. Dado de conta e sessão servido de cache
 *    seria pior do que erro de rede: mostraria a base de um usuário depois de
 *    outro entrar, e o app já sabe lidar com a falha — tem espelho e fila.
 */

const VERSAO = "oblix-v2";
const CACHE = `${VERSAO}`;

/**
 * As rotas que o jogador pode querer abrir sem sinal. Não inclui
 * `/torneios/[id]/editar`: é renderizada sob demanda no servidor, e corrigir
 * um torneio antigo não é o que alguém faz dentro do clube.
 */
const ESSENCIAIS = [
  "/painel",
  "/torneios",
  "/torneios/novo",
  "/torneios/ao-vivo",
  "/torneios/ao-vivo/fechar",
  "/satelites",
  "/jogadores",
  "/mesa",
  "/diario",
  "/manifest.webmanifest",
  "/icone-192.png",
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // Uma a uma, e não `addAll`: com `addAll` uma única rota que falhe
      // aborta a instalação inteira e o app fica sem service worker nenhum.
      await Promise.all(
        ESSENCIAIS.map((rota) => cache.add(rota).catch(() => undefined)),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    (async () => {
      const nomes = await caches.keys();
      await Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
      // Assume o controle das abas já abertas, para a atualização valer sem
      // exigir que o jogador feche tudo.
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (evento) => {
  const req = evento.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase e afins: direto.

  if (req.mode === "navigate") {
    evento.respondWith(navegar(req));
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icone-")) {
    evento.respondWith(cachePrimeiro(req));
    return;
  }

  evento.respondWith(redePrimeiro(req));
});

async function navegar(req) {
  try {
    const resposta = await fetch(req);
    if (resposta.ok) {
      const cache = await caches.open(CACHE);
      cache.put(req, resposta.clone());
    }
    return resposta;
  } catch {
    const cache = await caches.open(CACHE);
    // A própria rota, se estiver guardada; senão o painel, que é um app
    // completo e sabe se orientar sozinho a partir da URL. A reserva NÃO é a
    // raiz: ela virou a página de apresentação, e cair nela sem sinal daria a
    // um jogador no meio do torneio uma landing em vez do painel dele.
    return (await cache.match(req)) ?? (await cache.match("/painel")) ?? Response.error();
  }
}

async function cachePrimeiro(req) {
  const cache = await caches.open(CACHE);
  const guardado = await cache.match(req);
  if (guardado) return guardado;
  try {
    const resposta = await fetch(req);
    if (resposta.ok) cache.put(req, resposta.clone());
    return resposta;
  } catch {
    return Response.error();
  }
}

async function redePrimeiro(req) {
  try {
    const resposta = await fetch(req);
    if (resposta.ok) {
      const cache = await caches.open(CACHE);
      cache.put(req, resposta.clone());
    }
    return resposta;
  } catch {
    const cache = await caches.open(CACHE);
    return (await cache.match(req)) ?? Response.error();
  }
}

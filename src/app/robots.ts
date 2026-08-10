import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site/url";

/**
 * O produto não vai para buscador; a apresentação vai.
 *
 * `/painel` e o que vem depois dele são as telas de quem já entrou, com dados
 * que só existem no navegador de cada um. Um rastreador que passasse por ali
 * indexaria um painel vazio com o nome do Oblix — pior do que não indexar.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/painel",
        "/torneios",
        "/satelites",
        "/jogadores",
        "/mesa",
        "/diario",
        "/treino",
        "/perfil",
        "/configuracoes",
      ],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}

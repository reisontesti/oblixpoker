import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site/url";

/** Só o que é público e faz sentido em resultado de busca. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE}/privacidade`, changeFrequency: "yearly", priority: 0.3 },
  ];
}

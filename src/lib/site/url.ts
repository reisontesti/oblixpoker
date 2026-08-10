/**
 * O endereço público do Oblix.
 *
 * Sai da variável que a Vercel injeta em produção, com o domínio conhecido
 * como reserva. Fixar só a constante quebraria os links absolutos de
 * `sitemap` e Open Graph em qualquer prévia de deploy; ler só a variável
 * quebraria o build local, onde ela não existe.
 */
const DA_VERCEL = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;

export const SITE = DA_VERCEL ? `https://${DA_VERCEL}` : "https://oblix-six.vercel.app";

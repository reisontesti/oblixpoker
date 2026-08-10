import type { Metadata } from "next";
import { AppShell } from "@/components/shell/AppShell";

/**
 * O produto propriamente dito, com a casca de navegação.
 *
 * O grupo `(app)` existe para separá-lo da landing: são duas coisas com
 * públicos e formatos diferentes. O painel é para quem já entrou e precisa da
 * barra inferior e da lateral em toda tela; a página inicial é para quem ainda
 * não conhece o Oblix e não deve ver navegação de app nenhuma.
 *
 * Os parênteses não entram na URL — `(app)/painel` continua sendo `/painel`.
 */
export const metadata: Metadata = {
  // O produto não vai para buscador: são os dados de quem entrou, e todas as
  // telas dependem de estado local. Indexar `/painel` só produziria resultados
  // vazios com o nome do Oblix.
  robots: { index: false, follow: false },
};

export default function LayoutDoApp({ children }: LayoutProps<"/">) {
  return <AppShell>{children}</AppShell>;
}

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SCRIPT_TEMA } from "@/lib/tema";
import { SITE } from "@/lib/site/url";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  // Sem isto, o Next resolve as imagens de Open Graph contra `localhost` e o
  // cartão de link nasce quebrado em toda rede social.
  metadataBase: new URL(SITE),
  title: {
    default: "Oblix — plataforma de performance para jogadores de poker",
    template: "%s · Oblix",
  },
  description:
    "Bankroll, evolução técnica, disciplina e análise de satélites para jogadores de poker.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Oblix",
    // Translúcida: no iPhone instalado, o conteúdo ocupa a tela inteira e a
    // faixa da barra de status é pintada pelo próprio app (ver `.tarja-topo`
    // em AppShell). Os glifos do iOS aqui são sempre brancos, e é por isso que
    // a faixa é escura NOS DOIS temas — no claro ela lê como moldura do
    // aparelho, e não como um retângulo perdido.
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icone-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icone-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  // Valor inicial; `SCRIPT_TEMA` o corrige antes da primeira pintura e
  // `definirTema` o atualiza a cada troca.
  themeColor: "#08090a",
  // `viewport-fit: cover` faz o app usar a tela inteira quando instalado; os
  // `env(safe-area-inset-*)` cuidam do entalhe e da barra de gestos.
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // `suppressHydrationWarning` porque `data-tema` é escrito pelo script antes
    // do React montar: o HTML do servidor não tem como saber o tema de quem
    // abriu, e sem isto o React acusaria a diferença que nós mesmos causamos.
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}

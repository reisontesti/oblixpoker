import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/shell/AppShell";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Oblix — sistema operacional do jogador",
  description:
    "Bankroll, evolução técnica, disciplina e análise de satélites para jogadores de poker.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Oblix",
    // Preta translúcida: no iPhone a barra de status fica sobre o conteúdo, e
    // o Oblix é dark-only — qualquer outra opção abriria uma faixa clara no
    // topo de um app que não tem tema claro.
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
  themeColor: "#08090a",
  colorScheme: "dark",
  // `viewport-fit: cover` faz o app usar a tela inteira quando instalado; o
  // `env(safe-area-inset-*)` da barra inferior já cuida do entalhe.
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

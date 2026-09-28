import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { PWA } from "@/components/pwa";

export const metadata: Metadata = {
  title: "GBR Soluções — seu sobrinho de aluguel",
  description:
    "Painel pessoal da GBR Soluções: orçamentos, ordens de serviço, agenda, estoque, financeiro e portal do cliente.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: ["/favicon.ico", "/icon-192.png", "/icon-512.png"],
    apple: ["/apple-touch-icon.png"],
  },
  // "default" mantém a barra de status legível também no tema claro.
  appleWebApp: { capable: true, statusBarStyle: "default", title: "GBR" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F5F7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * Aplica o tema antes do primeiro paint para evitar o "flash branco".
 * Roda inline (antes da hidratação) e cai no sistema quando não há preferência salva.
 */
const themeInit = `(function(){try{var t=localStorage.getItem("gbr.theme")||"auto";var d=t==="dark"||(t==="auto"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){document.documentElement.dataset.theme="light";}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="antialiased">
        <StoreProvider>
          {children}
          <PWA />
        </StoreProvider>
      </body>
    </html>
  );
}

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GBR Sobrinho — Painel de Gestão",
    short_name: "GBR Sobrinho",
    description:
      "Painel de gestão da GBR Sobrinho: clientes, produtos, pedidos e faturamento.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}

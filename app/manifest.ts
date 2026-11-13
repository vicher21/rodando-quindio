
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Rodando Quindío",
    short_name: "Rodando",
    description: "Conectamos caminos, acercamos destinos.",
    start_url: "/",
    display: "standalone",
    background_color: "#F5F2E9",
    theme_color: "#164B37",
    lang: "es-CO",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}

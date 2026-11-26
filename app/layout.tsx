
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rodando Quindío | Viaja fácil, llega seguro",
  description:
    "Solicita transporte en carro y mensajería en el Quindío. Conectamos caminos, acercamos destinos.",

  applicationName: "Rodando Quindío",

  manifest: "/manifest.webmanifest",

  appleWebApp: {
    capable: true,
    title: "Rodando",
    statusBarStyle: "black-translucent",
  },

  formatDetection: {
    telephone: true,
  },

  icons: {
    icon: [
      {
        url: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#164B37",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

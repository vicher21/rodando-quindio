import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rodando Quindío | Conectamos caminos",
  description: "Transporte en carro y mensajería en el corazón del Quindío.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}

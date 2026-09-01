import type { Metadata } from "next";
import "./styles/globals.css";

export const metadata: Metadata = {
  title: "EstateAI — Un chatbot que responde solo con los datos de tu agencia",
  description:
    "Chatbot inmobiliario con RAG. Responde anclado al catálogo real de tu agencia y dice 'no lo sé' cuando no hay dato.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

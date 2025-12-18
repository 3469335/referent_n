import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Референт англоязычных статей",
  description: "Приложение для анализа англоязычных статей на основе ИИ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}


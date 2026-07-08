import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mantara Voice Inbox",
  description:
    "Transformer une pensee dictee rapidement en systeme de suivi fiable pour les projets Mantara.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}

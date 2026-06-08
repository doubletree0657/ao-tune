import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AoTune",
  description:
    "A personal-first AI agent workspace for music, cosplay, creativity, and identity-driven artifacts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

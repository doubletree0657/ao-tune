import type { Metadata } from "next";

import AppShell from "./components/app-shell";
import { ThemeProvider } from "./components/theme-provider";
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
    <html data-theme="light" lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function () {
  try {
    var key = "aotune.application-settings-cache.v1";
    var legacyKey = "aotune.theme-cache";
    var cached = window.localStorage.getItem(key);
    var allowed = { light: true, black: true, midnight: true, sky: true };
    var theme = "light";
    if (cached) {
      var parsed = JSON.parse(cached);
      if (
        parsed &&
        allowed[parsed.theme] &&
        parsed.lyricsLearning &&
        parsed.lyricsLearning.songSheet &&
        typeof parsed.lyricsLearning.songSheet.showRomaji === "boolean" &&
        typeof parsed.lyricsLearning.songSheet.showTranslation === "boolean"
      ) {
        theme = parsed.theme;
      }
    } else {
      var legacyTheme = window.localStorage.getItem(legacyKey);
      if (allowed[legacyTheme]) theme = legacyTheme;
    }
    if (!allowed[theme]) theme = "light";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme =
      theme === "black" || theme === "midnight" ? "dark" : "light";
  } catch (_) {
    document.documentElement.dataset.theme = "light";
    document.documentElement.style.colorScheme = "light";
  }
})();`,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}

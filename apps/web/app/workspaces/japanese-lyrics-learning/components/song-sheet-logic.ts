import {
  songSheetOriginalTextSizeMax,
  songSheetOriginalTextSizeMin,
  type LyricsLineCard,
  type SongSheetLayoutMode,
} from "../../../../lib/api";

export type LyricPhraseDisplayPart = {
  kind: "romaji" | "original" | "translation" | "missing";
  text: string;
};

export type LyricPhraseDisplay = {
  activationLineNumber: number;
  showLineNumber: boolean;
  parts: LyricPhraseDisplayPart[];
};

export function sortedLineCards(lineCards: LyricsLineCard[]) {
  return [...lineCards].sort((first, second) => first.lineNumber - second.lineNumber);
}

export function densityValue(originalTextSize: number) {
  const boundedSize = Math.min(
    Math.max(originalTextSize, songSheetOriginalTextSizeMin),
    songSheetOriginalTextSizeMax,
  );
  return (
    (boundedSize - songSheetOriginalTextSizeMin) /
    (songSheetOriginalTextSizeMax - songSheetOriginalTextSizeMin)
  );
}

export function lyricPhraseDisplay(
  card: LyricsLineCard,
  options: {
    layoutMode: SongSheetLayoutMode;
    showRomaji: boolean;
    showTranslation: boolean;
  },
): LyricPhraseDisplay {
  const shouldShowMissingValues = options.layoutMode !== "sing_along";
  const parts: LyricPhraseDisplayPart[] = [];

  if (options.showRomaji) {
    if (card.romaji?.trim()) {
      parts.push({ kind: "romaji", text: card.romaji });
    } else if (shouldShowMissingValues) {
      parts.push({ kind: "missing", text: "Romaji not set" });
    }
  }

  parts.push({ kind: "original", text: card.originalText });

  if (options.showTranslation) {
    if (card.meaning?.trim()) {
      parts.push({ kind: "translation", text: card.meaning });
    } else if (shouldShowMissingValues) {
      parts.push({ kind: "missing", text: "Translation not set" });
    }
  }

  return {
    activationLineNumber: card.lineNumber,
    showLineNumber: options.layoutMode !== "sing_along",
    parts,
  };
}

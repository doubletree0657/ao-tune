import type { LyricsLineCard } from "@/lib/api";
import { type SongSheetLayoutMode } from "@/lib/api";
import type { CSSProperties } from "react";

import styles from "../workspace.module.css";
import {
  densityValue,
  lyricPhraseDisplay,
  sortedLineCards,
  type LyricPhraseDisplayPart,
} from "./song-sheet-logic";

type SongSheetProps = {
  layoutMode: SongSheetLayoutMode;
  lineCards: LyricsLineCard[];
  onEditLine: (lineNumber: number) => void;
  originalTextSize: number;
  showRomaji: boolean;
  showTranslation: boolean;
};

type SongSheetStyle = CSSProperties & {
  "--song-original-size": string;
  "--song-original-line-height": string;
  "--song-inline-gap": string;
  "--song-group-gap": string;
  "--song-group-padding-block": string;
  "--song-sheet-padding-block": string;
  "--song-sheet-padding-bottom": string;
  "--song-compact-gap": string;
  "--song-compact-column-min": string;
  "--song-singalong-column-gap": string;
  "--song-singalong-row-gap": string;
  "--song-singalong-padding-inline": string;
};

function remValue(minimum: number, maximum: number, density: number) {
  return `${(minimum + (maximum - minimum) * density).toFixed(3)}rem`;
}

function songSheetStyle(originalTextSize: number): SongSheetStyle {
  const density = densityValue(originalTextSize);

  return {
    "--song-original-size": `${originalTextSize}px`,
    "--song-original-line-height": (1.42 + 0.12 * density).toFixed(3),
    "--song-inline-gap": remValue(0.05, 0.18, density),
    "--song-group-gap": remValue(0.55, 1.4, density),
    "--song-group-padding-block": remValue(0.12, 0.3, density),
    "--song-sheet-padding-block": remValue(1, 1.65, density),
    "--song-sheet-padding-bottom": remValue(1.6, 2.7, density),
    "--song-compact-gap": remValue(0.55, 1.2, density),
    "--song-compact-column-min": `clamp(17rem, ${
      originalTextSize * 11
    }px, 24rem)`,
    "--song-singalong-column-gap": remValue(0.95, 1.55, density),
    "--song-singalong-row-gap": remValue(0.55, 1.1, density),
    "--song-singalong-padding-inline": remValue(0.9, 1.45, density),
  };
}

type LyricGroupProps = {
  card: LyricsLineCard;
  layoutMode: SongSheetLayoutMode;
  onEditLine: (lineNumber: number) => void;
  showRomaji: boolean;
  showTranslation: boolean;
};

function LyricPhrase({
  card,
  layoutMode,
  onEditLine,
  showRomaji,
  showTranslation,
}: LyricGroupProps) {
  const display = lyricPhraseDisplay(card, {
    layoutMode,
    showRomaji,
    showTranslation,
  });
  const buttonClassName =
    layoutMode === "compact"
      ? `${styles.songLineButton} ${styles.compactLineButton}`
      : layoutMode === "sing_along"
        ? `${styles.songLineButton} ${styles.singAlongLineButton}`
      : styles.songLineButton;
  const textClassName =
    layoutMode === "sing_along"
      ? `${styles.songLineText} ${styles.singAlongLineText}`
      : styles.songLineText;

  function partClassName(part: LyricPhraseDisplayPart) {
    if (part.kind === "romaji") {
      return styles.songRomaji;
    }
    if (part.kind === "translation") {
      return styles.songTranslation;
    }
    if (part.kind === "missing") {
      return styles.songMissing;
    }
    return styles.songJapanese;
  }

  return (
    <button
      aria-label={`Edit lyric line ${display.activationLineNumber}`}
      className={buttonClassName}
      onClick={() => onEditLine(display.activationLineNumber)}
      type="button"
    >
      {display.showLineNumber ? (
        <span className={styles.songLineNumber} aria-hidden="true">
          {card.lineNumber}
        </span>
      ) : null}
      <span className={textClassName}>
        {display.parts.map((part) => (
          <span
            className={partClassName(part)}
            key={`${part.kind}-${part.text}`}
            lang={part.kind === "original" ? "ja" : undefined}
          >
            {part.text}
          </span>
        ))}
      </span>
    </button>
  );
}

type LyricPhraseItemProps = LyricGroupProps;

function LyricPhraseItem({
  card,
  layoutMode,
  onEditLine,
  showRomaji,
  showTranslation,
}: LyricPhraseItemProps) {
  return (
    <li
      className={layoutMode === "sing_along" ? styles.singAlongLineItem : undefined}
    >
      <LyricPhrase
        card={card}
        layoutMode={layoutMode}
        onEditLine={onEditLine}
        showRomaji={showRomaji}
        showTranslation={showTranslation}
      />
    </li>
  );
}

export default function SongSheet({
  layoutMode,
  lineCards,
  onEditLine,
  originalTextSize,
  showRomaji,
  showTranslation,
}: SongSheetProps) {
  const orderedCards = sortedLineCards(lineCards);
  const listClassName =
    layoutMode === "compact"
      ? `${styles.songLineList} ${styles.compactLineList}`
      : layoutMode === "sing_along"
        ? `${styles.songLineList} ${styles.singAlongLineList}`
      : styles.songLineList;

  return (
    <div className={styles.songSheetScroll} style={songSheetStyle(originalTextSize)}>
      {orderedCards.length > 0 ? (
        <ol className={listClassName}>
          {orderedCards.map((card) => (
            <LyricPhraseItem
              card={card}
              key={card.lineNumber}
              layoutMode={layoutMode}
              onEditLine={onEditLine}
              showRomaji={showRomaji}
              showTranslation={showTranslation}
            />
          ))}
        </ol>
      ) : (
        <p className={styles.message}>
          No line cards were generated for this artifact.
        </p>
      )}
    </div>
  );
}

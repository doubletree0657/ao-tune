import type { LyricsLineCard } from "@/lib/api";
import {
  songSheetOriginalTextSizeMax,
  songSheetOriginalTextSizeMin,
  type SongSheetLayoutMode,
} from "@/lib/api";
import type { CSSProperties } from "react";

import styles from "../workspace.module.css";

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
};

function sortedLineCards(lineCards: LyricsLineCard[]) {
  return [...lineCards].sort((first, second) => first.lineNumber - second.lineNumber);
}

function densityValue(originalTextSize: number) {
  const boundedSize = Math.min(
    Math.max(originalTextSize, songSheetOriginalTextSizeMin),
    songSheetOriginalTextSizeMax,
  );
  return (
    (boundedSize - songSheetOriginalTextSizeMin) /
    (songSheetOriginalTextSizeMax - songSheetOriginalTextSizeMin)
  );
}

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
  };
}

type LyricGroupProps = {
  card: LyricsLineCard;
  layoutMode: SongSheetLayoutMode;
  onEditLine: (lineNumber: number) => void;
  showRomaji: boolean;
  showTranslation: boolean;
};

function LyricGroup({
  card,
  layoutMode,
  onEditLine,
  showRomaji,
  showTranslation,
}: LyricGroupProps) {
  const buttonClassName =
    layoutMode === "compact"
      ? `${styles.songLineButton} ${styles.compactLineButton}`
      : styles.songLineButton;

  return (
    <button
      aria-label={`Edit line ${card.lineNumber}`}
      className={buttonClassName}
      onClick={() => onEditLine(card.lineNumber)}
      type="button"
    >
      <span className={styles.songLineNumber} aria-hidden="true">
        {card.lineNumber}
      </span>
      <span className={styles.songLineText}>
        {showRomaji ? (
          card.romaji?.trim() ? (
            <span className={styles.songRomaji}>{card.romaji}</span>
          ) : (
            <span className={styles.songMissing}>Romaji not set</span>
          )
        ) : null}
        <span className={styles.songJapanese} lang="ja">
          {card.originalText}
        </span>
        {showTranslation ? (
          card.meaning?.trim() ? (
            <span className={styles.songTranslation}>{card.meaning}</span>
          ) : (
            <span className={styles.songMissing}>Translation not set</span>
          )
        ) : null}
      </span>
    </button>
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
      : styles.songLineList;

  return (
    <div className={styles.songSheetScroll} style={songSheetStyle(originalTextSize)}>
      {orderedCards.length > 0 ? (
        <ol className={listClassName}>
          {orderedCards.map((card) => (
            <li key={card.lineNumber}>
              <LyricGroup
                card={card}
                layoutMode={layoutMode}
                onEditLine={onEditLine}
                showRomaji={showRomaji}
                showTranslation={showTranslation}
              />
            </li>
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

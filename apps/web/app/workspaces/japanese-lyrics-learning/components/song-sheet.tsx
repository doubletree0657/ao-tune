import type { LyricsLineCard } from "@/lib/api";

import styles from "../workspace.module.css";

type SongSheetProps = {
  lineCards: LyricsLineCard[];
  onEditLine: (lineNumber: number) => void;
  showRomaji: boolean;
  showTranslation: boolean;
};

function sortedLineCards(lineCards: LyricsLineCard[]) {
  return [...lineCards].sort((first, second) => first.lineNumber - second.lineNumber);
}

export default function SongSheet({
  lineCards,
  onEditLine,
  showRomaji,
  showTranslation,
}: SongSheetProps) {
  const orderedCards = sortedLineCards(lineCards);

  return (
    <div className={styles.songSheetScroll}>
      {orderedCards.length > 0 ? (
        <ol className={styles.songLineList}>
          {orderedCards.map((card) => (
            <li key={card.lineNumber}>
              <button
                aria-label={`Edit line ${card.lineNumber}`}
                className={styles.songLineButton}
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
                        <span className={styles.songTranslation}>
                          {card.meaning}
                        </span>
                      ) : (
                        <span className={styles.songMissing}>
                          Translation not set
                        </span>
                      )
                  ) : null}
                </span>
              </button>
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

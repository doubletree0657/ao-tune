import type { LyricsLineCard } from "@/lib/api";

import styles from "../workspace.module.css";

type LineCardListProps = {
  lineCards: LyricsLineCard[];
  onSelect: (index: number) => void;
  selectedLineIndex: number;
};

function confidenceLabel(confidence: number | null) {
  return confidence === null ? "No confidence" : `${Math.round(confidence * 100)}%`;
}

export default function LineCardList({
  lineCards,
  onSelect,
  selectedLineIndex,
}: LineCardListProps) {
  return (
    <nav aria-label="Generated lyric lines" className={styles.lineScroll}>
      <ol className={styles.lineList}>
        {lineCards.map((card, index) => {
          const confidence = confidenceLabel(card.confidence);
          const isSelected = index === selectedLineIndex;

          return (
            <li key={`${card.lineNumber}-${card.originalText}`}>
              <button
                aria-current={isSelected ? "true" : undefined}
                aria-label={`Select line ${card.lineNumber}: ${card.originalText}`}
                className={styles.lineButton}
                onClick={() => onSelect(index)}
                type="button"
              >
                <span className={styles.lineNumber}>{card.lineNumber}</span>
                <span className={styles.linePreview}>
                  <span className={styles.lineJapanese} lang="ja">
                    {card.originalText}
                  </span>
                  <span className={styles.lineMeta}>
                    <span
                      className={
                        card.needsReview ? styles.reviewPill : styles.donePill
                      }
                    >
                      {card.needsReview ? "Needs review" : "Reviewed"}
                    </span>
                    <span className={styles.neutralPill}>{confidence}</span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

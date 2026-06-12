import type { LyricsLineCard } from "@/lib/api";

type LineCardListProps = {
  lineCards: LyricsLineCard[];
  onSelect: (index: number) => void;
  selectedLineIndex: number;
};

function confidenceLabel(confidence: number | null) {
  return confidence === null ? null : `${Math.round(confidence * 100)}%`;
}

export default function LineCardList({
  lineCards,
  onSelect,
  selectedLineIndex,
}: LineCardListProps) {
  return (
    <nav aria-label="Generated lyric lines" className="line-card-master">
      <div className="line-card-master-heading">
        <h5>Lyrics lines</h5>
        <span>{lineCards.length} lines</span>
      </div>
      <ol>
        {lineCards.map((card, index) => {
          const confidence = confidenceLabel(card.confidence);
          const isSelected = index === selectedLineIndex;

          return (
            <li key={`${card.lineNumber}-${card.originalText}`}>
              <button
                aria-current={isSelected ? "true" : undefined}
                className={isSelected ? "is-selected" : undefined}
                onClick={() => onSelect(index)}
                type="button"
              >
                <span className="line-card-number">{card.lineNumber}</span>
                <span className="line-card-preview" lang="ja">
                  {card.originalText}
                </span>
                <span
                  className={
                    card.needsReview ? "status-review" : "status-reviewed"
                  }
                >
                  {card.needsReview ? "Needs review" : "Reviewed"}
                </span>
                {confidence ? (
                  <small aria-label={`Confidence ${confidence}`}>
                    {confidence}
                  </small>
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

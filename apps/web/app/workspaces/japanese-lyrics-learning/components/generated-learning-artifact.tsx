import type { LyricsLearningAgentOutput, LyricsLineCard } from "@/lib/api";

import LineCardEditor from "./line-card-editor";
import ReviewSummary from "./review-summary";

type GeneratedLearningArtifactProps = {
  lineCards: LyricsLineCard[];
  onLineCardsChange: (lineCards: LyricsLineCard[]) => void;
  output: LyricsLearningAgentOutput;
};

export default function GeneratedLearningArtifact({
  lineCards,
  onLineCardsChange,
  output,
}: GeneratedLearningArtifactProps) {
  const reviewedCount = lineCards.filter((card) => !card.needsReview).length;
  const needsReviewCount = lineCards.length - reviewedCount;

  function updateLineCard(
    cardIndex: number,
    update: Partial<LyricsLineCard>,
  ) {
    onLineCardsChange(
      lineCards.map((card, index) =>
        index === cardIndex ? { ...card, ...update } : card,
      ),
    );
  }

  return (
    <section className="generated-learning" aria-labelledby="line-cards-heading">
      <div className="pending-output-heading">
        <h4 id="line-cards-heading">Line cards</h4>
        <p>Review the generated draft before saving it as an artifact.</p>
      </div>

      {lineCards.length > 0 ? (
        <>
          <ReviewSummary
            needsReviewCount={needsReviewCount}
            reviewedCount={reviewedCount}
            totalCount={lineCards.length}
          />
          <p className="local-edit-note">
            Original text stays read-only; generated learning fields are
            editable. Edits are local until artifact persistence is implemented.
          </p>
          <ol className="lyrics-line-list">
            {lineCards.map((card, cardIndex) => (
              <LineCardEditor
                card={card}
                cardIndex={cardIndex}
                key={`${card.lineNumber}-${card.originalText}`}
                onChange={(update) => updateLineCard(cardIndex, update)}
              />
            ))}
          </ol>
        </>
      ) : (
        <p className="field-empty">
          No line cards were generated. Add user-provided lyrics text to create
          them; study notes are context only.
        </p>
      )}

      {output.reviewCards.length > 0 ? (
        <div className="review-prompts">
          <h4>Review cards</h4>
          <ul>
            {output.reviewCards.map((card) => (
              <li key={card}>{card}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

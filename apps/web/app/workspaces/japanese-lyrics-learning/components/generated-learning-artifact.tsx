import type { LyricsLearningAgentOutput, LyricsLineCard } from "@/lib/api";

import LineCardList from "./line-card-list";
import ReviewSummary from "./review-summary";
import SelectedLineCardEditor from "./selected-line-card-editor";

type GeneratedLearningArtifactProps = {
  lineCards: LyricsLineCard[];
  onLineCardsChange: (lineCards: LyricsLineCard[]) => void;
  onSelectedLineIndexChange: (index: number) => void;
  output: LyricsLearningAgentOutput;
  selectedLineIndex: number;
};

export default function GeneratedLearningArtifact({
  lineCards,
  onLineCardsChange,
  onSelectedLineIndexChange,
  output,
  selectedLineIndex,
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
          <div className="line-review-desk">
            <LineCardList
              lineCards={lineCards}
              onSelect={onSelectedLineIndexChange}
              selectedLineIndex={selectedLineIndex}
            />
            <SelectedLineCardEditor
              card={lineCards[selectedLineIndex] ?? lineCards[0]}
              cardIndex={selectedLineIndex}
              onChange={(update) => updateLineCard(selectedLineIndex, update)}
            />
          </div>
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

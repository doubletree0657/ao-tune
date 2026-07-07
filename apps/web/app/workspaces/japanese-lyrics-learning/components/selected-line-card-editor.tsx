import type { LyricsLineCard } from "@/lib/api";

import {
  EditableLearningField,
  EditableNotesField,
} from "./editable-fields";
import styles from "../workspace.module.css";

type ReviewSaveState = "clean" | "unsaved" | "saving" | "saved" | "error";

type SelectedLineCardEditorProps = {
  canSave: boolean;
  card: LyricsLineCard;
  cardIndex: number;
  hasLocalDraft: boolean;
  onChange: (update: Partial<LyricsLineCard>) => void;
  onClearLocalDraft: () => void;
  onMove: (index: number) => void;
  onSaveReviewEdits: () => void;
  reviewSaveError: string | null;
  reviewSaveState: ReviewSaveState;
  totalCards: number;
};

function confidenceLabel(confidence: number | null) {
  return confidence === null
    ? "Confidence not generated"
    : `Confidence ${Math.round(confidence * 100)}%`;
}

function saveStateDescription(
  reviewSaveState: ReviewSaveState,
  hasLocalDraft: boolean,
  reviewSaveError: string | null,
) {
  if (reviewSaveError) {
    return reviewSaveError;
  }
  if (hasLocalDraft) {
    return "Browser recovery is available for these edits.";
  }
  if (reviewSaveState === "unsaved") {
    return "Save to update the persisted artifact.";
  }
  return "Line-card edits and review status are up to date.";
}

export default function SelectedLineCardEditor({
  canSave,
  card,
  cardIndex,
  hasLocalDraft,
  onChange,
  onClearLocalDraft,
  onMove,
  onSaveReviewEdits,
  reviewSaveError,
  reviewSaveState,
  totalCards,
}: SelectedLineCardEditorProps) {
  const previousIndex = Math.max(cardIndex - 1, 0);
  const nextIndex = Math.min(cardIndex + 1, totalCards - 1);

  return (
    <section className={styles.editor} aria-labelledby="selected-line-title">
      <div className={styles.editorTop}>
        <div className={styles.sourceBlock}>
          <div className={styles.sourceLabel}>
            <h3 id="selected-line-title">Line {card.lineNumber}</h3>
            <span className={styles.neutralPill}>
              {confidenceLabel(card.confidence)}
            </span>
          </div>
          <p className={styles.originalText} lang="ja">
            {card.originalText}
          </p>
        </div>

        <div className={styles.reviewActions} aria-label="Review controls">
          <button
            className={styles.ghostButton}
            disabled={cardIndex === 0}
            onClick={() => onMove(previousIndex)}
            type="button"
          >
            Previous
          </button>
          <button
            className={styles.ghostButton}
            disabled={cardIndex >= totalCards - 1}
            onClick={() => onMove(nextIndex)}
            type="button"
          >
            Next
          </button>
          <button
            className={styles.button}
            onClick={() => onChange({ needsReview: !card.needsReview })}
            type="button"
          >
            {card.needsReview ? "Mark reviewed" : "Mark needs review"}
          </button>
          {canSave || reviewSaveState === "saving" ? (
            <button
              className={styles.primaryButton}
              disabled={!canSave}
              onClick={onSaveReviewEdits}
              type="button"
            >
              {reviewSaveState === "saving" ? "Saving..." : "Save"}
            </button>
          ) : null}
          {hasLocalDraft ? (
            <button
              className={styles.ghostButton}
              onClick={onClearLocalDraft}
              type="button"
            >
              Clear recovery
            </button>
          ) : null}
        </div>

        {hasLocalDraft || reviewSaveError ? (
          <div className={styles.saveState} aria-live="polite">
            <strong>{reviewSaveError ? "Save failed" : "Local recovery"}</strong>
            <p>
              {saveStateDescription(
                reviewSaveState,
                hasLocalDraft,
                reviewSaveError,
              )}
            </p>
          </div>
        ) : null}
      </div>

      <div className={styles.editorScroll}>
        <div className={styles.editorFields}>
          <div className={styles.reviewToggleRow}>
            <span className={card.needsReview ? styles.reviewPill : styles.donePill}>
              {card.needsReview ? "Needs review" : "Reviewed"}
            </span>
          </div>

          <EditableLearningField
            id={`line-${cardIndex}-romaji`}
            label="Romaji"
            onChange={(value) => onChange({ romaji: value })}
            value={card.romaji}
          />
          <EditableLearningField
            helperText="Use Chinese-friendly sound hints for sing-along practice."
            id={`line-${cardIndex}-chinese-pronunciation`}
            label="Approximate Chinese pronunciation"
            onChange={(value) =>
              onChange({ approximateChinesePronunciation: value })
            }
            value={card.approximateChinesePronunciation}
          />
          <EditableLearningField
            id={`line-${cardIndex}-meaning`}
            isWide
            label="Meaning"
            onChange={(value) => onChange({ meaning: value })}
            rows={3}
            value={card.meaning}
          />
          <EditableNotesField
            id={`line-${cardIndex}-pronunciation-notes`}
            label="Pronunciation notes"
            onChange={(value) => onChange({ pronunciationNotes: value })}
            value={card.pronunciationNotes}
          />
          <EditableNotesField
            id={`line-${cardIndex}-sing-along-notes`}
            label="Sing-along notes"
            onChange={(value) => onChange({ singAlongNotes: value })}
            value={card.singAlongNotes}
          />
        </div>
      </div>
    </section>
  );
}

import type { LyricsLearningDraft, LyricsLineCard } from "@/lib/api";

import LineCardList from "./line-card-list";
import SelectedLineCardEditor from "./selected-line-card-editor";
import styles from "../workspace.module.css";

type AgentDraftArtifactProps = {
  draft: LyricsLearningDraft;
  hasLocalDraft: boolean;
  lineCards: LyricsLineCard[];
  onClearLocalDraft: () => void;
  onLineCardsChange: (lineCards: LyricsLineCard[]) => void;
  onSaveReviewEdits: () => void;
  onSelectedLineIndexChange: (index: number) => void;
  reviewSaveError: string | null;
  reviewSaveState: "clean" | "unsaved" | "saving" | "saved" | "error";
  selectedLineIndex: number;
};

function statusLabel(status: LyricsLearningDraft["status"]) {
  if (status === "generated") {
    return "Generated";
  }
  if (status === "needs_review") {
    return "Needs review";
  }
  return "Generating";
}

function compactText(text: string | null, emptyText: string) {
  if (!text?.trim()) {
    return emptyText;
  }
  const preview = text.trim().split(/\r?\n/).slice(0, 6).join("\n");
  return preview.length > 520 ? `${preview.slice(0, 520)}...` : preview;
}

export default function AgentDraftArtifact({
  draft,
  hasLocalDraft,
  lineCards,
  onClearLocalDraft,
  onLineCardsChange,
  onSaveReviewEdits,
  onSelectedLineIndexChange,
  reviewSaveError,
  reviewSaveState,
  selectedLineIndex,
}: AgentDraftArtifactProps) {
  const reviewedCount = lineCards.filter((card) => !card.needsReview).length;
  const needsReviewCount = lineCards.length - reviewedCount;
  const canSaveReviewEdits =
    draft.id !== "local-preview" &&
    Boolean(draft.agentOutput) &&
    reviewSaveState !== "clean" &&
    reviewSaveState !== "saved" &&
    reviewSaveState !== "saving";
  const selectedIndex = lineCards[selectedLineIndex] ? selectedLineIndex : 0;

  return (
    <>
      <section className={styles.lineNavigator} aria-labelledby="artifact-title">
        <div className={styles.artifactHeader}>
          <div className={styles.artifactTitleRow}>
            <div>
              <p className={styles.eyebrow}>Current artifact</p>
              <h2 className={styles.artifactTitle} id="artifact-title">
                {draft.songTitle.trim() || "Untitled song request"}
              </h2>
              <p className={styles.artist}>
                {draft.artist.trim() || "Artist not provided"}
              </p>
            </div>
            <span
              className={
                needsReviewCount > 0 ? styles.reviewPill : styles.donePill
              }
            >
              {statusLabel(draft.status)}
            </span>
          </div>

          <dl className={styles.reviewStats} aria-label="Review progress">
            <div>
              <dt>Lines</dt>
              <dd>{lineCards.length}</dd>
            </div>
            <div>
              <dt>Reviewed</dt>
              <dd>{reviewedCount}</dd>
            </div>
            <div>
              <dt>Needs review</dt>
              <dd>{needsReviewCount}</dd>
            </div>
          </dl>
        </div>

        {draft.generationError ? (
          <p className={styles.error} role="status">
            {draft.generationError}
          </p>
        ) : null}

        <details className={styles.details}>
          <summary>Artifact details and generation context</summary>
          <div className={styles.detailsContent}>
            <div className={styles.detailsGrid}>
              <div className={`${styles.detailBlock} ${styles.detailBlockWide}`}>
                <h4>Learning goal</h4>
                <p>{draft.learningGoal}</p>
              </div>
              <div className={`${styles.detailBlock} ${styles.detailBlockWide}`}>
                <h4>User-provided lyrics preview</h4>
                <p lang="ja">
                  {compactText(
                    draft.lyricsText,
                    "No lyrics text was stored with this artifact.",
                  )}
                </p>
              </div>
              <div className={`${styles.detailBlock} ${styles.detailBlockWide}`}>
                <h4>Study notes</h4>
                <p>
                  {compactText(
                    draft.studyNotes,
                    "No study notes were stored with this artifact.",
                  )}
                </p>
              </div>
              <div className={styles.detailBlock}>
                <h4>Provider</h4>
                <p>
                  {draft.providerMetadata.provider}
                  {draft.providerMetadata.model
                    ? ` / ${draft.providerMetadata.model}`
                    : ""}
                </p>
              </div>
              <div className={styles.detailBlock}>
                <h4>Generation status</h4>
                <p>{statusLabel(draft.status)}</p>
              </div>
            </div>

            <div className={styles.detailBlock}>
              <h4>Generated sections</h4>
              <p>
                {draft.generatedSections
                  .map((section) => `${section.label}: ${section.status}`)
                  .join("\n")}
              </p>
            </div>
          </div>
        </details>

        {lineCards.length > 0 ? (
          <LineCardList
            lineCards={lineCards}
            onSelect={onSelectedLineIndexChange}
            selectedLineIndex={selectedLineIndex}
          />
        ) : (
          <p className={styles.message}>
            No line cards were generated for this artifact.
          </p>
        )}
      </section>

      {draft.agentOutput && lineCards.length > 0 ? (
        <SelectedLineCardEditor
          canSave={canSaveReviewEdits}
          card={lineCards[selectedIndex]}
          cardIndex={selectedIndex}
          hasLocalDraft={hasLocalDraft}
          onChange={(update) =>
            onLineCardsChange(
              lineCards.map((card, index) =>
                index === selectedIndex ? { ...card, ...update } : card,
              ),
            )
          }
          onClearLocalDraft={onClearLocalDraft}
          onMove={onSelectedLineIndexChange}
          onSaveReviewEdits={onSaveReviewEdits}
          reviewSaveError={reviewSaveError}
          reviewSaveState={reviewSaveState}
          totalCards={lineCards.length}
        />
      ) : (
        <section className={styles.emptyWorkbench} aria-labelledby="pending-title">
          <div className={styles.emptyWorkbenchInner}>
            <p className={styles.eyebrow}>Awaiting line cards</p>
            <h2 id="pending-title">No reviewable line cards are available yet.</h2>
            <p>
              This artifact exists, but no structured lyric cards were returned.
              Check the generation context above or create a new draft with
              user-provided lyrics text.
            </p>
          </div>
        </section>
      )}
    </>
  );
}

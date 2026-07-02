import type { LyricsLearningDraft, LyricsLineCard } from "@/lib/api";

import GeneratedLearningArtifact from "./generated-learning-artifact";
import ProviderNotice from "./provider-notice";
import TextPreview from "./text-preview";

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
  const canSaveReviewEdits =
    draft.id !== "local-preview" &&
    Boolean(draft.agentOutput) &&
    reviewSaveState !== "clean" &&
    reviewSaveState !== "saved" &&
    reviewSaveState !== "saving";
  const saveStateLabel =
    reviewSaveState === "clean"
      ? "No unsaved review edits"
      : reviewSaveState === "unsaved"
        ? "Unsaved review edits"
        : reviewSaveState === "saving"
          ? "Saving review edits"
          : reviewSaveState === "saved"
            ? "Review edits saved"
            : "Save failed";

  return (
    <article className="agent-artifact" aria-labelledby="agent-artifact-title">
      <div className="agent-artifact-header">
        <div>
          <p className="artifact-kicker">Agent Draft Artifact</p>
          <h3 id="agent-artifact-title">
            {draft.songTitle.trim() || "Untitled song request"}
          </h3>
          <p className="artifact-artist">
            {draft.artist.trim() || "Artist not provided"}
          </p>
        </div>
        <span>
          {draft.id === "local-preview"
            ? "Local preview"
            : draft.status === "generated"
              ? "Draft generated"
              : draft.status === "needs_review"
                ? "Needs review"
                : "Awaiting agent"}
        </span>
      </div>

      <div className="agent-request-summary">
        <div>
          <h4>Learning goal</h4>
          <p>{draft.learningGoal}</p>
        </div>
        <TextPreview
          emptyText="No lyrics text added. Line cards require user-provided lyrics text."
          label="User-provided lyrics text"
          text={draft.lyricsText}
        />
        <TextPreview
          emptyText="No study notes added."
          label="Study notes / listening goals"
          text={draft.studyNotes}
        />
      </div>

      <ProviderNotice draft={draft} />

      {draft.generationError ? (
        <p className="generation-review-note" role="status">
          {draft.generationError}
        </p>
      ) : null}

      {draft.agentOutput ? (
        <GeneratedLearningArtifact
          lineCards={lineCards}
          onLineCardsChange={onLineCardsChange}
          onSelectedLineIndexChange={onSelectedLineIndexChange}
          output={draft.agentOutput}
          selectedLineIndex={selectedLineIndex}
        />
      ) : null}

      <div className="local-draft-controls">
        <div>
          <p>{saveStateLabel}</p>
          {reviewSaveError ? (
            <p className="review-save-error" role="status">
              {reviewSaveError}
            </p>
          ) : null}
          {hasLocalDraft ? (
            <p>Unsaved browser edits are available for recovery.</p>
          ) : null}
        </div>
        <div className="local-draft-actions">
          <button
            disabled={!canSaveReviewEdits}
            onClick={onSaveReviewEdits}
            type="button"
          >
            {reviewSaveState === "saving" ? "Saving..." : "Save changes"}
          </button>
          <button
            disabled={!hasLocalDraft}
            onClick={onClearLocalDraft}
            type="button"
          >
            Clear local draft
          </button>
        </div>
      </div>

      <details className="pending-output-section" open={!draft.agentOutput}>
        <summary>
          {draft.agentOutput ? "Generation overview" : "Draft output sections"}
        </summary>
        <div className="pending-output-heading">
          <p>
            {draft.agentOutput
              ? "A compact overview of the generated study material."
              : draft.providerMetadata.provider === "fake"
                ? "The fake provider returns placeholders. Configure the backend OpenAI-compatible provider to generate text-based learning drafts."
                : "The configured provider did not return structured study material."}
          </p>
        </div>
        <ul className="pending-output-list">
          {draft.generatedSections.map((section) => (
            <li key={section.key}>
              <span>{section.label}</span>
              <strong>
                {draft.agentOutput
                  ? section.status === "generated"
                    ? "Generated"
                    : "Needs review"
                  : section.value}
              </strong>
            </li>
          ))}
        </ul>
      </details>
    </article>
  );
}

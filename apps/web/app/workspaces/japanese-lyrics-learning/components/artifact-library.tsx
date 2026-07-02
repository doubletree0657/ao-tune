import type { LyricsLearningDraftSummary } from "@/lib/api";

type ArtifactLibraryProps = {
  error: string | null;
  isLoading: boolean;
  onNewArtifact: () => void;
  onRefresh: () => void;
  onSelectArtifact: (draftId: string) => void;
  selectedDraftId: string | null;
  summaries: LyricsLearningDraftSummary[];
};

function statusLabel(status: LyricsLearningDraftSummary["status"]) {
  if (status === "generated") {
    return "Generated";
  }
  if (status === "needs_review") {
    return "Needs review";
  }
  return "Awaiting agent";
}

function updatedLabel(updatedAt: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(updatedAt));
}

export default function ArtifactLibrary({
  error,
  isLoading,
  onNewArtifact,
  onRefresh,
  onSelectArtifact,
  selectedDraftId,
  summaries,
}: ArtifactLibraryProps) {
  return (
    <aside className="artifact-library" aria-labelledby="artifact-library-title">
      <div className="artifact-library-header">
        <div>
          <p className="artifact-kicker">Artifact library</p>
          <h3 id="artifact-library-title">Saved learning drafts</h3>
        </div>
        <div className="artifact-library-actions">
          <button onClick={onRefresh} type="button">
            Refresh
          </button>
          <button onClick={onNewArtifact} type="button">
            New artifact
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="artifact-library-message" role="status">
          Loading saved artifacts...
        </p>
      ) : null}

      {error ? (
        <p className="artifact-library-error" role="alert">
          {error}
        </p>
      ) : null}

      {!isLoading && !error && summaries.length === 0 ? (
        <p className="artifact-library-message">
          No saved artifacts yet. Create a draft to keep it here.
        </p>
      ) : null}

      {summaries.length > 0 ? (
        <ol className="artifact-summary-list">
          {summaries.map((summary) => {
            const isSelected = summary.id === selectedDraftId;
            const reviewedCount =
              summary.lineCardCount - summary.needsReviewCount;
            return (
              <li key={summary.id}>
                <button
                  aria-current={isSelected ? "true" : undefined}
                  className={isSelected ? "is-selected" : undefined}
                  onClick={() => onSelectArtifact(summary.id)}
                  type="button"
                >
                  <span className="artifact-summary-main">
                    <strong>{summary.songTitle}</strong>
                    <small>{summary.artist}</small>
                  </span>
                  <span className="artifact-summary-meta">
                    <span>{statusLabel(summary.status)}</span>
                    <span>
                      {reviewedCount}/{summary.lineCardCount} reviewed
                    </span>
                    <span>{updatedLabel(summary.updatedAt)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      ) : null}
    </aside>
  );
}

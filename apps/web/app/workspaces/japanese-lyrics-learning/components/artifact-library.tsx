import type { LyricsLearningDraftSummary } from "@/lib/api";

import styles from "../workspace.module.css";

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
  return "Generating";
}

function updatedLabel(updatedAt: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(updatedAt));
}

function progressPercent(summary: LyricsLearningDraftSummary) {
  if (summary.lineCardCount === 0) {
    return 0;
  }
  return Math.round(
    ((summary.lineCardCount - summary.needsReviewCount) /
      summary.lineCardCount) *
      100,
  );
}

function RefreshIcon() {
  return (
    <svg aria-hidden="true" height="17" viewBox="0 0 24 24" width="17">
      <path
        d="M20 6v5h-5M4 18v-5h5M18.1 9a7 7 0 0 0-11.6-2.6L4 9m16 6-2.5 2.6A7 7 0 0 1 5.9 15"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
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
    <aside className={styles.library} aria-labelledby="artifact-library-title">
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.eyebrow}>Library</p>
          <h2 className={styles.panelTitle} id="artifact-library-title">
            Learning artifacts
          </h2>
          <p className={styles.panelMeta}>
            {summaries.length === 1
              ? "1 saved draft"
              : `${summaries.length} saved drafts`}
          </p>
        </div>
        <div className={styles.buttonRow}>
          <button
            aria-label="Refresh saved artifacts"
            className={styles.iconButton}
            disabled={isLoading}
            onClick={onRefresh}
            title="Refresh"
            type="button"
          >
            <RefreshIcon />
          </button>
          <button
            className={styles.primaryButton}
            onClick={onNewArtifact}
            type="button"
          >
            New
          </button>
        </div>
      </div>

      <div className={styles.libraryScroll}>
        {isLoading ? (
          <p className={styles.message} role="status">
            Loading saved artifacts...
          </p>
        ) : null}

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        {!isLoading && !error && summaries.length === 0 ? (
          <p className={styles.message}>
            No artifacts yet. Create a lyrics draft to start a review library.
          </p>
        ) : null}

        {summaries.length > 0 ? (
          <ol className={styles.summaryList}>
            {summaries.map((summary) => {
              const isSelected = summary.id === selectedDraftId;
              const reviewedCount =
                summary.lineCardCount - summary.needsReviewCount;
              const percent = progressPercent(summary);
              return (
                <li key={summary.id}>
                  <button
                    aria-current={isSelected ? "true" : undefined}
                    aria-label={`Open ${summary.songTitle} by ${summary.artist}`}
                    className={styles.summaryButton}
                    onClick={() => onSelectArtifact(summary.id)}
                    type="button"
                  >
                    <span className={styles.summaryMain}>
                      <strong>{summary.songTitle || "Untitled song"}</strong>
                      <small>{summary.artist || "Artist not provided"}</small>
                    </span>
                    <span className={styles.summaryMeta}>
                      <span
                        className={
                          summary.needsReviewCount > 0
                            ? styles.reviewPill
                            : styles.donePill
                        }
                      >
                        {statusLabel(summary.status)}
                      </span>
                      <span className={styles.neutralPill}>
                        {reviewedCount}/{summary.lineCardCount} reviewed
                      </span>
                    </span>
                    <span
                      className={styles.progressBar}
                      aria-label={`${percent}% reviewed`}
                    >
                      <span style={{ width: `${percent}%` }} />
                    </span>
                    <span className={styles.summaryUpdated}>
                      Updated {updatedLabel(summary.updatedAt)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        ) : null}
      </div>
    </aside>
  );
}

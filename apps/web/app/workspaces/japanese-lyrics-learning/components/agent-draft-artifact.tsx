import type { LyricsLearningDraft, LyricsLineCard } from "@/lib/api";
import type { SongSheetLayoutMode } from "@/lib/api";
import { useApplicationSettings } from "@/app/components/theme-provider";

import JapaneseTextSizeControl from "./japanese-text-size-control";
import LineCardList from "./line-card-list";
import SelectedLineCardEditor from "./selected-line-card-editor";
import SongSheet from "./song-sheet";
import styles from "../workspace.module.css";

export type WorkspaceMode = "reader" | "overview" | "sing_along" | "editor";
type ReadingWorkspaceMode = Exclude<WorkspaceMode, "editor">;

type AgentDraftArtifactProps = {
  draft: LyricsLearningDraft;
  hasLocalDraft: boolean;
  lineCards: LyricsLineCard[];
  mode: WorkspaceMode;
  onClearLocalDraft: () => void;
  onModeChange: (mode: WorkspaceMode) => void;
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

function saveStateLabel(
  reviewSaveState: AgentDraftArtifactProps["reviewSaveState"],
  hasLocalDraft: boolean,
) {
  if (reviewSaveState === "saving") {
    return "Saving edits";
  }
  if (reviewSaveState === "unsaved" || reviewSaveState === "error") {
    return hasLocalDraft ? "Unsaved edits saved for recovery" : "Unsaved edits";
  }
  if (reviewSaveState === "saved") {
    return "Saved";
  }
  return "Saved";
}

function shouldShowSaveState(
  reviewSaveState: AgentDraftArtifactProps["reviewSaveState"],
) {
  return reviewSaveState !== "clean";
}

function layoutModeForReadingMode(mode: ReadingWorkspaceMode): SongSheetLayoutMode {
  if (mode === "overview") {
    return "compact";
  }
  if (mode === "sing_along") {
    return "sing_along";
  }
  return "continuous";
}

function readingModeForLayoutMode(layoutMode: SongSheetLayoutMode): ReadingWorkspaceMode {
  if (layoutMode === "compact") {
    return "overview";
  }
  if (layoutMode === "sing_along") {
    return "sing_along";
  }
  return "reader";
}

export default function AgentDraftArtifact({
  draft,
  hasLocalDraft,
  lineCards,
  mode,
  onClearLocalDraft,
  onModeChange,
  onLineCardsChange,
  onSaveReviewEdits,
  onSelectedLineIndexChange,
  reviewSaveError,
  reviewSaveState,
  selectedLineIndex,
}: AgentDraftArtifactProps) {
  const {
    songSheetSettings,
    isSavingSongSheetSettings,
    setSongSheetSettings,
    updateError,
  } = useApplicationSettings();
  const reviewedCount = lineCards.filter((card) => !card.needsReview).length;
  const needsReviewCount = lineCards.length - reviewedCount;
  const canSaveReviewEdits =
    draft.id !== "local-preview" &&
    Boolean(draft.agentOutput) &&
    reviewSaveState !== "clean" &&
    reviewSaveState !== "saved" &&
    reviewSaveState !== "saving";
  const selectedIndex = lineCards[selectedLineIndex] ? selectedLineIndex : 0;

  function editLine(lineNumber: number) {
    const nextIndex = lineCards.findIndex((card) => card.lineNumber === lineNumber);
    if (nextIndex >= 0) {
      onSelectedLineIndexChange(nextIndex);
    }
    onModeChange("editor");
  }

  function setReadingMode(nextMode: ReadingWorkspaceMode) {
    onModeChange(nextMode);
    void setSongSheetSettings({
      layoutMode: layoutModeForReadingMode(nextMode),
    });
  }

  function toggleEditorMode() {
    onModeChange(
      mode === "editor"
        ? readingModeForLayoutMode(songSheetSettings.layoutMode)
        : "editor",
    );
  }

  return (
    <section className={styles.workbench} aria-labelledby="artifact-title">
      <header className={styles.workbenchHeader}>
        <div className={styles.songIdentity}>
          <h2 className={styles.artifactTitle} id="artifact-title">
            {draft.songTitle.trim() || "Untitled song request"}
          </h2>
          <p className={styles.artist}>
            {draft.artist.trim() || "Artist not provided"}
          </p>
        </div>

        <div className={styles.workbenchControls}>
          <div className={styles.modeTabs} role="group" aria-label="View mode">
            <button
              aria-pressed={mode === "reader"}
              className={styles.modeButton}
              onClick={() => setReadingMode("reader")}
              type="button"
            >
              Reader
            </button>
            <button
              aria-pressed={mode === "overview"}
              className={styles.modeButton}
              onClick={() => setReadingMode("overview")}
              type="button"
            >
              Overview
            </button>
            <button
              aria-pressed={mode === "sing_along"}
              className={styles.modeButton}
              onClick={() => setReadingMode("sing_along")}
              type="button"
            >
              Sing-along
            </button>
            <button
              aria-pressed={mode === "editor"}
              className={styles.modeButton}
              onClick={toggleEditorMode}
              type="button"
            >
              Editor
            </button>
          </div>

          {mode !== "editor" ? (
            <div
              className={styles.toggleGroup}
              aria-label="Lyrics display options"
            >
              <JapaneseTextSizeControl
                onChange={(originalTextSize) =>
                  setSongSheetSettings({ originalTextSize })
                }
                value={songSheetSettings.originalTextSize}
              />
              <label className={styles.toggleControl}>
                <input
                  checked={songSheetSettings.showRomaji}
                  disabled={isSavingSongSheetSettings}
                  onChange={(event) => {
                    void setSongSheetSettings({
                      showRomaji: event.target.checked,
                    });
                  }}
                  type="checkbox"
                />
                <span>Romaji</span>
              </label>
              <label className={styles.toggleControl}>
                <input
                  checked={songSheetSettings.showTranslation}
                  disabled={isSavingSongSheetSettings}
                  onChange={(event) => {
                    void setSongSheetSettings({
                      showTranslation: event.target.checked,
                    });
                  }}
                  type="checkbox"
                />
                <span>Translation</span>
              </label>
            </div>
          ) : null}

          <div className={styles.saveCluster} aria-live="polite">
            {shouldShowSaveState(reviewSaveState) ? (
              <span
                className={
                  reviewSaveState === "error"
                    ? styles.saveStateError
                    : styles.saveStateText
                }
              >
                {saveStateLabel(reviewSaveState, hasLocalDraft)}
              </span>
            ) : null}
            {canSaveReviewEdits || reviewSaveState === "saving" ? (
              <button
                className={styles.primaryButton}
                disabled={!canSaveReviewEdits}
                onClick={onSaveReviewEdits}
                type="button"
              >
                {reviewSaveState === "saving" ? "Saving..." : "Save edits"}
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <div className={styles.workbenchStatus}>
        <span>
          {lineCards.length} lines
          {lineCards.length > 0 ? ` / ${reviewedCount} reviewed` : ""}
        </span>
        <span>{statusLabel(draft.status)}</span>
      </div>

      {updateError ? (
        <p className={styles.warning} role="status">
          {updateError}
        </p>
      ) : null}

      {reviewSaveError ? (
        <p className={styles.error} role="status">
          {reviewSaveError}
        </p>
      ) : null}

      {mode !== "editor" ? (
        <SongSheet
          layoutMode={layoutModeForReadingMode(mode)}
          lineCards={lineCards}
          onEditLine={editLine}
          originalTextSize={songSheetSettings.originalTextSize}
          showRomaji={songSheetSettings.showRomaji}
          showTranslation={songSheetSettings.showTranslation}
        />
      ) : (
        <div className={styles.reviewMode}>
          <aside
            className={styles.reviewRail}
            aria-label="Generated lyric lines"
          >
            <div className={styles.reviewRailHeader}>
              <strong>{needsReviewCount} need review</strong>
              <span>{selectedIndex + 1} of {lineCards.length}</span>
            </div>
            {draft.generationError ? (
              <p className={styles.error} role="status">
                {draft.generationError}
              </p>
            ) : null}
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
          </aside>

          <div className={styles.reviewEditorSlot}>
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
              <section
                className={styles.emptyWorkbench}
                aria-labelledby="pending-title"
              >
                <div className={styles.emptyWorkbenchInner}>
                  <h2 id="pending-title">No reviewable line cards are available.</h2>
                  <p>
                    This artifact exists, but no structured lyric cards were
                    returned.
                  </p>
                </div>
              </section>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

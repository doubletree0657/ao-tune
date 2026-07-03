import type { FormEvent } from "react";

import type { SongRequest } from "./types";
import styles from "../workspace.module.css";

type AgentRequestFormProps = {
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  onCancel: () => void;
  onFieldChange: (field: keyof SongRequest, value: string) => void;
  onSubmit: () => Promise<void>;
  request: SongRequest;
};

export default function AgentRequestForm({
  error,
  isLoading,
  isSuccess,
  onCancel,
  onFieldChange,
  onSubmit,
  request,
}: AgentRequestFormProps) {
  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLoading) {
      void onSubmit();
    }
  }

  return (
    <form
      aria-busy={isLoading}
      className={styles.requestForm}
      onSubmit={submitForm}
    >
      <div className={styles.formGrid}>
        <div className={styles.field}>
          <label htmlFor="request-song-title">Song title</label>
          <input
            autoComplete="off"
            id="request-song-title"
            onChange={(event) => onFieldChange("songTitle", event.target.value)}
            required
            type="text"
            value={request.songTitle}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="request-artist">Artist</label>
          <input
            autoComplete="off"
            id="request-artist"
            onChange={(event) => onFieldChange("artist", event.target.value)}
            required
            type="text"
            value={request.artist}
          />
        </div>

        <div className={`${styles.field} ${styles.formWide}`}>
          <label htmlFor="request-learning-goal">Learning goal</label>
          <textarea
            id="request-learning-goal"
            onChange={(event) =>
              onFieldChange("learningGoal", event.target.value)
            }
            required
            rows={3}
            value={request.learningGoal}
          />
        </div>

        <div className={`${styles.field} ${styles.formWide}`}>
          <label htmlFor="request-lyrics-text">User-provided lyrics text</label>
          <textarea
            id="request-lyrics-text"
            lang="ja"
            onChange={(event) => onFieldChange("lyricsText", event.target.value)}
            placeholder="Paste lyrics text that you are allowed to use"
            rows={9}
            value={request.lyricsText}
          />
          <p className={styles.fieldHelp}>
            Line cards are generated only from text you provide here.
          </p>
        </div>

        <div className={`${styles.field} ${styles.formWide}`}>
          <label htmlFor="request-study-notes">Study notes</label>
          <textarea
            id="request-study-notes"
            onChange={(event) => onFieldChange("studyNotes", event.target.value)}
            placeholder="Pronunciation focus, difficult phrases, or sing-along goals"
            rows={5}
            value={request.studyNotes}
          />
          <p className={styles.fieldHelp}>
            Notes guide the draft; they are not converted into lyric line cards.
          </p>
        </div>
      </div>

      {isLoading ? (
        <p className={styles.message} role="status">
          AoTune is creating the draft. Model generation can take a little time.
        </p>
      ) : null}

      {isSuccess ? (
        <p className={styles.success} role="status">
          Draft created. Opening the new artifact...
        </p>
      ) : null}

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <div className={styles.formActions}>
        <button
          className={styles.ghostButton}
          disabled={isLoading}
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className={styles.primaryButton}
          disabled={isLoading || isSuccess}
          type="submit"
        >
          {isLoading ? (
            <>
              <span className={styles.spinner} aria-hidden="true" />
              Creating
            </>
          ) : (
            "Create artifact"
          )}
        </button>
      </div>
    </form>
  );
}

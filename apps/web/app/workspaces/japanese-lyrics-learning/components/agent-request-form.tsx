import type { FormEvent } from "react";

import type { SongRequest } from "./types";

type AgentRequestFormProps = {
  error: string | null;
  isLoading: boolean;
  onFieldChange: (field: keyof SongRequest, value: string) => void;
  onSubmit: () => Promise<void>;
  request: SongRequest;
};

export default function AgentRequestForm({
  error,
  isLoading,
  onFieldChange,
  onSubmit,
  request,
}: AgentRequestFormProps) {
  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSubmit();
  }

  return (
    <form
      aria-busy={isLoading}
      className="agent-request-form"
      onSubmit={submitForm}
    >
      <div className="agent-panel-heading">
        <div>
          <p className="artifact-kicker">Song-first request</p>
          <h3>Tell AoTune what song you want to study.</h3>
        </div>
        <span>Local only</span>
      </div>

      <p className="local-only-note">
        Lyrics text is provided by you locally and sent to the AoTune API for a
        text-based pronunciation draft. Study notes guide the agent but are not
        treated as lyric lines. Draft inputs and edits are autosaved in this
        browser only.
      </p>

      <div className="request-fields">
        <div className="draft-input">
          <label htmlFor="request-song-title">Song title</label>
          <input
            id="request-song-title"
            onChange={(event) => onFieldChange("songTitle", event.target.value)}
            required
            type="text"
            value={request.songTitle}
          />
        </div>

        <div className="draft-input">
          <label htmlFor="request-artist">Artist</label>
          <input
            id="request-artist"
            onChange={(event) => onFieldChange("artist", event.target.value)}
            required
            type="text"
            value={request.artist}
          />
        </div>

        <div className="draft-input request-field-wide">
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

        <div className="draft-input request-field-wide">
          <label htmlFor="request-lyrics-text">User-provided lyrics text</label>
          <textarea
            id="request-lyrics-text"
            lang="ja"
            onChange={(event) => onFieldChange("lyricsText", event.target.value)}
            placeholder="Paste lyrics text that you are allowed to use"
            rows={8}
            value={request.lyricsText}
          />
          <p>
            Line cards are generated only from this user-provided text and
            stored with the draft artifact.
          </p>
        </div>

        <div className="draft-input request-field-wide">
          <label htmlFor="request-study-notes">
            Study notes / listening goals
          </label>
          <textarea
            id="request-study-notes"
            onChange={(event) => onFieldChange("studyNotes", event.target.value)}
            placeholder="Add pronunciation focus, difficult phrases, or sing-along goals"
            rows={5}
            value={request.studyNotes}
          />
          <p>
            These notes guide emphasis and review focus. They are not converted
            into lyric line cards.
          </p>
        </div>
      </div>

      {error ? (
        <p className="agent-error" role="alert">
          {error}
        </p>
      ) : null}

      <button className="agent-draft-button" disabled={isLoading} type="submit">
        {isLoading ? "Creating draft..." : "Create agent draft"}
      </button>
    </form>
  );
}

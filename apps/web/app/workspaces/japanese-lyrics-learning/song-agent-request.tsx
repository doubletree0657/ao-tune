"use client";

import { FormEvent, useState } from "react";

type SongRequest = {
  songTitle: string;
  artist: string;
  learningGoal: string;
  lyricsOrNotes: string;
};

const defaultRequest: SongRequest = {
  songTitle: "だから僕は音楽を辞めた",
  artist: "Yorushika",
  learningGoal: "I want to learn pronunciation and sing along.",
  lyricsOrNotes: "",
};

const generatedOutputs = [
  "Romaji alignment",
  "Approximate Chinese pronunciation",
  "Line-by-line meaning",
  "Pronunciation notes",
  "Sing-along notes",
  "Review cards and learning artifacts",
];

export default function SongAgentRequest() {
  const [request, setRequest] = useState<SongRequest>(defaultRequest);
  const [draft, setDraft] = useState<SongRequest>(defaultRequest);

  function updateField(field: keyof SongRequest, value: string) {
    setRequest((current) => ({ ...current, [field]: value }));
  }

  function createDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDraft(request);
  }

  return (
    <div className="agent-workbench">
      <form className="agent-request-form" onSubmit={createDraft}>
        <div className="agent-panel-heading">
          <div>
            <p className="artifact-kicker">Song-first request</p>
            <h3>Tell AoTune what song you want to study.</h3>
          </div>
          <span>Local only</span>
        </div>

        <p className="local-only-note">
          Song metadata, lyrics, and notes are user-provided locally. Nothing is
          uploaded or saved. You may paste a privately provided excerpt for
          study, but do not commit real copyrighted lyrics to the repository.
        </p>

        <div className="request-fields">
          <div className="draft-input">
            <label htmlFor="request-song-title">Song title</label>
            <input
              id="request-song-title"
              onChange={(event) => updateField("songTitle", event.target.value)}
              required
              type="text"
              value={request.songTitle}
            />
          </div>

          <div className="draft-input">
            <label htmlFor="request-artist">Artist</label>
            <input
              id="request-artist"
              onChange={(event) => updateField("artist", event.target.value)}
              required
              type="text"
              value={request.artist}
            />
          </div>

          <div className="draft-input request-field-wide">
            <label htmlFor="request-learning-goal">Learning goal</label>
            <textarea
              id="request-learning-goal"
              onChange={(event) => updateField("learningGoal", event.target.value)}
              required
              rows={3}
              value={request.learningGoal}
            />
          </div>

          <div className="draft-input request-field-wide">
            <label htmlFor="request-lyrics-notes">
              Optional user-provided lyrics or notes
            </label>
            <textarea
              id="request-lyrics-notes"
              onChange={(event) => updateField("lyricsOrNotes", event.target.value)}
              placeholder="Paste your own study excerpt or add listening notes"
              rows={8}
              value={request.lyricsOrNotes}
            />
            <p>This content remains in browser state and clears on refresh.</p>
          </div>
        </div>

        <button className="agent-draft-button" type="submit">
          Create agent draft
        </button>
      </form>

      <AgentDraftArtifact draft={draft} />
    </div>
  );
}

function AgentDraftArtifact({ draft }: { draft: SongRequest }) {
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
        <span>Awaiting agent</span>
      </div>

      <div className="agent-request-summary">
        <div>
          <h4>Learning goal</h4>
          <p>{draft.learningGoal.trim() || "No learning goal provided."}</p>
        </div>
        {draft.lyricsOrNotes.trim() ? (
          <div>
            <h4>User-provided lyrics or notes</h4>
            <p className="user-context">{draft.lyricsOrNotes}</p>
          </div>
        ) : (
          <div>
            <h4>User-provided lyrics or notes</h4>
            <p className="field-empty">No optional context added.</p>
          </div>
        )}
      </div>

      <div className="pending-output-section">
        <div className="pending-output-heading">
          <h4>Future generated study material</h4>
          <p>Generated fields are placeholders until the agent workflow is connected.</p>
        </div>
        <ul className="pending-output-list">
          {generatedOutputs.map((output) => (
            <li key={output}>
              <span>{output}</span>
              <strong>Pending agent generation</strong>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

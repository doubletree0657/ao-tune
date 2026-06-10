"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import { createLyricsLearningDraft } from "@/lib/api";
import type {
  GeneratedSection,
  LyricsLearningDraft,
  LyricsLearningDraftRequest,
} from "@/lib/api";

type SongRequest = Required<LyricsLearningDraftRequest>;

const defaultRequest: SongRequest = {
  songTitle: "だから僕は音楽を辞めた",
  artist: "Yorushika",
  learningGoal: "I want to learn pronunciation and sing along.",
  lyricsOrNotes: "",
};

const pendingSections: GeneratedSection[] = [
  ["romaji_alignment", "Romaji alignment"],
  ["chinese_pronunciation", "Approximate Chinese pronunciation"],
  ["line_by_line_meaning", "Line-by-line meaning"],
  ["pronunciation_notes", "Pronunciation notes"],
  ["sing_along_notes", "Sing-along notes"],
  ["review_cards", "Review cards and learning artifacts"],
].map(([key, label]) => ({
  key,
  label,
  status: "pending",
  value: "Pending agent generation",
}));

const initialArtifact: LyricsLearningDraft = {
  id: "local-preview",
  songTitle: defaultRequest.songTitle,
  artist: defaultRequest.artist,
  learningGoal: defaultRequest.learningGoal,
  sourceType: "user_provided",
  status: "pending_agent_generation",
  userContext: null,
  generatedSections: pendingSections,
  providerMetadata: {
    provider: "fake",
    model: null,
    profile: "default",
    mode: "pending_agent_generation",
  },
};

export default function SongAgentRequest() {
  const [request, setRequest] = useState<SongRequest>(defaultRequest);
  const [draft, setDraft] = useState<LyricsLearningDraft>(initialArtifact);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField(field: keyof SongRequest, value: string) {
    setRequest((current) => ({ ...current, [field]: value }));
  }

  async function createDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await createLyricsLearningDraft({
        ...request,
        lyricsOrNotes: request.lyricsOrNotes.trim() || undefined,
      });
      setDraft(response);
    } catch {
      setError(
        "AoTune could not create the draft. Check that the local API is running, then try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="agent-workbench">
      <form
        aria-busy={isLoading}
        className="agent-request-form"
        onSubmit={createDraft}
      >
        <div className="agent-panel-heading">
          <div>
            <p className="artifact-kicker">Song-first request</p>
            <h3>Tell AoTune what song you want to study.</h3>
          </div>
          <span>Local only</span>
        </div>

        <p className="local-only-note">
          Song metadata, lyrics, and notes are user-provided locally and sent
          only to the local AoTune API. Nothing is persisted. You may paste a
          privately provided excerpt for study, but do not commit real
          copyrighted lyrics to the repository.
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
            <p>This content is sent to the local API and is not persisted.</p>
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

      <AgentDraftArtifact draft={draft} />
    </div>
  );
}

function AgentDraftArtifact({ draft }: { draft: LyricsLearningDraft }) {
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
          {draft.id === "local-preview" ? "Local preview" : "Awaiting agent"}
        </span>
      </div>

      <div className="agent-request-summary">
        <div>
          <h4>Learning goal</h4>
          <p>{draft.learningGoal}</p>
        </div>
        {draft.userContext ? (
          <div>
            <h4>User-provided lyrics or notes</h4>
            <p className="user-context">{draft.userContext}</p>
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
          <p>
            Generated fields are placeholders until the agent workflow is
            connected.
          </p>
        </div>
        <ul className="pending-output-list">
          {draft.generatedSections.map((section) => (
            <li key={section.key}>
              <span>{section.label}</span>
              <strong>{section.value}</strong>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

import type { LyricsLearningDraft, LyricsLineCard } from "@/lib/api";

import GeneratedLearningArtifact from "./generated-learning-artifact";
import ProviderNotice from "./provider-notice";
import TextPreview from "./text-preview";

type AgentDraftArtifactProps = {
  draft: LyricsLearningDraft;
  lineCards: LyricsLineCard[];
  onLineCardsChange: (lineCards: LyricsLineCard[]) => void;
};

export default function AgentDraftArtifact({
  draft,
  lineCards,
  onLineCardsChange,
}: AgentDraftArtifactProps) {
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
          output={draft.agentOutput}
        />
      ) : null}

      <div className="pending-output-section">
        <div className="pending-output-heading">
          <h4>
            {draft.agentOutput
              ? "Generated study material"
              : "Draft output sections"}
          </h4>
          <p>
            {draft.agentOutput
              ? "Review and refine this text-based pronunciation draft."
              : draft.providerMetadata.provider === "fake"
                ? "The fake provider returns placeholders. Configure the backend OpenAI-compatible provider to generate text-based learning drafts."
                : "The configured provider did not return structured study material."}
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

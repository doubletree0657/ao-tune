"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import {
  createLyricsLearningDraft,
  LyricsLearningApiError,
} from "@/lib/api";
import type {
  GeneratedSection,
  LyricsLearningDraft,
  LyricsLearningDraftRequest,
  LyricsLineCard,
} from "@/lib/api";

type SongRequest = Required<LyricsLearningDraftRequest>;

const defaultRequest: SongRequest = {
  songTitle: "だから僕は音楽を辞めた",
  artist: "Yorushika",
  learningGoal: "I want to learn pronunciation and sing along.",
  lyricsText: "",
  studyNotes: "",
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
  lyricsText: null,
  studyNotes: null,
  userContext: null,
  generatedSections: pendingSections,
  providerMetadata: {
    provider: "fake",
    model: null,
    profile: "default",
    mode: "pending_agent_generation",
  },
  agentOutput: null,
  generationError: null,
};

export default function SongAgentRequest() {
  const [request, setRequest] = useState<SongRequest>(defaultRequest);
  const [draft, setDraft] = useState<LyricsLearningDraft>(initialArtifact);
  const [editableLineCards, setEditableLineCards] = useState<LyricsLineCard[]>([]);
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
        lyricsText: request.lyricsText.trim() || undefined,
        studyNotes: request.studyNotes.trim() || undefined,
      });
      setDraft(response);
      setEditableLineCards(
        response.agentOutput?.lineCards.map((card) => ({
          ...card,
          pronunciationNotes: [...card.pronunciationNotes],
          singAlongNotes: [...card.singAlongNotes],
        })) ?? [],
      );
    } catch (requestError) {
      if (requestError instanceof LyricsLearningApiError) {
        setError(requestError.message);
      } else {
        setError(
          "AoTune could not reach the local API. Check that it is running at the configured API address, then try again.",
        );
      }
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
          Lyrics text is provided by you locally and sent to the AoTune API for
          a text-based pronunciation draft. Study notes guide the agent but are
          not treated as lyric lines. Nothing is persisted.
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
            <label htmlFor="request-lyrics-text">
              User-provided lyrics text
            </label>
            <textarea
              id="request-lyrics-text"
              lang="ja"
              onChange={(event) => updateField("lyricsText", event.target.value)}
              placeholder="Paste lyrics text that you are allowed to use"
              rows={8}
              value={request.lyricsText}
            />
            <p>
              Line cards are generated only from this user-provided text. It is
              sent to the local API and is not persisted.
            </p>
          </div>

          <div className="draft-input request-field-wide">
            <label htmlFor="request-study-notes">
              Study notes / listening goals
            </label>
            <textarea
              id="request-study-notes"
              onChange={(event) => updateField("studyNotes", event.target.value)}
              placeholder="Add pronunciation focus, difficult phrases, or sing-along goals"
              rows={5}
              value={request.studyNotes}
            />
            <p>
              These notes guide emphasis and review focus. They are not
              converted into lyric line cards.
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

      <AgentDraftArtifact
        draft={draft}
        lineCards={editableLineCards}
        onLineCardsChange={setEditableLineCards}
      />
    </div>
  );
}

function AgentDraftArtifact({
  draft,
  lineCards,
  onLineCardsChange,
}: {
  draft: LyricsLearningDraft;
  lineCards: LyricsLineCard[];
  onLineCardsChange: (lineCards: LyricsLineCard[]) => void;
}) {
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

function GeneratedLearningArtifact({
  lineCards,
  onLineCardsChange,
  output,
}: {
  lineCards: LyricsLineCard[];
  onLineCardsChange: (lineCards: LyricsLineCard[]) => void;
  output: NonNullable<LyricsLearningDraft["agentOutput"]>;
}) {
  const reviewedCount = lineCards.filter((card) => !card.needsReview).length;
  const needsReviewCount = lineCards.length - reviewedCount;

  function updateLineCard(
    cardIndex: number,
    update: Partial<LyricsLineCard>,
  ) {
    onLineCardsChange(
      lineCards.map((card, index) =>
        index === cardIndex ? { ...card, ...update } : card,
      ),
    );
  }

  return (
    <section className="generated-learning" aria-labelledby="line-cards-heading">
      <div className="pending-output-heading">
        <h4 id="line-cards-heading">Line cards</h4>
        <p>Review the generated draft before saving it as an artifact.</p>
      </div>

      {lineCards.length > 0 ? (
        <>
          <ReviewSummary
            needsReviewCount={needsReviewCount}
            reviewedCount={reviewedCount}
            totalCount={lineCards.length}
          />
          <p className="local-edit-note">
            Original text stays read-only; generated learning fields are
            editable. Edits are local until artifact persistence is implemented.
          </p>
          <ol className="lyrics-line-list">
            {lineCards.map((card, cardIndex) => (
              <li key={`${card.lineNumber}-${card.originalText}`}>
                <div className="lyrics-line-heading">
                  <div>
                    <span>Line {card.lineNumber}</span>
                    <small>AI draft</small>
                  </div>
                  <strong
                    className={
                      card.needsReview ? "status-review" : "status-reviewed"
                    }
                  >
                    {card.needsReview ? "Needs review" : "Reviewed"}
                  </strong>
                </div>
                <div className="lyrics-original-block">
                  <span>Original text - read-only</span>
                  <p className="lyrics-original" lang="ja">
                    {card.originalText}
                  </p>
                </div>
                <div className="lyrics-line-edit-fields">
                  <EditableLearningField
                    id={`line-${cardIndex}-romaji`}
                    label="Romaji"
                    onChange={(value) =>
                      updateLineCard(cardIndex, { romaji: value })
                    }
                    value={card.romaji}
                  />
                  <EditableLearningField
                    id={`line-${cardIndex}-chinese-pronunciation`}
                    label="Approximate Chinese pronunciation"
                    onChange={(value) =>
                      updateLineCard(cardIndex, {
                        approximateChinesePronunciation: value,
                      })
                    }
                    value={card.approximateChinesePronunciation}
                  />
                  <EditableLearningField
                    id={`line-${cardIndex}-meaning`}
                    label="Meaning"
                    onChange={(value) =>
                      updateLineCard(cardIndex, { meaning: value })
                    }
                    value={card.meaning}
                  />
                  <EditableNotesField
                    id={`line-${cardIndex}-pronunciation-notes`}
                    label="Pronunciation notes"
                    onChange={(value) =>
                      updateLineCard(cardIndex, { pronunciationNotes: value })
                    }
                    value={card.pronunciationNotes}
                  />
                  <EditableNotesField
                    id={`line-${cardIndex}-sing-along-notes`}
                    label="Sing-along notes"
                    onChange={(value) =>
                      updateLineCard(cardIndex, { singAlongNotes: value })
                    }
                    value={card.singAlongNotes}
                  />
                </div>
                <div className="line-review-actions">
                  <span>
                    Confidence:{" "}
                    {card.confidence === null
                      ? "Not generated"
                      : `${Math.round(card.confidence * 100)}%`}
                  </span>
                  <button
                    onClick={() =>
                      updateLineCard(cardIndex, {
                        needsReview: !card.needsReview,
                      })
                    }
                    type="button"
                  >
                    {card.needsReview ? "Mark reviewed" : "Mark needs review"}
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p className="field-empty">
          No line cards were generated. Add user-provided lyrics text to create
          them; study notes are context only.
        </p>
      )}

      {output.reviewCards.length > 0 ? (
        <div className="review-prompts">
          <h4>Review cards</h4>
          <ul>
            {output.reviewCards.map((card) => (
              <li key={card}>{card}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function ReviewSummary({
  needsReviewCount,
  reviewedCount,
  totalCount,
}: {
  needsReviewCount: number;
  reviewedCount: number;
  totalCount: number;
}) {
  return (
    <aside
      aria-labelledby="review-summary-heading"
      aria-live="polite"
      className="review-summary"
    >
      <div>
        <h5 id="review-summary-heading">Review summary</h5>
        <p>Track the local review state of this generated draft.</p>
      </div>
      <dl>
        <div>
          <dt>Total line cards</dt>
          <dd>{totalCount}</dd>
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
    </aside>
  );
}

function EditableLearningField({
  id,
  label,
  onChange,
  value,
}: {
  id: string;
  label: string;
  onChange: (value: string | null) => void;
  value: string | null;
}) {
  return (
    <div className="line-edit-field">
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        onChange={(event) => onChange(event.target.value || null)}
        placeholder="Not generated"
        rows={3}
        value={value ?? ""}
      />
    </div>
  );
}

function EditableNotesField({
  id,
  label,
  onChange,
  value,
}: {
  id: string;
  label: string;
  onChange: (value: string[]) => void;
  value: string[];
}) {
  return (
    <div className="line-edit-field">
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        onChange={(event) =>
          onChange(event.target.value ? event.target.value.split("\n") : [])
        }
        placeholder="Add one note per line"
        rows={4}
        value={value.join("\n")}
      />
      <p>One note per line.</p>
    </div>
  );
}

function ProviderNotice({ draft }: { draft: LyricsLearningDraft }) {
  if (draft.id === "local-preview") {
    return null;
  }

  const isFake = draft.providerMetadata.provider === "fake";
  return (
    <div className={`provider-notice ${isFake ? "provider-fake" : "provider-real"}`}>
      <strong>{isFake ? "Fake provider placeholder" : "OpenAI-compatible draft"}</strong>
      <span>
        {isFake
          ? "No model generation ran. The sections below show pending placeholders."
          : `Generated through the backend provider${draft.providerMetadata.model ? ` using ${draft.providerMetadata.model}` : ""}.`}
      </span>
    </div>
  );
}

function TextPreview({
  emptyText,
  label,
  text,
}: {
  emptyText: string;
  label: string;
  text: string | null;
}) {
  if (!text) {
    return (
      <div>
        <h4>{label}</h4>
        <p className="field-empty">{emptyText}</p>
      </div>
    );
  }

  const lines = text.split(/\r?\n/);
  const linePreview = lines.slice(0, 4).join("\n");
  const preview = linePreview.slice(0, 320);
  const isTruncated = lines.length > 4 || linePreview.length > 320;

  return (
    <div>
      <h4>{label}</h4>
      <p className="user-context">{preview}</p>
      <p className="context-count">
        {text.length.toLocaleString()} characters
        {isTruncated ? "; preview shortened" : ""}
      </p>
    </div>
  );
}

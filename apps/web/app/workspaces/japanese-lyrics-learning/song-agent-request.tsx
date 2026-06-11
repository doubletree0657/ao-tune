"use client";

import { useState } from "react";

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

import AgentDraftArtifact from "./components/agent-draft-artifact";
import AgentRequestForm from "./components/agent-request-form";
import type { SongRequest } from "./components/types";

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

function cloneLineCards(draft: LyricsLearningDraft): LyricsLineCard[] {
  return (
    draft.agentOutput?.lineCards.map((card) => ({
      ...card,
      pronunciationNotes: [...card.pronunciationNotes],
      singAlongNotes: [...card.singAlongNotes],
    })) ?? []
  );
}

export default function SongAgentRequest() {
  const [request, setRequest] = useState<SongRequest>(defaultRequest);
  const [draft, setDraft] = useState<LyricsLearningDraft>(initialArtifact);
  const [editableLineCards, setEditableLineCards] = useState<LyricsLineCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField(field: keyof SongRequest, value: string) {
    setRequest((current) => ({ ...current, [field]: value }));
  }

  async function createDraft() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await createLyricsLearningDraft({
        ...request,
        lyricsText: request.lyricsText.trim() || undefined,
        studyNotes: request.studyNotes.trim() || undefined,
      } satisfies LyricsLearningDraftRequest);
      setDraft(response);
      setEditableLineCards(cloneLineCards(response));
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
      <AgentRequestForm
        error={error}
        isLoading={isLoading}
        onFieldChange={updateField}
        onSubmit={createDraft}
        request={request}
      />
      <AgentDraftArtifact
        draft={draft}
        lineCards={editableLineCards}
        onLineCardsChange={setEditableLineCards}
      />
    </div>
  );
}

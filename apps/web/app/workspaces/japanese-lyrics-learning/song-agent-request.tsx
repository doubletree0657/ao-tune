"use client";

import { useEffect, useState } from "react";

import {
  createLyricsLearningDraft,
  LyricsLearningApiError,
  updateLyricsLearningDraft,
} from "@/lib/api";
import type {
  GeneratedSection,
  LyricsLearningDraft,
  LyricsLearningDraftRequest,
  LyricsLearningDraftUpdateRequest,
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

const localDraftStorageKey = "aotune.japanese-lyrics-learning.draft.v1";

type ReviewSaveState = "clean" | "unsaved" | "saving" | "saved" | "error";

type LocalDraft = {
  version: 1;
  request: SongRequest;
  draft: LyricsLearningDraft;
  lineCards: LyricsLineCard[];
  selectedLineIndex: number;
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

function lineCardsUpdateRequest(
  lineCards: LyricsLineCard[],
): LyricsLearningDraftUpdateRequest {
  return {
    lineCards: lineCards.map((card) => ({
      lineNumber: card.lineNumber,
      romaji: card.romaji,
      approximateChinesePronunciation: card.approximateChinesePronunciation,
      meaning: card.meaning,
      pronunciationNotes: card.pronunciationNotes,
      singAlongNotes: card.singAlongNotes,
      needsReview: card.needsReview,
    })),
  };
}

function readLocalDraft(): LocalDraft | null {
  try {
    const storedValue = window.localStorage.getItem(localDraftStorageKey);
    if (!storedValue) {
      return null;
    }

    const parsed = JSON.parse(storedValue) as Partial<LocalDraft>;
    if (
      parsed.version !== 1 ||
      !parsed.request ||
      !parsed.draft ||
      !Array.isArray(parsed.lineCards) ||
      typeof parsed.selectedLineIndex !== "number"
    ) {
      return null;
    }

    return parsed as LocalDraft;
  } catch {
    return null;
  }
}

function requestHasLocalChanges(request: SongRequest) {
  return (Object.keys(defaultRequest) as (keyof SongRequest)[]).some(
    (field) => request[field] !== defaultRequest[field],
  );
}

export default function SongAgentRequest() {
  const [request, setRequest] = useState<SongRequest>(defaultRequest);
  const [draft, setDraft] = useState<LyricsLearningDraft>(initialArtifact);
  const [editableLineCards, setEditableLineCards] = useState<LyricsLineCard[]>([]);
  const [selectedLineIndex, setSelectedLineIndex] = useState(0);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [hasLocalDraft, setHasLocalDraft] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewSaveState, setReviewSaveState] =
    useState<ReviewSaveState>("clean");
  const [reviewSaveError, setReviewSaveError] = useState<string | null>(null);

  useEffect(() => {
    const localDraft = readLocalDraft();
    if (localDraft) {
      setRequest(localDraft.request);
      setDraft(localDraft.draft);
      setEditableLineCards(localDraft.lineCards);
      setSelectedLineIndex(
        Math.min(
          Math.max(localDraft.selectedLineIndex, 0),
          Math.max(localDraft.lineCards.length - 1, 0),
        ),
      );
      setHasLocalDraft(true);
      setReviewSaveState(localDraft.draft.agentOutput ? "unsaved" : "clean");
    }
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    const hasUnsavedRequest =
      draft.id === initialArtifact.id && requestHasLocalChanges(request);
    const hasUnsavedReviewEdits =
      reviewSaveState === "unsaved" || reviewSaveState === "error";

    if (!hasUnsavedRequest && !hasUnsavedReviewEdits) {
      try {
        window.localStorage.removeItem(localDraftStorageKey);
      } catch {
        // Local recovery is optional.
      }
      setHasLocalDraft(false);
      return;
    }

    const localDraft: LocalDraft = {
      version: 1,
      request,
      draft,
      lineCards: editableLineCards,
      selectedLineIndex,
    };
    try {
      window.localStorage.setItem(
        localDraftStorageKey,
        JSON.stringify(localDraft),
      );
      setHasLocalDraft(true);
    } catch {
      setHasLocalDraft(false);
    }
  }, [
    draft,
    editableLineCards,
    hasHydrated,
    request,
    reviewSaveState,
    selectedLineIndex,
  ]);

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
      setSelectedLineIndex(0);
      setReviewSaveState("clean");
      setReviewSaveError(null);
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

  function updateLineCards(lineCards: LyricsLineCard[]) {
    setEditableLineCards(lineCards);
    setReviewSaveState("unsaved");
    setReviewSaveError(null);
  }

  async function saveReviewEdits() {
    if (draft.id === initialArtifact.id || !draft.agentOutput) {
      return;
    }

    setReviewSaveState("saving");
    setReviewSaveError(null);

    try {
      const response = await updateLyricsLearningDraft(
        draft.id,
        lineCardsUpdateRequest(editableLineCards),
      );
      const responseLineCards = cloneLineCards(response);
      setDraft(response);
      setEditableLineCards(responseLineCards);
      setSelectedLineIndex((currentIndex) =>
        Math.min(
          Math.max(currentIndex, 0),
          Math.max(responseLineCards.length - 1, 0),
        ),
      );
      setReviewSaveState("saved");
    } catch (requestError) {
      setReviewSaveState("error");
      if (requestError instanceof LyricsLearningApiError) {
        setReviewSaveError(requestError.message);
      } else {
        setReviewSaveError(
          "AoTune could not save the review edits. Check the local API and try again.",
        );
      }
    }
  }

  function clearLocalDraft() {
    try {
      window.localStorage.removeItem(localDraftStorageKey);
    } catch {
      // Reset the in-memory draft even when browser storage is unavailable.
    }
    setRequest(defaultRequest);
    setDraft(initialArtifact);
    setEditableLineCards([]);
    setSelectedLineIndex(0);
    setHasLocalDraft(false);
    setError(null);
    setReviewSaveState("clean");
    setReviewSaveError(null);
  }

  return (
    <div
      className={`agent-workbench${draft.agentOutput ? " has-generated-artifact" : ""}`}
    >
      <AgentRequestForm
        error={error}
        isLoading={isLoading}
        onFieldChange={updateField}
        onSubmit={createDraft}
        request={request}
      />
      <AgentDraftArtifact
        draft={draft}
        hasLocalDraft={hasLocalDraft}
        lineCards={editableLineCards}
        onClearLocalDraft={clearLocalDraft}
        onLineCardsChange={updateLineCards}
        onSaveReviewEdits={saveReviewEdits}
        onSelectedLineIndexChange={setSelectedLineIndex}
        reviewSaveError={reviewSaveError}
        reviewSaveState={reviewSaveState}
        selectedLineIndex={selectedLineIndex}
      />
    </div>
  );
}

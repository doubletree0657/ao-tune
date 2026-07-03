"use client";

import { useEffect, useState } from "react";

import {
  createLyricsLearningDraft,
  getLyricsLearningDraft,
  listLyricsLearningDrafts,
  LyricsLearningApiError,
  updateLyricsLearningDraft,
} from "@/lib/api";
import type {
  GeneratedSection,
  LyricsLearningDraft,
  LyricsLearningDraftRequest,
  LyricsLearningDraftSummary,
  LyricsLearningDraftUpdateRequest,
  LyricsLineCard,
} from "@/lib/api";

import AgentDraftArtifact from "./components/agent-draft-artifact";
import AgentRequestForm from "./components/agent-request-form";
import ArtifactLibrary from "./components/artifact-library";
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
const newArtifactWorkspaceKey = "new-artifact";

type ReviewSaveState = "clean" | "unsaved" | "saving" | "saved" | "error";

type LocalDraft = {
  version: 2;
  workspaceKey: string;
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

function requestFromDraft(draft: LyricsLearningDraft): SongRequest {
  return {
    songTitle: draft.songTitle,
    artist: draft.artist,
    learningGoal: draft.learningGoal,
    lyricsText: draft.lyricsText ?? "",
    studyNotes: draft.studyNotes ?? "",
  };
}

function workspaceKeyForDraft(draft: LyricsLearningDraft) {
  return draft.id === initialArtifact.id ? newArtifactWorkspaceKey : draft.id;
}

function readLocalDraft(): LocalDraft | null {
  try {
    const storedValue = window.localStorage.getItem(localDraftStorageKey);
    if (!storedValue) {
      return null;
    }

    const parsed = JSON.parse(storedValue) as Partial<LocalDraft>;
    if (
      parsed.version !== 2 ||
      !parsed.workspaceKey ||
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

function requestHasUnsavedChanges(
  request: SongRequest,
  draft: LyricsLearningDraft,
) {
  if (draft.id === initialArtifact.id) {
    return requestHasLocalChanges(request);
  }

  const serverRequest = requestFromDraft(draft);
  return (Object.keys(defaultRequest) as (keyof SongRequest)[]).some(
    (field) => request[field] !== serverRequest[field],
  );
}

function reviewHasUnsavedChanges(reviewSaveState: ReviewSaveState) {
  return reviewSaveState === "unsaved" || reviewSaveState === "error";
}

export default function SongAgentRequest() {
  const [request, setRequest] = useState<SongRequest>(defaultRequest);
  const [createRequest, setCreateRequest] =
    useState<SongRequest>(defaultRequest);
  const [draft, setDraft] = useState<LyricsLearningDraft>(initialArtifact);
  const [editableLineCards, setEditableLineCards] = useState<LyricsLineCard[]>([]);
  const [selectedLineIndex, setSelectedLineIndex] = useState(0);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [artifactSummaries, setArtifactSummaries] = useState<
    LyricsLearningDraftSummary[]
  >([]);
  const [isLibraryLoading, setIsLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [isArtifactLoading, setIsArtifactLoading] = useState(false);
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
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
      if (localDraft.workspaceKey === newArtifactWorkspaceKey) {
        setCreateRequest(localDraft.request);
        setIsCreatePanelOpen(true);
      } else {
        setRequest(localDraft.request);
        setDraft(localDraft.draft);
        setEditableLineCards(localDraft.lineCards);
        setSelectedDraftId(localDraft.workspaceKey);
        setSelectedLineIndex(
          Math.min(
            Math.max(localDraft.selectedLineIndex, 0),
            Math.max(localDraft.lineCards.length - 1, 0),
          ),
        );
        setReviewSaveState(localDraft.draft.agentOutput ? "unsaved" : "clean");
      }
      setHasLocalDraft(true);
    }
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    void refreshArtifactSummaries();
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    const hasUnsavedNewArtifactRequest =
      isCreatePanelOpen && requestHasLocalChanges(createRequest);
    const hasUnsavedRequest = requestHasUnsavedChanges(request, draft);
    const hasUnsavedReviewEdits = reviewHasUnsavedChanges(reviewSaveState);

    if (
      !hasUnsavedNewArtifactRequest &&
      !hasUnsavedRequest &&
      !hasUnsavedReviewEdits
    ) {
      try {
        window.localStorage.removeItem(localDraftStorageKey);
      } catch {
        // Local recovery is optional.
      }
      setHasLocalDraft(false);
      return;
    }

    const localDraft: LocalDraft = {
      version: 2,
      workspaceKey: hasUnsavedNewArtifactRequest
        ? newArtifactWorkspaceKey
        : workspaceKeyForDraft(draft),
      request: hasUnsavedNewArtifactRequest ? createRequest : request,
      draft: hasUnsavedNewArtifactRequest ? initialArtifact : draft,
      lineCards: hasUnsavedNewArtifactRequest ? [] : editableLineCards,
      selectedLineIndex: hasUnsavedNewArtifactRequest ? 0 : selectedLineIndex,
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
    createRequest,
    draft,
    editableLineCards,
    hasHydrated,
    isCreatePanelOpen,
    request,
    reviewSaveState,
    selectedLineIndex,
  ]);

  async function refreshArtifactSummaries() {
    setIsLibraryLoading(true);
    setLibraryError(null);

    try {
      setArtifactSummaries(await listLyricsLearningDrafts());
    } catch (requestError) {
      if (requestError instanceof LyricsLearningApiError) {
        setLibraryError(requestError.message);
      } else {
        setLibraryError(
          "AoTune could not load saved artifacts. Check the local API and try again.",
        );
      }
    } finally {
      setIsLibraryLoading(false);
    }
  }

  function hasUnsavedChanges() {
    return (
      requestHasUnsavedChanges(request, draft) ||
      reviewHasUnsavedChanges(reviewSaveState)
    );
  }

  function confirmDiscardUnsavedChanges(message: string) {
    if (!hasUnsavedChanges()) {
      return true;
    }
    return window.confirm(message);
  }

  function applyServerDraft(response: LyricsLearningDraft) {
    const responseLineCards = cloneLineCards(response);
    setDraft(response);
    setRequest(requestFromDraft(response));
    setEditableLineCards(responseLineCards);
    setSelectedLineIndex(0);
    setSelectedDraftId(response.id);
    setReviewSaveState("clean");
    setReviewSaveError(null);
    setError(null);
  }

  function updateCreateField(field: keyof SongRequest, value: string) {
    setCreateRequest((current) => ({ ...current, [field]: value }));
  }

  async function createDraft() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await createLyricsLearningDraft({
        ...createRequest,
        lyricsText: createRequest.lyricsText.trim() || undefined,
        studyNotes: createRequest.studyNotes.trim() || undefined,
      } satisfies LyricsLearningDraftRequest);
      applyServerDraft(response);
      setCreateRequest(defaultRequest);
      setIsCreatePanelOpen(false);
      await refreshArtifactSummaries();
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

  async function openArtifact(draftId: string) {
    if (draftId === selectedDraftId) {
      return;
    }
    if (
      !confirmDiscardUnsavedChanges(
        "Discard unsaved edits and switch to another artifact?",
      )
    ) {
      return;
    }

    setIsArtifactLoading(true);
    setLibraryError(null);

    try {
      applyServerDraft(await getLyricsLearningDraft(draftId));
    } catch (requestError) {
      if (requestError instanceof LyricsLearningApiError) {
        setLibraryError(requestError.message);
      } else {
        setLibraryError(
          "AoTune could not open the selected artifact. Check the local API and try again.",
        );
      }
    } finally {
      setIsArtifactLoading(false);
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
      setRequest(requestFromDraft(response));
      setEditableLineCards(responseLineCards);
      setSelectedDraftId(response.id);
      setSelectedLineIndex((currentIndex) =>
        Math.min(
          Math.max(currentIndex, 0),
          Math.max(responseLineCards.length - 1, 0),
        ),
      );
      setReviewSaveState("saved");
      await refreshArtifactSummaries();
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

  function openCreatePanel() {
    if (
      !confirmDiscardUnsavedChanges(
        "Discard unsaved edits before creating a new artifact?",
      )
    ) {
      return;
    }
    setCreateRequest(defaultRequest);
    setError(null);
    setIsCreatePanelOpen(true);
  }

  function closeCreatePanel() {
    if (isLoading) {
      return;
    }
    if (
      requestHasLocalChanges(createRequest) &&
      !window.confirm("Discard the new artifact draft?")
    ) {
      return;
    }
    setCreateRequest(defaultRequest);
    setError(null);
    setIsCreatePanelOpen(false);
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
    setSelectedDraftId(null);
    setHasLocalDraft(false);
    setError(null);
    setReviewSaveState("clean");
    setReviewSaveError(null);
  }

  const hasSelectedArtifact =
    selectedDraftId !== null && draft.id !== initialArtifact.id;

  return (
    <>
      <div className="lyrics-workspace-shell">
        <ArtifactLibrary
          error={libraryError}
          isLoading={isLibraryLoading || isArtifactLoading}
          onNewArtifact={openCreatePanel}
          onRefresh={refreshArtifactSummaries}
          onSelectArtifact={openArtifact}
          selectedDraftId={selectedDraftId}
          summaries={artifactSummaries}
        />
        <section className="workspace-workbench" aria-label="Selected artifact">
          {hasSelectedArtifact ? (
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
          ) : (
            <div className="workbench-empty">
              <p className="artifact-kicker">Workbench</p>
              <h2>Select a saved artifact</h2>
              <p>
                Choose a draft from the library to review line cards, update
                pronunciation notes, and save changes. Use New artifact when you
                want to generate a fresh draft from user-provided lyrics.
              </p>
            </div>
          )}
        </section>
      </div>

      {isCreatePanelOpen ? (
        <div
          aria-labelledby="create-artifact-title"
          aria-modal="true"
          className="creation-overlay"
          role="dialog"
        >
          <div className="creation-panel">
            <div className="creation-panel-header">
              <div>
                <p className="artifact-kicker">New artifact</p>
                <h2 id="create-artifact-title">Create a lyrics learning draft</h2>
              </div>
              <button
                aria-label="Close new artifact panel"
                disabled={isLoading}
                onClick={closeCreatePanel}
                type="button"
              >
                Close
              </button>
            </div>
            <AgentRequestForm
              error={error}
              isLoading={isLoading}
              onFieldChange={updateCreateField}
              onSubmit={createDraft}
              request={createRequest}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

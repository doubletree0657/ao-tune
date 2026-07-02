export type LyricsLearningDraftRequest = {
  songTitle: string;
  artist: string;
  learningGoal: string;
  lyricsText?: string;
  studyNotes?: string;
};

export type GeneratedSection = {
  key: string;
  label: string;
  status: "pending" | "generated" | "needs_review";
  value: string;
};

export type LyricsLineCard = {
  lineNumber: number;
  originalText: string;
  romaji: string | null;
  approximateChinesePronunciation: string | null;
  meaning: string | null;
  pronunciationNotes: string[];
  singAlongNotes: string[];
  confidence: number | null;
  needsReview: boolean;
};

export type LyricsLineCardUpdate = Pick<
  LyricsLineCard,
  | "lineNumber"
  | "romaji"
  | "approximateChinesePronunciation"
  | "meaning"
  | "pronunciationNotes"
  | "singAlongNotes"
  | "needsReview"
>;

export type LyricsLearningDraftUpdateRequest = {
  lineCards: LyricsLineCardUpdate[];
};

export type LyricsLearningAgentOutput = {
  lineCards: LyricsLineCard[];
  pronunciationNotes: string[];
  singAlongNotes: string[];
  reviewCards: string[];
};

export type ProviderMetadata = {
  provider: string;
  model: string | null;
  profile: string;
  mode: string;
};

export type LyricsLearningDraft = {
  id: string;
  songTitle: string;
  artist: string;
  learningGoal: string;
  sourceType: "user_provided";
  status: "pending_agent_generation" | "generated" | "needs_review";
  lyricsText: string | null;
  studyNotes: string | null;
  userContext: string | null;
  generatedSections: GeneratedSection[];
  providerMetadata: ProviderMetadata;
  agentOutput: LyricsLearningAgentOutput | null;
  generationError: string | null;
};

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:8000";

export class LyricsLearningApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "LyricsLearningApiError";
  }
}

async function getApiErrorMessage(response: Response): Promise<string> {
  const fallback = `AoTune API returned status ${response.status}.`;

  try {
    const payload = (await response.json()) as unknown;
    if (
      typeof payload === "object" &&
      payload !== null &&
      "detail" in payload
    ) {
      const detail = payload.detail;
      if (typeof detail === "string" && detail.trim()) {
        return detail;
      }
      if (Array.isArray(detail)) {
        return "The draft request was invalid. Check the required fields and try again.";
      }
    }
  } catch {
    return fallback;
  }

  return fallback;
}

export async function createLyricsLearningDraft(
  request: LyricsLearningDraftRequest,
): Promise<LyricsLearningDraft> {
  const response = await fetch(`${apiBaseUrl}/api/lyrics-learning/drafts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new LyricsLearningApiError(
      await getApiErrorMessage(response),
      response.status,
    );
  }

  return (await response.json()) as LyricsLearningDraft;
}

export async function getLyricsLearningDraft(
  draftId: string,
): Promise<LyricsLearningDraft> {
  const response = await fetch(
    `${apiBaseUrl}/api/lyrics-learning/drafts/${draftId}`,
  );

  if (!response.ok) {
    throw new LyricsLearningApiError(
      await getApiErrorMessage(response),
      response.status,
    );
  }

  return (await response.json()) as LyricsLearningDraft;
}

export async function updateLyricsLearningDraft(
  draftId: string,
  request: LyricsLearningDraftUpdateRequest,
): Promise<LyricsLearningDraft> {
  const response = await fetch(
    `${apiBaseUrl}/api/lyrics-learning/drafts/${draftId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    },
  );

  if (!response.ok) {
    throw new LyricsLearningApiError(
      await getApiErrorMessage(response),
      response.status,
    );
  }

  return (await response.json()) as LyricsLearningDraft;
}

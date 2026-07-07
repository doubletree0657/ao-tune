export type LyricsLearningDraftRequest = {
  songTitle: string;
  artist: string;
  learningGoal: string;
  lyricsText?: string;
  studyNotes?: string;
};

export type ApplicationTheme = "light" | "black" | "midnight" | "sky";

export const applicationThemes: readonly ApplicationTheme[] = [
  "light",
  "black",
  "midnight",
  "sky",
];

export type SongSheetSettings = {
  showRomaji: boolean;
  showTranslation: boolean;
};

export type LyricsLearningSettings = {
  songSheet: SongSheetSettings;
};

export type ApplicationSettings = {
  theme: ApplicationTheme;
  lyricsLearning: LyricsLearningSettings;
  updatedAt: string;
};

export type ApplicationSettingsUpdate = {
  theme?: ApplicationTheme;
  lyricsLearning?: {
    songSheet?: Partial<SongSheetSettings>;
  };
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

export type LyricsLearningDraftSummary = {
  id: string;
  songTitle: string;
  artist: string;
  status: "pending_agent_generation" | "generated" | "needs_review";
  provider: string;
  model: string | null;
  lineCardCount: number;
  needsReviewCount: number;
  createdAt: string;
  updatedAt: string;
};

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:8000";

export class AoTuneApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AoTuneApiError";
  }
}

export class LyricsLearningApiError extends AoTuneApiError {
  constructor(message: string, status: number) {
    super(message, status);
    this.name = "LyricsLearningApiError";
  }
}

export class ApplicationSettingsApiError extends AoTuneApiError {
  constructor(message: string, status: number) {
    super(message, status);
    this.name = "ApplicationSettingsApiError";
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
        return "The request was invalid. Check the required fields and try again.";
      }
    }
  } catch {
    return fallback;
  }

  return fallback;
}

async function requestJson<T>(
  path: string,
  init: RequestInit | undefined,
  ErrorClass: new (message: string, status: number) => AoTuneApiError,
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, init);

  if (!response.ok) {
    throw new ErrorClass(await getApiErrorMessage(response), response.status);
  }

  return (await response.json()) as T;
}

export async function getApplicationSettings(): Promise<ApplicationSettings> {
  return requestJson<ApplicationSettings>(
    "/api/settings",
    undefined,
    ApplicationSettingsApiError,
  );
}

export async function updateApplicationSettings(
  update: ApplicationSettingsUpdate,
): Promise<ApplicationSettings> {
  return requestJson<ApplicationSettings>(
    "/api/settings",
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(update),
    },
    ApplicationSettingsApiError,
  );
}

export async function createLyricsLearningDraft(
  request: LyricsLearningDraftRequest,
): Promise<LyricsLearningDraft> {
  return requestJson<LyricsLearningDraft>(
    "/api/lyrics-learning/drafts",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    },
    LyricsLearningApiError,
  );
}

export async function getLyricsLearningDraft(
  draftId: string,
): Promise<LyricsLearningDraft> {
  return requestJson<LyricsLearningDraft>(
    `/api/lyrics-learning/drafts/${draftId}`,
    undefined,
    LyricsLearningApiError,
  );
}

export async function listLyricsLearningDrafts(
  limit = 50,
): Promise<LyricsLearningDraftSummary[]> {
  return requestJson<LyricsLearningDraftSummary[]>(
    `/api/lyrics-learning/drafts?limit=${limit}`,
    undefined,
    LyricsLearningApiError,
  );
}

export async function updateLyricsLearningDraft(
  draftId: string,
  request: LyricsLearningDraftUpdateRequest,
): Promise<LyricsLearningDraft> {
  return requestJson<LyricsLearningDraft>(
    `/api/lyrics-learning/drafts/${draftId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    },
    LyricsLearningApiError,
  );
}

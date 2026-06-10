export type LyricsLearningDraftRequest = {
  songTitle: string;
  artist: string;
  learningGoal: string;
  lyricsOrNotes?: string;
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
  userContext: string | null;
  generatedSections: GeneratedSection[];
  providerMetadata: ProviderMetadata;
  agentOutput: LyricsLearningAgentOutput | null;
  generationError: string | null;
};

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:8000";

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
    throw new Error(`Draft request failed with status ${response.status}.`);
  }

  return (await response.json()) as LyricsLearningDraft;
}

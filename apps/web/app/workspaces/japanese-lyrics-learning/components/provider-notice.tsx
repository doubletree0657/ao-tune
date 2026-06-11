import type { LyricsLearningDraft } from "@/lib/api";

export default function ProviderNotice({
  draft,
}: {
  draft: LyricsLearningDraft;
}) {
  if (draft.id === "local-preview") {
    return null;
  }

  const isFake = draft.providerMetadata.provider === "fake";
  return (
    <div className={`provider-notice ${isFake ? "provider-fake" : "provider-real"}`}>
      <strong>
        {isFake ? "Fake provider placeholder" : "OpenAI-compatible draft"}
      </strong>
      <span>
        {isFake
          ? "No model generation ran. The sections below show pending placeholders."
          : `Generated through the backend provider${draft.providerMetadata.model ? ` using ${draft.providerMetadata.model}` : ""}.`}
      </span>
    </div>
  );
}

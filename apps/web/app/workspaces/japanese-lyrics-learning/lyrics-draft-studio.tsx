"use client";

import { useState } from "react";

type DraftField =
  | "original"
  | "romaji"
  | "chinesePronunciation"
  | "meaning"
  | "pronunciationNotes"
  | "singAlongNotes";

type LyricsDraft = Record<DraftField, string>;

type LearningField = {
  key: DraftField;
  label: string;
  previewLabel?: string;
  placeholder: string;
  rows: number;
  lang?: string;
  note?: string;
};

const emptyDraft: LyricsDraft = {
  original: "",
  romaji: "",
  chinesePronunciation: "",
  meaning: "",
  pronunciationNotes: "",
  singAlongNotes: "",
};

const fictionalSample: LyricsDraft = {
  original: "青い風が窓辺を通る",
  romaji: "Aoi kaze ga madobe o tooru",
  chinesePronunciation: "啊哦伊 卡泽 嘎 妈多贝 哦 托哦鲁",
  meaning: "A blue breeze passes by the window.",
  pronunciationNotes:
    "Keep the vowels in aoi distinct. Let the long sound in tooru remain even and unhurried.",
  singAlongNotes:
    "Take a quiet breath before aoi. Carry the phrase forward without breaking after kaze.",
};

const fields: LearningField[] = [
  {
    key: "original",
    label: "Original Japanese line",
    previewLabel: "Original",
    placeholder: "Paste a user-provided Japanese lyric line",
    rows: 3,
    lang: "ja",
  },
  {
    key: "romaji",
    label: "Romaji",
    placeholder: "Add a romaji reading",
    rows: 2,
  },
  {
    key: "chinesePronunciation",
    label: "Approximate Chinese pronunciation",
    placeholder: "Add a personal Chinese pronunciation hint",
    rows: 2,
    note: "Use this as a personal reading aid, not a substitute for native audio.",
  },
  {
    key: "meaning",
    label: "Meaning",
    placeholder: "Write the line-by-line meaning in your own words",
    rows: 3,
  },
  {
    key: "pronunciationNotes",
    label: "Pronunciation notes",
    placeholder: "Note difficult sounds, timing, or phrasing",
    rows: 4,
  },
  {
    key: "singAlongNotes",
    label: "Sing-along notes",
    placeholder: "Note breaths, rhythm, entrances, or practice reminders",
    rows: 4,
  },
];

function hasDraftContent(draft: LyricsDraft): boolean {
  return Object.values(draft).some((value) => value.trim().length > 0);
}

export default function LyricsDraftStudio() {
  const [draft, setDraft] = useState<LyricsDraft>(emptyDraft);
  const isDrafting = hasDraftContent(draft);
  const preview = isDrafting ? draft : fictionalSample;

  function updateField(field: DraftField, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="draft-studio">
      <form className="draft-form" onSubmit={(event) => event.preventDefault()}>
        <div className="draft-form-heading">
          <div>
            <p className="artifact-kicker">Create draft card</p>
            <h3>Your study notes</h3>
          </div>
          {isDrafting ? (
            <button type="button" onClick={() => setDraft(emptyDraft)}>
              Clear draft
            </button>
          ) : null}
        </div>

        <p className="local-only-note">
          Use lyrics you provide for private study. Nothing is uploaded or saved,
          and this draft disappears when the page refreshes.
        </p>

        <div className="draft-fields">
          {fields.map((field) => (
            <div className="draft-input" key={field.key}>
              <label htmlFor={`draft-${field.key}`}>{field.label}</label>
              <textarea
                id={`draft-${field.key}`}
                lang={field.lang}
                onChange={(event) => updateField(field.key, event.target.value)}
                placeholder={field.placeholder}
                rows={field.rows}
                value={draft[field.key]}
              />
              {field.note ? <p>{field.note}</p> : null}
            </div>
          ))}
        </div>
      </form>

      <div className="draft-preview">
        <p className="preview-label">
          {isDrafting ? "Local draft preview" : "Fictional example"}
        </p>
        <LyricsLearningCard draft={preview} isDraft={isDrafting} />
      </div>
    </div>
  );
}

function LyricsLearningCard({
  draft,
  isDraft,
}: {
  draft: LyricsDraft;
  isDraft: boolean;
}) {
  return (
    <article
      className="lyrics-card"
      aria-label={isDraft ? "Local draft lyrics learning card" : "Example lyrics learning card"}
    >
      <div className="lyrics-card-header">
        <div>
          <p className="artifact-kicker">Practice line 01</p>
          <h3>{isDraft ? "Untitled draft" : "Window breeze"}</h3>
        </div>
        <span>{isDraft ? "Local only" : "Mock content"}</span>
      </div>

      <dl className="learning-fields">
        {fields.map((field) => (
          <div className="learning-field" key={field.key}>
            <dt>{field.previewLabel ?? field.label}</dt>
            <dd
              className={draft[field.key].trim() ? undefined : "field-empty"}
              lang={field.lang}
            >
              {draft[field.key].trim() || "Not added yet"}
            </dd>
            {field.note ? <p>{field.note}</p> : null}
          </div>
        ))}
      </dl>
    </article>
  );
}

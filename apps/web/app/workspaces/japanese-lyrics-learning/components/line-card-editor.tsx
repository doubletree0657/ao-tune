import type { LyricsLineCard } from "@/lib/api";

import {
  EditableLearningField,
  EditableNotesField,
} from "./editable-fields";

type LineCardEditorProps = {
  card: LyricsLineCard;
  cardIndex: number;
  onChange: (update: Partial<LyricsLineCard>) => void;
};

export default function LineCardEditor({
  card,
  cardIndex,
  onChange,
}: LineCardEditorProps) {
  return (
    <li>
      <div className="lyrics-line-heading">
        <div>
          <span>Line {card.lineNumber}</span>
          <small>AI draft</small>
        </div>
        <strong
          className={card.needsReview ? "status-review" : "status-reviewed"}
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
          onChange={(value) => onChange({ romaji: value })}
          value={card.romaji}
        />
        <EditableLearningField
          id={`line-${cardIndex}-chinese-pronunciation`}
          label="Approximate Chinese pronunciation"
          onChange={(value) =>
            onChange({ approximateChinesePronunciation: value })
          }
          value={card.approximateChinesePronunciation}
        />
        <EditableLearningField
          id={`line-${cardIndex}-meaning`}
          label="Meaning"
          onChange={(value) => onChange({ meaning: value })}
          value={card.meaning}
        />
        <EditableNotesField
          id={`line-${cardIndex}-pronunciation-notes`}
          label="Pronunciation notes"
          onChange={(value) => onChange({ pronunciationNotes: value })}
          value={card.pronunciationNotes}
        />
        <EditableNotesField
          id={`line-${cardIndex}-sing-along-notes`}
          label="Sing-along notes"
          onChange={(value) => onChange({ singAlongNotes: value })}
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
          onClick={() => onChange({ needsReview: !card.needsReview })}
          type="button"
        >
          {card.needsReview ? "Mark reviewed" : "Mark needs review"}
        </button>
      </div>
    </li>
  );
}

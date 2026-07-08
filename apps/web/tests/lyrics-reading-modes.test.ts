import assert from "node:assert/strict";
import test from "node:test";

import {
  defaultDisplaySettings,
  validateCachedSettings,
} from "../app/components/application-settings-cache";
import {
  layoutModeForReadingMode,
  modeAfterEditor,
  persistedLayoutModeForWorkspaceMode,
  readingModeForLayoutMode,
} from "../app/workspaces/japanese-lyrics-learning/components/reading-mode-logic";
import {
  lyricPhraseDisplay,
  sortedLineCards,
} from "../app/workspaces/japanese-lyrics-learning/components/song-sheet-logic";
import type { LyricsLineCard } from "../lib/api";

function lineCard(update: Partial<LyricsLineCard> = {}): LyricsLineCard {
  return {
    lineNumber: 1,
    originalText: "夜を越える",
    romaji: "yoru o koeru",
    approximateChinesePronunciation: null,
    meaning: "cross the night",
    pronunciationNotes: [],
    singAlongNotes: [],
    confidence: null,
    needsReview: false,
    ...update,
  };
}

test("reading modes map to persisted layout modes", () => {
  assert.equal(layoutModeForReadingMode("reader"), "continuous");
  assert.equal(layoutModeForReadingMode("overview"), "compact");
  assert.equal(layoutModeForReadingMode("sing_along"), "sing_along");
});

test("persisted layout modes map back to reading modes", () => {
  assert.equal(readingModeForLayoutMode("continuous"), "reader");
  assert.equal(readingModeForLayoutMode("compact"), "overview");
  assert.equal(readingModeForLayoutMode("sing_along"), "sing_along");
});

test("editor does not map to a persisted reading layout", () => {
  assert.equal(persistedLayoutModeForWorkspaceMode("editor"), null);
  assert.equal(persistedLayoutModeForWorkspaceMode("reader"), "continuous");
});

test("leaving editor returns to the previous reading mode", () => {
  assert.equal(modeAfterEditor("reader"), "reader");
  assert.equal(modeAfterEditor("overview"), "overview");
  assert.equal(modeAfterEditor("sing_along"), "sing_along");
});

test("line cards sort by lineNumber without mutating source order", () => {
  const source = [
    lineCard({ lineNumber: 3 }),
    lineCard({ lineNumber: 1 }),
    lineCard({ lineNumber: 2 }),
  ];

  assert.deepEqual(
    sortedLineCards(source).map((card) => card.lineNumber),
    [1, 2, 3],
  );
  assert.deepEqual(
    source.map((card) => card.lineNumber),
    [3, 1, 2],
  );
});

test("hidden Romaji and Translation are omitted from phrase display", () => {
  const display = lyricPhraseDisplay(lineCard(), {
    layoutMode: "continuous",
    showRomaji: false,
    showTranslation: false,
  });

  assert.deepEqual(
    display.parts.map((part) => part.kind),
    ["original"],
  );
});

test("Sing-along phrase display hides visible line numbers and missing labels", () => {
  const display = lyricPhraseDisplay(
    lineCard({ lineNumber: 12, romaji: null, meaning: null }),
    {
      layoutMode: "sing_along",
      showRomaji: true,
      showTranslation: true,
    },
  );

  assert.equal(display.showLineNumber, false);
  assert.equal(display.activationLineNumber, 12);
  assert.deepEqual(
    display.parts.map((part) => part.kind),
    ["original"],
  );
});

test("lyric phrase activation uses the source lineNumber", () => {
  const display = lyricPhraseDisplay(lineCard({ lineNumber: 42 }), {
    layoutMode: "compact",
    showRomaji: true,
    showTranslation: true,
  });

  assert.equal(display.activationLineNumber, 42);
  assert.equal(display.showLineNumber, true);
});

test("malformed cached settings are rejected", () => {
  assert.equal(validateCachedSettings(null), null);
  assert.equal(validateCachedSettings({ theme: "sepia" }), null);
  assert.equal(
    validateCachedSettings({
      theme: "light",
      lyricsLearning: {
        songSheet: {
          showRomaji: "yes",
          showTranslation: true,
          originalTextSize: 30,
          layoutMode: "continuous",
        },
      },
    }),
    null,
  );
});

test("cached sing_along layout validates and malformed optional values fall back", () => {
  const settings = validateCachedSettings({
    theme: "midnight",
    lyricsLearning: {
      songSheet: {
        showRomaji: false,
        showTranslation: true,
        originalTextSize: 500,
        layoutMode: "sing_along",
      },
    },
  });

  assert.deepEqual(settings, {
    theme: "midnight",
    lyricsLearning: {
      songSheet: {
        showRomaji: false,
        showTranslation: true,
        originalTextSize:
          defaultDisplaySettings.lyricsLearning.songSheet.originalTextSize,
        layoutMode: "sing_along",
      },
    },
  });
});

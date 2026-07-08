import {
  applicationThemes,
  songSheetLayoutModeDefault,
  songSheetOriginalTextSizeDefault,
  songSheetOriginalTextSizeMax,
  songSheetOriginalTextSizeMin,
  type ApplicationSettings,
  type ApplicationTheme,
  type SongSheetLayoutMode,
  type SongSheetSettings,
} from "../../lib/api";

export const applicationSettingsCacheKey = "aotune.application-settings-cache.v1";
export const legacyThemeCacheKey = "aotune.theme-cache";

export type CachedDisplaySettings = Omit<ApplicationSettings, "updatedAt">;

export const defaultDisplaySettings: CachedDisplaySettings = {
  theme: "light",
  lyricsLearning: {
    songSheet: {
      showRomaji: true,
      showTranslation: true,
      originalTextSize: songSheetOriginalTextSizeDefault,
      layoutMode: songSheetLayoutModeDefault,
    },
  },
};

export function isApplicationTheme(value: unknown): value is ApplicationTheme {
  return (
    typeof value === "string" &&
    applicationThemes.includes(value as ApplicationTheme)
  );
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

export function isSongSheetLayoutMode(
  value: unknown,
): value is SongSheetLayoutMode {
  return value === "continuous" || value === "compact" || value === "sing_along";
}

function isOriginalTextSize(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= songSheetOriginalTextSizeMin &&
    value <= songSheetOriginalTextSizeMax
  );
}

export function validateCachedSettings(
  value: unknown,
): CachedDisplaySettings | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const candidate = value as Partial<CachedDisplaySettings>;
  const songSheet = candidate.lyricsLearning?.songSheet;
  if (
    !isApplicationTheme(candidate.theme) ||
    !songSheet ||
    !isBoolean(songSheet.showRomaji) ||
    !isBoolean(songSheet.showTranslation)
  ) {
    return null;
  }

  return {
    theme: candidate.theme,
    lyricsLearning: {
      songSheet: {
        showRomaji: songSheet.showRomaji,
        showTranslation: songSheet.showTranslation,
        originalTextSize: isOriginalTextSize(songSheet.originalTextSize)
          ? songSheet.originalTextSize
          : songSheetOriginalTextSizeDefault,
        layoutMode: isSongSheetLayoutMode(songSheet.layoutMode)
          ? songSheet.layoutMode
          : songSheetLayoutModeDefault,
      },
    },
  };
}

export function displaySettingsFromResponse(
  settings: ApplicationSettings,
): CachedDisplaySettings {
  return {
    theme: settings.theme,
    lyricsLearning: {
      songSheet: {
        showRomaji: settings.lyricsLearning.songSheet.showRomaji,
        showTranslation: settings.lyricsLearning.songSheet.showTranslation,
        originalTextSize: settings.lyricsLearning.songSheet.originalTextSize,
        layoutMode: settings.lyricsLearning.songSheet.layoutMode,
      },
    },
  };
}

export function mergeDisplaySettings(
  settings: CachedDisplaySettings,
  update: {
    theme?: ApplicationTheme;
    songSheet?: Partial<SongSheetSettings>;
  },
): CachedDisplaySettings {
  return {
    theme: update.theme ?? settings.theme,
    lyricsLearning: {
      songSheet: {
        ...settings.lyricsLearning.songSheet,
        ...update.songSheet,
      },
    },
  };
}

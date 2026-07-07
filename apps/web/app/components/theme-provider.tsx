"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  songSheetLayoutModeDefault,
  songSheetOriginalTextSizeDefault,
  songSheetOriginalTextSizeMax,
  songSheetOriginalTextSizeMin,
  applicationThemes,
  getApplicationSettings,
  updateApplicationSettings,
  type ApplicationSettings,
  type ApplicationTheme,
  type SongSheetSettings,
  type SongSheetLayoutMode,
} from "@/lib/api";

export const applicationSettingsCacheKey = "aotune.application-settings-cache.v1";
export const legacyThemeCacheKey = "aotune.theme-cache";

const defaultDisplaySettings: CachedDisplaySettings = {
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

export type ThemeOption = {
  theme: ApplicationTheme;
  label: string;
  description: string;
  swatches: readonly string[];
  colorScheme: "light" | "dark";
};

export const themeOptions: readonly ThemeOption[] = [
  {
    theme: "light",
    label: "Light",
    description: "Warm paper surfaces",
    swatches: ["#f4f1ea", "#ffffff", "#2c7284"],
    colorScheme: "light",
  },
  {
    theme: "black",
    label: "Black",
    description: "Neutral dark focus",
    swatches: ["#08090b", "#13171b", "#63bccb"],
    colorScheme: "dark",
  },
  {
    theme: "midnight",
    label: "Midnight",
    description: "Layered blue night",
    swatches: ["#07111d", "#0f1e2e", "#78bce8"],
    colorScheme: "dark",
  },
  {
    theme: "sky",
    label: "Sky",
    description: "Clear light blue",
    swatches: ["#eaf6fb", "#ffffff", "#247f9b"],
    colorScheme: "light",
  },
];

type ThemeContextValue = {
  settings: CachedDisplaySettings;
  currentTheme: ApplicationTheme;
  persistedTheme: ApplicationTheme;
  songSheetSettings: SongSheetSettings;
  isLoadingSettings: boolean;
  isSavingTheme: boolean;
  isSavingSongSheetSettings: boolean;
  updateError: string | null;
  themes: readonly ThemeOption[];
  setTheme: (theme: ApplicationTheme) => Promise<void>;
  setSongSheetSettings: (settings: Partial<SongSheetSettings>) => Promise<void>;
  clearUpdateError: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type CachedDisplaySettings = Omit<ApplicationSettings, "updatedAt">;

function isApplicationTheme(value: unknown): value is ApplicationTheme {
  if (typeof value !== "string") {
    return false;
  }
  return applicationThemes.includes(value as ApplicationTheme);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isSongSheetLayoutMode(value: unknown): value is SongSheetLayoutMode {
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

function validateCachedSettings(value: unknown): CachedDisplaySettings | null {
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

function displaySettingsFromResponse(
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

function cachedDisplaySettings(): CachedDisplaySettings {
  if (typeof window === "undefined") {
    return defaultDisplaySettings;
  }

  try {
    const cachedValue = window.localStorage.getItem(applicationSettingsCacheKey);
    if (cachedValue) {
      const parsed = validateCachedSettings(JSON.parse(cachedValue));
      if (parsed) {
        return parsed;
      }
    }

    const legacyTheme = window.localStorage.getItem(legacyThemeCacheKey);
    if (isApplicationTheme(legacyTheme)) {
      return { ...defaultDisplaySettings, theme: legacyTheme };
    }
  } catch {
    return defaultDisplaySettings;
  }

  return defaultDisplaySettings;
}

function colorSchemeForTheme(theme: ApplicationTheme) {
  return themeOptions.find((option) => option.theme === theme)?.colorScheme ?? "light";
}

function applyTheme(theme: ApplicationTheme) {
  if (typeof document === "undefined") {
    return;
  }
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = colorSchemeForTheme(theme);
}

function cacheDisplaySettings(settings: CachedDisplaySettings) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      applicationSettingsCacheKey,
      JSON.stringify(settings),
    );
    window.localStorage.removeItem(legacyThemeCacheKey);
  } catch {
    // PostgreSQL remains authoritative.
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<CachedDisplaySettings>(
    cachedDisplaySettings,
  );
  const [currentTheme, setCurrentTheme] = useState<ApplicationTheme>(
    settings.theme,
  );
  const [persistedTheme, setPersistedTheme] =
    useState<ApplicationTheme>(currentTheme);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [pendingSongSheetUpdates, setPendingSongSheetUpdates] = useState(0);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const songSheetUpdateRequestRef = useRef(0);

  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      setIsLoadingSettings(true);
      try {
        const response = await getApplicationSettings();
        if (!isMounted) {
          return;
        }
        const nextSettings = displaySettingsFromResponse(response);
        setSettings(nextSettings);
        setCurrentTheme(nextSettings.theme);
        setPersistedTheme(nextSettings.theme);
        cacheDisplaySettings(nextSettings);
        setUpdateError(null);
      } catch {
        if (!isMounted) {
          return;
        }
        setUpdateError(
          "Application settings could not be loaded. Using the local display cache.",
        );
      } finally {
        if (isMounted) {
          setIsLoadingSettings(false);
        }
      }
    }

    void loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      settings,
      currentTheme,
      persistedTheme,
      songSheetSettings: settings.lyricsLearning.songSheet,
      isLoadingSettings,
      isSavingTheme,
      isSavingSongSheetSettings: pendingSongSheetUpdates > 0,
      updateError,
      themes: themeOptions,
      clearUpdateError: () => setUpdateError(null),
      setTheme: async (theme: ApplicationTheme) => {
        if (theme === currentTheme || isSavingTheme) {
          return;
        }

        const previousSettings = settings;
        setCurrentTheme(theme);
        const optimisticSettings = { ...settings, theme };
        setSettings(optimisticSettings);
        cacheDisplaySettings(optimisticSettings);
        setIsSavingTheme(true);
        setUpdateError(null);

        try {
          const response = await updateApplicationSettings({ theme });
          const nextSettings = displaySettingsFromResponse(response);
          setSettings(nextSettings);
          setCurrentTheme(nextSettings.theme);
          setPersistedTheme(nextSettings.theme);
          cacheDisplaySettings(nextSettings);
        } catch {
          setSettings(previousSettings);
          setCurrentTheme(previousSettings.theme);
          cacheDisplaySettings(previousSettings);
          setUpdateError("Theme could not be saved. Restored the previous theme.");
        } finally {
          setIsSavingTheme(false);
        }
      },
      setSongSheetSettings: async (songSheetUpdate: Partial<SongSheetSettings>) => {
        const requestId = songSheetUpdateRequestRef.current + 1;
        songSheetUpdateRequestRef.current = requestId;
        const previousSettings = settings;
        const optimisticSettings = {
          ...settings,
          lyricsLearning: {
            songSheet: {
              ...settings.lyricsLearning.songSheet,
              ...songSheetUpdate,
            },
          },
        };
        setSettings(optimisticSettings);
        cacheDisplaySettings(optimisticSettings);
        setPendingSongSheetUpdates((current) => current + 1);
        setUpdateError(null);

        try {
          const response = await updateApplicationSettings({
            lyricsLearning: {
              songSheet: songSheetUpdate,
            },
          });
          if (requestId !== songSheetUpdateRequestRef.current) {
            return;
          }
          const nextSettings = displaySettingsFromResponse(response);
          setSettings(nextSettings);
          setCurrentTheme(nextSettings.theme);
          setPersistedTheme(nextSettings.theme);
          cacheDisplaySettings(nextSettings);
        } catch {
          if (requestId === songSheetUpdateRequestRef.current) {
            setSettings(previousSettings);
            setCurrentTheme(previousSettings.theme);
            cacheDisplaySettings(previousSettings);
            setUpdateError(
              "Song Sheet display settings could not be saved. Restored the previous display.",
            );
          }
        } finally {
          setPendingSongSheetUpdates((current) => Math.max(current - 1, 0));
        }
      },
    }),
    [
      currentTheme,
      isLoadingSettings,
      isSavingTheme,
      pendingSongSheetUpdates,
      persistedTheme,
      settings,
      updateError,
    ],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("useTheme must be used within ThemeProvider.");
  }
  return value;
}

export function useApplicationSettings() {
  return useTheme();
}

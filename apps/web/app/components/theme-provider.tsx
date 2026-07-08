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
  getApplicationSettings,
  updateApplicationSettings,
  type ApplicationTheme,
  type SongSheetSettings,
} from "@/lib/api";
import {
  applicationSettingsCacheKey,
  defaultDisplaySettings,
  displaySettingsFromResponse,
  isApplicationTheme,
  legacyThemeCacheKey,
  mergeDisplaySettings,
  validateCachedSettings,
  type CachedDisplaySettings,
} from "./application-settings-cache";

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

type DisplaySettingField =
  | "theme"
  | "showRomaji"
  | "showTranslation"
  | "originalTextSize"
  | "layoutMode";
type SongSheetSettingField = Exclude<DisplaySettingField, "theme">;

type DisplaySettingFieldVersions = Record<DisplaySettingField, number>;

const initialFieldVersions: DisplaySettingFieldVersions = {
  theme: 0,
  showRomaji: 0,
  showTranslation: 0,
  originalTextSize: 0,
  layoutMode: 0,
};

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
  const settingsRef = useRef(settings);
  const fieldVersionsRef = useRef<DisplaySettingFieldVersions>({
    ...initialFieldVersions,
  });

  function applyDisplaySettings(nextSettings: CachedDisplaySettings) {
    settingsRef.current = nextSettings;
    setSettings(nextSettings);
    setCurrentTheme(nextSettings.theme);
    cacheDisplaySettings(nextSettings);
  }

  function nextFieldVersion(field: DisplaySettingField) {
    const nextVersion = fieldVersionsRef.current[field] + 1;
    fieldVersionsRef.current = {
      ...fieldVersionsRef.current,
      [field]: nextVersion,
    };
    return nextVersion;
  }

  function assignSongSheetSetting(
    target: Partial<SongSheetSettings>,
    field: SongSheetSettingField,
    value: SongSheetSettings[SongSheetSettingField],
  ) {
    if (field === "showRomaji") {
      target.showRomaji = value as SongSheetSettings["showRomaji"];
      return;
    }
    if (field === "showTranslation") {
      target.showTranslation = value as SongSheetSettings["showTranslation"];
      return;
    }
    if (field === "originalTextSize") {
      target.originalTextSize = value as SongSheetSettings["originalTextSize"];
      return;
    }
    target.layoutMode = value as SongSheetSettings["layoutMode"];
  }

  function rollbackUnchangedFields(
    requestedVersions: Partial<DisplaySettingFieldVersions>,
    previousSettings: CachedDisplaySettings,
  ) {
    const currentSettings = settingsRef.current;
    const songSheetRollback: Partial<SongSheetSettings> = {};
    let shouldRollbackSongSheet = false;
    let shouldRollbackTheme = false;

    if (
      requestedVersions.theme !== undefined &&
      fieldVersionsRef.current.theme === requestedVersions.theme
    ) {
      shouldRollbackTheme = true;
    }

    for (const field of [
      "showRomaji",
      "showTranslation",
      "originalTextSize",
      "layoutMode",
    ] as const) {
      if (
        requestedVersions[field] !== undefined &&
        fieldVersionsRef.current[field] === requestedVersions[field]
      ) {
        assignSongSheetSetting(
          songSheetRollback,
          field,
          previousSettings.lyricsLearning.songSheet[field],
        );
        shouldRollbackSongSheet = true;
      }
    }

    if (!shouldRollbackTheme && !shouldRollbackSongSheet) {
      return;
    }

    applyDisplaySettings(
      mergeDisplaySettings(currentSettings, {
        theme: shouldRollbackTheme ? previousSettings.theme : undefined,
        songSheet: shouldRollbackSongSheet ? songSheetRollback : undefined,
      }),
    );
  }

  function mergeUntouchedFieldsFromResponse(
    responseSettings: CachedDisplaySettings,
  ) {
    const currentSettings = settingsRef.current;
    const versions = fieldVersionsRef.current;
    const songSheetUpdate: Partial<SongSheetSettings> = {};

    if (versions.showRomaji === 0) {
      songSheetUpdate.showRomaji =
        responseSettings.lyricsLearning.songSheet.showRomaji;
    }
    if (versions.showTranslation === 0) {
      songSheetUpdate.showTranslation =
        responseSettings.lyricsLearning.songSheet.showTranslation;
    }
    if (versions.originalTextSize === 0) {
      songSheetUpdate.originalTextSize =
        responseSettings.lyricsLearning.songSheet.originalTextSize;
    }
    if (versions.layoutMode === 0) {
      songSheetUpdate.layoutMode =
        responseSettings.lyricsLearning.songSheet.layoutMode;
    }

    return mergeDisplaySettings(currentSettings, {
      theme: versions.theme === 0 ? responseSettings.theme : undefined,
      songSheet: songSheetUpdate,
    });
  }

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
        const responseSettings = displaySettingsFromResponse(response);
        const nextSettings = mergeUntouchedFieldsFromResponse(responseSettings);
        applyDisplaySettings(nextSettings);
        if (fieldVersionsRef.current.theme === 0) {
          setPersistedTheme(responseSettings.theme);
        }
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

        const previousSettings = settingsRef.current;
        const themeVersion = nextFieldVersion("theme");
        const optimisticSettings = mergeDisplaySettings(previousSettings, {
          theme,
        });
        applyDisplaySettings(optimisticSettings);
        setIsSavingTheme(true);
        setUpdateError(null);

        try {
          const response = await updateApplicationSettings({ theme });
          const responseSettings = displaySettingsFromResponse(response);
          if (fieldVersionsRef.current.theme === themeVersion) {
            applyDisplaySettings(
              mergeDisplaySettings(settingsRef.current, {
                theme: responseSettings.theme,
              }),
            );
            setPersistedTheme(responseSettings.theme);
          }
        } catch {
          rollbackUnchangedFields({ theme: themeVersion }, previousSettings);
          setUpdateError("Theme could not be saved. Restored the previous theme.");
        } finally {
          setIsSavingTheme(false);
        }
      },
      setSongSheetSettings: async (songSheetUpdate: Partial<SongSheetSettings>) => {
        const previousSettings = settingsRef.current;
        const requestedVersions: Partial<DisplaySettingFieldVersions> = {};
        for (const field of Object.keys(songSheetUpdate) as Array<
          keyof SongSheetSettings
        >) {
          if (songSheetUpdate[field] !== undefined) {
            requestedVersions[field] = nextFieldVersion(field);
          }
        }
        applyDisplaySettings(
          mergeDisplaySettings(previousSettings, {
            songSheet: songSheetUpdate,
          }),
        );
        setPendingSongSheetUpdates((current) => current + 1);
        setUpdateError(null);

        try {
          const response = await updateApplicationSettings({
            lyricsLearning: {
              songSheet: songSheetUpdate,
            },
          });
          const responseSettings = displaySettingsFromResponse(response);
          const confirmedSongSheet: Partial<SongSheetSettings> = {};
          let shouldApplyConfirmedSongSheet = false;
          for (const field of Object.keys(songSheetUpdate) as Array<
            keyof SongSheetSettings
          >) {
            if (
              requestedVersions[field] !== undefined &&
              fieldVersionsRef.current[field] === requestedVersions[field]
            ) {
              assignSongSheetSetting(
                confirmedSongSheet,
                field,
                responseSettings.lyricsLearning.songSheet[field],
              );
              shouldApplyConfirmedSongSheet = true;
            }
          }
          if (shouldApplyConfirmedSongSheet) {
            applyDisplaySettings(
              mergeDisplaySettings(settingsRef.current, {
                songSheet: confirmedSongSheet,
              }),
            );
          }
        } catch {
          rollbackUnchangedFields(requestedVersions, previousSettings);
          setUpdateError(
            "Song Sheet display settings could not be saved. Restored the previous display.",
          );
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

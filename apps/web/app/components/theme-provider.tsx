"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  applicationThemes,
  getApplicationPreferences,
  updateApplicationTheme,
  type ApplicationTheme,
} from "@/lib/api";

export const themeCacheKey = "aotune.theme-cache";

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
  currentTheme: ApplicationTheme;
  persistedTheme: ApplicationTheme;
  isLoadingPreference: boolean;
  isSavingPreference: boolean;
  updateError: string | null;
  themes: readonly ThemeOption[];
  setTheme: (theme: ApplicationTheme) => Promise<void>;
  clearUpdateError: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isApplicationTheme(value: string | null): value is ApplicationTheme {
  return applicationThemes.includes(value as ApplicationTheme);
}

function cachedTheme(): ApplicationTheme {
  if (typeof window === "undefined") {
    return "light";
  }

  try {
    const cachedValue = window.localStorage.getItem(themeCacheKey);
    return isApplicationTheme(cachedValue) ? cachedValue : "light";
  } catch {
    return "light";
  }
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

function cacheTheme(theme: ApplicationTheme) {
  try {
    window.localStorage.setItem(themeCacheKey, theme);
  } catch {
    // The database preference remains authoritative.
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<ApplicationTheme>(cachedTheme);
  const [persistedTheme, setPersistedTheme] =
    useState<ApplicationTheme>(currentTheme);
  const [isLoadingPreference, setIsLoadingPreference] = useState(true);
  const [isSavingPreference, setIsSavingPreference] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  useEffect(() => {
    let isMounted = true;

    async function loadPreference() {
      setIsLoadingPreference(true);
      try {
        const preference = await getApplicationPreferences();
        if (!isMounted) {
          return;
        }
        setCurrentTheme(preference.theme);
        setPersistedTheme(preference.theme);
        cacheTheme(preference.theme);
        setUpdateError(null);
      } catch {
        if (!isMounted) {
          return;
        }
        setUpdateError(
          "Theme preference could not be loaded. Using the local display cache.",
        );
      } finally {
        if (isMounted) {
          setIsLoadingPreference(false);
        }
      }
    }

    void loadPreference();

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      currentTheme,
      persistedTheme,
      isLoadingPreference,
      isSavingPreference,
      updateError,
      themes: themeOptions,
      clearUpdateError: () => setUpdateError(null),
      setTheme: async (theme: ApplicationTheme) => {
        if (theme === currentTheme || isSavingPreference) {
          return;
        }

        const previousTheme = persistedTheme;
        setCurrentTheme(theme);
        cacheTheme(theme);
        setIsSavingPreference(true);
        setUpdateError(null);

        try {
          const preference = await updateApplicationTheme(theme);
          setCurrentTheme(preference.theme);
          setPersistedTheme(preference.theme);
          cacheTheme(preference.theme);
        } catch {
          setCurrentTheme(previousTheme);
          cacheTheme(previousTheme);
          setUpdateError("Theme could not be saved. Restored the previous theme.");
        } finally {
          setIsSavingPreference(false);
        }
      },
    }),
    [
      currentTheme,
      isLoadingPreference,
      isSavingPreference,
      persistedTheme,
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

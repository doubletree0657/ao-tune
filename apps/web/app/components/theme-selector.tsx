"use client";

import { useEffect, useRef, useState } from "react";

import { useTheme } from "./theme-provider";
import styles from "./app-shell.module.css";

function ThemeIcon() {
  return (
    <svg aria-hidden="true" height="17" viewBox="0 0 24 24" width="17">
      <path
        d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" height="16" viewBox="0 0 24 24" width="16">
      <path
        d="m5 12 4 4L19 6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
    </svg>
  );
}

export default function ThemeSelector() {
  const {
    currentTheme,
    isLoadingSettings,
    isSavingTheme,
    updateError,
    themes,
    setTheme,
    clearUpdateError,
  } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const currentOption = themes.find((option) => option.theme === currentTheme);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        rootRef.current &&
        event.target instanceof Node &&
        !rootRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  function closeAndReturnFocus() {
    setIsOpen(false);
    window.setTimeout(() => buttonRef.current?.focus(), 0);
  }

  return (
    <div className={styles.themeControl} ref={rootRef}>
      <button
        aria-controls="theme-menu"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`Theme: ${currentOption?.label ?? currentTheme}`}
        className={styles.themeButton}
        disabled={isSavingTheme}
        onClick={() => {
          clearUpdateError();
          setIsOpen((current) => !current);
        }}
        ref={buttonRef}
        type="button"
      >
        <ThemeIcon />
        <span>{currentOption?.label ?? "Theme"}</span>
      </button>

      {isOpen ? (
        <div
          aria-label="Theme options"
          className={styles.themeMenu}
          id="theme-menu"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              closeAndReturnFocus();
            }
          }}
          role="menu"
        >
          <div className={styles.themeMenuHeader}>
            <strong>Theme</strong>
            <span>
              {isLoadingSettings
                ? "Loading settings"
                : isSavingTheme
                  ? "Saving"
                  : "Stored in PostgreSQL"}
            </span>
          </div>

          <div className={styles.themeOptions}>
            {themes.map((option) => {
              const isSelected = option.theme === currentTheme;
              return (
                <button
                  aria-checked={isSelected}
                  className={styles.themeOption}
                  disabled={isSavingTheme}
                  key={option.theme}
                  onClick={() => {
                    void setTheme(option.theme);
                  }}
                  role="menuitemradio"
                  type="button"
                >
                  <span className={styles.themePreview} aria-hidden="true">
                    {option.swatches.map((swatch) => (
                      <span
                        key={swatch}
                        style={{ backgroundColor: swatch }}
                      />
                    ))}
                  </span>
                  <span className={styles.themeOptionText}>
                    <strong>{option.label}</strong>
                    <span>{option.description}</span>
                  </span>
                  <span className={styles.themeCheck}>
                    {isSelected ? <CheckIcon /> : null}
                  </span>
                </button>
              );
            })}
          </div>

          {updateError ? (
            <p className={styles.themeError} role="status">
              {updateError}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

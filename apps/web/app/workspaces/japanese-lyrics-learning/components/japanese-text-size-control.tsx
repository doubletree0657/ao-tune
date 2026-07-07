import { useEffect, useRef, useState } from "react";

import {
  songSheetOriginalTextSizeDefault,
  songSheetOriginalTextSizeMax,
  songSheetOriginalTextSizeMin,
} from "@/lib/api";

import styles from "../workspace.module.css";

type JapaneseTextSizeControlProps = {
  onChange: (value: number) => Promise<void>;
  value: number;
};

function clampTextSize(value: number) {
  return Math.min(
    Math.max(value, songSheetOriginalTextSizeMin),
    songSheetOriginalTextSizeMax,
  );
}

export default function JapaneseTextSizeControl({
  onChange,
  value,
}: JapaneseTextSizeControlProps) {
  const [draftValue, setDraftValue] = useState(value);
  const latestSentValueRef = useRef(value);

  useEffect(() => {
    setDraftValue(value);
    latestSentValueRef.current = value;
  }, [value]);

  useEffect(() => {
    const nextValue = clampTextSize(draftValue);
    if (nextValue === latestSentValueRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      latestSentValueRef.current = nextValue;
      void onChange(nextValue);
    }, 450);

    return () => window.clearTimeout(timeoutId);
  }, [draftValue, onChange]);

  function commitValue(nextValue: number) {
    const clampedValue = clampTextSize(nextValue);
    if (clampedValue === latestSentValueRef.current) {
      return;
    }

    latestSentValueRef.current = clampedValue;
    void onChange(clampedValue);
  }

  return (
    <div
      className={styles.textSizeControl}
      role="group"
      aria-label="Japanese text size"
    >
      <label className={styles.textSizeLabel} htmlFor="japanese-text-size">
        Japanese
      </label>
      <input
        aria-valuetext={`${draftValue} pixels`}
        id="japanese-text-size"
        max={songSheetOriginalTextSizeMax}
        min={songSheetOriginalTextSizeMin}
        onBlur={() => commitValue(draftValue)}
        onChange={(event) => setDraftValue(Number(event.target.value))}
        onKeyUp={(event) => {
          if (event.key === "Enter") {
            commitValue(draftValue);
          }
        }}
        step="1"
        type="range"
        value={draftValue}
      />
      <output className={styles.textSizeValue} htmlFor="japanese-text-size">
        {draftValue}px
      </output>
      <button
        className={styles.textSizeReset}
        disabled={draftValue === songSheetOriginalTextSizeDefault}
        onClick={() => {
          setDraftValue(songSheetOriginalTextSizeDefault);
          commitValue(songSheetOriginalTextSizeDefault);
        }}
        type="button"
      >
        Reset
      </button>
    </div>
  );
}

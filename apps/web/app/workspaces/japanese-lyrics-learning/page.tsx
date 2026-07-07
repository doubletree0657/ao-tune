import type { Metadata } from "next";

import SongAgentRequest from "./song-agent-request";
import styles from "./workspace.module.css";

export const metadata: Metadata = {
  title: "Japanese Lyrics Learning | AoTune",
  description:
    "Prepare pronunciation, meaning, and sing-along notes from user-provided Japanese lyrics.",
};

export default function JapaneseLyricsLearningPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Music learning workspace</p>
        <h1 className={styles.title}>Japanese Lyrics Learning</h1>
      </header>

      <SongAgentRequest />
    </main>
  );
}

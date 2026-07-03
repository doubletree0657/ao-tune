import type { Metadata } from "next";
import Link from "next/link";

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
        <div>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link href="/">AoTune</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Japanese Lyrics Learning</span>
          </nav>
          <p className={styles.eyebrow}>Music learning workspace</p>
          <h1 className={styles.title}>Japanese Lyrics Learning</h1>
          <p className={styles.intro}>
            Open a saved artifact, move through lyric lines, refine practice
            notes, and save review progress without leaving the work surface.
          </p>
        </div>
      </header>

      <SongAgentRequest />
    </main>
  );
}

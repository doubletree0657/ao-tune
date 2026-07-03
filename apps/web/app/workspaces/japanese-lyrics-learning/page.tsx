import type { Metadata } from "next";
import Link from "next/link";

import SongAgentRequest from "./song-agent-request";

export const metadata: Metadata = {
  title: "Japanese Lyrics Learning | AoTune",
  description:
    "Prepare pronunciation, meaning, and sing-along notes from user-provided Japanese lyrics.",
};

export default function JapaneseLyricsLearningPage() {
  return (
    <main className="workspace-page">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">AoTune</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Japanese Lyrics Learning</span>
      </nav>

      <header className="workspace-compact-header">
        <div>
          <p className="eyebrow">Music learning workspace</p>
          <h1 className="workspace-title">Japanese Lyrics Learning</h1>
          <p className="workspace-intro">
            Open a saved draft, review line cards, and save pronunciation or
            meaning edits back to your local artifact library.
          </p>
        </div>
        <p className="phase workspace-phase">Phase 1 target</p>
      </header>

      <section className="workspace-app-section" aria-label="Lyrics learning workspace">
        <SongAgentRequest />
      </section>
    </main>
  );
}

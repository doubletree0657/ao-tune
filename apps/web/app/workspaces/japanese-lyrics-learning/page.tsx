import type { Metadata } from "next";
import Link from "next/link";

import LyricsDraftStudio from "./lyrics-draft-studio";

export const metadata: Metadata = {
  title: "Japanese Lyrics Learning | AoTune",
  description:
    "Prepare pronunciation, meaning, and sing-along notes from user-provided Japanese lyrics.",
};

const learningSteps = [
  {
    number: "01",
    title: "Bring your lyrics",
    description:
      "Start with lyrics you provide for a song you want to understand and sing.",
  },
  {
    number: "02",
    title: "Shape each line",
    description:
      "Align romaji, pronunciation hints, meaning, and notes around each lyric line.",
  },
  {
    number: "03",
    title: "Listen and return",
    description:
      "Keep sing-along observations and personal progress for repeated practice.",
  },
];

export default function JapaneseLyricsLearningPage() {
  return (
    <main className="workspace-page">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">AoTune</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Japanese Lyrics Learning</span>
      </nav>

      <header className="workspace-hero">
        <div>
          <p className="eyebrow">Music learning workspace</p>
          <h1 className="workspace-title">Japanese Lyrics Learning</h1>
          <p className="workspace-intro">
            Learn a Japanese song line by line through lyrics you provide,
            pronunciation support, meaning notes, and personal sing-along
            practice.
          </p>
        </div>
        <p className="phase workspace-phase">Phase 1 target</p>
      </header>

      <section className="workspace-section" aria-labelledby="learning-flow-heading">
        <div className="section-heading">
          <p className="eyebrow">Learning flow</p>
          <h2 id="learning-flow-heading">From listening to familiarity</h2>
          <p>
            The workspace stays centered on one song and the notes that help you
            read, hear, and sing it with more confidence.
          </p>
        </div>

        <ol className="flow-list">
          {learningSteps.map((step) => (
            <li key={step.number}>
              <span>{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="workspace-section" aria-labelledby="draft-card-heading">
        <div className="section-heading">
          <p className="eyebrow">Local draft</p>
          <h2 id="draft-card-heading">Draft your own line</h2>
          <p>
            Paste or type a lyric excerpt you provide, then shape pronunciation,
            meaning, and sing-along notes around it. Drafts stay in this browser
            tab and are cleared when the page refreshes.
          </p>
        </div>

        <LyricsDraftStudio />
      </section>

      <section className="workspace-section" aria-labelledby="progress-heading">
        <div className="section-heading">
          <p className="eyebrow">Personal artifacts</p>
          <h2 id="progress-heading">Saved learning and progress</h2>
        </div>

        <div className="empty-artifacts">
          <p className="empty-artifacts-title">Your song notes will gather here.</p>
          <p>
            Future saved artifacts may include line cards, difficult phrase
            notes, sing-along observations, and progress across repeated
            listening sessions.
          </p>
          <span>Static placeholder for Phase 1A</span>
        </div>
      </section>
    </main>
  );
}

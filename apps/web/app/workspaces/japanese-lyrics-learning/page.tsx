import type { Metadata } from "next";
import Link from "next/link";

import SongAgentRequest from "./song-agent-request";

export const metadata: Metadata = {
  title: "Japanese Lyrics Learning | AoTune",
  description:
    "Prepare pronunciation, meaning, and sing-along notes from user-provided Japanese lyrics.",
};

const learningSteps = [
  {
    number: "01",
    title: "Name the song",
    description:
      "Tell AoTune which song you want to study and what you want to practice.",
  },
  {
    number: "02",
    title: "Add lyrics and context",
    description:
      "Provide lyrics text locally, with separate study notes for pronunciation and listening goals.",
  },
  {
    number: "03",
    title: "Build an artifact",
    description:
      "The configured agent organizes text-based pronunciation, meaning, and practice guidance.",
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
            Tell AoTune what song you want to study. The configured agent can
            turn your goal and user-provided lyrics text into a structured
            learning draft.
          </p>
        </div>
        <p className="phase workspace-phase">Phase 1 target</p>
      </header>

      <section className="workspace-section" aria-labelledby="learning-flow-heading">
        <div className="section-heading">
          <p className="eyebrow">Learning flow</p>
          <h2 id="learning-flow-heading">From listening to familiarity</h2>
          <p>
            The workspace begins with your song and learning goal, then keeps
            generated study material together for listening and sing-along
            practice.
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

      <section className="workspace-section" aria-labelledby="agent-request-heading">
        <div className="section-heading">
          <p className="eyebrow">Agent request</p>
          <h2 id="agent-request-heading">What song do you want to study?</h2>
          <p>
            AoTune will turn your song goal into a structured learning artifact.
            The default fake provider returns placeholders. An OpenAI-compatible
            provider can generate text-based learning drafts when configured on
            the backend.
          </p>
        </div>

        <SongAgentRequest />
      </section>

      <section className="workspace-section" aria-labelledby="progress-heading">
        <div className="section-heading">
          <p className="eyebrow">Personal artifacts</p>
          <h2 id="progress-heading">Saved learning and progress</h2>
        </div>

        <div className="empty-artifacts">
          <p className="empty-artifacts-title">Your song notes will gather here.</p>
          <p>
            Future saved artifacts may include generated line cards,
            pronunciation guidance, sing-along observations, review cards, and
            progress across repeated listening sessions.
          </p>
          <span>Static placeholder for Phase 1A</span>
        </div>
      </section>
    </main>
  );
}

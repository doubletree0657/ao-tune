import Link from "next/link";

import styles from "./page.module.css";

const workspaces = [
  {
    name: "Japanese Lyrics Learning",
    description:
      "Review user-provided lyrics line by line with pronunciation, meaning, and sing-along notes.",
    status: "Available",
    isActive: true,
  },
  {
    name: "Japanese Music Research",
    description: "Build structured notes about artists, songs, albums, and themes.",
    status: "Planned",
    isActive: false,
  },
  {
    name: "Cosplay Planning",
    description: "Organize references, materials, budgets, schedules, and preparation.",
    status: "Planned",
    isActive: false,
  },
  {
    name: "Creative Studio",
    description: "Shape concepts, prompts, story fragments, and visual direction notes.",
    status: "Planned",
    isActive: false,
  },
  {
    name: "Personal Branding Studio",
    description: "Refine identity briefs, bios, portfolio direction, and presentation notes.",
    status: "Planned",
    isActive: false,
  },
];

export default function Home() {
  return (
    <main className={styles.page}>
      <section className={styles.dashboard} aria-labelledby="home-title">
        <div className={styles.introPanel}>
          <div>
            <p className={styles.eyebrow}>Personal AI workspace</p>
            <h1 className={styles.title} id="home-title">
              AoTune
            </h1>
            <p className={styles.intro}>
              A calm studio for turning Japanese music study, cosplay planning,
              ACGN-inspired ideas, and personal identity work into durable
              artifacts you can return to and refine.
            </p>
          </div>

          <dl className={styles.quickFacts} aria-label="Product focus">
            <div>
              <dt>Model</dt>
              <dd>Workspace based</dd>
            </div>
            <div>
              <dt>Value</dt>
              <dd>Saved artifacts</dd>
            </div>
            <div>
              <dt>Current</dt>
              <dd>Lyrics learning</dd>
            </div>
          </dl>
        </div>

        <article className={styles.continuePanel} aria-labelledby="continue-title">
          <header className={styles.continueHeader}>
            <div>
              <p className={styles.eyebrow}>Continue working</p>
              <h2 id="continue-title">Japanese Lyrics Learning</h2>
              <p className={styles.metaLine}>
                The first active AoTune workspace.
              </p>
            </div>
            <span className={styles.badge}>Available now</span>
          </header>

          <div className={styles.workspaceFocus}>
            <div>
              <h3 className={styles.focusTitle}>
                Review pronunciation and meaning one lyric line at a time.
              </h3>
              <p className={styles.focusCopy}>
                Open saved drafts, continue review progress, edit line cards,
                and create new learning artifacts from lyrics you provide.
              </p>
            </div>

            <ol className={styles.flowList}>
              <li>
                <span>1</span>
                <strong>Open an artifact</strong>
                <p>Return to the most recently updated learning draft.</p>
              </li>
              <li>
                <span>2</span>
                <strong>Review lines</strong>
                <p>Edit romaji, Chinese pronunciation hints, and notes.</p>
              </li>
              <li>
                <span>3</span>
                <strong>Save progress</strong>
                <p>Keep review status and line-card edits persistent.</p>
              </li>
            </ol>
          </div>

          <footer className={styles.continueFooter}>
            <p className={styles.metaLine}>
              Uses the existing local AoTune API and artifact store.
            </p>
            <Link
              className={styles.primaryLink}
              href="/workspaces/japanese-lyrics-learning"
            >
              Open workspace
              <span aria-hidden="true">→</span>
            </Link>
          </footer>
        </article>
      </section>

      <section
        aria-labelledby="workspaces-title"
        className={styles.lowerGrid}
        id="workspaces"
      >
        <div className={styles.workspacePanel}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>Workspace map</p>
              <h2 className={styles.sectionTitle} id="workspaces-title">
                Active and planned spaces
              </h2>
            </div>
            <p>
              All five directions remain part of the product vision. Planned
              workspaces are shown as unavailable until their tools exist.
            </p>
          </div>

          <div className={styles.workspaceGrid}>
            {workspaces.map((workspace) => (
              <article
                className={`${styles.workspaceCard} ${
                  workspace.isActive
                    ? styles.workspaceCardActive
                    : styles.workspaceCardUpcoming
                }`}
                key={workspace.name}
                aria-disabled={!workspace.isActive}
              >
                <span className={styles.workspaceStatus}>
                  {workspace.status}
                </span>
                <h3>{workspace.name}</h3>
                <p>{workspace.description}</p>
              </article>
            ))}
          </div>
        </div>

        <aside className={styles.statusPanel} aria-labelledby="status-title">
          <p className={styles.eyebrow}>Project status</p>
          <h2 className={styles.sectionTitle} id="status-title">
            Current focus
          </h2>
          <ul className={styles.statusList}>
            <li>
              <strong>Phase 1 workspace foundation</strong>
              <p>
                Japanese Lyrics Learning is the available implementation target.
              </p>
            </li>
            <li>
              <strong>Private by default</strong>
              <p>No social feed, public profile, or engagement mechanics.</p>
            </li>
            <li>
              <strong>User-provided lyrics</strong>
              <p>
                AoTune does not scrape or collect unlicensed lyric sources.
              </p>
            </li>
          </ul>
        </aside>
      </section>
    </main>
  );
}

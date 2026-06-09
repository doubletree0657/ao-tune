const workspaces = [
  {
    name: "Japanese Lyrics Learning",
    description:
      "Prepare pronunciation, meaning notes, and sing-along practice from lyrics.",
    status: "Phase 1 target",
  },
  {
    name: "Japanese Music Research",
    description: "Collect structured notes about artists, songs, themes, and context.",
    status: "Planned",
  },
  {
    name: "Cosplay Planning",
    description: "Organize character research, references, materials, and plans.",
    status: "Planned",
  },
  {
    name: "Creative Studio",
    description: "Develop prompts, visual concepts, stories, and creative directions.",
    status: "Planned",
  },
  {
    name: "Personal Branding Studio",
    description: "Shape identity-driven materials with intention and consistency.",
    status: "Planned",
  },
];

export default function Home() {
  return (
    <main>
      <section className="hero">
        <p className="eyebrow">Personal-first AI agent workspace</p>
        <h1>AoTune</h1>
        <p className="intro">
          A calm place to turn Japanese music, cosplay, ACGN-inspired ideas, and
          personal identity projects into persistent, useful artifacts.
        </p>
        <p className="phase">Phase 0: project initialization</p>
      </section>

      <section aria-labelledby="workspaces-heading">
        <div className="section-heading">
          <p className="eyebrow">Planned directions</p>
          <h2 id="workspaces-heading">Workspaces</h2>
          <p>
            Japanese Lyrics Learning is the first implementation target. It is
            one part of AoTune's broader creative and personal workspace vision.
          </p>
        </div>

        <div className="grid">
          {workspaces.map((workspace) => (
            <article className="card" key={workspace.name}>
              <span
                className={workspace.status === "Phase 1 target" ? "first" : ""}
              >
                {workspace.status}
              </span>
              <h3>{workspace.name}</h3>
              <p>{workspace.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

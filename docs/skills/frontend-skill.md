# Frontend Skill

Use this skill for changes under `apps/web` or tasks that affect browser-facing
workspace behavior.

## Before Editing

1. Read [`../project/WORKSPACES.md`](../project/WORKSPACES.md).
2. Read [`../project/PRODUCT_SCOPE.md`](../project/PRODUCT_SCOPE.md).
3. Inspect the current components, styles, and TypeScript configuration.
4. Read the i18n skill when changing user-facing text.

## Implementation Guidance

- Use semantic, accessible HTML and preserve responsive behavior.
- Display all five workspace directions appropriately in shared workspace UI.
- Japanese Lyrics Learning may be marked as the first implementation target,
  but never imply that AoTune is only a lyrics learning product.
- Keep workspace interactions task-oriented and artifact-centered.
- Do not turn the application into a social feed, forum, or generic chat page.
- Avoid new UI frameworks, state libraries, and abstractions without a clear
  requirement.
- Do not add image generation or agent behavior unless explicitly requested.

## Visual Direction

AoTune's interface should express a quiet, blue-toned, night-like, youthful,
literary, romantic, reflective, and slightly melancholic mood. This direction
may take emotional inspiration from the atmosphere the owner feels in
Yorushika's music, but it must not copy Yorushika's official artwork, logos,
album covers, typography, or other copyrighted visual assets. It must not imply
an official affiliation or endorsement.

Prefer:

- Deep navy, muted blue, blue-gray, soft cyan, and low-saturation accents.
- Abstract references to night, rain, wind, summer, memory, lyrics, notebooks,
  drafts, and quiet city lights when they support the interface.
- Spacious layouts, soft contrast, gentle borders, subtle gradients, and
  restrained motion.
- A calm workspace atmosphere rather than a loud dashboard, growth product,
  social app, or commercial creator platform.
- Literary and personal-creation cues such as notes, cards, timelines, drafts,
  artifacts, workspaces, moodboards, personal collections, and unfinished ideas.
- Interfaces that help users feel they are privately shaping their own work
  rather than performing for an audience.

Avoid:

- Bright idol-app colors, heavy neon, excessive gradients, noisy anime UI,
  game-like HUDs, and overly cute styling.
- Feeds, likes, follower counts, rankings, trending sections, recommendation
  streams, or other engagement-first layouts.
- Aggressive calls to action, growth banners, creator monetization language,
  marketplace-first layouts, or startup SaaS marketing visuals.
- Copying official Yorushika artwork, logos, album visuals, typography, or other
  copyrighted assets.
- Generic SaaS admin-panel styling that obscures the creative workspace model.

## Creative Workspace Experience

AoTune should feel like a private creative room rather than a public platform.
Frontend design should help users enter a focused state where they can study,
listen, plan, write, refine, and create persistent personal artifacts without
visual noise.

When designing creative flows:

- Prioritize the user's work, notes, drafts, and artifacts over platform
  branding.
- Keep the experience quiet, immersive, and reflective.
- Support long-lived personal projects and revision rather than one-off
  generated outputs.
- Present AI assistance as support for creation, not a replacement for the
  user's taste, judgment, or voice.
- Avoid pressure to publish, share, optimize, monetize, or perform.
- Use empty states and prompts that invite reflection, revision, and personal
  expression.
- Keep workspace navigation clear but visually restrained so it does not
  interrupt creation.

## UI Component Guidance

- Use workspace cards as quiet entry points, not promotional tiles.
- Use artifact cards to emphasize persistent outputs and revision-friendly work.
- Use typography hierarchy and spacing to support a readable, notebook-like
  experience.
- Prefer subtle hover states and transitions that respect reduced-motion
  preferences.
- Make empty states reflective and useful rather than sales-oriented.
- Keep primary actions clear, accessible, and visually restrained.

## UI Copy Tone

Frontend copy should be calm, clear, personal, and centered on creation. Avoid
hype-driven or commercial phrases such as "supercharge," "go viral," "ultimate
creator platform," "AI magic," "monetize your creativity," or "grow your
audience."

Prefer language about learning, listening, planning, drafting, refining,
creating, preserving, and returning to personal artifacts. Keep user-facing copy
ready for English and Chinese localization.

## Verification

Run TypeScript checks and the relevant frontend tests or build. Check the changed
surface at narrow and wide viewport sizes when visual behavior changes.

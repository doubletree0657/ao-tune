# Frontend Skill

Use this skill for changes under `apps/web` or tasks that affect browser-facing
workspace behavior.

## Before Editing

1. Read [`../project/WORKSPACES.md`](../project/WORKSPACES.md).
2. Read [`../project/PRODUCT_SCOPE.md`](../project/PRODUCT_SCOPE.md).
3. Inspect the current components, styles, and TypeScript configuration.
4. Read the i18n skill when changing user-facing text.

## Implementation Guidance

- Keep the interface calm, clean, focused, and consistent with AoTune's
  blue-toned, literary mood.
- Use semantic, accessible HTML and preserve responsive behavior.
- Display all five workspace directions appropriately in shared workspace UI.
- Japanese Lyrics Learning may be marked as the first implementation target,
  but never imply that AoTune is only a lyrics learning product.
- Keep workspace interactions task-oriented and artifact-centered.
- Do not turn the application into a social feed, forum, or generic chat page.
- Avoid new UI frameworks, state libraries, and abstractions without a clear
  requirement.
- Do not add image generation or agent behavior unless explicitly requested.

## Verification

Run TypeScript checks and the relevant frontend tests or build. Check the changed
surface at narrow and wide viewport sizes when visual behavior changes.

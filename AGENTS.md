# AoTune Agent Instructions

This file is the entry point for coding agents working in this repository. Keep
changes aligned with the product vision and current implementation phase.

## Read Before Changing Code

Read these documents before making changes:

1. [`docs/project/PROJECT_VISION.md`](docs/project/PROJECT_VISION.md)
2. [`docs/project/PRODUCT_SCOPE.md`](docs/project/PRODUCT_SCOPE.md)
3. [`docs/project/WORKSPACES.md`](docs/project/WORKSPACES.md)
4. [`docs/engineering/ARCHITECTURE.md`](docs/engineering/ARCHITECTURE.md)
5. [`docs/engineering/CODING_STANDARDS.md`](docs/engineering/CODING_STANDARDS.md)

Also read the task-specific skill:

- Frontend: [`docs/skills/frontend-skill.md`](docs/skills/frontend-skill.md)
- Backend API: [`docs/skills/backend-api-skill.md`](docs/skills/backend-api-skill.md)
- Documentation: [`docs/skills/documentation-skill.md`](docs/skills/documentation-skill.md)
- Internationalization: [`docs/skills/i18n-skill.md`](docs/skills/i18n-skill.md)

For work spanning multiple areas, read each relevant skill. Inspect the current
implementation and tests before proposing or applying changes.

## Project Positioning

AoTune is a personal-first AI agent workspace for Japanese music, cosplay
planning, ACGN-inspired creation, and identity-driven artifacts. It is a
workspace-based product whose agents help users create persistent, useful
artifacts.

Japanese Lyrics Learning is the first implementation target, but it is one of
five equal long-term workspace directions. Explain AoTune from the final product
perspective rather than treating the current MVP as the entire vision.

## Required Boundaries

Unless a task explicitly requests otherwise, do not add:

- Social feeds, follower systems, forums, engagement mechanics, or public-first
  profiles.
- Generic chatbot interfaces that replace the workspace and artifact model.
- Lyrics scraping or unlicensed content collection.
- Image generation as the product's primary purpose.
- Authentication, authorization, IAM integration, or permission models.
- Database models, PostgreSQL integration, pgvector, or migrations.
- LLM providers, agent frameworks, or complex agent workflows.
- New infrastructure, services, or dependencies without a clear task need.

Do not imply an official relationship with Yorushika. Yorushika may be described
only as a personal source of mood and aesthetic inspiration.

## Working Rules

- Keep changes small, direct, and consistent with existing repository patterns.
- Preserve all five workspace directions in shared UI, APIs, and documentation.
- Keep GitHub-facing documentation in English.
- Prepare user-facing application text for English and Chinese localization.
- Update relevant documentation when behavior or architecture changes.
- Run the narrowest useful checks for the files changed.

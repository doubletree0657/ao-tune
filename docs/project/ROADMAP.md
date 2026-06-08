# Roadmap

The roadmap is incremental. Each phase should establish a clear product or
engineering foundation before adding broader automation.

## Phase 0: Initialization and Documentation

- Establish the monorepo, minimal web and API applications, and CI foundation.
- Define product vision, scope, workspace directions, architecture, and agent
  instructions.
- Avoid database, authentication, and LLM integration.

## Phase 1: Japanese Lyrics Learning Foundation

- Create the first real workspace shell and core user flow.
- Define initial domain schemas and localized interface structure.
- Keep content user-directed and avoid lyrics scraping.

## Phase 2: Persistent Artifact Foundation

- Define shared workspace and artifact concepts.
- Add PostgreSQL persistence and migrations when requirements are stable.
- Establish ownership, revisions, and basic organization without premature IAM
  complexity.

## Phase 3: Agent-Assisted Workflows

- Introduce a selected orchestration approach after evaluating LangGraph and the
  OpenAI Agents SDK.
- Add observable, user-controlled agent runs and provider boundaries.
- Consider pgvector only for a demonstrated retrieval need.

## Phase 4: Additional Workspaces

- Expand into Cosplay Planning and Japanese Music Research using the shared
  artifact foundation.
- Validate which patterns are genuinely reusable before abstracting them.

## Phase 5: Creative and Identity Workspaces

- Add Creative Studio and Personal Branding Studio.
- Support richer cross-artifact workflows while preserving each workspace's
  distinct purpose.

## Phase 6: Identity and Governance

- Add identity-aware access control, workspace permissions, and audit logging.
- Evaluate integration with the separate IAM project.
- Introduce collaboration only as explicit, permissioned workspace behavior.

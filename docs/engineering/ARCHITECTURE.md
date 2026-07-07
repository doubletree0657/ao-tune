# Architecture

## Current Monorepo

AoTune uses a small monorepo so product documentation, web UI, and API contracts
can evolve together.

```text
ao-tune/
|-- apps/
|   |-- web/     # Next.js and React frontend
|   `-- api/     # FastAPI service
|-- docs/        # Product, engineering, and agent guidance
|-- .github/     # GitHub Actions workflows
`-- docker-compose.yml
```

### `apps/web`

The frontend owns page composition, user interaction, presentation, and future
localization. It should consume explicit API contracts and avoid embedding
backend or agent orchestration concerns in React components.

### `apps/api`

The API owns HTTP contracts and future application services. Current routes are
limited to health information, workspace template placeholders, application
preferences, and Japanese Lyrics Learning draft creation/loading. Lyrics draft
routes delegate to an application service, which calls a provider selected from
environment configuration before opening a PostgreSQL transaction to persist the
artifact and line cards atomically. Provider selection is environment-aware and
backend-only; the frontend does not expose model switching. In test, only the
fake provider can resolve. In development, `auto` resolves to fake with no LLM
configuration and to the OpenAI-compatible provider only when base URL, model,
and API key are all present. In production, fake is forbidden and complete LLM
configuration is required before the API starts serving requests. The fake
provider returns pending sections without external calls. The OpenAI-compatible
adapter uses the configured chat completions API and validates model output
against Pydantic schemas before returning it. Model output that cannot be
validated becomes a reviewable artifact with a controlled error message. Route
handlers should remain thin, with domain logic moved into focused services only
when that logic exists.

Application settings are currently installation-global. The singleton
`application_settings` table stores one row with `id = 1` and a validated JSONB
`settings` document. The current document contains the selected theme and
Japanese Lyrics Learning Song Sheet display settings:

```json
{
  "theme": "light",
  "lyricsLearning": {
    "songSheet": {
      "showRomaji": true,
      "showTranslation": true,
      "originalTextSize": 30,
      "layoutMode": "continuous"
    }
  }
}
```

All browsers connected to the same database share these settings. The frontend
may use `localStorage` only as a versioned display cache for immediate rendering;
PostgreSQL remains authoritative and is reconciled after startup. When
authentication exists, user settings should be redesigned and bound to user
accounts. The current application-level settings may remain as system defaults
or installation defaults.

The Japanese Lyrics Learning workspace opens saved artifacts into the persisted
reading layout by default. Song view is the continuous lyrics reader; Compact
view lays lyric groups left-to-right and then top-to-bottom to use wider
viewports. The sheet renders only user-provided and persisted line-card content,
ordered by `lineNumber`, with optional romaji and translation visibility,
Japanese original-text size, and reading layout controlled by global
application settings. Romaji and translation remain fixed-size in the current
stage. Review cards remain the editing source for romaji, meaning,
pronunciation notes, sing-along notes, and review state; the Song Sheet is a
projection of the editable line-card state.

## Current Development Runtime

Docker Compose starts PostgreSQL, runs Alembic migrations through a one-shot
container, then starts the FastAPI backend and Next.js frontend. Host-based
development remains available through Node.js/npm and uv. PostgreSQL is used by
the current Japanese Lyrics Learning artifact persistence slice; Redis is not
part of the default runtime.

## Planned Service Boundaries

These are conceptual boundaries, not instructions to create separate deployed
services now:

- **Workspace service:** workspace templates, user workspaces, configuration,
  and lifecycle.
- **Artifact service:** creation, revisions, organization, and export of durable
  workspace outputs.
- **Agent run service:** user-approved runs, status, tool activity, results, and
  observability.
- **PostgreSQL:** authoritative relational storage for workspaces, artifacts,
  permissions, and run metadata.
- **Redis:** optional transient storage or queue support where operational needs
  justify it.
- **LLM provider boundary:** isolates provider-specific clients and credentials
  from domain logic. Future selection may combine an application default,
  workspace preference, and explicit run-level override after those product
  requirements exist.
- **IAM integration:** authenticates identities and enforces workspace and
  artifact permissions with auditable decisions.

## Design Direction

Start as a modular web application and API, not a microservice system. Add
internal modules as behavior appears, keep contracts typed, and split deployment
boundaries only when scale, ownership, reliability, or security requirements
make the benefit concrete.

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
limited to health information, workspace template placeholders, and Japanese
Lyrics Learning draft creation. Lyrics draft routes delegate to an application
service, which calls a provider selected from environment configuration. The
default provider is a local fake that returns pending sections without external
calls. The OpenAI-compatible adapter uses the configured chat completions API
and validates model output against Pydantic schemas before returning it. Model
output that cannot be validated becomes a reviewable artifact with a controlled
error message. Provider selection remains backend-only; the frontend does not
expose model switching. Route handlers should remain thin, with domain logic
moved into focused services only when that logic exists.

## Current Development Runtime

The frontend runs locally through Node.js and npm, and the backend runs locally
through uv. Docker Compose currently manages only external PostgreSQL and Redis
containers for development. The application does not connect to those services
yet, and a full Docker-based frontend and backend runtime is planned for a later
phase.

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

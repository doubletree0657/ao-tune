# AoTune

A personal-first AI agent workspace for Japanese music, cosplay planning, ACGN-inspired creation, and identity-driven artifacts.

## Why AoTune?

AoTune is inspired by the quiet, blue-toned atmosphere I often feel from Yorushika's music: calm, literary, youthful, and slightly melancholic.

I have always been deeply drawn to Yorushika's music, and one of the personal motivations behind this project is to create a workspace where I can study, research, and creatively respond to that world more systematically.

That inspiration also connects with the romantic visual language of ACGN culture: characters, memory, summer, identity, self-expression, and the feeling of turning personal interests into structured and creative artifacts.

AoTune is designed as a personal-first AI agent workspace for Japanese music, cosplay planning, ACGN-inspired creation, and personal identity projects. It helps users create and refine persistent artifacts such as learning notes, research cards, cosplay plans, creative prompts, visual concepts, and personal branding materials.

Yorushika is a personal source of mood and aesthetic inspiration, not an official affiliation, endorsement, or ownership relationship.

The project aims to be calm and literary in mood, while remaining practical in engineering: workspace-based agent workflows, persistent artifacts, user preferences, bilingual interfaces, and future identity-aware access control.

## Planned Workspaces

- Japanese Lyrics Learning
- Japanese Music Research
- Cosplay Planning
- Creative Studio
- Personal Branding Studio

## Current Status

- Phase 0: project initialization
- Phase 1 target: Japanese Lyrics Learning workspace foundation

## Tech Stack

- Next.js / React / TypeScript
- FastAPI / Python
- uv for backend dependencies and virtual environments
- PostgreSQL 16 for durable Japanese Lyrics Learning artifacts
- SQLAlchemy async, asyncpg, and Alembic for backend persistence
- LangGraph or OpenAI Agents SDK planned
- Docker Compose for the local application runtime

## Repository Structure

```text
ao-tune/
|-- apps/
|   |-- api/      # FastAPI service
|   `-- web/      # Next.js application
|-- docs/         # Product and architecture documentation
|-- .github/      # Continuous integration workflows
`-- docker-compose.yml
```

## Local Development

A clean clone can run the current application with Docker only:

```bash
docker compose up --build
```

Compose starts PostgreSQL, runs Alembic migrations, starts the API at
<http://localhost:8000>, and starts the web app at <http://localhost:3000>.
Compose loads `apps/api/.env.local` for the API container when that file exists.
If the file is absent or has no LLM configuration, the API defaults to
`AOTUNE_APP_ENV=development` and `AOTUNE_AGENT_PROVIDER=auto`, which resolves to
the fake provider.

```bash
cp apps/api/.env.example apps/api/.env.local
```

Use the same ignored `apps/api/.env.local` file for Docker and host-based API
development. To run the real provider locally, set `AOTUNE_LLM_BASE_URL`,
`AOTUNE_LLM_MODEL`, and `AOTUNE_LLM_API_KEY` there. Do not commit real API keys.

Host-based development remains available when you want fast reload loops.

Prerequisites: Node.js 22, npm, Python 3.12, uv, and Docker with the Compose
plugin when running the external services.

### External Services

```bash
docker compose up -d postgres
cd apps/api
uv run alembic upgrade head
```

The backend reads `AOTUNE_DATABASE_URL`. For host-based development the default
is `postgresql+asyncpg://aotune:aotune@localhost:5432/aotune`; inside Compose
the database hostname is `postgres`.

### Backend

```bash
cp apps/api/.env.example apps/api/.env.local
cd apps/api
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

The local environment file is optional and is also loaded by Docker Compose for
the API service. Keep the default `development`/`auto` configuration for
credential-free development, or add local provider settings to `.env.local`.
Process environment variables override `.env.local` values in host-based API
development. In Compose, the container database URL is fixed to the `postgres`
service hostname. Never commit `.env.local` or real API keys.

The API is available at <http://localhost:8000>. Verify it with:

```bash
curl http://localhost:8000/health
curl http://localhost:8000/api/workspaces/templates
```

Create and load a persisted lyrics-learning draft:

```bash
curl -X POST http://localhost:8000/api/lyrics-learning/drafts \
  -H "Content-Type: application/json" \
  -d '{"songTitle":"Sample","artist":"Sample artist","learningGoal":"Practice pronunciation."}'

curl http://localhost:8000/api/lyrics-learning/drafts/<id>
```

### Frontend

```bash
cd apps/web
npm install
npm run dev
```

Open <http://localhost:3000>.

The frontend calls `http://localhost:8000` by default. To use another local API
URL, copy `.env.example` to `.env.local` and change
`NEXT_PUBLIC_API_BASE_URL`.

### Verification

```bash
cd apps/api
uv run ruff check .
uv run pytest

cd ../web
npm run typecheck
npm run build
```

PostgreSQL persistence tests require `AOTUNE_TEST_DATABASE_URL` and are run in
CI against an isolated `aotune_test` database.

## Roadmap

- Phase 0: monorepo initialization
- Phase 1: Japanese Lyrics Learning workspace
- Phase 2: workspace artifact model
- Phase 3: agent-assisted lyrics learning workflow
- Phase 4: cosplay planning workspace
- Phase 5: creative studio
- Phase 6: identity-aware access control and audit logging

## License

AoTune is available under the [MIT License](LICENSE).

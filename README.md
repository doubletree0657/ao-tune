# AoTune

A personal-first AI agent workspace for Japanese music, cosplay planning, ACGN-inspired creation, and identity-driven artifacts.

## Why AoTune?

AoTune is inspired by the quiet, blue-toned atmosphere I often feel from Yorushika and Japanese music: calm, literary, youthful, and slightly melancholic.

The name represents the mood I want this project to carry. It is not only about songs, lyrics, or music learning. It is also about the romantic visual language of ACGN culture - characters, memory, summer, identity, self-expression, and the feeling of turning personal interests into something structured and creative.

AoTune is designed as a personal-first AI agent workspace for Japanese music, cosplay planning, ACGN-inspired creation, and personal identity projects. It helps users transform their interests into persistent artifacts such as learning notes, research cards, cosplay plans, creative prompts, visual concepts, and personal branding materials.

The project aims to be calm and literary in mood, while remaining practical in engineering: workspace-based agent workflows, persistent artifacts, user preferences, bilingual interfaces, and future identity-aware access control.

## Planned Workspaces

- Japanese Lyrics Learning
- Cosplay Planning
- Creative Studio
- Japanese Music Research
- Personal Branding Studio

## Current Status

- Phase 0: project initialization
- Phase 1 target: Japanese Lyrics Learning workspace foundation

## Tech Stack

- Next.js / React / TypeScript
- FastAPI / Python
- uv
- PostgreSQL planned
- LangGraph or OpenAI Agents SDK planned
- Docker Compose planned

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

### Frontend

```bash
cd apps/web
npm install
npm run dev
```

Open <http://localhost:3000>.

### Backend

Install [uv](https://docs.astral.sh/uv/), then run:

```bash
cd apps/api
uv sync --dev
uv run uvicorn app.main:app --reload
```

The API is available at <http://localhost:8000>. Check it with:

```bash
curl http://localhost:8000/health
curl http://localhost:8000/api/workspaces/templates
```

### Planned Local Services

PostgreSQL and Redis placeholders can be started with:

```bash
docker compose up -d
```

The application does not connect to these services in Phase 0.

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

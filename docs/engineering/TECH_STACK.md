# Technical Stack

## Current Implementation

| Area | Technology | Purpose |
| --- | --- | --- |
| Frontend | Next.js, React, TypeScript | Provides the typed web application and routing foundation. |
| Backend | FastAPI, Python | Provides a small, explicit HTTP API with generated schema support. |
| Python tooling | uv | Manages backend dependencies, the local `.venv`, lock resolution, and repeatable commands. |
| API schemas | Pydantic | Validates request and response contracts. |
| Local configuration | python-dotenv | Loads optional backend `.env.local` values while preserving process environment overrides. |
| HTTP client | httpx | Calls configured OpenAI-compatible chat completions APIs and supports isolated transport mocking. |
| Agent provider boundary | Python protocols and environment configuration | Keeps the fake implementation as the default while supporting provider-specific adapters. |
| Testing and quality | pytest, Ruff, TypeScript | Covers focused API tests, Python quality, and frontend type safety. |
| Automation | GitHub Actions | Runs frontend and backend checks in the current repository. |

Backend setup uses `uv sync`; backend commands run through `uv run` without
manual virtual environment activation. The repository also includes a minimal
Docker Compose definition for local PostgreSQL and Redis containers, but
application code does not use them yet.

## Planned Additions

| Area | Technology | Intended use |
| --- | --- | --- |
| Relational data | PostgreSQL | Store users, workspaces, artifacts, and agent-run metadata. |
| Vector search | pgvector | Support retrieval only where semantic search has a validated use case. |
| Transient state | Redis | Support caching, queues, or short-lived run state if required. |
| Agent orchestration | LangGraph or OpenAI Agents SDK | Coordinate observable, user-directed agent workflows after evaluation. |
| LLM adapters | OpenAI-compatible APIs or local model adapters | Generate structured workspace artifacts behind provider-agnostic service interfaces. |
| Local infrastructure | Docker Compose | Run application dependencies consistently during development. |
| Identity | Separate IAM integration or compatible provider | Provide future identity, permissions, and audit boundaries. |

Planned technologies are not commitments to immediate implementation. Add them
only when a roadmap phase and concrete requirements justify the complexity.
The OpenAI-compatible provider requires credentials only when explicitly
selected; default fake mode remains fully local and credential-free.

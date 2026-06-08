# Backend API Skill

Use this skill for changes under `apps/api` or tasks that affect HTTP contracts.

## Before Editing

1. Read [`../project/WORKSPACES.md`](../project/WORKSPACES.md).
2. Read [`../engineering/ARCHITECTURE.md`](../engineering/ARCHITECTURE.md).
3. Inspect current routes, Pydantic schemas, and tests.

## Implementation Guidance

- Use Pydantic models for request and response contracts.
- Keep FastAPI route handlers simple, typed, and transport-focused.
- Add service layers only when real domain logic warrants them.
- Preserve all five workspace templates and their stable identifiers.
- Keep Japanese Lyrics Learning as the first target and all other templates as
  planned placeholders until their phases begin.
- Do not add database integration, authentication, authorization, IAM, LLM
  providers, or agent orchestration unless explicitly requested.
- Do not introduce lyrics scraping or external content collection.
- Keep error responses and status codes explicit and test contract changes.

## Verification

Run Ruff and focused pytest coverage. Update API documentation and consumers when
a response contract changes.

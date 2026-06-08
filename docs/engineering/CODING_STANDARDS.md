# Coding Standards

## General Rules

- Read the relevant project and skill documents before changing code.
- Keep changes small, focused, and easy to review.
- Follow existing repository structure and language conventions.
- Prefer direct code over speculative abstractions.
- Do not add a dependency without a clear requirement and maintenance benefit.
- Keep secrets out of source control; document required variables in examples.
- Update tests and documentation when behavior or contracts change.
- Preserve backward compatibility unless the task explicitly changes a contract.

## Frontend

- Use TypeScript with strict typing; avoid `any` unless externally constrained.
- Keep components focused and use server/client boundaries intentionally.
- Keep user-facing strings ready for localization.
- Maintain accessible semantic HTML and keyboard-usable interactions.
- Do not introduce a styling system or state library without demonstrated need.

## Backend

- Use Pydantic models for API request and response schemas.
- Keep FastAPI route handlers small and explicit.
- Separate domain logic from transport code when complexity warrants it.
- Return stable, typed contracts and test important behavior.
- Use async code only where the underlying operation benefits from it.

## Quality Checks

Run the narrowest relevant checks first, then broader checks when shared behavior
changes. Typical commands are:

```bash
cd apps/web && npm run typecheck && npm run build
cd apps/api && uv run ruff check . && uv run pytest
```

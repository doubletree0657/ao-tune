# AoTune API

Minimal FastAPI service for the AoTune workspace application.

```bash
uv sync
uv run uvicorn app.main:app --reload
```

Run checks with:

```bash
uv run ruff check .
uv run pytest
```

Create a lyrics-learning draft through the fake agent provider with:

```bash
curl -X POST http://localhost:8000/api/lyrics-learning/drafts \
  -H "Content-Type: application/json" \
  -d '{
    "songTitle": "Sample song title",
    "artist": "Sample artist",
    "learningGoal": "Practice pronunciation and sing along."
  }'
```

The route delegates to `LyricsLearningDraftService`, which calls the
`LyricsLearningAgentProvider` abstraction. The current fake provider returns
pending generated sections only. It does not fetch lyrics, call an LLM, or
persist the draft.

## Agent Provider Configuration

The default mode requires no credentials:

```bash
AOTUNE_AGENT_PROVIDER=fake
AOTUNE_DEFAULT_LLM_PROFILE=default
AOTUNE_LLM_PROVIDER=openai-compatible
AOTUNE_LLM_BASE_URL=
AOTUNE_LLM_MODEL=
AOTUNE_LLM_API_KEY=
AOTUNE_LLM_TIMEOUT_SECONDS=60
```

`openai-compatible` is a placeholder provider that makes no network calls and
returns HTTP 501 when selected. Future adapters can use the same provider
interface for OpenAI-compatible APIs or local models without changing the draft
API or service workflow.

The prompt contract in `app/agents/lyrics_learning_prompt.py` accepts song
metadata, a learning goal, and user-provided lyrics or notes. It requires
structured, editable pronunciation and learning drafts, prohibits fetching
lyrics, and marks uncertain readings for review.

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

Create a mock lyrics-learning agent draft with:

```bash
curl -X POST http://localhost:8000/api/lyrics-learning/drafts \
  -H "Content-Type: application/json" \
  -d '{
    "songTitle": "Sample song title",
    "artist": "Sample artist",
    "learningGoal": "Practice pronunciation and sing along."
  }'
```

The response contains pending generated sections only. It does not fetch lyrics,
call an LLM, or persist the draft.

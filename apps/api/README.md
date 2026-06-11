# AoTune API

Minimal FastAPI service for the AoTune workspace application.

```bash
uv sync
cp .env.example .env.local
uv run uvicorn app.main:app --reload
```

`.env.local` is optional and ignored by Git. Keep fake mode for credential-free
development, or fill the OpenAI-compatible provider values in that file. Never
commit `.env.local` or real API keys.

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
    "learningGoal": "Practice pronunciation and sing along.",
    "lyricsText": "User-provided Japanese study line",
    "studyNotes": "Focus on clear vowels."
  }'
```

The route delegates to `LyricsLearningDraftService`, which calls the
`LyricsLearningAgentProvider` abstraction. The current fake provider returns
pending generated sections only. It does not fetch lyrics, call an LLM, or
persist the draft.

## Agent Provider Configuration

Copy the committed template for local development:

```bash
cp .env.example .env.local
```

The default mode requires no credentials. Edit `.env.local` only when local
provider configuration is needed:

```bash
AOTUNE_AGENT_PROVIDER=fake
AOTUNE_DEFAULT_LLM_PROFILE=default
AOTUNE_LLM_PROVIDER=openai-compatible
AOTUNE_LLM_BASE_URL=
AOTUNE_LLM_MODEL=
AOTUNE_LLM_API_KEY=
AOTUNE_LLM_TIMEOUT_SECONDS=60
```

Configuration precedence is process environment variables first, `.env.local`
values second, and application defaults last. This lets shell and CI settings
override local file values. The API starts normally when `.env.local` does not
exist.

`openai-compatible` sends a chat completions request to
`AOTUNE_LLM_BASE_URL/chat/completions`. Base URL, model, and API key are required
only when that provider is selected. Invalid structured model output returns a
reviewable draft instead of an unhandled parsing error.

The prompt contract in `app/agents/lyrics_learning_prompt.py` accepts song
metadata, a learning goal, user-provided lyrics text, and separate study notes.
Only `lyricsText` may produce line cards; `studyNotes` guides emphasis and
practice advice. The contract prohibits fetching lyrics and marks uncertain
readings for review. The legacy `lyricsOrNotes` field remains accepted as study
context, but new clients should use the separated fields.

The response keeps pending `generatedSections` for fake mode. Real structured
output is returned in `agentOutput`, with line cards containing romaji,
approximate Chinese pronunciation, meaning, pronunciation notes, sing-along
notes, confidence, and review state.

# AoTune API

Minimal FastAPI service for the AoTune workspace application.

```bash
uv sync
cp .env.example .env.local
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

`.env.local` is optional and ignored by Git. The development default uses the
fake provider unless complete OpenAI-compatible values are configured. Never
commit `.env.local` or real API keys. Docker Compose also loads this same file
for the API container at runtime; it is not copied into the image.

Run checks with:

```bash
cd ../..
docker compose --profile test run --rm api-test

cd apps/api
uv run ruff check .
```

The Docker test profile starts `postgres-test` with temporary storage and sets
`AOTUNE_APP_ENV=test`, `AOTUNE_AGENT_PROVIDER=fake`, and
`AOTUNE_TEST_DATABASE_URL` to the isolated `aotune_test` database. Do not point
`AOTUNE_TEST_DATABASE_URL` at the development `aotune` database; destructive
persistence tests refuse to run before migration or truncation unless the target
database name is explicitly a test database.

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
`LyricsLearningAgentProvider` abstraction before opening a database transaction.
The current fake provider returns pending generated sections only. It does not
fetch lyrics or call an LLM. The service persists the resulting artifact and any
line cards in PostgreSQL.

## Agent Provider Configuration

Copy the committed template for local development:

```bash
cp .env.example .env.local
```

The default development mode requires no credentials. Edit `.env.local` only
when local provider configuration is needed:

```bash
AOTUNE_APP_ENV=development
AOTUNE_AGENT_PROVIDER=auto
AOTUNE_DATABASE_URL=postgresql+asyncpg://aotune:aotune@localhost:5432/aotune
AOTUNE_DEFAULT_LLM_PROFILE=default
AOTUNE_LLM_BASE_URL=
AOTUNE_LLM_MODEL=
AOTUNE_LLM_API_KEY=
AOTUNE_LLM_TIMEOUT_SECONDS=60
```

Configuration precedence is process environment variables first, `.env.local`
values second, and application defaults last. This lets shell and CI settings
override local file values. The API starts normally when `.env.local` does not
exist. In Docker Compose, `apps/api/.env.local` is loaded as an optional runtime
env file and `AOTUNE_DATABASE_URL` is overridden to use the `postgres` service
hostname.

Run migrations before starting the API:

```bash
uv run alembic upgrade head
```

## Application Settings

AoTune stores application display settings in PostgreSQL. The current
implementation is application-global because user accounts do not exist yet: all
browsers connected to the same database share the selected theme and Japanese
Lyrics Learning Song Sheet display settings.

The `application_settings` table is a singleton table seeded by Alembic with
`id = 1`. Database constraints keep the row ID fixed to `1` and require
`settings` to be a JSON object. The API validates known settings with typed
schemas and does not expose arbitrary JSON writes.

Current JSONB document:

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

Read the current settings:

```bash
curl http://localhost:8000/api/settings
```

Example response:

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
  },
  "updatedAt": "2026-07-02T00:00:00Z"
}
```

Update the theme:

```bash
curl -X PATCH http://localhost:8000/api/settings \
  -H "Content-Type: application/json" \
  -d '{"theme": "midnight"}'
```

Update one Song Sheet option without replacing unrelated settings:

```bash
curl -X PATCH http://localhost:8000/api/settings \
  -H "Content-Type: application/json" \
  -d '{"lyricsLearning":{"songSheet":{"showTranslation":false}}}'
```

Update the Japanese original-text size or reading layout without changing theme,
Romaji visibility, or translation visibility:

```bash
curl -X PATCH http://localhost:8000/api/settings \
  -H "Content-Type: application/json" \
  -d '{"lyricsLearning":{"songSheet":{"originalTextSize":24,"layoutMode":"compact"}}}'
```

PATCH requests are partial. The backend locks the singleton row, validates the
stored JSON document, merges only provided fields with the latest database
value, updates `updated_at` when a real setting changes, and preserves unrelated
settings. `originalTextSize` is an integer from `18` to `36`, and `layoutMode`
is `continuous`, `compact`, or `sing_along`. Unsupported themes, non-boolean
Song Sheet values, invalid font sizes, invalid layouts, unknown fields, and
invalid nested structures are rejected.

The frontend may keep `aotune.application-settings-cache.v1` in `localStorage`
only as a display cache to apply the last known theme and Song Sheet visibility
before first paint. PostgreSQL remains the authoritative settings source and is
reconciled after startup. A future authenticated implementation should redesign
settings as account-bound user settings; the singleton row can remain as a
system default or installation default.

The Japanese Lyrics Learning workspace opens a selected artifact into the
persisted reading layout by default. Reader is a continuous single-column
lyrics reader. Overview arranges lyric groups in a dense fixed grid for global
browsing. Sing-along is a frontend adaptive flow over the same independent Line
Cards and persists `sing_along`; it does not change the Lyrics Learning API or
database line-card schema. Editor remains the editing source for line-card
romaji, meaning, notes, and review state. The reading layouts display only
user-provided lyrics content and persisted line-card fields ordered by
`lineNumber`; they do not fetch, reconstruct, or infer copyrighted lyrics.
Japanese original-text size is adjustable. Romaji and translation visibility are
settings, but their font sizes remain fixed in this stage. Romaji segmentation
is not implemented yet.

`AOTUNE_APP_ENV` accepts `test`, `development`, or `production`; the default is
`development`. `AOTUNE_AGENT_PROVIDER` accepts `auto`, `fake`, or
`openai-compatible`; the default is `auto`.

In `test`, `auto` and `fake` resolve to the fake provider, while
`openai-compatible` is rejected. In `development`, `fake` always resolves to
fake, `openai-compatible` requires complete LLM configuration, and `auto` uses
fake when no LLM values are present or the real provider when base URL, model,
and API key are all present. Partial LLM configuration is rejected. In
`production`, fake is forbidden and `auto` or `openai-compatible` require
complete LLM configuration before the API starts serving requests.

`openai-compatible` sends a chat completions request to
`AOTUNE_LLM_BASE_URL/chat/completions`. Invalid structured model output returns
a reviewable draft instead of an unhandled parsing error. Startup logs include
the app environment, configured provider, resolved provider, profile, and model;
secrets and user content are not logged.

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

Load a saved draft with:

```bash
curl http://localhost:8000/api/lyrics-learning/drafts/<id>
```

List saved draft summaries with:

```bash
curl "http://localhost:8000/api/lyrics-learning/drafts?limit=50"
```

The summary response contains `id`, `songTitle`, `artist`, `status`,
`provider`, `model`, `lineCardCount`, `needsReviewCount`, `createdAt`, and
`updatedAt`. It does not include lyrics text, study notes, generated sections,
or full line-card content.

Persist review edits by sending the complete current `lineCards` collection.
Only `lineNumber`, `romaji`, `approximateChinesePronunciation`, `meaning`,
`pronunciationNotes`, `singAlongNotes`, and `needsReview` are accepted.
Immutable fields such as original lyrics text, confidence, provider metadata,
prompt contract version, IDs, and timestamps are not editable.

```bash
curl -X PATCH http://localhost:8000/api/lyrics-learning/drafts/<id> \
  -H "Content-Type: application/json" \
  -d '{
    "lineCards": [
      {
        "lineNumber": 1,
        "romaji": "sample",
        "approximateChinesePronunciation": null,
        "meaning": "sample meaning",
        "pronunciationNotes": [],
        "singAlongNotes": [],
        "needsReview": false
      }
    ]
  }'
```

import asyncio

import httpx

from app.agents.lyrics_learning_provider import FakeLyricsLearningAgentProvider
from app.api.routes.lyrics_learning import get_lyrics_learning_draft_service
from app.main import app
from app.schemas.lyrics_learning import (
    LyricsLearningDraftRequest,
    LyricsLearningDraftResponse,
)
from app.services.lyrics_learning_service import LyricsLearningDraftService


async def get(path: str) -> httpx.Response:
    transport = httpx.ASGITransport(app=app)

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        return await client.get(path)


async def post(path: str, json: dict[str, str]) -> httpx.Response:
    transport = httpx.ASGITransport(app=app)

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        return await client.post(path, json=json)


async def options(path: str) -> httpx.Response:
    transport = httpx.ASGITransport(app=app)

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        return await client.options(
            path,
            headers={
                "Access-Control-Request-Headers": "content-type",
                "Access-Control-Request-Method": "POST",
                "Origin": "http://localhost:3000",
            },
        )


def test_health() -> None:
    response = asyncio.run(get("/health"))

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "aotune-api"}


def test_workspace_templates() -> None:
    response = asyncio.run(get("/api/workspaces/templates"))
    templates = response.json()

    assert response.status_code == 200
    assert len(templates) == 5
    assert [item["id"] for item in templates] == [
        "japanese-lyrics-learning",
        "japanese-music-research",
        "cosplay-planning",
        "creative-studio",
        "personal-branding-studio",
    ]
    assert templates[0]["status"] == "phase-1"
    assert all(item["status"] == "placeholder" for item in templates[1:])


def test_create_lyrics_learning_draft(monkeypatch) -> None:
    monkeypatch.delenv("AOTUNE_AGENT_PROVIDER", raising=False)
    response = asyncio.run(
        post(
            "/api/lyrics-learning/drafts",
            json={
                "songTitle": "だから僕は音楽を辞めた",
                "artist": "Yorushika",
                "learningGoal": "I want to learn pronunciation and sing along.",
                "lyricsText": "学習用の一行",
                "studyNotes": "Focus on rhythm and clear vowel timing.",
            },
        )
    )
    draft = response.json()

    assert response.status_code == 201
    assert draft["id"]
    assert draft["songTitle"] == "だから僕は音楽を辞めた"
    assert draft["artist"] == "Yorushika"
    assert draft["learningGoal"] == (
        "I want to learn pronunciation and sing along."
    )
    assert draft["sourceType"] == "user_provided"
    assert draft["status"] == "pending_agent_generation"
    assert draft["lyricsText"] == "学習用の一行"
    assert draft["studyNotes"] == "Focus on rhythm and clear vowel timing."
    assert draft["userContext"] == "Focus on rhythm and clear vowel timing."
    assert draft["providerMetadata"] == {
        "provider": "fake",
        "model": None,
        "profile": "default",
        "mode": "pending_agent_generation",
    }
    assert [section["key"] for section in draft["generatedSections"]] == [
        "romaji_alignment",
        "chinese_pronunciation",
        "line_by_line_meaning",
        "pronunciation_notes",
        "sing_along_notes",
        "review_cards",
    ]
    assert [section["label"] for section in draft["generatedSections"]] == [
        "Romaji alignment",
        "Approximate Chinese pronunciation",
        "Line-by-line meaning",
        "Pronunciation notes",
        "Sing-along notes",
        "Review cards and learning artifacts",
    ]
    assert all(
        section["status"] == "pending"
        and section["value"] == "Pending agent generation"
        for section in draft["generatedSections"]
    )


def test_create_lyrics_learning_draft_uses_agent_provider() -> None:
    class TrackingProvider:
        def __init__(self) -> None:
            self.request: LyricsLearningDraftRequest | None = None
            self.fake_provider = FakeLyricsLearningAgentProvider()

        async def create_draft(
            self,
            request: LyricsLearningDraftRequest,
        ) -> LyricsLearningDraftResponse:
            self.request = request
            return await self.fake_provider.create_draft(request)

    provider = TrackingProvider()
    service = LyricsLearningDraftService(provider=provider)

    async def get_tracking_service() -> LyricsLearningDraftService:
        return service

    app.dependency_overrides[get_lyrics_learning_draft_service] = get_tracking_service

    try:
        response = asyncio.run(
            post(
                "/api/lyrics-learning/drafts",
                json={
                    "songTitle": "Sample song title",
                    "artist": "Sample artist",
                    "learningGoal": "Practice pronunciation.",
                    "lyricsText": "学習用の一行",
                    "studyNotes": "User-provided practice notes.",
                },
            )
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 201
    assert provider.request is not None
    assert provider.request.song_title == "Sample song title"
    assert provider.request.artist == "Sample artist"
    assert provider.request.learning_goal == "Practice pronunciation."
    assert provider.request.lyrics_text == "学習用の一行"
    assert provider.request.study_notes == "User-provided practice notes."
    assert all(
        section["status"] == "pending"
        for section in response.json()["generatedSections"]
    )


def test_lyrics_learning_draft_allows_local_frontend_origin() -> None:
    response = asyncio.run(options("/api/lyrics-learning/drafts"))

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == (
        "http://localhost:3000"
    )
    assert "content-type" in response.headers["access-control-allow-headers"].lower()

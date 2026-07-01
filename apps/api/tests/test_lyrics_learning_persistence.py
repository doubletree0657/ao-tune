import asyncio
import os
from collections.abc import AsyncIterator
from pathlib import Path
from uuid import uuid4

import httpx
import pytest
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from alembic import command
from app.agents.lyrics_learning_prompt import PROMPT_CONTRACT_VERSION
from app.agents.lyrics_learning_provider import (
    FakeLyricsLearningAgentProvider,
    ProviderRequestError,
)
from app.api.routes.lyrics_learning import get_lyrics_learning_draft_service
from app.main import app
from app.repositories.lyrics_learning_repository import (
    SQLAlchemyLyricsLearningArtifactRepository,
)
from app.schemas.lyrics_learning import (
    LyricsLearningAgentOutput,
    LyricsLearningDraftRequest,
    LyricsLearningDraftResponse,
    LyricsLineCard,
    ProviderMetadata,
    build_generated_sections,
)
from app.services.lyrics_learning_service import LyricsLearningDraftService

TEST_DATABASE_URL = os.environ.get("AOTUNE_TEST_DATABASE_URL")

pytestmark = pytest.mark.skipif(
    not TEST_DATABASE_URL,
    reason="AOTUNE_TEST_DATABASE_URL is required for PostgreSQL persistence tests.",
)


@pytest.fixture(scope="session", autouse=True)
def migrated_database() -> None:
    assert TEST_DATABASE_URL is not None
    os.environ["AOTUNE_DATABASE_URL"] = TEST_DATABASE_URL
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    command.upgrade(config, "head")


@pytest.fixture
def session_factory() -> async_sessionmaker[AsyncSession]:
    assert TEST_DATABASE_URL is not None
    engine = create_async_engine(TEST_DATABASE_URL)
    factory = async_sessionmaker(engine, expire_on_commit=False)

    async def truncate() -> None:
        async with engine.begin() as connection:
            await connection.execute(
                text(
                    "truncate table lyrics_learning_line_cards, "
                    "lyrics_learning_artifacts restart identity cascade"
                )
            )

    asyncio.run(truncate())
    return factory


async def post(path: str, json: dict[str, str]) -> httpx.Response:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        return await client.post(path, json=json)


async def get(path: str) -> httpx.Response:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        return await client.get(path)


def override_service(
    provider,
    session_factory: async_sessionmaker[AsyncSession],
):
    async def get_test_service() -> AsyncIterator[LyricsLearningDraftService]:
        async with session_factory() as session:
            yield LyricsLearningDraftService(
                provider=provider,
                repository=SQLAlchemyLyricsLearningArtifactRepository(session),
            )

    return get_test_service


def test_post_persists_and_get_returns_same_contract(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    app.dependency_overrides[get_lyrics_learning_draft_service] = override_service(
        FakeLyricsLearningAgentProvider(),
        session_factory,
    )
    try:
        post_response = asyncio.run(
            post(
                "/api/lyrics-learning/drafts",
                json={
                    "songTitle": "Sample song title",
                    "artist": "Sample artist",
                    "learningGoal": "Practice pronunciation.",
                    "lyricsText": "学習用の一行",
                    "studyNotes": "Focus on vowels.",
                },
            )
        )
        draft = post_response.json()
        get_response = asyncio.run(get(f"/api/lyrics-learning/drafts/{draft['id']}"))
    finally:
        app.dependency_overrides.clear()

    assert post_response.status_code == 201
    assert get_response.status_code == 200
    assert get_response.json() == draft

    async def stored_prompt_version() -> str:
        async with session_factory() as session:
            result = await session.execute(
                text("select prompt_contract_version from lyrics_learning_artifacts")
            )
            return result.scalar_one()

    assert asyncio.run(stored_prompt_version()) == PROMPT_CONTRACT_VERSION


def test_post_persists_generated_line_cards(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    class StaticProvider:
        async def create_draft(
            self,
            request: LyricsLearningDraftRequest,
        ) -> LyricsLearningDraftResponse:
            return LyricsLearningDraftResponse(
                id=str(uuid4()),
                song_title=request.song_title,
                artist=request.artist,
                learning_goal=request.learning_goal,
                source_type="user_provided",
                status="needs_review",
                lyrics_text=request.lyrics_text,
                study_notes=request.study_notes,
                user_context=request.study_notes,
                generated_sections=build_generated_sections(
                    status="needs_review",
                    provider_mode="structured_generation",
                ),
                provider_metadata=ProviderMetadata(
                    provider="test-provider",
                    model="test-model",
                    profile="default",
                    mode="structured_generation",
                ),
                agent_output=LyricsLearningAgentOutput(
                    line_cards=[
                        LyricsLineCard(
                            line_number=1,
                            original_text="学びたい一行",
                            romaji="manabitai ichigyou",
                            approximate_chinese_pronunciation="示例发音提示",
                            meaning="想学习的一行歌词。",
                            pronunciation_notes=["注意元音。"],
                            sing_along_notes=["慢速练习。"],
                            confidence=0.75,
                            needs_review=True,
                        )
                    ],
                    pronunciation_notes=["Overall pronunciation note."],
                    sing_along_notes=["Overall sing-along note."],
                    review_cards=["Review the reading."],
                ),
            )

    app.dependency_overrides[get_lyrics_learning_draft_service] = override_service(
        StaticProvider(),
        session_factory,
    )
    try:
        post_response = asyncio.run(
            post(
                "/api/lyrics-learning/drafts",
                json={
                    "songTitle": "Sample song title",
                    "artist": "Sample artist",
                    "learningGoal": "Practice pronunciation.",
                    "lyricsText": "学びたい一行",
                },
            )
        )
        draft = post_response.json()
        get_response = asyncio.run(get(f"/api/lyrics-learning/drafts/{draft['id']}"))
    finally:
        app.dependency_overrides.clear()

    assert post_response.status_code == 201
    assert get_response.status_code == 200
    persisted = get_response.json()
    assert persisted["agentOutput"]["lineCards"][0]["romaji"] == "manabitai ichigyou"
    assert persisted["agentOutput"]["pronunciationNotes"] == [
        "Overall pronunciation note."
    ]
    assert persisted["providerMetadata"] == {
        "provider": "test-provider",
        "model": "test-model",
        "profile": "default",
        "mode": "structured_generation",
    }


def test_get_missing_draft_returns_404(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    app.dependency_overrides[get_lyrics_learning_draft_service] = override_service(
        FakeLyricsLearningAgentProvider(),
        session_factory,
    )
    try:
        response = asyncio.run(get(f"/api/lyrics-learning/drafts/{uuid4()}"))
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 404
    assert response.json() == {"detail": "Lyrics learning draft not found."}


def test_provider_failure_does_not_insert_artifact(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    class FailingProvider:
        async def create_draft(
            self,
            request: LyricsLearningDraftRequest,
        ) -> LyricsLearningDraftResponse:
            raise ProviderRequestError("Provider failed before persistence.")

    app.dependency_overrides[get_lyrics_learning_draft_service] = override_service(
        FailingProvider(),
        session_factory,
    )
    try:
        response = asyncio.run(
            post(
                "/api/lyrics-learning/drafts",
                json={
                    "songTitle": "Sample song title",
                    "artist": "Sample artist",
                    "learningGoal": "Practice pronunciation.",
                },
            )
        )
    finally:
        app.dependency_overrides.clear()

    async def artifact_count() -> int:
        async with session_factory() as session:
            result = await session.execute(
                text("select count(*) from lyrics_learning_artifacts")
            )
            return result.scalar_one()

    assert response.status_code == 502
    assert response.json() == {"detail": "Provider failed before persistence."}
    assert asyncio.run(artifact_count()) == 0

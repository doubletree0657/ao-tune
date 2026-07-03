import asyncio
import os
from collections.abc import AsyncIterator
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse
from uuid import uuid4

import httpx
import pytest
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from alembic import command
from app.agents.lyrics_learning_prompt import PROMPT_CONTRACT_VERSION
from app.agents.lyrics_learning_provider import (
    FakeLyricsLearningAgentProvider,
    ProviderRequestError,
)
from app.api.routes.lyrics_learning import get_lyrics_learning_draft_service
from app.config import Settings
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
ALLOWED_TEST_DATABASE_NAME = "aotune_test"

pytestmark = pytest.mark.skipif(
    not TEST_DATABASE_URL,
    reason="AOTUNE_TEST_DATABASE_URL is required for PostgreSQL persistence tests.",
)


@pytest.fixture(scope="session", autouse=True)
def migrated_database() -> None:
    assert TEST_DATABASE_URL is not None
    assert_test_database_is_safe(TEST_DATABASE_URL)
    original_database_url = os.environ.get("AOTUNE_DATABASE_URL")
    try:
        os.environ["AOTUNE_DATABASE_URL"] = TEST_DATABASE_URL
        config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
        command.upgrade(config, "head")
    finally:
        if original_database_url is None:
            os.environ.pop("AOTUNE_DATABASE_URL", None)
        else:
            os.environ["AOTUNE_DATABASE_URL"] = original_database_url


@pytest.fixture
def session_factory() -> async_sessionmaker[AsyncSession]:
    assert TEST_DATABASE_URL is not None
    assert_test_database_url_name_is_allowed(TEST_DATABASE_URL)
    engine = create_async_engine(TEST_DATABASE_URL, poolclass=NullPool)
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


def assert_test_database_is_safe(test_database_url: str) -> None:
    if os.environ.get("AOTUNE_APP_ENV") != "test":
        raise RuntimeError(
            "Refusing to run destructive persistence tests unless "
            "AOTUNE_APP_ENV=test."
        )

    test_database_name = assert_test_database_url_name_is_allowed(
        test_database_url,
    )
    development_database_url = Settings.from_env().database_url
    development_database_name = database_name_from_url(development_database_url)
    if development_database_name == test_database_name:
        raise RuntimeError(
            "Refusing to run destructive persistence tests because "
            "AOTUNE_DATABASE_URL and AOTUNE_TEST_DATABASE_URL resolve to the "
            f"same database: {test_database_name}."
        )

    actual_database_name = asyncio.run(current_database_name(test_database_url))
    if not is_allowed_test_database_name(actual_database_name):
        raise RuntimeError(
            "Refusing to run destructive persistence tests against non-test "
            f"database: {actual_database_name}."
        )


def assert_test_database_url_name_is_allowed(database_url: str) -> str:
    database_name = database_name_from_url(database_url)
    if not is_allowed_test_database_name(database_name):
        raise RuntimeError(
            "Refusing to run destructive persistence tests against non-test "
            f"database: {database_name}."
        )
    return database_name


def database_name_from_url(database_url: str) -> str:
    database_name = urlparse(database_url).path.lstrip("/")
    if not database_name:
        raise RuntimeError(
            "Refusing to run destructive persistence tests without an explicit "
            "test database name."
        )
    return database_name


def is_allowed_test_database_name(database_name: str) -> bool:
    return database_name == ALLOWED_TEST_DATABASE_NAME or database_name.endswith(
        "_test"
    )


async def current_database_name(database_url: str) -> str:
    engine = create_async_engine(database_url, poolclass=NullPool)
    try:
        async with engine.connect() as connection:
            result = await connection.execute(text("select current_database()"))
            return result.scalar_one()
    finally:
        await engine.dispose()


async def post(path: str, json: dict[str, str]) -> httpx.Response:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        return await client.post(path, json=json)


async def patch(path: str, json: dict[str, object]) -> httpx.Response:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        return await client.patch(path, json=json)


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


class StaticGeneratedProvider:
    def __init__(self) -> None:
        self.create_calls = 0

    async def create_draft(
        self,
        request: LyricsLearningDraftRequest,
    ) -> LyricsLearningDraftResponse:
        self.create_calls += 1
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
                    ),
                    LyricsLineCard(
                        line_number=2,
                        original_text="もう一度歌う",
                        romaji="mou ichido utau",
                        approximate_chinese_pronunciation="再次歌唱",
                        meaning="再唱一次。",
                        pronunciation_notes=["拉长お音。"],
                        sing_along_notes=["跟着节拍。"],
                        confidence=0.8,
                        needs_review=True,
                    ),
                ],
                pronunciation_notes=["Overall pronunciation note."],
                sing_along_notes=["Overall sing-along note."],
                review_cards=["Review the reading."],
            ),
        )


def create_generated_draft(
    provider: StaticGeneratedProvider,
    session_factory: async_sessionmaker[AsyncSession],
) -> dict:
    app.dependency_overrides[get_lyrics_learning_draft_service] = override_service(
        provider,
        session_factory,
    )
    response = asyncio.run(
        post(
            "/api/lyrics-learning/drafts",
            json={
                "songTitle": "Sample song title",
                "artist": "Sample artist",
                "learningGoal": "Practice pronunciation.",
                "lyricsText": "学びたい一行\nもう一度歌う",
            },
        )
    )
    assert response.status_code == 201
    return response.json()


def editable_line_cards(draft: dict) -> list[dict]:
    return [
        {
            "lineNumber": card["lineNumber"],
            "romaji": card["romaji"],
            "approximateChinesePronunciation": card[
                "approximateChinesePronunciation"
            ],
            "meaning": card["meaning"],
            "pronunciationNotes": card["pronunciationNotes"],
            "singAlongNotes": card["singAlongNotes"],
            "needsReview": card["needsReview"],
        }
        for card in draft["agentOutput"]["lineCards"]
    ]


async def set_artifact_updated_at(
    session_factory: async_sessionmaker[AsyncSession],
    artifact_id: str,
    updated_at: str,
) -> None:
    async with session_factory() as session:
        async with session.begin():
            parsed_updated_at = datetime.fromisoformat(updated_at)
            await session.execute(
                text(
                    "update lyrics_learning_artifacts "
                    "set updated_at = :updated_at "
                    "where id = :artifact_id"
                ),
                {"artifact_id": artifact_id, "updated_at": parsed_updated_at},
            )


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


def test_list_drafts_returns_empty_list(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    app.dependency_overrides[get_lyrics_learning_draft_service] = override_service(
        FakeLyricsLearningAgentProvider(),
        session_factory,
    )
    try:
        response = asyncio.run(get("/api/lyrics-learning/drafts"))
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == []


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


def test_list_drafts_returns_compact_summaries_with_counts(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    provider = StaticGeneratedProvider()
    try:
        first = create_generated_draft(provider, session_factory)
        second = create_generated_draft(provider, session_factory)
        line_cards = editable_line_cards(second)
        line_cards[0]["needsReview"] = False
        patch_response = asyncio.run(
            patch(
                f"/api/lyrics-learning/drafts/{second['id']}",
                json={"lineCards": line_cards},
            )
        )
        assert patch_response.status_code == 200

        response = asyncio.run(get("/api/lyrics-learning/drafts"))
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    summaries = response.json()
    assert {summary["id"] for summary in summaries} == {first["id"], second["id"]}
    second_summary = next(
        summary for summary in summaries if summary["id"] == second["id"]
    )
    assert second_summary == {
        "id": second["id"],
        "songTitle": "Sample song title",
        "artist": "Sample artist",
        "status": "needs_review",
        "provider": "test-provider",
        "model": "test-model",
        "lineCardCount": 2,
        "needsReviewCount": 1,
        "createdAt": second_summary["createdAt"],
        "updatedAt": second_summary["updatedAt"],
    }


def test_list_drafts_orders_by_updated_at_descending(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    provider = StaticGeneratedProvider()
    try:
        older = create_generated_draft(provider, session_factory)
        newer = create_generated_draft(provider, session_factory)
        asyncio.run(
            set_artifact_updated_at(
                session_factory,
                older["id"],
                "2026-01-01T00:00:00+00:00",
            )
        )
        asyncio.run(
            set_artifact_updated_at(
                session_factory,
                newer["id"],
                "2026-01-02T00:00:00+00:00",
            )
        )

        response = asyncio.run(get("/api/lyrics-learning/drafts"))
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert [summary["id"] for summary in response.json()] == [newer["id"], older["id"]]


def test_list_drafts_uses_deterministic_id_tie_breaker(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    provider = StaticGeneratedProvider()
    try:
        first = create_generated_draft(provider, session_factory)
        second = create_generated_draft(provider, session_factory)
        same_updated_at = "2026-01-01T00:00:00+00:00"
        asyncio.run(
            set_artifact_updated_at(session_factory, first["id"], same_updated_at)
        )
        asyncio.run(
            set_artifact_updated_at(session_factory, second["id"], same_updated_at)
        )

        response = asyncio.run(get("/api/lyrics-learning/drafts"))
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert [summary["id"] for summary in response.json()] == sorted(
        [first["id"], second["id"]]
    )


def test_list_drafts_validates_limit(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    provider = StaticGeneratedProvider()
    try:
        create_generated_draft(provider, session_factory)
        create_generated_draft(provider, session_factory)
        valid_response = asyncio.run(get("/api/lyrics-learning/drafts?limit=1"))
        low_response = asyncio.run(get("/api/lyrics-learning/drafts?limit=0"))
        high_response = asyncio.run(get("/api/lyrics-learning/drafts?limit=101"))
    finally:
        app.dependency_overrides.clear()

    assert valid_response.status_code == 200
    assert len(valid_response.json()) == 1
    assert low_response.status_code == 422
    assert high_response.status_code == 422


def test_list_drafts_excludes_full_artifact_content(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    provider = StaticGeneratedProvider()
    try:
        create_generated_draft(provider, session_factory)
        response = asyncio.run(get("/api/lyrics-learning/drafts"))
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    summary = response.json()[0]
    assert set(summary) == {
        "id",
        "songTitle",
        "artist",
        "status",
        "provider",
        "model",
        "lineCardCount",
        "needsReviewCount",
        "createdAt",
        "updatedAt",
    }
    serialized = response.text
    assert "lyricsText" not in summary
    assert "studyNotes" not in summary
    assert "agentOutput" not in summary
    assert "generatedSections" not in summary
    assert "学びたい一行" not in serialized
    assert "manabitai ichigyou" not in serialized


def test_patch_updates_artifact_updated_at_for_listing(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    provider = StaticGeneratedProvider()
    try:
        draft = create_generated_draft(provider, session_factory)
        asyncio.run(
            set_artifact_updated_at(
                session_factory,
                draft["id"],
                "2026-01-01T00:00:00+00:00",
            )
        )
        before_response = asyncio.run(get("/api/lyrics-learning/drafts"))
        before_updated_at = before_response.json()[0]["updatedAt"]
        line_cards = editable_line_cards(draft)
        line_cards[0]["romaji"] = "updated after old timestamp"

        patch_response = asyncio.run(
            patch(
                f"/api/lyrics-learning/drafts/{draft['id']}",
                json={"lineCards": line_cards},
            )
        )
        after_response = asyncio.run(get("/api/lyrics-learning/drafts"))
    finally:
        app.dependency_overrides.clear()

    assert patch_response.status_code == 200
    assert before_updated_at.startswith("2026-01-01T00:00:00")
    assert after_response.json()[0]["updatedAt"] > before_updated_at


def test_list_drafts_does_not_call_provider(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    provider = StaticGeneratedProvider()
    try:
        create_generated_draft(provider, session_factory)
        provider.create_calls = 0
        response = asyncio.run(get("/api/lyrics-learning/drafts"))
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert provider.create_calls == 0


def test_patch_and_get_round_trip_for_one_edited_card(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    provider = StaticGeneratedProvider()
    try:
        draft = create_generated_draft(provider, session_factory)
        line_cards = editable_line_cards(draft)
        line_cards[0]["romaji"] = "edited romaji"
        line_cards[0]["meaning"] = "Edited meaning."
        line_cards[0]["needsReview"] = False

        patch_response = asyncio.run(
            patch(
                f"/api/lyrics-learning/drafts/{draft['id']}",
                json={"lineCards": line_cards},
            )
        )
        get_response = asyncio.run(get(f"/api/lyrics-learning/drafts/{draft['id']}"))
    finally:
        app.dependency_overrides.clear()

    assert patch_response.status_code == 200
    assert get_response.status_code == 200
    assert get_response.json() == patch_response.json()
    updated = get_response.json()
    assert updated["agentOutput"]["lineCards"][0]["romaji"] == "edited romaji"
    assert updated["agentOutput"]["lineCards"][0]["meaning"] == "Edited meaning."
    assert updated["agentOutput"]["lineCards"][0]["originalText"] == "学びたい一行"
    assert updated["agentOutput"]["lineCards"][0]["confidence"] == 0.75
    assert updated["status"] == "needs_review"


def test_patch_updates_multiple_cards_and_recalculates_generated_status(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    provider = StaticGeneratedProvider()
    try:
        draft = create_generated_draft(provider, session_factory)
        line_cards = editable_line_cards(draft)
        line_cards[0]["pronunciationNotes"] = ["Edited first note."]
        line_cards[0]["singAlongNotes"] = ["Edited first sing-along note."]
        line_cards[0]["needsReview"] = False
        line_cards[1]["approximateChinesePronunciation"] = "第二行提示"
        line_cards[1]["meaning"] = "Edited second meaning."
        line_cards[1]["needsReview"] = False

        response = asyncio.run(
            patch(
                f"/api/lyrics-learning/drafts/{draft['id']}",
                json={"lineCards": line_cards},
            )
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    updated = response.json()
    assert updated["status"] == "generated"
    assert updated["agentOutput"]["lineCards"][0]["pronunciationNotes"] == [
        "Edited first note."
    ]
    assert updated["agentOutput"]["lineCards"][0]["singAlongNotes"] == [
        "Edited first sing-along note."
    ]
    assert updated["agentOutput"]["lineCards"][1][
        "approximateChinesePronunciation"
    ] == "第二行提示"
    assert updated["agentOutput"]["lineCards"][1]["meaning"] == (
        "Edited second meaning."
    )


def test_patch_recalculates_needs_review_status(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    provider = StaticGeneratedProvider()
    try:
        draft = create_generated_draft(provider, session_factory)
        line_cards = editable_line_cards(draft)
        line_cards[0]["needsReview"] = False
        line_cards[1]["needsReview"] = True

        response = asyncio.run(
            patch(
                f"/api/lyrics-learning/drafts/{draft['id']}",
                json={"lineCards": line_cards},
            )
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["status"] == "needs_review"


def test_patch_missing_draft_returns_404(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    app.dependency_overrides[get_lyrics_learning_draft_service] = override_service(
        FakeLyricsLearningAgentProvider(),
        session_factory,
    )
    try:
        response = asyncio.run(
            patch(
                f"/api/lyrics-learning/drafts/{uuid4()}",
                json={"lineCards": []},
            )
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 404
    assert response.json() == {"detail": "Lyrics learning draft not found."}


@pytest.mark.parametrize(
    ("mutate", "expected_detail"),
    [
        (
            lambda cards: cards.pop(),
            "missing stored line numbers 2",
        ),
        (
            lambda cards: cards.append({**cards[0]}),
            "Duplicate line numbers submitted: 1.",
        ),
        (
            lambda cards: cards.append({**cards[0], "lineNumber": 999}),
            "unknown line numbers 999",
        ),
    ],
)
def test_patch_rejects_invalid_line_number_collections_without_partial_updates(
    mutate,
    expected_detail: str,
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    provider = StaticGeneratedProvider()
    try:
        draft = create_generated_draft(provider, session_factory)
        line_cards = editable_line_cards(draft)
        line_cards[0]["romaji"] = "should not persist"
        mutate(line_cards)

        response = asyncio.run(
            patch(
                f"/api/lyrics-learning/drafts/{draft['id']}",
                json={"lineCards": line_cards},
            )
        )
        get_response = asyncio.run(get(f"/api/lyrics-learning/drafts/{draft['id']}"))
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 422
    assert expected_detail in response.json()["detail"]
    assert get_response.json()["agentOutput"]["lineCards"][0]["romaji"] == (
        "manabitai ichigyou"
    )


def test_patch_rejects_immutable_line_card_fields(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    provider = StaticGeneratedProvider()
    try:
        draft = create_generated_draft(provider, session_factory)
        line_cards = editable_line_cards(draft)
        line_cards[0]["originalText"] = "改ざん"
        line_cards[0]["confidence"] = 0.1

        response = asyncio.run(
            patch(
                f"/api/lyrics-learning/drafts/{draft['id']}",
                json={"lineCards": line_cards},
            )
        )
        get_response = asyncio.run(get(f"/api/lyrics-learning/drafts/{draft['id']}"))
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 422
    stored_card = get_response.json()["agentOutput"]["lineCards"][0]
    assert stored_card["originalText"] == "学びたい一行"
    assert stored_card["confidence"] == 0.75


def test_patch_does_not_call_provider(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    provider = StaticGeneratedProvider()
    try:
        draft = create_generated_draft(provider, session_factory)
        assert provider.create_calls == 1
        line_cards = editable_line_cards(draft)
        line_cards[0]["needsReview"] = False

        response = asyncio.run(
            patch(
                f"/api/lyrics-learning/drafts/{draft['id']}",
                json={"lineCards": line_cards},
            )
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert provider.create_calls == 1


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

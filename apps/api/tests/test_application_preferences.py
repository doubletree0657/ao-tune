import asyncio
import os
from collections.abc import AsyncIterator
from pathlib import Path
from urllib.parse import urlparse

import httpx
import pytest
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from alembic import command
from app.api.routes.preferences import get_application_preferences_service
from app.config import Settings
from app.main import app
from app.repositories.application_preferences_repository import (
    SQLAlchemyApplicationPreferencesRepository,
)
from app.services.application_preferences_service import (
    ApplicationPreferencesService,
)

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

    async def reset_preferences() -> None:
        async with engine.begin() as connection:
            await connection.execute(
                text(
                    "update application_preferences "
                    "set theme = 'light', updated_at = created_at "
                    "where id = 1"
                )
            )

    asyncio.run(reset_preferences())
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


def override_preferences_service(
    session_factory: async_sessionmaker[AsyncSession],
):
    async def get_test_service() -> AsyncIterator[ApplicationPreferencesService]:
        async with session_factory() as session:
            yield ApplicationPreferencesService(
                repository=SQLAlchemyApplicationPreferencesRepository(session),
            )

    return get_test_service


async def get(
    path: str,
    session_factory: async_sessionmaker[AsyncSession],
) -> httpx.Response:
    app.dependency_overrides[get_application_preferences_service] = (
        override_preferences_service(session_factory)
    )
    transport = httpx.ASGITransport(app=app)
    try:
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://test",
        ) as client:
            return await client.get(path)
    finally:
        app.dependency_overrides.clear()


async def patch(
    path: str,
    json: dict[str, object],
    session_factory: async_sessionmaker[AsyncSession],
) -> httpx.Response:
    app.dependency_overrides[get_application_preferences_service] = (
        override_preferences_service(session_factory)
    )
    transport = httpx.ASGITransport(app=app)
    try:
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://test",
        ) as client:
            return await client.patch(path, json=json)
    finally:
        app.dependency_overrides.clear()


def test_migration_creates_and_seeds_singleton_preference(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    async def stored_preferences() -> tuple[int, str]:
        async with session_factory() as session:
            result = await session.execute(
                text("select id, theme from application_preferences")
            )
            rows = result.all()
            assert len(rows) == 1
            row = rows[0]
            return row.id, row.theme

    assert asyncio.run(stored_preferences()) == (1, "light")


def test_get_returns_default_light_preference(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    response = asyncio.run(get("/api/preferences", session_factory))

    assert response.status_code == 200
    body = response.json()
    assert body["theme"] == "light"
    assert body["updatedAt"]


def test_patch_updates_and_get_returns_persisted_theme(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    patch_response = asyncio.run(
        patch("/api/preferences", {"theme": "midnight"}, session_factory)
    )
    get_response = asyncio.run(get("/api/preferences", session_factory))

    assert patch_response.status_code == 200
    assert patch_response.json()["theme"] == "midnight"
    assert get_response.status_code == 200
    assert get_response.json()["theme"] == "midnight"


def test_all_allowed_themes_are_accepted(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    for theme in ["light", "black", "midnight", "sky"]:
        response = asyncio.run(
            patch("/api/preferences", {"theme": theme}, session_factory)
        )

        assert response.status_code == 200
        assert response.json()["theme"] == theme


def test_invalid_theme_is_rejected(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    response = asyncio.run(
        patch("/api/preferences", {"theme": "sepia"}, session_factory)
    )

    assert response.status_code == 422


def test_no_additional_preference_row_can_be_created(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    async def insert_extra_row() -> None:
        async with session_factory() as session:
            with pytest.raises(IntegrityError):
                async with session.begin():
                    await session.execute(
                        text(
                            "insert into application_preferences (id, theme) "
                            "values (2, 'light')"
                        )
                    )

            result = await session.execute(
                text("select count(*) from application_preferences")
            )
            assert result.scalar_one() == 1

    asyncio.run(insert_extra_row())


def test_singleton_row_remains_id_one(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    response = asyncio.run(
        patch("/api/preferences", {"theme": "black"}, session_factory)
    )

    async def stored_id() -> int:
        async with session_factory() as session:
            result = await session.execute(
                text("select id from application_preferences")
            )
            return result.scalar_one()

    assert response.status_code == 200
    assert asyncio.run(stored_id()) == 1


def test_updated_at_changes_after_theme_update(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    async def set_old_updated_at() -> str:
        async with session_factory() as session:
            async with session.begin():
                await session.execute(
                    text(
                        "update application_preferences "
                        "set updated_at = '2026-01-01T00:00:00+00:00' "
                        "where id = 1"
                    )
                )
            result = await session.execute(
                text("select updated_at from application_preferences where id = 1")
            )
            return result.scalar_one().isoformat()

    before = asyncio.run(set_old_updated_at())
    response = asyncio.run(
        patch("/api/preferences", {"theme": "sky"}, session_factory)
    )

    assert response.status_code == 200
    assert before.startswith("2026-01-01T00:00:00")
    assert response.json()["updatedAt"] > before


def test_preference_endpoints_do_not_invoke_agent_provider(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    class RaisingProvider:
        async def create_draft(self, request):  # pragma: no cover
            raise AssertionError("Preference endpoints must not call providers.")

    original_provider = getattr(app.state, "lyrics_learning_agent_provider", None)
    app.state.lyrics_learning_agent_provider = RaisingProvider()
    try:
        get_response = asyncio.run(get("/api/preferences", session_factory))
        patch_response = asyncio.run(
            patch("/api/preferences", {"theme": "black"}, session_factory)
        )
    finally:
        if original_provider is None:
            del app.state.lyrics_learning_agent_provider
        else:
            app.state.lyrics_learning_agent_provider = original_provider

    assert get_response.status_code == 200
    assert patch_response.status_code == 200

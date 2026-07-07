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
from app.api.routes.settings import get_application_settings_service
from app.config import Settings
from app.main import app
from app.repositories.application_settings_repository import (
    SQLAlchemyApplicationSettingsRepository,
)
from app.services.application_settings_service import ApplicationSettingsService

TEST_DATABASE_URL = os.environ.get("AOTUNE_TEST_DATABASE_URL")
ALLOWED_TEST_DATABASE_NAME = "aotune_test"
ALEMBIC_CONFIG = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))

pytestmark = pytest.mark.skipif(
    not TEST_DATABASE_URL,
    reason="AOTUNE_TEST_DATABASE_URL is required for PostgreSQL persistence tests.",
)


@pytest.fixture(scope="session", autouse=True)
def migrated_database() -> None:
    assert TEST_DATABASE_URL is not None
    assert_test_database_is_safe(TEST_DATABASE_URL)
    with test_database_environment():
        command.upgrade(ALEMBIC_CONFIG, "head")


@pytest.fixture
def session_factory() -> async_sessionmaker[AsyncSession]:
    assert TEST_DATABASE_URL is not None
    assert_test_database_url_name_is_allowed(TEST_DATABASE_URL)
    with test_database_environment():
        command.upgrade(ALEMBIC_CONFIG, "head")

    engine = create_async_engine(TEST_DATABASE_URL, poolclass=NullPool)
    factory = async_sessionmaker(engine, expire_on_commit=False)

    async def reset_settings() -> None:
        async with engine.begin() as connection:
            await connection.execute(
                text(
                    "update application_settings "
                    "set settings = jsonb_build_object("
                    "'theme', 'light', "
                    "'lyricsLearning', jsonb_build_object("
                    "'songSheet', jsonb_build_object("
                    "'showRomaji', true, "
                    "'showTranslation', true, "
                    "'originalTextSize', 30, "
                    "'layoutMode', 'continuous'"
                    "))), "
                    "updated_at = created_at "
                    "where id = 1"
                )
            )

    asyncio.run(reset_settings())
    return factory


class test_database_environment:
    def __enter__(self) -> None:
        self.original_database_url = os.environ.get("AOTUNE_DATABASE_URL")
        assert TEST_DATABASE_URL is not None
        os.environ["AOTUNE_DATABASE_URL"] = TEST_DATABASE_URL

    def __exit__(self, exc_type, exc_value, traceback) -> None:
        if self.original_database_url is None:
            os.environ.pop("AOTUNE_DATABASE_URL", None)
        else:
            os.environ["AOTUNE_DATABASE_URL"] = self.original_database_url


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


def override_settings_service(
    session_factory: async_sessionmaker[AsyncSession],
):
    async def get_test_service() -> AsyncIterator[ApplicationSettingsService]:
        async with session_factory() as session:
            yield ApplicationSettingsService(
                repository=SQLAlchemyApplicationSettingsRepository(session),
            )

    return get_test_service


async def get(
    path: str,
    session_factory: async_sessionmaker[AsyncSession],
) -> httpx.Response:
    app.dependency_overrides[get_application_settings_service] = (
        override_settings_service(session_factory)
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
    app.dependency_overrides[get_application_settings_service] = (
        override_settings_service(session_factory)
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


def test_migration_creates_and_seeds_singleton_settings(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    async def stored_settings() -> tuple[int, dict]:
        async with session_factory() as session:
            result = await session.execute(
                text("select id, settings from application_settings")
            )
            rows = result.all()
            assert len(rows) == 1
            row = rows[0]
            return row.id, row.settings

    row_id, settings = asyncio.run(stored_settings())
    assert row_id == 1
    assert settings["theme"] == "light"
    assert settings["lyricsLearning"]["songSheet"]["showRomaji"] is True
    assert settings["lyricsLearning"]["songSheet"]["showTranslation"] is True


def test_upgrade_preserves_existing_theme_and_downgrade_restores_preferences() -> None:
    assert TEST_DATABASE_URL is not None
    assert_test_database_url_name_is_allowed(TEST_DATABASE_URL)
    engine = create_async_engine(TEST_DATABASE_URL, poolclass=NullPool)

    async def set_previous_theme() -> None:
        async with engine.begin() as connection:
            await connection.execute(
                text(
                    "update application_preferences "
                    "set theme = 'midnight' "
                    "where id = 1"
                )
            )

    async def read_upgraded() -> dict:
        async with engine.connect() as connection:
            result = await connection.execute(
                text(
                    "select id, settings, created_at, updated_at "
                    "from application_settings"
                )
            )
            row = result.one()
            return {
                "id": row.id,
                "settings": row.settings,
                "created_at": row.created_at,
                "updated_at": row.updated_at,
            }

    async def read_downgraded_theme() -> str:
        async with engine.connect() as connection:
            result = await connection.execute(
                text("select theme from application_preferences where id = 1")
            )
            return result.scalar_one()

    try:
        with test_database_environment():
            command.downgrade(ALEMBIC_CONFIG, "20260703_0002")
        asyncio.run(set_previous_theme())
        with test_database_environment():
            command.upgrade(ALEMBIC_CONFIG, "head")
        upgraded = asyncio.run(read_upgraded())

        assert upgraded["id"] == 1
        assert upgraded["settings"] == {
            "theme": "midnight",
            "lyricsLearning": {
                "songSheet": {
                    "showRomaji": True,
                    "showTranslation": True,
                    "originalTextSize": 30,
                    "layoutMode": "continuous",
                }
            },
        }
        assert upgraded["created_at"] is not None
        assert upgraded["updated_at"] is not None

        with test_database_environment():
            command.downgrade(ALEMBIC_CONFIG, "20260703_0002")
        assert asyncio.run(read_downgraded_theme()) == "midnight"
    finally:
        asyncio.run(engine.dispose())
        with test_database_environment():
            command.upgrade(ALEMBIC_CONFIG, "head")


def test_get_returns_complete_default_settings(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    response = asyncio.run(get("/api/settings", session_factory))

    assert response.status_code == 200
    body = response.json()
    assert body["theme"] == "light"
    assert body["lyricsLearning"]["songSheet"]["showRomaji"] is True
    assert body["lyricsLearning"]["songSheet"]["showTranslation"] is True
    assert body["lyricsLearning"]["songSheet"]["originalTextSize"] == 30
    assert body["lyricsLearning"]["songSheet"]["layoutMode"] == "continuous"
    assert body["updatedAt"]


def test_patch_theme_preserves_song_sheet_settings(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    first = asyncio.run(
        patch(
            "/api/settings",
            {"lyricsLearning": {"songSheet": {"showRomaji": False}}},
            session_factory,
        )
    )
    second = asyncio.run(
        patch("/api/settings", {"theme": "midnight"}, session_factory)
    )

    assert first.status_code == 200
    assert second.status_code == 200
    body = second.json()
    assert body["theme"] == "midnight"
    assert body["lyricsLearning"]["songSheet"]["showRomaji"] is False
    assert body["lyricsLearning"]["songSheet"]["showTranslation"] is True
    assert body["lyricsLearning"]["songSheet"]["originalTextSize"] == 30
    assert body["lyricsLearning"]["songSheet"]["layoutMode"] == "continuous"


def test_patch_show_romaji_preserves_theme_and_translation(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    asyncio.run(patch("/api/settings", {"theme": "black"}, session_factory))
    response = asyncio.run(
        patch(
            "/api/settings",
            {"lyricsLearning": {"songSheet": {"showRomaji": False}}},
            session_factory,
        )
    )

    assert response.status_code == 200
    body = response.json()
    assert body["theme"] == "black"
    assert body["lyricsLearning"]["songSheet"]["showRomaji"] is False
    assert body["lyricsLearning"]["songSheet"]["showTranslation"] is True
    assert body["lyricsLearning"]["songSheet"]["originalTextSize"] == 30
    assert body["lyricsLearning"]["songSheet"]["layoutMode"] == "continuous"


def test_patch_show_translation_preserves_theme_and_romaji(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    asyncio.run(patch("/api/settings", {"theme": "sky"}, session_factory))
    response = asyncio.run(
        patch(
            "/api/settings",
            {"lyricsLearning": {"songSheet": {"showTranslation": False}}},
            session_factory,
        )
    )

    assert response.status_code == 200
    body = response.json()
    assert body["theme"] == "sky"
    assert body["lyricsLearning"]["songSheet"]["showRomaji"] is True
    assert body["lyricsLearning"]["songSheet"]["showTranslation"] is False
    assert body["lyricsLearning"]["songSheet"]["originalTextSize"] == 30
    assert body["lyricsLearning"]["songSheet"]["layoutMode"] == "continuous"


def test_patch_font_size_preserves_theme_and_visibility(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    asyncio.run(patch("/api/settings", {"theme": "midnight"}, session_factory))
    asyncio.run(
        patch(
            "/api/settings",
            {
                "lyricsLearning": {
                    "songSheet": {
                        "showRomaji": False,
                        "showTranslation": False,
                    }
                }
            },
            session_factory,
        )
    )
    response = asyncio.run(
        patch(
            "/api/settings",
            {"lyricsLearning": {"songSheet": {"originalTextSize": 24}}},
            session_factory,
        )
    )

    assert response.status_code == 200
    body = response.json()
    assert body["theme"] == "midnight"
    assert body["lyricsLearning"]["songSheet"] == {
        "showRomaji": False,
        "showTranslation": False,
        "originalTextSize": 24,
        "layoutMode": "continuous",
    }


@pytest.mark.parametrize("layout_mode", ["continuous", "compact", "sing_along"])
def test_supported_layout_modes_are_accepted(
    layout_mode: str,
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    response = asyncio.run(
        patch(
            "/api/settings",
            {"lyricsLearning": {"songSheet": {"layoutMode": layout_mode}}},
            session_factory,
        )
    )

    assert response.status_code == 200
    assert response.json()["lyricsLearning"]["songSheet"]["layoutMode"] == layout_mode


def test_patch_layout_mode_preserves_other_settings(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    asyncio.run(patch("/api/settings", {"theme": "black"}, session_factory))
    asyncio.run(
        patch(
            "/api/settings",
            {
                "lyricsLearning": {
                    "songSheet": {
                        "showRomaji": False,
                        "showTranslation": False,
                        "originalTextSize": 22,
                    }
                }
            },
            session_factory,
        )
    )
    asyncio.run(
        patch(
            "/api/settings",
            {"lyricsLearning": {"songSheet": {"layoutMode": "sing_along"}}},
            session_factory,
        )
    )
    response = asyncio.run(get("/api/settings", session_factory))

    assert response.status_code == 200
    body = response.json()
    assert body["theme"] == "black"
    assert body["lyricsLearning"]["songSheet"] == {
        "showRomaji": False,
        "showTranslation": False,
        "originalTextSize": 22,
        "layoutMode": "sing_along",
    }


def test_patch_theme_preserves_all_song_sheet_options(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    asyncio.run(
        patch(
            "/api/settings",
            {
                "lyricsLearning": {
                    "songSheet": {
                        "showRomaji": False,
                        "showTranslation": False,
                        "originalTextSize": 18,
                        "layoutMode": "compact",
                    }
                }
            },
            session_factory,
        )
    )
    response = asyncio.run(patch("/api/settings", {"theme": "sky"}, session_factory))

    assert response.status_code == 200
    body = response.json()
    assert body["theme"] == "sky"
    assert body["lyricsLearning"]["songSheet"] == {
        "showRomaji": False,
        "showTranslation": False,
        "originalTextSize": 18,
        "layoutMode": "compact",
    }


def test_sequential_independent_partial_updates_do_not_overwrite_each_other(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    theme_response = asyncio.run(
        patch("/api/settings", {"theme": "midnight"}, session_factory)
    )
    romaji_response = asyncio.run(
        patch(
            "/api/settings",
            {"lyricsLearning": {"songSheet": {"showRomaji": False}}},
            session_factory,
        )
    )
    translation_response = asyncio.run(
        patch(
            "/api/settings",
            {"lyricsLearning": {"songSheet": {"showTranslation": False}}},
            session_factory,
        )
    )
    size_response = asyncio.run(
        patch(
            "/api/settings",
            {"lyricsLearning": {"songSheet": {"originalTextSize": 34}}},
            session_factory,
        )
    )
    layout_response = asyncio.run(
        patch(
            "/api/settings",
            {"lyricsLearning": {"songSheet": {"layoutMode": "sing_along"}}},
            session_factory,
        )
    )

    assert theme_response.status_code == 200
    assert romaji_response.status_code == 200
    assert translation_response.status_code == 200
    assert size_response.status_code == 200
    assert layout_response.status_code == 200
    body = layout_response.json()
    assert body["theme"] == "midnight"
    assert body["lyricsLearning"]["songSheet"] == {
        "showRomaji": False,
        "showTranslation": False,
        "originalTextSize": 34,
        "layoutMode": "sing_along",
    }


def test_invalid_theme_is_rejected(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    response = asyncio.run(
        patch("/api/settings", {"theme": "sepia"}, session_factory)
    )

    assert response.status_code == 422


def test_invalid_boolean_value_is_rejected(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    response = asyncio.run(
        patch(
            "/api/settings",
            {"lyricsLearning": {"songSheet": {"showRomaji": "false"}}},
            session_factory,
        )
    )

    assert response.status_code == 422


def test_invalid_font_size_values_are_rejected(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    too_small = asyncio.run(
        patch(
            "/api/settings",
            {"lyricsLearning": {"songSheet": {"originalTextSize": 17}}},
            session_factory,
        )
    )
    too_large = asyncio.run(
        patch(
            "/api/settings",
            {"lyricsLearning": {"songSheet": {"originalTextSize": 37}}},
            session_factory,
        )
    )
    non_integer = asyncio.run(
        patch(
            "/api/settings",
            {"lyricsLearning": {"songSheet": {"originalTextSize": 24.5}}},
            session_factory,
        )
    )

    assert too_small.status_code == 422
    assert too_large.status_code == 422
    assert non_integer.status_code == 422


def test_invalid_layout_mode_is_rejected(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    response = asyncio.run(
        patch(
            "/api/settings",
            {"lyricsLearning": {"songSheet": {"layoutMode": "columns"}}},
            session_factory,
        )
    )

    assert response.status_code == 422


def test_unknown_update_fields_are_rejected(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    response = asyncio.run(
        patch("/api/settings", {"unknown": True}, session_factory)
    )

    assert response.status_code == 422


def test_no_additional_settings_row_can_be_created(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    async def insert_extra_row() -> None:
        async with session_factory() as session:
            with pytest.raises(IntegrityError):
                async with session.begin():
                    await session.execute(
                        text(
                            "insert into application_settings (id, settings) "
                            "values (2, jsonb_build_object("
                            "'theme', 'light', "
                            "'lyricsLearning', jsonb_build_object("
                            "'songSheet', jsonb_build_object("
                            "'showRomaji', true, "
                            "'showTranslation', true, "
                            "'originalTextSize', 30, "
                            "'layoutMode', 'continuous'"
                            "))))"
                        )
                    )

            result = await session.execute(
                text("select count(*) from application_settings")
            )
            assert result.scalar_one() == 1

    asyncio.run(insert_extra_row())


def test_singleton_row_remains_id_one(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    response = asyncio.run(
        patch("/api/settings", {"theme": "black"}, session_factory)
    )

    async def stored_id() -> int:
        async with session_factory() as session:
            result = await session.execute(text("select id from application_settings"))
            return result.scalar_one()

    assert response.status_code == 200
    assert asyncio.run(stored_id()) == 1


def test_singleton_settings_row_remains_intact_after_song_sheet_updates(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    response = asyncio.run(
        patch(
            "/api/settings",
            {
                "lyricsLearning": {
                    "songSheet": {
                        "originalTextSize": 20,
                        "layoutMode": "compact",
                    }
                }
            },
            session_factory,
        )
    )

    async def stored_row() -> tuple[int, int, dict]:
        async with session_factory() as session:
            result = await session.execute(
                text(
                    "select id, count(*) over () as row_count, settings "
                    "from application_settings"
                )
            )
            row = result.one()
            return row.id, row.row_count, row.settings

    row_id, row_count, settings = asyncio.run(stored_row())
    assert response.status_code == 200
    assert row_id == 1
    assert row_count == 1
    assert settings["lyricsLearning"]["songSheet"]["originalTextSize"] == 20
    assert settings["lyricsLearning"]["songSheet"]["layoutMode"] == "compact"


def test_updated_at_changes_after_real_update(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    async def set_old_updated_at() -> str:
        async with session_factory() as session:
            async with session.begin():
                await session.execute(
                    text(
                        "update application_settings "
                        "set updated_at = '2026-01-01T00:00:00+00:00' "
                        "where id = 1"
                    )
                )
            result = await session.execute(
                text("select updated_at from application_settings where id = 1")
            )
            return result.scalar_one().isoformat()

    before = asyncio.run(set_old_updated_at())
    response = asyncio.run(
        patch("/api/settings", {"theme": "sky"}, session_factory)
    )

    assert response.status_code == 200
    assert before.startswith("2026-01-01T00:00:00")
    assert response.json()["updatedAt"] > before


def test_settings_endpoints_do_not_invoke_agent_provider(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    class RaisingProvider:
        async def create_draft(self, request):  # pragma: no cover
            raise AssertionError("Settings endpoints must not call providers.")

    original_provider = getattr(app.state, "lyrics_learning_agent_provider", None)
    app.state.lyrics_learning_agent_provider = RaisingProvider()
    try:
        get_response = asyncio.run(get("/api/settings", session_factory))
        patch_response = asyncio.run(
            patch("/api/settings", {"theme": "black"}, session_factory)
        )
    finally:
        if original_provider is None:
            del app.state.lyrics_learning_agent_provider
        else:
            app.state.lyrics_learning_agent_provider = original_provider

    assert get_response.status_code == 200
    assert patch_response.status_code == 200

import asyncio

import httpx
import pytest

from app.agents.lyrics_learning_prompt import (
    PROMPT_CONTRACT_VERSION,
    SYSTEM_PROMPT,
    build_user_prompt,
)
from app.agents.lyrics_learning_provider import (
    FakeLyricsLearningAgentProvider,
    OpenAICompatibleLyricsLearningAgentProvider,
    ProviderNotImplementedError,
)
from app.agents.lyrics_learning_provider_factory import (
    ProviderConfigurationError,
    get_lyrics_learning_agent_provider,
)
from app.config import Settings
from app.main import app
from app.schemas.lyrics_learning import LyricsLearningDraftRequest


def draft_request() -> LyricsLearningDraftRequest:
    return LyricsLearningDraftRequest(
        song_title="Sample song title",
        artist="Sample artist",
        learning_goal="Practice pronunciation.",
        lyrics_or_notes="User-provided practice notes.",
    )


def test_settings_default_to_fake_without_credentials() -> None:
    settings = Settings.from_env({})

    assert settings.agent_provider == "fake"
    assert settings.default_llm_profile == "default"
    assert settings.llm_provider == "openai-compatible"
    assert settings.llm_api_key is None
    assert settings.llm_timeout_seconds == 60
    assert isinstance(
        get_lyrics_learning_agent_provider(settings),
        FakeLyricsLearningAgentProvider,
    )


def test_openai_compatible_provider_is_a_non_networking_placeholder() -> None:
    settings = Settings(
        agent_provider="openai-compatible",
        llm_provider="openai-compatible",
    )
    provider = get_lyrics_learning_agent_provider(settings)

    assert isinstance(provider, OpenAICompatibleLyricsLearningAgentProvider)
    with pytest.raises(ProviderNotImplementedError, match="not implemented"):
        provider.create_draft(draft_request())


def test_invalid_provider_has_clear_configuration_error() -> None:
    with pytest.raises(
        ProviderConfigurationError,
        match="Unsupported AOTUNE_AGENT_PROVIDER: unknown",
    ):
        get_lyrics_learning_agent_provider(Settings(agent_provider="unknown"))


def test_prompt_contract_uses_only_supplied_request_text() -> None:
    prompt = build_user_prompt(draft_request())

    assert PROMPT_CONTRACT_VERSION == "lyrics-learning-v1"
    assert "Do not fetch" in SYSTEM_PROMPT
    assert "text-based draft" in SYSTEM_PROMPT
    assert "needing review" in SYSTEM_PROMPT
    assert "Sample song title" in prompt
    assert "User-provided practice notes." in prompt


def test_openai_compatible_mode_returns_controlled_not_implemented(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AOTUNE_AGENT_PROVIDER", "openai-compatible")
    transport = httpx.ASGITransport(app=app)

    async def post() -> httpx.Response:
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://test",
        ) as client:
            return await client.post(
                "/api/lyrics-learning/drafts",
                json={
                    "songTitle": "Sample song title",
                    "artist": "Sample artist",
                    "learningGoal": "Practice pronunciation.",
                },
            )

    response = asyncio.run(post())

    assert response.status_code == 501
    assert response.json() == {
        "detail": (
            "The openai-compatible lyrics learning provider is not implemented; "
            "use AOTUNE_AGENT_PROVIDER=fake"
        )
    }

import asyncio
import json
from pathlib import Path

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
        lyrics_text="学びたい一行",
        study_notes="Focus on clear vowel timing.",
    )


def openai_settings() -> Settings:
    return Settings(
        agent_provider="openai-compatible",
        default_llm_profile="default",
        llm_provider="openai-compatible",
        llm_base_url="https://llm.example.test/v1",
        llm_model="example-model",
        llm_api_key="test-key",
        llm_timeout_seconds=30,
    )


def chat_response(content: str) -> httpx.Response:
    return httpx.Response(
        200,
        json={
            "choices": [
                {
                    "message": {
                        "role": "assistant",
                        "content": content,
                    }
                }
            ]
        },
    )


def test_settings_default_to_fake_without_credentials(tmp_path: Path) -> None:
    settings = Settings.from_env({}, env_file=tmp_path / "missing.env")

    assert settings.agent_provider == "fake"
    assert settings.llm_api_key is None
    assert isinstance(
        get_lyrics_learning_agent_provider(settings),
        FakeLyricsLearningAgentProvider,
    )


@pytest.mark.parametrize(
    ("settings", "missing_name"),
    [
        (Settings(agent_provider="openai-compatible"), "AOTUNE_LLM_BASE_URL"),
        (
            Settings(
                agent_provider="openai-compatible",
                llm_base_url="https://llm.example.test/v1",
            ),
            "AOTUNE_LLM_MODEL",
        ),
        (
            Settings(
                agent_provider="openai-compatible",
                llm_base_url="https://llm.example.test/v1",
                llm_model="example-model",
            ),
            "AOTUNE_LLM_API_KEY",
        ),
    ],
)
def test_openai_provider_validates_required_configuration(
    settings: Settings,
    missing_name: str,
) -> None:
    with pytest.raises(ProviderConfigurationError, match=missing_name):
        get_lyrics_learning_agent_provider(settings)


def test_invalid_provider_has_clear_configuration_error() -> None:
    with pytest.raises(
        ProviderConfigurationError,
        match="Unsupported AOTUNE_AGENT_PROVIDER: unknown",
    ):
        get_lyrics_learning_agent_provider(Settings(agent_provider="unknown"))


def test_prompt_contract_separates_lyrics_text_from_study_notes() -> None:
    prompt = build_user_prompt(draft_request())
    normalized_system_prompt = " ".join(SYSTEM_PROMPT.split())

    assert PROMPT_CONTRACT_VERSION == "lyrics-learning-v4"
    assert "Do not fetch" in SYSTEM_PROMPT
    assert "missing copyrighted lyrics" in SYSTEM_PROMPT
    assert "text-based draft" in SYSTEM_PROMPT
    assert "needsReview=true" in SYSTEM_PROMPT
    assert "standard Hepburn-style romaji" in SYSTEM_PROMPT
    assert "Prefer Chinese characters or Chinese-friendly sound hints" in SYSTEM_PROMPT
    assert "Do not use plain English romanization" in SYSTEM_PROMPT
    assert "Simplified Chinese explanation by default" in SYSTEM_PROMPT
    assert "Chinese native speakers" in SYSTEM_PROMPT
    assert "long vowels, small っ, ん" in normalized_system_prompt
    assert "breath, rhythm, pauses" in SYSTEM_PROMPT
    assert "may not match the original performance timing" in normalized_system_prompt
    assert "Confidence does not mean that a card is reviewed" in SYSTEM_PROMPT
    assert "empty lineCards" in SYSTEM_PROMPT
    assert "only from lines in the user-provided lyricsText field" in SYSTEM_PROMPT
    assert "Never\nturn studyNotes into lineCards" in SYSTEM_PROMPT
    assert "学びたい一行" in prompt
    assert "Focus on clear vowel timing." in prompt
    assert "the only source for lineCards" in prompt
    assert "context only; do not convert into lineCards" in prompt


def test_legacy_lyrics_or_notes_becomes_study_context() -> None:
    request = LyricsLearningDraftRequest(
        song_title="Sample song title",
        artist="Sample artist",
        learning_goal="Practice pronunciation.",
        lyrics_or_notes="Legacy listening note.",
    )

    assert request.lyrics_text is None
    assert request.study_notes == "Legacy listening note."


def test_openai_provider_parses_structured_output() -> None:
    expected_output = {
        "lineCards": [
            {
                "lineNumber": 1,
                "originalText": "学びたい一行",
                "romaji": "manabitai ichigyou",
                "approximateChinesePronunciation": "示例发音提示",
                "meaning": "想学习的一行歌词。",
                "pronunciationNotes": ["注意保持元音清晰。"],
                "singAlongNotes": ["先放慢速度练习。"],
                "confidence": 0.75,
                "needsReview": True,
            }
        ],
        "pronunciationNotes": ["Text-based draft only."],
        "singAlongNotes": ["Check timing against your own audio source."],
        "reviewCards": ["Review the reading."],
    }

    async def handler(request: httpx.Request) -> httpx.Response:
        payload = json.loads(request.content)
        assert request.url == "https://llm.example.test/v1/chat/completions"
        assert request.headers["authorization"] == "Bearer test-key"
        assert payload["model"] == "example-model"
        assert payload["response_format"] == {"type": "json_object"}
        assert "学びたい一行" in payload["messages"][1]["content"]
        return chat_response(json.dumps(expected_output))

    provider = OpenAICompatibleLyricsLearningAgentProvider(
        settings=openai_settings(),
        transport=httpx.MockTransport(handler),
    )

    draft = asyncio.run(provider.create_draft(draft_request()))

    assert draft.status == "needs_review"
    assert draft.provider_metadata.provider == "openai-compatible"
    assert draft.provider_metadata.model == "example-model"
    assert draft.provider_metadata.mode == "structured_generation"
    assert draft.agent_output is not None
    assert draft.agent_output.line_cards[0].romaji == "manabitai ichigyou"
    assert draft.agent_output.line_cards[0].needs_review is True
    assert draft.generation_error is None
    assert all(
        section.status == "needs_review" for section in draft.generated_sections
    )


def test_openai_provider_requires_user_review_for_generated_cards() -> None:
    output = {
        "lineCards": [
            {
                "lineNumber": 1,
                "originalText": "学びたい一行",
                "romaji": "manabitai ichigyō",
                "approximateChinesePronunciation": "玛那比泰 一七交",
                "meaning": "想学习的一行歌词。",
                "pronunciationNotes": [],
                "singAlongNotes": [],
                "confidence": 0.98,
                "needsReview": False,
            }
        ],
        "pronunciationNotes": [],
        "singAlongNotes": [],
        "reviewCards": [],
    }
    provider = OpenAICompatibleLyricsLearningAgentProvider(
        settings=openai_settings(),
        transport=httpx.MockTransport(
            lambda request: chat_response(json.dumps(output))
        ),
    )

    draft = asyncio.run(provider.create_draft(draft_request()))

    assert draft.status == "needs_review"
    assert draft.agent_output is not None
    assert draft.agent_output.line_cards[0].needs_review is True
    assert all(
        section.status == "needs_review" for section in draft.generated_sections
    )


def test_openai_provider_invalid_json_returns_reviewable_response() -> None:
    provider = OpenAICompatibleLyricsLearningAgentProvider(
        settings=openai_settings(),
        transport=httpx.MockTransport(
            lambda request: chat_response("not valid json")
        ),
    )

    draft = asyncio.run(provider.create_draft(draft_request()))

    assert draft.status == "needs_review"
    assert draft.agent_output is None
    assert draft.provider_metadata.mode == "generation_failed"
    assert draft.generation_error == (
        "The model response was not valid structured lyrics learning output. "
        "Review the request and try again."
    )


def test_openai_provider_removes_line_cards_from_study_notes() -> None:
    output = {
        "lineCards": [
            {
                "lineNumber": 1,
                "originalText": "Focus on clear vowel timing.",
                "romaji": None,
                "approximateChinesePronunciation": None,
                "meaning": None,
                "pronunciationNotes": [],
                "singAlongNotes": [],
                "confidence": 0.2,
                "needsReview": True,
            }
        ],
        "pronunciationNotes": [],
        "singAlongNotes": [],
        "reviewCards": [],
    }
    provider = OpenAICompatibleLyricsLearningAgentProvider(
        settings=openai_settings(),
        transport=httpx.MockTransport(
            lambda request: chat_response(json.dumps(output))
        ),
    )

    draft = asyncio.run(provider.create_draft(draft_request()))

    assert draft.agent_output is not None
    assert draft.agent_output.line_cards == []
    assert draft.agent_output.review_cards == [
        "One or more generated line cards were removed because they did not "
        "match the user-provided lyrics text."
    ]


def test_openai_provider_empty_line_cards_need_review() -> None:
    provider = OpenAICompatibleLyricsLearningAgentProvider(
        settings=openai_settings(),
        transport=httpx.MockTransport(
            lambda request: chat_response(
                json.dumps(
                    {
                        "lineCards": [],
                        "pronunciationNotes": [],
                        "singAlongNotes": [],
                        "reviewCards": [
                            "User-provided lyrics text is required."
                        ],
                    }
                )
            )
        ),
    )

    draft = asyncio.run(provider.create_draft(draft_request()))

    assert draft.status == "needs_review"
    assert draft.agent_output is not None
    assert draft.agent_output.line_cards == []


def test_openai_provider_without_lyrics_text_skips_request() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        raise AssertionError("Provider request should not be sent without lyrics text")

    provider = OpenAICompatibleLyricsLearningAgentProvider(
        settings=openai_settings(),
        transport=httpx.MockTransport(handler),
    )
    request = LyricsLearningDraftRequest(
        song_title="Sample song title",
        artist="Sample artist",
        learning_goal="Practice pronunciation.",
        study_notes="Focus on rhythm, but do not create a line card from this.",
    )

    draft = asyncio.run(provider.create_draft(request))

    assert draft.status == "needs_review"
    assert draft.provider_metadata.mode == "missing_lyrics_text"
    assert draft.agent_output is not None
    assert draft.agent_output.line_cards == []
    assert draft.agent_output.review_cards == [
        "Add user-provided lyrics text before generating line cards."
    ]


def test_openai_mode_missing_configuration_returns_controlled_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AOTUNE_AGENT_PROVIDER", "openai-compatible")
    monkeypatch.setenv("AOTUNE_LLM_BASE_URL", "")
    monkeypatch.setenv("AOTUNE_LLM_MODEL", "")
    monkeypatch.setenv("AOTUNE_LLM_API_KEY", "")
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

    assert response.status_code == 503
    assert response.json()["detail"].startswith(
        "Missing required OpenAI-compatible configuration:"
    )

from pathlib import Path

from app.agents.lyrics_learning_provider import FakeLyricsLearningAgentProvider
from app.agents.lyrics_learning_provider_factory import (
    get_lyrics_learning_agent_provider,
)
from app.config import Settings


def test_settings_work_without_local_env_file(tmp_path: Path) -> None:
    settings = Settings.from_env({}, env_file=tmp_path / ".env.local")

    assert settings == Settings()


def test_settings_load_local_env_file(tmp_path: Path) -> None:
    env_file = tmp_path / ".env.local"
    env_file.write_text(
        "\n".join(
            (
                "AOTUNE_AGENT_PROVIDER=openai-compatible",
                "AOTUNE_DEFAULT_LLM_PROFILE=local-profile",
                "AOTUNE_LLM_BASE_URL=https://llm.example.test/v1",
                "AOTUNE_LLM_MODEL=local-model",
                "AOTUNE_LLM_API_KEY=local-test-key",
                "AOTUNE_LLM_TIMEOUT_SECONDS=45",
            )
        ),
        encoding="utf-8",
    )

    settings = Settings.from_env({}, env_file=env_file)

    assert settings.agent_provider == "openai-compatible"
    assert settings.default_llm_profile == "local-profile"
    assert settings.llm_base_url == "https://llm.example.test/v1"
    assert settings.llm_model == "local-model"
    assert settings.llm_api_key == "local-test-key"
    assert settings.llm_timeout_seconds == 45


def test_process_environment_overrides_local_env_file(tmp_path: Path) -> None:
    env_file = tmp_path / ".env.local"
    env_file.write_text(
        "\n".join(
            (
                "AOTUNE_AGENT_PROVIDER=openai-compatible",
                "AOTUNE_LLM_MODEL=file-model",
                "AOTUNE_LLM_TIMEOUT_SECONDS=45",
            )
        ),
        encoding="utf-8",
    )

    settings = Settings.from_env(
        {
            "AOTUNE_AGENT_PROVIDER": "fake",
            "AOTUNE_LLM_MODEL": "process-model",
            "AOTUNE_LLM_TIMEOUT_SECONDS": "30",
        },
        env_file=env_file,
    )

    assert settings.agent_provider == "fake"
    assert settings.llm_model == "process-model"
    assert settings.llm_timeout_seconds == 30


def test_fake_provider_works_without_local_env_or_credentials(tmp_path: Path) -> None:
    settings = Settings.from_env({}, env_file=tmp_path / ".env.local")

    provider = get_lyrics_learning_agent_provider(settings)

    assert isinstance(provider, FakeLyricsLearningAgentProvider)

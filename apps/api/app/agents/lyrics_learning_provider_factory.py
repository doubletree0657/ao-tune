from dataclasses import dataclass

from app.agents.lyrics_learning_provider import (
    FakeLyricsLearningAgentProvider,
    LyricsLearningAgentProvider,
    OpenAICompatibleLyricsLearningAgentProvider,
)
from app.config import Settings


class ProviderConfigurationError(ValueError):
    """Raised when the configured agent provider cannot be used safely."""


@dataclass(frozen=True)
class AgentProviderResolution:
    provider: LyricsLearningAgentProvider
    app_env: str
    configured_provider: str
    resolved_provider: str
    profile: str
    model: str | None


def get_lyrics_learning_agent_provider(
    settings: Settings,
) -> LyricsLearningAgentProvider:
    return resolve_lyrics_learning_agent_provider(settings).provider


def resolve_lyrics_learning_agent_provider(
    settings: Settings,
) -> AgentProviderResolution:
    resolved_provider = resolve_agent_provider_name(settings)
    if resolved_provider == "fake":
        return AgentProviderResolution(
            provider=FakeLyricsLearningAgentProvider(
                profile=settings.default_llm_profile,
            ),
            app_env=settings.app_env,
            configured_provider=settings.agent_provider,
            resolved_provider=resolved_provider,
            profile=settings.default_llm_profile,
            model=None,
        )
    return AgentProviderResolution(
        provider=OpenAICompatibleLyricsLearningAgentProvider(settings=settings),
        app_env=settings.app_env,
        configured_provider=settings.agent_provider,
        resolved_provider=resolved_provider,
        profile=settings.default_llm_profile,
        model=settings.llm_model,
    )


def resolve_agent_provider_name(settings: Settings) -> str:
    app_env = settings.app_env
    configured_provider = settings.agent_provider
    if app_env not in {"test", "development", "production"}:
        raise ProviderConfigurationError(f"Unsupported AOTUNE_APP_ENV: {app_env}")
    if configured_provider not in {"auto", "fake", "openai-compatible"}:
        raise ProviderConfigurationError(
            f"Unsupported AOTUNE_AGENT_PROVIDER: {configured_provider}"
        )

    if app_env == "test":
        if configured_provider == "openai-compatible":
            raise ProviderConfigurationError(
                "AOTUNE_AGENT_PROVIDER=openai-compatible is not allowed when "
                "AOTUNE_APP_ENV=test"
            )
        return "fake"

    if app_env == "development":
        if configured_provider == "fake":
            return "fake"
        if configured_provider == "openai-compatible":
            require_complete_llm_configuration(settings)
            return "openai-compatible"
        if has_any_llm_configuration(settings):
            require_complete_llm_configuration(settings)
            return "openai-compatible"
        return "fake"

    if configured_provider == "fake":
        raise ProviderConfigurationError(
            "AOTUNE_AGENT_PROVIDER=fake is not allowed when "
            "AOTUNE_APP_ENV=production"
        )
    require_complete_llm_configuration(settings)
    return "openai-compatible"


def require_complete_llm_configuration(settings: Settings) -> None:
    missing = missing_llm_configuration(settings)
    if missing:
        raise ProviderConfigurationError(
            "Missing required OpenAI-compatible configuration: "
            + ", ".join(missing)
        )


def missing_llm_configuration(settings: Settings) -> list[str]:
    return [
        name
        for name, value in (
            ("AOTUNE_LLM_BASE_URL", settings.llm_base_url),
            ("AOTUNE_LLM_MODEL", settings.llm_model),
            ("AOTUNE_LLM_API_KEY", settings.llm_api_key),
        )
        if not _has_value(value)
    ]


def has_any_llm_configuration(settings: Settings) -> bool:
    return any(
        _has_value(value)
        for value in (
            settings.llm_base_url,
            settings.llm_model,
            settings.llm_api_key,
        )
    )


def _has_value(value: str | None) -> bool:
    return bool(value and value.strip())

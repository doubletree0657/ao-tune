from app.agents.lyrics_learning_provider import (
    FakeLyricsLearningAgentProvider,
    LyricsLearningAgentProvider,
    OpenAICompatibleLyricsLearningAgentProvider,
)
from app.config import Settings


class ProviderConfigurationError(ValueError):
    """Raised when the configured agent provider is unknown."""


def get_lyrics_learning_agent_provider(
    settings: Settings,
) -> LyricsLearningAgentProvider:
    if settings.agent_provider == "fake":
        return FakeLyricsLearningAgentProvider(
            profile=settings.default_llm_profile,
        )
    if settings.agent_provider == "openai-compatible":
        missing = [
            name
            for name, value in (
                ("AOTUNE_LLM_BASE_URL", settings.llm_base_url),
                ("AOTUNE_LLM_MODEL", settings.llm_model),
                ("AOTUNE_LLM_API_KEY", settings.llm_api_key),
            )
            if not value
        ]
        if missing:
            raise ProviderConfigurationError(
                "Missing required OpenAI-compatible configuration: "
                + ", ".join(missing)
            )
        return OpenAICompatibleLyricsLearningAgentProvider(settings=settings)

    raise ProviderConfigurationError(
        f"Unsupported AOTUNE_AGENT_PROVIDER: {settings.agent_provider}"
    )

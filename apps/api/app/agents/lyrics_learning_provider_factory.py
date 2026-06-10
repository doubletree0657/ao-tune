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
        return OpenAICompatibleLyricsLearningAgentProvider(settings=settings)

    raise ProviderConfigurationError(
        f"Unsupported AOTUNE_AGENT_PROVIDER: {settings.agent_provider}"
    )

from typing import Protocol
from uuid import uuid4

from app.config import Settings
from app.schemas.lyrics_learning import (
    GeneratedSection,
    LyricsLearningDraftRequest,
    LyricsLearningDraftResponse,
    ProviderMetadata,
)


class LyricsLearningAgentProvider(Protocol):
    def create_draft(
        self,
        request: LyricsLearningDraftRequest,
    ) -> LyricsLearningDraftResponse: ...


class FakeLyricsLearningAgentProvider:
    _generated_sections = (
        ("romaji_alignment", "Romaji alignment"),
        ("chinese_pronunciation", "Approximate Chinese pronunciation"),
        ("line_by_line_meaning", "Line-by-line meaning"),
        ("pronunciation_notes", "Pronunciation notes"),
        ("sing_along_notes", "Sing-along notes"),
        ("review_cards", "Review cards and learning artifacts"),
    )

    def __init__(self, profile: str = "default") -> None:
        self._profile = profile

    def create_draft(
        self,
        request: LyricsLearningDraftRequest,
    ) -> LyricsLearningDraftResponse:
        sections = [
            GeneratedSection(
                key=key,
                label=label,
                status="pending",
                value="Pending agent generation",
            )
            for key, label in self._generated_sections
        ]

        return LyricsLearningDraftResponse(
            id=str(uuid4()),
            song_title=request.song_title,
            artist=request.artist,
            learning_goal=request.learning_goal,
            source_type="user_provided",
            status="pending_agent_generation",
            user_context=request.lyrics_or_notes,
            generated_sections=sections,
            provider_metadata=ProviderMetadata(
                provider="fake",
                model=None,
                profile=self._profile,
                mode="pending_agent_generation",
            ),
        )


class ProviderNotImplementedError(NotImplementedError):
    """Raised when a configured provider is only an architecture placeholder."""


class OpenAICompatibleLyricsLearningAgentProvider:
    """Future OpenAI-compatible adapter; no network calls are implemented."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def create_draft(
        self,
        request: LyricsLearningDraftRequest,
    ) -> LyricsLearningDraftResponse:
        del request
        raise ProviderNotImplementedError(
            "The openai-compatible lyrics learning provider is not implemented; "
            "use AOTUNE_AGENT_PROVIDER=fake"
        )

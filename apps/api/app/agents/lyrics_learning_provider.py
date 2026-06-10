from typing import Protocol
from uuid import uuid4

from app.schemas.lyrics_learning import (
    GeneratedSection,
    LyricsLearningDraftRequest,
    LyricsLearningDraftResponse,
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
        )

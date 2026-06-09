from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, status
from pydantic import BaseModel, ConfigDict, Field


class LyricsLearningDraftRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    song_title: str = Field(alias="songTitle", min_length=1)
    artist: str = Field(min_length=1)
    learning_goal: str = Field(alias="learningGoal", min_length=1)
    lyrics_or_notes: str | None = Field(default=None, alias="lyricsOrNotes")


class GeneratedSection(BaseModel):
    key: str
    label: str
    status: Literal["pending"]
    value: str


class LyricsLearningDraftResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    song_title: str = Field(alias="songTitle")
    artist: str
    learning_goal: str = Field(alias="learningGoal")
    source_type: Literal["user_provided"] = Field(alias="sourceType")
    status: Literal["pending_agent_generation"]
    user_context: str | None = Field(alias="userContext")
    generated_sections: list[GeneratedSection] = Field(alias="generatedSections")


GENERATED_SECTIONS = [
    ("romaji_alignment", "Romaji alignment"),
    ("chinese_pronunciation", "Approximate Chinese pronunciation"),
    ("line_by_line_meaning", "Line-by-line meaning"),
    ("pronunciation_notes", "Pronunciation notes"),
    ("sing_along_notes", "Sing-along notes"),
    ("review_cards", "Review cards and learning artifacts"),
]


router = APIRouter(prefix="/api/lyrics-learning", tags=["lyrics-learning"])


@router.post(
    "/drafts",
    response_model=LyricsLearningDraftResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_lyrics_learning_draft(
    request: LyricsLearningDraftRequest,
) -> LyricsLearningDraftResponse:
    sections = [
        GeneratedSection(
            key=key,
            label=label,
            status="pending",
            value="Pending agent generation",
        )
        for key, label in GENERATED_SECTIONS
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

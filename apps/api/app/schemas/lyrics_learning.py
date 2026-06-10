from typing import Literal

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


class LyricsLineCard(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    line_number: int = Field(alias="lineNumber", ge=1)
    original_text: str = Field(alias="originalText")
    romaji: str | None = None
    approximate_chinese_pronunciation: str | None = Field(
        default=None,
        alias="approximateChinesePronunciation",
    )
    meaning: str | None = None
    pronunciation_notes: list[str] = Field(
        default_factory=list,
        alias="pronunciationNotes",
    )
    sing_along_notes: list[str] = Field(
        default_factory=list,
        alias="singAlongNotes",
    )
    confidence: float | None = Field(default=None, ge=0, le=1)
    needs_review: bool = Field(default=False, alias="needsReview")


class LyricsLearningAgentOutput(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    line_cards: list[LyricsLineCard] = Field(
        default_factory=list,
        alias="lineCards",
    )
    pronunciation_notes: list[str] = Field(
        default_factory=list,
        alias="pronunciationNotes",
    )
    sing_along_notes: list[str] = Field(
        default_factory=list,
        alias="singAlongNotes",
    )
    review_cards: list[str] = Field(default_factory=list, alias="reviewCards")


class ProviderMetadata(BaseModel):
    provider: str
    model: str | None = None
    profile: str
    mode: str


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
    provider_metadata: ProviderMetadata = Field(alias="providerMetadata")

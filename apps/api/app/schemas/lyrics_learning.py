from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

GENERATED_SECTION_DEFINITIONS = (
    ("romaji_alignment", "Romaji alignment"),
    ("chinese_pronunciation", "Approximate Chinese pronunciation"),
    ("line_by_line_meaning", "Line-by-line meaning"),
    ("pronunciation_notes", "Pronunciation notes"),
    ("sing_along_notes", "Sing-along notes"),
    ("review_cards", "Review cards and learning artifacts"),
)


class LyricsLearningDraftRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    song_title: str = Field(alias="songTitle", min_length=1)
    artist: str = Field(min_length=1)
    learning_goal: str = Field(alias="learningGoal", min_length=1)
    lyrics_text: str | None = Field(default=None, alias="lyricsText")
    study_notes: str | None = Field(default=None, alias="studyNotes")
    lyrics_or_notes: str | None = Field(
        default=None,
        alias="lyricsOrNotes",
        exclude=True,
    )

    @model_validator(mode="after")
    def apply_legacy_context(self) -> "LyricsLearningDraftRequest":
        if self.lyrics_or_notes and not self.study_notes and not self.lyrics_text:
            self.study_notes = self.lyrics_or_notes
        return self


class GeneratedSection(BaseModel):
    key: str
    label: str
    status: Literal["pending", "generated", "needs_review"]
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
    status: Literal[
        "pending_agent_generation",
        "generated",
        "needs_review",
    ]
    lyrics_text: str | None = Field(default=None, alias="lyricsText")
    study_notes: str | None = Field(default=None, alias="studyNotes")
    user_context: str | None = Field(alias="userContext")
    generated_sections: list[GeneratedSection] = Field(alias="generatedSections")
    provider_metadata: ProviderMetadata = Field(alias="providerMetadata")
    agent_output: LyricsLearningAgentOutput | None = Field(
        default=None,
        alias="agentOutput",
    )
    generation_error: str | None = Field(default=None, alias="generationError")


def build_generated_sections(
    status: str,
    provider_mode: str,
) -> list[GeneratedSection]:
    if status == "pending_agent_generation":
        section_status = "pending"
        section_value = "Pending agent generation"
    elif provider_mode == "generation_failed":
        section_status = "needs_review"
        section_value = "Generation needs review"
    elif status == "generated":
        section_status = "generated"
        section_value = "Generated draft available"
    else:
        section_status = "needs_review"
        section_value = "Generated draft needs review"

    return [
        GeneratedSection(
            key=key,
            label=label,
            status=section_status,
            value=section_value,
        )
        for key, label in GENERATED_SECTION_DEFINITIONS
    ]

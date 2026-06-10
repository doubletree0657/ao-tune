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

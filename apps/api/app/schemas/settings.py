from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, StrictBool, model_validator

ApplicationTheme = Literal["light", "black", "midnight", "sky"]
ALLOWED_APPLICATION_THEMES: tuple[ApplicationTheme, ...] = (
    "light",
    "black",
    "midnight",
    "sky",
)


class SongSheetSettings(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    show_romaji: StrictBool = Field(alias="showRomaji")
    show_translation: StrictBool = Field(alias="showTranslation")


class LyricsLearningSettings(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    song_sheet: SongSheetSettings = Field(alias="songSheet")


class ApplicationSettingsDocument(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    theme: ApplicationTheme
    lyrics_learning: LyricsLearningSettings = Field(alias="lyricsLearning")


class ApplicationSettingsResponse(ApplicationSettingsDocument):
    updated_at: datetime = Field(alias="updatedAt")


class SongSheetSettingsUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    show_romaji: StrictBool | None = Field(default=None, alias="showRomaji")
    show_translation: StrictBool | None = Field(default=None, alias="showTranslation")

    @model_validator(mode="after")
    def reject_explicit_nulls(self) -> "SongSheetSettingsUpdateRequest":
        if "show_romaji" in self.model_fields_set and self.show_romaji is None:
            raise ValueError("showRomaji must be a boolean when provided.")
        if (
            "show_translation" in self.model_fields_set
            and self.show_translation is None
        ):
            raise ValueError("showTranslation must be a boolean when provided.")
        return self


class LyricsLearningSettingsUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    song_sheet: SongSheetSettingsUpdateRequest | None = Field(
        default=None,
        alias="songSheet",
    )

    @model_validator(mode="after")
    def reject_explicit_nulls(self) -> "LyricsLearningSettingsUpdateRequest":
        if "song_sheet" in self.model_fields_set and self.song_sheet is None:
            raise ValueError("songSheet must be an object when provided.")
        return self


class ApplicationSettingsUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    theme: ApplicationTheme | None = None
    lyrics_learning: LyricsLearningSettingsUpdateRequest | None = Field(
        default=None,
        alias="lyricsLearning",
    )

    @model_validator(mode="after")
    def reject_explicit_nulls(self) -> "ApplicationSettingsUpdateRequest":
        if "theme" in self.model_fields_set and self.theme is None:
            raise ValueError("theme must be a supported theme when provided.")
        if (
            "lyrics_learning" in self.model_fields_set
            and self.lyrics_learning is None
        ):
            raise ValueError("lyricsLearning must be an object when provided.")
        return self


DEFAULT_APPLICATION_SETTINGS = ApplicationSettingsDocument(
    theme="light",
    lyrics_learning=LyricsLearningSettings(
        song_sheet=SongSheetSettings(
            show_romaji=True,
            show_translation=True,
        ),
    ),
)


def default_application_settings_dict() -> dict:
    return DEFAULT_APPLICATION_SETTINGS.model_dump(by_alias=True)

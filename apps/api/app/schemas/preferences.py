from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

ApplicationTheme = Literal["light", "black", "midnight", "sky"]
ALLOWED_APPLICATION_THEMES: tuple[ApplicationTheme, ...] = (
    "light",
    "black",
    "midnight",
    "sky",
)


class ApplicationPreferencesResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    theme: ApplicationTheme
    updated_at: datetime = Field(alias="updatedAt")


class ApplicationPreferencesUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    theme: ApplicationTheme

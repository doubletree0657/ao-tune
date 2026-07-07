from typing import Protocol

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.application_settings import ApplicationSettings
from app.schemas.settings import (
    ApplicationSettingsDocument,
    ApplicationSettingsResponse,
    ApplicationSettingsUpdateRequest,
)

APPLICATION_SETTINGS_ID = 1


class InvalidApplicationSettingsError(RuntimeError):
    pass


class ApplicationSettingsRepository(Protocol):
    async def get(self) -> ApplicationSettingsResponse | None: ...

    async def update(
        self,
        request: ApplicationSettingsUpdateRequest,
    ) -> ApplicationSettingsResponse | None: ...


class SQLAlchemyApplicationSettingsRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(self) -> ApplicationSettingsResponse | None:
        result = await self._session.execute(
            select(ApplicationSettings).where(
                ApplicationSettings.id == APPLICATION_SETTINGS_ID
            )
        )
        settings = result.scalar_one_or_none()
        if settings is None:
            return None
        return settings_to_response(settings)

    async def update(
        self,
        request: ApplicationSettingsUpdateRequest,
    ) -> ApplicationSettingsResponse | None:
        async with self._session.begin():
            result = await self._session.execute(
                select(ApplicationSettings)
                .where(ApplicationSettings.id == APPLICATION_SETTINGS_ID)
                .with_for_update()
            )
            settings = result.scalar_one_or_none()
            if settings is None:
                return None

            stored_document = validate_settings_document(settings.settings)
            merged_document = merge_settings_update(stored_document, request)
            if merged_document != stored_document:
                settings.settings = merged_document.model_dump(by_alias=True)
                settings.updated_at = func.now()
                await self._session.flush()
                await self._session.refresh(settings)

            return settings_to_response(settings)


def merge_settings_update(
    document: ApplicationSettingsDocument,
    request: ApplicationSettingsUpdateRequest,
) -> ApplicationSettingsDocument:
    merged = document.model_copy(deep=True)
    update_data = request.model_dump(exclude_unset=True)

    if "theme" in update_data:
        merged.theme = request.theme

    if request.lyrics_learning is not None:
        song_sheet_update = request.lyrics_learning.song_sheet
        if song_sheet_update is not None:
            if song_sheet_update.show_romaji is not None:
                merged.lyrics_learning.song_sheet.show_romaji = (
                    song_sheet_update.show_romaji
                )
            if song_sheet_update.show_translation is not None:
                merged.lyrics_learning.song_sheet.show_translation = (
                    song_sheet_update.show_translation
                )
            if song_sheet_update.original_text_size is not None:
                merged.lyrics_learning.song_sheet.original_text_size = (
                    song_sheet_update.original_text_size
                )
            if song_sheet_update.layout_mode is not None:
                merged.lyrics_learning.song_sheet.layout_mode = (
                    song_sheet_update.layout_mode
                )

    return validate_settings_document(merged.model_dump(by_alias=True))


def validate_settings_document(settings: object) -> ApplicationSettingsDocument:
    try:
        return ApplicationSettingsDocument.model_validate(settings)
    except ValueError as error:
        raise InvalidApplicationSettingsError(
            "Stored application settings are invalid."
        ) from error


def settings_to_response(
    settings: ApplicationSettings,
) -> ApplicationSettingsResponse:
    document = validate_settings_document(settings.settings)
    return ApplicationSettingsResponse(
        **document.model_dump(by_alias=True),
        updated_at=settings.updated_at,
    )

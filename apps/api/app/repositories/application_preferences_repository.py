from typing import Protocol

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.application_preferences import ApplicationPreferences
from app.schemas.preferences import (
    ApplicationPreferencesResponse,
    ApplicationTheme,
)

APPLICATION_PREFERENCES_ID = 1


class ApplicationPreferencesRepository(Protocol):
    async def get(self) -> ApplicationPreferencesResponse | None: ...

    async def update_theme(
        self,
        theme: ApplicationTheme,
    ) -> ApplicationPreferencesResponse | None: ...


class SQLAlchemyApplicationPreferencesRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(self) -> ApplicationPreferencesResponse | None:
        result = await self._session.execute(
            select(ApplicationPreferences).where(
                ApplicationPreferences.id == APPLICATION_PREFERENCES_ID
            )
        )
        preferences = result.scalar_one_or_none()
        if preferences is None:
            return None
        return preferences_to_response(preferences)

    async def update_theme(
        self,
        theme: ApplicationTheme,
    ) -> ApplicationPreferencesResponse | None:
        async with self._session.begin():
            result = await self._session.execute(
                select(ApplicationPreferences)
                .where(ApplicationPreferences.id == APPLICATION_PREFERENCES_ID)
                .with_for_update()
            )
            preferences = result.scalar_one_or_none()
            if preferences is None:
                return None

            if preferences.theme != theme:
                preferences.theme = theme
                preferences.updated_at = func.now()
                await self._session.flush()
                await self._session.refresh(preferences)

            return preferences_to_response(preferences)


def preferences_to_response(
    preferences: ApplicationPreferences,
) -> ApplicationPreferencesResponse:
    return ApplicationPreferencesResponse(
        theme=preferences.theme,
        updated_at=preferences.updated_at,
    )

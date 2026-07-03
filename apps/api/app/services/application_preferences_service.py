from app.repositories.application_preferences_repository import (
    ApplicationPreferencesRepository,
)
from app.schemas.preferences import (
    ApplicationPreferencesResponse,
    ApplicationTheme,
)


class ApplicationPreferencesMissingError(RuntimeError):
    pass


class ApplicationPreferencesService:
    def __init__(
        self,
        repository: ApplicationPreferencesRepository,
    ) -> None:
        self._repository = repository

    async def get_preferences(self) -> ApplicationPreferencesResponse:
        preferences = await self._repository.get()
        if preferences is None:
            raise ApplicationPreferencesMissingError(
                "Application preferences have not been initialized."
            )
        return preferences

    async def update_theme(
        self,
        theme: ApplicationTheme,
    ) -> ApplicationPreferencesResponse:
        preferences = await self._repository.update_theme(theme)
        if preferences is None:
            raise ApplicationPreferencesMissingError(
                "Application preferences have not been initialized."
            )
        return preferences

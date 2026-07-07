from app.repositories.application_settings_repository import (
    ApplicationSettingsRepository,
)
from app.schemas.settings import (
    ApplicationSettingsResponse,
    ApplicationSettingsUpdateRequest,
)


class ApplicationSettingsMissingError(RuntimeError):
    pass


class ApplicationSettingsService:
    def __init__(
        self,
        repository: ApplicationSettingsRepository,
    ) -> None:
        self._repository = repository

    async def get_settings(self) -> ApplicationSettingsResponse:
        settings = await self._repository.get()
        if settings is None:
            raise ApplicationSettingsMissingError(
                "Application settings have not been initialized."
            )
        return settings

    async def update_settings(
        self,
        request: ApplicationSettingsUpdateRequest,
    ) -> ApplicationSettingsResponse:
        settings = await self._repository.update(request)
        if settings is None:
            raise ApplicationSettingsMissingError(
                "Application settings have not been initialized."
            )
        return settings

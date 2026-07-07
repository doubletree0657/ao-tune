from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_database_session
from app.repositories.application_settings_repository import (
    InvalidApplicationSettingsError,
    SQLAlchemyApplicationSettingsRepository,
)
from app.schemas.settings import (
    ApplicationSettingsResponse,
    ApplicationSettingsUpdateRequest,
)
from app.services.application_settings_service import (
    ApplicationSettingsMissingError,
    ApplicationSettingsService,
)

router = APIRouter(prefix="/api/settings", tags=["settings"])


async def get_application_settings_service(
    session: Annotated[AsyncSession, Depends(get_database_session)],
) -> ApplicationSettingsService:
    return ApplicationSettingsService(
        repository=SQLAlchemyApplicationSettingsRepository(session),
    )


@router.get("", response_model=ApplicationSettingsResponse)
async def get_application_settings(
    service: Annotated[
        ApplicationSettingsService,
        Depends(get_application_settings_service),
    ],
) -> ApplicationSettingsResponse:
    try:
        return await service.get_settings()
    except (ApplicationSettingsMissingError, InvalidApplicationSettingsError) as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(error),
        ) from error


@router.patch("", response_model=ApplicationSettingsResponse)
async def update_application_settings(
    request: ApplicationSettingsUpdateRequest,
    service: Annotated[
        ApplicationSettingsService,
        Depends(get_application_settings_service),
    ],
) -> ApplicationSettingsResponse:
    try:
        return await service.update_settings(request)
    except (ApplicationSettingsMissingError, InvalidApplicationSettingsError) as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(error),
        ) from error

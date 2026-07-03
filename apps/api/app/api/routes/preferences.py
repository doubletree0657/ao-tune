from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_database_session
from app.repositories.application_preferences_repository import (
    SQLAlchemyApplicationPreferencesRepository,
)
from app.schemas.preferences import (
    ApplicationPreferencesResponse,
    ApplicationPreferencesUpdateRequest,
)
from app.services.application_preferences_service import (
    ApplicationPreferencesMissingError,
    ApplicationPreferencesService,
)

router = APIRouter(prefix="/api/preferences", tags=["preferences"])


async def get_application_preferences_service(
    session: Annotated[AsyncSession, Depends(get_database_session)],
) -> ApplicationPreferencesService:
    return ApplicationPreferencesService(
        repository=SQLAlchemyApplicationPreferencesRepository(session),
    )


@router.get("", response_model=ApplicationPreferencesResponse)
async def get_application_preferences(
    service: Annotated[
        ApplicationPreferencesService,
        Depends(get_application_preferences_service),
    ],
) -> ApplicationPreferencesResponse:
    try:
        return await service.get_preferences()
    except ApplicationPreferencesMissingError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(error),
        ) from error


@router.patch("", response_model=ApplicationPreferencesResponse)
async def update_application_preferences(
    request: ApplicationPreferencesUpdateRequest,
    service: Annotated[
        ApplicationPreferencesService,
        Depends(get_application_preferences_service),
    ],
) -> ApplicationPreferencesResponse:
    try:
        return await service.update_theme(request.theme)
    except ApplicationPreferencesMissingError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(error),
        ) from error

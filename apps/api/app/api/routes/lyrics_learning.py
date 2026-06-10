from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.agents.lyrics_learning_provider import ProviderRequestError
from app.agents.lyrics_learning_provider_factory import (
    ProviderConfigurationError,
    get_lyrics_learning_agent_provider,
)
from app.config import Settings
from app.schemas.lyrics_learning import (
    LyricsLearningDraftRequest,
    LyricsLearningDraftResponse,
)
from app.services.lyrics_learning_service import LyricsLearningDraftService

router = APIRouter(prefix="/api/lyrics-learning", tags=["lyrics-learning"])

async def get_lyrics_learning_draft_service() -> LyricsLearningDraftService:
    try:
        provider = get_lyrics_learning_agent_provider(Settings.from_env())
    except (ProviderConfigurationError, ValueError) as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error

    return LyricsLearningDraftService(provider=provider)


@router.post(
    "/drafts",
    response_model=LyricsLearningDraftResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_lyrics_learning_draft(
    request: LyricsLearningDraftRequest,
    service: Annotated[
        LyricsLearningDraftService,
        Depends(get_lyrics_learning_draft_service),
    ],
) -> LyricsLearningDraftResponse:
    try:
        return await service.create_draft(request)
    except ProviderRequestError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        ) from error

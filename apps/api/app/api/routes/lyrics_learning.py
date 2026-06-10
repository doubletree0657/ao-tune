from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.agents.lyrics_learning_provider import FakeLyricsLearningAgentProvider
from app.schemas.lyrics_learning import (
    LyricsLearningDraftRequest,
    LyricsLearningDraftResponse,
)
from app.services.lyrics_learning_service import LyricsLearningDraftService

router = APIRouter(prefix="/api/lyrics-learning", tags=["lyrics-learning"])

_draft_service = LyricsLearningDraftService(
    provider=FakeLyricsLearningAgentProvider(),
)


async def get_lyrics_learning_draft_service() -> LyricsLearningDraftService:
    return _draft_service


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
    return service.create_draft(request)

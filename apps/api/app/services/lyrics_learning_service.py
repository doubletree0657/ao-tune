from app.agents.lyrics_learning_prompt import PROMPT_CONTRACT_VERSION
from app.agents.lyrics_learning_provider import LyricsLearningAgentProvider
from app.repositories.lyrics_learning_repository import (
    LyricsLearningArtifactRepository,
)
from app.schemas.lyrics_learning import (
    LyricsLearningDraftRequest,
    LyricsLearningDraftResponse,
)


class LyricsLearningDraftService:
    def __init__(
        self,
        provider: LyricsLearningAgentProvider,
        repository: LyricsLearningArtifactRepository,
    ) -> None:
        self._provider = provider
        self._repository = repository

    async def create_draft(
        self,
        request: LyricsLearningDraftRequest,
    ) -> LyricsLearningDraftResponse:
        draft = await self._provider.create_draft(request)
        return await self._repository.create(
            draft=draft,
            prompt_contract_version=PROMPT_CONTRACT_VERSION,
        )

    async def get_draft(
        self,
        draft_id: str,
    ) -> LyricsLearningDraftResponse | None:
        return await self._repository.get(draft_id)

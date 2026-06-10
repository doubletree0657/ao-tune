from app.agents.lyrics_learning_provider import LyricsLearningAgentProvider
from app.schemas.lyrics_learning import (
    LyricsLearningDraftRequest,
    LyricsLearningDraftResponse,
)


class LyricsLearningDraftService:
    def __init__(self, provider: LyricsLearningAgentProvider) -> None:
        self._provider = provider

    def create_draft(
        self,
        request: LyricsLearningDraftRequest,
    ) -> LyricsLearningDraftResponse:
        return self._provider.create_draft(request)

import json
from typing import Protocol
from uuid import uuid4

import httpx
from pydantic import ValidationError

from app.agents.lyrics_learning_prompt import (
    SYSTEM_PROMPT,
    build_user_prompt,
)
from app.config import Settings
from app.schemas.lyrics_learning import (
    LyricsLearningAgentOutput,
    LyricsLearningDraftRequest,
    LyricsLearningDraftResponse,
    ProviderMetadata,
    build_generated_sections,
)


class LyricsLearningAgentProvider(Protocol):
    async def create_draft(
        self,
        request: LyricsLearningDraftRequest,
    ) -> LyricsLearningDraftResponse: ...


class FakeLyricsLearningAgentProvider:
    def __init__(self, profile: str = "default") -> None:
        self._profile = profile

    async def create_draft(
        self,
        request: LyricsLearningDraftRequest,
    ) -> LyricsLearningDraftResponse:
        return LyricsLearningDraftResponse(
            id=str(uuid4()),
            song_title=request.song_title,
            artist=request.artist,
            learning_goal=request.learning_goal,
            source_type="user_provided",
            status="pending_agent_generation",
            lyrics_text=request.lyrics_text,
            study_notes=request.study_notes,
            user_context=request.study_notes,
            generated_sections=build_generated_sections(
                status="pending_agent_generation",
                provider_mode="pending_agent_generation",
            ),
            provider_metadata=ProviderMetadata(
                provider="fake",
                model=None,
                profile=self._profile,
                mode="pending_agent_generation",
            ),
        )


class ProviderRequestError(RuntimeError):
    """Raised when an LLM provider request cannot be completed."""


class OpenAICompatibleLyricsLearningAgentProvider:
    """Generate structured drafts through an OpenAI-compatible chat API."""

    def __init__(
        self,
        settings: Settings,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._settings = settings
        self._transport = transport

    async def create_draft(
        self,
        request: LyricsLearningDraftRequest,
    ) -> LyricsLearningDraftResponse:
        if not request.lyrics_text or not request.lyrics_text.strip():
            return self._build_generated_response(
                request,
                LyricsLearningAgentOutput(
                    line_cards=[],
                    review_cards=[
                        "Add user-provided lyrics text before generating line cards."
                    ],
                ),
                mode="missing_lyrics_text",
            )

        response_content = await self._request_completion(request)

        try:
            output = LyricsLearningAgentOutput.model_validate(
                json.loads(response_content)
            )
        except (json.JSONDecodeError, ValidationError, TypeError):
            return self._build_needs_review_response(
                request,
                "The model response was not valid structured lyrics learning "
                "output. Review the request and try again.",
            )

        self._enforce_lyrics_source(request, output)
        self._require_user_review(output)
        return self._build_generated_response(request, output)

    @staticmethod
    def _enforce_lyrics_source(
        request: LyricsLearningDraftRequest,
        output: LyricsLearningAgentOutput,
    ) -> None:
        lyrics_lines = {
            line.strip()
            for line in (request.lyrics_text or "").splitlines()
            if line.strip()
        }
        valid_line_cards = [
            card
            for card in output.line_cards
            if card.original_text.strip() in lyrics_lines
        ]
        if len(valid_line_cards) != len(output.line_cards):
            output.line_cards = valid_line_cards
            output.review_cards.append(
                "One or more generated line cards were removed because they did "
                "not match the user-provided lyrics text."
            )

    @staticmethod
    def _require_user_review(output: LyricsLearningAgentOutput) -> None:
        for card in output.line_cards:
            card.needs_review = True

    async def _request_completion(
        self,
        request: LyricsLearningDraftRequest,
    ) -> str:
        base_url = self._required_setting(
            self._settings.llm_base_url,
            "AOTUNE_LLM_BASE_URL",
        ).rstrip("/")
        model = self._required_setting(
            self._settings.llm_model,
            "AOTUNE_LLM_MODEL",
        )
        api_key = self._required_setting(
            self._settings.llm_api_key,
            "AOTUNE_LLM_API_KEY",
        )

        try:
            async with httpx.AsyncClient(
                timeout=self._settings.llm_timeout_seconds,
                transport=self._transport,
            ) as client:
                response = await client.post(
                    f"{base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model,
                        "messages": [
                            {"role": "system", "content": SYSTEM_PROMPT},
                            {
                                "role": "user",
                                "content": build_user_prompt(request),
                            },
                        ],
                        "response_format": {"type": "json_object"},
                        "temperature": 0.2,
                    },
                )
                response.raise_for_status()
        except httpx.TimeoutException as error:
            raise ProviderRequestError(
                "The OpenAI-compatible provider request timed out."
            ) from error
        except httpx.HTTPStatusError as error:
            raise ProviderRequestError(
                "The OpenAI-compatible provider request failed with status "
                f"{error.response.status_code}."
            ) from error
        except httpx.HTTPError as error:
            raise ProviderRequestError(
                "The OpenAI-compatible provider could not be reached."
            ) from error

        try:
            content = response.json()["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError, ValueError) as error:
            raise ProviderRequestError(
                "The OpenAI-compatible provider returned an unexpected response"
            ) from error

        if not isinstance(content, str):
            raise ProviderRequestError(
                "The OpenAI-compatible provider returned empty content"
            )
        return content

    def _build_generated_response(
        self,
        request: LyricsLearningDraftRequest,
        output: LyricsLearningAgentOutput,
        mode: str = "structured_generation",
    ) -> LyricsLearningDraftResponse:
        needs_review = not output.line_cards or any(
            card.needs_review for card in output.line_cards
        )
        status = "needs_review" if needs_review else "generated"

        return self._build_response(
            request=request,
            status=status,
            mode=mode,
            output=output,
        )

    def _build_needs_review_response(
        self,
        request: LyricsLearningDraftRequest,
        error_message: str,
    ) -> LyricsLearningDraftResponse:
        return self._build_response(
            request=request,
            status="needs_review",
            mode="generation_failed",
            output=None,
            generation_error=error_message,
        )

    def _build_response(
        self,
        request: LyricsLearningDraftRequest,
        status: str,
        mode: str,
        output: LyricsLearningAgentOutput | None,
        generation_error: str | None = None,
    ) -> LyricsLearningDraftResponse:
        return LyricsLearningDraftResponse(
            id=str(uuid4()),
            song_title=request.song_title,
            artist=request.artist,
            learning_goal=request.learning_goal,
            source_type="user_provided",
            status=status,
            lyrics_text=request.lyrics_text,
            study_notes=request.study_notes,
            user_context=request.study_notes,
            generated_sections=build_generated_sections(
                status=status,
                provider_mode=mode,
            ),
            provider_metadata=ProviderMetadata(
                provider="openai-compatible",
                model=self._settings.llm_model,
                profile=self._settings.default_llm_profile,
                mode=mode,
            ),
            agent_output=output,
            generation_error=generation_error,
        )

    @staticmethod
    def _required_setting(value: str | None, name: str) -> str:
        if not value:
            raise ProviderRequestError(f"Missing required configuration: {name}")
        return value

from typing import Protocol
from uuid import UUID

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.lyrics_learning import (
    LyricsLearningArtifact,
    LyricsLearningLineCard,
)
from app.schemas.lyrics_learning import (
    LyricsLearningAgentOutput,
    LyricsLearningDraftResponse,
    LyricsLearningDraftSummary,
    LyricsLearningDraftUpdateRequest,
    LyricsLineCard,
    ProviderMetadata,
    build_generated_sections,
)


class InvalidLineCardCollectionError(ValueError):
    pass


class LyricsLearningArtifactRepository(Protocol):
    async def create(
        self,
        draft: LyricsLearningDraftResponse,
        prompt_contract_version: str,
    ) -> LyricsLearningDraftResponse: ...

    async def get(self, artifact_id: str) -> LyricsLearningDraftResponse | None: ...

    async def list(self, limit: int) -> list[LyricsLearningDraftSummary]: ...

    async def update_line_cards(
        self,
        artifact_id: str,
        request: LyricsLearningDraftUpdateRequest,
    ) -> LyricsLearningDraftResponse | None: ...


class SQLAlchemyLyricsLearningArtifactRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(
        self,
        draft: LyricsLearningDraftResponse,
        prompt_contract_version: str,
    ) -> LyricsLearningDraftResponse:
        output = draft.agent_output
        artifact = LyricsLearningArtifact(
            id=UUID(draft.id),
            song_title=draft.song_title,
            artist=draft.artist,
            learning_goal=draft.learning_goal,
            source_type=draft.source_type,
            status=draft.status,
            lyrics_text=draft.lyrics_text,
            study_notes=draft.study_notes,
            provider=draft.provider_metadata.provider,
            provider_model=draft.provider_metadata.model,
            provider_profile=draft.provider_metadata.profile,
            provider_mode=draft.provider_metadata.mode,
            prompt_contract_version=prompt_contract_version,
            agent_output_present=output is not None,
            pronunciation_notes=output.pronunciation_notes if output else [],
            sing_along_notes=output.sing_along_notes if output else [],
            review_cards=output.review_cards if output else [],
            generation_error=draft.generation_error,
        )
        if output:
            artifact.line_cards = [
                LyricsLearningLineCard(
                    line_number=card.line_number,
                    original_text=card.original_text,
                    romaji=card.romaji,
                    approximate_chinese_pronunciation=(
                        card.approximate_chinese_pronunciation
                    ),
                    meaning=card.meaning,
                    pronunciation_notes=card.pronunciation_notes,
                    sing_along_notes=card.sing_along_notes,
                    confidence=card.confidence,
                    needs_review=card.needs_review,
                )
                for card in output.line_cards
            ]

        async with self._session.begin():
            self._session.add(artifact)
            await self._session.flush()
            return artifact_to_response(artifact)

    async def get(self, artifact_id: str) -> LyricsLearningDraftResponse | None:
        try:
            parsed_id = UUID(artifact_id)
        except ValueError:
            return None

        result = await self._session.execute(
            select(LyricsLearningArtifact)
            .options(selectinload(LyricsLearningArtifact.line_cards))
            .where(LyricsLearningArtifact.id == parsed_id)
        )
        artifact = result.scalar_one_or_none()
        if artifact is None:
            return None
        return artifact_to_response(artifact)

    async def list(self, limit: int) -> list[LyricsLearningDraftSummary]:
        line_card_count = func.count(LyricsLearningLineCard.id)
        needs_review_count = func.coalesce(
            func.sum(
                case(
                    (LyricsLearningLineCard.needs_review.is_(True), 1),
                    else_=0,
                )
            ),
            0,
        )
        result = await self._session.execute(
            select(
                LyricsLearningArtifact.id,
                LyricsLearningArtifact.song_title,
                LyricsLearningArtifact.artist,
                LyricsLearningArtifact.status,
                LyricsLearningArtifact.provider,
                LyricsLearningArtifact.provider_model,
                LyricsLearningArtifact.created_at,
                LyricsLearningArtifact.updated_at,
                line_card_count.label("line_card_count"),
                needs_review_count.label("needs_review_count"),
            )
            .outerjoin(LyricsLearningArtifact.line_cards)
            .group_by(LyricsLearningArtifact.id)
            .order_by(
                LyricsLearningArtifact.updated_at.desc(),
                LyricsLearningArtifact.id.asc(),
            )
            .limit(limit)
        )
        return [
            LyricsLearningDraftSummary(
                id=str(row.id),
                song_title=row.song_title,
                artist=row.artist,
                status=row.status,
                provider=row.provider,
                model=row.provider_model,
                line_card_count=int(row.line_card_count),
                needs_review_count=int(row.needs_review_count),
                created_at=row.created_at,
                updated_at=row.updated_at,
            )
            for row in result
        ]

    async def update_line_cards(
        self,
        artifact_id: str,
        request: LyricsLearningDraftUpdateRequest,
    ) -> LyricsLearningDraftResponse | None:
        try:
            parsed_id = UUID(artifact_id)
        except ValueError:
            return None

        submitted_line_numbers = [card.line_number for card in request.line_cards]
        duplicate_line_numbers = sorted(
            {
                line_number
                for line_number in submitted_line_numbers
                if submitted_line_numbers.count(line_number) > 1
            }
        )
        if duplicate_line_numbers:
            raise InvalidLineCardCollectionError(
                "Duplicate line numbers submitted: "
                f"{_format_line_numbers(duplicate_line_numbers)}."
            )

        async with self._session.begin():
            result = await self._session.execute(
                select(LyricsLearningArtifact)
                .options(selectinload(LyricsLearningArtifact.line_cards))
                .where(LyricsLearningArtifact.id == parsed_id)
                .with_for_update()
            )
            artifact = result.scalar_one_or_none()
            if artifact is None:
                return None

            stored_cards_by_line_number = {
                card.line_number: card for card in artifact.line_cards
            }
            stored_line_numbers = set(stored_cards_by_line_number)
            submitted_line_number_set = set(submitted_line_numbers)

            missing_line_numbers = sorted(
                stored_line_numbers - submitted_line_number_set
            )
            unknown_line_numbers = sorted(
                submitted_line_number_set - stored_line_numbers
            )
            if missing_line_numbers or unknown_line_numbers:
                details: list[str] = []
                if missing_line_numbers:
                    details.append(
                        "missing stored line numbers "
                        f"{_format_line_numbers(missing_line_numbers)}"
                    )
                if unknown_line_numbers:
                    details.append(
                        "unknown line numbers "
                        f"{_format_line_numbers(unknown_line_numbers)}"
                    )
                raise InvalidLineCardCollectionError(
                    "Submitted line cards must exactly match the stored line "
                    f"numbers; {', '.join(details)}."
                )

            for submitted_card in request.line_cards:
                stored_card = stored_cards_by_line_number[submitted_card.line_number]
                stored_card.romaji = submitted_card.romaji
                stored_card.approximate_chinese_pronunciation = (
                    submitted_card.approximate_chinese_pronunciation
                )
                stored_card.meaning = submitted_card.meaning
                stored_card.pronunciation_notes = submitted_card.pronunciation_notes
                stored_card.sing_along_notes = submitted_card.sing_along_notes
                stored_card.needs_review = submitted_card.needs_review

            artifact.status = (
                "needs_review"
                if any(card.needs_review for card in request.line_cards)
                else "generated"
            )
            artifact.updated_at = func.now()
            await self._session.flush()
            return artifact_to_response(artifact)


def artifact_to_response(
    artifact: LyricsLearningArtifact,
) -> LyricsLearningDraftResponse:
    output = None
    if artifact.agent_output_present:
        output = LyricsLearningAgentOutput(
            line_cards=[
                LyricsLineCard(
                    line_number=card.line_number,
                    original_text=card.original_text,
                    romaji=card.romaji,
                    approximate_chinese_pronunciation=(
                        card.approximate_chinese_pronunciation
                    ),
                    meaning=card.meaning,
                    pronunciation_notes=card.pronunciation_notes,
                    sing_along_notes=card.sing_along_notes,
                    confidence=(
                        float(card.confidence)
                        if card.confidence is not None
                        else None
                    ),
                    needs_review=card.needs_review,
                )
                for card in artifact.line_cards
            ],
            pronunciation_notes=artifact.pronunciation_notes,
            sing_along_notes=artifact.sing_along_notes,
            review_cards=artifact.review_cards,
        )

    return LyricsLearningDraftResponse(
        id=str(artifact.id),
        song_title=artifact.song_title,
        artist=artifact.artist,
        learning_goal=artifact.learning_goal,
        source_type="user_provided",
        status=artifact.status,
        lyrics_text=artifact.lyrics_text,
        study_notes=artifact.study_notes,
        user_context=artifact.study_notes,
        generated_sections=build_generated_sections(
            status=artifact.status,
            provider_mode=artifact.provider_mode,
        ),
        provider_metadata=ProviderMetadata(
            provider=artifact.provider,
            model=artifact.provider_model,
            profile=artifact.provider_profile,
            mode=artifact.provider_mode,
        ),
        agent_output=output,
        generation_error=artifact.generation_error,
    )


def _format_line_numbers(line_numbers: list[int]) -> str:
    return ", ".join(str(line_number) for line_number in line_numbers)

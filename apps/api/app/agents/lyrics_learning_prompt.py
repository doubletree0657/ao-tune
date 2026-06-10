from app.schemas.lyrics_learning import LyricsLearningDraftRequest

PROMPT_CONTRACT_VERSION = "lyrics-learning-v1"

SYSTEM_PROMPT = """You prepare structured Japanese lyrics learning drafts.

Work only from song metadata and lyrics or notes supplied by the user.
Do not fetch, reconstruct, or claim access to lyrics from another source.
Do not claim to be an official source for the song, artist, or pronunciation.
Treat pronunciation guidance as a text-based draft, not a guarantee that it
matches the original performance. Mark uncertain readings as needing review.
Keep every generated field structured, editable, and reviewable.

Return romaji alignment, approximate Chinese pronunciation, line-by-line
meaning, pronunciation notes, sing-along notes, and review cards or learning
artifacts using the LyricsLearningAgentOutput schema.
"""


def build_user_prompt(request: LyricsLearningDraftRequest) -> str:
    user_text = request.lyrics_or_notes or "No lyrics or notes were provided."
    return (
        f"Song title: {request.song_title}\n"
        f"Artist: {request.artist}\n"
        f"Learning goal: {request.learning_goal}\n"
        f"User-provided lyrics or notes:\n{user_text}"
    )

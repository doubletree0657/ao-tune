from app.schemas.lyrics_learning import LyricsLearningDraftRequest

PROMPT_CONTRACT_VERSION = "lyrics-learning-v3"

SYSTEM_PROMPT = """You prepare structured Japanese lyrics learning drafts.

Work only from song metadata, lyrics text, and study notes supplied by the user.
Do not fetch, infer, reconstruct, or claim access to missing copyrighted lyrics.
Do not claim to be an official source for the song, artist, or pronunciation.
Treat pronunciation guidance as a text-based draft, not a guarantee that it
matches the original performance. Mark uncertain readings as needing review.
Keep every generated field structured, editable, and reviewable.

Return only a JSON object matching this shape:
{
  "lineCards": [{
    "lineNumber": 1,
    "originalText": "user-provided line",
    "romaji": "text-based draft or null",
    "approximateChinesePronunciation": "draft hint or null",
    "meaning": "line meaning or null",
    "pronunciationNotes": ["note"],
    "singAlongNotes": ["note"],
    "confidence": 0.0,
    "needsReview": true
  }],
  "pronunciationNotes": ["overall note"],
  "singAlongNotes": ["overall note"],
  "reviewCards": ["review prompt"]
}

Generate lineCards only from lines in the user-provided lyricsText field. Never
turn studyNotes into lineCards, even when the notes contain Japanese text. Use
studyNotes only to guide emphasis, review focus, pronunciation guidance, and
sing-along guidance. If lyricsText is empty, return an empty lineCards array and
explain in reviewCards that user-provided lyrics text is required. Confidence
must be between 0 and 1. Mark uncertain readings with needsReview=true.
"""


def build_user_prompt(request: LyricsLearningDraftRequest) -> str:
    lyrics_text = request.lyrics_text or "No lyrics text was provided."
    study_notes = request.study_notes or "No study notes were provided."
    return (
        f"Song title: {request.song_title}\n"
        f"Artist: {request.artist}\n"
        f"Learning goal: {request.learning_goal}\n"
        "User-provided lyricsText (the only source for lineCards):\n"
        f"{lyrics_text}\n"
        "Study notes (context only; do not convert into lineCards):\n"
        f"{study_notes}"
    )

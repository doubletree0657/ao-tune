# Internationalization Skill

Use this skill when adding or changing user-facing text, locale handling,
translated workspace data, or language selection behavior.

## Requirements

- Support English and Chinese interface directions.
- Keep GitHub documentation and code-facing identifiers in English.
- Avoid mixing languages within one interface surface unless intentionally
  presenting bilingual learning content.
- Keep stable workspace IDs separate from localized display names.
- Design workspace template names and descriptions to support localized fields
  where reasonable.
- Define explicit locale fallback behavior when localization is implemented.
- Avoid string concatenation, embedded word-order assumptions, and layouts that
  only fit short English text.
- Preserve Japanese source material accurately when it is part of learning
  content.

Do not introduce an i18n dependency or migrate all strings unless the task
explicitly includes localization implementation.

# Internationalization Guide

## Language Policy

- GitHub-facing documentation, issues, pull requests, and code comments are
  English-first.
- The application should support English and Chinese interfaces.
- A single UI surface should not mix interface languages unless it intentionally
  presents bilingual learning content.

## User-Facing Text

- Avoid scattering reusable UI text across components.
- Use stable localization keys once localization infrastructure is introduced.
- Keep copy concise and avoid grammar that depends on English word order.
- Plan for text expansion and different line-breaking behavior.
- Do not concatenate translated fragments to form sentences.

## Workspace Data

Workspace template names and descriptions should support localized fields where
reasonable. Stable identifiers such as `japanese-lyrics-learning` must remain
language-neutral and must not change when display text is translated.

Until a localization system is explicitly implemented, keep current English
copy clear and avoid introducing a partial framework. When implementation
begins, define fallback behavior, supported locale codes, and ownership of
frontend versus backend translations before migrating strings.

## Learning Content

Japanese Lyrics Learning may intentionally show Japanese source text alongside
English or Chinese explanations. This is content-level bilingual presentation,
not permission to mix interface labels or navigation languages inconsistently.

# En français — revision app

A PWA (installable on Android and desktop) for revising French lessons for the TEF.
Lessons are JSON files in `content/`; the app is a static Vite + React build
deployed to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main`.

## Adding a lesson from class material

The learner usually shares notes, slides, PDFs or photos in a Claude session and
asks for them to be added. To do that:

1. Read all the material. Create `content/lessons/NN-<id>.json`, where NN is the
   next number and `order` is one more than the current highest.
2. Follow the schema in `src/content/schema.ts` (the zod field descriptions are the
   spec) and the style of the existing lessons:
   - Learner-facing text in French; English only as short `en` glosses.
   - 2–6 sections of 3–10 minutes, in class order. Each mixes a reference
     `table`/`note`, a `phrases` block (read aloud), an `exercise` with
     checkable answers, and optionally an oral/written `task`.
   - `phrases[].fr` is spoken by TTS: write numbers, years and phone numbers in
     words, and put the short form in `label`.
   - Exercise blanks are `___`, with exactly one entry in `answers` per blank.
     Accepted variants go in one entry as `"a | b"`. Use `choices` for closed
     choices (un/une, le/la/l'/les, quel/quelle…).
   - Keep the class's own examples and names; fix typos and agreement mistakes.
   - **Privacy — this repo is public.** Never copy classmates' or teachers' real
     phone numbers (in digits *or* spelled out in words, e.g. in `fr` fields).
     Replace them with fictional numbers from the ranges reserved for fiction:
     `06 39 98 xx xx` or `01 99 00 xx xx` (international: `+33 6 39 98…`).
     Keep the teaching point (groups of two, "plus" for +, 70–99). `npm run validate`
     rejects digit sequences outside those ranges, but can't catch spelled-out
     numbers, so check those by hand.
   - ids: lowercase kebab-case, no accents; section ids unique within a lesson.
3. Run `npm run validate` and `npm test`, then build with `npm run build`.

## Revision sheets

The Réviser tab lets the learner copy a request listing their weak sections
(`lessonId/sectionId`, with scores). For such a request, write
`content/revisions/<YYYY-MM-DD>-<id>.json` (schema `Revision`): `covers` lists
the section keys; start each topic with a short `note` summarising the rule and
the typical mistakes, then give new example phrases and new exercises (not copied
from the lesson). Keep the whole sheet under 20 minutes. The same privacy
rule applies: fictional phone numbers only.

## Audio

`scripts/build-audio.ts` pre-renders every phrase with a neural voice at deploy
time (`TTS_ENGINE` repo variable: `edge` by default, or `google` / `azure` with
secrets). Anything missing falls back to the device voice in the app. The sandbox
here usually cannot reach the TTS services, so the audio is generated in CI only.

## AI generation (optional)

`src/ai/` holds a provider-agnostic layer (`LlmProvider`) with Anthropic and
OpenAI-compatible adapters, used by `npm run generate`. See `docs/ai.md`.

## Commands

- `npm run dev` — local dev server
- `npm test` — unit tests (vitest)
- `npm run validate` — schema + lint for all content
- `npm run build` — validate, typecheck, production build

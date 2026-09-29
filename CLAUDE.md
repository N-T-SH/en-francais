# En français — revision app

A PWA (installable on Android and desktop) for revising French lessons for the TEF.
Lessons are JSON files in `content/`; the app is a static Vite + React build
deployed to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main`.

## Adding a lesson from class material

The learner usually shares notes, slides, PDFs or photos in a Claude session and
asks for them to be added. To do that:

1. Read all the material. Create `content/lessons/NN-<id>.json`, where NN is the
   **textbook lesson number** (one app lesson per textbook lesson; lessons 8–10
   and the "Techniques pour…" page 11 are separate lessons). Set `number` (same
   as NN), `order` (sort position; same as `number`), `unit`, `unitTitle` and
   `kicker` ("Unité 3 · Leçon 10"), following the units below.
2. Follow the schema in `src/content/schema.ts` (the zod field descriptions are the
   spec) and the style of the existing lessons:
   - Language: examples, vocabulary, exercises and task instructions are in French.
     **Explanations of grammar rules and concepts may (and often should) be in
     English** — the learner asked for this. Put them in `note` blocks, table
     `note`s and the `lede` of grammar sections; keep them short, with French
     examples inside the text, and give “this vs that” contrasts a comparison
     table (job · English equivalent · what follows). Use `en` for vocabulary glosses.
   - 2–6 sections of 3–10 minutes, in class order. Each mixes a reference
     `table`/`note`, a `phrases` block (read aloud), an `exercise` with
     checkable answers, and optionally an oral/written `task`.
   - `phrases[].fr` is spoken by TTS: write numbers, years and phone numbers in
     words, and put the short form in `label`.
   - Exceptions and gotchas: every grammar or pronunciation section needs a short
     English `note` (tone `warning` for gotchas, `tip` / `info` for patterns)
     placed after the reference table and before the listening block. Use
     bullets (lines starting with "- "). Cover the regular rule, the common
     exceptions, what English speakers get wrong, and how it sounds (silent
     letters, liaison). Only state things you are sure of, and check unusual
     claims (e.g. pronunciation of a month) rather than copying a class note.
   - Illustrations: give concrete vocabulary (objects, places, sports, family,
     transport, food…) a small `icon` emoji on the `phrases` item. Skip abstract
     words, numbers, sentences and questions. No flags (Windows doesn't draw
     them), nothing newer than Unicode 13, and never use 🗼 for the Eiffel Tower
     (it's the Tokyo Tower). Learners can hide icons in Réglages.
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

## Library structure (textbook: *Inspire 1*, Hachette, A1)

The app follows the textbook's table of contents (Sommaire). Lessons the learner
has covered so far:

| Unité | Leçons in the app |
|---|---|
| 1 · Découvrez ! | 1 Saluer · 2 Épeler et compter · 3 Parler de la France et de la francophonie |
| 2 · Entrez en contact ! | 4 Se présenter · 5 Échanger des informations personnelles · 6 Préciser des informations · 7 Techniques pour… |
| 3 · Faites connaissance ! | 8 Parler de la famille · 9 Décrire une personne · 10 Échanger sur ses goûts · 11 Techniques pour… |
| 4 · Organisez une sortie ! | 12 S'informer sur un lieu · 13 Indiquer un chemin (14 Proposer une sortie · 15 Techniques pour…: not added) |
| 5+ | Unit 5 (16–19) and unit 6 (20–23): not yet covered |

Sections keep stable ids because progress is saved per `lessonId/sectionId`. If
a section ever moves to another lesson, add it to `SECTION_MOVES` in
`src/state/store.ts` so saved progress follows it.

**Source material and copyright.** The textbook is a copyrighted PDF (scanned, so
it has no text layer: render pages to images to read them). It lives in the
learner's *private* repository `N-T-SH/notes` (attach it with `add_repo`).
Never copy the PDF, its pages or its documents/exercises into this public repo:
write revision material in your own examples and exercises on the same topics.

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

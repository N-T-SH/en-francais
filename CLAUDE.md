# En français — revision app

A PWA (installable on Android and desktop) for revising French lessons for the TEF.
Lessons are JSON files in `content/`; the app is a static Vite + React build
deployed to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main`.

## Adding a lesson from class material

The learner usually shares notes, slides, PDFs or photos in a Claude session and
asks for them to be added. To do that:

1. Read all the material. Create the lesson file for the right **level** (see
   "Library structure" below: `NN-<id>.json` for A1, `a2-NN-<id>.json` for A2), where NN
   is the **textbook lesson number** (one app lesson per textbook lesson, including each
   "Techniques pour…" page). Set `level`, `number`, `order`, `unit`, `unitTitle` and
   `kicker` ("Unité 3 · Leçon 10") as described in that section.
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

## Library structure: levels and textbooks

The library is grouped by **CEFR level**, one textbook per level, and the home
screen has a tab per level that has lessons. Within a level, lessons follow the
book's table of contents (Sommaire): unit → lesson. Lesson numbers restart at 1
in each book, so a section is identified as `A2·3.2` in the UI.

| Level | Textbook | Files | Lessons |
|---|---|---|---|
| A1 | *Inspire 1* (Hachette) | `content/lessons/NN-<id>.json`, ids without prefix | 1–31 (+ bonus 99), 8 units |
| A2 | *Inspire 2* (Hachette) | `content/lessons/a2-NN-<id>.json`, ids start with `a2-` | 1–32, 8 units |
| B1, B2 | *Inspire 3 / 4* | same pattern with `b1-` / `b2-` | not added yet |

Each lesson sets `level` ("A1" / "A2" / …), `number` (the lesson number **in its
own book**), `order` (sort position **within the level**: A1 lessons use `order = number`,
A2 lessons use `100 + number`, bonus lessons use 99), `unit`, `unitTitle` and
`kicker` ("Unité 3 · Leçon 10"). Lesson ids must be unique across levels, hence the
`a2-` prefix. Unit rule for A2: unit = ceil(number / 4) (3 lessons + a "Techniques pour…").

A1 units (*Inspire 1*): 1 Découvrez ! (1–3) · 2 Entrez en contact ! (4–7) ·
3 Faites connaissance ! (8–11) · 4 Organisez une sortie ! (12–15) ·
5 Parlez de votre quotidien (16–19) · 6 Partagez vos expériences ! (20–23) ·
7 Donnez votre avis ! (24–27) · 8 Informez-vous ! (28–31). Bonus (no unit): 99 L'heure.

A2 units (*Inspire 2*): 1 Entrez en relation ! (1–4) · 2 Parlez de vous (5–8) ·
3 Parlez de votre mode de vie (9–12) · 4 Envisagez l'avenir (13–16) ·
5 Partagez (17–20) · 6 Engagez-vous (21–24) · 7 Réagissez (25–28) · 8 Voyagez (29–32).
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

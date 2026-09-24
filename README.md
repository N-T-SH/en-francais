# En français

An app for revising my French (TEF, A1) lessons: reference tables, phrases read
aloud with a natural voice, self-checking exercises, and focused revision of
weak spots. It works offline and installs on Android and desktop.

## Using it

- **Android:** open the site in Chrome → ⋮ → *Add to Home screen / Install app*.
- **Desktop:** open it in Chrome or Edge → install icon in the address bar.
- Flag a section as **Point faible** (or after a missed exercise) and use the
  **Réviser** tab for a targeted quiz, a listening playlist, or to request a
  revision sheet.
- Progress stays on each device; **Réglages → Exporter / Importer** moves it.

## Adding lessons

Share the class material in a Claude session on this repo and ask for it to be
added as a lesson. The steps are in [`CLAUDE.md`](CLAUDE.md). To generate
lessons yourself with any LLM, see [`docs/ai.md`](docs/ai.md).

## Voices

Every phrase is pre-recorded with a neural voice when the site is deployed, so it
sounds the same on every device. Set it up with repository variables and secrets
(*Settings → Secrets and variables → Actions*):

| Engine | Setup | Notes |
|---|---|---|
| `edge` (default) | nothing | Free Microsoft Edge neural voices (default `fr-FR-DeniseNeural`, also `fr-FR-HenriNeural`, `fr-FR-VivienneMultilingualNeural`). Unofficial endpoint, so it may stop working. |
| `google` | variable `TTS_ENGINE=google`, secret `GOOGLE_TTS_API_KEY` | Chirp 3 HD voices (default `fr-FR-Chirp3-HD-Aoede`). Generous free tier. |
| `azure` | variable `TTS_ENGINE=azure`, secret `AZURE_SPEECH_KEY`, variable `AZURE_SPEECH_REGION` | Azure neural voices, free tier. |

`TTS_VOICE` picks a different voice. Clips are cached between deploys, so only
new phrases are synthesised. If a clip is missing, the app uses the device's best
French voice (Réglages lets you choose it).

## Development

```sh
npm install
npm run dev        # http://localhost:5173
npm test
npm run build
```

Deploys to GitHub Pages from `main` (*Settings → Pages → Source: GitHub Actions*).

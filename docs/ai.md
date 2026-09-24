# Generating lessons with an LLM

Right now lessons are added by sharing class material in a Claude session (see
`CLAUDE.md`). To generate them yourself instead, including with a cheaper model,
use the provider layer in `src/ai/`.

## Command line

```sh
# Any OpenAI-compatible API (DeepSeek, Mistral, Gemini, OpenRouter, Groq, Ollama…)
export LLM_PROVIDER=openai-compatible
export LLM_BASE_URL=https://api.deepseek.com/v1
export LLM_MODEL=deepseek-chat
export LLM_API_KEY=...
export LLM_JSON_MODE=object   # only if the API rejects response_format json_schema

# or Anthropic
export LLM_PROVIDER=anthropic
export LLM_API_KEY=sk-ant-...
# LLM_MODEL defaults to claude-opus-5

npm run generate -- lesson notes.pdf page1.jpg --date 2026-09-24
npm run generate -- revision introduction/nombres infos-personnelles/questions-quel
```

The file lands in `content/lessons` or `content/revisions` and is checked against
the schema. Review it, then commit and push to publish it.

Supported inputs: text/Markdown, images, and PDF (Anthropic only; for other
providers, send page photos or pasted text).

## Some example endpoints

| Provider   | `LLM_BASE_URL`                                              | JSON mode |
|------------|-------------------------------------------------------------|-----------|
| DeepSeek   | `https://api.deepseek.com/v1`                               | `object`  |
| Mistral    | `https://api.mistral.ai/v1`                                 | `schema`  |
| Gemini     | `https://generativelanguage.googleapis.com/v1beta/openai`   | `schema`  |
| OpenRouter | `https://openrouter.ai/api/v1`                              | `schema`  |

## Adding a provider

Implement `LlmProvider` (`src/ai/types.ts`): one method, `generateJson`, that
returns an object validated by the zod schema it receives. Register it in
`createProvider` (`src/ai/index.ts`). The prompts and output schemas are shared,
so every provider produces the same lesson format.

## In the app later

The same `generateLesson` / `generateRevision` functions run in the browser. An
"Import" screen could call them with a key stored on the device, or through a
small serverless proxy that keeps the key off the device.

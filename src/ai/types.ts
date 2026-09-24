import type { z } from "zod";

/**
 * Provider-agnostic interface for the generation features (turning class
 * material into a lesson, writing a revision sheet). Any model that can
 * return JSON can back it: add an adapter in ./providers and register it in
 * ./index.ts.
 */

export interface Attachment {
  /** MIME type, e.g. "text/plain", "application/pdf", "image/jpeg". */
  mediaType: string;
  /** base64 for binary files, raw text for text files. */
  data: string;
  name?: string;
}

export interface JsonRequest<T> {
  system: string;
  prompt: string;
  attachments?: Attachment[];
  schema: z.ZodType<T>;
  /** Short name for the schema, used by APIs that require one. */
  schemaName: string;
}

export interface LlmProvider {
  readonly id: string;
  readonly model: string;
  generateJson<T>(req: JsonRequest<T>): Promise<T>;
}

export type ProviderConfig =
  | { kind: "anthropic"; apiKey: string; model?: string }
  | {
      kind: "openai-compatible";
      /** e.g. https://api.deepseek.com/v1, https://openrouter.ai/api/v1 */
      baseUrl: string;
      apiKey: string;
      model: string;
      /**
       * "schema": response_format json_schema (OpenAI, OpenRouter, Mistral, Gemini).
       * "object": response_format json_object + schema in the prompt (DeepSeek and others).
       */
      jsonMode?: "schema" | "object";
    };

export function isText(a: Attachment): boolean {
  return a.mediaType.startsWith("text/") || a.mediaType === "application/json";
}

export class GenerationError extends Error {}

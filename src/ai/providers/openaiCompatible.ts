import { z } from "zod";
import { GenerationError, isText, type JsonRequest, type LlmProvider } from "../types";

/**
 * Any Chat Completions–compatible API: DeepSeek, Mistral, Gemini
 * (OpenAI-compatible endpoint), OpenRouter, Groq, Together, a local Ollama…
 */
export class OpenAICompatibleProvider implements LlmProvider {
  readonly id = "openai-compatible";

  constructor(
    private baseUrl: string,
    private apiKey: string,
    readonly model: string,
    private jsonMode: "schema" | "object" = "schema",
    private fetchImpl: typeof fetch = (...args) => fetch(...args),
  ) {}

  async generateJson<T>(req: JsonRequest<T>): Promise<T> {
    const jsonSchema = z.toJSONSchema(req.schema, { target: "draft-7" });
    const parts: unknown[] = [];
    for (const a of req.attachments ?? []) {
      if (isText(a)) parts.push({ type: "text", text: `<document name="${a.name ?? "notes"}">\n${a.data}\n</document>` });
      else if (a.mediaType.startsWith("image/")) parts.push({ type: "image_url", image_url: { url: `data:${a.mediaType};base64,${a.data}` } });
      else throw new GenerationError(`${a.mediaType} is not supported by this provider; paste the text or send images instead.`);
    }
    let prompt = req.prompt;
    if (this.jsonMode === "object")
      prompt += `\n\nRespond with a single JSON object matching this JSON Schema:\n${JSON.stringify(jsonSchema)}`;
    parts.push({ type: "text", text: prompt });

    const messages: unknown[] = [
      { role: "system", content: req.system },
      { role: "user", content: parts },
    ];

    // One repair round: send validation errors back if the JSON doesn't fit.
    for (let attempt = 0; attempt < 2; attempt++) {
      const raw = await this.complete(messages, req.schemaName, jsonSchema);
      let parsed: unknown;
      try {
        parsed = JSON.parse(stripFences(raw));
      } catch {
        messages.push({ role: "assistant", content: raw }, { role: "user", content: "That was not valid JSON. Reply with the JSON object only." });
        continue;
      }
      const result = req.schema.safeParse(parsed);
      if (result.success) return result.data;
      messages.push(
        { role: "assistant", content: raw },
        { role: "user", content: `The JSON does not match the schema:\n${z.prettifyError(result.error)}\nReply with the corrected JSON object only.` },
      );
    }
    throw new GenerationError("The model did not return valid JSON after a retry.");
  }

  private async complete(messages: unknown[], name: string, schema: unknown): Promise<string> {
    const res = await this.fetchImpl(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        messages,
        response_format:
          this.jsonMode === "schema" ? { type: "json_schema", json_schema: { name, schema, strict: false } } : { type: "json_object" },
      }),
    });
    if (!res.ok) throw new GenerationError(`${this.baseUrl} ${res.status}: ${await res.text()}`);
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = body.choices?.[0]?.message?.content;
    if (!content) throw new GenerationError("Empty response from model.");
    return content;
  }
}

function stripFences(s: string): string {
  return s.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
}

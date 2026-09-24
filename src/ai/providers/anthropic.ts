import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { GenerationError, isText, type JsonRequest, type LlmProvider } from "../types";

export const ANTHROPIC_DEFAULT_MODEL = "claude-opus-5";

export class AnthropicProvider implements LlmProvider {
  readonly id = "anthropic";
  private client: Anthropic;

  constructor(apiKey: string, readonly model: string = ANTHROPIC_DEFAULT_MODEL) {
    // Browser use is only safe with the learner's own key on their own device.
    this.client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  }

  async generateJson<T>(req: JsonRequest<T>): Promise<T> {
    const content: Anthropic.Beta.BetaContentBlockParam[] = [];
    for (const a of req.attachments ?? []) {
      if (isText(a)) content.push({ type: "text", text: `<document name="${a.name ?? "notes"}">\n${a.data}\n</document>` });
      else if (a.mediaType === "application/pdf")
        content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: a.data } });
      else if (/^image\/(jpeg|png|gif|webp)$/.test(a.mediaType))
        content.push({
          type: "image",
          source: { type: "base64", media_type: a.mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp", data: a.data },
        });
      else throw new GenerationError(`Unsupported attachment type: ${a.mediaType}`);
    }
    content.push({ type: "text", text: req.prompt });

    const stream = this.client.beta.messages.stream({
      model: this.model,
      max_tokens: 64000,
      // Re-run on another model if a safety classifier declines the request.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      thinking: { type: "adaptive" },
      output_config: { effort: "medium", format: betaZodOutputFormat(req.schema) },
      system: req.system,
      messages: [{ role: "user", content }],
    });
    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") throw new GenerationError("The model declined this request.");
    if (message.stop_reason === "max_tokens") throw new GenerationError("The response was cut off (max_tokens).");
    const text = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    return req.schema.parse(JSON.parse(text));
  }
}

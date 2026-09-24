import { describe, expect, it } from "vitest";
import { z } from "zod";
import { OpenAICompatibleProvider } from "../src/ai/providers/openaiCompatible";

function fakeFetch(replies: string[]) {
  const bodies: any[] = [];
  const impl = (async (_url: string, init: RequestInit) => {
    bodies.push(JSON.parse(init.body as string));
    const content = replies.shift();
    return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
  }) as unknown as typeof fetch;
  return { impl, bodies };
}

const schema = z.object({ title: z.string(), items: z.array(z.string()) });

describe("OpenAICompatibleProvider", () => {
  it("sends a json_schema response format and parses the reply", async () => {
    const { impl, bodies } = fakeFetch(['{"title":"Nombres","items":["dix"]}']);
    const p = new OpenAICompatibleProvider("https://api.example.com/v1/", "k", "cheap-model", "schema", impl);
    const out = await p.generateJson({ system: "s", prompt: "p", schema, schemaName: "x" });
    expect(out).toEqual({ title: "Nombres", items: ["dix"] });
    expect(bodies[0].model).toBe("cheap-model");
    expect(bodies[0].response_format.type).toBe("json_schema");
    expect(bodies[0].response_format.json_schema.schema.properties.title.type).toBe("string");
  });

  it("repairs invalid output once, with the validation errors", async () => {
    const { impl, bodies } = fakeFetch(['```json\n{"title":"x"}\n```', '{"title":"x","items":[]}']);
    const p = new OpenAICompatibleProvider("https://api.example.com/v1", "k", "m", "object", impl);
    const out = await p.generateJson({ system: "s", prompt: "p", schema, schemaName: "x" });
    expect(out.items).toEqual([]);
    expect(bodies).toHaveLength(2);
    expect(bodies[0].response_format).toEqual({ type: "json_object" });
    expect(bodies[1].messages.at(-1).content).toMatch(/does not match the schema/);
  });

  it("rejects PDFs, which most compatible APIs can't read", async () => {
    const p = new OpenAICompatibleProvider("u", "k", "m", "schema", fakeFetch([]).impl);
    await expect(
      p.generateJson({ system: "s", prompt: "p", schema, schemaName: "x", attachments: [{ mediaType: "application/pdf", data: "" }] }),
    ).rejects.toThrow(/not supported/);
  });
});

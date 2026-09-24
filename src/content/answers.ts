/** Answer checking for fill-in exercises. */

export type Verdict = "correct" | "accents" | "wrong" | "empty";

function base(s: string): string {
  return s
    .normalize("NFC")
    .toLowerCase()
    .replace(/[’`´]/g, "'")
    .replace(/\s*'\s*/g, "'")
    .replace(/[.!?,;:«»"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/œ/g, "oe").replace(/æ/g, "ae");
}

/** Accepted alternatives for one blank ("a | b" → ["a", "b"]). */
export function alternatives(answer: string): string[] {
  return answer.split("|").map((a) => a.trim()).filter(Boolean);
}

export function check(input: string, answer: string): Verdict {
  const got = base(input);
  if (!got) return "empty";
  const alts = alternatives(answer).map(base);
  if (alts.includes(got)) return "correct";
  if (alts.map(stripAccents).includes(stripAccents(got))) return "accents";
  return "wrong";
}

/** Split a prompt into text segments around its `___` blanks. */
export function splitPrompt(prompt: string): string[] {
  const parts = prompt.split("___");
  // No blank in the prompt: the answer field goes after the text.
  return parts.length === 1 ? [prompt, ""] : parts;
}

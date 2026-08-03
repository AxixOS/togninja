import OpenAI from "openai";
import type { StudioCreds } from "./ctx";

export function openaiForStudio(creds: StudioCreds) {
  const apiKey = creds.openai?.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("No OpenAI key configured.");
  return new OpenAI({ apiKey });
}
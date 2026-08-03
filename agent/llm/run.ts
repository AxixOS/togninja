// LLM runner for the agent system
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-not-configured',
});

export async function runLLM(messages: any[], tools?: any[]) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Use smaller model to avoid token limits
      messages,
      tools: tools?.length ? tools.slice(0, 15) : undefined, // Limit tools to avoid token overload
      temperature: 0.1,
      max_tokens: 1500,
    });

    return completion;
  } catch (error) {
    console.error("LLM execution error:", error);
    throw error;
  }
}
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runLLM = runLLM;
// LLM runner for the agent system
const openai_1 = __importDefault(require("openai"));
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
async function runLLM(messages, tools) {
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Use smaller model to avoid token limits
            messages,
            tools: tools?.length ? tools.slice(0, 15) : undefined, // Limit tools to avoid token overload
            temperature: 0.1,
            max_tokens: 1500,
        });
        return completion;
    }
    catch (error) {
        console.error("LLM execution error:", error);
        throw error;
    }
}

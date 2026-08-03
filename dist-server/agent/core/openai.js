"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openaiForStudio = openaiForStudio;
const openai_1 = __importDefault(require("openai"));
function openaiForStudio(creds) {
    const apiKey = creds.openai?.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey)
        throw new Error("No OpenAI key configured.");
    return new openai_1.default({ apiKey });
}

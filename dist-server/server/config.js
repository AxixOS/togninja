"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEBUG_OPENAI = exports.BLOG_ASSISTANT = void 0;
exports.getAssistantInstructions = getAssistantInstructions;
const openai_1 = __importDefault(require("openai"));
// Central configuration file - single source of truth for assistant IDs
exports.BLOG_ASSISTANT = process.env.TOGNINJA_ASSISTANT_ID || 'asst_nlyO3yRav2oWtyTvkq0cHZaU';
// Debug logging configuration
exports.DEBUG_OPENAI = process.env.DEBUG_OPENAI === 'true';
console.log('🔧 Configuration loaded:');
console.log('📋 BLOG_ASSISTANT ID:', exports.BLOG_ASSISTANT);
console.log('🐛 DEBUG_OPENAI:', exports.DEBUG_OPENAI);
// Utility to get assistant instructions for fallback system prompts (Patch B from expert advice)
async function getAssistantInstructions(assistantId) {
    try {
        const openai = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
        const assistant = await openai.beta.assistants.retrieve(assistantId);
        return assistant.instructions || '';
    }
    catch (error) {
        console.error('Failed to retrieve assistant instructions:', error);
        return '';
    }
}

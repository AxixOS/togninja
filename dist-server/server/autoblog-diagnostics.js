"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAutoBlogDiagnostics = runAutoBlogDiagnostics;
exports.logAutoBlogCall = logAutoBlogCall;
// AutoBlog diagnostic utilities based on expert analysis
const openai_1 = __importDefault(require("openai"));
const config_1 = require("./config");
/**
 * Run comprehensive diagnostics on AutoBlog system
 */
async function runAutoBlogDiagnostics() {
    const diagnostics = [];
    // Check #1: Wrong assistant ID
    diagnostics.push({
        issue: "Wrong assistant ID - AutoBlog POST pointing to different assistant_id",
        detected: config_1.BLOG_ASSISTANT !== 'asst_nlyO3yRav2oWtyTvkq0cHZaU',
        solution: "Copy the correct ID and use centralized config",
        details: {
            configured: config_1.BLOG_ASSISTANT,
            expected: 'asst_nlyO3yRav2oWtyTvkq0cHZaU'
        }
    });
    // Check #2: Assistant instructions not re-sent
    try {
        const openai = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
        const assistant = await openai.beta.assistants.retrieve(config_1.BLOG_ASSISTANT);
        diagnostics.push({
            issue: "Assistant instructions not re-sent - using chat.completions instead of assistant",
            detected: !assistant.instructions || assistant.instructions.length === 0,
            solution: "Use Threads/Runs flow or pass full prompt as system message",
            details: {
                instructionsLength: assistant.instructions?.length || 0,
                hasInstructions: !!assistant.instructions
            }
        });
    }
    catch (error) {
        diagnostics.push({
            issue: "Assistant instructions not re-sent",
            detected: true,
            solution: "Fix OpenAI API connection to retrieve assistant instructions",
            details: { error: error.message }
        });
    }
    // Check #3: Model consistency
    diagnostics.push({
        issue: "Different model - Chat panel uses different model than AutoBlog",
        detected: false, // We'll check this at runtime
        solution: "Pass the same model param (gpt-4o) or rely on assistant's default",
        details: { recommendedModel: 'gpt-4o' }
    });
    // Check #4: Debug logging setup
    diagnostics.push({
        issue: "Debug logging not enabled",
        detected: !config_1.DEBUG_OPENAI,
        solution: "Set DEBUG_OPENAI=true environment variable",
        details: { debugEnabled: config_1.DEBUG_OPENAI }
    });
    return diagnostics;
}
/**
 * Log diagnostic information for debugging AutoBlog calls
 */
function logAutoBlogCall(context) {
    console.log('🔬 AUTOBLOG DIAGNOSTIC LOG:');
    console.dir({
        assistantId: context.assistantId,
        configuredAssistant: config_1.BLOG_ASSISTANT,
        assistantMatch: context.assistantId === config_1.BLOG_ASSISTANT,
        model: context.model || 'assistant-based',
        messagesCount: context.messages?.length || 0,
        imagesCount: context.imagesCount || 0,
        systemPromptPresent: context.messages?.[0]?.role === 'system',
        debugMode: config_1.DEBUG_OPENAI
    }, { depth: 2 });
}

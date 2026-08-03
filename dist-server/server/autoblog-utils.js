"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateWithTOGNINJAAssistant = generateWithTOGNINJAAssistant;
exports.generateWithFallbackSystem = generateWithFallbackSystem;
const openai_1 = __importDefault(require("openai"));
const config_1 = require("./config");
const openai = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
/**
 * Fixed AutoBlog generation using proper Assistant API calls (no fetch() bypass)
 * Implements expert recommendations for consistent TOGNINJA assistant usage
 */
async function generateWithTOGNINJAAssistant(userMessage, images) {
    try {
        console.log('🎯 FIXED AutoBlog: Using TOGNINJA Assistant with proper SDK');
        // DIAGNOSTIC CHECK - Log assistant ID
        console.dir({ assistantId: config_1.BLOG_ASSISTANT, model: 'assistant-based' }, { depth: 2 });
        // Create thread
        const thread = await openai.beta.threads.create();
        console.log('✅ Thread created:', thread.id);
        // Add message to thread (minimal context approach)
        await openai.beta.threads.messages.create(thread.id, {
            role: "user",
            content: userMessage
        });
        // Run the assistant with proper SDK calls (FIXED - no fetch bypass)
        const run = await openai.beta.threads.runs.create(thread.id, {
            assistant_id: config_1.BLOG_ASSISTANT,
            metadata: { feature: "autoblog", studio: "newage-fotografie" }
        });
        // Wait for completion using SDK (FIXED - no fetch bypass)
        let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        let attempts = 0;
        const maxAttempts = 30;
        while (runStatus.status !== 'completed' && attempts < maxAttempts) {
            if (runStatus.status === 'failed' || runStatus.status === 'cancelled' || runStatus.status === 'expired') {
                throw new Error(`Assistant run ${runStatus.status}: ${runStatus.last_error?.message || 'Unknown error'}`);
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
            attempts++;
            runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        }
        if (runStatus.status !== 'completed') {
            throw new Error('Assistant timed out');
        }
        // Retrieve messages using SDK (FIXED - no fetch bypass)
        const messages = await openai.beta.threads.messages.list(thread.id);
        const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
        if (!assistantMessage || !assistantMessage.content[0] || assistantMessage.content[0].type !== 'text') {
            throw new Error('No valid response from TOGNINJA assistant');
        }
        const content = assistantMessage.content[0].text.value;
        console.log('✅ TOGNINJA assistant response received:', content.substring(0, 200) + '...');
        return content;
    }
    catch (error) {
        console.error('❌ TOGNINJA assistant error:', error);
        return null;
    }
}
/**
 * Fallback system using Chat Completions API with assistant instructions (Patch B)
 */
async function generateWithFallbackSystem(userMessage, images) {
    try {
        console.log('🔄 Using fallback system with assistant instructions');
        // Get assistant instructions for system prompt
        const systemPrompt = await (0, config_1.getAssistantInstructions)(config_1.BLOG_ASSISTANT);
        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage }
        ];
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            temperature: 0.7,
            messages
        });
        const content = response.choices[0]?.message?.content;
        if (content) {
            console.log('✅ Fallback system response received:', content.substring(0, 200) + '...');
        }
        return content || null;
    }
    catch (error) {
        console.error('❌ Fallback system error:', error);
        return null;
    }
}

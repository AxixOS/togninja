import OpenAI from 'openai';

// Central configuration file - single source of truth for assistant IDs
export const BLOG_ASSISTANT = process.env.TOGNINJA_ASSISTANT_ID || 'asst_nlyO3yRav2oWtyTvkq0cHZaU';

// Debug logging configuration
export const DEBUG_OPENAI = process.env.DEBUG_OPENAI === 'true';

console.log('🔧 Configuration loaded:');
console.log('📋 BLOG_ASSISTANT ID:', BLOG_ASSISTANT);
console.log('🐛 DEBUG_OPENAI:', DEBUG_OPENAI);

// Utility to get assistant instructions for fallback system prompts (Patch B from expert advice)
export async function getAssistantInstructions(assistantId: string): Promise<string> {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'sk-not-configured' });
    const assistant = await openai.beta.assistants.retrieve(assistantId);
    return assistant.instructions || '';
  } catch (error) {
    console.error('Failed to retrieve assistant instructions:', error);
    return '';
  }
}
import OpenAI from 'openai';
import { BLOG_ASSISTANT, getAssistantInstructions } from './config';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'sk-not-configured' });

/**
 * Fixed AutoBlog generation using proper Assistant API calls (no fetch() bypass)
 * Implements expert recommendations for consistent TOGNINJA assistant usage
 */
export async function generateWithTOGNINJAAssistant(
  userMessage: string,
  images?: Buffer[]
): Promise<string | null> {
  try {
    console.log('🎯 FIXED AutoBlog: Using TOGNINJA Assistant with proper SDK');
    
    // DIAGNOSTIC CHECK - Log assistant ID
    console.dir({ assistantId: BLOG_ASSISTANT, model: 'assistant-based' }, {depth: 2});
    
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
      assistant_id: BLOG_ASSISTANT,
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
    
  } catch (error) {
    console.error('❌ TOGNINJA assistant error:', error);
    return null;
  }
}

/**
 * Fallback system using Chat Completions API with assistant instructions (Patch B)
 */
export async function generateWithFallbackSystem(
  userMessage: string,
  images?: Buffer[]
): Promise<string | null> {
  try {
    console.log('🔄 Using fallback system with assistant instructions');
    
    // Get assistant instructions for system prompt
    const systemPrompt = await getAssistantInstructions(BLOG_ASSISTANT);
    
    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userMessage }
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
    
  } catch (error) {
    console.error('❌ Fallback system error:', error);
    return null;
  }
}
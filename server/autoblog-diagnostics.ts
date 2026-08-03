// AutoBlog diagnostic utilities based on expert analysis
import OpenAI from 'openai';
import { BLOG_ASSISTANT, DEBUG_OPENAI } from './config';

export interface DiagnosticResult {
  issue: string;
  detected: boolean;
  solution: string;
  details?: any;
}

/**
 * Run comprehensive diagnostics on AutoBlog system
 */
export async function runAutoBlogDiagnostics(): Promise<DiagnosticResult[]> {
  const diagnostics: DiagnosticResult[] = [];
  
  // Check #1: Wrong assistant ID
  diagnostics.push({
    issue: "Wrong assistant ID - AutoBlog POST pointing to different assistant_id",
    detected: BLOG_ASSISTANT !== 'asst_nlyO3yRav2oWtyTvkq0cHZaU',
    solution: "Copy the correct ID and use centralized config",
    details: { 
      configured: BLOG_ASSISTANT, 
      expected: 'asst_nlyO3yRav2oWtyTvkq0cHZaU' 
    }
  });
  
  // Check #2: Assistant instructions not re-sent
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'sk-not-configured' });
    const assistant = await openai.beta.assistants.retrieve(BLOG_ASSISTANT);
    diagnostics.push({
      issue: "Assistant instructions not re-sent - using chat.completions instead of assistant",
      detected: !assistant.instructions || assistant.instructions.length === 0,
      solution: "Use Threads/Runs flow or pass full prompt as system message",
      details: { 
        instructionsLength: assistant.instructions?.length || 0,
        hasInstructions: !!assistant.instructions 
      }
    });
  } catch (error) {
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
    detected: !DEBUG_OPENAI,
    solution: "Set DEBUG_OPENAI=true environment variable",
    details: { debugEnabled: DEBUG_OPENAI }
  });
  
  return diagnostics;
}

/**
 * Log diagnostic information for debugging AutoBlog calls
 */
export function logAutoBlogCall(context: {
  assistantId: string;
  model?: string;
  messages?: any[];
  imagesCount?: number;
}) {
  console.log('🔬 AUTOBLOG DIAGNOSTIC LOG:');
  console.dir({
    assistantId: context.assistantId,
    configuredAssistant: BLOG_ASSISTANT,
    assistantMatch: context.assistantId === BLOG_ASSISTANT,
    model: context.model || 'assistant-based',
    messagesCount: context.messages?.length || 0,
    imagesCount: context.imagesCount || 0,
    systemPromptPresent: context.messages?.[0]?.role === 'system',
    debugMode: DEBUG_OPENAI
  }, { depth: 2 });
}
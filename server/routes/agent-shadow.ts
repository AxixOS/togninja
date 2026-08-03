/**
 * Shadow Mode Router for Agent V1 vs V2 Comparison
 * 
 * This route runs BOTH agent versions in parallel:
 * - V1 executes normally and returns response to user
 * - V2 executes in dry-run mode (simulated=true) silently
 * - Differences are logged to agentAuditDiff table
 * 
 * Enable with: AGENT_V2_SHADOW=true in .env
 */

import express, { Request, Response } from 'express';
import OpenAI from 'openai';
import { db } from '../../lib/db';
import { agentAuditDiff, agentSession, agentMessage } from '../../shared/schema';
import { ToolBus } from '../../agent/v2/core/ToolBus';
import { ToolContext } from '../../agent/v2/core/Types';
import { logShadowDiff } from '../../agent/v2/core/Audit';

const router = express.Router();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

interface ShadowChatRequest {
  message: string;
  sessionId?: string;
  userId?: string;
  studioId?: string;
}

/**
 * Shadow Mode Chat Endpoint
 * Runs V1 normally, V2 in simulation mode
 */
router.post('/chat', async (req: Request, res: Response) => {
  const { message, sessionId, userId, studioId } = req.body as ShadowChatRequest;

  if (!message?.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Create or get session ID
  const activeSessionId = sessionId || `shadow-${Date.now()}`;

  try {
    // ===== V1 EXECUTION (NORMAL) =====
    console.log('[SHADOW MODE] Running V1 (production)...');
    const v1StartTime = Date.now();
    let v1Response: string = '';
    let v1Error: string | null = null;

    try {
      // Call V1 agent (your existing agent implementation)
      // This is a placeholder - replace with actual V1 agent call
      const v1Result = await runV1Agent(message, {
        userId: userId || 'shadow-user',
        studioId: studioId || 'shadow-studio',
      });
      
      v1Response = v1Result.response;
    } catch (err: any) {
      console.error('[SHADOW MODE] V1 Error:', err);
      v1Error = err.message;
      v1Response = `Error: ${err.message}`;
    }

    const v1Duration = Date.now() - v1StartTime;

    // ===== V2 EXECUTION (DRY-RUN) =====
    console.log('[SHADOW MODE] Running V2 (shadow/dry-run)...');
    const v2StartTime = Date.now();
    let v2Plan: any = null;
    let v2Results: any[] = [];
    let v2Error: string | null = null;

    try {
      // Create session for V2
      const [session] = await db.insert(agentSession).values({
        studioId: studioId || 'shadow-studio',
        userId: userId || 'shadow-user',
        mode: 'auto_safe',
        scopes: ['CRM_READ', 'CRM_WRITE', 'INV_READ', 'INV_WRITE', 'EMAIL_SEND', 'CALENDAR_WRITE'],
        createdAt: new Date(),
      }).returning();

      // Add user message
      await db.insert(agentMessage).values({
        sessionId: session.id,
        role: 'user',
        content: message,
        createdAt: new Date(),
      });

      // Create tool context for V2 (DRY-RUN mode)
      const context: ToolContext = {
        sessionId: session.id,
        userId: userId || 'shadow-user',
        studioId: studioId || 'shadow-studio',
        mode: 'auto_safe',
        scopes: ['CRM_READ', 'CRM_WRITE', 'INV_READ', 'INV_WRITE', 'EMAIL_SEND', 'CALENDAR_WRITE'],
        dryRun: true, // CRITICAL: Dry-run mode for shadow testing
      };

      // Get available tools for OpenAI
      const availableTools = ToolBus.listOpenAITools(context.scopes);

      // Call OpenAI with V2 tools
      const completion = await openai.chat.completions.create({
        model: process.env.AGENT_MODEL || 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are a helpful CRM assistant. You can search clients, manage invoices, send emails, and create calendar events.
            
IMPORTANT: You are currently running in SHADOW MODE (dry-run). All tool executions are simulated and will not affect real data.

Available tools:
- Search and list operations (clients, leads, invoices)
- Create and update operations (calendar, invoices, clients)
- Email operations (draft and send)

Always be helpful, concise, and professional.`,
          },
          { role: 'user', content: message },
        ],
        tools: availableTools.length > 0 ? availableTools : undefined,
        tool_choice: availableTools.length > 0 ? 'auto' : undefined,
      });

      const responseMessage = completion.choices[0]?.message;

      // Extract plan from V2
      v2Plan = {
        content: responseMessage?.content || '',
        toolCalls: responseMessage?.tool_calls?.map((tc: any) => ({
          id: tc.id,
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments || '{}'),
        })) || [],
      };

      // Execute V2 tools in DRY-RUN mode
      if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
        for (const toolCall of responseMessage.tool_calls) {
          const toolName = (toolCall as any).function.name;
          const toolArgs = JSON.parse((toolCall as any).function.arguments || '{}');

          try {
            const result = await ToolBus.executeTool(toolName, toolArgs, context);
            v2Results.push({
              tool: toolName,
              args: toolArgs,
              result: result.data,
              ok: true,
            });
          } catch (err: any) {
            v2Results.push({
              tool: toolName,
              args: toolArgs,
              error: err.message,
              ok: false,
            });
          }
        }
      }

      // Add assistant message
      await db.insert(agentMessage).values({
        sessionId: session.id,
        role: 'assistant',
        content: responseMessage?.content || 'Executed tools in shadow mode',
        createdAt: new Date(),
      });

    } catch (err: any) {
      console.error('[SHADOW MODE] V2 Error:', err);
      v2Error = err.message;
    }

    const v2Duration = Date.now() - v2StartTime;

    // ===== LOG SHADOW DIFF =====
    console.log('[SHADOW MODE] Logging comparison...');
    
    await logShadowDiff({
      sessionId: activeSessionId,
      v1Text: v1Response,
      v2PlanJson: v2Plan,
      v2ResultsJson: v2Results,
      match: compareResponses(v1Response, v2Plan, v2Results),
      v1Error,
      v2Error,
      v1Duration,
      v2Duration,
    });

    // ===== RETURN V1 RESPONSE TO USER =====
    // This is the production response - user doesn't know V2 ran
    return res.json({
      message: v1Response,
      sessionId: activeSessionId,
      shadowMode: true,
      v1Duration,
      v2Duration,
    });

  } catch (err: any) {
    console.error('[SHADOW MODE] Fatal error:', err);
    return res.status(500).json({
      error: 'Shadow mode execution failed',
      message: err.message,
    });
  }
});

/**
 * Get shadow mode statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const diffs = await db.select().from(agentAuditDiff).orderBy(agentAuditDiff.createdAt);

    const stats = {
      totalComparisons: diffs.length,
      matches: diffs.filter(d => d.match).length,
      mismatches: diffs.filter(d => !d.match).length,
      v1Errors: diffs.filter(d => d.v1Error).length,
      v2Errors: diffs.filter(d => d.v2Error).length,
      avgV1Duration: diffs.reduce((sum, d) => sum + (d.v1Duration || 0), 0) / diffs.length,
      avgV2Duration: diffs.reduce((sum, d) => sum + (d.v2Duration || 0), 0) / diffs.length,
    };

    return res.json(stats);
  } catch (err: any) {
    console.error('[SHADOW MODE] Stats error:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Get all shadow mode comparisons
 */
router.get('/diffs', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const diffs = await db
      .select()
      .from(agentAuditDiff)
      .orderBy(agentAuditDiff.createdAt)
      .limit(limit);

    return res.json(diffs);
  } catch (err: any) {
    console.error('[SHADOW MODE] Diffs error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ===== HELPER FUNCTIONS =====

/**
 * Run V1 agent (placeholder - replace with your actual V1 implementation)
 */
async function runV1Agent(message: string, context: { userId: string; studioId: string }) {
  // TODO: Replace this with your actual V1 agent implementation
  // For now, return a placeholder response
  
  // This is where you would call your existing agent code
  // Example: const result = await yourV1Agent.chat(message, context);
  
  return {
    response: `V1 Agent Response: I received your message "${message}". (This is a placeholder - integrate your actual V1 agent here)`,
    toolCalls: [],
  };
}

/**
 * Compare V1 text response with V2 plan/results
 * Returns true if they are semantically equivalent
 */
function compareResponses(
  v1Text: string,
  v2Plan: any,
  v2Results: any[]
): boolean {
  // Simple heuristic comparison
  // In production, you might use:
  // - LLM-based semantic similarity
  // - String similarity algorithms (Levenshtein, Jaro-Winkler)
  // - Custom business logic comparison

  // For now, check if both succeeded
  const v1Success = !v1Text.toLowerCase().includes('error');
  const v2Success = !v2Results.some(r => !r.ok);

  // Basic match: both succeeded or both failed
  return v1Success === v2Success;
}

export default router;

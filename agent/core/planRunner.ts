import OpenAI from "openai";
import { readFileSync } from "fs";
import { toolRegistry } from "./tools";
import type { AgentCtx } from "./ctx";

interface PlanStep {
  tool: string;
  args: Record<string, any>;
}

interface Plan {
  steps: PlanStep[];
  explanation: string;
  risk_level: 'low' | 'medium' | 'high';
  estimated_duration: string;
}

interface PlanResult {
  needConfirmation?: boolean;
  plan?: Plan;
  outputs?: any[];
  error?: string;
}

export async function planAndExecute(userMessage: string, ctx: AgentCtx): Promise<PlanResult> {
  try {
    // Load tool catalog
    const catalogPath = "agent/data/tool_catalog.json";
    let catalog;
    try {
      catalog = JSON.parse(readFileSync(catalogPath, "utf-8"));
    } catch (e) {
      return {
        error: "Tool catalog not found. Please run 'npm run gen:catalog' to generate it."
      };
    }

    // Create OpenAI client
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'sk-not-configured' });
    
    // Get planner assistant ID from environment or use fallback
    const plannerAssistantId = process.env.PLANNER_ASSISTANT_ID;
    
    if (!plannerAssistantId) {
      console.log("⚠️ No PLANNER_ASSISTANT_ID found, using Chat Completions API");
      return await planWithChatCompletion(userMessage, catalog, ctx);
    }
    
    // Create thread for planning
    const thread = await openai.beta.threads.create();
    
    // Send planning request
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: JSON.stringify({
        USER_REQUEST: userMessage,
        CAPABILITIES: catalog.tools
      })
    });
    
    // Run planner assistant
    const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: plannerAssistantId
    });
    
    if (run.status !== 'completed') {
      throw new Error(`Planning failed: ${run.status}`);
    }
    
    // Get plan response
    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastMessage = messages.data[0];
    const planContent = lastMessage.content[0];
    
    if (planContent.type !== 'text') {
      throw new Error('Invalid plan response format');
    }
    
    const plan: Plan = JSON.parse(planContent.text.value);
    
    // Check if plan needs confirmation
    const needsConfirmation = plan.risk_level === 'high' || 
      plan.steps.some(step => 
        ['submit_prodigi_order', 'send_email_campaign'].includes(step.tool)
      );
    
    if (needsConfirmation) {
      return { needConfirmation: true, plan };
    }
    
    // Execute plan automatically for low/medium risk
    return await executePlan(plan, ctx);
    
  } catch (error) {
    console.error('❌ planAndExecute error:', error);
    return { error: `Planning failed: ${error.message}` };
  }
}

async function planWithChatCompletion(userMessage: string, catalog: any, ctx: AgentCtx): Promise<PlanResult> {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'sk-not-configured' });
    const systemPrompt = readFileSync("prompts/planner_system.txt", "utf-8");
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { 
          role: "user", 
          content: JSON.stringify({
            USER_REQUEST: userMessage,
            CAPABILITIES: catalog.tools
          })
        }
      ],
      temperature: 0.1
    });
    
    const planContent = response.choices[0]?.message?.content;
    if (!planContent) {
      throw new Error("No plan generated");
    }
    
    // Try to parse the plan with better error handling
    let plan: Plan;
    try {
      plan = JSON.parse(planContent);
    } catch (parseError) {
      console.error('❌ JSON parsing failed. Raw content:', planContent);
      throw new Error(`Invalid JSON response from planner: ${parseError.message}`);
    }
    
    // Validate required fields
    if (!plan.steps || !Array.isArray(plan.steps)) {
      throw new Error('Invalid plan format: missing or invalid steps array');
    }
    
    // Check if plan needs confirmation
    const needsConfirmation = plan.risk_level === 'high' || 
      plan.steps.some(step => 
        ['submit_prodigi_order', 'send_email_campaign'].includes(step.tool)
      );
    
    if (needsConfirmation) {
      return { needConfirmation: true, plan };
    }
    
    // Execute plan automatically for low/medium risk
    return await executePlan(plan, ctx);
    
  } catch (error) {
    console.error('❌ planWithChatCompletion error:', error);
    return { error: `Planning failed: ${error.message}` };
  }
}

export async function executePlan(plan: Plan, ctx: AgentCtx): Promise<PlanResult> {
  try {
    const outputs = [];
    
    for (const step of plan.steps) {
      const tool = toolRegistry.get(step.tool);
      
      if (!tool) {
        throw new Error(`Tool '${step.tool}' not found in registry`);
      }
      
      console.log(`🔧 Executing step: ${step.tool} with args:`, step.args);
      
      try {
        const result = await tool.handler(step.args, ctx);
        outputs.push({
          tool: step.tool,
          success: true,
          result
        });
      } catch (error) {
        console.error(`❌ Step failed: ${step.tool}`, error);
        outputs.push({
          tool: step.tool,
          success: false,
          error: error.message
        });
        
        // Stop execution on critical failures
        if (step.tool.includes('create') || step.tool.includes('send')) {
          break;
        }
      }
    }
    
    return { outputs };
    
  } catch (error) {
    console.error('❌ executePlan error:', error);
    return { error: `Execution failed: ${error.message}` };
  }
}

export function formatPlanOutputs(outputs: any[]): string {
  const successful = outputs.filter(o => o.success);
  const failed = outputs.filter(o => !o.success);
  
  let response = `Executed ${successful.length}/${outputs.length} steps successfully.\n\n`;
  
  successful.forEach(output => {
    response += `✅ ${output.tool}: `;
    if (output.result?.status) {
      response += output.result.status;
    } else if (typeof output.result === 'object') {
      response += JSON.stringify(output.result, null, 2);
    } else {
      response += String(output.result);
    }
    response += '\n';
  });
  
  if (failed.length > 0) {
    response += '\nErrors:\n';
    failed.forEach(output => {
      response += `❌ ${output.tool}: ${output.error}\n`;
    });
  }
  
  return response;
}
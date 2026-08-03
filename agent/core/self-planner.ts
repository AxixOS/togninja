// agent/core/self-planner.ts - Self-Planning CRM Agent with JSON step planning
import { toolRegistry } from '../core/tools';
import { AgentCtx } from '../types';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-not-configured',
});

export interface PlanStep {
  id: string;
  action: string;
  tool: string;
  parameters: Record<string, any>;
  dependencies: string[];
  reasoning: string;
  estimated_duration: string;
  risk_level: 'low' | 'medium' | 'high';
  requires_user_confirmation?: boolean;
}

export interface ExecutionPlan {
  goal: string;
  steps: PlanStep[];
  total_estimated_duration: string;
  complexity: 'simple' | 'moderate' | 'complex';
  user_confirmations_required: number;
}

export interface PlanningResult {
  plan: ExecutionPlan;
  status: 'ready' | 'requires_confirmation' | 'blocked';
  confirmations_needed: PlanStep[];
}

export class SelfPlanningAgent {
  private ctx: AgentCtx;
  private availableTools: Map<string, any>;

  constructor(ctx: AgentCtx) {
    this.ctx = ctx;
    this.availableTools = toolRegistry;
  }

  // Generate execution plan using tool introspection
  async generateExecutionPlan(userRequest: string): Promise<PlanningResult> {
    try {
      console.log('🧠 Self-planning agent analyzing request:', userRequest);

      // Introspect available tools
      const toolCatalog = await this.introspectToolCatalog();

      // Generate plan using OpenAI
      const planningPrompt = this.createPlanningPrompt(userRequest, toolCatalog);

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert CRM operations planner. Generate comprehensive execution plans in JSON format."
          },
          {
            role: "user",
            content: planningPrompt
          }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const planData = JSON.parse(response.choices[0].message.content!);
      const plan = this.validateAndEnhancePlan(planData);

      // Determine if user confirmations are needed
      const confirmationsNeeded = plan.steps.filter(step => step.requires_user_confirmation);
      
      const result: PlanningResult = {
        plan,
        status: confirmationsNeeded.length > 0 ? 'requires_confirmation' : 'ready',
        confirmations_needed: confirmationsNeeded
      };

      console.log(`✅ Generated execution plan with ${plan.steps.length} steps (${confirmationsNeeded.length} require confirmation)`);
      return result;

    } catch (error) {
      console.error('❌ Self-planning error:', error);
      throw error;
    }
  }

  // Introspect all available tools and their capabilities
  async introspectToolCatalog(): Promise<string> {
    const tools = Array.from(this.availableTools);
    
    const toolDescriptions = tools.map(([name, tool]) => {
      return `${name}: ${tool.description || 'No description'}`;
    }).join('\n');

    return `Available CRM Tools (${tools.length} total):\n${toolDescriptions}`;
  }

  // Create comprehensive planning prompt
  private createPlanningPrompt(userRequest: string, toolCatalog: string): string {
    return `
TASK: Create a comprehensive execution plan for this CRM request: "${userRequest}"

AVAILABLE TOOLS:
${toolCatalog}

PLANNING REQUIREMENTS:
1. Break down the request into logical, sequential steps
2. Use only tools that exist in the catalog above
3. Identify dependencies between steps
4. Estimate duration for each step (e.g., "30 seconds", "2 minutes")
5. Assess risk level for each step (low/medium/high)
6. Flag steps that require user confirmation (e.g., sending emails, creating invoices over €500)

OUTPUT FORMAT (must be valid JSON):
{
  "goal": "Clear description of what we're trying to achieve",
  "steps": [
    {
      "id": "step_1",
      "action": "Human-readable description of what this step does",
      "tool": "exact_tool_name_from_catalog",
      "parameters": {"key": "value"},
      "dependencies": ["step_id_that_must_complete_first"],
      "reasoning": "Why this step is necessary",
      "estimated_duration": "30 seconds",
      "risk_level": "low",
      "requires_user_confirmation": false
    }
  ],
  "total_estimated_duration": "2 minutes",
  "complexity": "moderate",
  "user_confirmations_required": 1
}

EXAMPLE REQUEST: "Find Simon Parrott and send him an invoice for €295 family photo session"

EXAMPLE RESPONSE:
{
  "goal": "Locate Simon Parrott in CRM and create invoice for family photo session",
  "steps": [
    {
      "id": "step_1",
      "action": "Search for Simon Parrott in CRM database",
      "tool": "global_search",
      "parameters": {"term": "simon parrott"},
      "dependencies": [],
      "reasoning": "Need to find client record before creating invoice",
      "estimated_duration": "15 seconds",
      "risk_level": "low",
      "requires_user_confirmation": false
    },
    {
      "id": "step_2",
      "action": "Create invoice for family photo session",
      "tool": "create_invoice",
      "parameters": {"client_id": "from_step_1", "sku": "FAMILY-BASIC", "notes": "Family photo session invoice"},
      "dependencies": ["step_1"],
      "reasoning": "Generate invoice for the requested service",
      "estimated_duration": "30 seconds",
      "risk_level": "medium",
      "requires_user_confirmation": true
    }
  ],
  "total_estimated_duration": "45 seconds",
  "complexity": "moderate",
  "user_confirmations_required": 1
}

Now create the execution plan for: "${userRequest}"
`;
  }

  // Validate and enhance the generated plan
  private validateAndEnhancePlan(planData: any): ExecutionPlan {
    // Add validation logic here
    const plan: ExecutionPlan = {
      goal: planData.goal || "No goal specified",
      steps: planData.steps || [],
      total_estimated_duration: planData.total_estimated_duration || "Unknown",
      complexity: planData.complexity || "moderate",
      user_confirmations_required: planData.user_confirmations_required || 0
    };

    // Validate that all specified tools exist
    plan.steps.forEach((step, index) => {
      if (!this.availableTools.get(step.tool)) {
        console.warn(`⚠️ Step ${index + 1} uses unknown tool: ${step.tool}`);
        // Replace with closest available tool or mark as blocked
      }
    });

    return plan;
  }

  // Execute plan with user confirmations
  async executePlan(plan: ExecutionPlan, userConfirmations: string[] = []): Promise<any> {
    console.log(`🚀 Executing plan: ${plan.goal}`);
    const results: Record<string, any> = {};

    for (const step of plan.steps) {
      try {
        console.log(`⚡ Executing step ${step.id}: ${step.action}`);

        // Check if user confirmation is required
        if (step.requires_user_confirmation && !userConfirmations.includes(step.id)) {
          throw new Error(`Step ${step.id} requires user confirmation but none provided`);
        }

        // Check dependencies
        for (const depId of step.dependencies) {
          if (!results[depId]) {
            throw new Error(`Step ${step.id} depends on ${depId} which hasn't completed`);
          }
        }

        // Replace parameter placeholders with results from previous steps
        const parameters = this.resolveParameters(step.parameters, results);

        // Execute the tool
        const tool = this.availableTools.get(step.tool);
        if (!tool) {
          throw new Error(`Tool ${step.tool} not found`);
        }

        const result = await tool.handler(parameters, this.ctx);
        results[step.id] = result;

        console.log(`✅ Step ${step.id} completed successfully`);

      } catch (error) {
        console.error(`❌ Step ${step.id} failed:`, error);
        throw error;
      }
    }

    console.log(`🎉 Plan execution completed successfully`);
    return results;
  }

  // Resolve parameter placeholders with results from previous steps
  private resolveParameters(parameters: Record<string, any>, results: Record<string, any>): Record<string, any> {
    const resolved = { ...parameters };

    for (const [key, value] of Object.entries(resolved)) {
      if (typeof value === 'string' && value.startsWith('from_step_')) {
        const stepId = value.replace('from_step_', '');
        if (results[stepId]) {
          // Extract appropriate value from step result
          resolved[key] = this.extractValueFromResult(results[stepId], key);
        }
      }
    }

    return resolved;
  }

  // Extract appropriate value from step result
  private extractValueFromResult(result: any, targetKey: string): any {
    if (targetKey === 'client_id' && result.clients && result.clients.length > 0) {
      return result.clients[0].id;
    }
    
    if (targetKey === 'client_id' && result.data && result.data.match) {
      return result.data.match.id;
    }

    return result;
  }
}
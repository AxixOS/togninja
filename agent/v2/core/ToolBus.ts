/**
 * ToolBus - Centralized tool registry with Zod validation
 * 
 * This is the heart of Agent V2. All tools register here with:
 * - Zod schemas for type-safe parameter validation
 * - Scope-based authorization requirements
 * - Risk levels for confirmation gates
 * - Handler functions with full context
 */

import { z } from "zod";
import { ToolDef, ToolContext, ToolResult, ValidationError } from "./Types";
import { enforce } from "./Guardrails";
import { logToolCall } from "./Audit";

/**
 * In-memory tool registry
 * In production, this could be extended to support dynamic loading
 */
const registry = new Map<string, ToolDef<z.ZodTypeAny>>();

/**
 * Register a new tool in the ToolBus
 * @throws Error if tool name already exists (prevent duplicates)
 */
export function registerTool<T extends z.ZodTypeAny>(def: ToolDef<T>): void {
  if (registry.has(def.name)) {
    throw new Error(`Tool already registered: ${def.name}`);
  }
  
  console.log(`[ToolBus] Registered tool: ${def.name} (scopes: ${def.authz.join(", ")}, risk: ${def.risk})`);
  registry.set(def.name, def as any);
}

/**
 * Get a tool definition by name
 * @returns ToolDef or undefined if not found
 */
export function getTool(name: string): ToolDef<z.ZodTypeAny> | undefined {
  return registry.get(name);
}

/**
 * List all registered tool names
 */
export function listToolNames(): string[] {
  return Array.from(registry.keys());
}

/**
 * Get tools in OpenAI function calling format
 * Filters by user scopes - only return tools the user is authorized to use
 * 
 * @param scopes - User's current scopes
 * @returns Array of OpenAI function definitions
 */
export function listOpenAITools(scopes: string[]): any[] {
  const userScopes = new Set(scopes);
  
  return Array.from(registry.values())
    .filter(tool => {
      // User must have ALL required scopes for this tool
      return tool.authz.every(requiredScope => userScopes.has(requiredScope));
    })
    .map(tool => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: zodToJsonSchema(tool.parameters)
      }
    }));
}

/**
 * Execute a tool with full validation and guardrails
 * 
 * Flow:
 * 1. Validate tool exists
 * 2. Parse + validate args with Zod
 * 3. Check authorization + mode via Guardrails
 * 4. Execute handler
 * 5. Log to audit trail
 * 
 * @param ctx - Execution context (user, session, mode)
 * @param toolName - Name of tool to execute
 * @param args - Raw arguments object
 * @returns ToolResult with ok/data/error
 */
export async function executeTool(
  ctx: ToolContext,
  toolName: string,
  args: any
): Promise<ToolResult> {
  const startTime = Date.now();
  
  try {
    // 1. Get tool definition
    const tool = registry.get(toolName);
    if (!tool) {
      throw new Error(`Unknown tool: ${toolName}`);
    }
    
    // 2. Validate arguments with Zod
    const parseResult = tool.parameters.safeParse(args);
    if (!parseResult.success) {
      throw new ValidationError(toolName, parseResult.error);
    }
    const validatedArgs = parseResult.data;
    
    // 3. Check authorization and mode (may throw ConfirmRequiredError)
    enforce(ctx, tool, validatedArgs);
    
    // 4. Execute handler
    const result = await tool.handler(ctx, validatedArgs);
    
    // 5. Log success
    const duration = Date.now() - startTime;
    await logToolCall(ctx, {
      tool: toolName,
      args: validatedArgs,
      result,
      ok: true,
      duration,
      simulated: ctx.dryRun || false
    });
    
    return {
      ok: true,
      data: result,
      simulated: ctx.dryRun
    };
    
  } catch (error: any) {
    // Log failure
    const duration = Date.now() - startTime;
    await logToolCall(ctx, {
      tool: toolName,
      args,
      result: null,
      ok: false,
      error: error.message,
      duration,
      simulated: ctx.dryRun || false
    });
    
    return {
      ok: false,
      error: error.message || "Unknown error",
      simulated: ctx.dryRun
    };
  }
}

/**
 * Convert Zod schema to JSON Schema for OpenAI
 * This is a simplified converter - extend as needed
 */
function zodToJsonSchema(schema: z.ZodTypeAny): any {
  // Handle ZodObject
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: any = {};
    const required: string[] = [];
    
    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodToJsonSchema(value as z.ZodTypeAny);
      
      // Check if field is optional
      if (!(value instanceof z.ZodOptional) && !(value instanceof z.ZodDefault)) {
        required.push(key);
      }
    }
    
    return {
      type: "object",
      properties,
      required: required.length > 0 ? required : undefined
    };
  }
  
  // Handle ZodString
  if (schema instanceof z.ZodString) {
    const def: any = { type: "string" };
    // Add constraints if present
    if ((schema as any)._def.checks) {
      for (const check of (schema as any)._def.checks) {
        if (check.kind === "min") def.minLength = check.value;
        if (check.kind === "max") def.maxLength = check.value;
      }
    }
    return def;
  }
  
  // Handle ZodNumber
  if (schema instanceof z.ZodNumber) {
    const def: any = { type: "number" };
    if ((schema as any)._def.checks) {
      for (const check of (schema as any)._def.checks) {
        if (check.kind === "min") def.minimum = check.value;
        if (check.kind === "max") def.maximum = check.value;
        if (check.kind === "int") def.type = "integer";
      }
    }
    return def;
  }
  
  // Handle ZodBoolean
  if (schema instanceof z.ZodBoolean) {
    return { type: "boolean" };
  }
  
  // Handle ZodArray
  if (schema instanceof z.ZodArray) {
    return {
      type: "array",
      items: zodToJsonSchema((schema as any)._def.type)
    };
  }
  
  // Handle ZodEnum
  if (schema instanceof z.ZodEnum) {
    return {
      type: "string",
      enum: (schema as any)._def.values
    };
  }
  
  // Handle ZodOptional
  if (schema instanceof z.ZodOptional) {
    return zodToJsonSchema((schema as any)._def.innerType);
  }
  
  // Handle ZodDefault
  if (schema instanceof z.ZodDefault) {
    const inner = zodToJsonSchema((schema as any)._def.innerType);
    inner.default = (schema as any)._def.defaultValue();
    return inner;
  }
  
  // Fallback
  return { type: "string", description: "Unknown type" };
}

/**
 * Get tool registry stats (for monitoring)
 */
export function getStats() {
  const tools = Array.from(registry.values());
  return {
    totalTools: tools.length,
    byRisk: {
      low: tools.filter(t => t.risk === "low").length,
      medium: tools.filter(t => t.risk === "medium").length,
      high: tools.filter(t => t.risk === "high").length
    },
    byScope: tools.reduce((acc, t) => {
      t.authz.forEach(scope => {
        acc[scope] = (acc[scope] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>)
  };
}

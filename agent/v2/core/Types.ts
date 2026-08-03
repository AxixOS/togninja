/**
 * Core types for Agent V2 ToolBus architecture
 */

import { z } from "zod";

/**
 * Tool execution context - contains user identity, permissions, and mode
 */
export interface ToolContext {
  /** Studio ID the user belongs to */
  studioId: string;
  /** User ID making the request */
  userId: string;
  /** Current session ID for audit logging */
  sessionId: string;
  /** Scopes the user has (e.g., CRM_READ, INV_WRITE, EMAIL_SEND) */
  scopes: string[];
  /** Execution mode: read_only, auto_safe, auto_full */
  mode: "read_only" | "auto_safe" | "auto_full";
  /** True if running in shadow mode (dry-run, no side effects) */
  dryRun?: boolean;
}

/**
 * Risk level for a tool - determines if confirmation is needed
 */
export type RiskLevel = "low" | "medium" | "high";

/**
 * Tool definition with Zod schema validation
 */
export interface ToolDef<T extends z.ZodTypeAny> {
  /** Tool name in snake_case (e.g., "crm_clients_search") */
  name: string;
  /** Human-readable description for LLM */
  description: string;
  /** Zod schema for parameter validation */
  parameters: T;
  /** Required scopes to execute this tool */
  authz: string[];
  /** Risk level - determines confirmation requirements */
  risk: RiskLevel;
  /** Tool handler function */
  handler: (ctx: ToolContext, args: z.infer<T>) => Promise<any>;
}

/**
 * Tool execution result
 */
export interface ToolResult {
  /** True if execution succeeded */
  ok: boolean;
  /** Result data if ok=true, error message if ok=false */
  data?: any;
  /** Error message if ok=false */
  error?: string;
  /** Whether this was a simulated execution (shadow mode) */
  simulated?: boolean;
}

/**
 * Confirmation requirement thrown by guardrails
 */
export class ConfirmRequiredError extends Error {
  constructor(
    public tool: string,
    public args: any,
    public reason: string
  ) {
    super("CONFIRM_REQUIRED");
    this.name = "ConfirmRequiredError";
  }
}

/**
 * Authorization failure
 */
export class AuthzError extends Error {
  constructor(
    public tool: string,
    public requiredScopes: string[],
    public userScopes: string[]
  ) {
    super(`Missing required scopes: ${requiredScopes.join(", ")}`);
    this.name = "AuthzError";
  }
}

/**
 * Validation error from Zod schema
 */
export class ValidationError extends Error {
  constructor(
    public tool: string,
    public zodError: z.ZodError
  ) {
    super(`Validation failed: ${zodError.message}`);
    this.name = "ValidationError";
  }
}

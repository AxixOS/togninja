/**
 * Guardrails - Authorization and safety enforcement
 * 
 * This module prevents unauthorized or unsafe tool execution by:
 * - Checking user scopes against tool requirements
 * - Enforcing execution mode (read_only, auto_safe, auto_full)
 * - Requiring confirmation for high-risk operations
 */

import { ToolContext, ToolDef, AuthzError, ConfirmRequiredError } from "./Types";
import { z } from "zod";

/**
 * Enforce guardrails before tool execution
 * 
 * Throws:
 * - AuthzError: User lacks required scopes
 * - ConfirmRequiredError: Action needs user confirmation
 * - Error: Read-only mode blocks risky actions
 * 
 * @param ctx - Execution context
 * @param tool - Tool definition
 * @param args - Validated arguments
 */
export function enforce(
  ctx: ToolContext,
  tool: ToolDef<z.ZodTypeAny>,
  args: any
): void {
  // 1. Scope-based authorization check
  checkScopes(ctx, tool);
  
  // 2. Mode-based execution control
  checkMode(ctx, tool, args);
}

/**
 * Check if user has all required scopes for this tool
 * @throws AuthzError if missing scopes
 */
function checkScopes(ctx: ToolContext, tool: ToolDef<z.ZodTypeAny>): void {
  const userScopes = new Set(ctx.scopes);
  const missingScopes = tool.authz.filter(scope => !userScopes.has(scope));
  
  if (missingScopes.length > 0) {
    console.warn(`[Guardrails] BLOCKED: ${tool.name} - missing scopes: ${missingScopes.join(", ")}`);
    throw new AuthzError(tool.name, tool.authz, ctx.scopes);
  }
  
  console.log(`[Guardrails] SCOPE CHECK PASSED: ${tool.name}`);
}

/**
 * Check execution mode and risk level
 * 
 * Mode rules:
 * - read_only: Block all medium/high risk tools
 * - auto_safe: Require confirmation for medium/high risk
 * - auto_full: Auto-approve everything (admin only)
 * 
 * @throws Error if read_only mode blocks action
 * @throws ConfirmRequiredError if confirmation needed
 */
function checkMode(
  ctx: ToolContext,
  tool: ToolDef<z.ZodTypeAny>,
  args: any
): void {
  const isRisky = tool.risk === "medium" || tool.risk === "high";
  
  // Skip checks in dry-run mode (shadow testing)
  if (ctx.dryRun) {
    console.log(`[Guardrails] DRY-RUN: ${tool.name} (risk: ${tool.risk})`);
    return;
  }
  
  // READ_ONLY mode: Block all risky operations
  if (ctx.mode === "read_only" && isRisky) {
    console.warn(`[Guardrails] BLOCKED: ${tool.name} - read_only mode blocks ${tool.risk} risk tools`);
    throw new Error(`Read-only mode: ${tool.name} is ${tool.risk} risk and cannot be executed`);
  }
  
  // AUTO_SAFE mode: Require confirmation for risky operations
  if (ctx.mode === "auto_safe" && isRisky) {
    // Check if user already confirmed (args will have __confirm: true)
    const confirmed = args.__confirm === true;
    
    if (!confirmed) {
      console.warn(`[Guardrails] CONFIRM REQUIRED: ${tool.name} (risk: ${tool.risk})`);
      throw new ConfirmRequiredError(
        tool.name,
        args,
        `This action is ${tool.risk} risk and requires confirmation`
      );
    }
    
    console.log(`[Guardrails] CONFIRMED: ${tool.name} by user`);
  }
  
  // AUTO_FULL mode: Auto-approve everything (admin users)
  if (ctx.mode === "auto_full") {
    console.log(`[Guardrails] AUTO-APPROVED: ${tool.name} (mode: auto_full)`);
  }
  
  // Low-risk tools: Always allowed in any mode
  if (tool.risk === "low") {
    console.log(`[Guardrails] ALLOWED: ${tool.name} (low risk)`);
  }
}

/**
 * Get recommended mode for a user based on their role
 * This is a helper for the frontend to suggest appropriate modes
 */
export function getRecommendedMode(userRole: string): "read_only" | "auto_safe" | "auto_full" {
  switch (userRole) {
    case "admin":
    case "owner":
      return "auto_full"; // Admins can auto-approve
    
    case "photographer":
    case "manager":
      return "auto_safe"; // Staff needs confirmations
    
    case "viewer":
    case "client":
    default:
      return "read_only"; // Restricted users
  }
}

/**
 * Check if a tool would require confirmation in the current context
 * Useful for UI to show "this will need confirmation" warnings
 */
export function wouldRequireConfirm(
  mode: "read_only" | "auto_safe" | "auto_full",
  risk: "low" | "medium" | "high"
): boolean {
  if (mode === "auto_full") return false; // Never needs confirm
  if (mode === "read_only") return false; // Would be blocked, not confirmed
  if (mode === "auto_safe" && (risk === "medium" || risk === "high")) return true;
  return false;
}

/**
 * Get a human-readable explanation of why an action was blocked/needs confirm
 */
export function explainGuardrail(
  mode: "read_only" | "auto_safe" | "auto_full",
  risk: "low" | "medium" | "high",
  tool: string
): string {
  if (mode === "read_only" && risk !== "low") {
    return `${tool} is blocked because you're in read-only mode. Switch to auto-safe mode to enable confirmable actions.`;
  }
  
  if (mode === "auto_safe" && risk !== "low") {
    return `${tool} is ${risk} risk and requires your confirmation before executing.`;
  }
  
  return `${tool} is allowed to execute automatically.`;
}

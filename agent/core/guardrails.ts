// Guardrails for CRM agent operations
import type { AgentCtx } from "./ctx";

export type GuardrailResult = "allow" | "deny" | "propose";

export function allowWrite(ctx: AgentCtx, authority: string): GuardrailResult {
  // Check if user has the required authority
  if (!ctx.policy.authorities.includes(authority)) {
    return "deny";
  }

  // Check policy mode
  switch (ctx.policy.mode) {
    case "read_only":
      return "deny";
    case "propose":
      return "propose";
    case "auto_safe":
    case "auto_all":
      return "allow";
    default:
      return "deny";
  }
}

export function shouldApprove(ctx: AgentCtx, amount: number): boolean {
  return amount < ctx.policy.approval_required_over_amount;
}
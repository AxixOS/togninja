import crypto from "crypto";

export interface ProposedAction {
  id: string;              // proposal id (uuid or hash)
  label: string;           // human-readable description
  tool: string;            // tool name that will be called
  args: Record<string, any>; // arguments to pass to the tool
  requires_approval: boolean;
  reason?: string;         // why approval is required
  risk_level?: "low" | "med" | "high";
  estimated_time?: string; // "2 minutes", "immediate"
  preview?: string;        // preview of what will be created/changed
}

export interface ProposalResponse {
  status: "success" | "needs_approval" | "denied" | "error";
  message?: string;
  result?: any;
  proposed_actions?: ProposedAction[];
  error?: string;
}

export function makeProposal(
  tool: string, 
  args: any, 
  requires: boolean, 
  label: string, 
  reason?: string,
  riskLevel: "low" | "med" | "high" = "low",
  estimatedTime?: string,
  preview?: string
): ProposedAction {
  const seed = JSON.stringify({ tool, args, timestamp: Date.now() });
  const id = crypto.createHash("sha1").update(seed).digest("hex").slice(0, 12);
  
  return { 
    id, 
    tool, 
    args, 
    requires_approval: requires, 
    label, 
    reason,
    risk_level: riskLevel,
    estimated_time: estimatedTime,
    preview
  };
}

export function createSuccessResponse(result: any, message?: string): ProposalResponse {
  return {
    status: "success",
    message,
    result
  };
}

export function createApprovalResponse(
  actions: ProposedAction[],
  message?: string
): ProposalResponse {
  return {
    status: "needs_approval",
    message,
    proposed_actions: actions
  };
}

export function createDeniedResponse(reason: string): ProposalResponse {
  return {
    status: "denied",
    message: reason
  };
}

export function createErrorResponse(error: string): ProposalResponse {
  return {
    status: "error",
    error
  };
}

// Helper to format proposals for AI assistant responses
export function formatProposalForAssistant(proposals: ProposedAction[]): string {
  if (proposals.length === 0) return "";
  
  const formatted = proposals.map(p => {
    let line = `• ${p.label}`;
    if (p.risk_level && p.risk_level !== "low") {
      line += ` (${p.risk_level} risk)`;
    }
    if (p.estimated_time) {
      line += ` - ${p.estimated_time}`;
    }
    if (p.preview) {
      line += `\n  Preview: ${p.preview}`;
    }
    return line;
  }).join("\n");
  
  return `The following actions require your approval:\n\n${formatted}\n\nWould you like me to proceed with these actions?`;
}

// Helper to extract proposal by ID
export function findProposalById(proposals: ProposedAction[], id: string): ProposedAction | null {
  return proposals.find(p => p.id === id) || null;
}

// Helper to validate proposal integrity
export function validateProposal(proposal: ProposedAction): boolean {
  return !!(
    proposal.id &&
    proposal.tool &&
    proposal.label &&
    typeof proposal.requires_approval === "boolean" &&
    proposal.args
  );
}
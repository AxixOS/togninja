"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeProposal = makeProposal;
exports.createSuccessResponse = createSuccessResponse;
exports.createApprovalResponse = createApprovalResponse;
exports.createDeniedResponse = createDeniedResponse;
exports.createErrorResponse = createErrorResponse;
exports.formatProposalForAssistant = formatProposalForAssistant;
exports.findProposalById = findProposalById;
exports.validateProposal = validateProposal;
const crypto_1 = __importDefault(require("crypto"));
function makeProposal(tool, args, requires, label, reason, riskLevel = "low", estimatedTime, preview) {
    const seed = JSON.stringify({ tool, args, timestamp: Date.now() });
    const id = crypto_1.default.createHash("sha1").update(seed).digest("hex").slice(0, 12);
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
function createSuccessResponse(result, message) {
    return {
        status: "success",
        message,
        result
    };
}
function createApprovalResponse(actions, message) {
    return {
        status: "needs_approval",
        message,
        proposed_actions: actions
    };
}
function createDeniedResponse(reason) {
    return {
        status: "denied",
        message: reason
    };
}
function createErrorResponse(error) {
    return {
        status: "error",
        error
    };
}
// Helper to format proposals for AI assistant responses
function formatProposalForAssistant(proposals) {
    if (proposals.length === 0)
        return "";
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
function findProposalById(proposals, id) {
    return proposals.find(p => p.id === id) || null;
}
// Helper to validate proposal integrity
function validateProposal(proposal) {
    return !!(proposal.id &&
        proposal.tool &&
        proposal.label &&
        typeof proposal.requires_approval === "boolean" &&
        proposal.args);
}

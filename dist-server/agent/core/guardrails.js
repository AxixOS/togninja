"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allowWrite = allowWrite;
exports.shouldApprove = shouldApprove;
function allowWrite(ctx, authority) {
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
function shouldApprove(ctx, amount) {
    return amount < ctx.policy.approval_required_over_amount;
}

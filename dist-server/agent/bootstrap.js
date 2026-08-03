"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAgentContext = createAgentContext;
// Agent system bootstrap
const memory_1 = require("./core/memory");
async function createAgentContext(studioId, userId) {
    // Load or create session
    const session = await (0, memory_1.loadSession)(studioId, userId);
    // Default policy for New Age Fotografie
    const defaultPolicy = {
        mode: "auto_safe",
        authorities: [
            "READ_CLIENTS",
            "READ_LEADS",
            "READ_SESSIONS",
            "READ_INVOICES",
            "CREATE_LEAD",
            "UPDATE_CLIENT",
            "SEND_EMAIL",
            "DRAFT_EMAIL",
            "MANAGE_VOUCHERS",
            "READ_TOP_CLIENTS",
            "MANAGE_GALLERIES",
            "MANAGE_CALENDAR",
            "MANAGE_FILES",
            "MANAGE_BLOG",
            "MANAGE_EMAIL_CAMPAIGNS",
            "MANAGE_QUESTIONNAIRES",
            "MANAGE_REPORTS",
            "MANAGE_SYSTEM",
            "MANAGE_INTEGRATIONS",
            "MANAGE_AUTOMATION",
            "MANAGE_CUSTOMER_PORTAL"
        ],
        approval_required_over_amount: 500,
        email_send_mode: "auto",
        invoice_auto_limit: 1000
    };
    const ctx = {
        studioId,
        userId,
        studioName: "New Age Fotografie",
        mode: defaultPolicy.mode,
        policy: defaultPolicy,
        creds: {
            currency: "EUR"
        },
        chatSessionId: session.id,
        memory: session.memory_json || {}
    };
    return ctx;
}

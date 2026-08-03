"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadPolicy = loadPolicy;
const neon_http_1 = require("drizzle-orm/neon-http");
const serverless_1 = require("@neondatabase/serverless");
const schema_1 = require("../../shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
const sql = (0, serverless_1.neon)(process.env.DATABASE_URL);
const db = (0, neon_http_1.drizzle)(sql);
async function loadPolicy(studioId) {
    try {
        const data = await db.select().from(schema_1.aiPolicies).where((0, drizzle_orm_1.eq)(schema_1.aiPolicies.studioId, studioId));
        if (!data || data.length === 0) {
            return {
                mode: "auto_safe",
                authorities: ["READ_CLIENTS", "READ_LEADS", "READ_SESSIONS", "READ_INVOICES", "DRAFT_EMAIL", "CREATE_LEAD", "UPDATE_CLIENT", "SEND_EMAIL", "CREATE_SESSION"],
                invoice_auto_limit: 500,
                email_send_mode: "auto",
                // Phase B: Default safe policy
                restricted_fields: {
                    "crm_clients": ["email", "phone"],
                    "crm_leads": [],
                    "crm_invoices": ["amount", "tax_amount"]
                },
                auto_safe_actions: ["create_lead"],
                max_ops_per_hour: 50,
                approval_required_over_amount: 500,
                email_domain_trustlist: ["gmail.com", "yahoo.com", "outlook.com"]
            };
        }
        const policy = data[0];
        return {
            mode: policy.mode,
            authorities: policy.authorities ?? [],
            invoice_auto_limit: Number(policy.invoice_auto_limit ?? 0),
            email_send_mode: policy.email_send_mode,
            // Phase B: Enhanced policy fields with safe defaults
            restricted_fields: policy.restricted_fields ?? {
                "crm_clients": ["email", "phone"],
                "crm_leads": [],
                "crm_invoices": ["amount", "tax_amount"]
            },
            auto_safe_actions: policy.auto_safe_actions ?? ["create_lead"],
            max_ops_per_hour: Number(policy.max_ops_per_hour ?? 50),
            approval_required_over_amount: Number(policy.approval_required_over_amount ?? 500),
            email_domain_trustlist: policy.email_domain_trustlist ?? ["gmail.com", "yahoo.com", "outlook.com"]
        };
    }
    catch (error) {
        console.error("Failed to load policy:", error);
        return {
            mode: "read_only",
            authorities: ["READ_CLIENTS", "READ_LEADS", "READ_SESSIONS", "READ_INVOICES", "DRAFT_EMAIL"],
            invoice_auto_limit: 0,
            email_send_mode: "draft",
            // Phase B: Safe fallback policy
            restricted_fields: {
                "crm_clients": ["email", "phone"],
                "crm_leads": [],
                "crm_invoices": ["amount", "tax_amount"]
            },
            auto_safe_actions: ["create_lead"],
            max_ops_per_hour: 50,
            approval_required_over_amount: 500,
            email_domain_trustlist: ["gmail.com", "yahoo.com", "outlook.com"]
        };
    }
}

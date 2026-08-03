"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUPABASE_REMOVED = void 0;
exports.loadStudioCreds = loadStudioCreds;
// Supabase storage bridge removed. This file remains as a compatibility stub
// to avoid refactors in modules still importing it. Uses Neon-only.
const crypto_1 = require("../util/crypto");
const db_1 = require("../../server/db"); // reuse existing Neon drizzle instance
const schema_1 = require("../../shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
async function loadStudioCreds(studioId) {
    const rows = await db_1.db.select().from(schema_1.studioIntegrations).where((0, drizzle_orm_1.eq)(schema_1.studioIntegrations.studioId, studioId));
    if (!rows.length)
        throw new Error('Studio integrations missing');
    const integration = rows[0];
    return {
        smtp: {
            host: integration.smtp_host,
            port: integration.smtp_port,
            user: integration.smtp_user,
            pass: (0, crypto_1.decrypt)((integration.smtp_pass_encrypted) ?? ''),
            from: integration.default_from_email ?? process.env.STUDIO_DEFAULT_EMAIL_FROM ?? 'no-reply@example.com'
        },
        stripe: { accountId: integration.stripe_account_id ?? undefined },
        openai: {
            apiKey: integration.openai_api_key_encrypted ? (0, crypto_1.decrypt)(integration.openai_api_key_encrypted) : undefined,
        },
        currency: integration.default_currency ?? 'EUR'
    };
}
exports.SUPABASE_REMOVED = true;

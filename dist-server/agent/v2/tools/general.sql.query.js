"use strict";
/**
 * General SQL Query Tool (Read-Only Fallback)
 * Tier 1: Low-risk read-only tool with strict guards
 *
 * Safety net for edge cases not covered by specific tools
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const ToolBus_1 = require("../core/ToolBus");
const pg_1 = __importDefault(require("pg"));
const { Pool } = pg_1.default;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined
});
// Whitelist of allowed tables for queries
const ALLOWED_TABLES = [
    'users', 'crm_clients', 'crm_leads', 'crm_invoices', 'crm_invoice_items',
    'crm_invoice_payments', 'crm_messages', 'studio_appointments', 'galleries',
    'gallery_images', 'voucher_products', 'voucher_sales', 'discount_coupons',
    'price_list_items', 'lead_sources', 'photography_sessions', 'session_tasks',
    'session_equipment', 'session_communications', 'digital_files', 'photo_folders',
    'blog_posts', 'email_campaigns', 'email_templates', 'email_subscribers',
    'email_segments', 'questionnaires', 'questionnaire_responses', 'online_bookings',
    'studio_configs', 'studio_available_slots'
];
// Forbidden keywords that indicate write operations
const FORBIDDEN_KEYWORDS = [
    'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'TRUNCATE',
    'GRANT', 'REVOKE', 'EXEC', 'EXECUTE', 'MERGE', 'REPLACE', 'UPSERT',
    'INTO', 'SET', 'VALUES', 'CASCADE', 'RETURNING'
];
const params = zod_1.z.object({
    query: zod_1.z.string().describe("A read-only SQL SELECT query. Must start with SELECT and only access allowed tables."),
    limit: zod_1.z.number().int().min(1).max(100).default(50).optional().describe("Maximum rows to return (safety limit)")
});
const def = {
    name: "general_sql_query",
    description: `Execute a read-only SQL query as a fallback for edge cases.

⚠️ USE THIS TOOL SPARINGLY - Only when no specific tool exists for the query.

STRICT RULES:
- Query MUST start with SELECT
- Only read operations allowed (no INSERT, UPDATE, DELETE, etc.)
- Limited to approved CRM tables
- Results capped at 100 rows for safety

Example valid queries:
- "SELECT COUNT(*) FROM crm_clients WHERE status = 'active'"
- "SELECT email, first_name FROM crm_leads ORDER BY created_at DESC LIMIT 10"
- "SELECT SUM(total::numeric) FROM crm_invoices WHERE status = 'paid'"

Example INVALID queries (will be rejected):
- "INSERT INTO crm_clients..."
- "UPDATE users SET..."
- "DELETE FROM invoices..."

Use this to answer complex questions not covered by specific tools.`,
    parameters: params,
    authz: ["SQL_READ"],
    risk: "low",
    handler: async (ctx, args) => {
        try {
            const query = args.query.trim();
            const upperQuery = query.toUpperCase();
            // Security check 1: Must start with SELECT
            if (!upperQuery.startsWith('SELECT')) {
                throw new Error("Security violation: Query must start with SELECT. Write operations are not allowed.");
            }
            // Security check 2: No forbidden keywords
            for (const keyword of FORBIDDEN_KEYWORDS) {
                // Check for keyword as a whole word (with word boundaries)
                const regex = new RegExp(`\\b${keyword}\\b`, 'i');
                if (regex.test(upperQuery)) {
                    throw new Error(`Security violation: Keyword "${keyword}" is not allowed. Only read operations permitted.`);
                }
            }
            // Security check 3: Verify only allowed tables are accessed
            // Simple check - look for FROM and JOIN clauses
            const tablePattern = /\b(?:FROM|JOIN)\s+(\w+)/gi;
            let match;
            const accessedTables = [];
            while ((match = tablePattern.exec(query)) !== null) {
                const tableName = match[1].toLowerCase();
                accessedTables.push(tableName);
                if (!ALLOWED_TABLES.includes(tableName)) {
                    throw new Error(`Security violation: Table "${tableName}" is not in the allowed list. Allowed tables: ${ALLOWED_TABLES.slice(0, 10).join(', ')}...`);
                }
            }
            // Security check 4: No subqueries with write potential
            if (upperQuery.includes('INTO') || upperQuery.includes(';')) {
                throw new Error("Security violation: Suspicious query pattern detected. Multi-statement queries are not allowed.");
            }
            // Add LIMIT if not present (safety)
            let safeQuery = query;
            if (!upperQuery.includes('LIMIT')) {
                safeQuery = `${query} LIMIT ${args.limit || 50}`;
            }
            // Execute the query
            const startTime = Date.now();
            const result = await pool.query(safeQuery);
            const executionTime = Date.now() - startTime;
            return {
                success: true,
                query_info: {
                    original_query: args.query,
                    executed_query: safeQuery,
                    tables_accessed: accessedTables,
                    execution_time_ms: executionTime
                },
                results: {
                    row_count: result.rows.length,
                    columns: result.fields.map((f) => f.name),
                    data: result.rows
                },
                security: {
                    read_only: true,
                    tables_verified: true,
                    keywords_checked: true
                }
            };
        }
        catch (error) {
            console.error("❌ General SQL query error:", error);
            // Provide helpful error messages
            if (error.message.includes('Security violation')) {
                throw error;
            }
            // PostgreSQL syntax errors
            if (error.code === '42601') {
                throw new Error(`SQL syntax error: ${error.message}. Please check your query syntax.`);
            }
            // Table/column not found
            if (error.code === '42P01') {
                throw new Error(`Table not found: ${error.message}. Allowed tables: ${ALLOWED_TABLES.slice(0, 5).join(', ')}...`);
            }
            if (error.code === '42703') {
                throw new Error(`Column not found: ${error.message}. Please verify column names.`);
            }
            throw new Error(`Query failed: ${error.message}`);
        }
    }
};
(0, ToolBus_1.registerTool)(def);
exports.default = def;

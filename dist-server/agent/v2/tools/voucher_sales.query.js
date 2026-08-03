"use strict";
/**
 * Voucher Sales Query Tool
 * Tier 1: Low-risk read-only tool
 *
 * Allows the CRM Agent to query voucher sales data, calculate totals, and generate reports
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const ToolBus_1 = require("../core/ToolBus");
const pg_1 = __importDefault(require("pg"));
const { Pool } = pg_1.default;
// Create pool connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined
});
// Zod schema for parameter validation
const params = zod_1.z.object({
    startDate: zod_1.z.string().optional().describe("Filter sales from this date (YYYY-MM-DD)"),
    endDate: zod_1.z.string().optional().describe("Filter sales until this date (YYYY-MM-DD)"),
    paymentStatus: zod_1.z.enum(["pending", "paid", "refunded", "all"]).optional().default("all").describe("Filter by payment status"),
    limit: zod_1.z.number().int().min(1).max(500).default(50).optional().describe("Maximum number of records to return")
});
// Tool definition
const def = {
    name: "voucher_sales_query",
    description: `Query voucher sales database with filtering and aggregation.
  
Use this to answer questions like:
- "What are our total voucher sales?"
- "How many vouchers did we sell in November?"
- "What's our voucher revenue this month?"
- "Show me all pending voucher payments"

Returns: count, total revenue, and detailed sales records`,
    parameters: params,
    authz: ["CRM_READ"],
    risk: "low",
    handler: async (ctx, args) => {
        try {
            // Build WHERE clause
            const conditions = [];
            const values = [];
            let paramIndex = 1;
            if (args.startDate) {
                conditions.push(`vs.created_at >= $${paramIndex}::timestamp`);
                values.push(args.startDate);
                paramIndex++;
            }
            if (args.endDate) {
                conditions.push(`vs.created_at <= $${paramIndex}::timestamp`);
                values.push(args.endDate);
                paramIndex++;
            }
            if (args.paymentStatus && args.paymentStatus !== "all") {
                conditions.push(`vs.payment_status = $${paramIndex}`);
                values.push(args.paymentStatus);
                paramIndex++;
            }
            const whereClause = conditions.length > 0
                ? `WHERE ${conditions.join(" AND ")}`
                : "";
            // Get summary statistics
            const summaryQuery = `
        SELECT 
          COUNT(*) as total_count,
          SUM(CASE WHEN payment_status = 'paid' THEN final_amount::numeric ELSE 0 END) as total_revenue,
          SUM(CASE WHEN payment_status = 'pending' THEN final_amount::numeric ELSE 0 END) as pending_revenue,
          COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_count,
          COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_count
        FROM voucher_sales vs
        ${whereClause}
      `;
            const summary = await pool.query(summaryQuery, values);
            // Get detailed records
            const detailQuery = `
        SELECT 
          vs.voucher_code,
          vp.name as product_name,
          vs.purchaser_name,
          vs.recipient_name,
          vs.final_amount,
          vs.currency,
          vs.payment_status,
          vs.created_at
        FROM voucher_sales vs
        LEFT JOIN voucher_products vp ON vs.product_id = vp.id
        ${whereClause}
        ORDER BY vs.created_at DESC
        LIMIT $${paramIndex}
      `;
            const details = await pool.query(detailQuery, [...values, args.limit || 50]);
            return {
                success: true,
                summary: {
                    total_count: parseInt(summary.rows[0].total_count),
                    total_revenue: parseFloat(summary.rows[0].total_revenue || 0),
                    pending_revenue: parseFloat(summary.rows[0].pending_revenue || 0),
                    paid_count: parseInt(summary.rows[0].paid_count || 0),
                    pending_count: parseInt(summary.rows[0].pending_count || 0),
                    currency: "EUR"
                },
                sales: details.rows.map(row => ({
                    voucher_code: row.voucher_code,
                    product: row.product_name,
                    purchaser: row.purchaser_name,
                    recipient: row.recipient_name,
                    amount: parseFloat(row.final_amount),
                    currency: row.currency,
                    status: row.payment_status,
                    date: row.created_at
                }))
            };
        }
        catch (error) {
            console.error("❌ Voucher sales query error:", error);
            throw new Error(`Failed to query voucher sales: ${error.message}`);
        }
    }
};
// Register the tool
(0, ToolBus_1.registerTool)(def);
exports.default = def;

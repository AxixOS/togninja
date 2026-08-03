/**
 * Discount Coupons List Tool
 * Tier 1: Low-risk read-only tool
 * 
 * List and filter discount coupons from CRM
 */

import { z } from "zod";
import { registerTool } from "../core/ToolBus";
import { ToolDef, ToolContext } from "../core/Types";
import pkg from 'pg';
const { Pool } = pkg;

// Create pool connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined
});

// Zod schema for parameter validation
const params = z.object({
  isActive: z.boolean().optional().describe("Filter by active status"),
  discountType: z.enum(["percentage", "fixed_amount", "any"]).default("any").optional().describe("Filter by discount type"),
  valid: z.boolean().optional().describe("If true, only show currently valid coupons (within date range)"),
  search: z.string().optional().describe("Search in coupon code, name, or description"),
  limit: z.number().int().min(1).max(500).default(100).optional().describe("Maximum number of coupons to return")
});

// Tool definition
const def: ToolDef<typeof params> = {
  name: "coupons_list",
  description: `List and filter discount coupons from the CRM system.
  
Use this to answer questions like:
- "What discount coupons do we have?"
- "Show me all active coupons"
- "Which coupons are valid right now?"
- "List percentage discount coupons"
- "Search for 'WELCOME' coupon"
- "What coupons expire this month?"

Returns: List of coupons with discount details and usage statistics`,
  parameters: params,
  authz: ["COUPON_READ"],
  risk: "low",
  handler: async (ctx: ToolContext, args: z.infer<typeof params>) => {
    try {
      // Build WHERE clauses
      const whereClauses: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (args.isActive !== undefined) {
        whereClauses.push(`is_active = $${paramIndex}`);
        queryParams.push(args.isActive);
        paramIndex++;
      }

      if (args.discountType && args.discountType !== "any") {
        whereClauses.push(`discount_type = $${paramIndex}`);
        queryParams.push(args.discountType);
        paramIndex++;
      }

      if (args.valid) {
        whereClauses.push(`is_active = true AND (start_date IS NULL OR start_date <= NOW()) AND (end_date IS NULL OR end_date >= NOW())`);
      }

      if (args.search) {
        whereClauses.push(`(code ILIKE $${paramIndex} OR name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
        queryParams.push(`%${args.search}%`);
        paramIndex++;
      }

      const whereClause = whereClauses.length > 0 
        ? `WHERE ${whereClauses.join(' AND ')}` 
        : '';

      // Main query
      const query = `
        SELECT 
          id,
          code,
          name,
          description,
          discount_type,
          discount_value,
          min_order_amount,
          max_discount_amount,
          usage_limit,
          usage_count,
          usage_limit_per_customer,
          start_date,
          end_date,
          is_active,
          applicable_products,
          excluded_products,
          first_time_customers_only,
          created_at,
          updated_at,
          CASE 
            WHEN is_active = false THEN 'inactive'
            WHEN start_date IS NOT NULL AND start_date > NOW() THEN 'scheduled'
            WHEN end_date IS NOT NULL AND end_date < NOW() THEN 'expired'
            WHEN usage_limit IS NOT NULL AND usage_count >= usage_limit THEN 'exhausted'
            ELSE 'valid'
          END as status
        FROM discount_coupons
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex}
      `;

      queryParams.push(args.limit || 100);

      const result = await pool.query(query, queryParams);

      // Summary statistics
      const summaryQuery = `
        SELECT 
          COUNT(*) as total_coupons,
          COUNT(*) FILTER (WHERE is_active = true) as active_count,
          COUNT(*) FILTER (WHERE is_active = false) as inactive_count,
          COUNT(*) FILTER (WHERE is_active = true AND (start_date IS NULL OR start_date <= NOW()) AND (end_date IS NULL OR end_date >= NOW())) as valid_count,
          COUNT(*) FILTER (WHERE end_date IS NOT NULL AND end_date < NOW()) as expired_count,
          COUNT(*) FILTER (WHERE usage_limit IS NOT NULL AND usage_count >= usage_limit) as exhausted_count,
          COUNT(*) FILTER (WHERE discount_type = 'percentage') as percentage_count,
          COUNT(*) FILTER (WHERE discount_type = 'fixed_amount') as fixed_amount_count,
          SUM(usage_count) as total_usage_count
        FROM discount_coupons
        ${whereClause}
      `;

      const summaryResult = await pool.query(summaryQuery, queryParams.slice(0, -1));
      const summary = summaryResult.rows[0];

      const coupons = result.rows.map((row: any) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description || "—",
        status: row.status,
        discount: {
          type: row.discount_type,
          value: parseFloat(row.discount_value),
          display: row.discount_type === 'percentage' 
            ? `${row.discount_value}%` 
            : `€${row.discount_value}`,
          min_order_amount: row.min_order_amount ? parseFloat(row.min_order_amount) : null,
          max_discount_amount: row.max_discount_amount ? parseFloat(row.max_discount_amount) : null
        },
        usage: {
          limit: row.usage_limit,
          count: row.usage_count,
          remaining: row.usage_limit ? row.usage_limit - row.usage_count : "unlimited",
          limit_per_customer: row.usage_limit_per_customer
        },
        validity: {
          start_date: row.start_date,
          end_date: row.end_date,
          is_active: row.is_active
        },
        restrictions: {
          applicable_products: row.applicable_products || ["all"],
          excluded_products: row.excluded_products || [],
          first_time_customers_only: row.first_time_customers_only
        },
        created_at: row.created_at,
        updated_at: row.updated_at
      }));

      return {
        summary: {
          total_coupons: parseInt(summary.total_coupons),
          active: parseInt(summary.active_count),
          inactive: parseInt(summary.inactive_count),
          valid_now: parseInt(summary.valid_count),
          expired: parseInt(summary.expired_count),
          exhausted: parseInt(summary.exhausted_count),
          by_type: {
            percentage: parseInt(summary.percentage_count),
            fixed_amount: parseInt(summary.fixed_amount_count)
          },
          total_redemptions: parseInt(summary.total_usage_count || 0),
          returned: coupons.length
        },
        filters: {
          is_active: args.isActive !== undefined ? args.isActive : "any",
          discount_type: args.discountType || "any",
          valid_only: args.valid || false,
          search: args.search || "none"
        },
        coupons: coupons
      };

    } catch (error: any) {
      console.error("❌ Coupons list error:", error);
      throw new Error(`Failed to list coupons: ${error.message}`);
    }
  }
};

// Register the tool
registerTool(def);

export default def;

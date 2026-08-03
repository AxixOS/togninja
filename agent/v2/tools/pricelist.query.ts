/**
 * Price List Query Tool
 * Tier 1: Low-risk read-only tool
 * 
 * Query price list items from CRM
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
  category: z.string().optional().describe("Filter by category (e.g., 'PRINTS', 'LEINWAND', 'DIGITAL')"),
  isActive: z.boolean().optional().describe("Filter by active status"),
  search: z.string().optional().describe("Search in item name or description"),
  minPrice: z.number().optional().describe("Minimum price"),
  maxPrice: z.number().optional().describe("Maximum price"),
  limit: z.number().int().min(1).max(500).default(200).optional().describe("Maximum number of items to return")
});

// Tool definition
const def: ToolDef<typeof params> = {
  name: "pricelist_query",
  description: `Query price list items for invoice creation.
  
Use this to answer questions like:
- "What are our prices?"
- "Show me all print prices"
- "List digital product prices"
- "What canvas sizes do we offer?"
- "Search for 'A4' in price list"
- "What items cost over €100?"
- "Show me the price for large prints"

Returns: List of price list items with pricing details`,
  parameters: params,
  authz: ["PRICELIST_READ"],
  risk: "low",
  handler: async (ctx: ToolContext, args: z.infer<typeof params>) => {
    try {
      // Build WHERE clauses
      const whereClauses: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (args.category) {
        whereClauses.push(`category ILIKE $${paramIndex}`);
        queryParams.push(`%${args.category}%`);
        paramIndex++;
      }

      if (args.isActive !== undefined) {
        whereClauses.push(`is_active = $${paramIndex}`);
        queryParams.push(args.isActive);
        paramIndex++;
      }

      if (args.search) {
        whereClauses.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR sku ILIKE $${paramIndex})`);
        queryParams.push(`%${args.search}%`);
        paramIndex++;
      }

      if (args.minPrice !== undefined) {
        whereClauses.push(`price::numeric >= $${paramIndex}`);
        queryParams.push(args.minPrice);
        paramIndex++;
      }

      if (args.maxPrice !== undefined) {
        whereClauses.push(`price::numeric <= $${paramIndex}`);
        queryParams.push(args.maxPrice);
        paramIndex++;
      }

      const whereClause = whereClauses.length > 0 
        ? `WHERE ${whereClauses.join(' AND ')}` 
        : '';

      // Main query
      const query = `
        SELECT 
          id,
          name,
          description,
          category,
          price,
          currency,
          tax_rate,
          sku,
          product_code,
          unit,
          notes,
          is_active,
          created_at,
          updated_at
        FROM price_list_items
        ${whereClause}
        ORDER BY category ASC, name ASC
        LIMIT $${paramIndex}
      `;

      queryParams.push(args.limit || 200);

      const result = await pool.query(query, queryParams);

      // Summary statistics and categories
      const summaryQuery = `
        SELECT 
          COUNT(*) as total_items,
          COUNT(*) FILTER (WHERE is_active = true) as active_count,
          COUNT(*) FILTER (WHERE is_active = false) as inactive_count,
          AVG(price::numeric) as avg_price,
          MIN(price::numeric) as min_price,
          MAX(price::numeric) as max_price,
          COUNT(DISTINCT category) as category_count
        FROM price_list_items
        ${whereClause}
      `;

      const summaryResult = await pool.query(summaryQuery, queryParams.slice(0, -1));
      const summary = summaryResult.rows[0];

      // Get category breakdown
      const categoryQuery = `
        SELECT 
          category,
          COUNT(*) as item_count,
          AVG(price::numeric) as avg_price
        FROM price_list_items
        ${whereClause}
        GROUP BY category
        ORDER BY category ASC
      `;

      const categoryResult = await pool.query(categoryQuery, queryParams.slice(0, -1));
      const categories = categoryResult.rows.reduce((acc: any, row: any) => {
        acc[row.category] = {
          count: parseInt(row.item_count),
          avg_price: parseFloat(row.avg_price || 0)
        };
        return acc;
      }, {});

      const items = result.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description || "—",
        category: row.category,
        pricing: {
          price: parseFloat(row.price),
          currency: row.currency || "EUR",
          tax_rate: parseFloat(row.tax_rate || 0),
          price_with_tax: parseFloat(row.price) * (1 + parseFloat(row.tax_rate || 0) / 100)
        },
        codes: {
          sku: row.sku || "—",
          product_code: row.product_code || "—"
        },
        unit: row.unit || "piece",
        notes: row.notes || "—",
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at
      }));

      return {
        summary: {
          total_items: parseInt(summary.total_items),
          active: parseInt(summary.active_count),
          inactive: parseInt(summary.inactive_count),
          category_count: parseInt(summary.category_count),
          pricing: {
            avg_price: parseFloat(summary.avg_price || 0),
            min_price: parseFloat(summary.min_price || 0),
            max_price: parseFloat(summary.max_price || 0),
            currency: "EUR"
          },
          returned: items.length
        },
        categories: categories,
        filters: {
          category: args.category || "any",
          is_active: args.isActive !== undefined ? args.isActive : "any",
          search: args.search || "none",
          price_range: args.minPrice || args.maxPrice 
            ? `€${args.minPrice || 0} - €${args.maxPrice || '∞'}` 
            : "any"
        },
        items: items
      };

    } catch (error: any) {
      console.error("❌ Price list query error:", error);
      throw new Error(`Failed to query price list: ${error.message}`);
    }
  }
};

// Register the tool
registerTool(def);

export default def;

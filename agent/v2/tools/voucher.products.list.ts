/**
 * Voucher Products List Tool
 * Tier 1: Low-risk read-only tool
 * 
 * List and filter voucher products from CRM
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
  category: z.enum(["familie", "baby", "hochzeit", "business", "event", "any"]).default("any").optional().describe("Filter by product category"),
  isActive: z.boolean().optional().describe("Filter by active status"),
  featured: z.boolean().optional().describe("Filter by featured status"),
  search: z.string().optional().describe("Search in product name or description"),
  minPrice: z.number().optional().describe("Minimum product price"),
  maxPrice: z.number().optional().describe("Maximum product price"),
  limit: z.number().int().min(1).max(100).default(50).optional().describe("Maximum number of products to return")
});

// Tool definition
const def: ToolDef<typeof params> = {
  name: "voucher_products_list",
  description: `List and filter voucher products available for sale.
  
Use this to answer questions like:
- "What voucher products do we offer?"
- "Show me all family photo session vouchers"
- "List featured voucher products"
- "Which vouchers are under €200?"
- "Show me active baby photoshoot packages"
- "What business photography vouchers are available?"

Returns: List of voucher products with pricing and availability details`,
  parameters: params,
  authz: ["VOUCHER_READ"],
  risk: "low",
  handler: async (ctx: ToolContext, args: z.infer<typeof params>) => {
    try {
      // Build WHERE clauses
      const whereClauses: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (args.category && args.category !== "any") {
        whereClauses.push(`category = $${paramIndex}`);
        queryParams.push(args.category);
        paramIndex++;
      }

      if (args.isActive !== undefined) {
        whereClauses.push(`is_active = $${paramIndex}`);
        queryParams.push(args.isActive);
        paramIndex++;
      }

      if (args.featured !== undefined) {
        whereClauses.push(`featured = $${paramIndex}`);
        queryParams.push(args.featured);
        paramIndex++;
      }

      if (args.search) {
        whereClauses.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR detailed_description ILIKE $${paramIndex})`);
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
          detailed_description,
          price,
          original_price,
          category,
          session_duration,
          session_type,
          validity_period,
          redemption_instructions,
          terms_and_conditions,
          image_url,
          thumbnail_url,
          promo_image_url,
          display_order,
          featured,
          badge,
          is_active,
          stock_limit,
          max_per_customer,
          slug,
          meta_title,
          meta_description,
          created_at,
          updated_at
        FROM voucher_products
        ${whereClause}
        ORDER BY display_order ASC, featured DESC, created_at DESC
        LIMIT $${paramIndex}
      `;

      queryParams.push(args.limit || 50);

      const result = await pool.query(query, queryParams);

      // Summary statistics
      const summaryQuery = `
        SELECT 
          COUNT(*) as total_products,
          COUNT(*) FILTER (WHERE is_active = true) as active_count,
          COUNT(*) FILTER (WHERE is_active = false) as inactive_count,
          COUNT(*) FILTER (WHERE featured = true) as featured_count,
          COUNT(*) FILTER (WHERE category = 'familie') as familie_count,
          COUNT(*) FILTER (WHERE category = 'baby') as baby_count,
          COUNT(*) FILTER (WHERE category = 'hochzeit') as hochzeit_count,
          COUNT(*) FILTER (WHERE category = 'business') as business_count,
          COUNT(*) FILTER (WHERE category = 'event') as event_count,
          AVG(price::numeric) as avg_price,
          MIN(price::numeric) as min_price,
          MAX(price::numeric) as max_price
        FROM voucher_products
        ${whereClause}
      `;

      const summaryResult = await pool.query(summaryQuery, queryParams.slice(0, -1));
      const summary = summaryResult.rows[0];

      const products = result.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description || "—",
        detailed_description: row.detailed_description || "—",
        pricing: {
          price: parseFloat(row.price),
          original_price: row.original_price ? parseFloat(row.original_price) : null,
          discount_percent: row.original_price 
            ? Math.round((1 - parseFloat(row.price) / parseFloat(row.original_price)) * 100)
            : null,
          currency: "EUR"
        },
        category: row.category || "uncategorized",
        session: {
          duration_minutes: row.session_duration,
          type: row.session_type
        },
        validity: {
          period_days: row.validity_period,
          instructions: row.redemption_instructions || "—",
          terms: row.terms_and_conditions || "—"
        },
        images: {
          main: row.image_url,
          thumbnail: row.thumbnail_url,
          promo: row.promo_image_url
        },
        display: {
          order: row.display_order,
          featured: row.featured,
          badge: row.badge
        },
        availability: {
          is_active: row.is_active,
          stock_limit: row.stock_limit,
          max_per_customer: row.max_per_customer
        },
        seo: {
          slug: row.slug,
          meta_title: row.meta_title,
          meta_description: row.meta_description
        },
        created_at: row.created_at,
        updated_at: row.updated_at
      }));

      return {
        summary: {
          total_products: parseInt(summary.total_products),
          active: parseInt(summary.active_count),
          inactive: parseInt(summary.inactive_count),
          featured: parseInt(summary.featured_count),
          by_category: {
            familie: parseInt(summary.familie_count),
            baby: parseInt(summary.baby_count),
            hochzeit: parseInt(summary.hochzeit_count),
            business: parseInt(summary.business_count),
            event: parseInt(summary.event_count)
          },
          pricing: {
            avg_price: parseFloat(summary.avg_price || 0),
            min_price: parseFloat(summary.min_price || 0),
            max_price: parseFloat(summary.max_price || 0),
            currency: "EUR"
          },
          returned: products.length
        },
        filters: {
          category: args.category || "any",
          is_active: args.isActive !== undefined ? args.isActive : "any",
          featured: args.featured !== undefined ? args.featured : "any",
          search: args.search || "none",
          price_range: args.minPrice || args.maxPrice 
            ? `€${args.minPrice || 0} - €${args.maxPrice || '∞'}` 
            : "any"
        },
        products: products
      };

    } catch (error: any) {
      console.error("❌ Voucher products list error:", error);
      throw new Error(`Failed to list voucher products: ${error.message}`);
    }
  }
};

// Register the tool
registerTool(def);

export default def;

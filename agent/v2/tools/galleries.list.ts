/**
 * Galleries List Tool
 * Tier 1: Low-risk read-only tool
 * 
 * List and filter galleries from CRM
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
  clientId: z.string().optional().describe("Filter galleries for a specific client ID"),
  isPublic: z.boolean().optional().describe("Filter by public (true) or private (false) galleries"),
  isPasswordProtected: z.boolean().optional().describe("Filter by password protection status"),
  search: z.string().optional().describe("Search in gallery title or description"),
  limit: z.number().int().min(1).max(500).default(100).optional().describe("Maximum number of galleries to return")
});

// Tool definition
const def: ToolDef<typeof params> = {
  name: "galleries_list",
  description: `List and filter photo galleries from the CRM system.
  
Use this to answer questions like:
- "Show me all galleries"
- "List galleries for client John Smith"
- "Which galleries are public?"
- "Show me password protected galleries"
- "Search for galleries about 'wedding'"
- "How many private galleries do we have?"

Returns: List of galleries with image counts and client information`,
  parameters: params,
  authz: ["GALLERY_READ"],
  risk: "low",
  handler: async (ctx: ToolContext, args: z.infer<typeof params>) => {
    try {
      // Build WHERE clauses
      const whereClauses: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (args.clientId) {
        whereClauses.push(`g.client_id = $${paramIndex}`);
        queryParams.push(args.clientId);
        paramIndex++;
      }

      if (args.isPublic !== undefined) {
        whereClauses.push(`g.is_public = $${paramIndex}`);
        queryParams.push(args.isPublic);
        paramIndex++;
      }

      if (args.isPasswordProtected !== undefined) {
        whereClauses.push(`g.is_password_protected = $${paramIndex}`);
        queryParams.push(args.isPasswordProtected);
        paramIndex++;
      }

      if (args.search) {
        whereClauses.push(`(g.title ILIKE $${paramIndex} OR g.description ILIKE $${paramIndex})`);
        queryParams.push(`%${args.search}%`);
        paramIndex++;
      }

      const whereClause = whereClauses.length > 0 
        ? `WHERE ${whereClauses.join(' AND ')}` 
        : '';

      // Main query with client join and image count
      const query = `
        SELECT 
          g.id,
          g.title,
          g.slug,
          g.description,
          g.cover_image,
          g.is_public,
          g.is_password_protected,
          g.client_id,
          c.first_name || ' ' || c.last_name as client_name,
          c.email as client_email,
          g.sort_order,
          g.created_at,
          g.updated_at,
          COUNT(gi.id) as image_count
        FROM galleries g
        LEFT JOIN crm_clients c ON g.client_id = c.id
        LEFT JOIN gallery_images gi ON gi.gallery_id = g.id
        ${whereClause}
        GROUP BY g.id, c.first_name, c.last_name, c.email
        ORDER BY g.created_at DESC
        LIMIT $${paramIndex}
      `;

      queryParams.push(args.limit || 100);

      const result = await pool.query(query, queryParams);

      // Summary statistics
      const summaryQuery = `
        SELECT 
          COUNT(*) as total_galleries,
          COUNT(*) FILTER (WHERE is_public = true) as public_count,
          COUNT(*) FILTER (WHERE is_public = false) as private_count,
          COUNT(*) FILTER (WHERE is_password_protected = true) as password_protected_count,
          COUNT(*) FILTER (WHERE client_id IS NOT NULL) as client_linked_count,
          COUNT(DISTINCT client_id) as distinct_clients
        FROM galleries g
        ${whereClause}
      `;

      const summaryResult = await pool.query(summaryQuery, queryParams.slice(0, -1));
      const summary = summaryResult.rows[0];

      // Get total image count
      const imageCountQuery = `
        SELECT COUNT(*) as total_images
        FROM gallery_images gi
        JOIN galleries g ON gi.gallery_id = g.id
        ${whereClause}
      `;

      const imageCountResult = await pool.query(imageCountQuery, queryParams.slice(0, -1));
      const totalImages = imageCountResult.rows[0]?.total_images || 0;

      const galleries = result.rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        slug: row.slug,
        description: row.description || "—",
        cover_image: row.cover_image || null,
        visibility: {
          is_public: row.is_public,
          is_password_protected: row.is_password_protected
        },
        client: row.client_id ? {
          id: row.client_id,
          name: row.client_name || "Unknown",
          email: row.client_email || "—"
        } : null,
        image_count: parseInt(row.image_count),
        sort_order: row.sort_order,
        created_at: row.created_at,
        updated_at: row.updated_at
      }));

      return {
        summary: {
          total_galleries: parseInt(summary.total_galleries),
          public_galleries: parseInt(summary.public_count),
          private_galleries: parseInt(summary.private_count),
          password_protected: parseInt(summary.password_protected_count),
          client_linked: parseInt(summary.client_linked_count),
          distinct_clients: parseInt(summary.distinct_clients),
          total_images: parseInt(totalImages),
          returned: galleries.length
        },
        filters: {
          client_id: args.clientId || "any",
          is_public: args.isPublic !== undefined ? args.isPublic : "any",
          is_password_protected: args.isPasswordProtected !== undefined ? args.isPasswordProtected : "any",
          search: args.search || "none"
        },
        galleries: galleries
      };

    } catch (error: any) {
      console.error("❌ Galleries list error:", error);
      throw new Error(`Failed to list galleries: ${error.message}`);
    }
  }
};

// Register the tool
registerTool(def);

export default def;

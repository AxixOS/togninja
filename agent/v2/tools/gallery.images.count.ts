/**
 * Gallery Images Count Tool
 * Tier 1: Low-risk read-only tool
 * 
 * Get image counts and stats for galleries
 */

import { z } from "zod";
import { registerTool } from "../core/ToolBus";
import { ToolDef, ToolContext } from "../core/Types";
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined
});

const params = z.object({
  galleryId: z.string().optional().describe("Get image count for a specific gallery"),
  clientId: z.string().optional().describe("Get image counts for a specific client's galleries")
});

const def: ToolDef<typeof params> = {
  name: "gallery_images_count",
  description: `Get image counts and statistics for galleries.
  
Use this to answer questions like:
- "How many images are in gallery X?"
- "What's the total image count for client Smith?"
- "How many photos have we uploaded?"
- "Show gallery statistics"

Returns: Image counts and gallery statistics`,
  parameters: params,
  authz: ["GALLERY_READ"],
  risk: "low",
  handler: async (ctx: ToolContext, args: z.infer<typeof params>) => {
    try {
      if (args.galleryId) {
        // Get count for specific gallery
        const query = `
          SELECT 
            g.id, g.title, g.slug, g.client_id,
            c.first_name || ' ' || c.last_name as client_name,
            COUNT(gi.id) as image_count
          FROM galleries g
          LEFT JOIN gallery_images gi ON gi.gallery_id = g.id
          LEFT JOIN crm_clients c ON g.client_id = c.id
          WHERE g.id = $1
          GROUP BY g.id, c.first_name, c.last_name
        `;
        const result = await pool.query(query, [args.galleryId]);

        if (result.rows.length === 0) {
          throw new Error(`Gallery ${args.galleryId} not found`);
        }

        const gallery = result.rows[0];
        return {
          gallery: {
            id: gallery.id,
            title: gallery.title,
            slug: gallery.slug,
            client: gallery.client_id ? {
              id: gallery.client_id,
              name: gallery.client_name
            } : null
          },
          image_count: parseInt(gallery.image_count)
        };
      }

      if (args.clientId) {
        // Get counts for specific client's galleries
        const query = `
          SELECT 
            g.id, g.title, g.slug,
            COUNT(gi.id) as image_count
          FROM galleries g
          LEFT JOIN gallery_images gi ON gi.gallery_id = g.id
          WHERE g.client_id = $1
          GROUP BY g.id
          ORDER BY g.created_at DESC
        `;
        const result = await pool.query(query, [args.clientId]);

        // Get client info
        const clientQuery = `
          SELECT first_name || ' ' || last_name as name, email 
          FROM crm_clients WHERE id = $1
        `;
        const clientResult = await pool.query(clientQuery, [args.clientId]);
        const client = clientResult.rows[0];

        const galleries = result.rows.map((row: any) => ({
          id: row.id,
          title: row.title,
          slug: row.slug,
          image_count: parseInt(row.image_count)
        }));

        const totalImages = galleries.reduce((sum: number, g: any) => sum + g.image_count, 0);

        return {
          client: client ? {
            id: args.clientId,
            name: client.name,
            email: client.email
          } : { id: args.clientId, name: "Unknown" },
          summary: {
            total_galleries: galleries.length,
            total_images: totalImages,
            avg_images_per_gallery: galleries.length > 0 
              ? Math.round(totalImages / galleries.length) 
              : 0
          },
          galleries: galleries
        };
      }

      // Overall statistics
      const overallQuery = `
        SELECT 
          COUNT(DISTINCT g.id) as total_galleries,
          COUNT(gi.id) as total_images,
          COUNT(DISTINCT g.client_id) FILTER (WHERE g.client_id IS NOT NULL) as galleries_with_clients,
          COUNT(*) FILTER (WHERE g.is_public = true) as public_galleries
        FROM galleries g
        LEFT JOIN gallery_images gi ON gi.gallery_id = g.id
      `;
      const overallResult = await pool.query(overallQuery);
      const overall = overallResult.rows[0];

      // Top galleries by image count
      const topQuery = `
        SELECT 
          g.id, g.title, g.slug,
          c.first_name || ' ' || c.last_name as client_name,
          COUNT(gi.id) as image_count
        FROM galleries g
        LEFT JOIN gallery_images gi ON gi.gallery_id = g.id
        LEFT JOIN crm_clients c ON g.client_id = c.id
        GROUP BY g.id, c.first_name, c.last_name
        ORDER BY image_count DESC
        LIMIT 10
      `;
      const topResult = await pool.query(topQuery);

      const topGalleries = topResult.rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        slug: row.slug,
        client_name: row.client_name || "—",
        image_count: parseInt(row.image_count)
      }));

      const totalGalleries = parseInt(overall.total_galleries);
      const totalImages = parseInt(overall.total_images);

      return {
        overview: {
          total_galleries: totalGalleries,
          total_images: totalImages,
          avg_images_per_gallery: totalGalleries > 0 
            ? Math.round(totalImages / totalGalleries) 
            : 0,
          galleries_with_clients: parseInt(overall.galleries_with_clients),
          public_galleries: parseInt(overall.public_galleries)
        },
        top_galleries: topGalleries
      };
    } catch (error: any) {
      console.error("❌ Gallery images count error:", error);
      throw new Error(`Failed to get gallery image counts: ${error.message}`);
    }
  }
};

registerTool(def);
export default def;

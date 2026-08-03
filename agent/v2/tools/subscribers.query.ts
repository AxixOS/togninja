/**
 * Email Subscribers Query Tool
 * Tier 1: Low-risk read-only tool
 * 
 * Query and filter email subscribers
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
  status: z.enum(["active", "unsubscribed", "bounced", "complained", "any"]).default("any").optional().describe("Filter by subscriber status"),
  source: z.enum(["manual", "import", "form", "booking", "any"]).default("any").optional().describe("Filter by subscription source"),
  search: z.string().optional().describe("Search in email, first name, or last name"),
  hasTag: z.string().optional().describe("Filter subscribers with a specific tag"),
  limit: z.number().int().min(1).max(500).default(100).optional().describe("Maximum number of subscribers to return")
});

const def: ToolDef<typeof params> = {
  name: "subscribers_query",
  description: `Query and filter email subscribers/mailing list.
  
Use this to answer questions like:
- "How many email subscribers do we have?"
- "Show me active subscribers"
- "Who unsubscribed recently?"
- "List subscribers from booking forms"
- "Find subscribers with tag 'wedding'"
- "What's our subscriber growth?"

Returns: List of email subscribers with engagement data`,
  parameters: params,
  authz: ["EMAIL_READ"],
  risk: "low",
  handler: async (ctx: ToolContext, args: z.infer<typeof params>) => {
    try {
      const whereClauses: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (args.status && args.status !== "any") {
        whereClauses.push(`status = $${paramIndex}`);
        queryParams.push(args.status);
        paramIndex++;
      }

      if (args.source && args.source !== "any") {
        whereClauses.push(`source = $${paramIndex}`);
        queryParams.push(args.source);
        paramIndex++;
      }

      if (args.search) {
        whereClauses.push(`(email ILIKE $${paramIndex} OR first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex})`);
        queryParams.push(`%${args.search}%`);
        paramIndex++;
      }

      if (args.hasTag) {
        whereClauses.push(`$${paramIndex} = ANY(tags)`);
        queryParams.push(args.hasTag);
        paramIndex++;
      }

      const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const query = `
        SELECT 
          id, email, first_name, last_name, phone,
          status, source, tags, custom_fields,
          subscribed_at, unsubscribed_at,
          last_opened_at, last_clicked_at,
          emails_sent_count, emails_opened_count, emails_clicked_count,
          created_at
        FROM email_subscribers
        ${whereClause}
        ORDER BY subscribed_at DESC
        LIMIT $${paramIndex}
      `;
      queryParams.push(args.limit || 100);

      const result = await pool.query(query, queryParams);

      const summaryQuery = `
        SELECT 
          COUNT(*) as total_count,
          COUNT(*) FILTER (WHERE status = 'active') as active_count,
          COUNT(*) FILTER (WHERE status = 'unsubscribed') as unsubscribed_count,
          COUNT(*) FILTER (WHERE status = 'bounced') as bounced_count,
          COUNT(*) FILTER (WHERE status = 'complained') as complained_count,
          COUNT(*) FILTER (WHERE source = 'manual') as manual_count,
          COUNT(*) FILTER (WHERE source = 'import') as import_count,
          COUNT(*) FILTER (WHERE source = 'form') as form_count,
          COUNT(*) FILTER (WHERE source = 'booking') as booking_count,
          SUM(emails_sent_count) as total_emails_sent,
          SUM(emails_opened_count) as total_opens,
          SUM(emails_clicked_count) as total_clicks
        FROM email_subscribers
        ${whereClause}
      `;
      const summaryResult = await pool.query(summaryQuery, queryParams.slice(0, -1));
      const summary = summaryResult.rows[0];

      const subscribers = result.rows.map((row: any) => {
        const sent = parseInt(row.emails_sent_count || 0);
        const opened = parseInt(row.emails_opened_count || 0);
        const clicked = parseInt(row.emails_clicked_count || 0);

        return {
          id: row.id,
          email: row.email,
          name: {
            first: row.first_name || "—",
            last: row.last_name || "—",
            full: [row.first_name, row.last_name].filter(Boolean).join(" ") || "—"
          },
          phone: row.phone || "—",
          status: row.status,
          source: row.source,
          tags: row.tags || [],
          custom_fields: row.custom_fields || {},
          dates: {
            subscribed_at: row.subscribed_at,
            unsubscribed_at: row.unsubscribed_at
          },
          engagement: {
            emails_sent: sent,
            emails_opened: opened,
            emails_clicked: clicked,
            open_rate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
            last_opened_at: row.last_opened_at,
            last_clicked_at: row.last_clicked_at
          }
        };
      });

      const totalSent = parseInt(summary.total_emails_sent || 0);
      const totalOpened = parseInt(summary.total_opens || 0);

      return {
        summary: {
          total_subscribers: parseInt(summary.total_count),
          by_status: {
            active: parseInt(summary.active_count),
            unsubscribed: parseInt(summary.unsubscribed_count),
            bounced: parseInt(summary.bounced_count),
            complained: parseInt(summary.complained_count)
          },
          by_source: {
            manual: parseInt(summary.manual_count),
            import: parseInt(summary.import_count),
            form: parseInt(summary.form_count),
            booking: parseInt(summary.booking_count)
          },
          engagement: {
            total_emails_sent: totalSent,
            total_opens: totalOpened,
            total_clicks: parseInt(summary.total_clicks || 0),
            avg_open_rate: totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0
          },
          returned: subscribers.length
        },
        filters: {
          status: args.status || "any",
          source: args.source || "any",
          search: args.search || "none",
          has_tag: args.hasTag || "any"
        },
        subscribers: subscribers
      };
    } catch (error: any) {
      console.error("❌ Subscribers query error:", error);
      throw new Error(`Failed to query subscribers: ${error.message}`);
    }
  }
};

registerTool(def);
export default def;

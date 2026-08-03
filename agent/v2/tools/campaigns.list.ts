/**
 * Email Campaigns List Tool
 * Tier 1: Low-risk read-only tool
 * 
 * List and filter email marketing campaigns
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
  status: z.enum(["draft", "scheduled", "sending", "sent", "paused", "archived", "any"]).default("any").optional().describe("Filter by campaign status"),
  type: z.enum(["broadcast", "drip", "transactional", "any"]).default("any").optional().describe("Filter by campaign type"),
  search: z.string().optional().describe("Search in campaign name or subject"),
  limit: z.number().int().min(1).max(100).default(50).optional().describe("Maximum number of campaigns to return")
});

const def: ToolDef<typeof params> = {
  name: "campaigns_list",
  description: `List email marketing campaigns with their statistics.
  
Use this to answer questions like:
- "Show me all email campaigns"
- "What campaigns are scheduled?"
- "List sent campaigns from last month"
- "Which campaigns have the best open rates?"
- "Show me draft campaigns"

Returns: List of email campaigns with engagement statistics`,
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

      if (args.type && args.type !== "any") {
        whereClauses.push(`type = $${paramIndex}`);
        queryParams.push(args.type);
        paramIndex++;
      }

      if (args.search) {
        whereClauses.push(`(name ILIKE $${paramIndex} OR subject ILIKE $${paramIndex})`);
        queryParams.push(`%${args.search}%`);
        paramIndex++;
      }

      const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const query = `
        SELECT 
          id, name, type, status, subject, preview_text,
          sender_name, sender_email, reply_to,
          scheduled_at, sent_at,
          segments, tags_include, tags_exclude,
          recipient_count, sent_count, delivered_count,
          opened_count, clicked_count, bounced_count, unsubscribed_count,
          created_at, updated_at
        FROM email_campaigns
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex}
      `;
      queryParams.push(args.limit || 50);

      const result = await pool.query(query, queryParams);

      const summaryQuery = `
        SELECT 
          COUNT(*) as total_count,
          COUNT(*) FILTER (WHERE status = 'draft') as draft_count,
          COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_count,
          COUNT(*) FILTER (WHERE status = 'sending') as sending_count,
          COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
          COUNT(*) FILTER (WHERE status = 'paused') as paused_count,
          SUM(sent_count) as total_sent,
          SUM(opened_count) as total_opened,
          SUM(clicked_count) as total_clicked
        FROM email_campaigns
        ${whereClause}
      `;
      const summaryResult = await pool.query(summaryQuery, queryParams.slice(0, -1));
      const summary = summaryResult.rows[0];

      const totalSent = parseInt(summary.total_sent || 0);
      const totalOpened = parseInt(summary.total_opened || 0);
      const totalClicked = parseInt(summary.total_clicked || 0);

      const campaigns = result.rows.map((row: any) => {
        const sent = parseInt(row.sent_count || 0);
        const opened = parseInt(row.opened_count || 0);
        const clicked = parseInt(row.clicked_count || 0);
        
        return {
          id: row.id,
          name: row.name,
          type: row.type,
          status: row.status,
          subject: row.subject,
          preview_text: row.preview_text || "—",
          sender: {
            name: row.sender_name,
            email: row.sender_email,
            reply_to: row.reply_to
          },
          schedule: {
            scheduled_at: row.scheduled_at,
            sent_at: row.sent_at
          },
          targeting: {
            segments: row.segments || [],
            tags_include: row.tags_include || [],
            tags_exclude: row.tags_exclude || []
          },
          stats: {
            recipients: parseInt(row.recipient_count || 0),
            sent: sent,
            delivered: parseInt(row.delivered_count || 0),
            opened: opened,
            clicked: clicked,
            bounced: parseInt(row.bounced_count || 0),
            unsubscribed: parseInt(row.unsubscribed_count || 0),
            open_rate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
            click_rate: opened > 0 ? Math.round((clicked / opened) * 100) : 0
          },
          created_at: row.created_at
        };
      });

      return {
        summary: {
          total_campaigns: parseInt(summary.total_count),
          by_status: {
            draft: parseInt(summary.draft_count),
            scheduled: parseInt(summary.scheduled_count),
            sending: parseInt(summary.sending_count),
            sent: parseInt(summary.sent_count),
            paused: parseInt(summary.paused_count)
          },
          overall_stats: {
            total_emails_sent: totalSent,
            total_opens: totalOpened,
            total_clicks: totalClicked,
            avg_open_rate: totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0,
            avg_click_rate: totalOpened > 0 ? Math.round((totalClicked / totalOpened) * 100) : 0
          },
          returned: campaigns.length
        },
        filters: {
          status: args.status || "any",
          type: args.type || "any",
          search: args.search || "none"
        },
        campaigns: campaigns
      };
    } catch (error: any) {
      console.error("❌ Campaigns list error:", error);
      throw new Error(`Failed to list campaigns: ${error.message}`);
    }
  }
};

registerTool(def);
export default def;

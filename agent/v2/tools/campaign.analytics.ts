/**
 * Email Campaign Analytics Tool
 * Tier 1: Low-risk read-only tool
 * 
 * Get detailed analytics for email campaigns
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
  campaignId: z.string().optional().describe("Get analytics for a specific campaign ID"),
  period: z.enum(["7d", "30d", "90d", "all"]).default("30d").optional().describe("Time period for analytics"),
  metric: z.enum(["opens", "clicks", "bounces", "unsubscribes", "all"]).default("all").optional().describe("Specific metric to analyze")
});

const def: ToolDef<typeof params> = {
  name: "campaign_analytics",
  description: `Get detailed email campaign analytics and performance metrics.
  
Use this to answer questions like:
- "What's our email open rate?"
- "How are our campaigns performing?"
- "Show me click-through rates"
- "Which campaign had the best engagement?"
- "What's our bounce rate this month?"
- "How many people unsubscribed?"

Returns: Comprehensive email marketing analytics`,
  parameters: params,
  authz: ["EMAIL_READ"],
  risk: "low",
  handler: async (ctx: ToolContext, args: z.infer<typeof params>) => {
    try {
      let dateFilter = "";
      if (args.period !== "all") {
        const days = args.period === "7d" ? 7 : args.period === "90d" ? 90 : 30;
        dateFilter = `AND sent_at >= NOW() - INTERVAL '${days} days'`;
      }

      let query: string;
      let queryParams: any[] = [];

      if (args.campaignId) {
        query = `
          SELECT 
            id, name, subject, status, sent_at,
            recipient_count, sent_count, delivered_count,
            opened_count, clicked_count, bounced_count, unsubscribed_count
          FROM email_campaigns
          WHERE id = $1
        `;
        queryParams = [args.campaignId];
      } else {
        query = `
          SELECT 
            COUNT(*) as total_campaigns,
            COUNT(*) FILTER (WHERE status = 'sent') as sent_campaigns,
            SUM(recipient_count) as total_recipients,
            SUM(sent_count) as total_sent,
            SUM(delivered_count) as total_delivered,
            SUM(opened_count) as total_opened,
            SUM(clicked_count) as total_clicked,
            SUM(bounced_count) as total_bounced,
            SUM(unsubscribed_count) as total_unsubscribed
          FROM email_campaigns
          WHERE status = 'sent' ${dateFilter}
        `;
      }

      const result = await pool.query(query, queryParams);

      if (args.campaignId) {
        if (result.rows.length === 0) {
          throw new Error(`Campaign ${args.campaignId} not found`);
        }
        const row = result.rows[0];
        const sent = parseInt(row.sent_count || 0);
        const delivered = parseInt(row.delivered_count || 0);
        const opened = parseInt(row.opened_count || 0);
        const clicked = parseInt(row.clicked_count || 0);
        const bounced = parseInt(row.bounced_count || 0);

        return {
          campaign: {
            id: row.id,
            name: row.name,
            subject: row.subject,
            status: row.status,
            sent_at: row.sent_at
          },
          metrics: {
            recipients: parseInt(row.recipient_count || 0),
            sent: sent,
            delivered: delivered,
            opened: opened,
            clicked: clicked,
            bounced: bounced,
            unsubscribed: parseInt(row.unsubscribed_count || 0)
          },
          rates: {
            delivery_rate: sent > 0 ? Math.round((delivered / sent) * 100) : 0,
            open_rate: delivered > 0 ? Math.round((opened / delivered) * 100) : 0,
            click_rate: opened > 0 ? Math.round((clicked / opened) * 100) : 0,
            click_to_open_rate: opened > 0 ? Math.round((clicked / opened) * 100) : 0,
            bounce_rate: sent > 0 ? Math.round((bounced / sent) * 100) : 0
          }
        };
      }

      const summary = result.rows[0];
      const totalSent = parseInt(summary.total_sent || 0);
      const totalDelivered = parseInt(summary.total_delivered || 0);
      const totalOpened = parseInt(summary.total_opened || 0);
      const totalClicked = parseInt(summary.total_clicked || 0);
      const totalBounced = parseInt(summary.total_bounced || 0);
      const totalUnsubscribed = parseInt(summary.total_unsubscribed || 0);

      // Get top performing campaigns
      const topQuery = `
        SELECT id, name, subject, sent_count, opened_count, clicked_count,
          CASE WHEN sent_count > 0 THEN (opened_count::float / sent_count * 100) ELSE 0 END as open_rate
        FROM email_campaigns
        WHERE status = 'sent' AND sent_count > 0 ${dateFilter}
        ORDER BY open_rate DESC
        LIMIT 5
      `;
      const topResult = await pool.query(topQuery);

      const topCampaigns = topResult.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        subject: row.subject,
        sent: parseInt(row.sent_count),
        opened: parseInt(row.opened_count),
        clicked: parseInt(row.clicked_count),
        open_rate: Math.round(parseFloat(row.open_rate))
      }));

      return {
        period: args.period,
        overview: {
          total_campaigns: parseInt(summary.total_campaigns),
          sent_campaigns: parseInt(summary.sent_campaigns),
          total_recipients: parseInt(summary.total_recipients || 0),
          total_emails_sent: totalSent
        },
        metrics: {
          sent: totalSent,
          delivered: totalDelivered,
          opened: totalOpened,
          clicked: totalClicked,
          bounced: totalBounced,
          unsubscribed: totalUnsubscribed
        },
        rates: {
          delivery_rate: totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0,
          open_rate: totalDelivered > 0 ? Math.round((totalOpened / totalDelivered) * 100) : 0,
          click_rate: totalOpened > 0 ? Math.round((totalClicked / totalOpened) * 100) : 0,
          bounce_rate: totalSent > 0 ? Math.round((totalBounced / totalSent) * 100) : 0,
          unsubscribe_rate: totalSent > 0 ? Math.round((totalUnsubscribed / totalSent) * 100) : 0
        },
        benchmarks: {
          industry_avg_open_rate: 21,
          industry_avg_click_rate: 2.5,
          your_open_rate_vs_industry: totalDelivered > 0 
            ? Math.round((totalOpened / totalDelivered) * 100) - 21 
            : 0
        },
        top_performing_campaigns: topCampaigns
      };
    } catch (error: any) {
      console.error("❌ Campaign analytics error:", error);
      throw new Error(`Failed to get campaign analytics: ${error.message}`);
    }
  }
};

registerTool(def);
export default def;

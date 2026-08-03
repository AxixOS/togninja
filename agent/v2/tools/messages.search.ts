/**
 * CRM Messages Search Tool
 * Tier 1: Low-risk read-only tool
 * 
 * Search and filter messages (emails, SMS, notes) from CRM
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
  messageType: z.enum(["email", "sms", "note", "any"]).default("any").optional().describe("Filter by message type"),
  status: z.enum(["unread", "read", "replied", "sent", "delivered", "failed", "any"]).default("any").optional().describe("Filter by message status"),
  direction: z.enum(["inbound", "outbound", "any"]).default("any").optional().describe("Filter by direction: inbound (received) or outbound (sent)"),
  clientId: z.string().optional().describe("Filter by specific client ID"),
  search: z.string().optional().describe("Search in subject, content, sender name or email"),
  startDate: z.string().optional().describe("Filter messages after this date (YYYY-MM-DD)"),
  endDate: z.string().optional().describe("Filter messages before this date (YYYY-MM-DD)"),
  unreadOnly: z.boolean().optional().describe("If true, only show unread messages"),
  limit: z.number().int().min(1).max(500).default(100).optional().describe("Maximum number of messages to return")
});

// Tool definition
const def: ToolDef<typeof params> = {
  name: "messages_search",
  description: `Search and filter messages (emails, SMS, notes) from the CRM system.
  
Use this to answer questions like:
- "Show me all unread messages"
- "List messages from client John Smith"
- "What emails did we send last week?"
- "Are there any failed SMS messages?"
- "Search for messages about 'booking'"
- "Show me all outbound emails from this month"
- "List all notes for client #123"
- "How many messages did we receive today?"

Returns: Filtered list of messages with detailed information`,
  parameters: params,
  authz: ["MSG_READ"],
  risk: "low",
  handler: async (ctx: ToolContext, args: z.infer<typeof params>) => {
    try {
      // Build WHERE clauses
      const whereClauses: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (args.messageType && args.messageType !== "any") {
        whereClauses.push(`m.message_type = $${paramIndex}`);
        queryParams.push(args.messageType);
        paramIndex++;
      }

      if (args.status && args.status !== "any") {
        whereClauses.push(`m.status = $${paramIndex}`);
        queryParams.push(args.status);
        paramIndex++;
      }

      if (args.direction && args.direction !== "any") {
        whereClauses.push(`m.direction = $${paramIndex}`);
        queryParams.push(args.direction);
        paramIndex++;
      }

      if (args.clientId) {
        whereClauses.push(`m.client_id = $${paramIndex}`);
        queryParams.push(args.clientId);
        paramIndex++;
      }

      if (args.search) {
        whereClauses.push(`(
          m.subject ILIKE $${paramIndex} OR 
          m.content ILIKE $${paramIndex} OR 
          m.sender_name ILIKE $${paramIndex} OR 
          m.sender_email ILIKE $${paramIndex}
        )`);
        queryParams.push(`%${args.search}%`);
        paramIndex++;
      }

      if (args.startDate) {
        whereClauses.push(`m.created_at >= $${paramIndex}::timestamp`);
        queryParams.push(args.startDate);
        paramIndex++;
      }

      if (args.endDate) {
        whereClauses.push(`m.created_at <= $${paramIndex}::timestamp + interval '1 day'`);
        queryParams.push(args.endDate);
        paramIndex++;
      }

      if (args.unreadOnly) {
        whereClauses.push(`m.status = 'unread'`);
      }

      const whereClause = whereClauses.length > 0 
        ? `WHERE ${whereClauses.join(' AND ')}` 
        : '';

      // Main query with client join
      const query = `
        SELECT 
          m.id,
          m.sender_name,
          m.sender_email,
          m.subject,
          m.content,
          m.message_type,
          m.status,
          m.direction,
          m.client_id,
          c.first_name || ' ' || c.last_name as client_name,
          c.email as client_email,
          m.phone_number,
          m.sms_status,
          m.campaign_id,
          m.attachments,
          m.sent_at,
          m.delivered_at,
          m.read_at,
          m.replied_at,
          m.created_at,
          m.updated_at
        FROM crm_messages m
        LEFT JOIN crm_clients c ON m.client_id = c.id
        ${whereClause}
        ORDER BY m.created_at DESC
        LIMIT $${paramIndex}
      `;

      queryParams.push(args.limit || 100);

      const result = await pool.query(query, queryParams);

      // Summary statistics
      const summaryQuery = `
        SELECT 
          COUNT(*) as total_count,
          COUNT(*) FILTER (WHERE status = 'unread') as unread_count,
          COUNT(*) FILTER (WHERE status = 'read') as read_count,
          COUNT(*) FILTER (WHERE status = 'replied') as replied_count,
          COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
          COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
          COUNT(*) FILTER (WHERE direction = 'inbound') as inbound_count,
          COUNT(*) FILTER (WHERE direction = 'outbound') as outbound_count,
          COUNT(*) FILTER (WHERE message_type = 'email') as email_count,
          COUNT(*) FILTER (WHERE message_type = 'sms') as sms_count,
          COUNT(*) FILTER (WHERE message_type = 'note') as note_count
        FROM crm_messages m
        ${whereClause}
      `;

      const summaryResult = await pool.query(summaryQuery, queryParams.slice(0, -1));
      const summary = summaryResult.rows[0];

      const messages = result.rows.map((row: any) => ({
        id: row.id,
        type: row.message_type,
        direction: row.direction,
        status: row.status,
        sender: {
          name: row.sender_name,
          email: row.sender_email
        },
        subject: row.subject,
        content: row.content.length > 500 ? row.content.substring(0, 500) + "..." : row.content,
        client: row.client_id ? {
          id: row.client_id,
          name: row.client_name || "Unknown",
          email: row.client_email || "—"
        } : null,
        sms_details: row.message_type === "sms" ? {
          phone: row.phone_number,
          sms_status: row.sms_status
        } : null,
        attachments: row.attachments || [],
        timestamps: {
          created: row.created_at,
          sent: row.sent_at,
          delivered: row.delivered_at,
          read: row.read_at,
          replied: row.replied_at
        },
        campaign_id: row.campaign_id || null
      }));

      return {
        summary: {
          total_messages: parseInt(summary.total_count),
          by_status: {
            unread: parseInt(summary.unread_count),
            read: parseInt(summary.read_count),
            replied: parseInt(summary.replied_count),
            sent: parseInt(summary.sent_count),
            failed: parseInt(summary.failed_count)
          },
          by_direction: {
            inbound: parseInt(summary.inbound_count),
            outbound: parseInt(summary.outbound_count)
          },
          by_type: {
            email: parseInt(summary.email_count),
            sms: parseInt(summary.sms_count),
            note: parseInt(summary.note_count)
          },
          returned: messages.length
        },
        filters: {
          type: args.messageType || "any",
          status: args.status || "any",
          direction: args.direction || "any",
          client_id: args.clientId || "any",
          search: args.search || "none",
          date_range: args.startDate || args.endDate 
            ? `${args.startDate || 'beginning'} to ${args.endDate || 'now'}` 
            : "all time",
          unread_only: args.unreadOnly || false
        },
        messages: messages
      };

    } catch (error: any) {
      console.error("❌ Messages search error:", error);
      throw new Error(`Failed to search messages: ${error.message}`);
    }
  }
};

// Register the tool
registerTool(def);

export default def;

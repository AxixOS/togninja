/**
 * Questionnaire Responses List Tool
 * Tier 1: Low-risk read-only tool
 * 
 * List questionnaire/form responses
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
  questionnaireSlug: z.string().optional().describe("Filter by questionnaire slug (e.g., 'pre-wedding', 'post-session')"),
  questionnaireId: z.number().optional().describe("Filter by questionnaire ID"),
  startDate: z.string().optional().describe("Filter responses submitted after this date (YYYY-MM-DD)"),
  endDate: z.string().optional().describe("Filter responses submitted before this date (YYYY-MM-DD)"),
  limit: z.number().int().min(1).max(500).default(100).optional().describe("Maximum number of responses to return")
});

const def: ToolDef<typeof params> = {
  name: "questionnaire_responses_list",
  description: `List questionnaire and form responses from clients.
  
Use this to answer questions like:
- "Show me pre-wedding questionnaire responses"
- "What feedback did clients submit?"
- "List all form responses from this month"
- "How many questionnaires were completed?"

Returns: List of questionnaire responses with data`,
  parameters: params,
  authz: ["QUESTIONNAIRE_READ"],
  risk: "low",
  handler: async (ctx: ToolContext, args: z.infer<typeof params>) => {
    try {
      const whereClauses: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (args.questionnaireSlug) {
        whereClauses.push(`r.slug = $${paramIndex}`);
        queryParams.push(args.questionnaireSlug);
        paramIndex++;
      }

      if (args.questionnaireId) {
        whereClauses.push(`r.questionnaire_id = $${paramIndex}`);
        queryParams.push(args.questionnaireId);
        paramIndex++;
      }

      if (args.startDate) {
        whereClauses.push(`r.submitted_at >= $${paramIndex}::timestamp`);
        queryParams.push(args.startDate);
        paramIndex++;
      }

      if (args.endDate) {
        whereClauses.push(`r.submitted_at <= $${paramIndex}::timestamp + interval '1 day'`);
        queryParams.push(args.endDate);
        paramIndex++;
      }

      const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const query = `
        SELECT 
          r.id, r.questionnaire_id, r.slug, r.responses, r.submitted_at,
          q.title as questionnaire_title, q.description as questionnaire_description
        FROM questionnaire_responses r
        LEFT JOIN questionnaires q ON r.questionnaire_id = q.id
        ${whereClause}
        ORDER BY r.submitted_at DESC
        LIMIT $${paramIndex}
      `;
      queryParams.push(args.limit || 100);

      const result = await pool.query(query, queryParams);

      const summaryQuery = `
        SELECT 
          COUNT(*) as total_count,
          COUNT(DISTINCT r.questionnaire_id) as questionnaire_count,
          COUNT(DISTINCT r.slug) as slug_count
        FROM questionnaire_responses r
        ${whereClause}
      `;
      const summaryResult = await pool.query(summaryQuery, queryParams.slice(0, -1));
      const summary = summaryResult.rows[0];

      // Get breakdown by questionnaire
      const breakdownQuery = `
        SELECT 
          r.slug,
          q.title,
          COUNT(*) as response_count
        FROM questionnaire_responses r
        LEFT JOIN questionnaires q ON r.questionnaire_id = q.id
        ${whereClause}
        GROUP BY r.slug, q.title
        ORDER BY response_count DESC
      `;
      const breakdownResult = await pool.query(breakdownQuery, queryParams.slice(0, -1));
      const byQuestionnaire = breakdownResult.rows.reduce((acc: any, row: any) => {
        acc[row.slug] = {
          title: row.title || row.slug,
          count: parseInt(row.response_count)
        };
        return acc;
      }, {});

      const responses = result.rows.map((row: any) => ({
        id: row.id,
        questionnaire: {
          id: row.questionnaire_id,
          slug: row.slug,
          title: row.questionnaire_title || row.slug,
          description: row.questionnaire_description || "—"
        },
        responses: row.responses,
        submitted_at: row.submitted_at
      }));

      return {
        summary: {
          total_responses: parseInt(summary.total_count),
          unique_questionnaires: parseInt(summary.questionnaire_count),
          unique_slugs: parseInt(summary.slug_count),
          returned: responses.length
        },
        by_questionnaire: byQuestionnaire,
        filters: {
          questionnaire_slug: args.questionnaireSlug || "any",
          questionnaire_id: args.questionnaireId || "any",
          date_range: args.startDate || args.endDate 
            ? `${args.startDate || 'beginning'} to ${args.endDate || 'now'}` 
            : "all time"
        },
        responses: responses
      };
    } catch (error: any) {
      console.error("❌ Questionnaire responses list error:", error);
      throw new Error(`Failed to list questionnaire responses: ${error.message}`);
    }
  }
};

registerTool(def);
export default def;

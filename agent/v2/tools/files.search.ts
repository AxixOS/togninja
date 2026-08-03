/**
 * Files Search Tool
 * Tier 1: Low-risk read-only tool
 * 
 * Search digital files and assets
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
  search: z.string().optional().describe("Search in file name, description, or tags"),
  fileType: z.string().optional().describe("Filter by file type (e.g., 'image', 'pdf', 'video')"),
  folderName: z.string().optional().describe("Filter by folder name"),
  clientId: z.string().optional().describe("Filter files for a specific client"),
  sessionId: z.string().optional().describe("Filter files for a specific session"),
  isPublic: z.boolean().optional().describe("Filter by public visibility"),
  limit: z.number().int().min(1).max(500).default(100).optional().describe("Maximum number of files to return")
});

const def: ToolDef<typeof params> = {
  name: "files_search",
  description: `Search and filter digital files and assets.
  
Use this to answer questions like:
- "Find files for client Smith"
- "Show me all PDF documents"
- "List images from session X"
- "Search for files tagged 'wedding'"
- "What files are in the contracts folder?"

Returns: List of digital files with metadata`,
  parameters: params,
  authz: ["FILES_READ"],
  risk: "low",
  handler: async (ctx: ToolContext, args: z.infer<typeof params>) => {
    try {
      const whereClauses: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (args.search) {
        whereClauses.push(`(file_name ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR tags ILIKE $${paramIndex})`);
        queryParams.push(`%${args.search}%`);
        paramIndex++;
      }

      if (args.fileType) {
        whereClauses.push(`file_type ILIKE $${paramIndex}`);
        queryParams.push(`%${args.fileType}%`);
        paramIndex++;
      }

      if (args.folderName) {
        whereClauses.push(`folder_name ILIKE $${paramIndex}`);
        queryParams.push(`%${args.folderName}%`);
        paramIndex++;
      }

      if (args.clientId) {
        whereClauses.push(`client_id = $${paramIndex}`);
        queryParams.push(args.clientId);
        paramIndex++;
      }

      if (args.sessionId) {
        whereClauses.push(`session_id = $${paramIndex}`);
        queryParams.push(args.sessionId);
        paramIndex++;
      }

      if (args.isPublic !== undefined) {
        whereClauses.push(`is_public = $${paramIndex}`);
        queryParams.push(args.isPublic);
        paramIndex++;
      }

      const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const query = `
        SELECT 
          id, folder_name, file_name, file_type, file_size,
          client_id, session_id, description, tags, is_public,
          uploaded_at, created_at
        FROM digital_files
        ${whereClause}
        ORDER BY uploaded_at DESC
        LIMIT $${paramIndex}
      `;
      queryParams.push(args.limit || 100);

      const result = await pool.query(query, queryParams);

      const summaryQuery = `
        SELECT 
          COUNT(*) as total_count,
          COUNT(DISTINCT folder_name) as folder_count,
          COUNT(DISTINCT client_id) FILTER (WHERE client_id IS NOT NULL) as client_count,
          COUNT(DISTINCT session_id) FILTER (WHERE session_id IS NOT NULL) as session_count,
          SUM(file_size) as total_size,
          COUNT(*) FILTER (WHERE is_public = true) as public_count
        FROM digital_files
        ${whereClause}
      `;
      const summaryResult = await pool.query(summaryQuery, queryParams.slice(0, -1));
      const summary = summaryResult.rows[0];

      // Get file type breakdown
      const typeQuery = `
        SELECT 
          file_type,
          COUNT(*) as count,
          SUM(file_size) as total_size
        FROM digital_files
        ${whereClause}
        GROUP BY file_type
        ORDER BY count DESC
        LIMIT 10
      `;
      const typeResult = await pool.query(typeQuery, queryParams.slice(0, -1));
      const fileTypes = typeResult.rows.reduce((acc: any, row: any) => {
        acc[row.file_type] = {
          count: parseInt(row.count),
          size_bytes: parseInt(row.total_size || 0)
        };
        return acc;
      }, {});

      const files = result.rows.map((row: any) => ({
        id: row.id,
        file_name: row.file_name,
        file_type: row.file_type,
        file_size: row.file_size,
        file_size_formatted: formatFileSize(row.file_size),
        folder_name: row.folder_name || "Root",
        client_id: row.client_id,
        session_id: row.session_id,
        description: row.description || "—",
        tags: row.tags ? JSON.parse(row.tags) : [],
        is_public: row.is_public,
        uploaded_at: row.uploaded_at
      }));

      const totalSize = parseInt(summary.total_size || 0);

      return {
        summary: {
          total_files: parseInt(summary.total_count),
          folder_count: parseInt(summary.folder_count),
          client_linked: parseInt(summary.client_count),
          session_linked: parseInt(summary.session_count),
          public_files: parseInt(summary.public_count),
          total_size_bytes: totalSize,
          total_size_formatted: formatFileSize(totalSize),
          returned: files.length
        },
        file_types: fileTypes,
        filters: {
          search: args.search || "none",
          file_type: args.fileType || "any",
          folder_name: args.folderName || "any",
          client_id: args.clientId || "any",
          session_id: args.sessionId || "any",
          is_public: args.isPublic !== undefined ? args.isPublic : "any"
        },
        files: files
      };
    } catch (error: any) {
      console.error("❌ Files search error:", error);
      throw new Error(`Failed to search files: ${error.message}`);
    }
  }
};

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

registerTool(def);
export default def;

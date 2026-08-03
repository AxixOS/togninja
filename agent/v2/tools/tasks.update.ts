/**
 * Tasks Update Tool
 * Tier 2: Medium-risk write tool
 * 
 * Update the status of session tasks
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
  taskId: z.string().describe("The ID of the task to update"),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional().describe("New status for the task"),
  assignedTo: z.string().optional().describe("Assign the task to someone"),
  notes: z.string().optional().describe("Add or update task description/notes")
});

const def: ToolDef<typeof params> = {
  name: "tasks_update",
  description: `Update a session task's status, assignment, or notes.
  
Use this to:
- Mark tasks as completed
- Assign tasks to team members
- Update task status to in_progress
- Add notes to tasks

Example usage:
- "Mark task X as completed"
- "Assign the editing task to John"
- "Update task status to in progress"

Returns: Updated task details`,
  parameters: params,
  authz: ["SESSION_WRITE"],
  risk: "medium",
  handler: async (ctx: ToolContext, args: z.infer<typeof params>) => {
    try {
      // First, verify the task exists
      const checkQuery = `SELECT * FROM session_tasks WHERE id = $1`;
      const checkResult = await pool.query(checkQuery, [args.taskId]);

      if (checkResult.rows.length === 0) {
        throw new Error(`Task ${args.taskId} not found`);
      }

      const existingTask = checkResult.rows[0];

      // Build update query
      const updates: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (args.status) {
        updates.push(`status = $${paramIndex}`);
        queryParams.push(args.status);
        paramIndex++;

        // If marking as completed, set completed_at
        if (args.status === 'completed') {
          updates.push(`completed_at = NOW()`);
        }
      }

      if (args.assignedTo !== undefined) {
        updates.push(`assigned_to = $${paramIndex}`);
        queryParams.push(args.assignedTo);
        paramIndex++;
      }

      if (args.notes !== undefined) {
        updates.push(`description = $${paramIndex}`);
        queryParams.push(args.notes);
        paramIndex++;
      }

      if (updates.length === 0) {
        return {
          success: false,
          message: "No updates provided. Specify status, assignedTo, or notes to update.",
          task: existingTask
        };
      }

      queryParams.push(args.taskId);
      const updateQuery = `
        UPDATE session_tasks
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await pool.query(updateQuery, queryParams);
      const updatedTask = result.rows[0];

      // Get session info for context
      const sessionQuery = `
        SELECT title, client_name, start_time 
        FROM photography_sessions 
        WHERE id = $1
      `;
      const sessionResult = await pool.query(sessionQuery, [updatedTask.session_id]);
      const session = sessionResult.rows[0];

      return {
        success: true,
        message: `Task "${updatedTask.title}" updated successfully`,
        changes: {
          status: args.status ? { from: existingTask.status, to: args.status } : null,
          assigned_to: args.assignedTo !== undefined 
            ? { from: existingTask.assigned_to, to: args.assignedTo } 
            : null,
          notes: args.notes !== undefined ? "Updated" : null
        },
        task: {
          id: updatedTask.id,
          title: updatedTask.title,
          task_type: updatedTask.task_type,
          status: updatedTask.status,
          assigned_to: updatedTask.assigned_to || "Unassigned",
          description: updatedTask.description || "—",
          due_date: updatedTask.due_date,
          completed_at: updatedTask.completed_at,
          session: session ? {
            id: updatedTask.session_id,
            title: session.title,
            client_name: session.client_name,
            date: session.start_time
          } : null
        }
      };
    } catch (error: any) {
      console.error("❌ Tasks update error:", error);
      throw new Error(`Failed to update task: ${error.message}`);
    }
  }
};

registerTool(def);
export default def;

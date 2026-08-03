/**
 * CRM Leads List Tool
 * Tier 1: Low-risk read-only tool
 * 
 * Lists all leads with optional filtering
 */

import { z } from "zod";
import { registerTool } from "../core/ToolBus";
import { ToolDef, ToolContext } from "../core/Types";
import { db } from "../../../server/db";
import { crmLeads } from "../../../shared/schema";
import { eq, desc } from "drizzle-orm";

// Zod schema
const params = z.object({
  status: z.enum(["new", "contacted", "qualified", "converted", "lost"]).optional(),
  limit: z.number().int().min(1).max(100).default(20).optional()
});

// Tool definition
const def: ToolDef<typeof params> = {
  name: "crm_leads_list",
  description: "List all leads, optionally filtered by status. Returns lead records sorted by most recent first.",
  parameters: params,
  authz: ["CRM_READ"],
  risk: "low",
  handler: async (ctx: ToolContext, args: z.infer<typeof params>) => {
    const limit = args.limit || 20;
    
    // Build base query
    let queryBuilder = db
      .select()
      .from(crmLeads)
      .orderBy(desc(crmLeads.createdAt));
    
    // Filter by status if provided
    if (args.status) {
      queryBuilder = queryBuilder.where(eq(crmLeads.status, args.status));
    }
    
    const results = await queryBuilder.limit(limit);
    
    return {
      count: results.length,
      leads: results.map(lead => ({
        id: lead.id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        status: lead.status,
        source: lead.source,
        notes: lead.message,
        createdAt: lead.createdAt
      }))
    };
  }
};

registerTool(def);

export default def;

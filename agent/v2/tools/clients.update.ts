/**
 * Client Update Tool
 * Tier 2: Medium-risk safe write
 * 
 * Updates an existing client record
 * Requires confirmation in auto_safe mode
 */

import { z } from "zod";
import { registerTool } from "../core/ToolBus";
import { ToolDef, ToolContext } from "../core/Types";
import { db } from "../../../server/db";
import { crmClients } from "../../../shared/schema";
import { eq } from "drizzle-orm";

// Zod schema - all fields optional except clientId
const params = z.object({
  clientId: z.string().uuid("Valid client ID required"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["active", "inactive", "archived"]).optional(),
  __confirm: z.boolean().optional()
});

// Tool definition
const def: ToolDef<typeof params> = {
  name: "clients_update",
  description: "Update an existing client's information. Only provided fields will be updated, others remain unchanged.",
  parameters: params,
  authz: ["CRM_WRITE"],
  risk: "medium", // Modifying client data requires confirmation
  handler: async (ctx: ToolContext, args: z.infer<typeof params>) => {
    const { clientId, __confirm, ...updates } = args;
    
    // Check if client exists
    const [existingClient] = await db
      .select()
      .from(crmClients)
      .where(eq(crmClients.id, clientId))
      .limit(1);
    
    if (!existingClient) {
      throw new Error(`Client not found: ${clientId}`);
    }
    
    // In dry-run mode, just simulate
    if (ctx.dryRun) {
      return {
        success: true,
        simulated: true,
        message: `Client update simulated for ${existingClient.firstName} ${existingClient.lastName}`,
        updates
      };
    }
    
    // Perform update
    await db
      .update(crmClients)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(crmClients.id, clientId));
    
    // Get updated client
    const [updatedClient] = await db
      .select()
      .from(crmClients)
      .where(eq(crmClients.id, clientId));
    
    return {
      success: true,
      message: `Client updated successfully: ${updatedClient.firstName} ${updatedClient.lastName}`,
      clientId,
      updatedFields: Object.keys(updates),
      client: {
        id: updatedClient.id,
        name: `${updatedClient.firstName} ${updatedClient.lastName}`,
        email: updatedClient.email,
        phone: updatedClient.phone,
        status: updatedClient.status
      }
    };
  }
};

registerTool(def);

export default def;

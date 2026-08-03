/**
 * Calendar Create Appointment Tool
 * Tier 2: Medium-risk safe write
 * 
 * Creates a new photography session/appointment
 * Requires confirmation in auto_safe mode
 */

import { z } from "zod";
import { registerTool } from "../core/ToolBus";
import { ToolDef, ToolContext } from "../core/Types";
import { db } from "../../../server/db";
import { photographySessions } from "../../../shared/schema";
import { randomUUID } from "crypto";

// Zod schema
const params = z.object({
  clientId: z.string().uuid("Valid client ID required"),
  sessionType: z.enum(["portrait", "wedding", "event", "family", "commercial", "other"]),
  sessionDate: z.string().refine(
    (date) => !isNaN(Date.parse(date)),
    "Valid date required (ISO format)"
  ),
  duration: z.number().int().min(30).max(480).default(120).optional(), // minutes
  location: z.string().optional(),
  notes: z.string().optional(),
  price: z.number().min(0).optional(),
  __confirm: z.boolean().optional()
});

// Tool definition
const def: ToolDef<typeof params> = {
  name: "calendar_create_appointment",
  description: "Create a new photography session/appointment on the calendar. Books a time slot for a client.",
  parameters: params,
  authz: ["CALENDAR_WRITE"],
  risk: "medium", // Requires confirmation - booking affects schedule
  handler: async (ctx: ToolContext, args: z.infer<typeof params>) => {
    // Parse the date
    const sessionDate = new Date(args.sessionDate);
    
    // Validate date is in the future
    if (sessionDate < new Date()) {
      throw new Error("Cannot create appointments in the past");
    }
    
    // In dry-run mode, just simulate
    if (ctx.dryRun) {
      return {
        success: true,
        simulated: true,
        message: `Appointment created (simulated) for ${sessionDate.toLocaleDateString()}`,
        sessionId: "sess_simulated_" + randomUUID()
      };
    }
    
    // Calculate end time
    const durationMinutes = args.duration || 120;
    const endDate = new Date(sessionDate.getTime() + durationMinutes * 60000);
    
    // Create session
    const sessionId = randomUUID();
    
    await db.insert(photographySessions).values({
      id: sessionId,
      clientId: args.clientId,
      sessionType: args.sessionType,
      title: `${args.sessionType} session`,
      startTime: sessionDate,
      endTime: endDate,
      locationName: args.location || null,
      status: "scheduled",
      notes: args.notes || null,
      basePrice: args.price ? args.price.toString() : null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return {
      success: true,
      sessionId,
      message: `Appointment created successfully for ${sessionDate.toLocaleDateString()} at ${sessionDate.toLocaleTimeString()}`,
      details: {
        type: args.sessionType,
        date: sessionDate.toISOString(),
        duration: durationMinutes,
        location: args.location
      }
    };
  }
};

registerTool(def);

export default def;

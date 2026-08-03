"use strict";
/**
 * Calendar Create Appointment Tool
 * Tier 2: Medium-risk safe write
 *
 * Creates a new photography session/appointment
 * Requires confirmation in auto_safe mode
 */
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const ToolBus_1 = require("../core/ToolBus");
const db_1 = require("../../../server/db");
const schema_1 = require("../../../shared/schema");
const crypto_1 = require("crypto");
// Zod schema
const params = zod_1.z.object({
    clientId: zod_1.z.string().uuid("Valid client ID required"),
    sessionType: zod_1.z.enum(["portrait", "wedding", "event", "family", "commercial", "other"]),
    sessionDate: zod_1.z.string().refine((date) => !isNaN(Date.parse(date)), "Valid date required (ISO format)"),
    duration: zod_1.z.number().int().min(30).max(480).default(120).optional(), // minutes
    location: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
    price: zod_1.z.number().min(0).optional(),
    __confirm: zod_1.z.boolean().optional()
});
// Tool definition
const def = {
    name: "calendar_create_appointment",
    description: "Create a new photography session/appointment on the calendar. Books a time slot for a client.",
    parameters: params,
    authz: ["CALENDAR_WRITE"],
    risk: "medium", // Requires confirmation - booking affects schedule
    handler: async (ctx, args) => {
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
                sessionId: "sess_simulated_" + (0, crypto_1.randomUUID)()
            };
        }
        // Calculate end time
        const durationMinutes = args.duration || 120;
        const endDate = new Date(sessionDate.getTime() + durationMinutes * 60000);
        // Create session
        const sessionId = (0, crypto_1.randomUUID)();
        await db_1.db.insert(schema_1.photographySessions).values({
            id: sessionId,
            clientId: args.clientId,
            sessionType: args.sessionType,
            sessionDate: sessionDate,
            startTime: sessionDate,
            endTime: endDate,
            location: args.location || null,
            status: "scheduled",
            notes: args.notes || null,
            price: args.price ? args.price.toString() : null,
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
(0, ToolBus_1.registerTool)(def);
exports.default = def;

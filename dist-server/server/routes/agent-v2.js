"use strict";
/**
 * Agent V2 Gateway - Modern ToolBus Architecture
 *
 * This route replaces the legacy agent system with:
 * - Zod-validated tools
 * - Scope-based authorization
 * - Mode enforcement (read_only/auto_safe/auto_full)
 * - Full audit logging
 * - Shadow mode support
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const crypto_1 = require("crypto");
const db_1 = require("../db");
const schema_1 = require("../../shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
const Types_1 = require("../../agent/v2/core/Types");
const ToolBus_1 = require("../../agent/v2/core/ToolBus");
const Guardrails_1 = require("../../agent/v2/core/Guardrails");
const openai_1 = __importDefault(require("openai"));
// Import tools to register them with ToolBus
require("../../agent/v2/tools/index");
const router = express_1.default.Router();
// OpenAI client
const openai = process.env.OPENAI_API_KEY
    ? new openai_1.default({ apiKey: process.env.OPENAI_API_KEY })
    : null;
/**
 * POST /api/agent/v2/chat
 * Main chat endpoint
 *
 * Body:
 * - message: string
 * - sessionId?: string (creates new if not provided)
 * - mode?: "read_only" | "auto_safe" | "auto_full"
 */
router.post("/chat", async (req, res) => {
    try {
        const { message, sessionId, mode } = req.body;
        // Validate input
        if (!message || typeof message !== "string") {
            return res.status(400).json({ error: "Message is required" });
        }
        // Get user context from JWT
        const userId = req.user?.id || "demo_user";
        const studioId = req.user?.studioId || "demo_studio";
        const userRole = req.user?.role || "photographer";
        // Determine scopes (in production, load from database based on user role)
        const scopes = getUserScopes(userRole);
        // Determine execution mode
        const executionMode = mode || (0, Guardrails_1.getRecommendedMode)(userRole);
        // Create or load session
        let currentSessionId = sessionId;
        if (!currentSessionId) {
            currentSessionId = `sess_${(0, crypto_1.randomUUID)()}`;
            await db_1.db.insert(schema_1.agentSession).values({
                id: currentSessionId,
                studioId,
                userId,
                mode: executionMode,
                scopes,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }
        // Save user message
        await db_1.db.insert(schema_1.agentMessage).values({
            sessionId: currentSessionId,
            role: "user",
            content: message,
            createdAt: new Date()
        });
        // Build tool context
        const ctx = {
            studioId,
            userId,
            sessionId: currentSessionId,
            scopes,
            mode: executionMode,
            dryRun: process.env.AGENT_V2_SHADOW === "true"
        };
        // Get available tools for this user
        const availableTools = (0, ToolBus_1.listOpenAITools)(scopes);
        if (!openai) {
            return res.status(500).json({ error: "OpenAI API key not configured" });
        }
        // Call OpenAI with function calling
        const completion = await openai.chat.completions.create({
            model: process.env.AGENT_MODEL || "gpt-4-turbo-preview",
            messages: [
                {
                    role: "system",
                    content: getSystemPrompt(executionMode)
                },
                {
                    role: "user",
                    content: message
                }
            ],
            tools: availableTools.length > 0 ? availableTools : undefined,
            tool_choice: availableTools.length > 0 ? "auto" : undefined
        });
        const choice = completion.choices[0];
        const assistantMessage = choice.message;
        // Handle tool calls
        if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
            const toolResults = [];
            for (const toolCall of assistantMessage.tool_calls) {
                // Handle both standard and custom tool calls
                const toolName = toolCall.function?.name || toolCall.type;
                const toolArgs = JSON.parse(toolCall.function?.arguments || "{}");
                try {
                    const result = await (0, ToolBus_1.executeTool)(ctx, toolName, toolArgs);
                    toolResults.push({
                        tool: toolName,
                        args: toolArgs,
                        result: result.data,
                        ok: result.ok,
                        error: result.error
                    });
                    // If confirmation required, return to user immediately
                    if (!result.ok && result.error?.includes("CONFIRM_REQUIRED")) {
                        return res.json({
                            sessionId: currentSessionId,
                            confirmRequired: true,
                            tool: toolName,
                            args: toolArgs,
                            message: `This action requires your confirmation: ${toolName}`
                        });
                    }
                }
                catch (error) {
                    // Handle authorization errors
                    if (error instanceof Types_1.AuthzError) {
                        return res.status(403).json({
                            error: "Forbidden",
                            message: error.message,
                            requiredScopes: error.requiredScopes,
                            userScopes: error.userScopes
                        });
                    }
                    // Handle confirmation required
                    if (error instanceof Types_1.ConfirmRequiredError) {
                        return res.json({
                            sessionId: currentSessionId,
                            confirmRequired: true,
                            tool: error.tool,
                            args: error.args,
                            reason: error.reason,
                            message: `Confirmation needed: ${error.reason}`
                        });
                    }
                    // Other errors
                    toolResults.push({
                        tool: toolName,
                        args: toolArgs,
                        ok: false,
                        error: error.message
                    });
                }
            }
            // Generate final response with tool results
            const finalResponse = await openai.chat.completions.create({
                model: process.env.AGENT_MODEL || "gpt-4-turbo-preview",
                messages: [
                    {
                        role: "system",
                        content: getSystemPrompt(executionMode)
                    },
                    {
                        role: "user",
                        content: message
                    },
                    assistantMessage,
                    {
                        role: "tool",
                        content: JSON.stringify(toolResults),
                        tool_call_id: assistantMessage.tool_calls[0].id
                    }
                ]
            });
            const finalMessage = finalResponse.choices[0].message.content || "I executed the requested actions.";
            // Save assistant message
            await db_1.db.insert(schema_1.agentMessage).values({
                sessionId: currentSessionId,
                role: "assistant",
                content: finalMessage,
                metadata: { toolResults },
                createdAt: new Date()
            });
            return res.json({
                sessionId: currentSessionId,
                message: finalMessage,
                toolCalls: toolResults,
                mode: executionMode
            });
        }
        else {
            // No tool calls - just return text response
            const responseText = assistantMessage.content || "I'm not sure how to help with that.";
            // Save assistant message
            await db_1.db.insert(schema_1.agentMessage).values({
                sessionId: currentSessionId,
                role: "assistant",
                content: responseText,
                createdAt: new Date()
            });
            return res.json({
                sessionId: currentSessionId,
                message: responseText,
                mode: executionMode
            });
        }
    }
    catch (error) {
        console.error("[Agent V2] Chat error:", error);
        return res.status(500).json({ error: error.message || "Internal server error" });
    }
});
/**
 * GET /api/agent/v2/session/:sessionId
 * Get session history
 */
router.get("/session/:sessionId", async (req, res) => {
    try {
        const { sessionId } = req.params;
        // Get session details
        const [session] = await db_1.db
            .select()
            .from(schema_1.agentSession)
            .where((0, drizzle_orm_1.eq)(schema_1.agentSession.id, sessionId));
        if (!session) {
            return res.status(404).json({ error: "Session not found" });
        }
        // Get messages
        const messages = await db_1.db
            .select()
            .from(schema_1.agentMessage)
            .where((0, drizzle_orm_1.eq)(schema_1.agentMessage.sessionId, sessionId))
            .orderBy(schema_1.agentMessage.createdAt);
        // Get audit log
        const auditLog = await db_1.db
            .select()
            .from(schema_1.agentAudit)
            .where((0, drizzle_orm_1.eq)(schema_1.agentAudit.sessionId, sessionId))
            .orderBy(schema_1.agentAudit.createdAt);
        return res.json({
            session,
            messages,
            auditLog: auditLog.map(log => ({
                tool: log.tool,
                args: JSON.parse(log.argsJson || "{}"),
                result: log.resultJson ? JSON.parse(log.resultJson) : null,
                ok: log.ok,
                error: log.error,
                duration: log.duration,
                simulated: log.simulated,
                timestamp: log.createdAt
            }))
        });
    }
    catch (error) {
        console.error("[Agent V2] Session fetch error:", error);
        return res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/agent/v2/stats
 * Get ToolBus statistics
 */
router.get("/stats", async (req, res) => {
    try {
        const stats = (0, ToolBus_1.getStats)();
        return res.json(stats);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
/**
 * Helper: Get user scopes based on role
 * In production, this should load from database
 */
function getUserScopes(role) {
    switch (role) {
        case "admin":
        case "owner":
            return ["CRM_READ", "CRM_WRITE", "INV_READ", "INV_WRITE", "EMAIL_SEND", "CALENDAR_WRITE", "PRICE_RESEARCH", "PRICE_WRITE", "ADMIN"];
        case "photographer":
        case "manager":
            return ["CRM_READ", "CRM_WRITE", "INV_READ", "INV_WRITE", "EMAIL_SEND", "CALENDAR_WRITE", "PRICE_RESEARCH", "PRICE_WRITE"];
        case "staff":
            return ["CRM_READ", "INV_READ", "CALENDAR_WRITE"];
        case "viewer":
        default:
            return ["CRM_READ", "INV_READ"];
    }
}
/**
 * Helper: Get system prompt based on mode
 */
function getSystemPrompt(mode) {
    // Calculate current date info for accurate date-relative queries
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
    // Calculate start of current week (Monday)
    const startOfWeek = new Date(now);
    const dayNum = now.getDay();
    const diff = dayNum === 0 ? -6 : 1 - dayNum; // Adjust for Monday start
    startOfWeek.setDate(now.getDate() + diff);
    const weekStart = startOfWeek.toISOString().split('T')[0];
    // Calculate start of current month
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const basePrompt = `You are an advanced AI assistant for a photography CRM system. You have 46 autonomous tools across multiple domains to help photographers manage their entire business.

**CURRENT DATE CONTEXT (CRITICAL):**
- Today's date: ${currentDate} (${dayOfWeek})
- Current week started: ${weekStart} (Monday)
- Current month started: ${monthStart}

When users ask about "this week", "this month", "today", "yesterday", etc., you MUST use these dates to calculate the correct date ranges for tool parameters:
- "this week" = startDate: ${weekStart}, endDate: ${currentDate}
- "this month" = startDate: ${monthStart}, endDate: ${currentDate}
- "today" = startDate: ${currentDate}, endDate: ${currentDate}

📋 CORE CRM CAPABILITIES:
   - Search and retrieve client/lead information
   - List and filter invoices by status, date, amount
   - Update client details and lead status
   - Track bookings and project stages
   - Create and manage calendar appointments
   - Send emails and invoices
   - Query appointments and messages
   - Manage galleries and voucher products
   - Track payments and pricing
   - Manage email campaigns and subscribers
   - Track photography sessions and tasks
   - Search digital files and questionnaires

🗓️ APPOINTMENTS & CALENDAR:
   • appointments_query: Query studio appointments
     - Filter by status: scheduled, confirmed, completed, cancelled, no_show
     - Filter by type: consultation, photoshoot, delivery, meeting
     - Filter by client, date range, upcoming only
     - Use when: "What appointments do I have this week?", "Show me upcoming photoshoots"
   • calendar_create: Create calendar events

📬 BOOKINGS:
   • bookings_pending_list: List pending online bookings
     - Filter by service type, date range
     - Returns contact details, service requested, preferred dates
     - Use when: "Show pending booking requests", "Any new bookings waiting?"

💬 MESSAGES & COMMUNICATIONS:
   • messages_search: Search emails, SMS, and notes
     - Filter by type: email, sms, note
     - Filter by direction: inbound, outbound
     - Filter by status: unread, read, replied, sent, delivered, failed
     - Search in subject, content, sender
     - Use when: "Show unread messages", "What emails did we send to client X?"

💰 INVOICES & PAYMENTS:
   • invoices_query: Query invoices with filters
   • invoices_list: List all invoices
   • invoices_summary: Get invoice statistics
   • invoices_create: Create new invoices
   • invoices_send: Send invoices to clients
   • invoices_mark_paid: Mark invoices as paid
   • invoice_items_query: Get line items for invoices
     - Filter by invoice ID/number, search descriptions
     - Use when: "What's on invoice #INV-2024-001?", "Show invoice line items"
   • payments_query: Query payment history
     - Filter by invoice, payment method, date range, amount
     - Methods: bank_transfer, cash, credit_card, paypal, stripe
     - Use when: "What payments came in this month?", "Show credit card payments"

🖼️ GALLERIES & MEDIA:
   • galleries_list: List photo galleries
     - Filter by client, public/private, password protected
     - Returns image counts and client info
     - Use when: "Show me all galleries", "List private galleries for client X"
   • gallery_images_count: Get image counts per gallery
     - Returns statistics on gallery sizes
     - Use when: "How many images in each gallery?", "Which gallery has most photos?"

🎁 VOUCHERS & PRODUCTS:
   • voucher_products_list: List voucher products for sale
     - Filter by category: familie, baby, hochzeit, business, event
     - Filter by active, featured status
     - Returns pricing, session details, availability
     - Use when: "What vouchers do we offer?", "Show family photo vouchers"
   • voucher_sales_query: Query voucher sales/purchases
     - Track redemptions, revenue, customer data

🏷️ COUPONS & DISCOUNTS:
   • coupons_list: List discount coupons
     - Filter by active, discount type (percentage/fixed_amount)
     - Show valid, expired, or exhausted coupons
     - Use when: "What coupons do we have?", "Show active discounts"

💵 PRICE LIST:
   • pricelist_query: Query price list items
     - Filter by category (PRINTS, LEINWAND, DIGITAL, etc.)
     - Search by name, description, SKU
     - Use when: "What are our print prices?", "Show canvas pricing"

📈 LEADS & SOURCES:
   • crm_leads_list: List all leads
   • leads_query: Query and filter leads
   • leads_conversion_report: Get conversion analytics
   • lead_sources_list: List lead sources with statistics
     - Shows lead counts per source
     - Conversion rates by source
     - Use when: "Where do leads come from?", "Which source converts best?"

👥 CLIENT ANALYTICS:
   • crm_clients_search: Search clients
   • clients_location_query: Geographic breakdown
   • clients_company_report: Company/business analysis
   • clients_update: Update client information
   • client_acquisition: Acquisition trends
   • top_clients: Top revenue clients

💰 PRICE LIST WIZARD (Autonomous Competitive Intelligence):
   • price_wizard_research: Discover competitors and scrape pricing
   • price_wizard_activate: Apply AI-recommended prices

📧 EMAIL CAMPAIGNS & MARKETING:
   • campaigns_list: List email campaigns
     - Filter by status: draft, scheduled, sending, sent, cancelled
     - Filter by type: newsletter, promotional, transactional, automated
     - Use when: "Show my email campaigns", "What newsletters are scheduled?"
   • templates_list: List email templates
     - Filter by category: welcome, invoice, reminder, marketing, notification, newsletter
     - Use when: "What email templates do we have?", "Show marketing templates"
   • campaign_analytics: Get detailed campaign statistics
     - Returns open rates, click rates, bounce rates, conversions
     - Use when: "How did the last campaign perform?", "Show email analytics"
   • subscribers_query: Query email subscribers
     - Filter by status: active, unsubscribed, bounced
     - Filter by engagement level
     - Use when: "How many active subscribers?", "Show unsubscribed contacts"
   • segments_list: List audience segments
     - Shows subscriber counts per segment
     - Use when: "What segments do we have?", "Show wedding client segments"

📸 SESSION MANAGEMENT:
   • session_details: Get comprehensive session details
     - Returns session info with tasks, equipment, communications
     - Use when: "Show details for session X", "What's planned for the Smith shoot?"
   • session_tasks_list: List session tasks
     - Filter by status: pending, in_progress, completed, cancelled
     - Filter by priority: low, medium, high, urgent
     - Filter by session, assignee
     - Use when: "What tasks are pending?", "Show urgent session tasks"
   • session_equipment_list: List equipment for sessions
     - Filter by session, equipment type
     - Use when: "What equipment is booked?", "Show gear for Saturday's shoot"
   • sessions_list_upcoming: List upcoming photography sessions
   • tasks_update: Update task status (MEDIUM RISK)
     - Update status, notes, completion time
     - Use when: "Mark task X as complete", "Update task notes"

📝 CONTENT & FILES:
   • blog_posts_list: List blog posts
     - Filter by status: draft, published, archived
     - Filter by featured, date range
     - Use when: "Show published blog posts", "What drafts do we have?"
   • files_search: Search digital files
     - Search by filename, file type, client
     - Types: photo, document, video, contract, receipt
     - Use when: "Find photos for client X", "Search for contracts"
   • questionnaire_responses_list: List questionnaire responses
     - Filter by questionnaire, client, completion status
     - Use when: "Show completed questionnaires", "What did client X answer?"

💼 REVENUE & ANALYTICS:
   • revenue_by_period: Revenue breakdown by time period

🔍 FALLBACK QUERY (Safety Net):
   • general_sql_query: Execute read-only SQL queries
     - ⚠️ USE SPARINGLY - Only when no specific tool exists
     - Read-only: SELECT queries only
     - Limited to approved CRM tables
     - Use when: Complex aggregations or joins not covered by other tools

📨 EMAIL & COMMUNICATIONS:
   • email_draft: Create email drafts
   • email_send: Send emails (HIGH RISK)

📊 TOOL SUMMARY (46 Total):
   
   LOW RISK Read Tools (37):
   - crm_clients_search, crm_leads_list, invoices_list, invoices_query, invoices_summary
   - voucher_sales_query, clients_location_query, clients_company_report
   - leads_query, leads_conversion_report, revenue_by_period
   - sessions_list_upcoming, client_acquisition, top_clients
   - appointments_query, messages_search, invoice_items_query, payments_query
   - galleries_list, voucher_products_list, coupons_list, pricelist_query, lead_sources_list
   - bookings_pending_list, campaigns_list, templates_list, campaign_analytics
   - subscribers_query, segments_list, session_tasks_list, session_equipment_list
   - session_details, blog_posts_list, files_search, questionnaire_responses_list
   - gallery_images_count, general_sql_query
   
   MEDIUM RISK (7 tools): 
   - clients_update, email_draft, calendar_create
   - invoices_create, price_wizard_research, price_wizard_activate
   - tasks_update
   
   HIGH RISK (3 tools): 
   - email_send, invoices_send, invoices_mark_paid

🎯 INTERACTION GUIDELINES:
   - ALWAYS use tools to answer questions (don't say "I don't have access")
   - For automation requests, use Workflow Wizard, NOT external tools
   - For email marketing, use email_campaigns system, NOT Mailchimp
   - Be proactive: If you see manual work, suggest automation
   - Always confirm before high-risk actions
   - Use general_sql_query ONLY as last resort when no specific tool fits
   
DATA ACCESS CONTRACT (CRITICAL):
   - You DO have access to live CRM data via tools. For any question about:
     • appointments, calendar events, schedules, online bookings
     • messages, emails, SMS, notes, communications
     • invoices, payments, invoice items, revenue
     • galleries, vouchers, products, coupons, prices
     • lead sources, leads, conversions
     • clients, leads, bookings, sessions
     • email campaigns, templates, subscribers, segments
     • session tasks, equipment, photography sessions
     • blog posts, digital files, questionnaires
   - You MUST call the appropriate tools before answering.
   - You MUST NOT answer with phrases like:
       "I can't directly access real-time data",
       "I don't have access to your CRM"
   - If a tool returns an error, explain the error and propose next steps.
   - If no specific tool fits, use general_sql_query for complex read queries.

Always be professional, concise, and helpful. Use tools when appropriate to answer user questions.`;
    if (mode === "read_only") {
        return basePrompt + "\n\n⚠️ IMPORTANT: You are in READ-ONLY mode. You can only read data, not modify anything.";
    }
    if (mode === "auto_safe") {
        return basePrompt + "\n\n✅ IMPORTANT: You are in SAFE mode. You can read data and execute low/medium risk actions. High-risk actions (send_email, send_invoice, delete_calendar_event) will require user confirmation.";
    }
    return basePrompt + "\n\n🚀 IMPORTANT: You are in FULL mode. You can execute all actions autonomously, including high-risk operations.";
}
exports.default = router;

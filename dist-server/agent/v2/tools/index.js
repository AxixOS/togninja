"use strict";
/**
 * Tool Registry Loader
 *
 * This file imports all tools to register them with ToolBus
 * Import this file early in the application startup
 */
Object.defineProperty(exports, "__esModule", { value: true });
// Tier 1: Read-only tools (low risk)
require("./crm.clients.search");
require("./crm.leads.list");
require("./invoices.list");
require("./voucher_sales.query");
require("./clients.location.query");
require("./clients.company.report");
require("./leads.query");
require("./leads.conversion.report");
require("./invoices.query");
require("./invoices.summary");
require("./revenue.by.period");
require("./sessions.list.upcoming");
require("./client.acquisition");
require("./top.clients");
// Priority 1: Essential read tools
require("./appointments.query");
require("./messages.search");
require("./invoice.items.query");
require("./payments.query");
require("./galleries.list");
require("./voucher.products.list");
require("./coupons.list");
require("./pricelist.query");
require("./lead.sources.list");
require("./bookings.pending.list");
// Marketing & Email Campaign tools
require("./campaigns.list");
require("./templates.list");
require("./campaign.analytics");
require("./subscribers.query");
require("./segments.list");
// Session Management tools
require("./session.tasks.list");
require("./session.equipment.list");
require("./session.details");
// Content & Files tools
require("./blog.posts.list");
require("./files.search");
require("./questionnaire.responses.list");
require("./gallery.images.count");
// Fallback Query tool (read-only safety net)
require("./general.sql.query");
// Tier 2: Safe writes (medium risk) - Require confirmation in auto_safe mode
require("./email.draft");
require("./calendar.create");
require("./clients.update");
require("./tasks.update");
require("./invoices.create");
require("./price.wizard.research");
require("./price.wizard.activate");
// Workflow wizard tools disabled until workflow tables added to shared/schema
// import "./workflow.wizard.create";
// import "./workflow.wizard.activate";
// Tier 3: High-impact writes (high risk) - ALWAYS require confirmation
require("./email.send");
require("./invoices.send");
require("./invoices.mark_paid");
console.log("[ToolBus] All tools registered successfully");

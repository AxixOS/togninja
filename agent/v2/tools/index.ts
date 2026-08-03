/**
 * Tool Registry Loader
 * 
 * This file imports all tools to register them with ToolBus
 * Import this file early in the application startup
 */

// Tier 1: Read-only tools (low risk)
import "./crm.clients.search";
import "./crm.leads.list";
import "./invoices.list";
import "./voucher_sales.query";
import "./clients.location.query";
import "./clients.company.report";
import "./leads.query";
import "./leads.conversion.report";
import "./invoices.query";
import "./invoices.summary";
import "./revenue.by.period";
import "./sessions.list.upcoming";
import "./client.acquisition";
import "./top.clients";

// Priority 1: Essential read tools
import "./appointments.query";
import "./messages.search";
import "./invoice.items.query";
import "./payments.query";
import "./galleries.list";
import "./voucher.products.list";
import "./coupons.list";
import "./pricelist.query";
import "./lead.sources.list";
import "./bookings.pending.list";

// Marketing & Email Campaign tools
import "./campaigns.list";
import "./templates.list";
import "./campaign.analytics";
import "./subscribers.query";
import "./segments.list";

// Session Management tools
import "./session.tasks.list";
import "./session.equipment.list";
import "./session.details";

// Content & Files tools
import "./blog.posts.list";
import "./files.search";
import "./questionnaire.responses.list";
import "./gallery.images.count";

// Fallback Query tool (read-only safety net)
import "./general.sql.query";

// Tier 2: Safe writes (medium risk) - Require confirmation in auto_safe mode
import "./email.draft";
import "./calendar.create";
import "./clients.update";
import "./tasks.update";
import "./invoices.create";
import "./price.wizard.research";
import "./price.wizard.activate";
// Workflow wizard tools disabled until workflow tables added to shared/schema
// import "./workflow.wizard.create";
// import "./workflow.wizard.activate";

// Tier 3: High-impact writes (high risk) - ALWAYS require confirmation
import "./email.send";
import "./invoices.send";
import "./invoices.mark_paid";

console.log("[ToolBus] All tools registered successfully");

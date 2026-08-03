"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolRegistry = exports.ToolRegistry = void 0;
// Tool registration and management
const json_schema_1 = require("../util/json-schema");
class ToolRegistry {
    constructor() {
        this.tools = new Map();
    }
    register(tool) {
        this.tools.set(tool.name, tool);
    }
    get(name) {
        return this.tools.get(name);
    }
    list() {
        return Array.from(this.tools.values());
    }
    keys() {
        return Array.from(this.tools.keys());
    }
    getOpenAITools() {
        return this.list().map(tool => (0, json_schema_1.createOpenAITool)(tool.name, tool.description, tool.parameters));
    }
}
exports.ToolRegistry = ToolRegistry;
exports.toolRegistry = new ToolRegistry();
// Import required tools - commenting out missing files
// import { emailSendTool } from "../tools/email-send"; // TODO: File missing
// import { draftEmailTool } from "../tools/draft-email"; // TODO: File missing
// import { emailAnalysisTool, monitorEmailsTool, autoReplyTool } from "../tools/email-monitoring"; // TODO: File missing
const website_scraper_1 = require("../tools/website-scraper");
const global_search_1 = require("../tools/global-search");
const find_entity_1 = require("../tools/find-entity");
const count_tools_1 = require("../tools/count-tools");
const create_stripe_checkout_1 = require("../tools/create-stripe-checkout");
const submit_prodigi_order_1 = require("../tools/submit-prodigi-order");
// import { galleryTools } from "../tools/gallery-management"; // Temporarily disabled due to import issues
const calendar_management_1 = require("../tools/calendar-management");
const file_management_1 = require("../tools/file-management");
const blog_management_1 = require("../tools/blog-management");
const email_campaign_management_1 = require("../tools/email-campaign-management");
const questionnaire_management_1 = require("../tools/questionnaire-management");
const reports_analytics_1 = require("../tools/reports-analytics");
const system_administration_1 = require("../tools/system-administration");
const integration_management_1 = require("../tools/integration-management");
const automation_management_1 = require("../tools/automation-management");
const customer_portal_management_1 = require("../tools/customer-portal-management");
// Register essential core tools only
// toolRegistry.register(emailSendTool); // TODO: File missing
// toolRegistry.register(draftEmailTool); // TODO: File missing
// Register email monitoring and intelligence tools
// toolRegistry.register({
//   name: emailAnalysisTool.name,
//   description: emailAnalysisTool.description,
//   parameters: emailAnalysisTool.parameters,
//   handler: async (params) => emailAnalysisTool.execute(params)
// });
// toolRegistry.register({
//   name: monitorEmailsTool.name,
//   description: monitorEmailsTool.description,
//   parameters: monitorEmailsTool.parameters,
//   handler: async (params) => monitorEmailsTool.execute(params)
// });
// toolRegistry.register({
//   name: autoReplyTool.name,
//   description: autoReplyTool.description,
//   parameters: autoReplyTool.parameters,
//   handler: async (params) => autoReplyTool.execute(params)
// });
// Register website analysis tool
exports.toolRegistry.register({
    name: website_scraper_1.websiteScraperTool.name,
    description: website_scraper_1.websiteScraperTool.description,
    parameters: website_scraper_1.websiteScraperTool.parameters,
    handler: async (params) => website_scraper_1.websiteScraperTool.execute(params)
});
exports.toolRegistry.register(global_search_1.globalSearchTool);
exports.toolRegistry.register(find_entity_1.findEntityTool);
exports.toolRegistry.register(count_tools_1.countInvoicesTool);
exports.toolRegistry.register(count_tools_1.countSessionsTool);
exports.toolRegistry.register(count_tools_1.countLeadsTool);
exports.toolRegistry.register(create_stripe_checkout_1.createGalleryCheckoutTool);
exports.toolRegistry.register(submit_prodigi_order_1.submitProdigiOrderTool);
// Register calendar management tools
calendar_management_1.calendarTools.forEach(tool => {
    exports.toolRegistry.register({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
        handler: async (params) => tool.execute(params)
    });
});
// Register file management tools
file_management_1.fileManagementTools.forEach(tool => {
    exports.toolRegistry.register({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
        handler: async (params) => tool.execute(params)
    });
});
// Register blog management tools
blog_management_1.blogManagementTools.forEach(tool => {
    exports.toolRegistry.register({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
        handler: async (params) => tool.execute(params)
    });
});
// Register email campaign management tools
email_campaign_management_1.emailCampaignTools.forEach(tool => {
    exports.toolRegistry.register({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
        handler: async (params) => tool.execute(params)
    });
});
// Register questionnaire management tools
questionnaire_management_1.questionnaireTools.forEach(tool => {
    exports.toolRegistry.register({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
        handler: async (params) => tool.execute(params)
    });
});
// Register reports & analytics tools
reports_analytics_1.reportsAnalyticsTools.forEach(tool => {
    exports.toolRegistry.register({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
        handler: async (params) => tool.execute(params)
    });
});
// Register system administration tools
system_administration_1.systemAdministrationTools.forEach(tool => {
    exports.toolRegistry.register({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
        handler: async (params) => tool.execute(params)
    });
});
// Register integration management tools
integration_management_1.integrationManagementTools.forEach(tool => {
    exports.toolRegistry.register({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
        handler: async (params) => tool.execute(params)
    });
});
// Register automation management tools
automation_management_1.automationManagementTools.forEach(tool => {
    exports.toolRegistry.register({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
        handler: async (params) => tool.execute(params)
    });
});
// Register customer portal management tools
customer_portal_management_1.customerPortalManagementTools.forEach(tool => {
    exports.toolRegistry.register({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
        handler: async (params) => tool.execute(params)
    });
});
// Add reply email tool for lead follow-up
const reply_email_1 = require("../tools/reply-email");
exports.toolRegistry.register(reply_email_1.replyEmailTool);
// Add invoice creation tool
const create_invoice_1 = require("../tools/create-invoice");
exports.toolRegistry.register(create_invoice_1.createInvoiceTool);
// Add planning and knowledge tools
const describe_capabilities_1 = require("../tools/describe-capabilities");
const kb_search_1 = require("../tools/kb-search");
exports.toolRegistry.register(describe_capabilities_1.describeCapabilitiesTool);
exports.toolRegistry.register(kb_search_1.kbSearchTool);
// Add voucher management tools
const voucher_management_1 = require("../tools/voucher-management");
exports.toolRegistry.register(voucher_management_1.createVoucherProductTool);
exports.toolRegistry.register(voucher_management_1.sellVoucherTool);
exports.toolRegistry.register(voucher_management_1.readVoucherSalesTool);
exports.toolRegistry.register(voucher_management_1.redeemVoucherTool);
// Add top clients tools
const top_clients_1 = require("../tools/top-clients");
exports.toolRegistry.register(top_clients_1.listTopClientsTool);
exports.toolRegistry.register(top_clients_1.getClientSegmentsTool);
// Add log interaction tool
// toolRegistry.register(logInteractionTool); // TODO: File missing
// Add user-friendly list leads tool
// toolRegistry.register(listLeadsTool); // TODO: File missing
// Add gallery management tools - temporarily disabled due to import issues
// galleryTools.forEach(tool => {
//   toolRegistry.register({
//     name: tool.name,
//     description: tool.description,
//     parameters: tool.parameters,
//     handler: async (params) => tool.execute(params)
//   });
// });
// Minimal tool set to stay under token limit
console.log(`📋 Registered ${exports.toolRegistry.list().length} tools for CRM agent`);
// Verify tool registration
exports.toolRegistry.list().forEach(tool => {
    console.log(`✅ Tool registered: ${tool.name}`);
});

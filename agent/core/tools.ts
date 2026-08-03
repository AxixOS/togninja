// Tool registration and management
import { createOpenAITool } from "../util/json-schema";
import { updateMemoryTool } from "../tools/update-memory";
// import { logInteractionTool } from "../tools/log-interaction"; // TODO: File missing
import { convertLeadTool } from "../tools/convert-lead";
import { reportLeadsTool } from "../tools/report-leads";

// Import manual tools
import { readCrmLeads, createCrmLeads, updateCrmLeads } from "../tools/crm_leads";
import { readCrmClients, createCrmClients, updateCrmClients } from "../tools/crm_clients";
import { readCrmInvoices, createCrmInvoices, updateCrmInvoices } from "../tools/crm_invoices";
import { readPhotographySessions, createPhotographySessions, updatePhotographySessions } from "../tools/photography_sessions";
import { readGalleries, createGalleries, updateGalleries } from "../tools/galleries";
import { readBlogPosts, createBlogPosts, updateBlogPosts } from "../tools/blog_posts";
import { readEmailCampaigns, createEmailCampaigns, updateEmailCampaigns } from "../tools/email_campaigns";
import { analyzeWebsiteTool, getWebsiteProfileTool, suggestSiteImprovementsTool } from "../tools/website-tools";

// Auto-generated CRUD tools for all CRM tables
import { 
  readCrmClients as readCrmClientsAuto, 
  createCrmClients as createCrmClientsAuto, 
  updateCrmClients as updateCrmClientsAuto 
} from "../tools/crm_clients-auto";
import { readCrmInvoiceItems, createCrmInvoiceItems, updateCrmInvoiceItems } from "../tools/crm_invoice_items-auto";
import { readCrmInvoicePayments, createCrmInvoicePayments, updateCrmInvoicePayments } from "../tools/crm_invoice_payments-auto";
import { 
  readCrmInvoices as readCrmInvoicesAuto, 
  createCrmInvoices as createCrmInvoicesAuto, 
  updateCrmInvoices as updateCrmInvoicesAuto 
} from "../tools/crm_invoices-auto";
import { 
  readCrmLeads as readCrmLeadsAuto, 
  createCrmLeads as createCrmLeadsAuto, 
  updateCrmLeads as updateCrmLeadsAuto 
} from "../tools/crm_leads-auto";
import { readCrmMessages, createCrmMessages, updateCrmMessages } from "../tools/crm_messages-auto";

// Enhanced lead tools with proper error handling
import { readCrmLeads as readCrmLeadsEnhanced } from "../tools/read-crm-leads";
import { findLeadTool } from "../tools/find-lead";
import { enumerateLeadsTool } from "../tools/enumerate-leads";
// import { listLeadsTool } from "../tools/list-leads"; // TODO: File missing

export interface AgentTool {
  name: string;
  description: string;
  parameters: any; // Zod schema
  handler: (args: any, ctx: any) => Promise<any>;
}

export class ToolRegistry {
  private tools: Map<string, AgentTool> = new Map();

  register(tool: AgentTool) {
    this.tools.set(tool.name, tool);
  }

  get(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  list(): AgentTool[] {
    return Array.from(this.tools.values());
  }

  keys(): string[] {
    return Array.from(this.tools.keys());
  }

  getOpenAITools() {
    return this.list().map(tool => createOpenAITool(tool.name, tool.description, tool.parameters));
  }
}

export const toolRegistry = new ToolRegistry();

// Import required tools - commenting out missing files
// import { emailSendTool } from "../tools/email-send"; // TODO: File missing
// import { draftEmailTool } from "../tools/draft-email"; // TODO: File missing
// import { emailAnalysisTool, monitorEmailsTool, autoReplyTool } from "../tools/email-monitoring"; // TODO: File missing
import { websiteScraperTool } from "../tools/website-scraper";
import { globalSearchTool } from "../tools/global-search";
import { findEntityTool } from "../tools/find-entity";
import { countInvoicesTool, countSessionsTool, countLeadsTool } from "../tools/count-tools";
import { createGalleryCheckoutTool } from "../tools/create-stripe-checkout";
import { submitProdigiOrderTool } from "../tools/submit-prodigi-order";
// import { galleryTools } from "../tools/gallery-management"; // Temporarily disabled due to import issues
import { calendarTools } from "../tools/calendar-management";
import { fileManagementTools } from "../tools/file-management";
import { blogManagementTools } from "../tools/blog-management";
import { emailCampaignTools } from "../tools/email-campaign-management";
import { questionnaireTools } from "../tools/questionnaire-management";
import { reportsAnalyticsTools } from "../tools/reports-analytics";
import { systemAdministrationTools } from "../tools/system-administration";
import { integrationManagementTools } from "../tools/integration-management";
import { automationManagementTools } from "../tools/automation-management";
import { customerPortalManagementTools } from "../tools/customer-portal-management";

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
toolRegistry.register({
  name: websiteScraperTool.name,
  description: websiteScraperTool.description,
  parameters: websiteScraperTool.parameters,
  handler: async (params) => websiteScraperTool.execute(params)
});
toolRegistry.register(globalSearchTool);
toolRegistry.register(findEntityTool);
toolRegistry.register(countInvoicesTool);
toolRegistry.register(countSessionsTool);
toolRegistry.register(countLeadsTool);
toolRegistry.register(createGalleryCheckoutTool);
toolRegistry.register(submitProdigiOrderTool);
// Register calendar management tools
calendarTools.forEach(tool => {
  toolRegistry.register({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
    handler: async (params) => tool.execute(params)
  });
});

// Register file management tools
fileManagementTools.forEach(tool => {
  toolRegistry.register({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
    handler: async (params) => tool.execute(params)
  });
});

// Register blog management tools
blogManagementTools.forEach(tool => {
  toolRegistry.register({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
    handler: async (params) => tool.execute(params)
  });
});

// Register email campaign management tools
emailCampaignTools.forEach(tool => {
  toolRegistry.register({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
    handler: async (params) => tool.execute(params)
  });
});

// Register questionnaire management tools
questionnaireTools.forEach(tool => {
  toolRegistry.register({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
    handler: async (params) => tool.execute(params)
  });
});

// Register reports & analytics tools
reportsAnalyticsTools.forEach(tool => {
  toolRegistry.register({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
    handler: async (params) => tool.execute(params)
  });
});

// Register system administration tools
systemAdministrationTools.forEach(tool => {
  toolRegistry.register({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
    handler: async (params) => tool.execute(params)
  });
});

// Register integration management tools
integrationManagementTools.forEach(tool => {
  toolRegistry.register({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
    handler: async (params) => tool.execute(params)
  });
});

// Register automation management tools
automationManagementTools.forEach(tool => {
  toolRegistry.register({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
    handler: async (params) => tool.execute(params)
  });
});

// Register customer portal management tools
customerPortalManagementTools.forEach(tool => {
  toolRegistry.register({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
    handler: async (params) => tool.execute(params)
  });
});

// Add reply email tool for lead follow-up
import { replyEmailTool } from "../tools/reply-email";
toolRegistry.register(replyEmailTool);

// Add invoice creation tool
import { createInvoiceTool } from "../tools/create-invoice";
toolRegistry.register(createInvoiceTool);

// Add planning and knowledge tools
import { describeCapabilitiesTool } from "../tools/describe-capabilities";
import { kbSearchTool } from "../tools/kb-search";
toolRegistry.register(describeCapabilitiesTool);
toolRegistry.register(kbSearchTool);

// Add voucher management tools
import { createVoucherProductTool, sellVoucherTool, readVoucherSalesTool, redeemVoucherTool } from "../tools/voucher-management";
toolRegistry.register(createVoucherProductTool);
toolRegistry.register(sellVoucherTool);
toolRegistry.register(readVoucherSalesTool);
toolRegistry.register(redeemVoucherTool);

// Add top clients tools
import { listTopClientsTool, getClientSegmentsTool } from "../tools/top-clients";
toolRegistry.register(listTopClientsTool);
toolRegistry.register(getClientSegmentsTool);

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
console.log(`📋 Registered ${toolRegistry.list().length} tools for CRM agent`);

// Verify tool registration
toolRegistry.list().forEach(tool => {
  console.log(`✅ Tool registered: ${tool.name}`);
});
import { toolRegistry } from "../agent/core/tools";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

// Auto-generate capability catalog for self-introspection
function generateToolCatalog() {
  try {
    // Ensure data directory exists
    mkdirSync("agent/data", { recursive: true });
    
    // Get all registered tools and their capabilities
    const tools = toolRegistry.getAll();
    const catalog = Array.from(tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description?.split("\n")[0] || "No description",
      category: extractCategory(tool.description || ""),
      parameters: extractParameters(tool.parameters),
      authorities_required: extractAuthorities(tool.description || ""),
      risk_level: assessRiskLevel(tool.name, tool.description || "")
    }));
    
    // Generate metadata
    const metadata = {
      generated_at: new Date().toISOString(),
      total_tools: catalog.length,
      categories: [...new Set(catalog.map(t => t.category))].sort(),
      high_risk_tools: catalog.filter(t => t.risk_level === 'high').length,
      authorities_needed: [...new Set(catalog.flatMap(t => t.authorities_required))].sort(),
      version: "1.0.0"
    };
    
    const fullCatalog = {
      metadata,
      tools: catalog.sort((a, b) => a.name.localeCompare(b.name))
    };
    
    // Write to file
    const catalogPath = "agent/data/tool_catalog.json";
    writeFileSync(catalogPath, JSON.stringify(fullCatalog, null, 2));
    
    console.log(`✅ Generated tool catalog: ${catalogPath}`);
    console.log(`📊 Tools: ${metadata.total_tools}, Categories: ${metadata.categories.length}, High-risk: ${metadata.high_risk_tools}`);
    
    return fullCatalog;
  } catch (error) {
    console.error("❌ Catalog generation failed:", error);
    throw error;
  }
}

// Extract category from tool description
function extractCategory(description: string): string {
  const categoryKeywords = {
    'search': ['search', 'find', 'query', 'lookup'],
    'communication': ['email', 'send', 'message', 'notify'],
    'billing': ['invoice', 'payment', 'charge', 'pricing'],
    'scheduling': ['session', 'calendar', 'book', 'schedule'],
    'files': ['upload', 'file', 'digital', 'organize'],
    'content': ['blog', 'post', 'content', 'publish'],
    'analytics': ['report', 'analyze', 'metrics', 'kpi'],
    'automation': ['workflow', 'trigger', 'automate'],
    'crm': ['client', 'lead', 'contact', 'customer'],
    'admin': ['system', 'config', 'manage', 'settings']
  };
  
  const desc = description.toLowerCase();
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => desc.includes(keyword))) {
      return category;
    }
  }
  return 'general';
}

// Extract and simplify parameters
function extractParameters(params: any): string[] {
  if (!params || !params.shape) return [];
  return Object.keys(params.shape);
}

// Extract required authorities from description
function extractAuthorities(description: string): string[] {
  const authorities = [];
  if (description.includes('SEND_EMAIL')) authorities.push('SEND_EMAIL');
  if (description.includes('CREATE_LEAD')) authorities.push('CREATE_LEAD');
  if (description.includes('UPDATE_CLIENT')) authorities.push('UPDATE_CLIENT');
  if (description.includes('SEND_INVOICE')) authorities.push('SEND_INVOICE');
  return authorities;
}

// Assess risk level based on tool capabilities
function assessRiskLevel(name: string, description: string): 'low' | 'medium' | 'high' {
  const highRiskPatterns = [
    'delete', 'remove', 'cancel', 'charge', 'payment', 'send_email',
    'submit_prodigi_order', 'send_email_campaign'
  ];
  
  const mediumRiskPatterns = [
    'create', 'update', 'invoice', 'session', 'workflow'
  ];
  
  const lowerName = name.toLowerCase();
  const lowerDesc = description.toLowerCase();
  
  if (highRiskPatterns.some(pattern => 
    lowerName.includes(pattern) || lowerDesc.includes(pattern))) {
    return 'high';
  }
  
  if (mediumRiskPatterns.some(pattern => 
    lowerName.includes(pattern) || lowerDesc.includes(pattern))) {
    return 'medium';
  }
  
  return 'low';
}

// Run if called directly
if (require.main === module) {
  generateToolCatalog();
}

export { generateToolCatalog };
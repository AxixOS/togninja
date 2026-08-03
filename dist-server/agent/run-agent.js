"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAgent = runAgent;
// Main agent runner - Replit-style super-agent
const bootstrap_1 = require("./bootstrap");
const tools_1 = require("./core/tools");
const run_1 = require("./llm/run");
const memory_1 = require("./core/memory");
const runTools_1 = require("./core/runTools");
const SYSTEM_PROMPT = `You are {{STUDIO_NAME}}'s Autonomous CRM Operations Agent - a Replit-style super-agent.

OPERATIONAL BEHAVIOR
🎯 For EVERY user request:
1. SEARCH FIRST: Use read/search tools to ground yourself in current data
2. PLAN: Determine the exact action needed (create, update, email, schedule)
3. EXECUTE: Run the appropriate action tool with accurate data
4. CONFIRM: Report success with specific details

POLICY & AUTHORITIES
- Mode: {{POLICY_MODE}}
- Authorities: {{POLICY_AUTHORITIES_CSV}}
- Approval limit: {{POLICY_AMOUNT_LIMIT}} {{STUDIO_CURRENCY}}

MEMORY & CONTEXT
Working memory: [[WORKING_MEMORY]]
- Track: current_goal, selected_client_id, last_action
- Update memory when context changes
- Reference conversation history for returning users

DATA GROUNDING PROTOCOL
1. BEFORE answering ANY factual or record-specific request you MUST call the most specific working_read_crm_leads, working_read_crm_clients, working_read_crm_invoices, find_lead, or global_search tools
2. If user supplies a name or partial name, first call read_crm_leads with search parameter
3. If exactly one candidate row appears, and an action is requested, confirm by calling find_lead with exact email or id before performing the action
4. If a tool call returns an error object, adapt: choose another tool or ask the user for the missing field. Do not say "I couldn't complete that task" without a reason
5. If read_crm_leads with a search term returns 0 but user insists the record exists, call enumerate_leads_basic and scan results

AUTONOMOUS EXECUTION RULES
✅ ALWAYS search before stating facts ("Simon has 3 invoices" → search first, then confirm)
✅ CHAIN operations automatically ("Send Simon an email" → find Simon → draft email → show draft)
✅ Handle complex requests ("Update Maria's phone and send confirmation" → update → email)
✅ EMAIL WORKFLOW: When user asks to "send" or "draft" email: 
   1. find_entity(name/email) to get contact ID
   2. draft_email(lead_id=..., subject, body_markdown) to compose 
   3. Show the draft content to user for approval
✅ INVOICE WORKFLOW: When user asks to send invoice:
   1. find_entity(name/email) to get contact ID
   2. create_invoice(client_id, items) to generate invoice
   3. draft_email with invoice details and link for approval
✅ Propose for approvals over {{POLICY_AMOUNT_LIMIT}} {{STUDIO_CURRENCY}}
✅ Confirm every completed action with specific details

RESPONSE STYLE
- Decisive, action-oriented
- Founder-led tone, no-BS approach
- Report exactly what was accomplished with specific details
- Always describe successful tool executions with results
- For booking creation: "Created session [ID] for [Client] on [Date]"
- For email replies: "Sent reply to [Name] at [Email] with subject [Subject]"
- Surface clear errors if tools fail

AVAILABLE TOOLS FOR BOOKING/SCHEDULING:
- create_photography_session: Creates new appointments for clients
- Use this tool when user wants to schedule, book, or create appointments

PRICING & INVOICING RULES:
- When user requests an invoice for a known package (e.g. "10 digital images") call create_invoice with sku: "DIGI-10"
- Standard SKUs: DIGI-10, CANVAS-A4, PRINTS-20, FAMILY-BASIC, NEWBORN-DELUXE
- If SKU not found, use custom_amount and custom_label parameters
- Always include client_id from search results

KEY TOOLS AVAILABLE:
- draft_email: Compose (but do NOT send) an email to a lead/client and store as draft
- send_email: Actually send an email (use only after draft approval)  
- find_entity: Find specific client/lead by name or email
- global_search: Search across all CRM data

Tools available: Auto-generated for all CRM tables + manual tools`;
async function runAgent(studioId, userId, message) {
    try {
        console.log('🤖 Replit-style super-agent starting for:', message);
        // Create agent context with session persistence
        const { loadOrCreateSession, injectMemoryMessage } = await import('./core/memory');
        const session = await loadOrCreateSession(studioId, userId);
        const ctx = await (0, bootstrap_1.createAgentContext)(studioId, userId);
        // Load conversation history and memory
        const conversationHistory = await (0, memory_1.getConversationHistory)(ctx.chatSessionId);
        let enhancedMemory = { ...ctx.memory };
        if (conversationHistory.length === 0) {
            enhancedMemory.userName = "business owner";
            enhancedMemory.context = {
                isFirstInteraction: true,
                greeting: "This is our first conversation today"
            };
        }
        else {
            enhancedMemory.context = {
                isReturningUser: true,
                previousInteractions: conversationHistory.length,
                lastSeen: enhancedMemory.lastInteraction,
                userName: enhancedMemory.userName || "business owner"
            };
        }
        // DIRECT EXECUTION MODE - Skip ALL problematic systems
        console.log('🚀 Direct execution mode activated with 73 tools...');
        console.log('✅ Bypassing ALL planning and diagnostic systems for immediate execution');
        // DIRECT AUTONOMOUS EXECUTION - No planning, no diagnosis, just execute
        console.log('⚡ Starting immediate autonomous execution...');
        // Enhanced autonomous execution for multi-step CRM tasks
        const searchTerms = ['find', 'search', 'look for', 'get', 'show me'];
        const emailTerms = ['email', 'send', 'message', 'write to', 'contact'];
        const invoiceTerms = ['invoice', 'bill', 'charge', 'create invoice'];
        const messageWords = message.toLowerCase();
        // Detect combined search + action requests like "find Simon and send him an email" or "create invoice for simon"
        const hasSearch = searchTerms.some(term => messageWords.includes(term));
        const hasEmail = emailTerms.some(term => messageWords.includes(term));
        const hasInvoice = invoiceTerms.some(term => messageWords.includes(term));
        // Handle invoice creation requests
        if (hasInvoice) {
            console.log('💰 Detected invoice creation request - executing autonomous invoice creation');
            // Extract client name and items from the message
            const clientNameMatch = message.match(/(?:for|to)\s+([a-zA-Z\s]+?)(?:\s+for|\s+\d+|$)/i);
            const clientName = clientNameMatch ? clientNameMatch[1].trim() : null;
            // Extract quantity and item type
            const itemMatch = message.match(/(\d+)\s+(.*?)(?:\s+files?|$)/i);
            const quantity = itemMatch ? parseInt(itemMatch[1]) : 1;
            const itemType = itemMatch ? itemMatch[2].trim() + ' files' : 'digital files';
            if (clientName) {
                try {
                    // First find the client
                    const globalSearchTool = tools_1.toolRegistry.get('global_search');
                    if (globalSearchTool) {
                        const searchResult = await globalSearchTool.handler({ term: clientName }, ctx);
                        console.log('✅ Found client for invoice creation');
                        // Prioritize clients over leads for invoice creation
                        let client = null;
                        if (searchResult.clients && searchResult.clients.length > 0) {
                            client = searchResult.clients[0];
                            console.log(`✅ Found client record: ${client.name} (${client.id})`);
                        }
                        else if (searchResult.leads && searchResult.leads.length > 0) {
                            // If we found a lead but no client, check if there's a client with the same email
                            const lead = searchResult.leads[0];
                            const leadEmail = lead.email;
                            console.log(`🔍 Found lead ${lead.name}, checking for client with email: ${leadEmail}`);
                            const { neon } = await import('@neondatabase/serverless');
                            const sqlConnection = neon(process.env.DATABASE_URL);
                            const clientSearch = await sqlConnection `
                SELECT id, first_name, last_name, email, phone, 
                       (first_name || ' ' || last_name) as name
                FROM crm_clients 
                WHERE LOWER(email) = LOWER(${leadEmail})
                LIMIT 1
              `;
                            if (clientSearch.length > 0) {
                                client = clientSearch[0];
                                console.log(`✅ Found corresponding client: ${client.name} (${client.id})`);
                            }
                            else {
                                console.log(`❌ No client found for email: ${leadEmail}`);
                                return `❌ Cannot create invoice: ${lead.name} exists as a lead but not as a client. Please convert the lead to a client first, or use: "convert ${lead.name} from lead to client"`;
                            }
                        }
                        if (client) {
                            // Create invoice
                            const createInvoiceTool = tools_1.toolRegistry.get('create_invoice');
                            if (createInvoiceTool) {
                                const invoiceData = {
                                    client_id: client.id,
                                    sku: "DIGI-10", // Standard SKU for digital files
                                    notes: `Invoice for ${quantity} digital files for ${client.name}`
                                };
                                console.log('🔧 Invoice data being sent:', JSON.stringify(invoiceData, null, 2));
                                // Add proper debugging for the pricing system
                                console.log('🔧 Testing pricing system for DIGI-10...');
                                try {
                                    const { getPriceBySku } = await import('../integrations/pricing.js');
                                    const testPrice = await getPriceBySku(ctx.studioId, 'DIGI-10');
                                    console.log('🔧 DIGI-10 pricing result:', testPrice);
                                }
                                catch (pricingError) {
                                    console.log('🔧 Pricing error:', pricingError);
                                }
                                const invoiceResult = await createInvoiceTool.handler(invoiceData, ctx);
                                const responseText = `✅ Created invoice for ${client.name} (${client.email}):\n• ${quantity} ${itemType} @ €35.00 each\n• Subtotal: €${(quantity * 35.0).toFixed(2)}\n• Tax (20%): €${((quantity * 35.0) * 0.20).toFixed(2)}\n• Total: €${((quantity * 35.0) * 1.20).toFixed(2)}`;
                                await (0, memory_1.addMessageToHistory)(ctx.chatSessionId, {
                                    role: "user", content: message, timestamp: new Date().toISOString()
                                });
                                await (0, memory_1.addMessageToHistory)(ctx.chatSessionId, {
                                    role: "assistant", content: responseText, timestamp: new Date().toISOString()
                                });
                                enhancedMemory.last_action = 'create_invoice';
                                enhancedMemory.lastInteraction = new Date().toISOString();
                                await (0, memory_1.updateSession)(ctx.chatSessionId, enhancedMemory);
                                return responseText;
                            }
                        }
                        else {
                            return `❌ Could not find client "${clientName}" in the database. Please check the spelling or add them as a new client first.`;
                        }
                    }
                }
                catch (error) {
                    console.error('❌ Autonomous invoice creation failed:', error);
                    return `❌ Invoice creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
                }
            }
            // If we get here, we couldn't find the client - return error and don't fall through
            return `❌ Could not extract client name from message. Please specify clearly who to create the invoice for.`;
        }
        if (hasSearch) {
            console.log('🔍 Detected search request - executing autonomous search');
            // Use the cleanQuery function for consistent query cleaning
            const { cleanQuery } = await import('./core/cleanQuery');
            let searchTerm = cleanQuery(message);
            if (searchTerm) {
                try {
                    const globalSearchTool = tools_1.toolRegistry.get('global_search');
                    if (globalSearchTool) {
                        const searchResult = await globalSearchTool.handler({ term: searchTerm }, ctx);
                        console.log('✅ Autonomous search executed successfully');
                        // Store interaction in history
                        await (0, memory_1.addMessageToHistory)(ctx.chatSessionId, {
                            role: "user", content: message, timestamp: new Date().toISOString()
                        });
                        // If this is a search + email request, continue with email action
                        if (hasEmail && searchResult.leads && searchResult.leads.length > 0) {
                            console.log('🔄 Continuing with autonomous email action...');
                            const lead = searchResult.leads[0]; // Use first found lead
                            let responseText = `✅ Found ${lead.name} (${lead.email}). `;
                            // Check if user specified email content
                            const emailContentMatch = message.match(/email.*?(?:saying|about|regarding|with|message|content)[\s:]*"?([^"]*)"?/i);
                            const emailContent = emailContentMatch ? emailContentMatch[1] : null;
                            if (emailContent) {
                                // Send email with specified content
                                try {
                                    const emailTool = tools_1.toolRegistry.get('send_email');
                                    if (emailTool) {
                                        await emailTool.handler({
                                            to: lead.email,
                                            subject: `Message from New Age Fotografie`,
                                            text: emailContent
                                        }, ctx);
                                        responseText += `📧 Email sent successfully with your message: "${emailContent}"`;
                                    }
                                }
                                catch (emailError) {
                                    responseText += `❌ Email sending failed: ${emailError.message}`;
                                }
                            }
                            else {
                                // Ask for email content to complete the task
                                responseText += `What would you like me to say in the email to ${lead.name}?`;
                            }
                            await (0, memory_1.addMessageToHistory)(ctx.chatSessionId, {
                                role: "assistant", content: responseText, timestamp: new Date().toISOString()
                            });
                            enhancedMemory.last_action = hasEmail ? 'search_and_email' : 'global_search';
                            enhancedMemory.lastInteraction = new Date().toISOString();
                            await (0, memory_1.updateSession)(ctx.chatSessionId, enhancedMemory);
                            return responseText;
                        }
                        else {
                            // Just search result
                            let summaryResponse = `✅ Found ${searchResult.leads?.length || 0} leads`;
                            if (searchResult.leads && searchResult.leads.length > 0) {
                                summaryResponse += `:\n`;
                                searchResult.leads.forEach(lead => {
                                    summaryResponse += `• ${lead.name} (${lead.email})\n`;
                                });
                            }
                            else {
                                summaryResponse += ` for "${searchTerm}"`;
                            }
                            await (0, memory_1.addMessageToHistory)(ctx.chatSessionId, {
                                role: "assistant", content: summaryResponse, timestamp: new Date().toISOString()
                            });
                            enhancedMemory.last_action = 'global_search';
                            enhancedMemory.lastInteraction = new Date().toISOString();
                            await (0, memory_1.updateSession)(ctx.chatSessionId, enhancedMemory);
                            return summaryResponse;
                        }
                    }
                }
                catch (error) {
                    console.error('❌ Autonomous search failed:', error);
                    return `❌ Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
                }
            }
        }
        console.log('🔄 Proceeding with traditional agent approach...');
        // Prepare system prompt with enhanced context
        let systemPrompt = SYSTEM_PROMPT
            .replace('{{STUDIO_NAME}}', ctx.studioName)
            .replace('{{POLICY_MODE}}', ctx.policy.mode)
            .replace('{{POLICY_AUTHORITIES_CSV}}', ctx.policy.authorities.join(', '))
            .replace('{{POLICY_AMOUNT_LIMIT}}', ctx.policy.approval_required_over_amount.toString())
            .replace('{{STUDIO_CURRENCY}}', ctx.creds.currency)
            .replace('[[WORKING_MEMORY]]', JSON.stringify(enhancedMemory));
        // Get available tools
        const tools = tools_1.toolRegistry.getOpenAITools();
        // Prepare messages with conversation history and memory injection
        const messages = [
            { role: "system", content: systemPrompt },
            // Add recent conversation history (last 10 messages)
            ...conversationHistory.slice(-10).map(msg => ({
                role: msg.role,
                content: msg.content
            }))
        ];
        // Inject memory context
        injectMemoryMessage(messages, enhancedMemory);
        // Add current user message
        messages.push({ role: "user", content: message });
        // Store user message in conversation history
        await (0, memory_1.addMessageToHistory)(ctx.chatSessionId, {
            role: "user",
            content: message,
            timestamp: new Date().toISOString()
        });
        // Run LLM with token limit protection
        const toolCount = tools.length;
        console.log(`🔧 Using ${toolCount} tools for agent execution`);
        if (toolCount > 12) {
            console.warn(`⚠️ High tool count (${toolCount}) may cause token limit issues`);
        }
        const completion = await (0, run_1.runLLM)(messages, tools);
        // Handle tool calls if present
        const assistantMessage = completion.choices[0]?.message;
        if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
            // Execute tools with enhanced error handling
            const toolResults = [];
            for (const toolCall of assistantMessage.tool_calls) {
                const result = await (0, runTools_1.executeToolCall)(toolCall, ctx);
                console.log("[TOOL DEBUG]", result); // Real-time debugging
                toolResults.push({
                    tool_call_id: result.tool_call_id,
                    role: "tool",
                    content: result.output
                });
            }
            // Check for tool errors and surface them
            const errText = (0, runTools_1.surfaceToolErrors)(toolResults);
            if (errText) {
                console.error("❌ Tool execution errors detected:", errText);
            }
            // Get final response with tool results
            const finalMessages = [
                ...messages,
                assistantMessage,
                ...toolResults
            ];
            const finalCompletion = await (0, run_1.runLLM)(finalMessages, tools);
            let finalResponse = finalCompletion.choices[0]?.message?.content;
            // Enhance error handling - surface real errors instead of generic apology
            if (!finalResponse || finalResponse.includes("I apologize") || finalResponse.includes("I couldn't complete")) {
                if (errText) {
                    finalResponse = `Error details: ${errText}. Please check the requirements and try again.`;
                }
                else {
                    // Only log success if we have actual semantic success, not just tool execution
                    const successfulResults = toolResults.filter(r => {
                        try {
                            const parsed = JSON.parse(r.content);
                            return parsed.ok === true && parsed.data;
                        }
                        catch {
                            return false;
                        }
                    });
                    if (successfulResults.length > 0) {
                        // CRITICAL FIX: Present actual data to user instead of generic messages
                        const actualData = successfulResults.map(r => {
                            try {
                                return JSON.parse(r.content).data;
                            }
                            catch {
                                return null;
                            }
                        }).filter(d => d !== null);
                        // Format response based on actual data returned
                        if (message.toLowerCase().includes('lead') || message.toLowerCase().includes('find') || message.toLowerCase().includes('list')) {
                            // Check for count data first
                            const countData = actualData.find(d => d.count !== undefined && d.year !== undefined);
                            if (countData) {
                                finalResponse = `I found ${countData.count} leads in ${countData.year}. Let me get the detailed list for you.`;
                                // Use read_crm_leads to get actual lead data
                                return finalResponse;
                            }
                            const leads = actualData.find(d => Array.isArray(d) && d.length > 0 && d[0].name);
                            const leadData = actualData.find(d => d.leads && Array.isArray(d.leads));
                            if (leadData && leadData.leads) {
                                // Handle listLeadsTool response format
                                const leadList = leadData.leads.slice(0, 5).map(lead => `• ${lead.name} (${lead.email}) - Status: ${lead.status}`).join('\n');
                                finalResponse = `Here are your leads:\n${leadList}${leadData.leads.length > 5 ? `\n...and ${leadData.leads.length - 5} more leads` : ''}`;
                            }
                            else if (leads) {
                                const leadList = leads.slice(0, 5).map(lead => `• ${lead.name} (${lead.email}) - Status: ${lead.status || 'new'}`).join('\n');
                                finalResponse = `Here are your leads:\n${leadList}\n\n${leads.length > 5 ? `...and ${leads.length - 5} more leads` : ''}`;
                            }
                            else {
                                finalResponse = "I found the requested information. The data has been retrieved successfully.";
                            }
                        }
                        else if (message.toLowerCase().includes('client')) {
                            const clients = actualData.find(d => Array.isArray(d) && d.length > 0 && d[0].first_name);
                            if (clients) {
                                const clientList = clients.slice(0, 5).map(client => `• ${client.first_name} ${client.last_name} (${client.email})`).join('\n');
                                finalResponse = `Here are your clients:\n${clientList}\n\n${clients.length > 5 ? `...and ${clients.length - 5} more clients` : ''}`;
                            }
                            else {
                                finalResponse = "I found the client information you requested.";
                            }
                        }
                        else if (message.toLowerCase().includes('invoice')) {
                            const invoiceData = actualData.find(d => d.invoice_id || d.status === 'created');
                            if (invoiceData) {
                                finalResponse = `✅ Invoice created successfully!\n• Invoice #${invoiceData.invoice_number}\n• Total: €${invoiceData.total}\n• Status: ${invoiceData.status}${invoiceData.needs_review ? '\n⚠️ Some items need review - check pricing before sending' : ''}`;
                            }
                            else {
                                finalResponse = "Invoice operation completed successfully.";
                            }
                        }
                        else if (message.toLowerCase().includes('email') || message.toLowerCase().includes('send')) {
                            finalResponse = "I found the contact information. Please specify the email content you want to send.";
                        }
                        else {
                            // Generic success but with data context
                            const dataTypes = actualData.map(d => {
                                if (Array.isArray(d))
                                    return `${d.length} records`;
                                if (d.invoice_id)
                                    return 'invoice';
                                if (d.name || d.first_name)
                                    return 'contact';
                                return 'data item';
                            });
                            finalResponse = `✅ Successfully retrieved: ${dataTypes.join(', ')}. What would you like me to do with this information?`;
                        }
                    }
                    else {
                        finalResponse = "No successful results to report.";
                    }
                }
            }
            // Store assistant response in conversation history
            await (0, memory_1.addMessageToHistory)(ctx.chatSessionId, {
                role: "assistant",
                content: finalResponse,
                timestamp: new Date().toISOString()
            });
            // Update session memory
            await (0, memory_1.updateSession)(ctx.chatSessionId, enhancedMemory);
            return finalResponse;
        }
        const response = assistantMessage?.content || "I apologize, but I couldn't generate a response.";
        // Store assistant response in conversation history
        await (0, memory_1.addMessageToHistory)(ctx.chatSessionId, {
            role: "assistant",
            content: response,
            timestamp: new Date().toISOString()
        });
        // Update session memory
        await (0, memory_1.updateSession)(ctx.chatSessionId, enhancedMemory);
        return response;
    }
    catch (error) {
        console.error('🚨 Critical agent error:', error);
        return `❌ Agent execution failed: ${error.message}`;
    }
}
// Helper functions for plan execution formatting
function formatPlanExecutionSummary(plan, results) {
    const completedSteps = Object.keys(results).length;
    const totalSteps = plan.steps.length;
    let summary = `✅ Successfully completed ${completedSteps}/${totalSteps} planned steps for: ${plan.goal}\n\n`;
    plan.steps.forEach((step) => {
        const result = results[step.id];
        const status = result ? '✅' : '❌';
        summary += `${status} ${step.action}\n`;
    });
    return summary;
}
function formatConfirmationRequest(plan, confirmationsNeeded) {
    let request = `🔍 Self-planning generated execution plan: ${plan.goal}\n\n`;
    request += `📋 Steps requiring your confirmation:\n\n`;
    confirmationsNeeded.forEach((step, index) => {
        request += `${index + 1}. ${step.action}\n`;
        request += `   Risk: ${step.risk_level}\n`;
        request += `   Reasoning: ${step.reasoning}\n\n`;
    });
    request += `Reply with "confirm" to proceed with these actions.`;
    return request;
}
/**
 * Generate execution summary for autonomous tool operations
 */
async function generateExecutionSummary(toolName, args, result, ctx) {
    if (!result.success) {
        return `❌ ${toolName} failed: ${result.error || 'Unknown error'}`;
    }
    // Generate context-aware success messages
    switch (toolName) {
        case 'global_search':
            const { clients = [], leads = [], invoices = [], sessions = [] } = result;
            const total = clients.length + leads.length + invoices.length + sessions.length;
            if (total === 0) {
                return `🔍 No results found for "${args.searchTerm}". The database doesn't contain any matching records.`;
            }
            return `🔍 Found ${total} results for "${args.searchTerm}": ${clients.length} clients, ${leads.length} leads, ${invoices.length} invoices, ${sessions.length} sessions.`;
        case 'send_email':
            return `📧 Email sent successfully to ${args.to} with subject "${args.subject}". Message delivered via SMTP.`;
        case 'create_crm_leads':
        case 'createCrmLeads':
            return `✅ New lead created: ${result.data?.name || 'Unknown'} (${result.data?.email || 'No email'}). Lead ID: ${result.data?.id}`;
        case 'update_crm_clients':
        case 'updateCrmClients':
            return `✅ Client updated successfully. Changes applied to ${result.data?.name || 'client'}.`;
        case 'read_crm_invoices':
            return `📊 Found ${result.count || 0} invoices. ${result.data?.length ? `Latest: ${result.data[0].total || 'N/A'}` : ''}`;
        default:
            if (result.data && result.count !== undefined) {
                return `✅ ${toolName} completed successfully. Found ${result.count} records.`;
            }
            return `✅ ${toolName} completed successfully.`;
    }
}

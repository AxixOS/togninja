"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAgent = runAgent;
exports.generateExecutionSummary = generateExecutionSummary;
// agent/run-agent-clean.ts - Clean version without syntax errors
const run_1 = require("./llm/run");
const tools_1 = require("./core/tools");
const cleanQuery_1 = require("./core/cleanQuery");
// Mock functions for now - these would connect to actual storage
async function getConversationHistory(sessionId) {
    return [];
}
async function addMessageToHistory(sessionId, message) {
    console.log(`📝 Adding message to history for session ${sessionId}`);
}
async function getSessionMemory(sessionId) {
    return {};
}
async function updateSession(sessionId, memory) {
    console.log(`💾 Updating session memory for ${sessionId}`);
}
async function runAgent(message, ctx) {
    try {
        console.log('🚀 Starting CRM Agent with self-reasoning capabilities...');
        // Add user message to conversation history
        await addMessageToHistory(ctx.chatSessionId, {
            role: "user",
            content: message,
            timestamp: new Date().toISOString()
        });
        // Get conversation history and session memory
        const conversationHistory = await getConversationHistory(ctx.chatSessionId);
        const sessionMemory = await getSessionMemory(ctx.chatSessionId);
        // Enhanced memory with contextual information
        const enhancedMemory = {
            ...sessionMemory,
            lastInteraction: new Date().toISOString()
        };
        // Set context based on conversation history
        if (conversationHistory.length === 0) {
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
        // SELF-REASONING SYSTEM ACTIVATION
        console.log('🧠 Self-reasoning agent activated with comprehensive tool catalog...');
        // Check for error patterns and apply self-reasoning
        const { SelfPlanningAgent } = await import('./core/self-planner');
        const planner = new SelfPlanningAgent(ctx);
        try {
            // Generate execution plan with self-reasoning
            const planningResult = await planner.generateExecutionPlan(message);
            if (planningResult.status === 'ready') {
                console.log(`🚀 Self-planned execution with ${planningResult.plan.steps.length} steps`);
                const executionResults = await planner.executePlan(planningResult.plan);
                // Format results for user
                const summary = formatPlanExecutionSummary(planningResult.plan, executionResults);
                return summary;
            }
            else if (planningResult.status === 'requires_confirmation') {
                console.log(`⏸️ Plan requires ${planningResult.confirmations_needed.length} user confirmations`);
                return formatConfirmationRequest(planningResult.plan, planningResult.confirmations_needed);
            }
        }
        catch (planningError) {
            console.log('⚠️ Self-planning failed, falling back to traditional approach:', planningError.message);
            // Apply self-diagnosis system for error resolution
            const { selfDiagnosis } = await import('./core/self-diagnosis');
            try {
                console.log('🧠 Self-diagnosis system analyzing error...');
                const diagnosis = await selfDiagnosis.diagnose(planningError.message, {
                    userRequest: message,
                    studioId: ctx.studioId,
                    toolsAvailable: Array.from(tools_1.toolRegistry.keys())
                });
                console.log(`🔍 Self-diagnosis result: ${diagnosis.issue}`);
                console.log(`🎯 Root cause: ${diagnosis.root_cause}`);
                console.log(`💡 Suggested fixes: ${diagnosis.suggested_fixes.join(', ')}`);
                // Attempt auto-fix if available
                if (diagnosis.auto_fix_available) {
                    console.log('🔧 Attempting automatic fix...');
                    const fixSuccess = await selfDiagnosis.attemptAutoFix(diagnosis, ctx);
                    if (fixSuccess) {
                        console.log('🎉 Self-reasoning system fixed the issue! Retrying...');
                        // Retry the planning after auto-fix
                        try {
                            const retryPlanningResult = await planner.generateExecutionPlan(message);
                            if (retryPlanningResult.status === 'ready') {
                                const retryResults = await planner.executePlan(retryPlanningResult.plan);
                                return formatPlanExecutionSummary(retryPlanningResult.plan, retryResults);
                            }
                        }
                        catch (retryError) {
                            console.log('⚠️ Retry after auto-fix also failed:', retryError.message);
                        }
                    }
                }
                // Provide diagnosis to user if auto-fix didn't work
                return `🧠 Self-reasoning diagnosis:\n\n**Issue**: ${diagnosis.issue}\n**Root Cause**: ${diagnosis.root_cause}\n\n**Suggested Solutions**:\n${diagnosis.suggested_fixes.map(fix => `• ${fix}`).join('\n')}\n\nConfidence: ${Math.round(diagnosis.confidence * 100)}%`;
            }
            catch (diagnosisError) {
                console.log('⚠️ Self-diagnosis also failed:', diagnosisError.message);
            }
            // Fallback to traditional agent approach
            return runTraditionalAgent(message, ctx, conversationHistory, enhancedMemory);
        }
        // Fallback response
        return "I'm ready to help with your CRM tasks. What would you like me to do?";
    }
    catch (error) {
        console.error('❌ Agent execution failed:', error);
        return "I encountered an error while processing your request. Please try again.";
    }
}
async function runTraditionalAgent(message, ctx, conversationHistory, enhancedMemory) {
    console.log('🔄 Running traditional agent workflow...');
    // Clean the user query for better tool execution
    const cleanedQuery = (0, cleanQuery_1.cleanQuery)(message);
    console.log(`🧹 Cleaned query: "${cleanedQuery}" from original: "${message}"`);
    // Build messages array for LLM
    const messages = [
        {
            role: "system",
            content: `You are a CRM Operations Assistant for New Age Fotografie, a professional photography studio in Vienna. 

CAPABILITIES:
- Client management (search, update, create)
- Lead management and conversion
- Invoice creation and management  
- Email communication
- Session scheduling and tracking
- Business analytics and reporting

TOOLS AVAILABLE: ${Array.from(tools_1.toolRegistry.keys()).join(', ')}

WORKING MEMORY: ${JSON.stringify(enhancedMemory.context || {})}

Always search the database first before making assumptions. Use the available tools to provide accurate, helpful responses in German when appropriate.`
        },
        ...conversationHistory.map(h => ({
            role: h.role,
            content: h.content
        })),
        {
            role: "user",
            content: cleanedQuery
        }
    ];
    // Get available tools
    const tools = Array.from(tools_1.toolRegistry.values()).map(tool => ({
        type: "function",
        function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.schema
        }
    }));
    // Run initial LLM call
    const completion = await (0, run_1.runLLM)(messages, tools);
    const assistantMessage = completion.choices[0]?.message;
    if (!assistantMessage) {
        return "I apologize, but I couldn't generate a response.";
    }
    // Execute tools if requested
    const toolResults = [];
    if (assistantMessage.tool_calls) {
        console.log(`🔧 Executing ${assistantMessage.tool_calls.length} tools...`);
        for (const toolCall of assistantMessage.tool_calls) {
            const tool = tools_1.toolRegistry.get(toolCall.function.name);
            if (tool) {
                try {
                    const args = JSON.parse(toolCall.function.arguments);
                    const result = await tool.handler(args);
                    toolResults.push({
                        role: "tool",
                        content: JSON.stringify(result),
                        tool_call_id: toolCall.id
                    });
                }
                catch (error) {
                    console.error(`❌ Tool ${toolCall.function.name} failed:`, error);
                    toolResults.push({
                        role: "tool",
                        content: JSON.stringify({ success: false, error: error.message }),
                        tool_call_id: toolCall.id
                    });
                }
            }
        }
        // Get final response with tool results
        const finalMessages = [
            ...messages,
            assistantMessage,
            ...toolResults
        ];
        const finalCompletion = await (0, run_1.runLLM)(finalMessages, tools);
        const finalResponse = finalCompletion.choices[0]?.message?.content || "Task completed.";
        // Store assistant response
        await addMessageToHistory(ctx.chatSessionId, {
            role: "assistant",
            content: finalResponse,
            timestamp: new Date().toISOString()
        });
        await updateSession(ctx.chatSessionId, enhancedMemory);
        return finalResponse;
    }
    const response = assistantMessage?.content || "I apologize, but I couldn't generate a response.";
    // Store assistant response
    await addMessageToHistory(ctx.chatSessionId, {
        role: "assistant",
        content: response,
        timestamp: new Date().toISOString()
    });
    await updateSession(ctx.chatSessionId, enhancedMemory);
    return response;
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

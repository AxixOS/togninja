"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.planStep = planStep;
exports.planMultiStep = planMultiStep;
// Planner middleware for autonomous CRM operations
const json_schema_1 = require("../util/json-schema");
const openai_1 = __importDefault(require("openai"));
const tools_1 = require("./tools");
const cleanQuery_1 = require("./cleanQuery");
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY
});
/**
 * Planning middleware that decides whether to call tools or respond directly
 * Returns either a tool call or a direct model response
 */
async function planStep(userMsg, memory, ctx) {
    console.log('🧠 Planning step for:', userMsg);
    try {
        // Get available tools as OpenAI function definitions
        const tools = tools_1.toolRegistry.list().map(tool => (0, json_schema_1.createOpenAITool)(tool.name, tool.description, tool.parameters));
        const systemPrompt = `You are an intelligent CRM operations planner for ${ctx.studioName}.

PLANNING RULES:
1. If the user asks for information, ALWAYS use search/read tools first to get current data
2. For actions (create, update, email, schedule), plan the appropriate tool call
3. For casual conversation or help requests, respond directly without tools
4. NEVER make assumptions about data - always search first
5. Break complex requests into single tool calls (the system will chain them)

SEARCH-FIRST POLICY:
When using find_entity, global_search, or read tools, first clean the query using cleanQuery() function: strip "can you", "please", "in the database", "clients", etc. so only the real name/email remains.

CONTEXT:
- Studio: ${ctx.studioName}
- User authorities: ${ctx.policy.authorities.join(', ')}
- Current memory: ${JSON.stringify(memory)}
- Available tools: ${tools.length} total

Analyze the user request and either:
A) Call exactly ONE tool that moves toward the goal
B) Respond directly for casual conversation

Be decisive and choose the most specific tool available.`;
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0.1,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMsg }
            ],
            tools,
            tool_choice: "auto"
        });
        const message = response.choices[0].message;
        if (message.tool_calls?.length) {
            const toolCall = message.tool_calls[0];
            const toolName = toolCall.function.name;
            let args;
            try {
                args = JSON.parse(toolCall.function.arguments);
                // Apply query cleaning for search tools
                if ((toolName === 'find_entity' || toolName === 'global_search') && args.query) {
                    args.query = (0, cleanQuery_1.cleanQuery)(args.query);
                    console.log(`🧹 Cleaned query for ${toolName}:`, args.query);
                }
                if (toolName === 'global_search' && args.term) {
                    args.term = (0, cleanQuery_1.cleanQuery)(args.term);
                    console.log(`🧹 Cleaned term for ${toolName}:`, args.term);
                }
            }
            catch (parseError) {
                console.error('❌ Tool arguments parsing failed:', parseError);
                return {
                    modelResponse: "I encountered an error parsing the tool arguments. Please try rephrasing your request."
                };
            }
            // Clean search queries for find_entity and global_search tools
            if (toolName === "find_entity" || toolName === "global_search") {
                if (args.query) {
                    args.query = (0, cleanQuery_1.cleanQuery)(args.query) || (0, cleanQuery_1.cleanQuery)(userMsg);
                }
                if (args.term) {
                    args.term = (0, cleanQuery_1.cleanQuery)(args.term) || (0, cleanQuery_1.cleanQuery)(userMsg);
                }
            }
            console.log(`🛠️ Planned tool: ${toolName} with args:`, args);
            return {
                toolName,
                args,
                confidence: 0.9
            };
        }
        // Direct response without tools
        console.log('💬 Planning direct response');
        return {
            modelResponse: message.content || "I'm not sure how to help with that request.",
            confidence: 0.8
        };
    }
    catch (error) {
        console.error('❌ Planning error:', error);
        return {
            modelResponse: "I encountered an error while planning your request. Please try again.",
            confidence: 0.1
        };
    }
}
/**
 * Multi-step planner for complex operations
 * Breaks down complex requests into sequential steps
 */
async function planMultiStep(userMsg, memory, ctx) {
    console.log('🔄 Multi-step planning for:', userMsg);
    const systemPrompt = `You are a multi-step CRM operations planner.

Break down this request into sequential steps:
"${userMsg}"

Each step should be a single tool operation. Common patterns:
1. Search/find → Action (update/create/email)
2. Read data → Analysis → Report
3. Validate → Execute → Confirm

Return a JSON array of steps, each with:
{ "action": "tool_name", "description": "what this step does" }

IMPORTANT: Keep steps simple and atomic.`;
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0.1,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Plan steps for: ${userMsg}` }
            ]
        });
        const content = response.choices[0].message.content;
        if (!content)
            return [];
        // Parse the multi-step plan
        const steps = JSON.parse(content);
        console.log('📋 Multi-step plan:', steps);
        return steps.map((step) => ({
            toolName: step.action,
            args: step.args || {},
            modelResponse: step.description
        }));
    }
    catch (error) {
        console.error('❌ Multi-step planning error:', error);
        return [];
    }
}

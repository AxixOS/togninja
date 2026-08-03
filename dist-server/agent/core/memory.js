"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadOrCreateSession = loadOrCreateSession;
exports.loadSession = loadSession;
exports.updateSession = updateSession;
exports.addMessageToHistory = addMessageToHistory;
exports.getConversationHistory = getConversationHistory;
exports.injectMemoryMessage = injectMemoryMessage;
// In-memory session storage (for demo - replace with database in production)
const sessions = new Map();
async function loadOrCreateSession(studioId, userId) {
    const sessionKey = `${studioId}-${userId}`;
    // Check if session already exists
    let session = sessions.get(sessionKey);
    if (!session) {
        // Create new session with thread support
        session = {
            id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            studio_id: studioId,
            user_id: userId,
            thread_id: "__PENDING__",
            memory_json: {
                conversationCount: 0,
                lastInteraction: new Date().toISOString()
            },
            last_summary: "",
            conversation_history: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        sessions.set(sessionKey, session);
        console.log(`🧠 Created new session for user ${userId}: ${session.id}`);
    }
    else {
        console.log(`🧠 Loaded existing session for user ${userId}: ${session.id} (${session.conversation_history.length} messages)`);
    }
    return session;
}
// Legacy function for compatibility
async function loadSession(studioId, userId) {
    return loadOrCreateSession(studioId, userId);
}
async function updateSession(sessionId, memory, threadId, lastSummary) {
    // Update session in storage
    for (const [key, session] of sessions.entries()) {
        if (session.id === sessionId) {
            session.memory_json = {
                ...session.memory_json,
                ...memory,
                lastInteraction: new Date().toISOString(),
                conversationCount: (session.memory_json.conversationCount || 0) + 1
            };
            if (threadId) {
                session.thread_id = threadId;
            }
            if (lastSummary) {
                session.last_summary = lastSummary;
            }
            session.updated_at = new Date().toISOString();
            sessions.set(key, session);
            break;
        }
    }
}
async function addMessageToHistory(sessionId, message) {
    for (const [key, session] of sessions.entries()) {
        if (session.id === sessionId) {
            session.conversation_history.push(message);
            // Keep only last 20 messages to prevent token overflow
            if (session.conversation_history.length > 20) {
                session.conversation_history = session.conversation_history.slice(-20);
            }
            session.updated_at = new Date().toISOString();
            sessions.set(key, session);
            break;
        }
    }
}
async function getConversationHistory(sessionId) {
    for (const [key, session] of sessions.entries()) {
        if (session.id === sessionId) {
            return session.conversation_history || [];
        }
    }
    return [];
}
function injectMemoryMessage(messages, memoryJson) {
    // Inject memory context into messages
    if (memoryJson && Object.keys(memoryJson).length > 0) {
        const memoryContext = `Previous conversation context: ${JSON.stringify(memoryJson)}`;
        messages.push({
            role: "system",
            content: memoryContext
        });
    }
}

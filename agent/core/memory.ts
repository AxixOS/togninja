// Memory management for CRM agent
export interface WorkingMemory {
  selectedClientId?: string;
  currentGoal?: string;
  preferences?: Record<string, any>;
  context?: Record<string, any>;
  userName?: string;
  lastInteraction?: string;
  conversationCount?: number;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  studio_id: string;
  user_id: string;
  thread_id?: string;
  memory_json: WorkingMemory;
  last_summary?: string;
  conversation_history: ChatMessage[];
  created_at: string;
  updated_at: string;
}

// In-memory session storage (for demo - replace with database in production)
const sessions: Map<string, ChatSession> = new Map();

export async function loadOrCreateSession(studioId: string, userId: string): Promise<ChatSession> {
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
  } else {
    console.log(`🧠 Loaded existing session for user ${userId}: ${session.id} (${session.conversation_history.length} messages)`);
  }
  
  return session;
}

// Legacy function for compatibility
export async function loadSession(studioId: string, userId: string): Promise<ChatSession> {
  return loadOrCreateSession(studioId, userId);
}

export async function updateSession(sessionId: string, memory: WorkingMemory, threadId?: string, lastSummary?: string): Promise<void> {
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

export async function addMessageToHistory(sessionId: string, message: ChatMessage): Promise<void> {
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

export async function getConversationHistory(sessionId: string): Promise<ChatMessage[]> {
  for (const [key, session] of sessions.entries()) {
    if (session.id === sessionId) {
      return session.conversation_history || [];
    }
  }
  return [];
}

export function injectMemoryMessage(messages: any[], memoryJson: WorkingMemory): void {
  // Inject memory context into messages
  if (memoryJson && Object.keys(memoryJson).length > 0) {
    const memoryContext = `Previous conversation context: ${JSON.stringify(memoryJson)}`;
    messages.push({
      role: "system",
      content: memoryContext
    });
  }
}
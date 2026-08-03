import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Shield, Sparkles, Zap, MessageSquare, Send, X, Loader2, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';

// Connection status type
type ConnectionStatus = 'connected' | 'checking' | 'disconnected' | 'reconnecting';

const AgentV2Page: React.FC = () => {
  const [showChat, setShowChat] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('checking');
  const retryCountRef = useRef(0);
  const maxRetries = 5; // Increased from 3
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;

  // Health check function - verify agent endpoint is reachable
  const checkAgentHealth = useCallback(async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
      
      const response = await fetch('/api/agent/v2/stats', {
        method: 'GET',
        credentials: 'include',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.warn('[Agent V2] Health check failed:', error);
      return false;
    }
  }, []);

  // Auto-reconnection logic
  const attemptReconnection = useCallback(async () => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      setConnectionStatus('disconnected');
      console.error('[Agent V2] Max reconnection attempts reached');
      return;
    }

    setConnectionStatus('reconnecting');
    reconnectAttemptsRef.current++;
    
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 30000); // Exponential backoff, max 30s
    console.log(`[Agent V2] Reconnection attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts} in ${delay}ms`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    const isHealthy = await checkAgentHealth();
    if (isHealthy) {
      setConnectionStatus('connected');
      reconnectAttemptsRef.current = 0;
      console.log('[Agent V2] ✅ Reconnected successfully');
    } else {
      attemptReconnection();
    }
  }, [checkAgentHealth]);

  // Start health monitoring on mount
  useEffect(() => {
    let isMounted = true;

    const startHealthMonitoring = async () => {
      // Initial health check
      const isHealthy = await checkAgentHealth();
      if (isMounted) {
        setConnectionStatus(isHealthy ? 'connected' : 'disconnected');
        if (!isHealthy) {
          attemptReconnection();
        }
      }

      // Periodic health checks every 30 seconds
      healthCheckIntervalRef.current = setInterval(async () => {
        if (!isMounted) return;
        
        const healthy = await checkAgentHealth();
        if (!healthy && connectionStatus === 'connected') {
          console.warn('[Agent V2] Connection lost, attempting to reconnect...');
          setConnectionStatus('reconnecting');
          attemptReconnection();
        } else if (healthy && connectionStatus !== 'connected') {
          setConnectionStatus('connected');
          reconnectAttemptsRef.current = 0;
        }
      }, 30000);
    };

    startHealthMonitoring();

    return () => {
      isMounted = false;
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
    };
  }, [checkAgentHealth, attemptReconnection, connectionStatus]);

  // Reset session on mount
  useEffect(() => {
    setSessionId(null);
    setMessages([]);
  }, []);

  const handleSendMessage = async (retryMessage?: string) => {
    const userMessage = retryMessage || message.trim();
    if (!userMessage || isLoading) return;

    // Check connection before sending
    if (connectionStatus === 'disconnected') {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '⚠️ Agent is currently disconnected. Attempting to reconnect...'
      }]);
      attemptReconnection();
      return;
    }

    if (!retryMessage) {
      setMessage('');
      setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    }
    setIsLoading(true);
    setConnectionError(false);

    const attemptRequest = async (): Promise<void> => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for chat requests
        
        const response = await fetch('/api/agent/v2/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          signal: controller.signal,
          body: JSON.stringify({
            message: userMessage,
            sessionId: sessionId,
            mode: 'auto_safe'
          })
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // Handle specific HTTP errors
          if (response.status === 401 || response.status === 403) {
            throw new Error('Authentication required. Please refresh the page and log in again.');
          }
          if (response.status === 500) {
            throw new Error('Server error. The team has been notified.');
          }
          if (response.status === 503) {
            throw new Error('Service temporarily unavailable. Retrying...');
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        retryCountRef.current = 0; // Reset retry count on success
        setConnectionStatus('connected'); // Confirm connection is good
        
        // Save session ID for conversation continuity
        if (result.sessionId) {
          setSessionId(result.sessionId);
          // Persist session ID to localStorage for page refreshes
          localStorage.setItem('agentV2SessionId', result.sessionId);
        }
        
        if (result.message) {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: result.message
          }]);
        } else if (result.confirmRequired) {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `⚠️ Confirmation required: ${result.message || result.reason || 'This action needs your approval.'}`
          }]);
        } else if (result.error) {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `Error: ${result.error}`
          }]);
        } else {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: 'Task completed.'
          }]);
        }
      } catch (error: any) {
        console.error('[Agent V2] Request failed:', error);
        
        // Check if it's a network error vs application error
        const isNetworkError = error.name === 'AbortError' || 
                              error.message?.includes('fetch') || 
                              error.message?.includes('network') ||
                              error.message?.includes('Failed to fetch');
        
        // Retry logic with exponential backoff
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          const delay = Math.min(1000 * Math.pow(1.5, retryCountRef.current), 10000);
          console.log(`[Agent V2] Retrying... attempt ${retryCountRef.current}/${maxRetries} in ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return attemptRequest();
        }
        
        // All retries failed
        setConnectionError(true);
        if (isNetworkError) {
          setConnectionStatus('disconnected');
          attemptReconnection();
        }
        
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: isNetworkError 
            ? '⚠️ Connection lost. Attempting to reconnect automatically...'
            : `Error: ${error.message || 'Failed to process request. Please try again.'}`
        }]);
      }
    };

    await attemptRequest();
    setIsLoading(false);
  };

  const handleRetry = () => {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      // Remove the error message
      setMessages(prev => prev.slice(0, -1));
      retryCountRef.current = 0;
      handleSendMessage(lastUserMessage.content);
    }
  };

  const handleNewSession = () => {
    setSessionId(null);
    setMessages([]);
    setConnectionError(false);
    retryCountRef.current = 0;
    localStorage.removeItem('agentV2SessionId');
  };

  // Connection status indicator component
  const ConnectionIndicator = () => {
    const statusConfig = {
      connected: { color: 'bg-green-500', text: 'Connected', icon: Wifi },
      checking: { color: 'bg-yellow-500 animate-pulse', text: 'Checking...', icon: Wifi },
      disconnected: { color: 'bg-red-500', text: 'Disconnected', icon: WifiOff },
      reconnecting: { color: 'bg-yellow-500 animate-pulse', text: 'Reconnecting...', icon: RefreshCw }
    };
    const config = statusConfig[connectionStatus];
    const Icon = config.icon;
    
    return (
      <div className="flex items-center gap-1 text-xs">
        <span className={`w-2 h-2 rounded-full ${config.color}`}></span>
        <Icon className={`w-3 h-3 ${connectionStatus === 'reconnecting' ? 'animate-spin' : ''}`} />
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 p-3 rounded-xl shadow-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                Agent V2 - Enhanced CRM Assistant
              </h1>
              <p className="text-gray-600 mt-1">
                Powered by ToolBus Architecture with Advanced Safety Features
              </p>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border border-violet-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-violet-100 p-2 rounded-lg">
                <Shield className="w-6 h-6 text-violet-600" />
              </div>
              <h3 className="font-semibold text-lg">Enhanced Safety</h3>
            </div>
            <p className="text-gray-600 text-sm">
              Built-in guardrails with scope-based authorization and confirmation gates for all risky operations.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-purple-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-lg">Smart Tool Execution</h3>
            </div>
            <p className="text-gray-600 text-sm">
              10 production-ready tools with Zod validation: search, create, update, email, calendar, and invoices.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-pink-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-pink-100 p-2 rounded-lg">
                <Sparkles className="w-6 h-6 text-pink-600" />
              </div>
              <h3 className="font-semibold text-lg">Full Audit Trail</h3>
            </div>
            <p className="text-gray-600 text-sm">
              Complete session logging with tool calls, arguments, results, and performance metrics.
            </p>
          </div>
        </div>

        {/* Safety Modes Info */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-200">
          <h3 className="font-semibold text-lg mb-4">Safety Modes</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-semibold text-green-700 mb-1">Read-Only Mode</h4>
              <p className="text-sm text-gray-600">
                Only search and list operations. No modifications allowed.
              </p>
            </div>
            <div className="border-l-4 border-amber-500 pl-4">
              <h4 className="font-semibold text-amber-700 mb-1">Auto-Safe Mode (Default)</h4>
              <p className="text-sm text-gray-600">
                Medium-risk actions require confirmation. High-risk always confirm.
              </p>
            </div>
            <div className="border-l-4 border-red-500 pl-4">
              <h4 className="font-semibold text-red-700 mb-1">Auto-Full Mode</h4>
              <p className="text-sm text-gray-600">
                High autonomy. Only high-risk actions require confirmation.
              </p>
            </div>
          </div>
        </div>

        {/* Available Tools */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-200">
          <h3 className="font-semibold text-lg mb-4">Available Tools (10 Total)</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-green-600 mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Read-Only (Low Risk)
              </h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Search clients</li>
                <li>• List leads</li>
                <li>• List invoices</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-amber-600 mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                Safe Writes (Medium Risk)
              </h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Draft email</li>
                <li>• Create calendar event</li>
                <li>• Update client info</li>
                <li>• Create invoice draft</li>
              </ul>
            </div>
            <div className="md:col-span-2">
              <h4 className="font-medium text-red-600 mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                High Risk (Always Confirm)
              </h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Send email</li>
                <li>• Send invoice via email</li>
                <li>• Mark invoice as paid</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl shadow-md p-6 text-white mb-8">
          <h3 className="font-semibold text-lg mb-3">How to Use</h3>
          <ol className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="font-bold">1.</span>
              <span>Click the chat button in the bottom-right corner to start a conversation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">2.</span>
              <span>Ask the agent to perform tasks like "Search for client John Doe" or "Create an invoice for..."</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">3.</span>
              <span>Review confirmation modals for medium and high-risk actions before they execute</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">4.</span>
              <span>Check the Agent Console (coming soon) to view audit logs and session history</span>
            </li>
          </ol>
        </div>

        {/* Note about V1 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <strong>Note:</strong> This is Agent V2 with enhanced safety features. The legacy CRM Assistant (V1) remains available during the migration period.
        </div>
        </div>

        {/* Floating Chat Button */}
        {!showChat && (
          <button
            onClick={() => setShowChat(true)}
            className="fixed bottom-6 right-6 bg-gradient-to-r from-violet-600 to-purple-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 z-50"
          >
            <MessageSquare className="w-6 h-6" />
          </button>
        )}

        {/* Chat Interface */}
        {showChat && (
          <div className="fixed bottom-6 right-6 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col z-50" style={{ height: '500px' }}>
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white p-4 rounded-t-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-semibold">Agent V2 Assistant</h3>
                <ConnectionIndicator />
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleNewSession}
                  className="hover:bg-white/20 p-1 rounded transition-colors"
                  title="New conversation"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowChat(false)}
                  className="hover:bg-white/20 p-1 rounded transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Connection Warning Banner */}
            {connectionStatus === 'disconnected' && (
              <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center justify-between">
                <span className="text-red-700 text-xs">Connection lost</span>
                <button 
                  onClick={attemptReconnection}
                  className="text-red-700 text-xs underline hover:text-red-900"
                >
                  Reconnect
                </button>
              </div>
            )}
            {connectionStatus === 'reconnecting' && (
              <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin text-yellow-700" />
                <span className="text-yellow-700 text-xs">Reconnecting...</span>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">
                  <Sparkles className="w-12 h-12 mx-auto mb-3 text-violet-400" />
                  <p className="text-sm">Ask me anything!</p>
                  <p className="text-xs mt-2">Try: "Search for clients" or "Create an invoice"</p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 p-3 rounded-lg">
                    <Loader2 className="w-5 h-5 text-violet-600 animate-spin" />
                  </div>
                </div>
              )}
              {connectionError && !isLoading && (
                <div className="flex justify-center">
                  <button
                    onClick={handleRetry}
                    className="flex items-center gap-2 text-violet-600 hover:text-violet-700 text-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retry
                  </button>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type your command..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                  disabled={isLoading}
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={isLoading || !message.trim()}
                  className="bg-gradient-to-r from-violet-600 to-purple-600 text-white p-2 rounded-lg hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Agent disabled */}
      </div>
    </AdminLayout>
  );
};

export default AgentV2Page;

/**
 * Enhanced CRM Operations Assistant with Agent V2 Support
 * 
 * Features:
 * - Agent V2 integration with ToolBus architecture
 * - Confirmation modal for high-risk actions
 * - Session persistence
 * - Tool call transparency
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  Bot, 
  User, 
  Minimize2, 
  Maximize2, 
  X, 
  Loader2,
  AlertCircle,
  Zap,
  Shield,
  CheckCircle
} from 'lucide-react';
import { AgentConfirmModal, ConfirmationData } from './AgentConfirmModal';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  loading?: boolean;
  toolCalls?: ToolCallResult[];
}

interface ToolCallResult {
  tool: string;
  args: any;
  result: any;
  ok: boolean;
  error?: string;
}

interface CRMOperationsAssistantV2Props {
  onClose?: () => void;
  useV2?: boolean; // Toggle between V1 and V2
}

const CRMOperationsAssistantV2: React.FC<CRMOperationsAssistantV2Props> = ({ 
  onClose,
  useV2 = true // Default to V2
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: useV2 
        ? "Hello! I'm your CRM Assistant (Agent V2 - Enhanced Safety). I can help you:\n\n🔍 Search clients & leads\n📧 Draft and send emails\n📅 Create appointments\n💰 Create and send invoices\n🔐 All actions are protected with confirmation gates for your safety!\n\nWhat would you like me to help you with?"
        : "Hello! I'm your CRM Operations Assistant. How can I help you today?",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // Agent V2 confirmation flow
  const [confirmData, setConfirmData] = useState<ConfirmationData | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string>('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  const handleSendMessage = async (confirmed = false) => {
    const message = confirmed ? pendingMessage : inputValue.trim();
    
    if (!message && !confirmed) return;

    if (!confirmed) {
      // Add user message to UI
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: message,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, userMessage]);
      setInputValue('');
      setPendingMessage(message);
    }

    // Add loading message
    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      loading: true
    };

    setMessages(prev => [...prev, loadingMessage]);
    setIsLoading(true);
    setError(null);

    try {
      if (useV2) {
        // Agent V2 API call
        const response = await fetch('/api/agent/v2/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            sessionId,
            mode: 'auto_safe', // Use safe mode by default
            ...(confirmed && confirmData?.args && {
              // Re-send with confirmation flag
              confirmedArgs: { ...confirmData.args, __confirm: true }
            })
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || errorData.message || 'Failed to get response');
        }

        const data = await response.json();

        // Update session ID
        if (data.sessionId) {
          setSessionId(data.sessionId);
        }

        // Handle confirmation required
        if (data.confirmRequired) {
          setConfirmData({
            tool: data.tool,
            args: data.args,
            reason: data.reason,
            message: data.message
          });

          // Remove loading message and add confirmation prompt
          setMessages(prev => prev.filter(m => !m.loading));
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: `⚠️ ${data.message}\n\nThis action requires your confirmation before proceeding.`,
            timestamp: new Date()
          }]);
          setIsLoading(false);
          return;
        }

        // Normal response
        setMessages(prev => prev.filter(m => !m.loading));
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
          toolCalls: data.toolCalls
        }]);

        // Clear confirmation data if it was a confirmed retry
        if (confirmed) {
          setConfirmData(null);
          setPendingMessage('');
        }

      } else {
        // Legacy V1 API call (keep for fallback)
        throw new Error('V1 API not implemented in this component');
      }

    } catch (err: any) {
      console.error('Chat error:', err);
      setError(err.message || 'Failed to send message');
      
      setMessages(prev => prev.filter(m => !m.loading));
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ Error: ${err.message}\n\nPlease try again or rephrase your request.`,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    setConfirmData(null);
    handleSendMessage(true);
  };

  const handleCancel = () => {
    setConfirmData(null);
    setPendingMessage('');
    
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'assistant',
      content: '❌ Action cancelled. How else can I help you?',
      timestamp: new Date()
    }]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-violet-600 hover:bg-violet-700 text-white rounded-full p-4 shadow-lg transition-all hover:scale-110 z-50"
      >
        <MessageSquare className="w-6 h-6" />
      </button>
    );
  }

  return (
    <>
      <div className={`fixed bottom-6 right-6 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 transition-all ${
        isMinimized ? 'w-80' : 'w-96 h-[600px]'
      }`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white p-4 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold">CRM Assistant</h3>
              <div className="flex items-center gap-1 text-xs text-violet-200">
                {useV2 ? (
                  <>
                    <Shield className="w-3 h-3" />
                    <span>V2 - Enhanced Safety</span>
                  </>
                ) : (
                  <span>V1 - Legacy</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="hover:bg-white/20 p-1.5 rounded transition-colors"
            >
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                if (onClose) onClose();
              }}
              className="hover:bg-white/20 p-1.5 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <div className="h-[440px] overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="bg-violet-100 p-2 rounded-full h-fit">
                      <Bot className="w-4 h-4 text-violet-600" />
                    </div>
                  )}
                  
                  <div className={`max-w-[80%] ${message.role === 'user' ? 'order-first' : ''}`}>
                    <div className={`rounded-lg p-3 ${
                      message.role === 'user' 
                        ? 'bg-violet-600 text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      {message.loading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Thinking...</span>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      )}
                    </div>
                    
                    {/* Tool calls indicator */}
                    {message.toolCalls && message.toolCalls.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {message.toolCalls.map((call, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-gray-500">
                            {call.ok ? (
                              <CheckCircle className="w-3 h-3 text-green-500" />
                            ) : (
                              <AlertCircle className="w-3 h-3 text-red-500" />
                            )}
                            <span>{call.tool.replace(/_/g, ' ')}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-400 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>

                  {message.role === 'user' && (
                    <div className="bg-violet-600 p-2 rounded-full h-fit">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Error Display */}
            {error && (
              <div className="px-4 py-2 bg-red-50 border-t border-red-200">
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={isLoading || !inputValue.trim()}
                  className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Confirmation Modal */}
      <AgentConfirmModal
        isOpen={confirmData !== null}
        data={confirmData}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  );
};

export default CRMOperationsAssistantV2;

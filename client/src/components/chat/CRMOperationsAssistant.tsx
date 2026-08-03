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
  Database,
  Mail,
  Calendar,
  UserPlus,
  FileText,
  Settings
} from 'lucide-react';
import { PlanModal } from '../PlanModal';
import { usePlanRunner } from '../../hooks/usePlanRunner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  loading?: boolean;
  actionPerformed?: boolean;
}

interface CRMAction {
  type: 'email' | 'booking' | 'client' | 'invoice' | 'data' | 'calendar';
  action: string;
  data?: any;
}

interface CRMOperationsAssistantProps {
  assistantId?: string;
  onCRMAction?: (action: CRMAction) => void;
}

const CRMOperationsAssistant: React.FC<CRMOperationsAssistantProps> = ({ 
  assistantId = 'asst_crm_operations_v1',
  onCRMAction 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm your Self-Planning CRM Operations Assistant. I can help you:\n\n📧 Send booking confirmations & replies\n📅 Manage appointments & schedules  \n👥 Create & update client records\n💰 Generate & send invoices\n📊 Run reports & analyze data\n⚡ Automate complex multi-step tasks\n🧠 Plan and execute complex workflows\n\nFor complex requests, I'll create a plan and ask for your confirmation before proceeding. What would you like me to help you with today?",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  
  // Planning system integration
  const { 
    pendingPlan, 
    showPlanModal, 
    executingPlan, 
    sendChatMessage, 
    executePlan, 
    cancelPlan 
  } = usePlanRunner();
  
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

  const createThread = async () => {
    try {
      const response = await fetch('/functions/v1/openai-create-thread', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create thread');
      }
      
      const data = await response.json();
      return data.threadId;
    } catch (error) {
      // console.error removed
      throw error;
    }
  };

  const sendMessage = async (message: string, currentThreadId: string) => {
    try {
      // Try new planning-enabled CRM agent first
      const complexKeywords = ['then', 'and', 'after', 'multiple', 'all clients', 'batch', 'everyone'];
      const usePlanner = complexKeywords.some(keyword => message.toLowerCase().includes(keyword));
      
      const response = await sendChatMessage(message, usePlanner);
      
      if (response.type === 'plan_confirmation_required') {
        return {
          response: `I've created a plan for your request: "${response.plan?.explanation}". Please review the execution plan and confirm to proceed.`,
          actionPerformed: false
        };
      }
      
      return {
        response: response.response || 'Task completed successfully.',
        actionPerformed: response.type === 'plan_executed'
      };
      
    } catch (error) {
      // Fallback to original OpenAI assistant
      try {
        const response = await fetch('/functions/v1/openai-send-crm-message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            threadId: currentThreadId,
            message,
            assistantId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to send message');
        }

        const data = await response.json();
        return data;
      } catch (fallbackError) {
        throw error; // Re-throw the original error
      }
    }
  };

  const handlePlanConfirm = async () => {
    if (!pendingPlan) return;

    setIsLoading(true);
    try {
      const result = await executePlan(pendingPlan);
      
      const assistantMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: result.response || 'Plan executed successfully.',
        timestamp: new Date(),
        actionPerformed: true
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Plan execution failed';
      setError(errorMessage);
      
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Plan execution failed: ${errorMessage}`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      loading: true
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      let currentThreadId = threadId;
      
      // Create thread if it doesn't exist
      if (!currentThreadId) {
        currentThreadId = await createThread();
        setThreadId(currentThreadId);
      }

      // Send message to CRM Operations Assistant
      const response = await sendMessage(inputValue.trim(), currentThreadId);

      // Remove loading message and add actual response
      setMessages(prev => {
        const filtered = prev.filter(msg => !msg.loading);
        const newMessage: Message = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: response.response,
          timestamp: new Date(),
          actionPerformed: response.actionPerformed || false
        };
        return [...filtered, newMessage];
      });

      // Handle CRM actions if present
      if (response.crmAction && onCRMAction) {
        onCRMAction(response.crmAction);
      }

    } catch (error) {
      // console.error removed
      setError('Sorry, I encountered an error. Please try again.');
      
      // Remove loading message and add error message
      setMessages(prev => {
        const filtered = prev.filter(msg => !msg.loading);
        return [...filtered, {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again later.',
          timestamp: new Date()
        }];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const quickActions = [
    { icon: Mail, label: 'Reply to emails', command: 'Help me reply to pending client emails' },
    { icon: Calendar, label: 'Send booking confirmations', command: 'Send booking confirmations for today\'s appointments' },
    { icon: UserPlus, label: 'Add new client', command: 'Help me add a new client to the system' },
    { icon: FileText, label: 'Generate invoice', command: 'Create and send an invoice for recent bookings' },
  ];

  if (!isOpen) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full p-4 shadow-lg transition-all duration-200 hover:scale-105 group"
          title="Open CRM Operations Assistant"
        >
          <div className="relative">
            <Bot className="h-6 w-6" />
            <Zap className="h-3 w-3 absolute -top-1 -right-1 text-yellow-300 group-hover:animate-pulse" />
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed top-4 right-4 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 transition-all duration-300 ${
      isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Bot className="h-5 w-5 text-blue-600" />
            <Zap className="h-2 w-2 absolute -top-0.5 -right-0.5 text-yellow-500" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">CRM Operations Assistant</h3>
            <p className="text-xs text-gray-500">AI-powered business automation</p>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-blue-100 rounded"
            title={isMinimized ? 'Maximize' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-blue-100 rounded"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Quick Actions */}
          <div className="p-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-medium text-gray-600 mb-2">Quick Actions:</p>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => setInputValue(action.command)}
                  className="flex items-center space-x-1 text-xs p-2 bg-white hover:bg-blue-50 border border-gray-200 rounded text-left transition-colors"
                  title={action.label}
                >
                  <action.icon className="h-3 w-3 text-blue-600" />
                  <span className="truncate">{action.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 h-[400px]">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start space-x-2 max-w-[85%] ${
                  message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.role === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gradient-to-br from-blue-100 to-purple-100 text-blue-600'
                  }`}>
                    {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={`rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : message.actionPerformed 
                      ? 'bg-green-50 text-gray-900 border border-green-200'
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    {message.loading ? (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Processing...</span>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        {message.actionPerformed && (
                          <div className="flex items-center mt-2 text-xs text-green-600">
                            <Zap className="h-3 w-3 mr-1" />
                            Action performed
                          </div>
                        )}
                        <p className={`text-xs mt-1 ${
                          message.role === 'user' ? 'text-blue-200' : 'text-gray-500'
                        }`}>
                          {formatTime(message.timestamp)}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mx-4 mb-2 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700 text-sm">
              <AlertCircle className="h-4 w-4 mr-2" />
              {error}
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me to manage your CRM tasks..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg px-3 py-2 transition-colors"
                title="Send message"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              <strong>Try:</strong> "Reply to John's email" • "Book appointment for tomorrow" • "Generate this week's invoices"
            </p>
          </div>
        </>
      )}
      
      {/* Planning Modal */}
      <PlanModal
        isOpen={showPlanModal}
        plan={pendingPlan}
        onConfirm={handlePlanConfirm}
        onCancel={cancelPlan}
        loading={executingPlan}
      />
    </div>
  );
};

export default CRMOperationsAssistant;

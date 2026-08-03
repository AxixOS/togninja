import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Loader2,
  AlertCircle,
  Zap,
  Mail,
  Calendar,
  UserPlus,
  FileText,
  Minimize2,
  Maximize2
} from 'lucide-react';

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

interface EmbeddedCRMChatProps {
  assistantId?: string;
  onCRMAction?: (action: CRMAction) => void;
  height?: string;
  title?: string;
  className?: string;
}

const EmbeddedCRMChat: React.FC<EmbeddedCRMChatProps> = ({ 
  assistantId = 'asst_CH4vIbZPs7gUD36Lxf7vlfIV',
  onCRMAction,
  height = '600px',
  title = 'CRM Operations Assistant',
  className = ''
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hello! I'm your ${title}. I can help you:\n\n📧 Send booking confirmations & replies\n📅 Manage appointments & schedules  \n👥 Create & update client records\n💰 Generate & send invoices\n📊 Run reports & analyze data\n⚡ Automate routine tasks\n\nWhat would you like me to help you with today?`,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isMinimized]);

  const createThread = async () => {
    // No thread creation needed for AI agent system
    return 'agent-session-' + Date.now();
  };

  const sendMessage = async (message: string, currentThreadId: string) => {
    try {
      // Connect to our CRM Agent system with Phase B write capabilities
      const response = await fetch('/api/crm/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          threadId: currentThreadId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
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
      const response = await sendMessage(inputValue.trim(), currentThreadId!);

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

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden ${className}`} style={{ height: isMinimized ? '64px' : height }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <Zap className="h-3 w-3 absolute -top-1 -right-1 text-yellow-500" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 pt-2">{title}</h3>
            <p className="text-sm text-gray-600">AI-powered business automation</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
            title={isMinimized ? 'Maximize' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 className="h-5 w-5 text-gray-600" /> : <Minimize2 className="h-5 w-5 text-gray-600" />}
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ height: `calc(${height} - 140px)` }}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start space-x-3 max-w-[85%] ${
                  message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}>
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    message.role === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gradient-to-br from-blue-100 to-purple-100 text-blue-600'
                  }`}>
                    {message.role === 'user' ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                  </div>
                  <div className={`rounded-xl p-4 ${
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
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        {message.actionPerformed && (
                          <div className="flex items-center mt-2 text-xs text-green-600">
                            <Zap className="h-3 w-3 mr-1" />
                            Action performed
                          </div>
                        )}
                        <p className={`text-xs mt-2 ${
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
            <div className="mx-4 mb-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700 text-sm">
              <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex space-x-3">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me to manage your CRM tasks..."
                className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg px-4 py-3 transition-colors flex items-center justify-center"
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
    </div>
  );
};

export default EmbeddedCRMChat;

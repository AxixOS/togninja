import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Bot,
  Brain,
  Zap,
  TrendingUp,
  AlertTriangle,
  Clock,
  User,
  MessageSquare,
  BarChart3,
  Lightbulb,
  Target,
  Filter,
  ArrowRight,
  RefreshCw,
  Settings,
  X,
  Eye,
  Mail,
  MailOpen,
  Star,
  FileText
} from 'lucide-react';
import { EmailMessage, EmailAccount } from '../../api/inbox';

interface EmailAIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  messages: EmailMessage[];
  accounts: EmailAccount[];
  onApplyFilter?: (filter: any) => void;
  onCreateRule?: (rule: any) => void;
  onSuggestReply?: (messageId: string, reply: string) => void;
}

interface AIInsight {
  id: string;
  type: 'priority' | 'sentiment' | 'action' | 'trend' | 'anomaly' | 'suggestion';
  title: string;
  description: string;
  confidence: number;
  data?: any;
  actionable: boolean;
}

interface SmartSuggestion {
  id: string;
  type: 'rule' | 'template' | 'filter' | 'automation' | 'response';
  title: string;
  description: string;
  implementation: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
}

const EmailAIAssistant: React.FC<EmailAIAssistantProps> = ({
  isOpen,
  onClose,
  messages,
  accounts,
  onApplyFilter,
  onCreateRule,
  onSuggestReply
}) => {
  const [activeTab, setActiveTab] = useState<'insights' | 'suggestions' | 'analytics' | 'automation'>('insights');
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingMessage, setProcessingMessage] = useState<string>('');
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  useEffect(() => {
    if (isOpen && messages.length > 0) {
      generateInsights();
      generateSuggestions();
      generateAnalytics();
    }
  }, [isOpen, messages]);

  const generateInsights = async () => {
    setLoading(true);
    setProcessingMessage('Analyzing email patterns...');

    try {
      // Simulate AI analysis - in real implementation, this would call an AI service
      const newInsights: AIInsight[] = [];

      // Priority analysis
      const highPriorityMessages = messages.filter(m => m.importance === 'high');
      if (highPriorityMessages.length > 0) {
        newInsights.push({
          id: 'priority-1',
          type: 'priority',
          title: `${highPriorityMessages.length} High Priority Messages`,
          description: 'You have several high-priority messages that may need immediate attention.',
          confidence: 0.9,
          data: { count: highPriorityMessages.length, messages: highPriorityMessages },
          actionable: true
        });
      }

      // Sentiment analysis
      const negativeSentimentMessages = messages.filter(m => 
        m.subject?.toLowerCase().includes('urgent') || 
        m.subject?.toLowerCase().includes('problem') ||
        m.subject?.toLowerCase().includes('issue')
      );
      if (negativeSentimentMessages.length > 0) {
        newInsights.push({
          id: 'sentiment-1',
          type: 'sentiment',
          title: 'Potential Issues Detected',
          description: `${negativeSentimentMessages.length} messages contain keywords indicating potential issues or urgency.`,
          confidence: 0.75,
          data: { messages: negativeSentimentMessages },
          actionable: true
        });
      }

      // Action required analysis
      const actionRequiredMessages = messages.filter(m => 
        m.subject?.toLowerCase().includes('action') ||
        m.subject?.toLowerCase().includes('respond') ||
        m.subject?.toLowerCase().includes('reply')
      );
      if (actionRequiredMessages.length > 0) {
        newInsights.push({
          id: 'action-1',
          type: 'action',
          title: 'Action Required',
          description: `${actionRequiredMessages.length} messages appear to require your response or action.`,
          confidence: 0.8,
          data: { messages: actionRequiredMessages },
          actionable: true
        });
      }

      // Trend analysis
      const todayMessages = messages.filter(m => {
        const messageDate = new Date(m.date_received);
        const today = new Date();
        return messageDate.toDateString() === today.toDateString();
      });
      
      if (todayMessages.length > 0) {
        const avgDaily = messages.length / 7; // Assume 7 days of data
        const trendDirection = todayMessages.length > avgDaily ? 'up' : 'down';
        
        newInsights.push({
          id: 'trend-1',
          type: 'trend',
          title: `Email Volume Trending ${trendDirection === 'up' ? 'Up' : 'Down'}`,
          description: `Today's email volume (${todayMessages.length}) is ${trendDirection === 'up' ? 'above' : 'below'} your daily average (${Math.round(avgDaily)}).`,
          confidence: 0.85,
          data: { today: todayMessages.length, average: avgDaily },
          actionable: false
        });
      }

      // Anomaly detection
      const unreadMessages = messages.filter(m => !m.is_read);
      if (unreadMessages.length > 20) {
        newInsights.push({
          id: 'anomaly-1',
          type: 'anomaly',
          title: 'High Unread Count',
          description: `You have ${unreadMessages.length} unread messages, which is unusually high.`,
          confidence: 0.9,
          data: { count: unreadMessages.length },
          actionable: true
        });
      }

      setInsights(newInsights);
    } catch (error) {
      // console.error removed
    } finally {
      setLoading(false);
      setProcessingMessage('');
    }
  };

  const generateSuggestions = async () => {
    setProcessingMessage('Generating smart suggestions...');

    try {
      const newSuggestions: SmartSuggestion[] = [];

      // Auto-archive suggestions
      const oldMessages = messages.filter(m => {
        const messageDate = new Date(m.date_received);
        const monthsAgo = new Date();
        monthsAgo.setMonth(monthsAgo.getMonth() - 3);
        return messageDate < monthsAgo && m.is_read;
      });

      if (oldMessages.length > 10) {
        newSuggestions.push({
          id: 'auto-archive',
          type: 'automation',
          title: 'Auto-Archive Old Messages',
          description: `Automatically archive ${oldMessages.length} read messages older than 3 months to keep your inbox clean.`,
          implementation: 'Create a rule to auto-archive messages older than 90 days',
          impact: 'medium',
          effort: 'low'
        });
      }

      // Sender-based filtering
      const senderCounts = messages.reduce((acc, message) => {
        const sender = message.from_email;
        acc[sender] = (acc[sender] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topSenders = Object.entries(senderCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);

      topSenders.forEach(([sender, count]) => {
        if (count > 5) {
          newSuggestions.push({
            id: `filter-${sender}`,
            type: 'filter',
            title: `Create Filter for ${sender}`,
            description: `You've received ${count} messages from ${sender}. Consider creating a filter to automatically organize these messages.`,
            implementation: `Create a filter rule for emails from ${sender}`,
            impact: 'medium',
            effort: 'low'
          });
        }
      });

      // Template suggestions
      const commonSubjects = messages.reduce((acc, message) => {
        if (message.subject) {
          const words = message.subject.toLowerCase().split(' ');
          words.forEach(word => {
            if (word.length > 3) {
              acc[word] = (acc[word] || 0) + 1;
            }
          });
        }
        return acc;
      }, {} as Record<string, number>);

      const frequentTerms = Object.entries(commonSubjects)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3);

      frequentTerms.forEach(([term, count]) => {
        if (count > 3) {
          newSuggestions.push({
            id: `template-${term}`,
            type: 'template',
            title: `Create Template for "${term}" Emails`,
            description: `You frequently receive emails about "${term}" (${count} times). A template could help you respond faster.`,
            implementation: `Create an email template for ${term}-related responses`,
            impact: 'high',
            effort: 'medium'
          });
        }
      });

      setSuggestions(newSuggestions);
    } catch (error) {
      // console.error removed
    }
  };

  const generateAnalytics = async () => {
    setProcessingMessage('Computing analytics...');

    try {
      const analytics = {
        totalMessages: messages.length,
        unreadCount: messages.filter(m => !m.is_read).length,
        starredCount: messages.filter(m => m.is_starred).length,
        todayCount: messages.filter(m => {
          const messageDate = new Date(m.date_received);
          const today = new Date();
          return messageDate.toDateString() === today.toDateString();
        }).length,
        weeklyTrend: calculateWeeklyTrend(),
        topSenders: calculateTopSenders(),
        responseTime: calculateAverageResponseTime(),
        timeDistribution: calculateTimeDistribution()
      };

      setAnalyticsData(analytics);
    } catch (error) {
      // console.error removed
    }
  };

  const calculateWeeklyTrend = () => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toDateString();
    }).reverse();

    return days.map(day => {
      const count = messages.filter(m => new Date(m.date_received).toDateString() === day).length;
      return { day: day.slice(0, 3), count };
    });
  };

  const calculateTopSenders = () => {
    const senderCounts = messages.reduce((acc, message) => {
      const sender = message.from_email;
      acc[sender] = (acc[sender] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(senderCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([sender, count]) => ({ sender, count }));
  };

  const calculateAverageResponseTime = () => {
    // Simplified calculation - in reality, this would track actual response patterns
    return Math.floor(Math.random() * 24) + 1; // 1-24 hours
  };

  const calculateTimeDistribution = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    return hours.map(hour => {
      const count = messages.filter(m => {
        const messageHour = new Date(m.date_received).getHours();
        return messageHour === hour;
      }).length;
      return { hour, count };
    });
  };

  const handleApplyInsight = (insight: AIInsight) => {
    switch (insight.type) {
      case 'priority':
        onApplyFilter?.({ priority: 'high' });
        break;
      case 'sentiment':
        onApplyFilter?.({ keywords: ['urgent', 'problem', 'issue'] });
        break;
      case 'action':
        onApplyFilter?.({ keywords: ['action', 'respond', 'reply'] });
        break;
      case 'anomaly':
        onApplyFilter?.({ is_read: false });
        break;
    }
  };

  const handleImplementSuggestion = (suggestion: SmartSuggestion) => {
    switch (suggestion.type) {
      case 'automation':
      case 'filter':
        onCreateRule?.({
          name: suggestion.title,
          description: suggestion.description,
          implementation: suggestion.implementation
        });
        break;
      case 'template':
        // Handle template creation
        break;
    }
  };

  const renderInsights = () => (
    <div className="space-y-4">
      {insights.map((insight) => (
        <motion.div
          key={insight.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className={`p-2 rounded-lg ${
                insight.type === 'priority' ? 'bg-red-100 text-red-600' :
                insight.type === 'sentiment' ? 'bg-orange-100 text-orange-600' :
                insight.type === 'action' ? 'bg-blue-100 text-blue-600' :
                insight.type === 'trend' ? 'bg-green-100 text-green-600' :
                insight.type === 'anomaly' ? 'bg-purple-100 text-purple-600' :
                'bg-gray-100 text-gray-600'
              }`}>
                {insight.type === 'priority' && <AlertTriangle size={16} />}
                {insight.type === 'sentiment' && <Brain size={16} />}
                {insight.type === 'action' && <Target size={16} />}
                {insight.type === 'trend' && <TrendingUp size={16} />}
                {insight.type === 'anomaly' && <Eye size={16} />}
                {insight.type === 'suggestion' && <Lightbulb size={16} />}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{insight.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                <div className="flex items-center mt-2 space-x-4">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-gray-500">
                      {Math.round(insight.confidence * 100)}% confidence
                    </span>
                  </div>
                  {insight.actionable && (
                    <button
                      onClick={() => handleApplyInsight(insight)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Apply Filter
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );

  const renderSuggestions = () => (
    <div className="space-y-4">
      {suggestions.map((suggestion) => (
        <motion.div
          key={suggestion.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className={`p-2 rounded-lg ${
                suggestion.type === 'rule' ? 'bg-blue-100 text-blue-600' :
                suggestion.type === 'template' ? 'bg-green-100 text-green-600' :
                suggestion.type === 'filter' ? 'bg-purple-100 text-purple-600' :
                suggestion.type === 'automation' ? 'bg-orange-100 text-orange-600' :
                'bg-gray-100 text-gray-600'
              }`}>
                {suggestion.type === 'rule' && <Settings size={16} />}
                {suggestion.type === 'template' && <FileText size={16} />}
                {suggestion.type === 'filter' && <Filter size={16} />}
                {suggestion.type === 'automation' && <Zap size={16} />}
                {suggestion.type === 'response' && <MessageSquare size={16} />}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{suggestion.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{suggestion.description}</p>
                <div className="flex items-center mt-2 space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      suggestion.impact === 'high' ? 'bg-green-100 text-green-800' :
                      suggestion.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {suggestion.impact} impact
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      suggestion.effort === 'low' ? 'bg-green-100 text-green-800' :
                      suggestion.effort === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {suggestion.effort} effort
                    </span>
                  </div>
                  <button
                    onClick={() => handleImplementSuggestion(suggestion)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1"
                  >
                    <span>Implement</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      {analyticsData && (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">Total Messages</p>
                  <p className="text-2xl font-bold text-blue-900">{analyticsData.totalMessages}</p>
                </div>
                <Mail className="text-blue-600" size={24} />
              </div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600">Unread</p>
                  <p className="text-2xl font-bold text-orange-900">{analyticsData.unreadCount}</p>
                </div>
                <MailOpen className="text-orange-600" size={24} />
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Today</p>
                  <p className="text-2xl font-bold text-green-900">{analyticsData.todayCount}</p>
                </div>
                <Clock className="text-green-600" size={24} />
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600">Starred</p>
                  <p className="text-2xl font-bold text-purple-900">{analyticsData.starredCount}</p>
                </div>
                <Star className="text-purple-600" size={24} />
              </div>
            </div>
          </div>

          {/* Weekly Trend */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-4">Weekly Email Trend</h4>
            <div className="flex items-end space-x-2 h-32">
              {analyticsData.weeklyTrend.map((day: any, index: number) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div
                    className="bg-blue-500 rounded-t"
                    style={{
                      height: `${(day.count / Math.max(...analyticsData.weeklyTrend.map((d: any) => d.count))) * 100}%`,
                      minHeight: '4px'
                    }}
                  ></div>
                  <span className="text-xs text-gray-500 mt-2">{day.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Senders */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-4">Top Senders</h4>
            <div className="space-y-3">
              {analyticsData.topSenders.map((sender: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <User size={16} className="text-gray-600" />
                    </div>
                    <span className="text-sm text-gray-900 truncate max-w-xs">
                      {sender.sender}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-600">{sender.count}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-5/6 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bot className="text-blue-600" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">AI Email Assistant</h2>
                <p className="text-sm text-gray-600">Smart insights and suggestions for your inbox</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-white rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { key: 'insights', label: 'Insights', icon: Brain },
              { key: 'suggestions', label: 'Suggestions', icon: Lightbulb },
              { key: 'analytics', label: 'Analytics', icon: BarChart3 },
              { key: 'automation', label: 'Automation', icon: Zap }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <RefreshCw className="animate-spin mx-auto mb-4 text-blue-600" size={32} />
                <p className="text-gray-600">{processingMessage}</p>
              </div>
            </div>
          )}

          {!loading && (
            <>
              {activeTab === 'insights' && renderInsights()}
              {activeTab === 'suggestions' && renderSuggestions()}
              {activeTab === 'analytics' && renderAnalytics()}
              {activeTab === 'automation' && (
                <div className="text-center py-12">
                  <Zap className="mx-auto mb-4 text-gray-400" size={48} />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Automation Hub</h3>
                  <p className="text-gray-600">Advanced automation features coming soon...</p>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default EmailAIAssistant;

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Star,
  Archive,
  Trash2,
  Reply,
  Forward,
  MoreHorizontal,
  Search,
  Settings,
  Plus,
  Paperclip,
  Flag,
  Clock,
  User,
  CheckSquare,
  RefreshCw,
  Mail,
  MailOpen,
  AlertCircle,
  Folder,
  MessageSquare,
  FileText,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  X,
  Check,
  Copy,
  Share2,
  ExternalLink,
  Minimize,
  Maximize,
  BarChart3
} from 'lucide-react';
import EmailComposer from './EmailComposer';
import EmailAIAssistant from './EmailAIAssistant';
import EmailAccountConfig from './EmailAccountConfig';
import {
  listEmailAccounts,
  listEmailFolders,
  listEmailMessages,
  listEmailConversations,
  getEmailMessage,
  updateEmailMessage,
  bulkUpdateMessages,
  markAsRead,
  markAsUnread,
  starMessages,
  unstarMessages,
  archiveMessages,
  moveToFolder,
  addLabels,
  searchEmails,
  syncEmailAccount,
  EmailAccount,
  EmailFolder,
  EmailMessage,
  EmailConversation
} from '../../api/inbox';

// Advanced inbox component with all features
const NextGenInbox: React.FC = () => {
  // Core state
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [folders, setFolders] = useState<EmailFolder[]>([]);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [conversations, setConversations] = useState<EmailConversation[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [currentMessage, setCurrentMessage] = useState<EmailMessage | null>(null);
  const [currentConversation, setCurrentConversation] = useState<EmailConversation | null>(null);

  // UI state
  const [viewMode, setViewMode] = useState<'list' | 'conversation' | 'split'>('conversation');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [previewPaneVisible, setPreviewPaneVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const [filters, setFilters] = useState({
    unreadOnly: false,
    starredOnly: false,
    hasAttachments: false,
    importance: 'all' as 'all' | 'high' | 'normal' | 'low',
    dateRange: 'all' as 'all' | 'today' | 'week' | 'month',
    labels: [] as string[],
    assignedToMe: false
  });

  // Compose/Reply state
  const [composing, setComposing] = useState(false);
  const [replyingTo, setReplyingTo] = useState<EmailMessage | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<EmailMessage | null>(null);
  // Advanced features
  const [bulkActionMode, setBulkActionMode] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [aiInsightsEnabled, setAiInsightsEnabled] = useState(true);
  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [accountConfigOpen, setAccountConfigOpen] = useState(false);

  // Load initial data
  useEffect(() => {
    loadEmailData();
  }, []);

  const loadEmailData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [accountsData, foldersData] = await Promise.all([
        listEmailAccounts(),
        selectedAccount ? listEmailFolders(selectedAccount) : Promise.resolve([])
      ]);

      setAccounts(accountsData);
      
      if (accountsData.length > 0 && !selectedAccount) {
        const defaultAccount = accountsData.find(acc => acc.is_default) || accountsData[0];
        setSelectedAccount(defaultAccount.id);
      }

      if (foldersData.length > 0) {
        setFolders(foldersData);
        if (!selectedFolder) {
          const inboxFolder = foldersData.find(f => f.folder_type === 'inbox');
          if (inboxFolder) setSelectedFolder(inboxFolder.id);
        }
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load messages when account/folder changes
  useEffect(() => {
    if (selectedAccount && selectedFolder) {
      loadMessages();
    }
  }, [selectedAccount, selectedFolder, filters]);

  const loadMessages = async () => {
    if (!selectedAccount || !selectedFolder) return;

    try {
      setLoading(true);

      const filterParams = {
        isRead: filters.unreadOnly ? false : undefined,
        isStarred: filters.starredOnly ? true : undefined,
        hasAttachments: filters.hasAttachments ? true : undefined,
        labels: filters.labels.length > 0 ? filters.labels : undefined,
        assignedTo: filters.assignedToMe ? 'current-user' : undefined, // Would need actual user ID
        search: searchQuery || undefined,
        limit: 50
      };

      const messagesData = await listEmailMessages(selectedAccount, selectedFolder, filterParams);
      setMessages(messagesData);

      // Load conversations if in conversation mode
      if (viewMode === 'conversation') {
        const conversationsData = await listEmailConversations(selectedAccount, {
          search: searchQuery || undefined,
          limit: 50
        });
        setConversations(conversationsData);
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Sync emails
  const handleSync = async () => {
    if (!selectedAccount || syncing) return;

    try {
      setSyncing(true);
      await syncEmailAccount(selectedAccount);
      await loadMessages();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  // Message selection
  const handleMessageSelect = (messageId: string, selected: boolean) => {
    if (selected) {
      setSelectedMessages(prev => [...prev, messageId]);
    } else {
      setSelectedMessages(prev => prev.filter(id => id !== messageId));
    }
  };

  const handleSelectAll = () => {
    const allSelected = selectedMessages.length === messages.length;
    setSelectedMessages(allSelected ? [] : messages.map(m => m.id));
  };

  // Bulk actions
  const handleBulkAction = async (action: string) => {
    if (selectedMessages.length === 0) return;

    try {
      switch (action) {
        case 'mark-read':
          await markAsRead(selectedMessages);
          break;
        case 'mark-unread':
          await markAsUnread(selectedMessages);
          break;
        case 'star':
          await starMessages(selectedMessages);
          break;
        case 'unstar':
          await unstarMessages(selectedMessages);
          break;
        case 'archive':
          await archiveMessages(selectedMessages);
          break;
        case 'delete':
          await bulkUpdateMessages(selectedMessages, { is_deleted: true });
          break;
        case 'spam':
          await bulkUpdateMessages(selectedMessages, { is_spam: true });
          break;
      }
      
      setSelectedMessages([]);
      await loadMessages();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Message actions
  const handleMessageAction = async (message: EmailMessage, action: string) => {
    try {
      switch (action) {
        case 'mark-read':
          await updateEmailMessage(message.id, { is_read: true });
          break;
        case 'mark-unread':
          await updateEmailMessage(message.id, { is_read: false });
          break;
        case 'star':
          await updateEmailMessage(message.id, { is_starred: !message.is_starred });
          break;
        case 'archive':
          await updateEmailMessage(message.id, { is_archived: true });
          break;
        case 'delete':
          await updateEmailMessage(message.id, { is_deleted: true });
          break;
        case 'flag':
          await updateEmailMessage(message.id, { is_flagged: !message.is_flagged });
          break;
        case 'reply':
          setReplyingTo(message);
          setComposing(true);
          break;
        case 'forward':
          setForwardingMessage(message);
          setComposing(true);
          break;
      }
      
      await loadMessages();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Filter messages based on current filters
  const filteredMessages = useMemo(() => {
    return messages.filter(message => {
      if (filters.unreadOnly && message.is_read) return false;
      if (filters.starredOnly && !message.is_starred) return false;
      if (filters.hasAttachments && !message.has_attachments) return false;
      if (filters.importance !== 'all' && message.importance !== filters.importance) return false;
      
      // Date filtering
      if (filters.dateRange !== 'all') {
        const messageDate = new Date(message.date_received);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (filters.dateRange === 'today' && daysDiff > 0) return false;
        if (filters.dateRange === 'week' && daysDiff > 7) return false;
        if (filters.dateRange === 'month' && daysDiff > 30) return false;
      }
      
      return true;
    });
  }, [messages, filters]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Get message preview text
  const getPreviewText = (message: EmailMessage) => {
    return message.preview_text || (message.body_text?.substring(0, 100) + '...') || '';
  };

  // Render sidebar with accounts and folders
  const renderSidebar = () => (
    <div className={`bg-white border-r border-gray-200 transition-all duration-300 ${
      sidebarCollapsed ? 'w-16' : 'w-80'
    }`}>
      {/* Sidebar header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {!sidebarCollapsed && (
            <h2 className="text-lg font-semibold text-gray-900">Inbox</h2>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
          >
            {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
      </div>

      {/* Quick actions */}
      {!sidebarCollapsed && (
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={() => setComposing(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center mb-3"
          >
            <Plus size={20} className="mr-2" />
            Compose
          </button>
          
          <div className="flex space-x-2">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex-1 border border-gray-300 hover:bg-gray-50 px-3 py-2 rounded-lg flex items-center justify-center"
            >
              <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="flex-1 border border-gray-300 hover:bg-gray-50 px-3 py-2 rounded-lg flex items-center justify-center"
            >
              <BarChart3 size={16} />
            </button>
            <button
              onClick={() => setBulkActionMode(!bulkActionMode)}
              className={`flex-1 border px-3 py-2 rounded-lg flex items-center justify-center ${
                bulkActionMode ? 'bg-blue-100 border-blue-300' : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <CheckSquare size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Email accounts */}
      {!sidebarCollapsed && (
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Accounts</h3>
          <div className="space-y-1">
            {accounts.map(account => (
              <button
                key={account.id}
                onClick={() => setSelectedAccount(account.id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  selectedAccount === account.id
                    ? 'bg-blue-100 text-blue-900'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-3 ${
                    account.status === 'active' ? 'bg-green-500' :
                    account.status === 'syncing' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{account.name}</div>
                    <div className="text-sm text-gray-500 truncate">{account.email_address}</div>
                  </div>
                  {account.is_default && (
                    <Star size={14} className="text-yellow-500 fill-current" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Folders */}
      {!sidebarCollapsed && selectedAccount && (
        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Folders</h3>
          <div className="space-y-1">
            {folders.map(folder => (
              <button
                key={folder.id}
                onClick={() => setSelectedFolder(folder.id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  selectedFolder === folder.id
                    ? 'bg-blue-100 text-blue-900'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Folder size={16} className="mr-2" />
                    <span className="truncate">{folder.display_name || folder.name}</span>
                  </div>
                  {folder.unread_count > 0 && (
                    <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                      {folder.unread_count}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Render toolbar
  const renderToolbar = () => (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && loadMessages()}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-80"
            />
          </div>

          {/* View mode selector */}
          <div className="flex border border-gray-300 rounded-lg">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 ${viewMode === 'list' ? 'bg-gray-100' : ''}`}
              title="List view"
            >
              <FileText size={16} />
            </button>
            <button
              onClick={() => setViewMode('conversation')}
              className={`px-3 py-2 ${viewMode === 'conversation' ? 'bg-gray-100' : ''}`}
              title="Conversation view"
            >
              <MessageSquare size={16} />
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`px-3 py-2 ${viewMode === 'split' ? 'bg-gray-100' : ''}`}
              title="Split view"
            >
              <Maximize size={16} />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Bulk actions */}
          {bulkActionMode && selectedMessages.length > 0 && (
            <>
              <button
                onClick={() => handleBulkAction('mark-read')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                title="Mark as read"
              >
                <MailOpen size={16} />
              </button>
              <button
                onClick={() => handleBulkAction('star')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                title="Star"
              >
                <Star size={16} />
              </button>
              <button
                onClick={() => handleBulkAction('archive')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                title="Archive"
              >
                <Archive size={16} />
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
              <div className="w-px h-6 bg-gray-300" />
            </>
          )}

          {/* Filters */}
          <button
            onClick={() => setFilters(prev => ({ ...prev, unreadOnly: !prev.unreadOnly }))}
            className={`p-2 rounded-lg ${filters.unreadOnly ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
            title="Unread only"
          >
            <Mail size={16} />
          </button>
          <button
            onClick={() => setFilters(prev => ({ ...prev, starredOnly: !prev.starredOnly }))}
            className={`p-2 rounded-lg ${filters.starredOnly ? 'bg-yellow-100 text-yellow-700' : 'text-gray-600 hover:bg-gray-100'}`}
            title="Starred only"
          >
            <Star size={16} />
          </button>
          <button
            onClick={() => setFilters(prev => ({ ...prev, hasAttachments: !prev.hasAttachments }))}
            className={`p-2 rounded-lg ${filters.hasAttachments ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-100'}`}
            title="Has attachments"
          >
            <Paperclip size={16} />
          </button>          {/* Settings */}
          <button
            onClick={() => setAccountConfigOpen(true)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            title="Account Settings"
          >
            <Settings size={16} />
          </button>

          {/* AI Assistant */}
          <button
            onClick={() => setAiAssistantOpen(true)}
            className="p-2 text-purple-600 hover:text-purple-900 hover:bg-purple-100 rounded-lg"
            title="AI Assistant"
          >
            <BarChart3 size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  // Render message list
  const renderMessageList = () => (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* List header */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {bulkActionMode && (
              <input
                type="checkbox"
                checked={selectedMessages.length === filteredMessages.length && filteredMessages.length > 0}
                onChange={handleSelectAll}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            )}
            <span className="text-sm text-gray-600">
              {filteredMessages.length} emails
              {selectedMessages.length > 0 && ` (${selectedMessages.length} selected)`}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              {loading ? 'Loading...' : syncing ? 'Syncing...' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto">
        {filteredMessages.map(message => (
          <motion.div
            key={message.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`border-b border-gray-100 px-4 py-3 hover:bg-gray-50 cursor-pointer ${
              !message.is_read ? 'bg-blue-50 font-medium' : ''
            } ${selectedMessages.includes(message.id) ? 'bg-blue-100' : ''}`}
            onClick={() => {
              if (bulkActionMode) {
                handleMessageSelect(message.id, !selectedMessages.includes(message.id));
              } else {
                setCurrentMessage(message);
                if (!message.is_read) {
                  handleMessageAction(message, 'mark-read');
                }
              }
            }}
          >
            <div className="flex items-center space-x-3">
              {bulkActionMode && (
                <input
                  type="checkbox"
                  checked={selectedMessages.includes(message.id)}
                  onChange={(e) => handleMessageSelect(message.id, e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  onClick={(e) => e.stopPropagation()}
                />
              )}
              
              {/* Message indicators */}
              <div className="flex items-center space-x-1">
                {!message.is_read && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full" />
                )}
                {message.is_starred && (
                  <Star size={16} className="text-yellow-500 fill-current" />
                )}
                {message.is_flagged && (
                  <Flag size={16} className="text-red-500" />
                )}
                {message.has_attachments && (
                  <Paperclip size={16} className="text-gray-500" />
                )}
                {message.importance === 'high' && (
                  <AlertCircle size={16} className="text-red-500" />
                )}
              </div>

              {/* Message content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 min-w-0">
                    <span className={`truncate ${!message.is_read ? 'font-semibold' : ''}`}>
                      {message.from_name || message.from_email}
                    </span>
                    {message.labels && message.labels.length > 0 && (
                      <div className="flex space-x-1">
                        {message.labels.slice(0, 2).map(label => (
                          <span
                            key={label}
                            className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded-full"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                      {formatDate(message.date_received)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Show message actions menu
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="mt-1">
                  <div className={`text-sm truncate ${!message.is_read ? 'font-medium' : 'text-gray-600'}`}>
                    {message.subject}
                  </div>
                  <div className="text-sm text-gray-500 truncate mt-1">
                    {getPreviewText(message)}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
        
        {filteredMessages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Mail size={48} className="mb-4" />
            <h3 className="text-lg font-medium mb-2">No emails found</h3>
            <p className="text-center">
              {searchQuery ? 'Try adjusting your search terms' : 'This folder is empty'}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  // Render message preview pane
  const renderMessagePreview = () => {
    if (!currentMessage) {
      return (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center text-gray-500">
            <Mail size={48} className="mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Select an email</h3>
            <p>Choose an email from the list to view it here</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 bg-white flex flex-col">
        {/* Message header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {currentMessage.subject}
              </h2>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <User size={16} className="mr-1" />
                  <span>{currentMessage.from_name || currentMessage.from_email}</span>
                </div>
                <div className="flex items-center">
                  <Clock size={16} className="mr-1" />
                  <span>{new Date(currentMessage.date_received).toLocaleString()}</span>
                </div>
                {currentMessage.has_attachments && (
                  <div className="flex items-center">
                    <Paperclip size={16} className="mr-1" />
                    <span>{currentMessage.attachment_count} attachment(s)</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Message actions */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleMessageAction(currentMessage, 'reply')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                title="Reply"
              >
                <Reply size={16} />
              </button>
              <button
                onClick={() => handleMessageAction(currentMessage, 'forward')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                title="Forward"
              >
                <Forward size={16} />
              </button>
              <button
                onClick={() => handleMessageAction(currentMessage, 'star')}
                className={`p-2 rounded-lg ${
                  currentMessage.is_starred
                    ? 'text-yellow-600 bg-yellow-100'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                title="Star"
              >
                <Star size={16} className={currentMessage.is_starred ? 'fill-current' : ''} />
              </button>
              <button
                onClick={() => handleMessageAction(currentMessage, 'archive')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                title="Archive"
              >
                <Archive size={16} />
              </button>
              <button
                onClick={() => handleMessageAction(currentMessage, 'delete')}
                className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {/* Recipients */}
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium text-gray-700">To: </span>
              <span className="text-gray-600">{currentMessage.to_emails.join(', ')}</span>
            </div>
            {currentMessage.cc_emails && currentMessage.cc_emails.length > 0 && (
              <div>
                <span className="font-medium text-gray-700">CC: </span>
                <span className="text-gray-600">{currentMessage.cc_emails.join(', ')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Message content */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentMessage.body_html ? (
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: currentMessage.body_html }}
            />
          ) : (
            <div className="whitespace-pre-wrap text-gray-900">
              {currentMessage.body_text}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Main toolbar */}
      {renderToolbar()}

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <span className="text-red-800">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {renderSidebar()}

        {/* Main area */}
        <div className="flex-1 flex">
          {/* Message list */}
          <div className={`${viewMode === 'split' && previewPaneVisible ? 'w-1/2' : 'flex-1'} border-r border-gray-200`}>
            {renderMessageList()}
          </div>

          {/* Preview pane (split view) */}
          {viewMode === 'split' && previewPaneVisible && (
            <div className="w-1/2">
              {renderMessagePreview()}
            </div>
          )}
        </div>
      </div>      {/* Compose modal */}
      <EmailComposer
        isOpen={composing}
        onClose={() => {
          setComposing(false);
          setReplyingTo(null);
          setForwardingMessage(null);
        }}
        mode={replyingTo ? 'reply' : forwardingMessage ? 'forward' : 'compose'}
        replyToMessage={replyingTo || undefined}
        forwardMessage={forwardingMessage || undefined}        account={accounts[0] || {} as EmailAccount}        onSent={(_message) => {
          // Refresh message list when a new message is sent
          if (accounts.length > 0) {
            listEmailMessages(accounts[0].id).then(setMessages).catch(console.error);          }
        }}
      />

      {/* AI Assistant */}
      <EmailAIAssistant
        isOpen={aiAssistantOpen}
        onClose={() => setAiAssistantOpen(false)}
        messages={messages}
        accounts={accounts}
        onApplyFilter={(filter) => setFilters(prev => ({ ...prev, ...filter }))}
        onCreateRule={(rule) => {
          // console.log removed
          // Handle rule creation
        }}
        onSuggestReply={(messageId, reply) => {
          // console.log removed          // Handle reply suggestion
        }}
      />

      {/* Account Configuration */}
      <EmailAccountConfig
        isOpen={accountConfigOpen}
        onClose={() => setAccountConfigOpen(false)}
        onAccountCreated={(account) => {
          setAccounts(prev => [...prev, account]);
          setAccountConfigOpen(false);
        }}
        onAccountUpdated={(account) => {
          setAccounts(prev => prev.map(a => a.id === account.id ? account : a));
          setAccountConfigOpen(false);
        }}
        onAccountDeleted={(accountId) => {
          setAccounts(prev => prev.filter(a => a.id !== accountId));
          setAccountConfigOpen(false);
        }}
      />
    </div>
  );
};

export default NextGenInbox;

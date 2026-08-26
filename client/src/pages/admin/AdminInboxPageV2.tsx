import React, { useState, useEffect, useRef, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import InboxSettings from '../../components/admin/InboxSettings';
import SimpleEmailComposer from '../../components/inbox/SimpleEmailComposer';
import { 
  Plus, 
  Search, 
  Filter,
  Mail,
  MailOpen,
  Star,
  Archive,
  Trash2,
  Reply,
  Forward,
  MoreHorizontal,
  Paperclip,
  Flag,
  Clock,
  User,
  CheckSquare,
  RefreshCw,
  Settings,
  Send,
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Folder,
  FolderPlus,
  Tag,
  Download,
  Edit2,
  Check,
  Link,
  Unlink,
  UserPlus,
  Loader2,
  Shield
} from 'lucide-react';
import { SITE } from '../../config/site';

interface EmailMessage {
  id: string;
  from: string;
  fromName: string;
  to: string;
  subject: string;
  body: string;
  timestamp: string;
  isRead: boolean;
  isStarred: boolean;
  isImportant: boolean;
  hasAttachments: boolean;
  labels: string[];
  folder: string;
  threadId: string;
  clientId: string | null;
  clientName: string | null;
}

interface ClientOption {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface EmailFolder {
  id: string;
  name: string;
  count: number;
  icon: React.ReactNode;
  isCustom?: boolean;
}

interface CustomFolder {
  id: string;
  name: string;
  color?: string;
}

const AdminInboxPage: React.FC = () => {
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [currentMessage, setCurrentMessage] = useState<EmailMessage | null>(null);
  const [selectedFolder, setSelectedFolder] = useState('inbox');
  const [searchTerm, setSearchTerm] = useState('');
  const [showComposer, setShowComposer] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [replyMode, setReplyMode] = useState<'reply' | 'forward' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Shown inline rather than as a modal — see the refresh handler.
  const [needsEmailAccount, setNeedsEmailAccount] = useState(false);
  const [folderCounts, setFolderCounts] = useState({ inbox: 0, sent: 0, archive: 0, trash: 0 });
  
  // Custom folders state
  const [customFolders, setCustomFolders] = useState<CustomFolder[]>([]);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  
  // More actions dropdown state
  const [showMoreActions, setShowMoreActions] = useState(false);
  
  // Client linking state
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [clientsList, setClientsList] = useState<ClientOption[]>([]);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [isLinkingClient, setIsLinkingClient] = useState(false);
  const [isAutoLinking, setIsAutoLinking] = useState(false);
  
  // Resizable pane widths (pixels)
  const [sidebarWidth, setSidebarWidth] = useState(256); // 16rem default
  const [listWidth, setListWidth] = useState(420);
  const isDraggingSidebar = useRef(false);
  const isDraggingList = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (isDraggingSidebar.current) {
      const newWidth = Math.min(Math.max(e.clientX - rect.left, 180), 400);
      setSidebarWidth(newWidth);
    } else if (isDraggingList.current) {
      const newWidth = Math.min(Math.max(e.clientX - rect.left - sidebarWidth - 8, 250), rect.width - sidebarWidth - 300);
      setListWidth(newWidth);
    }
  }, [sidebarWidth]);

  const handleMouseUp = useCallback(() => {
    isDraggingSidebar.current = false;
    isDraggingList.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const startSidebarDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingSidebar.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const startListDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingList.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  // Bulk delete & spam filter state
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isSpamFiltering, setIsSpamFiltering] = useState(false);
  const [spamFilterResult, setSpamFilterResult] = useState<{ spamCount: number; deletedCount: number; scannedCount: number; spamDetails: any[] } | null>(null);
  const [showSpamResult, setShowSpamResult] = useState(false);
  const [showSpamRules, setShowSpamRules] = useState(false);
  const [spamRules, setSpamRules] = useState<Array<{ id: string; ruleType: string; value: string; reason: string | null; isActive: boolean; createdAt: string }>>([]);
  const [newRule, setNewRule] = useState({ ruleType: 'sender', value: '', reason: '' });

  // Fetch custom folders
  const fetchCustomFolders = async () => {
    try {
      const response = await fetch('/api/inbox/folders', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        setCustomFolders(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch folders:', err);
    }
  };

  // Create new folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const response = await fetch('/api/inbox/folders', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim() }),
      });
      if (response.ok) {
        const newFolder = await response.json();
        setCustomFolders(prev => [...prev, newFolder]);
        setNewFolderName('');
        setShowNewFolderInput(false);
      }
    } catch (err) {
      console.error('Failed to create folder:', err);
    }
  };

  // Update folder name
  const handleUpdateFolder = async (folderId: string) => {
    if (!editingFolderName.trim()) return;
    try {
      const response = await fetch(`/api/inbox/folders/${folderId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingFolderName.trim() }),
      });
      if (response.ok) {
        setCustomFolders(prev => prev.map(f => 
          f.id === folderId ? { ...f, name: editingFolderName.trim() } : f
        ));
        setEditingFolderId(null);
        setEditingFolderName('');
      }
    } catch (err) {
      console.error('Failed to update folder:', err);
    }
  };

  // Delete folder
  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('Delete this folder? Emails in this folder will be moved to inbox.')) return;
    try {
      const response = await fetch(`/api/inbox/folders/${folderId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok) {
        setCustomFolders(prev => prev.filter(f => f.id !== folderId));
        if (selectedFolder === `custom_${folderId}`) {
          setSelectedFolder('inbox');
        }
      }
    } catch (err) {
      console.error('Failed to delete folder:', err);
    }
  };

  // Move email to folder
  const handleMoveToFolder = async (messageIds: string[], folderId: string) => {
    try {
      const response = await fetch('/api/inbox/emails/move', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds, folderId }),
      });
      if (response.ok) {
        setMessages(prev => prev.map(m => 
          messageIds.includes(m.id) ? { ...m, folder: folderId } : m
        ));
        setSelectedMessages([]);
        fetchFolderCounts();
      }
    } catch (err) {
      console.error('Failed to move emails:', err);
    }
  };

  // Fetch custom folders on mount
  useEffect(() => {
    fetchCustomFolders();
  }, []);

  // Fetch clients list for linking
  const fetchClientsList = async () => {
    try {
      const response = await fetch('/api/inbox/emails/clients-list', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        setClientsList(data);
      }
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    }
  };

  // Link email to client
  const handleLinkToClient = async (messageId: string, clientId: string) => {
    setIsLinkingClient(true);
    try {
      const response = await fetch(`/api/inbox/emails/${messageId}/link-client`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      });
      if (response.ok) {
        const result = await response.json();
        // Update the message in local state
        setMessages(prev => prev.map(m => 
          m.id === messageId ? { ...m, clientId, clientName: result.client?.name || null } : m
        ));
        if (currentMessage?.id === messageId) {
          setCurrentMessage(prev => prev ? { ...prev, clientId, clientName: result.client?.name || null } : null);
        }
        setShowClientPicker(false);
        setClientSearchTerm('');
      }
    } catch (err) {
      console.error('Failed to link email to client:', err);
      alert('Failed to link email to client');
    } finally {
      setIsLinkingClient(false);
    }
  };

  // Unlink email from client
  const handleUnlinkClient = async (messageId: string) => {
    try {
      const response = await fetch(`/api/inbox/emails/${messageId}/link-client`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: null }),
      });
      if (response.ok) {
        setMessages(prev => prev.map(m => 
          m.id === messageId ? { ...m, clientId: null, clientName: null } : m
        ));
        if (currentMessage?.id === messageId) {
          setCurrentMessage(prev => prev ? { ...prev, clientId: null, clientName: null } : null);
        }
      }
    } catch (err) {
      console.error('Failed to unlink email from client:', err);
    }
  };

  // Bulk auto-link all unlinked emails
  const handleAutoLinkAll = async () => {
    setIsAutoLinking(true);
    try {
      const response = await fetch('/api/inbox/emails/auto-link', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const result = await response.json();
        alert(`Auto-linked ${result.linkedCount} emails to matching clients`);
        await fetchMessages(); // Reload to show updated links
      }
    } catch (err) {
      console.error('Failed to auto-link emails:', err);
      alert('Failed to auto-link emails');
    } finally {
      setIsAutoLinking(false);
    }
  };

  // Fetch folder counts separately
  const fetchFolderCounts = async () => {
    try {
      // Fetch inbox count
      const inboxResponse = await fetch('/api/inbox/emails?' + Date.now(), {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
      });
      const inboxData = inboxResponse.ok ? await inboxResponse.json() : [];
      
      // Fetch sent count
      const sentResponse = await fetch('/api/emails/sent?' + Date.now(), {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
      });
      const sentData = sentResponse.ok ? await sentResponse.json() : [];
      
      setFolderCounts({
        inbox: Array.isArray(inboxData) ? inboxData.length : 0,
        sent: Array.isArray(sentData) ? sentData.length : 0,
        archive: 0,
        trash: 0
      });
    } catch (err) {
      // Silently fail for count fetch
    }
  };

  // Fetch folder counts on mount
  useEffect(() => {
    fetchFolderCounts();
  }, []);

  const handleRefreshEmails = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/email/refresh', {
        method: 'POST',
        credentials: 'include', // Include auth cookies
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json().catch(() => ({} as any));
      if (response.ok) {
        await fetchMessages(); // Reload messages
        await fetchFolderCounts(); // Reload folder counts
        alert(`Email refresh completed: ${result.newEmails ?? 0} new emails imported`);
      } else {
        const reason = String(result.error || '');
        // NOT CONFIGURED IS NOT AN ERROR.
        //
        // A brand-new studio arrives here with no email account, presses Refresh, and gets a
        // browser alert() — a modal, in the middle of the screen, that they have to dismiss
        // before they can look at anything. That is the shape of a failure, and nothing has
        // failed: they simply have not connected an account yet, which on day one is the
        // expected state rather than a mistake.
        //
        // Real errors keep the alert, because an IMAP password that stopped working IS a
        // failure and does deserve interrupting for.
        if (/not configured/i.test(reason)) {
          setNeedsEmailAccount(true);
        } else {
          // Surface the real reason (e.g. the IMAP auth error) instead of a generic message.
          alert(reason || 'Failed to refresh emails. Please try again.');
        }
      }
    } catch (error: any) {
      alert(`Failed to refresh emails: ${error?.message || 'network error'}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Bulk delete all unread emails
  const handleBulkDeleteUnread = async () => {
    const unreadCount = messages.filter(m => !m.isRead && m.folder !== 'sent').length;
    if (unreadCount === 0) {
      alert('No unread emails to delete.');
      return;
    }
    if (!confirm(`Are you sure you want to permanently delete ALL ${unreadCount} unread emails? This action cannot be undone.`)) {
      return;
    }
    setIsBulkDeleting(true);
    try {
      const response = await fetch('/api/inbox/emails/bulk-delete-unread', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const result = await response.json();
        alert(`Successfully deleted ${result.deletedCount} unread emails.`);
        await fetchMessages();
        await fetchFolderCounts();
      } else {
        throw new Error('Failed to bulk delete');
      }
    } catch (error) {
      console.error('Bulk delete failed:', error);
      alert('Failed to delete unread emails. Please try again.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Spam filter
  const fetchSpamRules = async () => {
    try {
      const response = await fetch('/api/inbox/spam-rules', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setSpamRules(data);
      }
    } catch (err) { /* ignore */ }
  };

  const handleAddSpamRule = async () => {
    if (!newRule.value.trim()) return;
    try {
      const response = await fetch('/api/inbox/spam-rules', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRule),
      });
      if (response.ok) {
        setNewRule({ ruleType: 'sender', value: '', reason: '' });
        await fetchSpamRules();
      }
    } catch (err) { /* ignore */ }
  };

  const handleDeleteSpamRule = async (id: string) => {
    try {
      await fetch(`/api/inbox/spam-rules/${id}`, { method: 'DELETE', credentials: 'include' });
      await fetchSpamRules();
    } catch (err) { /* ignore */ }
  };

  const handleSpamFilter = async () => {
    if (!confirm('Run spam filter? This will scan all emails and permanently delete detected spam. Messages from known clients are always kept.')) {
      return;
    }
    setIsSpamFiltering(true);
    setSpamFilterResult(null);
    try {
      const response = await fetch('/api/inbox/emails/spam-filter', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const result = await response.json();
        setSpamFilterResult(result);
        setShowSpamResult(true);
        if (result.deletedCount > 0) {
          await fetchMessages();
          await fetchFolderCounts();
        }
      } else {
        throw new Error('Spam filter failed');
      }
    } catch (error) {
      console.error('Spam filter failed:', error);
      alert('Failed to run spam filter. Please try again.');
    } finally {
      setIsSpamFiltering(false);
    }
  };

  // Load messages from API
  useEffect(() => {
    fetchMessages();
  }, [selectedFolder]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMoreActions) {
        const target = event.target as HTMLElement;
        if (!target.closest('.relative')) {
          setShowMoreActions(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMoreActions]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch from different endpoint based on selected folder
      let endpoint = '/api/inbox/emails?' + Date.now();
      if (selectedFolder === 'sent') {
        endpoint = '/api/emails/sent?' + Date.now();
      } else if (selectedFolder.startsWith('custom_')) {
        const folderId = selectedFolder.replace('custom_', '');
        endpoint = `/api/inbox/emails?folder=${folderId}&t=${Date.now()}`;
      } else if (selectedFolder === 'archive') {
        endpoint = `/api/inbox/emails?folder=archive&t=${Date.now()}`;
      } else if (selectedFolder === 'trash') {
        endpoint = `/api/inbox/emails?folder=trash&t=${Date.now()}`;
      }
      
      const response = await fetch(endpoint, {
        credentials: 'include', // Include auth cookies
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      // console.log removed
      
      // Convert API data to EmailMessage format with proper folder separation
      const emailMessages: EmailMessage[] = data.map((msg: any) => ({
        id: msg.id,
        from: msg.senderEmail || msg.sender_email,
        fromName: msg.senderName || msg.sender_name || SITE.name,
        to: msg.recipientEmail || msg.recipient_email || SITE.email,
        subject: msg.subject?.replace('[SENT] ', '') || '(No Subject)',
        body: msg.content,
        timestamp: msg.createdAt || msg.created_at || msg.sentAt || msg.sent_at,
        isRead: msg.status === 'read' || msg.status === 'archived' || msg.status === 'sent' || msg.status === 'demo_sent',
        isStarred: false,
        isImportant: msg.status === 'unread',
        hasAttachments: false,
        labels: [],
        folder: msg.folder_id || ((msg.direction === 'outbound' || msg.status === 'sent' || msg.status === 'demo_sent') ? 'sent' : 'inbox'),
        threadId: msg.id,
        clientId: msg.clientId || msg.client_id || null,
        clientName: msg.clientName || msg.client_name || null
      }));
      
      setMessages(emailMessages);
    } catch (err) {
      // console.error removed
      setError('Failed to load messages. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Email folders with proper counts (including custom folders)
  const folders: EmailFolder[] = [
    { id: 'inbox', name: 'Inbox', count: folderCounts.inbox, icon: <Mail size={16} /> },
    { id: 'sent', name: 'Sent', count: folderCounts.sent, icon: <Send size={16} /> },
    { id: 'archive', name: 'Archive', count: folderCounts.archive, icon: <Archive size={16} /> },
    { id: 'trash', name: 'Trash', count: folderCounts.trash, icon: <Trash2 size={16} /> },
    // Add custom folders
    ...customFolders.map(cf => ({
      id: `custom_${cf.id}`,
      name: cf.name,
      count: 0, // Will be updated with real counts from API
      icon: <Folder size={16} />,
      isCustom: true
    }))
  ];

  // Filter messages based on selected folder
  const filteredMessages = messages.filter(message => {
    // Since we fetch from the correct endpoint based on folder, just filter by search
    const matchesSearch = searchTerm === '' || 
      message.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.fromName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.body.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const handleMessageSelect = (messageId: string) => {
    setSelectedMessages(prev => 
      prev.includes(messageId) 
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  };

  const handleSelectAll = () => {
    if (selectedMessages.length === filteredMessages.length) {
      setSelectedMessages([]);
    } else {
      setSelectedMessages(filteredMessages.map(m => m.id));
    }
  };

  const handleMarkAsRead = (messageIds: string[], isRead: boolean) => {
    setMessages(prev => 
      prev.map(message => 
        messageIds.includes(message.id) 
          ? { ...message, isRead }
          : message
      )
    );
    // Persist to server
    fetch('/api/inbox/emails/mark-read', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageIds, isRead }),
    }).catch(() => {});
  };

  const handleStar = (messageIds: string[], isStarred: boolean) => {
    setMessages(prev => 
      prev.map(message => 
        messageIds.includes(message.id) 
          ? { ...message, isStarred }
          : message
      )
    );
  };

  const handleArchive = (messageIds: string[]) => {
    setMessages(prev => 
      prev.map(message => 
        messageIds.includes(message.id) 
          ? { ...message, folder: 'archive' }
          : message
      )
    );
    setSelectedMessages([]);
  };

  const handleDelete = async (messageIds: string[]) => {
    if (!confirm(`Are you sure you want to delete ${messageIds.length} message${messageIds.length > 1 ? 's' : ''}? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      // Delete each message via API
      await Promise.all(
        messageIds.map(id => 
          fetch(`/api/crm/messages/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
          })
        )
      );

      // Remove from local state
      setMessages(prev => prev.filter(message => !messageIds.includes(message.id)));
      setSelectedMessages([]);
      
      // Clear current message if it was deleted
      if (currentMessage && messageIds.includes(currentMessage.id)) {
        setCurrentMessage(null);
      }
    } catch (err) {
      console.error('Failed to delete messages:', err);
      setError('Failed to delete messages. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const renderEmailList = () => (
    <div style={currentMessage ? { width: listWidth, minWidth: 250, flexShrink: 0 } : { flex: 1, minWidth: 250 }} className="bg-white rounded-lg shadow overflow-hidden">
      {/* Email List Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <input
              type="checkbox"
              checked={selectedMessages.length === filteredMessages.length && filteredMessages.length > 0}
              onChange={handleSelectAll}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <h2 className="text-lg font-semibold text-gray-900 capitalize">
              {selectedFolder} ({filteredMessages.length})
            </h2>
          </div>
          
          {selectedMessages.length > 0 && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleMarkAsRead(selectedMessages, true)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
                title="Mark as read"
              >
                <MailOpen size={16} />
              </button>
              <button
                onClick={() => handleStar(selectedMessages, true)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
                title="Star"
              >
                <Star size={16} />
              </button>
              <button
                onClick={() => handleArchive(selectedMessages)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
                title="Archive"
              >
                <Archive size={16} />
              </button>
              <button
                onClick={() => handleDelete(selectedMessages)}
                className="p-2 text-red-600 hover:bg-red-100 rounded-md"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Email List */}
      <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
        {filteredMessages.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No messages</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'No messages match your search.' : 'Your inbox is empty.'}
            </p>
          </div>
        ) : (
          filteredMessages.map(message => (
            <div 
              key={message.id}
              className={`p-4 hover:bg-gray-50 cursor-pointer relative group ${
                selectedMessages.includes(message.id) ? 'bg-blue-50' : ''
              } ${!message.isRead ? 'bg-blue-25' : ''}`}
              onClick={() => {
                setCurrentMessage(message);
                if (!message.isRead) {
                  handleMarkAsRead([message.id], true);
                }
              }}
            >
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={selectedMessages.includes(message.id)}
                  onChange={() => handleMessageSelect(message.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStar([message.id], !message.isStarred);
                  }}
                  className={`${
                    message.isStarred ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-400'
                  }`}
                >
                  <Star size={16} fill={message.isStarred ? 'currentColor' : 'none'} />
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm ${!message.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                        {message.fromName}
                      </span>
                      {message.clientName && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800" title={`Linked to client: ${message.clientName}`}>
                          <User size={10} className="mr-0.5" />
                          {message.clientName}
                        </span>
                      )}
                      {message.isImportant && (
                        <Flag size={12} className="text-red-500" />
                      )}
                      {message.hasAttachments && (
                        <Paperclip size={12} className="text-gray-400" />
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(message.timestamp)}
                      </span>
                      {/* Delete button - visible on hover */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete([message.id]);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-opacity"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  
                  <div className={`text-sm ${!message.isRead ? 'font-semibold text-gray-900' : 'text-gray-600'} truncate`}>
                    {message.subject}
                  </div>
                  
                  <div className="text-sm text-gray-500 mt-1 line-clamp-2 max-w-lg">
                    {message.body}
                  </div>

                  {message.labels.length > 0 && (
                    <div className="flex items-center space-x-1 mt-2">
                      {message.labels.map(label => (
                        <span 
                          key={label}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderEmailDetail = () => {
    if (!currentMessage) return null;

    return (
      <div className="flex-1 min-w-0 bg-white rounded-lg shadow flex flex-col max-h-[700px]">
        {/* Email Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentMessage(null)}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              <X size={16} />
            </button>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setReplyMode('reply');
                  setShowComposer(true);
                }}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
                title="Reply"
              >
                <Reply size={16} />
              </button>
              <button
                onClick={() => {
                  setReplyMode('forward');
                  setShowComposer(true);
                }}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
                title="Forward"
              >
                <Forward size={16} />
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowMoreActions(!showMoreActions)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
                  title="More actions"
                >
                  <MoreHorizontal size={16} />
                </button>
                
                {/* Dropdown Menu */}
                {showMoreActions && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          handleMarkAsRead([currentMessage.id], !currentMessage.isRead);
                          setShowMoreActions(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      >
                        {currentMessage.isRead ? <MailOpen size={14} className="mr-2" /> : <Mail size={14} className="mr-2" />}
                        Mark as {currentMessage.isRead ? 'unread' : 'read'}
                      </button>
                      <button
                        onClick={() => {
                          handleStar([currentMessage.id], !currentMessage.isStarred);
                          setShowMoreActions(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      >
                        <Star size={14} className="mr-2" />
                        {currentMessage.isStarred ? 'Unstar' : 'Star'}
                      </button>
                      <button
                        onClick={() => {
                          handleArchive([currentMessage.id]);
                          setShowMoreActions(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      >
                        <Archive size={14} className="mr-2" />
                        Archive
                      </button>
                      <button
                        onClick={() => {
                          handleDelete([currentMessage.id]);
                          setShowMoreActions(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                      >
                        <Trash2 size={14} className="mr-2" />
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Email Content */}
        <div className="p-4 overflow-y-auto flex-1 min-h-0">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {currentMessage.subject}
            </h2>
            
            <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
              <div>
                <div className="font-medium">{currentMessage.fromName}</div>
                <div>{currentMessage.from}</div>
              </div>
              <div className="text-right">
                <div>{new Date(currentMessage.timestamp).toLocaleDateString()}</div>
                <div>{new Date(currentMessage.timestamp).toLocaleTimeString()}</div>
              </div>
            </div>

            {/* Client Link Section */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              {currentMessage.clientName ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <User size={16} className="text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      Linked to: {currentMessage.clientName}
                    </span>
                  </div>
                  <button
                    onClick={() => handleUnlinkClient(currentMessage.id)}
                    className="flex items-center space-x-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                    title="Unlink from client"
                  >
                    <Unlink size={12} />
                    <span>Unlink</span>
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500 flex items-center space-x-1">
                      <AlertCircle size={14} className="text-amber-500" />
                      <span>Not linked to any client</span>
                    </span>
                    <button
                      onClick={() => {
                        setShowClientPicker(true);
                        fetchClientsList();
                      }}
                      className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200"
                    >
                      <UserPlus size={12} />
                      <span>Link to Client</span>
                    </button>
                  </div>

                  {/* Client Picker Dropdown */}
                  {showClientPicker && (
                    <div className="mt-2 border border-gray-300 rounded-lg bg-white shadow-lg">
                      <div className="p-2 border-b border-gray-200">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                          <input
                            type="text"
                            placeholder="Search clients by name or email..."
                            value={clientSearchTerm}
                            onChange={(e) => setClientSearchTerm(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {clientsList
                          .filter(c => {
                            if (!clientSearchTerm) return true;
                            const term = clientSearchTerm.toLowerCase();
                            return c.name.toLowerCase().includes(term) || c.email.toLowerCase().includes(term);
                          })
                          .slice(0, 20)
                          .map(client => (
                            <button
                              key={client.id}
                              onClick={() => handleLinkToClient(currentMessage.id, client.id)}
                              disabled={isLinkingClient}
                              className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-blue-50 text-left border-b border-gray-100 last:border-0"
                            >
                              <div>
                                <div className="font-medium text-gray-900">{client.name}</div>
                                <div className="text-xs text-gray-500">{client.email}</div>
                              </div>
                              {isLinkingClient ? (
                                <Loader2 size={14} className="animate-spin text-blue-500" />
                              ) : (
                                <Link size={14} className="text-gray-400" />
                              )}
                            </button>
                          ))}
                        {clientsList.filter(c => {
                          if (!clientSearchTerm) return true;
                          const term = clientSearchTerm.toLowerCase();
                          return c.name.toLowerCase().includes(term) || c.email.toLowerCase().includes(term);
                        }).length === 0 && (
                          <div className="px-3 py-4 text-sm text-gray-500 text-center">
                            No clients found
                          </div>
                        )}
                      </div>
                      <div className="p-2 border-t border-gray-200">
                        <button
                          onClick={() => {
                            setShowClientPicker(false);
                            setClientSearchTerm('');
                          }}
                          className="w-full px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="prose max-w-full overflow-hidden">
            {currentMessage.body && /<[a-z][\s\S]*>/i.test(currentMessage.body) ? (
              <iframe
                srcDoc={currentMessage.body}
                sandbox=""
                className="w-full border-0 min-h-[300px]"
                style={{ height: '60vh' }}
                title="Email content"
                onLoad={(e) => {
                  const frame = e.target as HTMLIFrameElement;
                  if (frame.contentDocument?.body) {
                    frame.style.height = frame.contentDocument.body.scrollHeight + 40 + 'px';
                  }
                }}
              />
            ) : (
              <p className="text-gray-700 whitespace-pre-wrap break-words max-w-full overflow-x-auto">
                {currentMessage.body}
              </p>
            )}
          </div>

          {currentMessage.hasAttachments && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Attachments</h4>
              <div className="flex items-center space-x-2">
                <Paperclip size={16} className="text-gray-400" />
                <span className="text-sm text-gray-600">attachment.pdf</span>
                <button className="text-blue-600 hover:text-blue-800">
                  <Download size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-shrink-0">
            <h1 className="text-2xl font-semibold text-gray-900">Inbox</h1>
            <p className="text-gray-600">Manage client messages and inquiries</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 sticky top-0 z-10">
            <button 
              onClick={handleRefreshEmails}
              disabled={isRefreshing}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync'}</span>
            </button>
            <button 
              onClick={handleAutoLinkAll}
              disabled={isAutoLinking}
              className="flex items-center space-x-2 px-4 py-2 border border-green-300 text-green-700 rounded-md hover:bg-green-50 disabled:opacity-50 whitespace-nowrap"
              title="Auto-link all unlinked emails to matching clients by email address"
            >
              <Link size={16} className={isAutoLinking ? 'animate-pulse' : ''} />
              <span>{isAutoLinking ? 'Linking...' : 'Auto-link Clients'}</span>
            </button>
            <button 
              onClick={handleBulkDeleteUnread}
              disabled={isBulkDeleting}
              className="flex items-center space-x-2 px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 disabled:opacity-50 whitespace-nowrap"
              title="Permanently delete all unread emails"
            >
              <Trash2 size={16} className={isBulkDeleting ? 'animate-pulse' : ''} />
              <span>{isBulkDeleting ? 'Deleting...' : 'Delete All Unread'}</span>
            </button>
            <button 
              onClick={handleSpamFilter}
              disabled={isSpamFiltering}
              className="flex items-center space-x-2 px-4 py-2 border border-orange-300 text-orange-700 rounded-md hover:bg-orange-50 disabled:opacity-50 whitespace-nowrap"
              title="Scan inbox for spam and remove detected spam emails"
            >
              <AlertCircle size={16} className={isSpamFiltering ? 'animate-spin' : ''} />
              <span>{isSpamFiltering ? 'Scanning...' : 'Spam Filter'}</span>
            </button>
            <button 
              onClick={() => { setShowSpamRules(true); fetchSpamRules(); }}
              className="flex items-center space-x-2 px-3 py-2 border border-purple-300 text-purple-700 rounded-md hover:bg-purple-50 whitespace-nowrap"
              title="Manage blocked senders, domains, and keywords"
            >
              <Shield size={16} />
              <span>Spam Rules</span>
            </button>
            <button 
              onClick={() => setShowSettings(true)}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 whitespace-nowrap"
            >
              <Settings size={16} />
              <span>Settings</span>
            </button>
            <button
              onClick={() => setShowComposer(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 whitespace-nowrap"
            >
              <Plus size={16} />
              <span>Compose</span>
            </button>
          </div>
        </div>

        {/* Said where they are, not over the top of it. */}
        {needsEmailAccount && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-medium">No email account connected yet</p>
            <p className="mt-1">
              Connect one and your client replies land here. Until then you can still write
              and send from Compose using whatever you use today.
            </p>
            <a href="/admin/settings/technical-setup" className="mt-2 inline-block font-medium underline underline-offset-2">
              Connect an email account
            </a>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search messages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Main Content */}
        <div className="flex" ref={containerRef}>
          {/* Sidebar */}
          <div style={{ width: sidebarWidth, minWidth: 180, flexShrink: 0 }} className="bg-white rounded-lg shadow p-4">
            <nav className="space-y-2">
              {folders.map(folder => (
                <div key={folder.id} className="group relative">
                  {editingFolderId === folder.id.replace('custom_', '') && folder.isCustom ? (
                    <div className="flex items-center space-x-2 px-3 py-2">
                      <input
                        type="text"
                        value={editingFolderName}
                        onChange={(e) => setEditingFolderName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdateFolder(folder.id.replace('custom_', ''));
                          if (e.key === 'Escape') setEditingFolderId(null);
                        }}
                        className="flex-1 px-2 py-1 text-sm border rounded"
                        autoFocus
                      />
                      <button
                        onClick={() => handleUpdateFolder(folder.id.replace('custom_', ''))}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => setEditingFolderId(null)}
                        className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedFolder(folder.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md ${
                        selectedFolder === folder.id
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {folder.icon}
                        <span>{folder.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">{folder.count}</span>
                        {folder.isCustom && (
                          <div className="hidden group-hover:flex items-center space-x-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingFolderId(folder.id.replace('custom_', ''));
                                setEditingFolderName(folder.name);
                              }}
                              className="p-1 text-gray-400 hover:text-blue-600 rounded"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteFolder(folder.id.replace('custom_', ''));
                              }}
                              className="p-1 text-gray-400 hover:text-red-600 rounded"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </button>
                  )}
                </div>
              ))}
            </nav>

            {/* Add Folder */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              {showNewFolderInput ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateFolder();
                      if (e.key === 'Escape') {
                        setShowNewFolderInput(false);
                        setNewFolderName('');
                      }
                    }}
                    placeholder="Folder name..."
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <button
                    onClick={handleCreateFolder}
                    disabled={!newFolderName.trim()}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-md disabled:opacity-50"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setShowNewFolderInput(false);
                      setNewFolderName('');
                    }}
                    className="p-2 text-gray-400 hover:bg-gray-100 rounded-md"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewFolderInput(true)}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
                >
                  <FolderPlus size={16} />
                  <span>Add Folder</span>
                </button>
              )}
            </div>

            {/* Move to Folder dropdown (shown when messages are selected) */}
            {selectedMessages.length > 0 && customFolders.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Move to folder</h3>
                <div className="space-y-1">
                  {customFolders.map(folder => (
                    <button
                      key={folder.id}
                      onClick={() => handleMoveToFolder(selectedMessages, folder.id)}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
                    >
                      <Folder size={14} />
                      <span>{folder.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Quick Stats */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Unread</span>
                  <span className="font-medium">
                    {messages.filter(m => !m.isRead && m.folder === 'inbox').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Starred</span>
                  <span className="font-medium">
                    {messages.filter(m => m.isStarred).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Important</span>
                  <span className="font-medium">
                    {messages.filter(m => m.isImportant).length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar resize handle */}
          <div
            onMouseDown={startSidebarDrag}
            className="w-2 cursor-col-resize flex-shrink-0 group flex items-center justify-center hover:bg-blue-100 transition-colors rounded"
            title="Drag to resize"
          >
            <div className="w-0.5 h-8 bg-gray-300 group-hover:bg-blue-400 rounded-full transition-colors" />
          </div>

          {/* Email List and Detail */}
          <div className="flex-1 flex min-w-0 overflow-hidden">
            {renderEmailList()}
            {currentMessage && (
              <>
                {/* List / Detail resize handle */}
                <div
                  onMouseDown={startListDrag}
                  className="w-2 cursor-col-resize flex-shrink-0 group flex items-center justify-center hover:bg-blue-100 transition-colors rounded"
                  title="Drag to resize"
                >
                  <div className="w-0.5 h-8 bg-gray-300 group-hover:bg-blue-400 rounded-full transition-colors" />
                </div>
                {renderEmailDetail()}
              </>
            )}
          </div>        </div>
      </div>

      {/* Inbox Settings Modal */}
      <InboxSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={(settings) => {
          // console.log removed
          // Here you would save the settings to your backend
        }}
      />

      {/* Email Composer Modal */}
      {showComposer && (
        <SimpleEmailComposer
          isOpen={showComposer}
          onClose={() => {
            setShowComposer(false);
            setReplyMode(null);
          }}
          onSent={(data) => {
            // console.log removed
            setShowComposer(false);
            setReplyMode(null);
            // Refresh messages after sending
            fetchMessages();
          }}
        />
      )}

      {/* Spam Filter Results Modal */}
      {showSpamResult && spamFilterResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Spam Filter Results</h3>
              <button onClick={() => setShowSpamResult(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{spamFilterResult.scannedCount}</div>
                  <div className="text-xs text-gray-500">Scanned</div>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{spamFilterResult.spamCount}</div>
                  <div className="text-xs text-red-500">Spam Found</div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{spamFilterResult.deletedCount}</div>
                  <div className="text-xs text-green-500">Deleted</div>
                </div>
              </div>

              {spamFilterResult.spamDetails && spamFilterResult.spamDetails.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Removed spam emails:</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {spamFilterResult.spamDetails.map((spam: any, i: number) => (
                      <div key={i} className="p-2 bg-red-50 border border-red-100 rounded text-sm">
                        <div className="font-medium text-gray-900 truncate">{spam.subject}</div>
                        <div className="text-xs text-gray-500">{spam.sender}</div>
                        <div className="text-xs text-red-600 mt-1">{spam.reason}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {spamFilterResult.spamCount === 0 && (
                <div className="text-center py-4">
                  <Check size={32} className="mx-auto text-green-500 mb-2" />
                  <p className="text-gray-600">No spam detected. Your inbox is clean!</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 flex space-x-2">
              <button
                onClick={() => { setShowSpamResult(false); setShowSpamRules(true); fetchSpamRules(); }}
                className="flex-1 px-4 py-2 border border-purple-300 text-purple-700 rounded-md hover:bg-purple-50 flex items-center justify-center space-x-2"
              >
                <Shield size={16} />
                <span>Manage Spam Rules</span>
              </button>
              <button
                onClick={() => setShowSpamResult(false)}
                className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spam Rules Management Modal */}
      {showSpamRules && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield size={20} className="text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900">Spam Rules</h3>
              </div>
              <button onClick={() => setShowSpamRules(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Explanation */}
              <p className="text-sm text-gray-500">
                Add rules to automatically block emails from specific senders, domains, or containing certain keywords. 
                Blocked emails will be deleted when you run the Spam Filter.
              </p>

              {/* Add New Rule */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <h4 className="text-sm font-semibold text-gray-700">Add New Rule</h4>
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-3">
                    <select
                      value={newRule.ruleType}
                      onChange={(e) => setNewRule(prev => ({ ...prev, ruleType: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="sender">Sender Email</option>
                      <option value="domain">Domain</option>
                      <option value="keyword">Keyword</option>
                    </select>
                  </div>
                  <div className="col-span-5">
                    <input
                      type="text"
                      value={newRule.value}
                      onChange={(e) => setNewRule(prev => ({ ...prev, value: e.target.value }))}
                      placeholder={newRule.ruleType === 'sender' ? 'spam@example.com' : newRule.ruleType === 'domain' ? 'example.com' : 'unsubscribe'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="text"
                      value={newRule.reason}
                      onChange={(e) => setNewRule(prev => ({ ...prev, reason: e.target.value }))}
                      placeholder="Note (optional)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div className="col-span-1">
                    <button
                      onClick={handleAddSpamRule}
                      disabled={!newRule.value.trim()}
                      className="w-full px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                    >
                      <Plus size={16} className="mx-auto" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Existing Rules */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Active Rules ({spamRules.length})</h4>
                {spamRules.length === 0 ? (
                  <div className="text-center py-6 text-gray-400">
                    <Shield size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No custom spam rules yet. Add rules above to block unwanted senders.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {spamRules.map(rule => (
                      <div key={rule.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                            rule.ruleType === 'sender' ? 'bg-red-100 text-red-700' :
                            rule.ruleType === 'domain' ? 'bg-orange-100 text-orange-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {rule.ruleType === 'sender' ? 'Sender' : rule.ruleType === 'domain' ? 'Domain' : 'Keyword'}
                          </span>
                          <span className="text-sm font-mono text-gray-900 truncate">{rule.value}</span>
                          {rule.reason && (
                            <span className="text-xs text-gray-400 truncate">— {rule.reason}</span>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteSpamRule(rule.id)}
                          className="ml-2 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Delete rule"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => setShowSpamRules(false)}
                className="w-full px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminInboxPage;

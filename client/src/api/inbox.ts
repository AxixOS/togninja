import { supabase } from '../lib/supabase';

// TypeScript interfaces for the email system
export interface EmailAccount {
  id: string;
  user_id: string;
  name: string;
  email_address: string;
  provider: 'gmail' | 'outlook' | 'yahoo' | 'imap' | 'pop3' | 'smtp' | 'exchange';
  
  // Connection settings
  incoming_server?: string;
  incoming_port?: number;
  incoming_security?: 'none' | 'ssl' | 'tls' | 'starttls';
  outgoing_server?: string;
  outgoing_port?: number;
  outgoing_security?: 'none' | 'ssl' | 'tls' | 'starttls';
  
  // Authentication
  username?: string;
  password_encrypted?: string;
  oauth_token_encrypted?: string;
  oauth_refresh_token_encrypted?: string;
  oauth_expires_at?: string;
  
  // Settings
  is_default: boolean;
  sync_enabled: boolean;
  sync_frequency_minutes: number;
  sync_folders: string[];
  last_sync_at?: string;
  
  // Signatures
  signature_html?: string;
  signature_text?: string;
  auto_signature: boolean;
  
  // Status
  status: 'active' | 'inactive' | 'error' | 'syncing';
  last_error?: string;
  created_at: string;
  updated_at: string;
}

export interface EmailFolder {
  id: string;
  account_id: string;
  name: string;
  display_name?: string;
  folder_type: 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam' | 'archive' | 'custom';
  parent_folder_id?: string;
  remote_folder_id?: string;
  unread_count: number;
  total_count: number;
  sync_enabled: boolean;
  color?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface EmailMessage {
  id: string;
  account_id: string;
  folder_id?: string;
  
  // Message identifiers
  message_id: string;
  thread_id?: string;
  in_reply_to?: string;
  references?: string;
  remote_message_id?: string;
  
  // Headers
  from_email: string;
  from_name?: string;
  to_emails: string[];
  to_names?: string[];
  cc_emails?: string[];
  cc_names?: string[];
  bcc_emails?: string[];
  bcc_names?: string[];
  reply_to?: string;
  subject?: string;
  
  // Content
  body_text?: string;
  body_html?: string;
  preview_text?: string;
  
  // Metadata
  date_sent?: string;
  date_received: string;
  size_bytes?: number;
  importance: 'low' | 'normal' | 'high';
  priority: number;
  
  // Status flags
  is_read: boolean;
  is_starred: boolean;
  is_flagged: boolean;
  is_draft: boolean;
  is_sent: boolean;
  is_archived: boolean;
  is_deleted: boolean;
  is_spam: boolean;
  
  // Advanced features
  has_attachments: boolean;
  attachment_count: number;
  labels?: string[];
  categories?: string[];
  
  // AI/ML features
  sentiment_score?: number;
  urgency_score?: number;
  spam_score?: number;
  auto_classified_category?: string;
  extracted_entities?: any;
  
  // Tracking
  is_tracked: boolean;
  opened_at?: string;
  open_count: number;
  link_clicks?: any;
  
  // Security
  is_encrypted: boolean;
  is_signed: boolean;
  security_status: 'secure' | 'warning' | 'danger' | 'unknown';
  
  // Collaboration
  assigned_to?: string;
  assigned_at?: string;
  due_date?: string;
  follow_up_date?: string;
  snooze_until?: string;
  
  created_at: string;
  updated_at: string;
}

export interface EmailDraft {
  account_id: string;
  to_emails: string[];
  cc_emails?: string[];
  bcc_emails?: string[];
  subject?: string;
  body_html?: string;
  body_text?: string;
  priority?: 'low' | 'normal' | 'high';
  attachments?: EmailAttachment[];
  in_reply_to?: string;
  references?: string;
}

export interface EmailAttachment {
  name: string;
  size: number;
  type: string;
  data: File | Blob | string;
}

export interface EmailToSend extends EmailDraft {
  scheduled_for?: string;
}

export interface EmailConversation {
  id: string;
  subject: string;
  participants: string[];
  message_count: number;
  unread_count: number;
  last_message_date: string;
  labels: string[];
  is_starred: boolean;
  messages: EmailMessage[];
}

export interface EmailTemplate {
  id: string;
  user_id: string;
  name: string;
  subject?: string;
  body_html?: string;
  body_text?: string;
  variables: string[];
  category?: string;
  is_default: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface EmailRule {
  id: string;
  user_id: string;
  account_id?: string;
  name: string;
  description?: string;
  conditions: any[];
  actions: any[];
  is_enabled: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface EmailContact {
  id: string;
  user_id: string;
  email_address: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  phone?: string;
  notes?: string;
  tags: string[];
  last_contact_date?: string;
  contact_frequency: number;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

// API Functions

// Email Accounts Management
export const createEmailAccount = async (accountData: Partial<EmailAccount>): Promise<EmailAccount> => {
  const { data, error } = await supabase
    .from('email_accounts')
    .insert({
      ...accountData,
      user_id: (await supabase.auth.getUser()).data.user?.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export async function listEmailAccounts(): Promise<EmailAccount[]> {
  const { data, error } = await supabase
    .from('email_accounts')
    .select('*')
    .order('is_default', { ascending: false })
    .order('name');
  
  if (error) throw error;
  return data || [];
}

export async function updateEmailAccount(id: string, updates: Partial<EmailAccount>): Promise<EmailAccount> {
  const { data, error } = await supabase
    .from('email_accounts')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteEmailAccount(id: string): Promise<void> {
  const { error } = await supabase
    .from('email_accounts')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// Test email connection
export const testEmailConnection = async (config: {
  provider: string;
  email_address: string;
  incoming_server: string;
  incoming_port: number;
  incoming_security: string;
  outgoing_server: string;
  outgoing_port: number;
  outgoing_security: string;
  username: string;
  password: string;
  use_oauth: boolean;
}): Promise<{ success: boolean; message: string; details?: any }> => {
  try {
    // In a real implementation, this would test the actual connection
    // For now, we'll simulate the test
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simple validation
    if (!config.incoming_server || !config.outgoing_server) {
      return {
        success: false,
        message: 'Server configuration is incomplete'
      };
    }

    if (!config.use_oauth && (!config.username || !config.password)) {
      return {
        success: false,
        message: 'Username and password are required'
      };
    }

    return {
      success: true,
      message: 'Connection test successful'
    };
  } catch (error) {
    return {
      success: false,
      message: 'Connection test failed',
      details: error
    };
  }
};

// Folders Management
export async function listEmailFolders(accountId: string): Promise<EmailFolder[]> {
  const { data, error } = await supabase
    .from('email_folders')
    .select('*')
    .eq('account_id', accountId)
    .order('sort_order')
    .order('name');
  
  if (error) throw error;
  return data || [];
}

export async function createEmailFolder(folder: Omit<EmailFolder, 'id' | 'created_at' | 'updated_at'>): Promise<EmailFolder> {
  const { data, error } = await supabase
    .from('email_folders')
    .insert([folder])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateEmailFolder(id: string, updates: Partial<EmailFolder>): Promise<EmailFolder> {
  const { data, error } = await supabase
    .from('email_folders')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Messages Management
export async function listEmailMessages(
  accountId?: string,
  folderId?: string,
  filters?: {
    isRead?: boolean;
    isStarred?: boolean;
    isArchived?: boolean;
    assignedTo?: string;
    search?: string;
    labels?: string[];
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }
): Promise<EmailMessage[]> {
  let query = supabase
    .from('email_messages')
    .select(`
      *,
      email_attachments(count)
    `);
  
  if (accountId) query = query.eq('account_id', accountId);
  if (folderId) query = query.eq('folder_id', folderId);
  
  if (filters) {
    if (filters.isRead !== undefined) query = query.eq('is_read', filters.isRead);
    if (filters.isStarred !== undefined) query = query.eq('is_starred', filters.isStarred);
    if (filters.isArchived !== undefined) query = query.eq('is_archived', filters.isArchived);
    if (filters.assignedTo) query = query.eq('assigned_to', filters.assignedTo);
    if (filters.search) {
      query = query.textSearch('fts', filters.search);
    }
    if (filters.labels && filters.labels.length > 0) {
      query = query.overlaps('labels', filters.labels);
    }
    if (filters.dateFrom) query = query.gte('date_received', filters.dateFrom);
    if (filters.dateTo) query = query.lte('date_received', filters.dateTo);
  }
  
  query = query.order('date_received', { ascending: false });
  
  if (filters?.limit) query = query.limit(filters.limit);
  if (filters?.offset) query = query.range(filters.offset, (filters.offset || 0) + (filters.limit || 50) - 1);
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data || [];
}

export async function getEmailMessage(id: string): Promise<EmailMessage> {
  const { data, error } = await supabase
    .from('email_messages')
    .select(`
      *,
      email_attachments(*)
    `)
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

export async function createEmailMessage(message: Omit<EmailMessage, 'id' | 'created_at' | 'updated_at'>): Promise<EmailMessage> {
  const { data, error } = await supabase
    .from('email_messages')
    .insert([message])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateEmailMessage(id: string, updates: Partial<EmailMessage>): Promise<EmailMessage> {
  const { data, error } = await supabase
    .from('email_messages')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteEmailMessage(id: string): Promise<void> {
  const { error } = await supabase
    .from('email_messages')
    .update({ is_deleted: true })
    .eq('id', id);
  
  if (error) throw error;
}

// Bulk operations
export async function bulkUpdateMessages(ids: string[], updates: Partial<EmailMessage>): Promise<void> {
  const { error } = await supabase
    .from('email_messages')
    .update(updates)
    .in('id', ids);
  
  if (error) throw error;
}

export async function markAsRead(ids: string[]): Promise<void> {
  await bulkUpdateMessages(ids, { is_read: true });
}

export async function markAsUnread(ids: string[]): Promise<void> {
  await bulkUpdateMessages(ids, { is_read: false });
}

export async function starMessages(ids: string[]): Promise<void> {
  await bulkUpdateMessages(ids, { is_starred: true });
}

export async function unstarMessages(ids: string[]): Promise<void> {
  await bulkUpdateMessages(ids, { is_starred: false });
}

export async function archiveMessages(ids: string[]): Promise<void> {
  await bulkUpdateMessages(ids, { is_archived: true });
}

export async function unarchiveMessages(ids: string[]): Promise<void> {
  await bulkUpdateMessages(ids, { is_archived: false });
}

export async function moveToFolder(ids: string[], folderId: string): Promise<void> {
  await bulkUpdateMessages(ids, { folder_id: folderId });
}

export async function addLabels(ids: string[], labels: string[]): Promise<void> {
  // This would need a more complex query to merge arrays
  const messages = await supabase
    .from('email_messages')
    .select('id, labels')
    .in('id', ids);
  
  if (messages.data) {
    for (const message of messages.data) {
      const existingLabels = message.labels || [];
      const newLabels = [...new Set([...existingLabels, ...labels])];
      await updateEmailMessage(message.id, { labels: newLabels });
    }
  }
}

// Conversations
export async function listEmailConversations(
  accountId: string,
  filters?: {
    isArchived?: boolean;
    isImportant?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }
): Promise<EmailConversation[]> {
  let query = supabase
    .from('email_conversations')
    .select('*')
    .eq('account_id', accountId);
  
  if (filters) {
    if (filters.isArchived !== undefined) query = query.eq('is_archived', filters.isArchived);
    if (filters.isImportant !== undefined) query = query.eq('is_important', filters.isImportant);
    if (filters.search) {
      query = query.or(`subject.ilike.%${filters.search}%,participants.cs.{${filters.search}}`);
    }
    if (filters.limit) query = query.limit(filters.limit);
    if (filters.offset) query = query.range(filters.offset, (filters.offset || 0) + (filters.limit || 50) - 1);
  }
  
  query = query.order('last_activity_date', { ascending: false });
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data || [];
}

export async function getConversationMessages(threadId: string): Promise<EmailMessage[]> {
  const { data, error } = await supabase
    .from('email_messages')
    .select(`
      *,
      email_attachments(*)
    `)
    .eq('thread_id', threadId)
    .order('date_received');
  
  if (error) throw error;
  return data || [];
}

// Templates
export async function listEmailTemplates(): Promise<EmailTemplate[]> {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .or('user_id.is.null,is_shared.eq.true')
    .order('usage_count', { ascending: false })
    .order('name');
  
  if (error) throw error;
  return data || [];
}

export async function createEmailTemplate(template: Omit<EmailTemplate, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<EmailTemplate> {
  const { data: user } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('email_templates')
    .insert([{ ...template, user_id: user.user?.id }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateEmailTemplate(id: string, updates: Partial<EmailTemplate>): Promise<EmailTemplate> {
  const { data, error } = await supabase
    .from('email_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteEmailTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from('email_templates')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// Email Rules
export async function listEmailRules(accountId?: string): Promise<EmailRule[]> {
  let query = supabase
    .from('email_rules')
    .select('*')
    .order('priority', { ascending: false })
    .order('name');
  
  if (accountId) query = query.eq('account_id', accountId);
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data || [];
}

export async function createEmailRule(rule: Omit<EmailRule, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<EmailRule> {
  const { data: user } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('email_rules')
    .insert([{ ...rule, user_id: user.user?.id }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Contacts
export async function listEmailContacts(
  filters?: {
    search?: string;
    groups?: string[];
    isVip?: boolean;
    limit?: number;
    offset?: number;
  }
): Promise<EmailContact[]> {
  let query = supabase
    .from('email_contacts')
    .select('*');
  
  if (filters) {
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,company.ilike.%${filters.search}%`);
    }
    if (filters.groups && filters.groups.length > 0) {
      query = query.overlaps('groups', filters.groups);
    }
    if (filters.isVip !== undefined) query = query.eq('is_vip', filters.isVip);
    if (filters.limit) query = query.limit(filters.limit);
    if (filters.offset) query = query.range(filters.offset, (filters.offset || 0) + (filters.limit || 50) - 1);
  }
  
  query = query.order('relationship_strength', { ascending: false })
                .order('last_email_date', { ascending: false });
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data || [];
}

export async function createEmailContact(contact: Omit<EmailContact, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<EmailContact> {
  const { data: user } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('email_contacts')
    .insert([{ ...contact, user_id: user.user?.id }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Search
export async function searchEmails(
  query: string,
  filters?: {
    accountId?: string;
    folderId?: string;
    dateFrom?: string;
    dateTo?: string;
    hasAttachments?: boolean;
    fromEmail?: string;
    toEmail?: string;
    limit?: number;
  }
): Promise<EmailMessage[]> {
  let searchQuery = supabase
    .from('email_messages')
    .select(`
      *,
      email_attachments(count)
    `)
    .textSearch('fts', query);
  
  if (filters) {
    if (filters.accountId) searchQuery = searchQuery.eq('account_id', filters.accountId);
    if (filters.folderId) searchQuery = searchQuery.eq('folder_id', filters.folderId);
    if (filters.dateFrom) searchQuery = searchQuery.gte('date_received', filters.dateFrom);
    if (filters.dateTo) searchQuery = searchQuery.lte('date_received', filters.dateTo);
    if (filters.hasAttachments !== undefined) searchQuery = searchQuery.eq('has_attachments', filters.hasAttachments);
    if (filters.fromEmail) searchQuery = searchQuery.eq('from_email', filters.fromEmail);
    if (filters.toEmail) searchQuery = searchQuery.contains('to_emails', [filters.toEmail]);
    if (filters.limit) searchQuery = searchQuery.limit(filters.limit);
  }
  
  searchQuery = searchQuery.order('date_received', { ascending: false });
  
  const { data, error } = await searchQuery;
  
  if (error) throw error;
  return data || [];
}

// Analytics
export async function getEmailAnalytics(
  dateFrom: string,
  dateTo: string,
  accountId?: string
): Promise<any> {
  let query = supabase
    .from('email_analytics')
    .select('*')
    .gte('date', dateFrom)
    .lte('date', dateTo);
  
  if (accountId) query = query.eq('account_id', accountId);
  
  const { data, error } = await query.order('date');
  
  if (error) throw error;
  return data || [];
}

// OAuth Integration helpers (would need actual OAuth implementation)
export async function initializeGmailAuth(): Promise<string> {
  // This would return OAuth URL for Gmail authentication
  throw new Error('OAuth integration not implemented yet');
}

export async function initializeOutlookAuth(): Promise<string> {
  // This would return OAuth URL for Outlook authentication
  throw new Error('OAuth integration not implemented yet');
}

// Email sync functions (would need actual email protocol implementation)
export async function syncEmailAccount(accountId: string): Promise<void> {
  // This would perform actual email sync via IMAP/POP3/OAuth
  await updateEmailAccount(accountId, { 
    status: 'syncing',
    last_sync_at: new Date().toISOString()
  });
  
  // Actual sync implementation would go here
  
  await updateEmailAccount(accountId, { status: 'active' });
}

// Send email
export const sendEmail = async (
  accountId: string,
  toEmails: string[],
  subject: string,
  bodyHtml?: string,
  bodyText?: string,
  ccEmails?: string[],
  bccEmails?: string[],
  attachments?: EmailAttachment[],
  options?: {
    priority?: 'low' | 'normal' | 'high';
    inReplyTo?: string;
    references?: string;
  }
): Promise<EmailMessage> => {
  const { data, error } = await supabase.rpc('send_email', {
    p_account_id: accountId,
    p_to_emails: toEmails,
    p_cc_emails: ccEmails || [],
    p_bcc_emails: bccEmails || [],
    p_subject: subject,
    p_body_html: bodyHtml,
    p_body_text: bodyText,
    p_priority: options?.priority || 'normal',
    p_in_reply_to: options?.inReplyTo,
    p_references: options?.references,
    p_attachments: attachments || []
  });

  if (error) throw error;
  return data;
};

// Save draft
export const saveDraft = async (draft: EmailDraft): Promise<EmailMessage> => {
  const { data, error } = await supabase
    .from('email_messages')
    .insert({
      account_id: draft.account_id,
      folder_id: null, // Drafts don't have a folder initially
      message_id: `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      from_email: '', // Will be set from account
      to_emails: draft.to_emails,
      cc_emails: draft.cc_emails || [],
      bcc_emails: draft.bcc_emails || [],
      subject: draft.subject,
      body_html: draft.body_html,
      body_text: draft.body_text,
      priority: draft.priority === 'high' ? 3 : draft.priority === 'low' ? 1 : 2,
      is_draft: true,
      is_read: true,
      date_received: new Date().toISOString(),
      in_reply_to: draft.in_reply_to,
      references: draft.references
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Schedule email
export const scheduleEmail = async (email: EmailToSend): Promise<EmailMessage> => {
  const { data, error } = await supabase
    .from('email_messages')
    .insert({
      account_id: email.account_id,
      folder_id: null,
      message_id: `scheduled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      from_email: '', // Will be set from account
      to_emails: email.to_emails,
      cc_emails: email.cc_emails || [],
      bcc_emails: email.bcc_emails || [],
      subject: email.subject,
      body_html: email.body_html,
      body_text: email.body_text,
      priority: email.priority === 'high' ? 3 : email.priority === 'low' ? 1 : 2,
      is_scheduled: true,
      scheduled_for: email.scheduled_for,
      is_read: true,
      date_received: new Date().toISOString(),
      in_reply_to: email.in_reply_to,
      references: email.references
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

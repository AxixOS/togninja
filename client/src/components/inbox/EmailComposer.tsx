import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Send,
  Paperclip,
  Image,
  Smile,
  Save,
  Clock,
  Bold,
  Italic,
  Underline,
  List,
  AlignLeft,
  AlignCenter,
  FileText
} from 'lucide-react';
import { EmailMessage, EmailAccount, sendEmail, saveDraft, scheduleEmail } from '../../api/inbox';

interface EmailComposerProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'compose' | 'reply' | 'forward';
  replyToMessage?: EmailMessage;
  forwardMessage?: EmailMessage;
  account: EmailAccount;
  onSent?: (message: EmailMessage) => void;
}

interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
}

const EmailComposer: React.FC<EmailComposerProps> = ({
  isOpen,
  onClose,
  mode,
  replyToMessage,
  forwardMessage,
  account,
  onSent
}) => {
  const [to, setTo] = useState<string[]>([]);
  const [cc, setCc] = useState<string[]>([]);
  const [bcc, setBcc] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [bodyType, setBodyType] = useState<'text' | 'html'>('html');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal');
  const [scheduling, setScheduling] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      initializeComposer();
    }
  }, [isOpen, mode, replyToMessage, forwardMessage]);

  const initializeComposer = () => {
    if (mode === 'reply' && replyToMessage) {
      setTo([replyToMessage.from_email]);
      setSubject(`Re: ${replyToMessage.subject || ''}`);
      setBody(generateReplyBody(replyToMessage));
    } else if (mode === 'forward' && forwardMessage) {
      setSubject(`Fwd: ${forwardMessage.subject || ''}`);
      setBody(generateForwardBody(forwardMessage));
    } else {
      // Compose new
      setTo([]);
      setCc([]);
      setBcc([]);
      setSubject('');
      setBody(account.signature_html || '');
    }
    setAttachments([]);
    setPriority('normal');
    setScheduling(false);
    setScheduledDate('');
  };

  const generateReplyBody = (message: EmailMessage): string => {
    const originalBody = message.body_html || message.body_text || '';
    const signature = account.signature_html || '';
    const replyHeader = `
      <br><br>
      <div style="border-left: 3px solid #ccc; padding-left: 12px; color: #666;">
        <p><strong>From:</strong> ${message.from_name || message.from_email}</p>
        <p><strong>Date:</strong> ${new Date(message.date_sent || message.date_received).toLocaleString()}</p>
        <p><strong>Subject:</strong> ${message.subject}</p>
        <br>
        ${originalBody}
      </div>
    `;
    return signature + replyHeader;
  };

  const generateForwardBody = (message: EmailMessage): string => {
    const originalBody = message.body_html || message.body_text || '';
    const signature = account.signature_html || '';
    const forwardHeader = `
      <br><br>
      <div style="border: 1px solid #ddd; padding: 12px; background: #f9f9f9;">
        <p><strong>---------- Forwarded message ---------</strong></p>
        <p><strong>From:</strong> ${message.from_name || message.from_email}</p>
        <p><strong>Date:</strong> ${new Date(message.date_sent || message.date_received).toLocaleString()}</p>
        <p><strong>Subject:</strong> ${message.subject}</p>
        <p><strong>To:</strong> ${message.to_emails.join(', ')}</p>
        <br>
        ${originalBody}
      </div>
    `;
    return signature + forwardHeader;
  };

  const handleAddAttachment = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const newAttachments: Attachment[] = files.map(file => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      file
    }));
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const addEmailToField = (email: string, field: 'to' | 'cc' | 'bcc') => {
    const setter = field === 'to' ? setTo : field === 'cc' ? setCc : setBcc;
    const current = field === 'to' ? to : field === 'cc' ? cc : bcc;
    
    if (!current.includes(email)) {
      setter([...current, email]);
    }
  };

  const removeEmailFromField = (email: string, field: 'to' | 'cc' | 'bcc') => {
    const setter = field === 'to' ? setTo : field === 'cc' ? setCc : setBcc;
    const current = field === 'to' ? to : field === 'cc' ? cc : bcc;
    
    setter(current.filter(e => e !== email));
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await saveDraft({
        account_id: account.id,
        to_emails: to,
        cc_emails: cc,
        bcc_emails: bcc,
        subject,
        body_html: bodyType === 'html' ? body : undefined,
        body_text: bodyType === 'text' ? body : undefined,
        priority,
        attachments: attachments.map(att => ({
          name: att.name,
          size: att.size,
          type: att.type,
          data: att.file
        }))
      });
      // Show success notification
    } catch (error) {
      // console.error removed
      // Show error notification
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    if (!to.length) {
      alert('Please add at least one recipient');
      return;
    }

    setSending(true);
    try {      const message = await sendEmail(
        account.id,
        to,
        subject,
        bodyType === 'html' ? body : undefined,
        bodyType === 'text' ? body : undefined,
        cc,
        bcc,
        attachments.map(att => ({
          name: att.name,
          size: att.size,
          type: att.type,
          data: att.file
        })),
        {
          priority,
          inReplyTo: replyToMessage?.message_id,
          references: replyToMessage?.references
        }
      );

      onSent?.(message);
      onClose();
    } catch (error) {
      // console.error removed
      // Show error notification
    } finally {
      setSending(false);
    }
  };

  const handleScheduleSend = async () => {
    if (!scheduledDate) {
      alert('Please select a date and time to schedule');
      return;
    }

    try {
      await scheduleEmail({
        account_id: account.id,
        to_emails: to,
        cc_emails: cc,
        bcc_emails: bcc,
        subject,
        body_html: bodyType === 'html' ? body : undefined,
        body_text: bodyType === 'text' ? body : undefined,
        priority,
        scheduled_for: scheduledDate,
        attachments: attachments.map(att => ({
          name: att.name,
          size: att.size,
          type: att.type,
          data: att.file
        }))
      });

      onClose();
    } catch (error) {
      // console.error removed
    }
  };

  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      style={{ direction: 'ltr' }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-lg shadow-xl w-full max-w-5xl h-5/6 flex flex-col overflow-hidden"
        style={{ direction: 'ltr' }}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold">
              {mode === 'reply' ? 'Reply' : mode === 'forward' ? 'Forward' : 'Compose'}
            </h3>
            <div className="flex items-center space-x-2">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'low' | 'normal' | 'high')}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="low">Low Priority</option>
                <option value="normal">Normal Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
              title="Templates"
            >
              <FileText size={16} />
            </button>
            <button
              onClick={() => setScheduling(!scheduling)}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
              title="Schedule Send"
            >
              <Clock size={16} />
            </button>
            <button
              onClick={handleSaveDraft}
              disabled={saving}
              className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
              title="Save Draft"
            >
              <Save size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Recipients */}
        <div className="p-4 border-b border-gray-200 space-y-3">
          {/* To field */}
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-gray-700 w-12">To:</label>
            <div className="flex-1 flex flex-wrap items-center gap-2">
              {to.map((email, index) => (
                <span
                  key={index}
                  className="inline-flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm"
                >
                  {email}
                  <button
                    onClick={() => removeEmailFromField(email, 'to')}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              <input
                type="email"
                placeholder="Add recipients..."
                className="flex-1 min-w-0 border-none outline-none text-sm ltr-editor"
                style={{ direction: 'ltr', textAlign: 'left' }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    const email = e.currentTarget.value.trim();
                    if (email) {
                      addEmailToField(email, 'to');
                      e.currentTarget.value = '';
                    }
                  }
                }}
              />
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setShowCc(!showCc)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Cc
              </button>
              <button
                onClick={() => setShowBcc(!showBcc)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Bcc
              </button>
            </div>
          </div>

          {/* CC field */}
          {showCc && (
            <div className="flex items-center space-x-3">
              <label className="text-sm font-medium text-gray-700 w-12">Cc:</label>
              <div className="flex-1 flex flex-wrap items-center gap-2">
                {cc.map((email, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-sm"
                  >
                    {email}
                    <button
                      onClick={() => removeEmailFromField(email, 'cc')}
                      className="ml-1 text-gray-600 hover:text-gray-800"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                <input
                  type="email"
                  placeholder="Add CC recipients..."
                  className="flex-1 min-w-0 border-none outline-none text-sm ltr-editor"
                  style={{ direction: 'ltr', textAlign: 'left' }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      const email = e.currentTarget.value.trim();
                      if (email) {
                        addEmailToField(email, 'cc');
                        e.currentTarget.value = '';
                      }
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* BCC field */}
          {showBcc && (
            <div className="flex items-center space-x-3">
              <label className="text-sm font-medium text-gray-700 w-12">Bcc:</label>
              <div className="flex-1 flex flex-wrap items-center gap-2">
                {bcc.map((email, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-sm"
                  >
                    {email}
                    <button
                      onClick={() => removeEmailFromField(email, 'bcc')}
                      className="ml-1 text-gray-600 hover:text-gray-800"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                <input
                  type="email"
                  placeholder="Add BCC recipients..."
                  className="flex-1 min-w-0 border-none outline-none text-sm ltr-editor"
                  style={{ direction: 'ltr', textAlign: 'left' }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      const email = e.currentTarget.value.trim();
                      if (email) {
                        addEmailToField(email, 'bcc');
                        e.currentTarget.value = '';
                      }
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* Subject */}
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-gray-700 w-12">Subject:</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject..."
              className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ltr-editor"
              style={{ direction: 'ltr', textAlign: 'left' }}
            />
          </div>
        </div>

        {/* Scheduling */}
        {scheduling && (
          <div className="p-4 border-b border-gray-200 bg-yellow-50">
            <div className="flex items-center space-x-4">
              <Clock size={16} className="text-yellow-600" />
              <label className="text-sm font-medium text-gray-700">Schedule for:</label>
              <input
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
              />
              <button
                onClick={() => setScheduling(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Formatting toolbar */}
        <div className="p-2 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => formatText('bold')}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
            >
              <Bold size={16} />
            </button>
            <button
              onClick={() => formatText('italic')}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
            >
              <Italic size={16} />
            </button>
            <button
              onClick={() => formatText('underline')}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
            >
              <Underline size={16} />
            </button>
            <div className="w-px h-6 bg-gray-300 mx-2" />
            <button
              onClick={() => formatText('insertUnorderedList')}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => formatText('justifyLeft')}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
            >
              <AlignLeft size={16} />
            </button>
            <button
              onClick={() => formatText('justifyCenter')}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
            >
              <AlignCenter size={16} />
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <select
              value={bodyType}
              onChange={(e) => setBodyType(e.target.value as 'text' | 'html')}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="html">Rich Text</option>
              <option value="text">Plain Text</option>
            </select>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 p-4">
          {bodyType === 'html' ? (
            <div
              contentEditable
              dangerouslySetInnerHTML={{ __html: body }}
              onInput={(e) => setBody(e.currentTarget.innerHTML)}
              className="w-full h-full border border-gray-300 rounded p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 overflow-auto ltr-editor"
              style={{ 
                minHeight: '200px',
                direction: 'ltr',
                textAlign: 'left',
                unicodeBidi: 'embed'
              }}
            />
          ) : (
            <textarea
              ref={bodyRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message..."
              className="w-full h-full border border-gray-300 rounded p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ltr-editor"
              style={{ 
                minHeight: '200px',
                direction: 'ltr',
                textAlign: 'left',
                unicodeBidi: 'embed'
              }}
            />
          )}
        </div>

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center space-x-2 mb-2">
              <Paperclip size={16} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                Attachments ({attachments.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center space-x-2 bg-gray-100 rounded px-3 py-2 text-sm"
                >
                  <span className="truncate max-w-xs">{attachment.name}</span>
                  <span className="text-gray-500">({formatFileSize(attachment.size)})</span>
                  <button
                    onClick={() => removeAttachment(attachment.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleAddAttachment}
              className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
            >
              <Paperclip size={16} />
              <span className="text-sm">Attach</span>
            </button>
            <button className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded">
              <Image size={16} />
              <span className="text-sm">Image</span>
            </button>
            <button className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded">
              <Smile size={16} />
              <span className="text-sm">Emoji</span>
            </button>
          </div>

          <div className="flex items-center space-x-3">
            {scheduling && (
              <button
                onClick={handleScheduleSend}
                className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <Clock size={16} />
                <span>Schedule</span>
              </button>
            )}
            <button
              onClick={handleSend}
              disabled={sending || !to.length}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={16} />
              <span>{sending ? 'Sending...' : 'Send'}</span>
            </button>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </motion.div>
    </motion.div>
  );
};

export default EmailComposer;

import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Paperclip, Image, FileText, Save } from 'lucide-react';
import { useEmailDraftAutoSave } from '../../hooks/useDraftAutoSave';

interface SimpleEmailComposerProps {
  isOpen: boolean;
  onClose: () => void;
  onSent?: (data: any) => void;
}

const SimpleEmailComposer: React.FC<SimpleEmailComposerProps> = ({
  isOpen,
  onClose,
  onSent
}) => {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Draft auto-save functionality
  const studioId = "studio-1"; // TODO: Get from context
  const userId = "admin"; // TODO: Get from auth
  const emailData = { to, subject, body };
  const { restoreDraft, clearDraft } = useEmailDraftAutoSave(studioId, userId, emailData);
  
  // Restore draft on component mount
  useEffect(() => {
    if (isOpen) {
      const savedDraft = restoreDraft();
      if (savedDraft) {
        setTo(savedDraft.to || '');
        setSubject(savedDraft.subject || '');
        setBody(savedDraft.body || '');
        console.log('Draft restored successfully');
      }
    }
  }, [isOpen, restoreDraft]);

  if (!isOpen) return null;

  const handleSend = async () => {
    try {
      // console.log removed
      
      // Convert files to base64 for transmission
      const attachmentPromises = attachments.map(async (file) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result?.toString().split(',')[1]; // Remove data URL prefix
            resolve({
              filename: file.name,
              content: base64,
              contentType: file.type,
              encoding: 'base64'
            });
          };
          reader.readAsDataURL(file);
        });
      });

      const processedAttachments = await Promise.all(attachmentPromises);

    const response = await fetch('/api/communications/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
      to,
      subject,
      content: body,
      html: body.replace(/\n/g, '<br>'),
      attachments: processedAttachments,
      autoLinkClient: true
        })
      });

      const result = await response.json();

      if (result.success && result.demo) {
        // Demo mode = logged to "Sent" but NOT actually delivered. Be honest.
        alert('⚠️ Email was NOT delivered — ' + (result.error || 'email is not configured (demo mode).') + '\n\nCheck Settings → Email / SMTP (host, port 465, user, password).');
      } else if (result.success) {
        // console.log removed
        onSent?.({ to, subject, body, attachments, messageId: result.messageId });
        clearDraft(); // Clear saved draft after successful send
        onClose();
        // Reset form
        setTo('');
        setSubject('');
        setBody('');
        setAttachments([]);
      } else {
        // console.error removed
        alert('Failed to send email: ' + result.error);
      }
    } catch (error) {
      // console.error removed
      alert('Error sending email. Please try again.');
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-5/6 flex flex-col overflow-hidden"
        dir="ltr"
        style={{ 
          direction: 'ltr',
          textAlign: 'left'
        }}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <h3 className="text-lg font-semibold">Compose Email</h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4 flex-1">
          {/* To field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To:</label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              dir="ltr"
              style={{ 
                direction: 'ltr' as const,
                textAlign: 'left' as const,
                unicodeBidi: 'embed'
              }}
            />
          </div>

          {/* Subject field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject:</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              dir="ltr"
              style={{ 
                direction: 'ltr' as const,
                textAlign: 'left' as const,
                unicodeBidi: 'embed'
              }}
            />
          </div>

          {/* Message body */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message:</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message here..."
              rows={8}
              className="w-full border border-gray-300 rounded px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              dir="ltr"
              style={{ 
                direction: 'ltr' as const,
                textAlign: 'left' as const,
                unicodeBidi: 'embed',
                writingMode: 'horizontal-tb'
              }}
            />
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Attachments:</label>
              <div className="space-y-2">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded border">
                    <div className="flex items-center space-x-2">
                      {file.type.startsWith('image/') ? (
                        <Image size={16} className="text-blue-500" />
                      ) : (
                        <FileText size={16} className="text-gray-500" />
                      )}
                      <span className="text-sm text-gray-700">{file.name}</span>
                      <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                    </div>
                    <button
                      onClick={() => removeAttachment(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* File Upload Buttons */}
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
            >
              <Paperclip size={16} />
              <span>Attach File</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.multiple = true;
                input.onchange = (e) => {
                  const files = Array.from((e.target as HTMLInputElement).files || []);
                  setAttachments(prev => [...prev, ...files]);
                };
                input.click();
              }}
              className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
            >
              <Image size={16} />
              <span>Add Images</span>
            </button>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="text-sm text-gray-500">
            Simple Email Composer
            {(!to.trim() || !subject.trim()) && (
              <div className="text-xs text-red-500 mt-1">
                {!to.trim() && 'Please enter recipient email'} 
                {!to.trim() && !subject.trim() && ' • '}
                {!subject.trim() && 'Please enter subject'}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={!to.trim() || !subject.trim()}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!to.trim() ? 'Please enter recipient email' : !subject.trim() ? 'Please enter subject' : 'Send email'}
            >
              <Send size={16} />
              <span>Send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleEmailComposer;
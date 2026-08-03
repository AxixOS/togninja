import React, { useState, useEffect } from 'react';
import { X, Eye, Calendar, Mail } from 'lucide-react';

interface Email {
  id: string;
  subject: string;
  from: string;
  to: string;
  content: string;
  timestamp: string;
  type: 'sent' | 'received';
}

interface ViewEmailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
}

const ViewEmailsModal: React.FC<ViewEmailsModalProps> = ({
  isOpen,
  onClose,
  clientId,
  clientName
}) => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && clientId) {
      fetchEmails();
    }
  }, [isOpen, clientId]);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/crm/clients/${clientId}/messages`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch client emails');
      }
      
      const data = await response.json();
      setEmails(data);
    } catch (error) {
      console.error('Failed to fetch emails:', error);
      setEmails([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Email Communications
            </h2>
            <p className="text-gray-600">Emails for {clientName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Email List */}
          <div className="w-1/2 border-r overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-gray-600">
                Loading emails...
              </div>
            ) : emails.length === 0 ? (
              <div className="p-6 text-center text-gray-600">
                <Mail size={48} className="mx-auto mb-4 text-gray-400" />
                <p>No emails found for this client</p>
                <p className="text-sm text-gray-500 mt-2">
                  Emails are automatically linked when imported from the inbox
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {emails.map((email) => (
                  <div
                    key={email.id}
                    onClick={() => setSelectedEmail(email)}
                    className={`p-4 rounded-lg cursor-pointer transition-colors ${
                      selectedEmail?.id === email.id
                        ? 'bg-blue-50 border-2 border-blue-200'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        email.type === 'sent' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {email.type === 'sent' ? 'Sent' : 'Received'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(email.timestamp)}
                      </span>
                    </div>
                    <h3 className="font-medium text-gray-900 text-sm mb-1">
                      {email.subject}
                    </h3>
                    <p className="text-xs text-gray-600">
                      {email.type === 'sent' ? `To: ${email.to}` : `From: ${email.from}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Email Content */}
          <div className="w-1/2 overflow-y-auto">
            {selectedEmail ? (
              <div className="p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {selectedEmail.subject}
                  </h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>From:</strong> {selectedEmail.from}</p>
                    <p><strong>To:</strong> {selectedEmail.to}</p>
                    <p><strong>Date:</strong> {formatDate(selectedEmail.timestamp)}</p>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <div className="whitespace-pre-wrap text-gray-800">
                    {selectedEmail.content}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <Eye size={48} className="mx-auto mb-4 text-gray-400" />
                  <p>Select an email to view its content</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewEmailsModal;
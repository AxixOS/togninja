import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status: string;
}

interface Communication {
  id: string;
  subject: string;
  content: string;
  messageType: 'email' | 'sms';
  status: string;
  direction: 'inbound' | 'outbound';
  sentAt?: string;
  clientName?: string;
  clientEmail?: string;
  phoneNumber?: string;
}

const CommunicationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('bulk');
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);

  // Bulk SMS form state — the only messaging feature on this page. Email and
  // WhatsApp were removed; provider (SMS gateway) setup happens at onboarding.
  const [bulkSMSForm, setBulkSMSForm] = useState({
    content: '',
    targetType: 'all' as 'all' | 'leads' | 'clients' | 'custom',
    targetPreview: [] as Client[],
  });

  useEffect(() => {
    loadCommunications();
    loadClients();
  }, []);

  const loadCommunications = async () => {
    try {
      const response = await fetch('/api/communications/all');
      if (response.ok) {
        const data = await response.json();
        setCommunications(data.communications || []);
      }
    } catch (error) {
      console.error('Failed to load communications:', error);
    }
  };

  const loadClients = async () => {
    try {
      const response = await fetch('/api/crm/clients');
      if (response.ok) {
        const data = await response.json();
        setClients(data.clients || []);
      }
    } catch (error) {
      console.error('Failed to load clients:', error);
    }
  };

  const previewBulkTargets = async () => {
    try {
      const response = await fetch('/api/communications/bulk/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType: bulkSMSForm.targetType }),
      });

      const result = await response.json();
      setBulkSMSForm(prev => ({ ...prev, targetPreview: result.clients || [] }));
    } catch (error) {
      console.error('Failed to preview targets:', error);
    }
  };

  const sendBulkSMS = async () => {
    if (!bulkSMSForm.content) {
      alert('Please enter SMS content');
      return;
    }

    if (bulkSMSForm.targetPreview.length === 0) {
      alert('No target recipients found');
      return;
    }

    if (!confirm(`Send SMS to ${bulkSMSForm.targetPreview.length} recipients?`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/communications/sms/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: bulkSMSForm.content,
          targetType: bulkSMSForm.targetType,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`Bulk SMS campaign completed! Sent: ${result.sentCount}, Failed: ${result.failedCount}`);
        setBulkSMSForm({ content: '', targetType: 'all', targetPreview: [] });
        loadCommunications();
      } else {
        alert(`Failed to send bulk SMS: ${result.errors?.join(', ')}`);
      }
    } catch (error) {
      alert(`Error sending bulk SMS: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // History shows outbound SMS only. The raw feed also contained inbox email
  // items (received mail) which read as stale/placeholder data here; email and
  // WhatsApp are no longer features of this page, so filter them out.
  const smsHistory = communications.filter((c) => (c.messageType || 'sms') === 'sms');

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-purple-900 mb-8">Communications Center</h1>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'bulk', label: 'Bulk SMS' },
              { id: 'history', label: 'History' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Bulk SMS Tab */}
        {activeTab === 'bulk' && (
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl">
            <h2 className="text-xl font-bold text-purple-900 mb-4">Bulk SMS Campaign</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Audience
                </label>
                <select
                  value={bulkSMSForm.targetType}
                  onChange={(e) => setBulkSMSForm(prev => ({ 
                    ...prev, 
                    targetType: e.target.value as any,
                    targetPreview: []
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="all">All Clients</option>
                  <option value="leads">Leads Only</option>
                  <option value="clients">Active Clients Only</option>
                </select>
              </div>
              <div>
                <button
                  onClick={previewBulkTargets}
                  className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                >
                  Preview Recipients
                </button>
                {bulkSMSForm.targetPreview.length > 0 && (
                  <div className="mt-2 text-sm text-gray-600">
                    Found {bulkSMSForm.targetPreview.length} recipients with phone numbers
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message (use {'{name}'} for personalization)
                </label>
                <textarea
                  value={bulkSMSForm.content}
                  onChange={(e) => setBulkSMSForm(prev => ({ ...prev, content: e.target.value }))}
                  rows={4}
                  maxLength={160}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Hello {name}, special offer just for you!"
                />
                <div className="text-sm text-gray-500 mt-1">
                  {bulkSMSForm.content.length}/160 characters
                </div>
              </div>
              <button
                onClick={sendBulkSMS}
                disabled={loading || bulkSMSForm.targetPreview.length === 0}
                className="w-full bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 disabled:opacity-50"
              >
                {loading ? 'Sending...' : `Send to ${bulkSMSForm.targetPreview.length} Recipients`}
              </button>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-purple-900">Communication History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subject/Content
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recipient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {smsHistory.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                        No SMS campaigns sent yet. Your sent messages will appear here.
                      </td>
                    </tr>
                  )}
                  {smsHistory.map((comm) => (
                    <tr key={comm.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          📱 SMS
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">SMS Message</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {comm.content}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {comm.clientName ? `${comm.clientName}` : 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {comm.clientEmail || comm.phoneNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          comm.status === 'sent' 
                            ? 'bg-green-100 text-green-800' 
                            : comm.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {comm.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {comm.sentAt ? new Date(comm.sentAt).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CommunicationsPage;

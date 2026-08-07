import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { ArrowLeft, Mail, Phone, MapPin, Building, Edit, Trash2, Calendar, Euro, MessageSquare, Plus, FileText, Inbox, ClipboardList, Eye, Download, Link, Share, Clock, Image as ImageIcon } from 'lucide-react';
import { googleCalendarService } from '../../services/googleCalendarService';
import SendQuestionnaireModal from '../../components/admin/SendQuestionnaireModal';
import ViewEmailsModal from '../../components/admin/ViewEmailsModal';
import ViewQuestionnairesModal from '../../components/admin/ViewQuestionnairesModal';
import { SITE } from '../../config/site';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  clientId?: string;
  email: string;
  phone: string;
  address: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  company?: string;
  vatNumber?: string;
  notes?: string;
  status: 'active' | 'inactive' | 'archived';
  clientSince?: string;
  lastSessionDate?: string;
  lifetimeValue?: string;
  createdAt: string;
}

const ClientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [clientInvoices, setClientInvoices] = useState<any[]>([]);
  const [clientSessions, setClientSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQuestionnaireModal, setShowQuestionnaireModal] = useState(false);
  const [showEmailsModal, setShowEmailsModal] = useState(false);
  const [showSurveysModal, setShowSurveysModal] = useState(false);
  // Galleries delivered to this client. The client record had no link to them, so
  // finding a client's gallery meant going to Galleries and searching by name.
  const [clientGalleries, setClientGalleries] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      fetchClient(id);
      fetchClientInvoices(id);
      fetchClientSessions(id);
      fetchClientGalleries(id);
    }
  }, [id]);

  const fetchClientGalleries = async (clientId: string) => {
    try {
      // The admin list already supports filtering by client.
      const res = await fetch(`/api/admin/galleries?clientId=${encodeURIComponent(clientId)}`, {
        credentials: 'include',
      });
      if (!res.ok) return;
      const data = await res.json();
      setClientGalleries(Array.isArray(data) ? data : []);
    } catch {
      /* the rest of the client page must still render */
    }
  };

  const fetchClient = async (clientId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/crm/clients/${clientId}`);
      
      if (!response.ok) {
        throw new Error('Client not found');
      }
      
      const clientData = await response.json();
      setClient(clientData);
    } catch (err) {
      setError('Failed to load client details');
    } finally {
      setLoading(false);
    }
  };

  const fetchClientInvoices = async (clientId: string) => {
    try {
      const response = await fetch(`/api/crm/invoices?clientId=${clientId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setClientInvoices(data.invoices || []);
      }
    } catch (err) {
      console.error('Failed to fetch client invoices:', err);
    }
  };

  const fetchClientSessions = async (clientId: string) => {
    try {
      setLoadingSessions(true);
      const response = await fetch(`/api/calendar/sessions?client_id=${clientId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const sessions = await response.json();
        setClientSessions(Array.isArray(sessions) ? sessions : []);
      }
    } catch (err) {
      console.error('Failed to fetch client sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  // PDF Download Function for invoices
  const downloadInvoicePDF = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const response = await fetch(`/api/crm/invoices/${invoiceId}/pdf`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/pdf'
        }
      });
      
      if (!response.ok) {
        throw new Error(`PDF generation failed: ${response.status}`);
      }
      
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `Rechnung-${invoiceNumber || invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert('PDF download failed. Please try again.');
    }
  };

  // Copy Invoice Link to Clipboard Function
  const copyInvoiceLinkToClipboard = async (invoiceId: string) => {
    const baseUrl = window.location.origin;
    const shareableLink = `${baseUrl}/invoice/${invoiceId}`;
    
    try {
      await navigator.clipboard.writeText(shareableLink);
      alert('Invoice link copied to clipboard!');
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareableLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Invoice link copied to clipboard!');
    }
  };

  // Share Invoice via WhatsApp Function
  const shareInvoiceViaWhatsApp = (invoiceId: string) => {
    const baseUrl = window.location.origin;
    const shareableLink = `${baseUrl}/invoice/${invoiceId}`;
    const message = encodeURIComponent(
      `Hi ${client?.firstName || 'there'}! Here's your invoice: ${shareableLink}`
    );
    
    // Open WhatsApp with pre-filled message
    const whatsappUrl = `https://wa.me/?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleEdit = () => {
    navigate(`/admin/clients/${id}/edit`);
  };

  const handleDelete = async () => {
    if (!client) return;
    
    if (!window.confirm(`Are you sure you want to delete ${client.firstName} ${client.lastName}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/crm/clients/${client.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete client');
      }
      
      alert('Client deleted successfully');
      navigate('/admin/clients');
    } catch (err) {
      alert('Failed to delete client. Please try again.');
    }
  };

  const handleScheduleSession = async () => {
    if (!client) return;
    
    try {
      // Create a default session event
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(14, 0, 0, 0); // 2 PM tomorrow
      
      const endTime = new Date(tomorrow);
      endTime.setHours(16, 0, 0, 0); // 4 PM (2 hour session)
      
      const event = {
        title: `Fotoshooting - ${client.firstName} ${client.lastName}`,
        description: `Fotoshooting-Termin mit ${client.firstName} ${client.lastName}\n\nKontakt:\nE-Mail: ${client.email}\nTelefon: ${client.phone || 'Nicht angegeben'}\n\nAdresse: ${client.address || 'Nicht angegeben'}`,
        startTime: tomorrow,
        endTime: endTime,
        // The studio's own address (was hardcoded to a Vienna street, so every
        // studio's calendar invites sent clients to the wrong place).
        location: [`${SITE.name} Studio`, SITE.address.street, SITE.address.postalCode, SITE.address.city]
          .filter(Boolean)
          .join(', '),
        attendees: [client.email],
        clientId: client.id
      };
      
      // Create internally without forcing Google prompt
      await googleCalendarService.createEvent(event, { promptGoogle: false });
      // Navigate to internal calendar with new event context
      navigate(`/admin/calendar?clientId=${client.id}`);
    } catch (error) {
      console.error('Failed to schedule session:', error);
      alert('Failed to schedule session. Please try again.');
    }
  };

  const handleAddAppointment = async () => {
    if (!client) return;
    // Open a lightweight appointment creation (reuse schedule logic but no default times)
    const start = new Date();
    start.setHours(start.getHours() + 2, 0, 0, 0);
    const end = new Date(start);
    end.setHours(end.getHours() + 1);
    const event = {
      title: `Appointment - ${client.firstName} ${client.lastName}`,
      description: `Linked to client ${client.firstName} ${client.lastName} (${client.email})`,
      startTime: start,
      endTime: end,
      clientId: client.id
    };
    await googleCalendarService.createEvent(event, { promptGoogle: false });
    navigate(`/admin/calendar?clientId=${client.id}`);
  };

  const handleCreateInvoice = () => {
    // Navigate to invoices with pre-filled client data
    navigate(`/admin/invoices?clientId=${client?.id}&action=new`);
  };

  const handleSendEmail = async () => {
    if (!client) return;
    navigate(`/admin/inbox?compose=1&to=${encodeURIComponent(client.email)}&name=${encodeURIComponent(client.firstName + ' ' + client.lastName)}`);
  };

  const handleSendSMS = async () => {
    if (!client) return;

    if (!client.phone) {
      alert('No phone number available for this client');
      return;
    }

    // Prefill a message and let the user edit it before sending. (Previously this
    // navigated to /admin/communications with query params the page never read,
    // so nothing happened — the SMS is now sent directly.)
    const defaultMessage = `Hallo ${client.firstName}, vielen Dank für Ihr Interesse an ${SITE.name}. Bei Fragen stehen wir gerne zur Verfügung!`;
    const message = window.prompt(`Send SMS to ${client.phone}:`, defaultMessage);
    if (message == null || !message.trim()) return;

    try {
      const res = await fetch('/api/communications/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: client.phone,
          content: message.trim(),
          clientId: client.id,
          autoLinkClient: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success !== false) {
        alert('SMS sent.');
      } else {
        alert(`Could not send SMS: ${data?.error || data?.message || res.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send SMS:', error);
      alert('Could not send SMS. Please try again.');
    }
  };

  const handleViewEmails = () => {
    setShowEmailsModal(true);
  };

  const handleViewQuestionnaires = () => {
    setShowSurveysModal(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Active' },
      inactive: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Inactive' },
      archived: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Archived' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !client) {
    return (
      <AdminLayout>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error || 'Client not found'}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/admin/clients')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {client.firstName} {client.lastName}
              </h1>
              <p className="text-gray-600">Client Details</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleEdit}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <Edit size={16} className="mr-2" />
              Edit
            </button>
            <button
              onClick={() => setShowQuestionnaireModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <FileText size={16} className="mr-2" />
              Send Questionnaire
            </button>
            <button
              onClick={handleViewEmails}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <Inbox size={16} className="mr-2" />
              View Emails
            </button>
            <button
              onClick={handleViewQuestionnaires}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <ClipboardList size={16} className="mr-2" />
              View Questionnaires
            </button>
            <button
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <Trash2 size={16} className="mr-2" />
              Delete
            </button>
          </div>
        </div>

        {/* Client Information Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {client.firstName} {client.lastName}
              </h2>
              {client.company && (
                <p className="text-gray-600 flex items-center mt-1">
                  <Building size={16} className="mr-2" />
                  {client.company}
                </p>
              )}
            </div>
            {getStatusBadge(client.status)}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <Mail size={16} className="text-gray-400 mr-3" />
                  <a href={`mailto:${client.email}`} className="text-purple-600 hover:text-purple-700">
                    {client.email}
                  </a>
                </div>
                {client.phone && (
                  <div className="flex items-center">
                    <Phone size={16} className="text-gray-400 mr-3" />
                    <a href={`tel:${client.phone}`} className="text-purple-600 hover:text-purple-700">
                      {client.phone}
                    </a>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-start">
                    <MapPin size={16} className="text-gray-400 mr-3 mt-0.5" />
                    <div>
                      <p className="text-gray-900">{client.address}</p>
                      {client.address2 && <p className="text-gray-900">{client.address2}</p>}
                      {client.city && (
                        <p className="text-gray-600">
                          {client.zip && `${client.zip} `}{client.city}
                          {client.state && `, ${client.state}`}
                          {client.country && `, ${client.country}`}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {client.company && (
                  <div className="flex items-center">
                    <Building size={16} className="text-gray-400 mr-3" />
                    <p className="text-gray-900">{client.company}</p>
                  </div>
                )}
                {client.vatNumber && (
                  <div className="flex items-center">
                    <FileText size={16} className="text-gray-400 mr-3" />
                    <p className="text-gray-900">UID: {client.vatNumber}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Details */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Details</h3>
              <div className="space-y-3">
                {client.clientId && (
                  <div>
                    <p className="text-sm text-gray-500">Client ID</p>
                    <p className="text-gray-900">{client.clientId}</p>
                  </div>
                )}
                {client.clientSince && (
                  <div>
                    <p className="text-sm text-gray-500">Client Since</p>
                    <p className="text-gray-900">{new Date(client.clientSince).toLocaleDateString()}</p>
                  </div>
                )}
                {client.lastSessionDate && (
                  <div>
                    <p className="text-sm text-gray-500">Last Session Date</p>
                    <p className="text-gray-900">{new Date(client.lastSessionDate).toLocaleDateString()}</p>
                  </div>
                )}
                {client.lifetimeValue && (
                  <div>
                    <p className="text-sm text-gray-500">Lifetime Value</p>
                    <p className="text-gray-900">€{parseFloat(client.lifetimeValue).toFixed(2)}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Member Since</p>
                  <p className="text-gray-900">{new Date(client.createdAt).toLocaleDateString()}</p>
                </div>
                {client.notes && (
                  <div>
                    <p className="text-sm text-gray-500">Notes</p>
                    <p className="text-gray-900">{client.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Galleries delivered to this client */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Galleries</h3>
            <button
              onClick={() => navigate('/admin/galleries')}
              className="text-sm text-purple-600 hover:text-purple-800"
            >
              All galleries →
            </button>
          </div>

          {clientGalleries.length === 0 ? (
            <div className="text-center py-8">
              <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">No galleries linked to this client yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {clientGalleries.map((g: any) => (
                <div key={g.id} className="flex items-center gap-3 py-3">
                  <div className="w-12 h-12 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                    {g.cover_image ? (
                      <img src={g.cover_image} alt={g.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => navigate(`/admin/galleries/${g.id}/edit`)}
                      className="text-purple-600 hover:text-purple-800 font-medium truncate block text-left"
                    >
                      {g.title}
                    </button>
                    <p className="text-xs text-gray-500">
                      {Number(g.image_count ?? 0)} photo{Number(g.image_count ?? 0) === 1 ? '' : 's'}
                      {g.expires_at ? ` · expires ${new Date(g.expires_at).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                  {g.slug && (
                    <a
                      href={`/gallery/${g.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-600 hover:text-gray-900 whitespace-nowrap"
                    >
                      Open ↗
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invoice History */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Invoice History</h3>
            <button
              onClick={handleCreateInvoice}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Invoice
            </button>
          </div>
          
          {clientInvoices.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices yet</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating an invoice for this client.</p>
              <div className="mt-6">
                <button
                  onClick={handleCreateInvoice}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Invoice
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clientInvoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{invoice.invoiceNumber || invoice.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        €{(invoice.total || invoice.totalAmount || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          invoice.status === 'PAID' ? 'bg-green-100 text-green-800' :
                          invoice.status === 'SENT' ? 'bg-blue-100 text-blue-800' :
                          invoice.status === 'OVERDUE' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {invoice.status || 'DRAFT'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => navigate(`/admin/invoices`)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Invoice"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => downloadInvoicePDF(invoice.id, invoice.invoiceNumber)}
                          className="text-green-600 hover:text-green-900"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => copyInvoiceLinkToClipboard(invoice.id)}
                          className="text-purple-600 hover:text-purple-900"
                          title="Copy Link"
                        >
                          <Link className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => shareInvoiceViaWhatsApp(invoice.id)}
                          className="text-green-500 hover:text-green-700"
                          title="Share via WhatsApp"
                        >
                          <Share className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sessions & Appointments */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Calendar size={20} className="mr-2 text-purple-600" />
              Sessions & Appointments
            </h3>
            <button
              onClick={() => navigate(`/admin/calendar?clientId=${client.id}`)}
              className="text-sm text-purple-600 hover:text-purple-800 font-medium"
            >
              View in Calendar →
            </button>
          </div>

          {loadingSessions ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <p className="text-gray-500 mt-2 text-sm">Loading sessions...</p>
            </div>
          ) : clientSessions.length === 0 ? (
            <div className="text-center py-8">
              <Calendar size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No sessions yet</p>
              <p className="text-gray-400 text-sm">Schedule a session or add an appointment below.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Session</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clientSessions.map((session: any) => {
                    const startTime = session.startTime ? new Date(session.startTime) : null;
                    const endTime = session.endTime ? new Date(session.endTime) : null;
                    const isPast = startTime && startTime < new Date();
                    const statusLabel = session.status || (isPast ? 'completed' : 'scheduled');
                    
                    return (
                      <tr key={session.id} className={`hover:bg-gray-50 ${isPast ? 'opacity-70' : ''}`}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {session.title || 'Untitled Session'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                          <div className="flex items-center">
                            <Clock size={14} className="mr-1 text-gray-400" />
                            {startTime ? (
                              <span>
                                {startTime.toLocaleDateString('de-AT', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                                {' '}
                                {startTime.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' })}
                                {endTime && ` - ${endTime.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' })}`}
                              </span>
                            ) : 'No date'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {session.session_type || session.sessionType || '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            statusLabel === 'completed' ? 'bg-green-100 text-green-800' :
                            statusLabel === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                            statusLabel === 'cancelled' ? 'bg-red-100 text-red-800' :
                            statusLabel === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {session.locationName || session.location_name || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button 
            onClick={handleScheduleSession}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 hover:border-purple-300 transition-colors flex items-center justify-center"
          >
            <Calendar size={20} className="mr-2 text-purple-600" />
            <span>Schedule Session</span>
          </button>
          <button
            onClick={handleAddAppointment}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 hover:border-purple-300 transition-colors flex items-center justify-center"
          >
            <Plus size={20} className="mr-2 text-purple-600" />
            <span>Add Appointment</span>
          </button>
          <button 
            onClick={handleSendEmail}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 hover:border-blue-300 transition-colors flex items-center justify-center"
          >
            <Mail size={20} className="mr-2 text-blue-600" />
            <span>Send Email</span>
          </button>
          <button 
            onClick={handleSendSMS}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 hover:border-orange-300 transition-colors flex items-center justify-center"
            disabled={!client?.phone}
          >
            <MessageSquare size={20} className="mr-2 text-orange-600" />
            <span>Send SMS</span>
          </button>
        </div>
      </div>

      {/* Send Questionnaire Modal */}
      {client && (
        <SendQuestionnaireModal
          isOpen={showQuestionnaireModal}
          onClose={() => setShowQuestionnaireModal(false)}
          client={client}
        />
      )}

      {/* View Emails Modal */}
      {client && (
        <ViewEmailsModal
          isOpen={showEmailsModal}
          onClose={() => setShowEmailsModal(false)}
          clientId={client.id}
          clientName={`${client.firstName} ${client.lastName}`}
        />
      )}

      {/* View Questionnaires Modal */}
      {client && (
        <ViewQuestionnairesModal
          isOpen={showSurveysModal}
          onClose={() => setShowSurveysModal(false)}
          clientId={client.id}
          clientName={`${client.firstName} ${client.lastName}`}
        />
      )}
    </AdminLayout>
  );
};

export default ClientDetailPage;
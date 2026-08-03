import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Plus, Search, Filter, Eye, Edit, Trash2, Phone, Mail, Calendar, CheckCircle, MessageSquare, UserCheck, UserPlus } from 'lucide-react';
import { Lead, getLeads, updateLeadStatus, deleteLead, bulkMarkNewAsContacted } from '../../lib/leads';
import { formatAppDateTime } from '../../lib/dateFormat';

const AdminLeadsPage: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('NEW');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  const [convertingLeadId, setConvertingLeadId] = useState<string | null>(null);
  const [viewingLead, setViewingLead] = useState<Lead | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLeadData, setNewLeadData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    message: '',
    form_source: 'MANUAL' as 'MANUAL' | 'WARTELISTE' | 'KONTAKT'
  });
  const [editFormData, setEditFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    message: '',
    status: 'NEW' as 'NEW' | 'CONTACTED' | 'CONVERTED'
  });

  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [notificationEmail, setNotificationEmail] = useState<string | null>(null);
  // Simple toast helper (keeps UI minimal without external deps)
  // Now supports an optional CTA action button.
  const toast = (opts: { title: string; description?: string; variant?: 'success' | 'error'; action?: { label: string; onClick: () => void } }) => {
    const id = `toast-${Date.now()}`;
    const containerId = 'app-toasts';
    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      container.className = 'fixed top-4 right-4 z-[9999] space-y-2';
      document.body.appendChild(container);
    }
    const el = document.createElement('div');
    el.id = id;
    el.className = `shadow-lg rounded-md px-4 py-3 text-sm ${opts.variant === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`;
    el.innerHTML = `<div class="font-semibold">${opts.title}</div>${opts.description ? `<div class=\"opacity-90\">${opts.description}</div>` : ''}`;

    // Optional CTA button
    if (opts.action) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = opts.action.label;
      btn.className = 'mt-2 inline-flex items-center bg-white/20 hover:bg-white/30 text-white font-medium px-3 py-1 rounded';
      btn.addEventListener('click', () => {
        try { opts.action && opts.action.onClick(); } finally {
          el.remove();
          if (container && container.childElementCount === 0) container.remove();
        }
      });
      el.appendChild(btn);
    }
    container.appendChild(el);
    const ttl = opts.action ? 5000 : 3500;
    setTimeout(() => { el.remove(); if (container && container.childElementCount === 0) container.remove(); }, ttl);
  };

  useEffect(() => {
    fetchLeads();
  }, [statusFilter, searchTerm, page]);

  useEffect(() => {
    // best-effort load of email settings for banner
    (async () => {
      try {
        const resp = await fetch('/api/admin/email-settings');
        if (resp.ok) {
          const s = await resp.json();
          if (s && s.notificationEmail) setNotificationEmail(s.notificationEmail);
        }
      } catch {}
    })();
  }, []);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const { rows, count } = await getLeads({ status: statusFilter as any, q: searchTerm || undefined, limit: pageSize, offset: (page-1)*pageSize });
      setLeads(rows);
      setTotalCount(count);
    } catch (err) {
      // console.error removed
  // Simplified error message (schema auto-create now handled server-side)
  setError('Failed to load leads. Please try again.');
      // Set empty array as fallback
      setLeads([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const onSearchChange = (v: string) => { setSearchTerm(v); setPage(1); };
  const onStatusChange = (v: string) => { setStatusFilter(v === 'all' ? 'ANY' : v); setPage(1); };
  const handleBulkMarkNew = async () => {
    try {
      const res = await fetch('/api/leads/bulk/mark-new-contacted', { method: 'POST' });
      if (!res.ok) throw new Error('Bulk update failed');
      const data = await res.json().catch(() => ({ ok: true, updated: 0 }));
      toast({ title: 'Updated leads', description: `${data.updated || 0} lead(s) marked as Contacted`, variant: 'success' });
      await fetchLeads();
    } catch (e) {
      toast({ title: 'Bulk action failed', description: 'Please try again', variant: 'error' });
      setError('Failed to apply bulk action.');
    }
  };

  const handleStatusChange = async (leadId: string, newStatus: 'NEW' | 'CONTACTED' | 'CONVERTED') => {
    try {
      await updateLeadStatus(leadId, newStatus);
      
      // Update local state
      setLeads(prevLeads => prevLeads.map(lead => 
        lead.id === leadId 
          ? { ...lead, status: newStatus } 
          : lead
      ));
    } catch (err) {
      // console.error removed
      setError('Failed to update lead status. Please try again.');
    }
  };
  const handleCreateLead = async () => {
    try {
      const response = await fetch('/api/leads/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: `${newLeadData.first_name} ${newLeadData.last_name}`.trim(),
          email: newLeadData.email,
          phone: newLeadData.phone,
          message: newLeadData.message,
          source: newLeadData.form_source,
          status: 'new'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create lead');
      }

      // Parse response to get new lead ID
      const data = await response.json().catch(() => ({} as any));

      // Build a minimal lead object we can show in the modal immediately
      const createdLead: Lead = {
        id: (data && data.id) || `${Date.now()}`,
        first_name: newLeadData.first_name,
        last_name: newLeadData.last_name,
        email: newLeadData.email,
        phone: newLeadData.phone,
        message: newLeadData.message,
        status: 'NEW',
        form_source: newLeadData.form_source as any,
        created_at: new Date().toISOString(),
      } as Lead;

      // Success toast with CTA to view the lead
      toast({
        title: 'Lead created',
        description: 'The new lead was saved successfully.',
        variant: 'success',
        action: {
          label: 'View lead',
          onClick: () => setViewingLead(createdLead),
        },
      });

      // Refresh list to include the new lead
      await fetchLeads();
      setShowCreateModal(false);
      setNewLeadData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        message: '',
        form_source: 'MANUAL'
      });
    } catch (err) {
      // console.error removed
      setError('Failed to create lead. Please try again.');
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    try {
      await deleteLead(leadId);
      
      // Update local state
      setLeads(prevLeads => prevLeads.filter(lead => lead.id !== leadId));
      setDeleteConfirmation(null);
    } catch (err) {
      // console.error removed
      setError('Failed to delete lead. Please try again.');
    }
  };

  const handleConvertToClient = async (lead: Lead) => {
    setConvertingLeadId(lead.id);
    try {
      const res = await fetch(`/api/leads/${lead.id}/convert-to-client`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || 'Failed to convert lead');
      }
      const data = await res.json();

      // Update lead status locally to CONVERTED
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: 'CONVERTED' as const } : l));

      if (data.alreadyExisted) {
        toast({
          title: 'Client already exists',
          description: data.message,
          variant: 'success',
          action: {
            label: 'View Client',
            onClick: () => window.location.href = `/admin/clients/${data.clientId}`,
          },
        });
      } else {
        toast({
          title: 'Added to Clients',
          description: `${lead.first_name} ${lead.last_name} is now a client`,
          variant: 'success',
          action: {
            label: 'View Client',
            onClick: () => window.location.href = `/admin/clients/${data.clientId}`,
          },
        });
      }
    } catch (err: any) {
      toast({ title: 'Conversion failed', description: err.message || 'Please try again', variant: 'error' });
    } finally {
      setConvertingLeadId(null);
    }
  };

  const handleViewLead = (lead: Lead) => {
    setViewingLead(lead);
  };

  const handleEditLead = (lead: Lead) => {
    setEditingLead(lead);
    setEditFormData({
      first_name: lead.first_name || '',
      last_name: lead.last_name || '',
      email: lead.email,
      phone: lead.phone || '',
      message: lead.message || '',
      status: lead.status
    });
  };

  const handleUpdateLead = async () => {
    if (!editingLead) return;
    try {
      await updateLeadStatus(editingLead.id, editFormData.status as any);
      setLeads(prev => prev.map(l => l.id === editingLead.id ? { ...l, status: editFormData.status as any } : l));
      setEditingLead(null);
    } catch (e) {
      setError('Failed to update lead. Please try again.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NEW':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div> New
          </span>
        );
      case 'CONTACTED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></div> Contacted
          </span>
        );
      case 'CONVERTED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div> Converted
          </span>
        );
      default:
        return null;
    }
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'WARTELISTE':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            Waitlist
          </span>
        );
      case 'KONTAKT':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
            Contact
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => formatAppDateTime(dateString);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Email Notification Info Banner */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="p-2 bg-blue-100 rounded-full">
                <Mail size={20} className="text-blue-600" />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-blue-900">Lead Notifications Active</h3>
              <p className="text-sm text-blue-700">
                New lead notifications are automatically sent to <strong>{notificationEmail || 'Not configured'}</strong> when leads are submitted via contact forms, waitlist, or created manually.
                {!notificationEmail && (
                  <>
                    {' '}<button onClick={() => window.location.assign('/admin/settings/email')} className="underline text-blue-700 hover:text-blue-900">configure now</button>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">New Leads</h1>
            <p className="text-gray-600">Manage and track your potential clients</p>
            <div className="mt-2 flex items-center space-x-1 text-sm text-blue-600">
              <Mail size={14} />
              <span>Email notifications sent to: <strong>{notificationEmail || 'Not configured'}</strong></span>
              {!notificationEmail && (
                <button onClick={() => window.location.assign('/admin/settings/email')} className="ml-2 underline text-blue-700 hover:text-blue-900">configure</button>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center"
          >
            <Plus size={20} className="mr-2" />
            Add Lead
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => onStatusChange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="all">All Statuses</option>
              <option value="NEW">New</option>
              <option value="CONTACTED">Contacted</option>
              <option value="CONVERTED">Converted</option>
            </select>

            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="all">All Sources</option>
              <option value="WARTELISTE">Waitlist</option>
              <option value="KONTAKT">Contact</option>
            </select>
          </div>
        </div>

        {/* Bulk actions and Leads Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-3 border-b flex items-center justify-between">
            <div className="text-sm text-gray-600">{totalCount} results</div>
            <div className="flex items-center gap-2">
              <button onClick={handleBulkMarkNew} className="text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded">Mark all New as Contacted</button>
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg m-6">
              {error}
            </div>
          ) : leads.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {lead.first_name} {lead.last_name}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Mail size={14} className="mr-1" />
                            {lead.email}
                          </div>
                          {lead.phone && (
                            <div className="text-sm text-gray-500 flex items-center">
                              <Phone size={14} className="mr-1" />
                              {lead.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getSourceBadge(lead.form_source)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={lead.status}
                          onChange={(e) => handleStatusChange(lead.id, e.target.value as 'NEW' | 'CONTACTED' | 'CONVERTED')}
                          className="text-xs border-0 bg-transparent focus:ring-0"
                        >
                          <option value="NEW">New</option>
                          <option value="CONTACTED">Contacted</option>
                          <option value="CONVERTED">Converted</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar size={14} className="mr-1" />
                          {formatDate(lead.created_at)}
                        </div>
                      </td>                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleViewLead(lead)}
                            className="text-blue-600 hover:text-blue-900"
                            title="View Lead Details"
                          >
                            <Eye size={16} />
                          </button>
                          <button 
                            onClick={() => handleEditLead(lead)}
                            className="text-purple-600 hover:text-purple-900"
                            title="Edit Lead"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleConvertToClient(lead)}
                            disabled={convertingLeadId === lead.id || lead.status === 'CONVERTED'}
                            className={`${lead.status === 'CONVERTED' ? 'text-gray-300 cursor-not-allowed' : 'text-emerald-600 hover:text-emerald-900'} disabled:opacity-50`}
                            title={lead.status === 'CONVERTED' ? 'Already converted' : 'Add to Clients'}
                          >
                            {convertingLeadId === lead.id ? (
                              <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <UserPlus size={16} />
                            )}
                          </button>
                          <button 
                            onClick={() => handleStatusChange(lead.id, 'CONTACTED')}
                            className="text-green-600 hover:text-green-900"
                            title="Mark as Contacted"
                          >
                            <MessageSquare size={16} />
                          </button>
                          <button 
                            onClick={() => handleStatusChange(lead.id, 'CONVERTED')}
                            className="text-amber-600 hover:text-amber-900"
                            title="Mark as Converted"
                          >
                            <UserCheck size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmation(lead.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">No leads found.</div>
          )}
          <div className="px-6 py-3 border-t flex items-center justify-between">
            <button disabled={page<=1} onClick={() => setPage(p => Math.max(1, p-1))} className="px-3 py-1.5 rounded border disabled:opacity-50">Previous</button>
            <div className="text-sm">Page {page} of {totalPages}</div>
            <button disabled={page>=totalPages} onClick={() => setPage(p => Math.min(totalPages, p+1))} className="px-3 py-1.5 rounded border disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Deletion</h3>
            <p className="text-gray-500 mb-6">
              Are you sure you want to delete this lead? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setDeleteConfirmation(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteConfirmation && handleDeleteLead(deleteConfirmation)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Lead Modal */}
      {viewingLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">Lead Details</h3>
              <button
                onClick={() => setViewingLead(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingLead.first_name || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingLead.last_name || 'N/A'}</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingLead.email}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingLead.phone || 'N/A'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded min-h-[60px]">{viewingLead.message || 'N/A'}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <div className="bg-gray-50 p-2 rounded">
                    {getStatusBadge(viewingLead.status)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                  <div className="bg-gray-50 p-2 rounded">
                    {getSourceBadge(viewingLead.form_source)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{formatDate(viewingLead.created_at)}</p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setViewingLead(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Lead Modal */}
      {editingLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">Edit Lead</h3>
              <button
                onClick={() => setEditingLead(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={editFormData.first_name}
                    onChange={(e) => setEditFormData({...editFormData, first_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={editFormData.last_name}
                    onChange={(e) => setEditFormData({...editFormData, last_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  value={editFormData.message}
                  onChange={(e) => setEditFormData({...editFormData, message: e.target.value})}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({...editFormData, status: e.target.value as 'NEW' | 'CONTACTED' | 'CONVERTED'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="NEW">New</option>
                  <option value="CONTACTED">Contacted</option>
                  <option value="CONVERTED">Converted</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => setEditingLead(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateLead}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Lead Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Create New Lead</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={newLeadData.first_name}
                    onChange={(e) => setNewLeadData({...newLeadData, first_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={newLeadData.last_name}
                    onChange={(e) => setNewLeadData({...newLeadData, last_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newLeadData.email}
                  onChange={(e) => setNewLeadData({...newLeadData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={newLeadData.phone}
                  onChange={(e) => setNewLeadData({...newLeadData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                <select
                  value={newLeadData.form_source}
                  onChange={(e) => setNewLeadData({...newLeadData, form_source: e.target.value as 'MANUAL' | 'WARTELISTE' | 'KONTAKT'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="MANUAL">Manual Entry</option>
                  <option value="WARTELISTE">Waitlist</option>
                  <option value="KONTAKT">Contact Form</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  value={newLeadData.message}
                  onChange={(e) => setNewLeadData({...newLeadData, message: e.target.value})}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter lead details or notes..."
                />
              </div>
            </div>
            
            <div className="mt-6 flex space-x-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateLead}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                disabled={!newLeadData.first_name || !newLeadData.last_name || !newLeadData.email}
              >
                Create Lead
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminLeadsPage;
import { supabase } from './supabase';

export interface Lead {
  id: string;
  form_source: 'WARTELISTE' | 'KONTAKT';
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  message: string | null;
  created_at: string;
  status: 'NEW' | 'CONTACTED' | 'CONVERTED';
}

export async function getLeads(params?: { status?: 'NEW' | 'CONTACTED' | 'CONVERTED' | 'ARCHIVED' | 'ANY'; q?: string; limit?: number; offset?: number }) {
  try {
    const status = params?.status || 'NEW';
    const search = params?.q ? `&q=${encodeURIComponent(params.q)}` : '';
    const limit = typeof params?.limit === 'number' ? `&limit=${params!.limit}` : '';
    const offset = typeof params?.offset === 'number' ? `&offset=${params!.offset}` : '';
    const url = `/api/leads/list?status=${status.toLowerCase()}${search}${limit}${offset}`;
    // Fetching leads from unified API
    
    const response = await fetch(url, {
      credentials: 'include', // Include cookies for authentication
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    // Response received
    
    if (!response.ok) {
      const errorText = await response.text();
      // console.error removed
      throw new Error(`Failed to fetch leads: ${response.status} - ${errorText}`);
    }
    
  const payload = await response.json();
    // Transform unified leads rows to expected interface shape used by AdminLeadsPage
    const transformedData = (payload.rows || []).map((lead: any) => ({
      id: lead.id,
      first_name: lead.full_name ? String(lead.full_name).split(' ')[0] : '',
      last_name: lead.full_name ? String(lead.full_name).split(' ').slice(1).join(' ') : '',
      email: lead.email,
      phone: lead.phone,
      message: lead.message,
      form_source: (lead.form_type || 'MANUAL').toUpperCase(),
      status: (lead.status || 'new').toUpperCase(),
      created_at: lead.created_at
    }));
    
    // Data transformation completed
    return { rows: transformedData, count: payload.count || transformedData.length };
  } catch (error) {
    // console.error removed
    throw error;
  }
}

export async function updateLeadStatus(id: string, status: 'NEW' | 'CONTACTED' | 'CONVERTED' | 'ARCHIVED') {
  try {
    const response = await fetch(`/api/crm/leads/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: status.toLowerCase() }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update lead status');
    }
    
    return await response.json();
  } catch (error) {
    // console.error removed
    throw error;
  }
}

export async function deleteLead(id: string) {
  try {
    // Archive the lead instead of hard deleting
    const response = await fetch(`/api/crm/leads/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'archived' })
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete lead');
    }
    
    return true;
  } catch (error) {
    // console.error removed
    throw error;
  }
}

export async function bulkMarkNewAsContacted() {
  const r = await fetch('/api/leads/bulk/mark-new-contacted', { 
    method: 'POST',
    credentials: 'include'
  });
  if (!r.ok) throw new Error('Failed to bulk update leads');
  return r.json();
}
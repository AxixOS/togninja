import { supabase } from './supabase';
import { Client } from '../types/client';

// Fetch all clients for dropdowns and selection
export async function getAllClients(): Promise<Client[]> {
  try {
    const { data, error } = await supabase
      .from('crm_clients')
      .select('*')
      .eq('status', 'active')
      .order('name', { ascending: true });

    if (error) {
      // console.error removed
      
      // Fallback to legacy clients table
      const { data: legacyData, error: legacyError } = await supabase
        .from('clients')
        .select('*')
        .order('first_name', { ascending: true });
      
      if (legacyError) {
        // console.error removed
        throw legacyError;
      }
      
      return (legacyData || []).map((row: any) => ({
        id: row.id,
        firstName: row.first_name || '',
        lastName: row.last_name || '',
        clientId: row.client_id || '',
        email: row.email || '',
        phone: row.phone || '',
        address1: row.address1 || row.address || '',
        address2: row.address2 || '',
        city: row.city || '',
        state: row.state || '',
        zip: row.zip || '',
        country: row.country || '',
        totalSales: row.total_sales || 0,
        outstandingBalance: row.outstanding_balance || 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    }

    // Map CRM clients data to Client interface
    return (data || []).map((row: any) => ({
      id: row.id,
      firstName: row.first_name || '',
      lastName: row.last_name || '',
      clientId: row.client_id || '',
      email: row.email || '',
      phone: row.phone || '',
      address1: row.address1 || '',
      address2: row.address2 || '',
      city: row.city || '',
      state: row.state || '',
      zip: row.zip || '',
      country: row.country || '',
      totalSales: row.total_sales || 0,
      outstandingBalance: row.outstanding_balance || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Fetch top clients ordered by totalSales
export async function getHighValueClients(limit = 10): Promise<Client[]> {
  try {
    const { data, error } = await supabase
      .from('crm_clients')
      .select('*')
      .order('total_sales', { ascending: false })
      .limit(limit);

    if (error) {
      // console.error removed
      
      // Fallback to legacy clients table
      const { data: legacyData, error: legacyError } = await supabase
        .from('clients')
        .select('*')
        .order('total_sales', { ascending: false })
        .limit(limit);
      
      if (legacyError) throw legacyError;
      
      return (legacyData || []).map((row: any) => ({
        id: row.id,
        firstName: row.first_name || '',
        lastName: row.last_name || '',
        clientId: row.client_id || '',
        email: row.email || '',
        phone: row.phone || '',
        address1: row.address1 || row.address || '',
        address2: row.address2 || '',
        city: row.city || '',
        state: row.state || '',
        zip: row.zip || '',
        country: row.country || '',
        totalSales: row.total_sales || 0,
        outstandingBalance: row.outstanding_balance || 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    }

    // Map CRM clients data to Client interface
    return (data || []).map((row: any) => ({
      id: row.id,
      firstName: row.first_name || '',
      lastName: row.last_name || '',
      clientId: row.client_id || '',
      email: row.email || '',
      phone: row.phone || '',
      address1: row.address1 || '',
      address2: row.address2 || '',
      city: row.city || '',
      state: row.state || '',
      zip: row.zip || '',
      country: row.country || '',
      totalSales: row.total_sales || 0,
      outstandingBalance: row.outstanding_balance || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Create a new client
export async function createClient(client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client> {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    const clientData = {
      name: `${client.firstName} ${client.lastName}`.trim() || client.email,
      first_name: client.firstName,
      last_name: client.lastName,
      client_id: client.clientId,
      email: client.email,
      phone: client.phone,
      address1: client.address1,
      address2: client.address2,
      city: client.city,
      state: client.state,
      zip: client.zip,
      country: client.country,
      total_sales: client.totalSales || 0,
      outstanding_balance: client.outstandingBalance || 0,
      created_by: user.user?.id
    };

    const { data, error } = await supabase
      .from('crm_clients')
      .insert([clientData])
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      firstName: data.first_name || '',
      lastName: data.last_name || '',
      clientId: data.client_id || '',
      email: data.email || '',
      phone: data.phone || '',
      address1: data.address1 || '',
      address2: data.address2 || '',
      city: data.city || '',
      state: data.state || '',
      zip: data.zip || '',
      country: data.country || '',
      totalSales: data.total_sales || 0,
      outstandingBalance: data.outstanding_balance || 0,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    // console.error removed
    throw error;
  }
}

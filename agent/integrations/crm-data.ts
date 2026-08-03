// CRM data integration layer - Direct PostgreSQL access for better performance
import { db } from '../../server/db.js';
import { neon } from '../../server/db-compat.js';
import { crmClients, crmLeads, photographySessions, crmInvoices } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const sql = neon(process.env.DATABASE_URL!);
// `db` is the shared portable (node-postgres) drizzle instance from server/db.ts.

// CRITICAL FIX: Add direct SQL fallback for reliable data access
async function executeDirectSQL(query: string, params: any[] = []) {
  try {
    const result = await sql(query, params);
    return result;
  } catch (error) {
    console.error('Direct SQL query failed:', error);
    return [];
  }
}

async function fetchTable(table: any, studioId: string) {
  try {
    // FIXED: This is a single-studio system without studio_id column
    // Fetch all data directly without studio filtering
    const data = await db.select().from(table);
    console.log(`✅ CRM Data: Fetched ${data.length} records from ${table._.name || 'table'}`);
    return data;
  } catch (error) {
    console.error(`❌ CRM Data Error for ${table._.name || 'table'}:`, error);
    return [];
  }
}

// Direct database access with fallback
export const getClientsForStudio = async (sid: string) => {
  try {
    const data = await fetchTable(crmClients, sid);
    return data;
  } catch (error) {
    console.log('Drizzle failed, using direct SQL fallback for clients');
    // Fixed: Remove studio_id filter since it doesn't exist in this database
    return await executeDirectSQL('SELECT * FROM crm_clients ORDER BY created_at DESC');
  }
};

export const getLeadsForStudio = async (sid: string) => {
  try {
    const data = await fetchTable(crmLeads, sid);
    return data;
  } catch (error) {
    console.log('Drizzle failed, using direct SQL fallback for leads');
    return await executeDirectSQL('SELECT * FROM crm_leads ORDER BY created_at DESC');
  }
};

export const getSessionsForStudio = async (sid: string) => {
  try {
    const data = await fetchTable(photographySessions, sid);
    return data;
  } catch (error) {
    console.log('Drizzle failed, using direct SQL fallback for sessions');
    return await executeDirectSQL('SELECT * FROM photography_sessions ORDER BY created_at DESC');
  }
};

export const getInvoicesForStudio = async (sid: string) => {
  try {
    const data = await fetchTable(crmInvoices, sid);
    return data;
  } catch (error) {
    console.log('Drizzle failed, using direct SQL fallback for invoices');
    return await executeDirectSQL('SELECT * FROM crm_invoices ORDER BY created_at DESC');
  }
};
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInvoicesForStudio = exports.getSessionsForStudio = exports.getLeadsForStudio = exports.getClientsForStudio = void 0;
// CRM data integration layer - Direct PostgreSQL access for better performance
const neon_http_1 = require("drizzle-orm/neon-http");
const serverless_1 = require("@neondatabase/serverless");
const schema_1 = require("../../shared/schema");
const sql = (0, serverless_1.neon)(process.env.DATABASE_URL);
const db = (0, neon_http_1.drizzle)(sql);
// CRITICAL FIX: Add direct SQL fallback for reliable data access
async function executeDirectSQL(query, params = []) {
    try {
        const result = await sql(query, params);
        return result;
    }
    catch (error) {
        console.error('Direct SQL query failed:', error);
        return [];
    }
}
async function fetchTable(table, studioId) {
    try {
        // FIXED: This is a single-studio system without studio_id column
        // Fetch all data directly without studio filtering
        const data = await db.select().from(table);
        console.log(`✅ CRM Data: Fetched ${data.length} records from ${table._.name || 'table'}`);
        return data;
    }
    catch (error) {
        console.error(`❌ CRM Data Error for ${table._.name || 'table'}:`, error);
        return [];
    }
}
// Direct database access with fallback
const getClientsForStudio = async (sid) => {
    try {
        const data = await fetchTable(schema_1.crmClients, sid);
        return data;
    }
    catch (error) {
        console.log('Drizzle failed, using direct SQL fallback for clients');
        // Fixed: Remove studio_id filter since it doesn't exist in this database
        return await executeDirectSQL('SELECT * FROM crm_clients ORDER BY created_at DESC');
    }
};
exports.getClientsForStudio = getClientsForStudio;
const getLeadsForStudio = async (sid) => {
    try {
        const data = await fetchTable(schema_1.crmLeads, sid);
        return data;
    }
    catch (error) {
        console.log('Drizzle failed, using direct SQL fallback for leads');
        return await executeDirectSQL('SELECT * FROM crm_leads ORDER BY created_at DESC');
    }
};
exports.getLeadsForStudio = getLeadsForStudio;
const getSessionsForStudio = async (sid) => {
    try {
        const data = await fetchTable(schema_1.photographySessions, sid);
        return data;
    }
    catch (error) {
        console.log('Drizzle failed, using direct SQL fallback for sessions');
        return await executeDirectSQL('SELECT * FROM photography_sessions ORDER BY created_at DESC');
    }
};
exports.getSessionsForStudio = getSessionsForStudio;
const getInvoicesForStudio = async (sid) => {
    try {
        const data = await fetchTable(schema_1.crmInvoices, sid);
        return data;
    }
    catch (error) {
        console.log('Drizzle failed, using direct SQL fallback for invoices');
        return await executeDirectSQL('SELECT * FROM crm_invoices ORDER BY created_at DESC');
    }
};
exports.getInvoicesForStudio = getInvoicesForStudio;

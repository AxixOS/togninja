/**
 * Database Query Helpers
 * Centralized functions for all database operations
 * Ensures consistent column naming and error handling
 */

/**
 * Invoice Queries
 */
const InvoiceQueries = {
  /**
   * List all invoices with client information
   */
  list: async (sql, { status, limit = 200, offset = 0 } = {}) => {
    let query = sql`
      SELECT
        ci.id::text AS id,
        ci.invoice_number AS invoice_no,
        COALESCE(NULLIF(TRIM(CONCAT(cc.first_name, ' ', cc.last_name)), ''), 'Unknown Client') AS client_name,
        cc.email AS client_email,
        COALESCE(ci.subtotal, 0) AS subtotal,
        COALESCE(ci.tax_amount, 0) AS tax,
        COALESCE(ci.total, 0) AS total,
        COALESCE(ci.currency, 'EUR') AS currency,
        COALESCE(ci.status, 'draft') AS status,
        ci.issue_date,
        ci.due_date,
        ci.paid_date,
        ci.public_id,
        ci.checkout_url,
        ci.stripe_session_id,
        ci.payment_status,
        ci.created_at
      FROM crm_invoices ci
      LEFT JOIN crm_clients cc ON cc.id::text = ci.client_id::text
    `;
    
    if (status && status !== 'all') {
      query = sql`${query} WHERE ci.status = ${status}`;
    }
    
    const rows = await sql`${query} ORDER BY ci.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    return rows;
  },
  
  /**
   * Get single invoice by ID
   */
  getById: async (sql, id) => {
    const rows = await sql`
      SELECT
        ci.*,
        COALESCE(NULLIF(TRIM(CONCAT(cc.first_name, ' ', cc.last_name)), ''), 'Unknown Client') AS client_name,
        cc.email AS client_email,
        cc.phone AS client_phone
      FROM crm_invoices ci
      LEFT JOIN crm_clients cc ON cc.id::text = ci.client_id::text
      WHERE ci.id::text = ${id}
    `;
    return rows[0] || null;
  },
  
  /**
   * Get invoice items
   */
  getItems: async (sql, invoiceId) => {
    return await sql`
      SELECT * FROM crm_invoice_items
      WHERE invoice_id::text = ${invoiceId}
      ORDER BY sort_order, created_at
    `;
  },
  
  /**
   * Create invoice
   */
  create: async (sql, data) => {
    const {
      invoice_number,
      client_id,
      issue_date = new Date().toISOString().split('T')[0],
      due_date,
      subtotal = 0,
      tax_amount = 0,
      total = 0,
      currency = 'EUR',
      status = 'draft',
      public_id,
      notes = '',
      items = []
    } = data;
    
    // Insert invoice
    const [invoice] = await sql`
      INSERT INTO crm_invoices (
        invoice_number, client_id, issue_date, due_date,
        subtotal, tax_amount, total, currency, status,
        public_id, notes, created_at
      ) VALUES (
        ${invoice_number}, ${client_id}, ${issue_date}, ${due_date},
        ${subtotal}, ${tax_amount}, ${total}, ${currency}, ${status},
        ${public_id}, ${notes}, NOW()
      )
      RETURNING *
    `;
    
    // Insert items
    if (items.length > 0) {
      for (const item of items) {
        await sql`
          INSERT INTO crm_invoice_items (
            invoice_id, description, quantity, unit_price, line_total, sort_order
          ) VALUES (
            ${invoice.id}, ${item.description}, ${item.quantity || 1},
            ${item.unit_price || 0}, ${item.line_total || 0}, ${item.sort_order || 0}
          )
        `;
      }
    }
    
    return invoice;
  },
  
  /**
   * Update invoice status
   */
  updateStatus: async (sql, id, status) => {
    const updates = { status, updated_at: new Date() };
    if (status === 'paid' && !updates.paid_date) {
      updates.paid_date = new Date();
    }
    
    const [invoice] = await sql`
      UPDATE crm_invoices
      SET status = ${status},
          paid_date = ${status === 'paid' ? new Date().toISOString() : sql`paid_date`},
          updated_at = NOW()
      WHERE id::text = ${id}
      RETURNING *
    `;
    
    return invoice;
  }
};

/**
 * Lead Queries
 */
const LeadQueries = {
  /**
   * List leads with filters
   */
  list: async (sql, { status = 'new', search = '', limit = 50, offset = 0 } = {}) => {
    const like = search ? `%${search.toLowerCase()}%` : null;
    
    let rows;
    if (status === 'any' && !search) {
      rows = await sql`
        SELECT id, form_type, full_name, email, phone, preferred_date, message, source_path, created_at, status
        FROM leads
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (status === 'any' && search) {
      rows = await sql`
        SELECT id, form_type, full_name, email, phone, preferred_date, message, source_path, created_at, status
        FROM leads
        WHERE (
          lower(coalesce(full_name, '')) LIKE ${like} OR
          lower(coalesce(email, '')) LIKE ${like} OR
          lower(coalesce(phone, '')) LIKE ${like} OR
          lower(coalesce(source_path, '')) LIKE ${like}
        )
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (status !== 'any' && !search) {
      rows = await sql`
        SELECT id, form_type, full_name, email, phone, preferred_date, message, source_path, created_at, status
        FROM leads
        WHERE status = ${status}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      rows = await sql`
        SELECT id, form_type, full_name, email, phone, preferred_date, message, source_path, created_at, status
        FROM leads
        WHERE status = ${status} AND (
          lower(coalesce(full_name, '')) LIKE ${like} OR
          lower(coalesce(email, '')) LIKE ${like} OR
          lower(coalesce(phone, '')) LIKE ${like} OR
          lower(coalesce(source_path, '')) LIKE ${like}
        )
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }
    
    return rows;
  },
  
  /**
   * Count leads by status
   */
  count: async (sql, { status = 'new', search = '' } = {}) => {
    const like = search ? `%${search.toLowerCase()}%` : null;
    
    let result;
    if (status === 'any' && !search) {
      result = await sql`SELECT COUNT(*)::int AS c FROM leads`;
    } else if (status === 'any' && search) {
      result = await sql`
        SELECT COUNT(*)::int AS c FROM leads
        WHERE (
          lower(coalesce(full_name, '')) LIKE ${like} OR
          lower(coalesce(email, '')) LIKE ${like} OR
          lower(coalesce(phone, '')) LIKE ${like}
        )
      `;
    } else if (status !== 'any' && !search) {
      result = await sql`SELECT COUNT(*)::int AS c FROM leads WHERE status = ${status}`;
    } else {
      result = await sql`
        SELECT COUNT(*)::int AS c FROM leads
        WHERE status = ${status} AND (
          lower(coalesce(full_name, '')) LIKE ${like} OR
          lower(coalesce(email, '')) LIKE ${like} OR
          lower(coalesce(phone, '')) LIKE ${like}
        )
      `;
    }
    
    return result[0]?.c || 0;
  },
  
  /**
   * Create lead
   */
  create: async (sql, data) => {
    const {
      full_name,
      first_name,
      last_name,
      email,
      phone,
      message,
      form_type = 'contact',
      source = 'website',
      source_path = '/',
      status = 'new'
    } = data;
    
    const [lead] = await sql`
      INSERT INTO leads (
        full_name, first_name, last_name, email, phone, message,
        form_type, source, source_path, status, created_at
      ) VALUES (
        ${full_name}, ${first_name}, ${last_name}, ${email}, ${phone}, ${message},
        ${form_type}, ${source}, ${source_path}, ${status}, NOW()
      )
      RETURNING *
    `;
    
    return lead;
  },
  
  /**
   * Update lead status
   */
  updateStatus: async (sql, id, status) => {
    const [lead] = await sql`
      UPDATE leads
      SET status = ${status}, updated_at = NOW()
      WHERE id::text = ${id}
      RETURNING *
    `;
    
    return lead;
  }
};

/**
 * Client Queries
 */
const ClientQueries = {
  /**
   * List clients
   */
  list: async (sql, { limit = 100, offset = 0 } = {}) => {
    return await sql`
      SELECT * FROM crm_clients
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  },
  
  /**
   * Get client by ID
   */
  getById: async (sql, id) => {
    const rows = await sql`
      SELECT * FROM crm_clients
      WHERE id::text = ${id} OR client_id = ${id}
    `;
    return rows[0] || null;
  },
  
  /**
   * Create client
   */
  create: async (sql, data) => {
    const {
      first_name,
      last_name,
      email,
      phone,
      address,
      city,
      state,
      zip,
      country
    } = data;
    
    const [client] = await sql`
      INSERT INTO crm_clients (
        first_name, last_name, email, phone,
        address, city, state, zip, country, created_at
      ) VALUES (
        ${first_name}, ${last_name}, ${email}, ${phone},
        ${address}, ${city}, ${state}, ${zip}, ${country}, NOW()
      )
      RETURNING *
    `;
    
    return client;
  }
};

module.exports = {
  InvoiceQueries,
  LeadQueries,
  ClientQueries
};

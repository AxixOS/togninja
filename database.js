// Simple Node.js database connection for production server
const { Pool } = require('pg');
const nodemailer = require('nodemailer');

console.log('🔌 Connecting to Neon database...');

// Use your existing DATABASE_URL environment variable
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL not found in environment variables');
  module.exports = null;
} else {
  console.log('✅ DATABASE_URL found, creating connection pool...');
  
  // THIRD pool in this process. server/db.ts (PG_POOL_MAX, default 8) and server/auth.ts
  // (PG_SESSION_POOL_MAX, default 3) were both sized against Supabase's session-mode
  // pooler cap of 15 and documented as summing to 11 — but this pool was never counted,
  // and asked for 20 on its own. Total 31 against a cap of 15, so under any real load the
  // pooler starts refusing with "(EMAXCONNSESSION) max clients reached in session mode"
  // and every page 500s. Budgeted like the others: 8 + 3 + 3 = 14, one under the cap.
  //
  // Raise all three together only on the TRANSACTION-mode pooler (port 6543) or a direct
  // connection, which allow far more clients than session mode does.
  const legacyMax = Math.max(1, parseInt(process.env.PG_LEGACY_POOL_MAX || '', 10) || 3);

  const pool = new Pool({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    },
    max: legacyMax,
    idleTimeoutMillis: 30000,
    // 2s was long enough only when the pool was uncontended. Waiting for a free client is
    // normal on a small pool; failing after two seconds turned contention into a 500.
    connectionTimeoutMillis: 10000,
  });

  // Test the connection
  pool.connect((err, client, release) => {
    if (err) {
      console.error('❌ Database connection failed:', err.message);
    } else {
      console.log('✅ Database connected successfully');
      release();
      
      // Initialize database schema
      initializeDatabaseSchema();
    }
  });

  // Initialize database schema
  async function initializeDatabaseSchema() {
    try {
      console.log('🔨 Initializing database schema...');
      
      // Create CRM Clients table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS crm_clients (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          client_id TEXT UNIQUE,
          first_name VARCHAR(255),
          last_name VARCHAR(255),
          email VARCHAR(255),
          phone VARCHAR(50),
          address TEXT,
          city VARCHAR(100),
          state VARCHAR(100),
          zip VARCHAR(20),
          country VARCHAR(100),
          total_sales DECIMAL(10,2) DEFAULT 0,
          outstanding_balance DECIMAL(10,2) DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      
      // Create Leads table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS leads (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          first_name VARCHAR(255),
          last_name VARCHAR(255),
          email VARCHAR(255),
          phone VARCHAR(50),
          message TEXT,
          source VARCHAR(100),
          status VARCHAR(50) DEFAULT 'new',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      
      // Create Invoices table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS invoices (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          client_id TEXT,
          invoice_number VARCHAR(50) UNIQUE,
          status VARCHAR(50) DEFAULT 'draft',
          due_date DATE,
          subtotal DECIMAL(10,2) DEFAULT 0,
          tax_amount DECIMAL(10,2) DEFAULT 0,
          total_amount DECIMAL(10,2) DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      
      // Create CRM Invoices table (comprehensive invoice system)
      await pool.query(`
        CREATE TABLE IF NOT EXISTS crm_invoices (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          invoice_number VARCHAR(50) UNIQUE NOT NULL,
          client_id TEXT,
          amount DECIMAL(10,2) DEFAULT 0,
          tax_amount DECIMAL(10,2) DEFAULT 0,
          total_amount DECIMAL(10,2) DEFAULT 0,
          subtotal_amount DECIMAL(10,2) DEFAULT 0,
          discount_amount DECIMAL(10,2) DEFAULT 0,
          currency VARCHAR(3) DEFAULT 'EUR',
          status VARCHAR(50) DEFAULT 'draft',
          due_date DATE,
          paid_date TIMESTAMP WITH TIME ZONE,
          sent_date TIMESTAMP WITH TIME ZONE,
          payment_terms VARCHAR(100) DEFAULT '30 days',
          notes TEXT,
          pdf_url TEXT,
          template_id TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_by TEXT
        )
      `);
      
      // Create CRM Invoice Items table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS crm_invoice_items (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          invoice_id TEXT,
          description TEXT NOT NULL,
          quantity INTEGER DEFAULT 1,
          unit_price DECIMAL(10,2) DEFAULT 0,
          tax_rate DECIMAL(5,2) DEFAULT 19.00,
          tax_amount DECIMAL(10,2) DEFAULT 0,
          line_total DECIMAL(10,2) DEFAULT 0,
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      
      // Create CRM Invoice Payments table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS crm_invoice_payments (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          invoice_id TEXT,
          amount DECIMAL(10,2) NOT NULL,
          payment_method VARCHAR(50) DEFAULT 'bank_transfer',
          payment_reference TEXT,
          payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          notes TEXT,
          created_by TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      
      // Create CRM Client Activity Log table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS crm_client_activity_log (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          client_id TEXT,
          activity_type VARCHAR(100) NOT NULL,
          description TEXT,
          metadata JSONB,
          user_id TEXT,
          user_email TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      
      // Create CRM Invoice Audit Log table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS crm_invoice_audit_log (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          invoice_id TEXT,
          action VARCHAR(50) NOT NULL,
          old_values JSONB,
          new_values JSONB,
          user_id TEXT,
          user_email TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Create Digital Files table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS digital_files (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          folder_name TEXT,
          file_name TEXT NOT NULL,
          file_type TEXT NOT NULL,
          file_size INTEGER DEFAULT 0,
          client_id TEXT,
          session_id TEXT,
          description TEXT,
          tags TEXT,
          is_public BOOLEAN DEFAULT FALSE,
          uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          file_path TEXT,
          original_filename TEXT,
          mime_type TEXT,
          category TEXT,
          uploaded_by TEXT,
          location TEXT
        )
      `);
      
      // Create CRM Messages table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS crm_messages (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          client_id TEXT,
          type VARCHAR(50) DEFAULT 'email',
          content TEXT,
          subject VARCHAR(500),
          recipient VARCHAR(255),
          sender_name VARCHAR(255),
          sender_email VARCHAR(255),
          status VARCHAR(50) DEFAULT 'unread',
          message_type VARCHAR(50),
          client_name VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      
      // Create Galleries table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS galleries (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          slug VARCHAR(255) UNIQUE,
          cover_image TEXT,
          password_hash TEXT,
          download_enabled BOOLEAN DEFAULT TRUE,
          is_public BOOLEAN DEFAULT FALSE,
          client_id TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Create Photography Sessions table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS photography_sessions (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          session_type VARCHAR(50) DEFAULT 'portrait',
          status VARCHAR(50) DEFAULT 'scheduled',
          start_time TIMESTAMP WITH TIME ZONE,
          end_time TIMESTAMP WITH TIME ZONE,
          client_id TEXT,
          client_name VARCHAR(255),
          client_email VARCHAR(255),
          client_phone VARCHAR(50),
          attendees JSONB DEFAULT '[]',
          location_name VARCHAR(255),
          location_address TEXT,
          location_coordinates VARCHAR(100),
          base_price DECIMAL(10,2),
          deposit_amount DECIMAL(10,2),
          deposit_paid BOOLEAN DEFAULT FALSE,
          final_payment DECIMAL(10,2),
          final_payment_paid BOOLEAN DEFAULT FALSE,
          payment_status VARCHAR(50) DEFAULT 'pending',
          equipment_list JSONB DEFAULT '[]',
          crew_members JSONB DEFAULT '[]',
          conflict_detected BOOLEAN DEFAULT FALSE,
          weather_dependent BOOLEAN DEFAULT FALSE,
          golden_hour_optimized BOOLEAN DEFAULT FALSE,
          backup_plan TEXT,
          notes TEXT,
          portfolio_worthy BOOLEAN DEFAULT FALSE,
          editing_status VARCHAR(50) DEFAULT 'pending',
          delivery_status VARCHAR(50) DEFAULT 'pending',
          delivery_date TIMESTAMP WITH TIME ZONE,
          is_recurring BOOLEAN DEFAULT FALSE,
          recurrence_rule VARCHAR(255),
          parent_event_id TEXT,
          google_calendar_event_id VARCHAR(255),
          ical_uid VARCHAR(255),
          external_calendar_sync BOOLEAN DEFAULT FALSE,
          reminder_settings JSONB DEFAULT '{}',
          reminder_sent BOOLEAN DEFAULT FALSE,
          confirmation_sent BOOLEAN DEFAULT FALSE,
          follow_up_sent BOOLEAN DEFAULT FALSE,
          is_online_bookable BOOLEAN DEFAULT FALSE,
          booking_requirements JSONB DEFAULT '{}',
          availability_status VARCHAR(50) DEFAULT 'available',
          color VARCHAR(7),
          priority VARCHAR(20) DEFAULT 'medium',
          is_public BOOLEAN DEFAULT FALSE,
          category VARCHAR(100),
          gallery_id TEXT,
          photographer_id TEXT,
          tags JSONB DEFAULT '[]',
          custom_fields JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Create Voucher Products table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS voucher_products (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price DECIMAL(10,2) NOT NULL,
          original_price DECIMAL(10,2),
          category VARCHAR(100),
          type VARCHAR(50) DEFAULT 'voucher',
          sku VARCHAR(100) UNIQUE,
          is_active BOOLEAN DEFAULT TRUE,
          features JSONB DEFAULT '[]',
          terms_and_conditions TEXT,
          validity_period INTEGER DEFAULT 365,
          display_order INTEGER DEFAULT 0,
          image_url TEXT,
          thumbnail_url TEXT,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Insert default voucher products if table is empty
      const voucherCount = await pool.query('SELECT COUNT(*) FROM voucher_products');
      if (parseInt(voucherCount.rows[0].count) === 0) {
        console.log('📦 Adding default voucher products...');
        
        await pool.query(`
          INSERT INTO voucher_products (name, description, price, original_price, category, sku, features, terms_and_conditions) VALUES
          ('Family Basic Shooting', 'Perfect for Small Families - 30 minutes shooting with 1 edited photo', 95.00, 195.00, 'family', 'FAM-BASIC', 
           '["30 Minuten Shooting", "1 bearbeitete Fotos", "Begrüßungsgetränk", "Outfit-Wechsel möglich"]', 
           'Gutschein gültig für 1 Jahr ab Kaufdatum. Terminvereinbarung erforderlich.'),
          
          ('Family Premium Shooting', 'Ideal for larger families - 45 minutes shooting with 5 edited photos', 195.00, 295.00, 'family', 'FAM-PREMIUM',
           '["45 Minuten Shooting", "5 bearbeitete Fotos", "Begrüßungsgetränk", "Outfit-Wechsel möglich"]',
           'Gutschein gültig für 1 Jahr ab Kaufdatum. Terminvereinbarung erforderlich.'),
           
          ('Family Deluxe Shooting', 'Complete family experience - 60 minutes shooting with 10 edited photos', 295.00, 395.00, 'family', 'FAM-DELUXE',
           '["60 Minuten Shooting", "10 bearbeitete Fotos", "Begrüßungsgetränk", "Outfit-Wechsel möglich", "Online Galerie"]',
           'Gutschein gültig für 1 Jahr ab Kaufdatum. Terminvereinbarung erforderlich.'),
           
          ('Newborn Basic', 'First precious moments - 30 minutes newborn shooting', 95.00, 195.00, 'newborn', 'NB-BASIC',
           '["30min Shooting", "1 bearbeitete Fotos", "2 Setups", "Requisiten inklusive"]',
           'Beste Zeit: 5-14 Tage nach der Geburt. Terminvereinbarung erforderlich.'),
           
          ('Maternity Basic', 'Beautiful pregnancy memories - 30 minutes maternity shooting', 95.00, 195.00, 'maternity', 'MAT-BASIC',
           '["30 Minuten Shooting", "1 bearbeitete Fotos", "1 Outfit", "Partner-Fotos optional"]',
           'Gutschein gültig für 1 Jahr ab Kaufdatum. Terminvereinbarung erforderlich.'),
           
          ('Business Portrait', 'Professional business portraits', 150.00, 250.00, 'business', 'BUS-PORTRAIT',
           '["45 Minuten Shooting", "3 bearbeitete Fotos", "Professionelle Ausleuchtung", "LinkedIn optimiert"]',
           'Perfekt für Business-Profile und Website. Terminvereinbarung erforderlich.'),
           
          ('Event Photography', 'Professional event documentation', 350.00, 450.00, 'event', 'EVENT-BASIC',
           '["2 Stunden Shooting", "25 bearbeitete Fotos", "Online Galerie", "Alle Rechte inklusive"]',
           'Ideal für Firmenfeiern, Geburtstage und besondere Anlässe.')
        `);
        
        console.log('✅ Default voucher products added');
      }
      
      // Create Email Settings table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS email_settings (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          smtp_host TEXT NOT NULL,
          smtp_port INTEGER NOT NULL,
          smtp_user TEXT NOT NULL,
          smtp_pass TEXT NOT NULL,
          from_email TEXT NOT NULL,
          from_name TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Create Questionnaire Links table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS questionnaire_links (
          token TEXT PRIMARY KEY,
          client_id TEXT NOT NULL,
          template_id TEXT,
          is_used BOOLEAN DEFAULT FALSE,
          expires_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Create Questionnaire Responses table.
      // client_name/client_email are REQUIRED by the admin responses view + the submit path;
      // they were added after this table's original definition. client_id is nullable because
      // link-submitted responses can be anonymous.
      await pool.query(`
        CREATE TABLE IF NOT EXISTS questionnaire_responses (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          client_id TEXT,
          token TEXT,
          template_slug TEXT,
          answers JSONB,
          client_name TEXT,
          client_email TEXT,
          submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      // Back-fill the two columns on any pre-existing (older) questionnaire_responses table,
      // so the admin responses view doesn't 500 with "column client_name does not exist".
      await pool.query(`ALTER TABLE questionnaire_responses ADD COLUMN IF NOT EXISTS client_name TEXT`);
      await pool.query(`ALTER TABLE questionnaire_responses ADD COLUMN IF NOT EXISTS client_email TEXT`);

      // Create Surveys table for questionnaire templates
      await pool.query(`
        CREATE TABLE IF NOT EXISTS surveys (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          title TEXT NOT NULL,
          description TEXT,
          status TEXT DEFAULT 'draft',
          pages JSONB DEFAULT '[]',
          settings JSONB DEFAULT '{}',
          created_by TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Insert default questionnaire template if none exists
      const existingSurveys = await pool.query('SELECT COUNT(*) FROM surveys');
      if (parseInt(existingSurveys.rows[0].count) === 0) {
        const defaultPages = JSON.stringify([
          {
            id: 'page_1',
            title: 'Photography Session Information',
            questions: [
              {
                id: 'session_type',
                type: 'single_choice',
                title: 'What type of photography session are you interested in?',
                required: true,
                options: [
                  { id: 'family', text: 'Family Portrait' },
                  { id: 'wedding', text: 'Wedding Photography' },
                  { id: 'business', text: 'Business/Corporate' },
                  { id: 'event', text: 'Event Photography' },
                  { id: 'maternity', text: 'Maternity/Newborn' },
                  { id: 'other', text: 'Other' }
                ]
              },
              {
                id: 'preferred_date',
                type: 'text',
                title: 'What is your preferred date for the session?',
                required: true
              },
              {
                id: 'location_preference',
                type: 'single_choice',
                title: 'Where would you prefer the session to take place?',
                required: true,
                options: [
                  { id: 'studio', text: 'Studio' },
                  { id: 'outdoor', text: 'Outdoor Location' },
                  { id: 'client_location', text: 'My Location/Home' },
                  { id: 'flexible', text: 'Flexible/Open to Suggestions' }
                ]
              },
              {
                id: 'group_size',
                type: 'text',
                title: 'How many people will be in the photos?',
                required: true
              },
              {
                id: 'special_requests',
                type: 'long_text',
                title: 'Do you have any special requests or specific shots you want to capture?',
                required: false
              },
              {
                id: 'budget_range',
                type: 'single_choice',
                title: 'What is your approximate budget range?',
                required: false,
                options: [
                  { id: 'under_500', text: 'Under €500' },
                  { id: '500_1000', text: '€500 - €1000' },
                  { id: '1000_2000', text: '€1000 - €2000' },
                  { id: 'over_2000', text: 'Over €2000' },
                  { id: 'discuss', text: 'Prefer to discuss' }
                ]
              },
              {
                id: 'how_found_us',
                type: 'single_choice',
                title: 'How did you hear about us?',
                required: false,
                options: [
                  { id: 'google', text: 'Google Search' },
                  { id: 'social_media', text: 'Social Media' },
                  { id: 'referral', text: 'Friend/Family Referral' },
                  { id: 'website', text: 'Website' },
                  { id: 'other', text: 'Other' }
                ]
              },
              {
                id: 'additional_comments',
                type: 'long_text',
                title: 'Any additional comments or questions?',
                required: false
              }
            ]
          }
        ]);

        const defaultSettings = JSON.stringify({
          allowAnonymous: true,
          progressBar: true,
          thankYouMessage: 'Thank you for completing our questionnaire! We will be in touch soon.'
        });

        await pool.query(`
          INSERT INTO surveys (id, title, description, status, pages, settings)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          'default-questionnaire',
          'Client Questionnaire',
          'Standard client intake questionnaire for photography sessions',
          'active',
          defaultPages,
          defaultSettings
        ]);
      }

      console.log('✅ Database schema initialized successfully');
      
    } catch (error) {
      console.error('❌ Error initializing database schema:', error.message);
    }
  }

  // Export database functions
  module.exports = {
    // Calendar analytics for week/month with deltas and timeseries
    async getCalendarAnalytics(period = 'week') {
      try {
        const now = new Date();
        const end = now; // rolling window end = now
        const periodDays = period === 'month' ? 30 : 7;
        const start = new Date(end.getTime() - periodDays * 24 * 60 * 60 * 1000);
        const prevEnd = new Date(start.getTime());
        const prevStart = new Date(prevEnd.getTime() - periodDays * 24 * 60 * 60 * 1000);

        // Helper: check table existence
        const tableExists = async (tableName) => {
          const q = await pool.query(
            `SELECT EXISTS (
               SELECT 1 FROM information_schema.tables 
               WHERE table_schema='public' AND table_name=$1
             ) as exists`,
            [tableName]
          );
          return q.rows[0]?.exists === true;
        };

        // Leads helpers (crm_leads preferred, fallback to leads)
        const hasCrmLeads = await tableExists('crm_leads');
        const leadsTable = hasCrmLeads ? 'crm_leads' : (await tableExists('leads') ? 'leads' : null);

        const countLeadsBetween = async (a, b) => {
          if (!leadsTable) return 0;
          const res = await pool.query(
            `SELECT COUNT(*)::int AS c FROM ${leadsTable} WHERE created_at >= $1 AND created_at < $2`,
            [a, b]
          );
          return res.rows[0]?.c || 0;
        };

        const leadsDaily = async (a, b) => {
          if (!leadsTable) return [];
          const res = await pool.query(
            `SELECT date_trunc('day', created_at) AS d, COUNT(*)::int AS c
             FROM ${leadsTable}
             WHERE created_at >= $1 AND created_at < $2
             GROUP BY 1 ORDER BY 1`,
            [a, b]
          );
          return res.rows.map(r => ({ date: r.d, leads: r.c }));
        };

        // Sessions helpers
        const countSessionsCreatedBetween = async (a, b) => {
          const res = await pool.query(
            `SELECT COUNT(*)::int AS c 
             FROM photography_sessions 
             WHERE created_at >= $1 AND created_at < $2
               AND COALESCE(status, 'scheduled') IN ('scheduled','confirmed','booked','completed')`,
            [a, b]
          );
          return res.rows[0]?.c || 0;
        };

        const countSessionsStartedBetween = async (a, b) => {
          const res = await pool.query(
            `SELECT COUNT(*)::int AS c 
             FROM photography_sessions 
             WHERE start_time >= $1 AND start_time < $2`,
            [a, b]
          );
          return res.rows[0]?.c || 0;
        };

        const countCompletedBetween = async (a, b) => {
          const res = await pool.query(
            `SELECT COUNT(*)::int AS c 
             FROM photography_sessions 
             WHERE start_time >= $1 AND start_time < $2
               AND COALESCE(status, 'scheduled') = 'completed'`,
            [a, b]
          );
          return res.rows[0]?.c || 0;
        };

        const sumRevenueByStartBetween = async (a, b) => {
          const res = await pool.query(
            `SELECT COALESCE(SUM(COALESCE(base_price,0)),0)::float AS v
             FROM photography_sessions 
             WHERE start_time >= $1 AND start_time < $2`,
            [a, b]
          );
          return res.rows[0]?.v || 0;
        };

        const sessionsDaily = async (a, b) => {
          const res = await pool.query(
            `SELECT date_trunc('day', start_time) AS d,
                    COUNT(*)::int AS sessions,
                    COALESCE(SUM(COALESCE(base_price,0)),0)::float AS revenue
             FROM photography_sessions
             WHERE start_time >= $1 AND start_time < $2
             GROUP BY 1 ORDER BY 1`,
            [a, b]
          );
          return res.rows.map(r => ({ date: r.d, sessions: r.sessions, revenue: r.revenue }));
        };

        // Compute current and previous window stats
        const [
          leadsCur, leadsPrev,
          createdCur, createdPrev,
          startedCur, startedPrev,
          completedCur, completedPrev,
          revenueCur, revenuePrev,
          leadsSeries, sessionsSeries
        ] = await Promise.all([
          countLeadsBetween(start, end),
          countLeadsBetween(prevStart, prevEnd),
          countSessionsCreatedBetween(start, end),
          countSessionsCreatedBetween(prevStart, prevEnd),
          countSessionsStartedBetween(start, end),
          countSessionsStartedBetween(prevStart, prevEnd),
          countCompletedBetween(start, end),
          countCompletedBetween(prevStart, prevEnd),
          sumRevenueByStartBetween(start, end),
          sumRevenueByStartBetween(prevStart, prevEnd),
          leadsDaily(start, end),
          sessionsDaily(start, end)
        ]);

        const pct = (cur, prev) => {
          if (prev === 0) return cur > 0 ? 100 : 0;
          return ((cur - prev) / prev) * 100;
        };

        const conversion = (booked, leads) => {
          if (leads <= 0) return 0;
          return (booked / leads) * 100;
        };

        const currentConversion = conversion(createdCur, leadsCur);
        const previousConversion = conversion(createdPrev, leadsPrev);
        const conversionDeltaPct = previousConversion === 0
          ? (currentConversion > 0 ? 100 : 0)
          : ((currentConversion - previousConversion) / previousConversion) * 100;

        return {
          period,
          range: { start: start.toISOString(), end: end.toISOString() },
          previousRange: { start: prevStart.toISOString(), end: prevEnd.toISOString() },
          leads: {
            current: leadsCur,
            previous: leadsPrev,
            delta: leadsCur - leadsPrev,
            deltaPct: pct(leadsCur, leadsPrev)
          },
          sessionsBooked: {
            // Using sessions created as proxy for booked
            current: createdCur,
            previous: createdPrev,
            delta: createdCur - createdPrev,
            deltaPct: pct(createdCur, createdPrev)
          },
          sessionsStarted: {
            current: startedCur,
            previous: startedPrev,
            delta: startedCur - startedPrev,
            deltaPct: pct(startedCur, startedPrev)
          },
          completedSessions: {
            current: completedCur,
            previous: completedPrev,
            delta: completedCur - completedPrev,
            deltaPct: pct(completedCur, completedPrev)
          },
          revenue: {
            current: revenueCur,
            previous: revenuePrev,
            delta: revenueCur - revenuePrev,
            deltaPct: pct(revenueCur, revenuePrev)
          },
          conversion: {
            currentPct: currentConversion,
            previousPct: previousConversion,
            deltaPct: conversionDeltaPct
          },
          timeseries: {
            daily: mergeDailySeries(leadsSeries, sessionsSeries)
          }
        };

        function mergeDailySeries(leadsArr, sessionsArr) {
          const map = new Map();
          for (const r of leadsArr) {
            const k = new Date(r.date).toISOString().slice(0,10);
            map.set(k, { date: k, leads: r.leads, sessions: 0, revenue: 0 });
          }
          for (const r of sessionsArr) {
            const k = new Date(r.date).toISOString().slice(0,10);
            const prev = map.get(k) || { date: k, leads: 0, sessions: 0, revenue: 0 };
            prev.sessions = r.sessions;
            prev.revenue = r.revenue;
            map.set(k, prev);
          }
          return Array.from(map.values()).sort((a,b) => a.date.localeCompare(b.date));
        }
      } catch (error) {
        console.error('❌ Error computing calendar analytics:', error.message);
        return {
          period,
          range: null,
          previousRange: null,
          leads: { current: 0, previous: 0, delta: 0, deltaPct: 0 },
          sessionsBooked: { current: 0, previous: 0, delta: 0, deltaPct: 0 },
          sessionsStarted: { current: 0, previous: 0, delta: 0, deltaPct: 0 },
          completedSessions: { current: 0, previous: 0, delta: 0, deltaPct: 0 },
          revenue: { current: 0, previous: 0, delta: 0, deltaPct: 0 },
          conversion: { currentPct: 0, previousPct: 0, deltaPct: 0 },
          timeseries: { daily: [] }
        };
      }
    },
    // Get all clients
    async getClients() {
      try {
        const result = await pool.query('SELECT * FROM crm_clients ORDER BY created_at DESC');
        // Map database fields to frontend expected format
        const mappedClients = result.rows.map(client => ({
          id: client.id,
          firstName: client.first_name || '',
          lastName: client.last_name || '', 
          clientId: client.client_id || client.id,
          email: client.email || '',
          phone: client.phone || '',
          address: client.address || '',
          city: client.city || '',
          state: client.state || '',
          zip: client.zip || '',
          country: client.country || '',
          total_sales: client.total_sales || 0,
          outstanding_balance: client.outstanding_balance || 0,
          createdAt: client.created_at,
          updatedAt: client.updated_at
        }));
        return mappedClients;
      } catch (error) {
        console.error('❌ Error fetching clients:', error.message);
        throw error;
      }
    },

    // Get all leads  
    async getLeads() {
      try {
        const result = await pool.query('SELECT * FROM leads ORDER BY created_at DESC');
        // Map database fields to frontend expected format
        const mappedLeads = result.rows.map(lead => ({
          id: lead.id,
          firstName: lead.first_name || '',
          lastName: lead.last_name || '',
          email: lead.email || '',
          phone: lead.phone || '',
          message: lead.message || '',
          source: lead.source || '',
          status: lead.status || 'new',
          createdAt: lead.created_at,
          updatedAt: lead.updated_at
        }));
        return mappedLeads;
      } catch (error) {
        console.error('❌ Error fetching leads:', error.message);
        throw error;
      }
    },

    // Get database counts
    async getCounts() {
      try {
        const clientsResult = await pool.query('SELECT COUNT(*) FROM crm_clients');
        const leadsResult = await pool.query('SELECT COUNT(*) FROM leads');
        
        return {
          success: true,
          data: {
            clients: parseInt(clientsResult.rows[0].count),
            leads: parseInt(leadsResult.rows[0].count)
          }
        };
      } catch (error) {
        console.error('❌ Error getting counts:', error.message);
        return { success: false, error: error.message };
      }
    },

    // Test database connection
    async testConnection() {
      try {
        const result = await pool.query('SELECT NOW()');
        return { success: true, timestamp: result.rows[0].now };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },

    // Send email and log to database
    async sendEmail(emailData) {
      try {
        const { to, subject, content, html, clientId, autoLinkClient, attachments } = emailData;
        
        // Try to find client if autoLinkClient is enabled
        let finalClientId = clientId;
        if (autoLinkClient && !clientId && to) {
          const clientResult = await pool.query(
            'SELECT id FROM crm_clients WHERE email ILIKE $1 LIMIT 1',
            [`%${to}%`]
          );
          if (clientResult.rows.length > 0) {
            finalClientId = clientResult.rows[0].id;
          }
        }

        // Create email transporter (basic SMTP)
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
          tls: {
            rejectUnauthorized: false
          }
        });

        // Prepare mail options
        const mailOptions = {
          from: process.env.SMTP_USER,
          to: to,
          subject: subject,
          text: content,
          html: html || content
        };

        // Add attachments if provided
        if (attachments && attachments.length > 0) {
          mailOptions.attachments = attachments.map(att => ({
            filename: att.name,
            content: att.data.split(',')[1], // Remove data:mime;base64, prefix
            encoding: 'base64'
          }));
        }

        // Send email
        const result = await transporter.sendMail(mailOptions);
        console.log(`📧 Email sent successfully to ${to}, Message ID: ${result.messageId}`);
        
        // Try to log email to database (if table exists)
        console.log('💾 Attempting to log sent email to database...');
        try {
          await pool.query(
            `INSERT INTO crm_messages (client_id, type, content, subject, recipient, status, created_at) 
             VALUES ($1, 'email', $2, $3, $4, 'sent', NOW())`,
            [finalClientId, content, subject, to]
          );
          console.log('✅ Email logged to crm_messages table');
        } catch (logError) {
          console.log('⚠️ crm_messages failed, trying communications table...');
          // Try alternative table structure
          try {
            await pool.query(
              `INSERT INTO communications (client_id, message_type, content, subject, recipient, status, created_at) 
               VALUES ($1, 'email', $2, $3, $4, 'sent', NOW())`,
              [finalClientId, content, subject, to]
            );
            console.log('✅ Email logged to communications table');
          } catch (altLogError) {
            console.log('⚠️ communications failed, creating/using sent_emails table...');
            // Create a simple sent_emails table if nothing else works
            try {
              await pool.query(`
                CREATE TABLE IF NOT EXISTS sent_emails (
                  id SERIAL PRIMARY KEY,
                  recipient VARCHAR(255) NOT NULL,
                  subject VARCHAR(500),
                  content TEXT,
                  html TEXT,
                  client_id INTEGER,
                  message_id VARCHAR(255),
                  sent_at TIMESTAMP DEFAULT NOW()
                )
              `);
              
              await pool.query(
                `INSERT INTO sent_emails (recipient, subject, content, html, client_id, message_id, sent_at) 
                 VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
                [to, subject, content, html, finalClientId, result.messageId]
              );
              console.log('✅ Email logged to sent_emails table (created)');
            } catch (createError) {
              console.log('⚠️ Could not log email to database, but email was sent successfully');
              console.log('Database log error details:', createError.message);
              console.log('Original error:', logError.message);
            }
          }
        }

        return { 
          success: true, 
          messageId: result.messageId,
          clientId: finalClientId 
        };
      } catch (error) {
        console.error('❌ Error sending email:', error.message);
        
        // Don't fail if we can't log the error to database
        console.log('⚠️ Skipping database error logging to avoid secondary failures');

        throw error;
      }
    },

    // Get database schema info
    async getTableInfo() {
      try {
        const tables = await pool.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
          ORDER BY table_name
        `);
        
        const tableInfo = {};
        for (const table of tables.rows) {
          const columns = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = $1 AND table_schema = 'public'
            ORDER BY ordinal_position
          `, [table.table_name]);
          
          tableInfo[table.table_name] = columns.rows;
        }
        
        return { success: true, tables: tableInfo };
      } catch (error) {
        console.error('❌ Error getting table info:', error.message);
        return { success: false, error: error.message };
      }
    },

    // Get email messages for a client
    async getClientMessages(clientId) {
      try {
        // Try primary table first
        let result;
        try {
          result = await pool.query(`
            SELECT id, type, content, subject, recipient, status, 
                   created_at as "createdAt"
            FROM crm_messages 
            WHERE client_id = $1 
            ORDER BY created_at DESC
          `, [clientId]);
        } catch (error) {
          // Try alternative table structure
          try {
            result = await pool.query(`
              SELECT id, message_type as type, content, subject, recipient, status, 
                     created_at as "createdAt"
              FROM communications 
              WHERE client_id = $1 
              ORDER BY created_at DESC
            `, [clientId]);
          } catch (altError) {
            console.log('⚠️ No messages table found, returning empty array');
            return [];
          }
        }
        
        return result.rows;
      } catch (error) {
        console.error('❌ Error fetching client messages:', error.message);
        return [];
      }
    },

    // Get all sent emails
    async getSentEmails() {
      try {
        console.log('🔍 Fetching sent emails from database...');
        // Try multiple table structures
        let result;
        
        try {
          console.log('📧 Trying sent_emails table...');
          result = await pool.query(`
            SELECT id, recipient, subject, content, message_id, sent_at as "sentAt", client_id as "clientId"
            FROM sent_emails 
            ORDER BY sent_at DESC 
            LIMIT 100
          `);
          console.log(`✅ Found ${result.rows.length} emails in sent_emails table`);
        } catch (error) {
          console.log('⚠️ sent_emails table not found, trying crm_messages...');
          try {
            result = await pool.query(`
              SELECT id, recipient, subject, content, status, created_at as "sentAt", client_id as "clientId"
              FROM crm_messages 
              WHERE type = 'email' AND status = 'sent'
              ORDER BY created_at DESC 
              LIMIT 100
            `);
            console.log(`✅ Found ${result.rows.length} emails in crm_messages table`);
          } catch (altError) {
            console.log('⚠️ crm_messages table not found, trying communications...');
            try {
              result = await pool.query(`
                SELECT id, recipient, subject, content, status, created_at as "sentAt", client_id as "clientId"
                FROM communications 
                WHERE message_type = 'email' AND status = 'sent'
                ORDER BY created_at DESC 
                LIMIT 100
              `);
              console.log(`✅ Found ${result.rows.length} emails in communications table`);
            } catch (finalError) {
              console.log('⚠️ No sent emails table found, returning empty array');
              console.log('Available tables might not include email logging structures');
              return [];
            }
          }
        }
        
        console.log(`📤 Returning ${result.rows.length} sent emails`);
        return result.rows;
      } catch (error) {
        console.error('❌ Error fetching sent emails:', error.message);
        return [];
      }
    },

    // Find client by email address
    async findClientByEmail(email) {
      try {
        const result = await pool.query(`
          SELECT id, first_name, last_name, email 
          FROM crm_clients 
          WHERE LOWER(email) = LOWER($1)
        `, [email]);
        
        return result.rows.length > 0 ? result.rows[0] : null;
      } catch (error) {
        console.error('❌ Error finding client by email:', error.message);
        return null;
      }
    },

    // IMAP Email Import Function
    async importEmailsFromIMAP() {
      const imap = require('imap');
      const { simpleParser } = require('mailparser');
      
      return new Promise((resolve, reject) => {
        console.log('📥 Starting IMAP email import...');
        
        // IMAP Configuration from environment variables
        const imapConfig = {
          user: process.env.IMAP_USER || process.env.SMTP_USER || process.env.BUSINESS_MAILBOX_USER || '',
          password: process.env.IMAP_PASS || process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || '',
          host: process.env.IMAP_HOST || 'imap.easyname.com',
          port: parseInt(process.env.IMAP_PORT || '993'),
          tls: (process.env.IMAP_TLS || 'true').toLowerCase() !== 'false',
          tlsOptions: { rejectUnauthorized: false },
          connTimeout: 30000,
          authTimeout: 30000,
          keepalive: false
        };

        console.log(`🔌 Connecting to IMAP: ${imapConfig.user}@${imapConfig.host}:${imapConfig.port}`);

        const connection = new imap(imapConfig);
        const emails = [];
        let imported = 0;
        let processed = 0;

        // Add timeout for the whole operation
        const timeout = setTimeout(() => {
          connection.end();
          reject(new Error('IMAP connection timeout after 60 seconds'));
        }, 60000);

        connection.once('ready', () => {
          console.log('✅ IMAP connection ready');
          
          connection.openBox('INBOX', true, (err, box) => {
            if (err) {
              clearTimeout(timeout);
              return reject(err);
            }

            console.log(`📧 INBOX opened - ${box.messages.total} total messages`);
            
            if (box.messages.total === 0) {
              clearTimeout(timeout);
              connection.end();
              return resolve({ imported: 0, processed: 0 });
            }

            // Fetch recent emails (last 20 to avoid overwhelming)
            const recent = Math.max(1, box.messages.total - 19);
            const fetchRange = `${recent}:${box.messages.total}`;
            
            console.log(`📨 Fetching emails ${fetchRange}`);
            
            const fetch = connection.fetch(fetchRange, {
              bodies: '',
              struct: true,
              markSeen: false
            });

            const emailPromises = [];

            fetch.on('message', (msg, seqno) => {
              const emailPromise = new Promise(async (emailResolve) => {
                let buffer = '';
                
                msg.on('body', (stream, info) => {
                  stream.on('data', (chunk) => {
                    buffer += chunk.toString('utf8');
                  });
                  
                  stream.once('end', async () => {
                    try {
                      const parsed = await simpleParser(buffer);
                      
                      const emailData = {
                        senderName: parsed.from?.text?.split('<')[0]?.trim() || 'Unknown',
                        senderEmail: parsed.from?.value?.[0]?.address || parsed.from?.text || 'unknown@unknown.com',
                        subject: parsed.subject || 'No Subject',
                        content: parsed.text || parsed.html || 'No content',
                        createdAt: parsed.date || new Date(),
                        status: 'unread',
                        messageType: 'email'
                      };
                      
                      // Skip sent items and system messages
                      if (!emailData.subject.startsWith('[SENT]') && 
                          !emailData.subject.includes('Auto-Reply') &&
                          emailData.senderEmail !== 'hallo@newagefotografie.com') {
                        
                        // Check if email already exists
                        const existing = await this.getCrmMessages();
                        const isDuplicate = existing.some(msg =>
                          msg.subject === emailData.subject &&
                          msg.senderEmail === emailData.senderEmail &&
                          Math.abs(new Date(msg.createdAt).getTime() - new Date(emailData.createdAt).getTime()) < 300000
                        );
                        
                        if (!isDuplicate) {
                          // Try to auto-link to client
                          const client = await this.findClientByEmail(emailData.senderEmail);
                          if (client) {
                            emailData.clientId = client.id;
                            emailData.clientName = `${client.first_name} ${client.last_name}`.trim();
                            console.log(`🔗 Auto-linked email to client: ${emailData.clientName}`);
                          }

                          // Save email to database
                          await this.createCrmMessage(emailData);
                          emails.push(emailData);
                          imported++;
                        }
                      }
                      
                      processed++;
                      emailResolve();
                    } catch (error) {
                      console.error('❌ Error processing email:', error);
                      emailResolve();
                    }
                  });
                });
              });
              
              emailPromises.push(emailPromise);
            });

            fetch.once('error', (err) => {
              clearTimeout(timeout);
              console.error('❌ Fetch error:', err);
              reject(err);
            });

            fetch.once('end', async () => {
              try {
                await Promise.all(emailPromises);
                clearTimeout(timeout);
                connection.end();
                
                console.log(`✅ Email import completed: ${imported} new emails, ${processed} processed`);
                resolve({ imported, processed, emails });
              } catch (error) {
                clearTimeout(timeout);
                console.error('❌ Error processing emails:', error);
                connection.end();
                reject(error);
              }
            });
          });
        });

        connection.once('error', (err) => {
          clearTimeout(timeout);
          console.error('❌ IMAP connection error:', err);
          reject(err);
        });

        connection.once('end', () => {
          console.log('📪 IMAP connection ended');
        });

        connection.connect();
      });
    },

    // Assign email to client manually
    async assignEmailToClient(messageId, clientId) {
      try {
        // Try different table structures
        let result;
        
        try {
          result = await pool.query(`
            UPDATE crm_messages 
            SET client_id = $1, client_name = (
              SELECT CONCAT(first_name, ' ', last_name) 
              FROM crm_clients 
              WHERE id = $1
            )
            WHERE id = $2
            RETURNING *
          `, [clientId, messageId]);
        } catch (error) {
          // Try alternative table structure
          try {
            result = await pool.query(`
              UPDATE communications 
              SET client_id = $1
              WHERE id = $2
              RETURNING *
            `, [clientId, messageId]);
          } catch (altError) {
            throw new Error(`Unable to assign email to client: ${error.message}`);
          }
        }
        
        if (result.rows.length > 0) {
          console.log(`✅ Email ${messageId} assigned to client ${clientId}`);
          return result.rows[0];
        } else {
          throw new Error('Email not found');
        }
      } catch (error) {
        console.error('❌ Error assigning email to client:', error.message);
        throw error;
      }
    },

    // Digital Files Management Functions
    
    // Get digital files with filtering
    async getDigitalFiles(filters = {}) {
      try {
        const { folder_name, file_type, client_id, session_id, search_term, is_public, limit = 20 } = filters;
        
        let query = `
          SELECT id, folder_name, file_name, file_type, file_size, 
                 client_id, session_id, description, tags, is_public, 
                 uploaded_at, created_at, updated_at
          FROM digital_files
        `;
        
        const conditions = [];
        const values = [];
        let paramIndex = 1;
        
        if (folder_name) {
          conditions.push(`folder_name ILIKE $${paramIndex}`);
          values.push(`%${folder_name}%`);
          paramIndex++;
        }
        
        if (file_type) {
          conditions.push(`file_type = $${paramIndex}`);
          values.push(file_type);
          paramIndex++;
        }
        
        if (client_id) {
          conditions.push(`client_id = $${paramIndex}`);
          values.push(client_id);
          paramIndex++;
        }
        
        if (session_id) {
          conditions.push(`session_id = $${paramIndex}`);
          values.push(session_id);
          paramIndex++;
        }
        
        if (search_term) {
          conditions.push(`file_name ILIKE $${paramIndex}`);
          values.push(`%${search_term}%`);
          paramIndex++;
        }
        
        if (is_public !== undefined) {
          conditions.push(`is_public = $${paramIndex}`);
          values.push(is_public);
          paramIndex++;
        }
        
        if (conditions.length > 0) {
          query += ' WHERE ' + conditions.join(' AND ');
        }
        
        query += ` ORDER BY uploaded_at DESC LIMIT $${paramIndex}`;
        values.push(parseInt(limit));
        
        const result = await pool.query(query, values);
        return result.rows;
      } catch (error) {
        console.error('❌ Error fetching digital files:', error.message);
        throw error;
      }
    },

    // Create digital file record
    async createDigitalFile(fileData) {
      try {
        const {
          id,
          folder_name,
          file_name,
          file_type,
          file_size,
          client_id,
          session_id,
          description = '',
          tags = [],
          is_public = false,
          file_path,
          original_filename,
          mime_type,
          category,
          uploaded_by,
          location
        } = fileData;

        // Create table if it doesn't exist
        await pool.query(`
          CREATE TABLE IF NOT EXISTS digital_files (
            id TEXT PRIMARY KEY,
            folder_name TEXT,
            file_name TEXT NOT NULL,
            file_type TEXT NOT NULL,
            file_size INTEGER DEFAULT 0,
            client_id TEXT,
            session_id TEXT,
            description TEXT,
            tags TEXT,
            is_public BOOLEAN DEFAULT FALSE,
            uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            file_path TEXT,
            original_filename TEXT,
            mime_type TEXT,
            category TEXT,
            uploaded_by TEXT,
            location TEXT
          )
        `);

        const fileId = id || require('crypto').randomUUID();
        
        const result = await pool.query(`
          INSERT INTO digital_files (
            id, folder_name, file_name, file_type, file_size, 
            client_id, session_id, description, tags, is_public, 
            uploaded_at, created_at, updated_at, file_path,
            original_filename, mime_type, category, uploaded_by, location
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
            NOW(), NOW(), NOW(), $11, $12, $13, $14, $15, $16
          ) RETURNING *
        `, [
          fileId, folder_name, file_name, file_type, file_size,
          client_id || null, session_id || null, description, 
          JSON.stringify(tags), is_public, file_path,
          original_filename, mime_type, category, uploaded_by, location
        ]);

        return result.rows[0];
      } catch (error) {
        console.error('❌ Error creating digital file:', error.message);
        throw error;
      }
    },

    // Update digital file metadata
    async updateDigitalFile(fileId, updateData) {
      try {
        // Remove ID from update data
        const { id, ...cleanData } = updateData;
        
        // Convert tags to JSON string if provided
        if (cleanData.tags && Array.isArray(cleanData.tags)) {
          cleanData.tags = JSON.stringify(cleanData.tags);
        }
        
        // Build update query dynamically
        const updateFields = [];
        const values = [];
        let paramIndex = 1;
        
        for (const [key, value] of Object.entries(cleanData)) {
          updateFields.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
        
        if (updateFields.length === 0) {
          throw new Error('No fields to update');
        }
        
        updateFields.push(`updated_at = NOW()`);
        values.push(fileId);
        
        const result = await pool.query(`
          UPDATE digital_files 
          SET ${updateFields.join(', ')}
          WHERE id = $${paramIndex}
          RETURNING *
        `, values);

        if (result.rows.length === 0) {
          throw new Error('File not found');
        }

        return result.rows[0];
      } catch (error) {
        console.error('❌ Error updating digital file:', error.message);
        throw error;
      }
    },

    // Delete digital file
    async deleteDigitalFile(fileId) {
      try {
        const result = await pool.query(
          'DELETE FROM digital_files WHERE id = $1 RETURNING *',
          [fileId]
        );

        if (result.rows.length === 0) {
          throw new Error('File not found');
        }

        return result.rows[0];
      } catch (error) {
        console.error('❌ Error deleting digital file:', error.message);
        throw error;
      }
    },

    // Get folder statistics
    async getDigitalFilesFolderStats(folderName = null) {
      try {
        let folderStatsQuery = `
          SELECT 
            folder_name,
            COUNT(*) as file_count,
            SUM(file_size) as total_size,
            COUNT(CASE WHEN file_type = 'image' THEN 1 END) as image_count,
            COUNT(CASE WHEN file_type = 'document' THEN 1 END) as document_count,
            COUNT(CASE WHEN file_type = 'video' THEN 1 END) as video_count,
            MAX(uploaded_at) as last_uploaded
          FROM digital_files
        `;

        const values = [];
        if (folderName) {
          folderStatsQuery += ` WHERE folder_name = $1`;
          values.push(folderName);
        }

        folderStatsQuery += ` GROUP BY folder_name ORDER BY file_count DESC`;

        const folders = await pool.query(folderStatsQuery, values);

        // Get recent files
        const recentFiles = await pool.query(`
          SELECT folder_name, file_name, file_type, uploaded_at
          FROM digital_files
          ORDER BY uploaded_at DESC
          LIMIT 10
        `);

        return {
          total_folders: folders.rows.length,
          folders: folders.rows.map(folder => ({
            name: folder.folder_name,
            file_count: parseInt(folder.file_count),
            total_size: `${(parseInt(folder.total_size) / 1024 / 1024).toFixed(2)} MB`,
            breakdown: {
              images: parseInt(folder.image_count),
              documents: parseInt(folder.document_count),
              videos: parseInt(folder.video_count)
            },
            last_uploaded: folder.last_uploaded
          })),
          recent_files: recentFiles.rows.map(file => ({
            folder: file.folder_name,
            name: file.file_name,
            type: file.file_type,
            uploaded: file.uploaded_at
          }))
        };
      } catch (error) {
        console.error('❌ Error getting folder stats:', error.message);
        throw error;
      }
    },

    // Photography Sessions Functions
    async getPhotographySessions() {
      try {
        const result = await pool.query(`
          SELECT 
            id, title, description, session_type as "sessionType", status,
            start_time as "startTime", end_time as "endTime",
            client_id as "clientId", client_name as "clientName", client_email as "clientEmail", client_phone as "clientPhone",
            location_name as "locationName", location_address as "locationAddress", location_coordinates as "locationCoordinates",
            base_price as "basePrice", deposit_amount as "depositAmount", deposit_paid as "depositPaid",
            final_payment as "finalPayment", final_payment_paid as "finalPaymentPaid", payment_status as "paymentStatus",
            equipment_list as "equipmentList", crew_members as "crewMembers",
            conflict_detected as "conflictDetected", weather_dependent as "weatherDependent", 
            golden_hour_optimized as "goldenHourOptimized", backup_plan as "backupPlan",
            notes, portfolio_worthy as "portfolioWorthy", editing_status as "editingStatus",
            delivery_status as "deliveryStatus", delivery_date as "deliveryDate",
            is_recurring as "isRecurring", recurrence_rule as "recurrenceRule", parent_event_id as "parentEventId",
            google_calendar_event_id as "googleCalendarEventId", ical_uid as "icalUid", external_calendar_sync as "externalCalendarSync",
            reminder_settings as "reminderSettings", reminder_sent as "reminderSent", confirmation_sent as "confirmationSent", follow_up_sent as "followUpSent",
            is_online_bookable as "isOnlineBookable", booking_requirements as "bookingRequirements", availability_status as "availabilityStatus",
            color, priority, is_public as "isPublic", category, gallery_id as "galleryId", photographer_id as "photographerId",
            tags, custom_fields as "customFields", created_at as "createdAt", updated_at as "updatedAt"
          FROM photography_sessions 
          ORDER BY start_time ASC
        `);
        
        return result.rows.map(session => ({
          ...session,
          equipmentList: session.equipmentList || [],
          crewMembers: session.crewMembers || [],
          tags: session.tags || [],
          reminderSettings: session.reminderSettings || {},
          bookingRequirements: session.bookingRequirements || {},
          customFields: session.customFields || {}
        }));
      } catch (error) {
        console.error('❌ Error getting photography sessions:', error.message);
        // Return empty array if table doesn't exist yet
        return [];
      }
    },

    async createPhotographySession(sessionData) {
      try {
        const {
          title, description, sessionType, status = 'scheduled',
          startTime, endTime, clientId, clientName, clientEmail, clientPhone,
          locationName, locationAddress, locationCoordinates,
          basePrice, depositAmount, equipmentList = [],
          weatherDependent = false, goldenHourOptimized = false, portfolioWorthy = false,
          notes, color, priority = 'medium'
        } = sessionData;

        const result = await pool.query(`
          INSERT INTO photography_sessions (
            title, description, session_type, status,
            start_time, end_time, client_id, client_name, client_email, client_phone,
            location_name, location_address, location_coordinates,
            base_price, deposit_amount, equipment_list,
            weather_dependent, golden_hour_optimized, portfolio_worthy,
            notes, color, priority, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW(), NOW()
          ) RETURNING *
        `, [
          title, description, sessionType, status,
          startTime, endTime, clientId, clientName, clientEmail, clientPhone,
          locationName, locationAddress, locationCoordinates,
          basePrice, depositAmount, JSON.stringify(equipmentList),
          weatherDependent, goldenHourOptimized, portfolioWorthy,
          notes, color, priority
        ]);

        console.log(`📸 Photography session created: ${title}`);
        return result.rows[0];
      } catch (error) {
        console.error('❌ Error creating photography session:', error.message);
        throw error;
      }
    },

    async getDashboardStats() {
      try {
        // Get counts from various tables
        const sessionStats = await pool.query(`
          SELECT 
            COUNT(*) as total_sessions,
            COUNT(CASE WHEN start_time > NOW() AND start_time <= NOW() + INTERVAL '30 days' THEN 1 END) as upcoming_sessions,
            COUNT(CASE WHEN status = 'completed' AND DATE_TRUNC('month', start_time) = DATE_TRUNC('month', NOW()) THEN 1 END) as completed_sessions,
            SUM(CASE WHEN base_price IS NOT NULL THEN base_price ELSE 0 END) as total_revenue,
            COUNT(CASE WHEN deposit_amount IS NOT NULL AND NOT COALESCE(deposit_paid, false) THEN 1 END) as pending_deposits
          FROM photography_sessions
        `);

        const leadStats = await pool.query(`
          SELECT COUNT(*) as new_leads
          FROM crm_leads 
          WHERE created_at >= NOW() - INTERVAL '7 days'
        `);

        const stats = sessionStats.rows[0] || {};
        const leads = leadStats.rows[0] || {};

        return {
          totalSessions: parseInt(stats.total_sessions) || 0,
          upcomingSessions: parseInt(stats.upcoming_sessions) || 0,
          completedSessions: parseInt(stats.completed_sessions) || 0,
          totalRevenue: parseFloat(stats.total_revenue) || 0,
          pendingDeposits: parseInt(stats.pending_deposits) || 0,
          equipmentConflicts: 0, // Would need more complex logic
          newLeads: parseInt(leads.new_leads) || 0
        };
      } catch (error) {
        console.error('❌ Error getting dashboard stats:', error.message);
        // Return default stats if tables don't exist
        return {
          totalSessions: 0,
          upcomingSessions: 0,
          completedSessions: 0,
          totalRevenue: 0,
          pendingDeposits: 0,
          equipmentConflicts: 0,
          newLeads: 0
        };
      }
    },

    async getTopClients(orderBy = 'total_sales', limit = 20) {
      try {
        let orderColumn = 'COALESCE(total_sales, 0)';
        
        if (orderBy === 'outstanding_balance') {
          orderColumn = 'COALESCE(outstanding_balance, 0)';
        } else if (orderBy === 'created_at') {
          orderColumn = 'created_at';
        }

        const result = await pool.query(`
          SELECT 
            id,
            client_id,
            first_name,
            last_name,
            email,
            phone,
            COALESCE(total_sales, 0) as total_sales,
            COALESCE(outstanding_balance, 0) as outstanding_balance,
            created_at,
            updated_at,
            CASE 
              WHEN COALESCE(total_sales, 0) >= 10000 THEN 'Premium'
              WHEN COALESCE(total_sales, 0) >= 5000 THEN 'Gold'
              WHEN COALESCE(total_sales, 0) >= 1000 THEN 'Silver'
              ELSE 'Bronze'
            END as tier
          FROM crm_clients 
          ORDER BY ${orderColumn} DESC 
          LIMIT $1
        `, [limit]);

        // Map database fields to frontend expected format
        const mappedClients = result.rows.map(client => ({
          id: client.id,
          clientId: client.client_id || client.id,
          firstName: client.first_name || '',
          lastName: client.last_name || '',
          email: client.email || '',
          phone: client.phone || '',
          revenue: parseFloat(client.total_sales) || 0,
          outstandingBalance: parseFloat(client.outstanding_balance) || 0,
          tier: client.tier,
          createdAt: client.created_at,
          updatedAt: client.updated_at
        }));

        return mappedClients;
      } catch (error) {
        console.error('❌ Error fetching top clients:', error.message);
        
        // If columns don't exist, return empty array or try a simpler query
        if (error.message.includes('column') && error.message.includes('does not exist')) {
          console.log('📝 Trying simpler query without sales columns...');
          
          try {
            const simpleResult = await pool.query(`
              SELECT 
                id,
                client_id,
                first_name,
                last_name,
                email,
                phone,
                created_at
              FROM crm_clients 
              ORDER BY created_at DESC 
              LIMIT $1
            `, [limit]);

            const mappedClients = simpleResult.rows.map(client => ({
              id: client.id,
              clientId: client.client_id || client.id,
              firstName: client.first_name || '',
              lastName: client.last_name || '',
              email: client.email || '',
              phone: client.phone || '',
              revenue: 0,
              outstandingBalance: 0,
              tier: 'Bronze',
              createdAt: client.created_at
            }));

            return mappedClients;
          } catch (fallbackError) {
            console.error('❌ Fallback query also failed:', fallbackError.message);
            return [];
          }
        }
        
        throw error;
      }
    },

    // Voucher Products Functions
    async getVoucherProducts() {
      try {
        console.log('🔍 Getting voucher products from database...');
        const result = await pool.query(`
          SELECT * FROM voucher_products 
          WHERE is_active = true 
          ORDER BY display_order ASC, created_at DESC
        `);
        console.log('✅ Found voucher products:', result.rows.length);
        if (result.rows.length > 0) {
          console.log('📋 First product:', result.rows[0].name, '- €' + result.rows[0].price);
        }
        return result.rows;
      } catch (error) {
        console.error('❌ Error fetching voucher products:', error.message);
        console.error('❌ Error details:', error);
        throw error;
      }
    },

    async getVoucherProduct(id) {
      try {
        const result = await pool.query('SELECT * FROM voucher_products WHERE id = $1', [id]);
        return result.rows[0] || null;
      } catch (error) {
        console.error('❌ Error fetching voucher product:', error.message);
        throw error;
      }
    },

    async createVoucherProduct(productData) {
      try {
        const {
          name, description, detailedDescription, price, originalPrice, category, sessionType,
          sessionDuration, isActive = true, validityPeriod = 1460,
          displayOrder = 0, imageUrl, thumbnailUrl, promoImageUrl, featured = false, badge,
          stockLimit, maxPerCustomer = 5, slug, metaTitle, metaDescription,
          redemptionInstructions, termsAndConditions
        } = productData;

        const result = await pool.query(`
          INSERT INTO voucher_products (
            name, description, detailed_description, price, original_price, category, session_type,
            session_duration, is_active, validity_period, display_order,
            image_url, thumbnail_url, promo_image_url, featured, badge, stock_limit, max_per_customer,
            slug, meta_title, meta_description, redemption_instructions,
            terms_and_conditions
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
          RETURNING *
        `, [
          name, description, detailedDescription, price, originalPrice, category, sessionType,
          sessionDuration, isActive, validityPeriod, displayOrder,
          imageUrl, thumbnailUrl, promoImageUrl, featured, badge, stockLimit, maxPerCustomer,
          slug, metaTitle, metaDescription, redemptionInstructions,
          termsAndConditions
        ]);

        return result.rows[0];
      } catch (error) {
        console.error('❌ Error creating voucher product:', error.message);
        throw error;
      }
    },

    async updateVoucherProduct(id, productData) {
      try {
        // Accept both snake_case and camelCase input keys
        const name = productData.name ?? null;
        const description = productData.description ?? null;
        const detailed_description = (productData.detailed_description ?? productData.detailedDescription) ?? null;
        const price = productData.price ?? null;
        const original_price = (productData.original_price ?? productData.originalPrice) ?? null;
        const category = productData.category ?? null;
        const session_type = (productData.session_type ?? productData.sessionType) ?? null;
        const session_duration = (productData.session_duration ?? productData.sessionDuration) ?? null;
        const is_active = (productData.is_active ?? productData.isActive) ?? null;
        const validity_period = (productData.validity_period ?? productData.validityPeriod) ?? null;
        const display_order = (productData.display_order ?? productData.displayOrder) ?? null;
        const image_url = (productData.image_url ?? productData.imageUrl) ?? null;
        const thumbnail_url = (productData.thumbnail_url ?? productData.thumbnailUrl) ?? null;
        const promo_image_url = (productData.promo_image_url ?? productData.promoImageUrl) ?? null;
        const featured = productData.featured ?? null;
        const badge = productData.badge ?? null;
        const stock_limit = (productData.stock_limit ?? productData.stockLimit) ?? null;
        const max_per_customer = (productData.max_per_customer ?? productData.maxPerCustomer) ?? null;
        const slug = productData.slug ?? null;
        const meta_title = (productData.meta_title ?? productData.metaTitle) ?? null;
        const meta_description = (productData.meta_description ?? productData.metaDescription) ?? null;
        const redemption_instructions = (productData.redemption_instructions ?? productData.redemptionInstructions) ?? null;
        const terms_and_conditions = (productData.terms_and_conditions ?? productData.termsAndConditions) ?? null;

        console.log('[DB] updateVoucherProduct incoming mapped data:', {
          id,
          name, description, detailed_description, price, original_price, category, session_type,
          session_duration, is_active, validity_period, display_order, image_url, thumbnail_url,
          promo_image_url, featured, badge, stock_limit, max_per_customer, slug, meta_title,
          meta_description, redemption_instructions, terms_and_conditions
        });

        const result = await pool.query(`
          UPDATE voucher_products SET
            name = COALESCE($2, name),
            description = COALESCE($3, description),
            detailed_description = COALESCE($4, detailed_description),
            price = COALESCE($5, price),
            original_price = COALESCE($6, original_price),
            category = COALESCE($7, category),
            session_type = COALESCE($8, session_type),
            session_duration = COALESCE($9, session_duration),
            is_active = COALESCE($10, is_active),
            validity_period = COALESCE($11, validity_period),
            display_order = COALESCE($12, display_order),
            image_url = COALESCE($13, image_url),
            thumbnail_url = COALESCE($14, thumbnail_url),
            promo_image_url = COALESCE($15, promo_image_url),
            featured = COALESCE($16, featured),
            badge = COALESCE($17, badge),
            stock_limit = COALESCE($18, stock_limit),
            max_per_customer = COALESCE($19, max_per_customer),
            slug = COALESCE($20, slug),
            meta_title = COALESCE($21, meta_title),
            meta_description = COALESCE($22, meta_description),
            redemption_instructions = COALESCE($23, redemption_instructions),
            terms_and_conditions = COALESCE($24, terms_and_conditions),
            updated_at = NOW()
          WHERE id = $1
          RETURNING *
        `, [
          id,
          name, description, detailed_description, price, original_price, category, session_type,
          session_duration, is_active, validity_period, display_order, image_url, thumbnail_url,
          promo_image_url, featured, badge, stock_limit, max_per_customer, slug, meta_title,
          meta_description, redemption_instructions, terms_and_conditions
        ]);

        if (!result.rows[0]) {
          console.warn('⚠️ updateVoucherProduct returned no row for id:', id);
          return null;
        }
        console.log('✅ Voucher product updated successfully:', result.rows[0].name);
        return result.rows[0];
      } catch (error) {
        console.error('❌ Error updating voucher product:', error.message);
        throw error;
      }
    },

    async deleteVoucherProduct(id) {
      try {
        const result = await pool.query('DELETE FROM voucher_products WHERE id = $1 RETURNING *', [id]);
        if (!result.rows[0]) {
          console.warn('⚠️ deleteVoucherProduct: No product found with id:', id);
        }
        return result.rows[0];
      } catch (error) {
        console.error('❌ Error deleting voucher product:', error.message);
        throw error;
      }
    },

    // ==================== VOUCHER TEMPLATES ====================
    async getVoucherTemplates(activeOnly = false) {
      try {
        const query = activeOnly
          ? 'SELECT * FROM voucher_templates WHERE is_active = true ORDER BY display_order ASC, created_at DESC'
          : 'SELECT * FROM voucher_templates ORDER BY display_order ASC, created_at DESC';
        const result = await pool.query(query);
        return result.rows;
      } catch (error) {
        console.error('❌ Error fetching voucher templates:', error.message);
        throw error;
      }
    },

    async getVoucherTemplate(id) {
      try {
        const result = await pool.query('SELECT * FROM voucher_templates WHERE id = $1', [id]);
        return result.rows[0] || null;
      } catch (error) {
        console.error('❌ Error fetching voucher template:', error.message);
        throw error;
      }
    },

    async createVoucherTemplate(data) {
      try {
        const { name, category, imageUrl, occasion, isActive = true, displayOrder = 0,
                bannerColor, bannerTextColor, fontFamily, messageFontSize,
                logoUrl, footerText, footerEmail, footerPhone, termsText, layoutStyle } = data;
        const result = await pool.query(`
          INSERT INTO voucher_templates (name, category, image_url, occasion, is_active, display_order,
            banner_color, banner_text_color, font_family, message_font_size,
            logo_url, footer_text, footer_email, footer_phone, terms_text, layout_style)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          RETURNING *
        `, [name, category, imageUrl || data.image_url, occasion, isActive ?? data.is_active ?? true, displayOrder ?? data.display_order ?? 0,
            bannerColor || null, bannerTextColor || null, fontFamily || null, messageFontSize || null,
            logoUrl || null, footerText || null, footerEmail || null, footerPhone || null, termsText || null, layoutStyle || null]);
        return result.rows[0];
      } catch (error) {
        console.error('❌ Error creating voucher template:', error.message);
        throw error;
      }
    },

    async updateVoucherTemplate(id, data) {
      try {
        const name = data.name ?? null;
        const category = data.category ?? null;
        const image_url = (data.image_url ?? data.imageUrl) ?? null;
        const occasion = data.occasion ?? null;
        const is_active = (data.is_active ?? data.isActive) ?? null;
        const display_order = (data.display_order ?? data.displayOrder) ?? null;
        const banner_color = (data.banner_color ?? data.bannerColor) ?? null;
        const banner_text_color = (data.banner_text_color ?? data.bannerTextColor) ?? null;
        const font_family = (data.font_family ?? data.fontFamily) ?? null;
        const message_font_size = (data.message_font_size ?? data.messageFontSize) ?? null;
        const logo_url = (data.logo_url ?? data.logoUrl) ?? null;
        const footer_text = (data.footer_text ?? data.footerText) ?? null;
        const footer_email = (data.footer_email ?? data.footerEmail) ?? null;
        const footer_phone = (data.footer_phone ?? data.footerPhone) ?? null;
        const terms_text = (data.terms_text ?? data.termsText) ?? null;
        const layout_style = (data.layout_style ?? data.layoutStyle) ?? null;

        const result = await pool.query(`
          UPDATE voucher_templates SET
            name = COALESCE($2, name),
            category = COALESCE($3, category),
            image_url = COALESCE($4, image_url),
            occasion = COALESCE($5, occasion),
            is_active = COALESCE($6, is_active),
            display_order = COALESCE($7, display_order),
            banner_color = COALESCE($8, banner_color),
            banner_text_color = COALESCE($9, banner_text_color),
            font_family = COALESCE($10, font_family),
            message_font_size = COALESCE($11, message_font_size),
            logo_url = COALESCE($12, logo_url),
            footer_text = COALESCE($13, footer_text),
            footer_email = COALESCE($14, footer_email),
            footer_phone = COALESCE($15, footer_phone),
            terms_text = COALESCE($16, terms_text),
            layout_style = COALESCE($17, layout_style),
            updated_at = NOW()
          WHERE id = $1
          RETURNING *
        `, [id, name, category, image_url, occasion, is_active, display_order,
            banner_color, banner_text_color, font_family, message_font_size,
            logo_url, footer_text, footer_email, footer_phone, terms_text, layout_style]);

        return result.rows[0];
      } catch (error) {
        console.error('❌ Error updating voucher template:', error.message);
        throw error;
      }
    },

    async deleteVoucherTemplate(id) {
      try {
        const result = await pool.query('DELETE FROM voucher_templates WHERE id = $1 RETURNING *', [id]);
        return result.rows[0];
      } catch (error) {
        console.error('❌ Error deleting voucher template:', error.message);
        throw error;
      }
    },

    // ==================== VOUCHER SALES ====================
    async createVoucherSale(saleData) {
      try {
        const {
          product_id, purchaser_name, purchaser_email, purchaser_phone,
          recipient_name, recipient_email, gift_message, voucher_code,
          original_amount, discount_amount, final_amount, currency,
          coupon_id, coupon_code, payment_intent_id, payment_status,
          payment_method, is_redeemed, redeemed_at, redeemed_by,
          session_id, valid_from, valid_until
        } = saleData;

        const result = await pool.query(`
          INSERT INTO voucher_sales (
            product_id, purchaser_name, purchaser_email, purchaser_phone,
            recipient_name, recipient_email, gift_message, voucher_code,
            original_amount, discount_amount, final_amount, currency,
            coupon_id, coupon_code, payment_intent_id, payment_status,
            payment_method, is_redeemed, redeemed_at, redeemed_by,
            session_id, valid_from, valid_until, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
            $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, NOW(), NOW()
          )
          RETURNING *
        `, [
          product_id, purchaser_name, purchaser_email, purchaser_phone,
          recipient_name, recipient_email, gift_message, voucher_code,
          original_amount, discount_amount, final_amount, currency || 'EUR',
          coupon_id, coupon_code, payment_intent_id, payment_status || 'pending',
          payment_method, is_redeemed || false, redeemed_at, redeemed_by,
          session_id, valid_from || new Date(), valid_until
        ]);

        console.log('✅ Voucher sale created:', voucher_code);
        return result.rows[0];
      } catch (error) {
        console.error('❌ Error creating voucher sale:', error.message);
        throw error;
      }
    },

    async getVoucherSales() {
      try {
        const result = await pool.query(`
          SELECT 
            vs.*,
            vp.name as product_name,
            vp.description as product_description,
            vp.sku as product_sku
          FROM voucher_sales vs
          LEFT JOIN voucher_products vp ON vs.product_id = vp.id
          ORDER BY vs.created_at DESC
        `);
        return result.rows;
      } catch (error) {
        console.error('❌ Error getting voucher sales:', error.message);
        throw error;
      }
    },

    async getVoucherSale(id) {
      try {
        const result = await pool.query('SELECT * FROM voucher_sales WHERE id = $1', [id]);
        return result.rows[0];
      } catch (error) {
        console.error('❌ Error getting voucher sale:', error.message);
        throw error;
      }
    },

    async updateVoucherSale(id, updateData) {
      try {
        const {
          is_redeemed, redeemed_at, redeemed_by, payment_status
        } = updateData;

        const result = await pool.query(`
          UPDATE voucher_sales SET
            is_redeemed = COALESCE($2, is_redeemed),
            redeemed_at = COALESCE($3, redeemed_at),
            redeemed_by = COALESCE($4, redeemed_by),
            payment_status = COALESCE($5, payment_status),
            updated_at = NOW()
          WHERE id = $1
          RETURNING *
        `, [id, is_redeemed, redeemed_at, redeemed_by, payment_status]);

        return result.rows[0];
      } catch (error) {
        console.error('❌ Error updating voucher sale:', error.message);
        throw error;
      }
    },

    // ==================== EMAIL SETTINGS ====================
    async saveEmailSettings(settings) {
      try {
        // Create email_settings table if it doesn't exist
        await pool.query(`
          CREATE TABLE IF NOT EXISTS email_settings (
            id SERIAL PRIMARY KEY,
            smtp_host VARCHAR(255),
            smtp_port INTEGER DEFAULT 587,
            smtp_user VARCHAR(255),
            smtp_pass VARCHAR(255),
            from_email VARCHAR(255),
            from_name VARCHAR(255),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          )
        `);

        // Check if settings exist
        const existingResult = await pool.query('SELECT id FROM email_settings LIMIT 1');
        
        if (existingResult.rows.length > 0) {
          // Update existing settings
          const result = await pool.query(`
            UPDATE email_settings 
            SET smtp_host = $1, smtp_port = $2, smtp_user = $3, smtp_pass = $4, 
                from_email = $5, from_name = $6, updated_at = NOW()
            WHERE id = $7
            RETURNING *
          `, [
            settings.smtp_host, settings.smtp_port, settings.smtp_user, 
            settings.smtp_pass, settings.from_email, settings.from_name,
            existingResult.rows[0].id
          ]);
          return result.rows[0];
        } else {
          // Insert new settings
          const result = await pool.query(`
            INSERT INTO email_settings (smtp_host, smtp_port, smtp_user, smtp_pass, from_email, from_name)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
          `, [
            settings.smtp_host, settings.smtp_port, settings.smtp_user, 
            settings.smtp_pass, settings.from_email, settings.from_name
          ]);
          return result.rows[0];
        }
      } catch (error) {
        console.error('❌ Error saving email settings:', error.message);
        throw error;
      }
    },

    async getEmailSettings() {
      try {
        const result = await pool.query('SELECT * FROM email_settings ORDER BY updated_at DESC LIMIT 1');
        
        if (result.rows.length > 0) {
          return result.rows[0];
        } else {
          // Return env-based settings if no custom settings exist
          return {
            smtp_host: process.env.SMTP_HOST || 'smtp.easyname.com',
            smtp_port: parseInt(process.env.SMTP_PORT || '587'),
            smtp_user: process.env.BUSINESS_MAILBOX_USER || process.env.SMTP_USER || '',
            smtp_pass: process.env.EMAIL_PASSWORD || process.env.SMTP_PASS || '',
            from_email: process.env.SMTP_FROM || process.env.STUDIO_NOTIFY_EMAIL || '',
            from_name: process.env.EMAIL_FROM_NAME || 'Studio'
          };
        }
      } catch (error) {
        console.error('❌ Error getting email settings:', error.message);
        // Return env-based settings on error
        return {
          smtp_host: process.env.SMTP_HOST || 'smtp.easyname.com',
          smtp_port: parseInt(process.env.SMTP_PORT || '587'),
          smtp_user: process.env.BUSINESS_MAILBOX_USER || process.env.SMTP_USER || '',
          smtp_pass: process.env.EMAIL_PASSWORD || process.env.SMTP_PASS || '',
          from_email: process.env.SMTP_FROM || process.env.STUDIO_NOTIFY_EMAIL || '',
          from_name: process.env.EMAIL_FROM_NAME || 'Studio'
        };
      }
    },

    // ==================== LANDING PAGES ====================
    async getLandingPages(status = null) {
      try {
        let query = 'SELECT * FROM landing_pages';
        const params = [];
        if (status) {
          query += ' WHERE status = $1';
          params.push(status);
        }
        query += ' ORDER BY updated_at DESC';
        const result = await pool.query(query, params);
        return result.rows;
      } catch (error) {
        console.error('❌ Error fetching landing pages:', error.message);
        return [];
      }
    },

    async getLandingPage(id) {
      try {
        const result = await pool.query('SELECT * FROM landing_pages WHERE id = $1', [id]);
        return result.rows[0] || null;
      } catch (error) {
        console.error('❌ Error fetching landing page:', error.message);
        return null;
      }
    },

    async getLandingPageBySlug(slug) {
      try {
        const result = await pool.query(
          'SELECT * FROM landing_pages WHERE slug = $1 AND status = $2',
          [slug, 'published']
        );
        return result.rows[0] || null;
      } catch (error) {
        console.error('❌ Error fetching landing page by slug:', error.message);
        return null;
      }
    },

    async getLandingPageForPreview(slug, previewToken) {
      try {
        const result = await pool.query(
          'SELECT * FROM landing_pages WHERE slug = $1 AND preview_token = $2 AND preview_token_expires_at > NOW()',
          [slug, previewToken]
        );
        return result.rows[0] || null;
      } catch (error) {
        console.error('❌ Error fetching landing page for preview:', error.message);
        return null;
      }
    },

    async createLandingPage(data) {
      try {
        const result = await pool.query(`
          INSERT INTO landing_pages (
            user_id, title, slug, status, page_type, primary_service,
            target_audience, offer_summary, city, tone, seo_title,
            meta_description, hero_headline, hero_subheadline, cta_text,
            cta_action, content_json, generation_prompt_json, generation_context_json
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
          RETURNING *
        `, [
          data.user_id || null,
          data.title,
          data.slug,
          data.status || 'draft',
          data.page_type || 'general',
          data.primary_service || null,
          data.target_audience || null,
          data.offer_summary || null,
          data.city || null,
          data.tone || 'warm',
          data.seo_title || null,
          data.meta_description || null,
          data.hero_headline || null,
          data.hero_subheadline || null,
          data.cta_text || 'Book Now',
          data.cta_action || 'book_now',
          JSON.stringify(data.content_json || {}),
          JSON.stringify(data.generation_prompt_json || {}),
          JSON.stringify(data.generation_context_json || {})
        ]);
        return result.rows[0];
      } catch (error) {
        console.error('❌ Error creating landing page:', error.message);
        throw error;
      }
    },

    async updateLandingPage(id, data) {
      try {
        const fields = [];
        const values = [];
        let paramIdx = 1;

        const allowedFields = [
          'title', 'slug', 'status', 'page_type', 'primary_service',
          'target_audience', 'offer_summary', 'city', 'tone', 'seo_title',
          'meta_description', 'hero_headline', 'hero_subheadline', 'cta_text',
          'cta_action', 'schema_type', 'content_json', 'generation_prompt_json',
          'generation_context_json', 'preview_image_url', 'published_url', 'published_at',
          'preview_token', 'preview_token_expires_at', 'canonical_url', 'noindex',
          'cta_voucher_slug', 'cta_voucher_amount', 'cta_voucher_title',
          'hero_image_url', 'hero_video_url', 'hero_image_position', 'hero_video_placement', 'hero_video_position',
          'cta_email', 'cta_whatsapp'
        ];

        for (const key of allowedFields) {
          if (data[key] !== undefined) {
            const dbKey = key; // already snake_case
            const val = (key === 'content_json' || key === 'generation_prompt_json' || key === 'generation_context_json')
              ? JSON.stringify(data[key])
              : data[key];
            fields.push(`${dbKey} = $${paramIdx}`);
            values.push(val);
            paramIdx++;
          }
        }

        if (fields.length === 0) return await this.getLandingPage(id);

        fields.push(`updated_at = NOW()`);
        values.push(id);

        const result = await pool.query(
          `UPDATE landing_pages SET ${fields.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
          values
        );
        return result.rows[0];
      } catch (error) {
        console.error('❌ Error updating landing page:', error.message);
        throw error;
      }
    },

    async deleteLandingPage(id) {
      try {
        const result = await pool.query('DELETE FROM landing_pages WHERE id = $1 RETURNING *', [id]);
        return result.rows[0];
      } catch (error) {
        console.error('❌ Error deleting landing page:', error.message);
        throw error;
      }
    },

    async duplicateLandingPage(id) {
      try {
        const original = await this.getLandingPage(id);
        if (!original) throw new Error('Landing page not found');

        // Generate unique slug
        let newSlug = original.slug + '-copy';
        let counter = 1;
        while (true) {
          const existing = await pool.query('SELECT id FROM landing_pages WHERE slug = $1', [newSlug]);
          if (existing.rows.length === 0) break;
          newSlug = original.slug + '-copy-' + (++counter);
        }

        return await this.createLandingPage({
          ...original,
          title: original.title + ' (Copy)',
          slug: newSlug,
          status: 'draft',
          published_at: null,
          published_url: null,
          content_json: original.content_json,
          generation_prompt_json: original.generation_prompt_json,
          generation_context_json: original.generation_context_json,
        });
      } catch (error) {
        console.error('❌ Error duplicating landing page:', error.message);
        throw error;
      }
    },

    async checkSlugAvailable(slug, excludeId = null) {
      try {
        let query = 'SELECT id FROM landing_pages WHERE slug = $1';
        const params = [slug];
        if (excludeId) {
          query += ' AND id != $2';
          params.push(excludeId);
        }
        const result = await pool.query(query, params);
        return result.rows.length === 0;
      } catch (error) {
        console.error('❌ Error checking slug:', error.message);
        return false;
      }
    },

    async createLandingPageRevision(landingPageId, contentJson, contextJson, createdBy) {
      try {
        // Get next version number
        const versionResult = await pool.query(
          'SELECT COALESCE(MAX(version_number), 0) + 1 as next_version FROM landing_page_revisions WHERE landing_page_id = $1',
          [landingPageId]
        );
        const nextVersion = versionResult.rows[0].next_version;

        const result = await pool.query(`
          INSERT INTO landing_page_revisions (landing_page_id, version_number, content_json, generation_context_json, created_by)
          VALUES ($1, $2, $3, $4, $5) RETURNING *
        `, [landingPageId, nextVersion, JSON.stringify(contentJson), JSON.stringify(contextJson || {}), createdBy]);
        return result.rows[0];
      } catch (error) {
        console.error('❌ Error creating revision:', error.message);
        throw error;
      }
    },

    async getLandingPageRevisions(landingPageId) {
      try {
        const result = await pool.query(
          `SELECT id, landing_page_id, version_number, content_json, generation_context_json, created_by, created_at
           FROM landing_page_revisions
           WHERE landing_page_id = $1
           ORDER BY version_number DESC`,
          [landingPageId]
        );
        return result.rows;
      } catch (error) {
        console.error('❌ Error fetching revisions:', error.message);
        throw error;
      }
    },

    // ── Phase 5: Landing Page Events ─────────────────────────

    async recordLandingPageEvent(input) {
      try {
        const result = await pool.query(
          `INSERT INTO landing_page_events
             (landing_page_id, event_type, event_label, event_value, variant_key,
              session_id, visitor_id, source, medium, campaign, referrer, page_path, metadata_json)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
           RETURNING *`,
          [
            input.landing_page_id, input.event_type, input.event_label || null,
            input.event_value || null, input.variant_key || null,
            input.session_id || null, input.visitor_id || null,
            input.source || null, input.medium || null, input.campaign || null,
            input.referrer || null, input.page_path || null,
            JSON.stringify(input.metadata_json || {})
          ]
        );
        return result.rows[0];
      } catch (error) {
        console.error('❌ Error recording landing page event:', error.message);
        throw error;
      }
    },

    async getLandingPageEventsByPage(landingPageId, days = 30) {
      try {
        const result = await pool.query(
          `SELECT * FROM landing_page_events
           WHERE landing_page_id = $1
             AND occurred_at >= NOW() - INTERVAL '1 day' * $2
           ORDER BY occurred_at DESC
           LIMIT 500`,
          [landingPageId, days]
        );
        return result.rows;
      } catch (error) {
        console.error('❌ Error fetching landing page events:', error.message);
        throw error;
      }
    },

    async getLandingPageAnalytics(landingPageId, days = 30) {
      try {
        const summaryResult = await pool.query(
          `SELECT
             COUNT(*) FILTER (WHERE event_type = 'page_view')::int AS total_views,
             COUNT(*) FILTER (WHERE event_type = 'cta_click')::int AS total_cta_clicks,
             COUNT(*) FILTER (WHERE event_type = 'form_start')::int AS total_form_starts,
             COUNT(*) FILTER (WHERE event_type = 'form_submit')::int AS total_form_submits,
             COUNT(*) FILTER (WHERE event_type = 'booking_click')::int AS total_booking_clicks,
             COUNT(*) FILTER (WHERE event_type = 'voucher_click')::int AS total_voucher_clicks,
             COUNT(*) FILTER (WHERE event_type = 'whatsapp_click')::int AS total_whatsapp_clicks,
             COUNT(*) FILTER (WHERE event_type = 'email_click')::int AS total_email_clicks,
             COUNT(*) FILTER (WHERE event_type = 'phone_click')::int AS total_phone_clicks
           FROM landing_page_events
           WHERE landing_page_id = $1
             AND occurred_at >= NOW() - INTERVAL '1 day' * $2`,
          [landingPageId, days]
        );

        const topCtasResult = await pool.query(
          `SELECT event_label, COUNT(*)::int AS clicks
           FROM landing_page_events
           WHERE landing_page_id = $1
             AND event_type = 'cta_click'
             AND occurred_at >= NOW() - INTERVAL '1 day' * $2
           GROUP BY event_label
           ORDER BY clicks DESC
           LIMIT 10`,
          [landingPageId, days]
        );

        const timelineResult = await pool.query(
          `SELECT
             DATE_TRUNC('day', occurred_at)::date AS date,
             COUNT(*) FILTER (WHERE event_type = 'page_view')::int AS views,
             COUNT(*) FILTER (WHERE event_type = 'cta_click')::int AS clicks
           FROM landing_page_events
           WHERE landing_page_id = $1
             AND occurred_at >= NOW() - INTERVAL '1 day' * $2
           GROUP BY DATE_TRUNC('day', occurred_at)
           ORDER BY date ASC`,
          [landingPageId, days]
        );

        const recentResult = await pool.query(
          `SELECT * FROM landing_page_events
           WHERE landing_page_id = $1
           ORDER BY occurred_at DESC LIMIT 20`,
          [landingPageId]
        );

        const summary = summaryResult.rows[0];
        const totalViews = summary.total_views || 0;
        const totalCtaClicks = summary.total_cta_clicks || 0;
        const totalFormStarts = summary.total_form_starts || 0;
        const totalFormSubmits = summary.total_form_submits || 0;

        return {
          totalViews,
          totalCtaClicks,
          totalFormStarts,
          totalFormSubmits,
          totalBookingClicks: summary.total_booking_clicks || 0,
          totalVoucherClicks: summary.total_voucher_clicks || 0,
          totalWhatsappClicks: summary.total_whatsapp_clicks || 0,
          totalEmailClicks: summary.total_email_clicks || 0,
          totalPhoneClicks: summary.total_phone_clicks || 0,
          clickThroughRate: totalViews > 0 ? totalCtaClicks / totalViews : 0,
          conversionRate: totalViews > 0 ? totalFormSubmits / totalViews : 0,
          conversionFunnel: {
            views: totalViews,
            ctaClicks: totalCtaClicks,
            formStarts: totalFormStarts,
            formSubmits: totalFormSubmits,
            ctaRate: totalViews > 0 ? totalCtaClicks / totalViews : 0,
            startRate: totalCtaClicks > 0 ? totalFormStarts / totalCtaClicks : 0,
            submitRate: totalFormStarts > 0 ? totalFormSubmits / totalFormStarts : 0,
          },
          topCtas: topCtasResult.rows.map(r => ({ label: r.event_label, clicks: r.clicks })),
          timeline: timelineResult.rows.map(r => ({ date: r.date, views: r.views, clicks: r.clicks })),
          recentEvents: recentResult.rows,
        };
      } catch (error) {
        console.error('❌ Error fetching landing page analytics:', error.message);
        throw error;
      }
    },

    async getLandingPagesAnalyticsOverview(userId) {
      try {
        const result = await pool.query(
          `SELECT
             lp.id, lp.title, lp.slug, lp.status,
             COUNT(e.id)::int AS total_events,
             COUNT(e.id) FILTER (WHERE e.event_type = 'page_view')::int AS views,
             COUNT(e.id) FILTER (WHERE e.event_type = 'cta_click')::int AS clicks
           FROM landing_pages lp
           LEFT JOIN landing_page_events e
             ON e.landing_page_id = lp.id
             AND e.occurred_at >= NOW() - INTERVAL '30 days'
           WHERE lp.user_id = $1
           GROUP BY lp.id
           ORDER BY views DESC`,
          [userId]
        );
        return result.rows.map(r => ({
          landingPageId: r.id,
          name: r.title,
          slug: r.slug,
          status: r.status,
          totalEvents: r.total_events,
          views: r.views,
          clicks: r.clicks,
          ctr: r.views > 0 ? r.clicks / r.views : 0,
        }));
      } catch (error) {
        console.error('❌ Error fetching analytics overview:', error.message);
        throw error;
      }
    },

    // ── Phase 5: Landing Page Variants ───────────────────────

    async createLandingPageVariant(data) {
      try {
        const result = await pool.query(
          `INSERT INTO landing_page_variants
             (landing_page_id, user_id, variant_key, name, slug, status, traffic_weight,
              content_json, seo_title, meta_description, hero_headline, cta_text)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           RETURNING *`,
          [
            data.landing_page_id, data.user_id, data.variant_key, data.name,
            data.slug || null, data.status || 'draft', data.traffic_weight ?? 0,
            JSON.stringify(data.content_json || {}),
            data.seo_title || null, data.meta_description || null,
            data.hero_headline || null, data.cta_text || null
          ]
        );
        return result.rows[0];
      } catch (error) {
        console.error('❌ Error creating landing page variant:', error.message);
        throw error;
      }
    },

    async listLandingPageVariants(landingPageId) {
      try {
        const result = await pool.query(
          `SELECT v.*,
             (SELECT COUNT(*)::int FROM landing_page_events e WHERE e.landing_page_id = v.landing_page_id AND e.variant_key = v.variant_key AND e.event_type = 'page_view') AS views,
             (SELECT COUNT(*)::int FROM landing_page_events e WHERE e.landing_page_id = v.landing_page_id AND e.variant_key = v.variant_key AND e.event_type = 'cta_click') AS clicks
           FROM landing_page_variants v
           WHERE v.landing_page_id = $1
           ORDER BY v.created_at ASC`,
          [landingPageId]
        );
        return result.rows.map(r => ({
          ...r,
          views: r.views || 0,
          clicks: r.clicks || 0,
          ctr: r.views > 0 ? r.clicks / r.views : 0,
        }));
      } catch (error) {
        console.error('❌ Error listing landing page variants:', error.message);
        throw error;
      }
    },

    async getLandingPageVariant(variantId) {
      try {
        const result = await pool.query(
          `SELECT * FROM landing_page_variants WHERE id = $1`,
          [variantId]
        );
        return result.rows[0] || null;
      } catch (error) {
        console.error('❌ Error fetching landing page variant:', error.message);
        throw error;
      }
    },

    async updateLandingPageVariant(variantId, data) {
      try {
        const fields = [];
        const values = [];
        let idx = 1;
        const allowedFields = [
          'name', 'slug', 'status', 'traffic_weight', 'content_json',
          'seo_title', 'seo_description', 'hero_image_url', 'cta_url'
        ];
        for (const key of allowedFields) {
          if (data[key] !== undefined) {
            fields.push(`${key} = $${idx}`);
            values.push(key === 'content_json' ? JSON.stringify(data[key]) : data[key]);
            idx++;
          }
        }
        if (fields.length === 0) return null;
        fields.push(`updated_at = NOW()`);
        values.push(variantId);
        const result = await pool.query(
          `UPDATE landing_page_variants SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
          values
        );
        return result.rows[0] || null;
      } catch (error) {
        console.error('❌ Error updating landing page variant:', error.message);
        throw error;
      }
    },

    async deleteLandingPageVariant(variantId) {
      try {
        const result = await pool.query(
          `DELETE FROM landing_page_variants WHERE id = $1 RETURNING *`,
          [variantId]
        );
        return result.rows[0] || null;
      } catch (error) {
        console.error('❌ Error deleting landing page variant:', error.message);
        throw error;
      }
    },

    // ── Phase 6: Landing Page Automation Rules ────────────────────

    async listLandingPageAutomationRules(userId, landingPageId) {
      try {
        const result = await pool.query(
          `SELECT * FROM landing_page_automation_rules
           WHERE user_id = $1 AND landing_page_id = $2
           ORDER BY created_at DESC`,
          [userId, landingPageId]
        );
        return result.rows;
      } catch (error) {
        console.error('❌ Error listing automation rules:', error.message);
        throw error;
      }
    },

    async createLandingPageAutomationRule(data) {
      try {
        const result = await pool.query(
          `INSERT INTO landing_page_automation_rules
           (landing_page_id, user_id, rule_type, name, is_enabled, condition_json, action_json, frequency)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING *`,
          [
            data.landingPageId,
            data.userId,
            data.ruleType,
            data.name,
            data.isEnabled ?? true,
            JSON.stringify(data.conditionJson ?? {}),
            JSON.stringify(data.actionJson ?? {}),
            data.frequency ?? null,
          ]
        );
        return result.rows[0];
      } catch (error) {
        console.error('❌ Error creating automation rule:', error.message);
        throw error;
      }
    },

    async updateLandingPageAutomationRule(ruleId, data) {
      try {
        const fields = [];
        const values = [];
        let idx = 1;

        if (data.name !== undefined) { fields.push(`name = $${idx++}`); values.push(data.name); }
        if (data.isEnabled !== undefined) { fields.push(`is_enabled = $${idx++}`); values.push(data.isEnabled); }
        if (data.conditionJson !== undefined) { fields.push(`condition_json = $${idx++}`); values.push(JSON.stringify(data.conditionJson)); }
        if (data.actionJson !== undefined) { fields.push(`action_json = $${idx++}`); values.push(JSON.stringify(data.actionJson)); }
        if (data.frequency !== undefined) { fields.push(`frequency = $${idx++}`); values.push(data.frequency); }
        if (data.lastEvaluatedAt !== undefined) { fields.push(`last_evaluated_at = $${idx++}`); values.push(data.lastEvaluatedAt); }
        if (data.lastTriggeredAt !== undefined) { fields.push(`last_triggered_at = $${idx++}`); values.push(data.lastTriggeredAt); }

        if (fields.length === 0) return null;

        fields.push(`updated_at = now()`);
        values.push(ruleId);

        const result = await pool.query(
          `UPDATE landing_page_automation_rules SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
          values
        );
        return result.rows[0] || null;
      } catch (error) {
        console.error('❌ Error updating automation rule:', error.message);
        throw error;
      }
    },

    async deleteLandingPageAutomationRule(ruleId) {
      try {
        const result = await pool.query(
          `DELETE FROM landing_page_automation_rules WHERE id = $1 RETURNING *`,
          [ruleId]
        );
        return result.rows[0] || null;
      } catch (error) {
        console.error('❌ Error deleting automation rule:', error.message);
        throw error;
      }
    },

    // ── Phase 6: Landing Page Automation Events ───────────────────

    async listLandingPageAutomationEvents(userId, landingPageId, limit = 50) {
      try {
        const result = await pool.query(
          `SELECT * FROM landing_page_automation_events
           WHERE user_id = $1 AND landing_page_id = $2
           ORDER BY occurred_at DESC
           LIMIT $3`,
          [userId, landingPageId, limit]
        );
        return result.rows;
      } catch (error) {
        console.error('❌ Error listing automation events:', error.message);
        throw error;
      }
    },

    async createLandingPageAutomationEvent(data) {
      try {
        const result = await pool.query(
          `INSERT INTO landing_page_automation_events
           (landing_page_id, user_id, automation_rule_id, event_type, event_status, summary, detail_json)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [
            data.landingPageId,
            data.userId,
            data.automationRuleId ?? null,
            data.eventType,
            data.eventStatus ?? 'info',
            data.summary,
            JSON.stringify(data.detailJson ?? {}),
          ]
        );
        return result.rows[0];
      } catch (error) {
        console.error('❌ Error creating automation event:', error.message);
        throw error;
      }
    },

    // ── Phase 6: Landing Page Scheduled Actions ───────────────────

    async listLandingPageScheduledActions(userId, landingPageId) {
      try {
        const result = await pool.query(
          `SELECT * FROM landing_page_scheduled_actions
           WHERE user_id = $1 AND landing_page_id = $2
           ORDER BY scheduled_for ASC`,
          [userId, landingPageId]
        );
        return result.rows;
      } catch (error) {
        console.error('❌ Error listing scheduled actions:', error.message);
        throw error;
      }
    },

    async createLandingPageScheduledAction(data) {
      try {
        const result = await pool.query(
          `INSERT INTO landing_page_scheduled_actions
           (landing_page_id, user_id, action_type, action_payload, scheduled_for, status)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [
            data.landingPageId,
            data.userId,
            data.actionType,
            JSON.stringify(data.actionPayload ?? {}),
            data.scheduledFor,
            data.status ?? 'pending',
          ]
        );
        return result.rows[0];
      } catch (error) {
        console.error('❌ Error creating scheduled action:', error.message);
        throw error;
      }
    },

    async updateLandingPageScheduledAction(actionId, data) {
      try {
        const fields = [];
        const values = [];
        let idx = 1;

        if (data.status !== undefined) { fields.push(`status = $${idx++}`); values.push(data.status); }
        if (data.executedAt !== undefined) { fields.push(`executed_at = $${idx++}`); values.push(data.executedAt); }

        if (fields.length === 0) return null;

        values.push(actionId);

        const result = await pool.query(
          `UPDATE landing_page_scheduled_actions SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
          values
        );
        return result.rows[0] || null;
      } catch (error) {
        console.error('❌ Error updating scheduled action:', error.message);
        throw error;
      }
    },

    async getDueLandingPageScheduledActions() {
      try {
        const result = await pool.query(
          `SELECT * FROM landing_page_scheduled_actions
           WHERE status = 'pending' AND scheduled_for <= now()
           ORDER BY scheduled_for ASC
           LIMIT 100`
        );
        return result.rows;
      } catch (error) {
        console.error('❌ Error fetching due scheduled actions:', error.message);
        throw error;
      }
    },

    // ── Phase 7: Landing Page Executions ──────────────────────────────────

    async listLandingPageExecutions(landingPageId, { status, approvalStatus, limit = 50, offset = 0 } = {}) {
      try {
        const conditions = ['landing_page_id = $1'];
        const values = [landingPageId];
        let idx = 2;

        if (status) { conditions.push(`execution_status = $${idx++}`); values.push(status); }
        if (approvalStatus) { conditions.push(`approval_status = $${idx++}`); values.push(approvalStatus); }

        values.push(limit, offset);
        const result = await pool.query(
          `SELECT * FROM landing_page_executions
           WHERE ${conditions.join(' AND ')}
           ORDER BY created_at DESC
           LIMIT $${idx++} OFFSET $${idx}`,
          values
        );
        return result.rows;
      } catch (error) {
        console.error('❌ Error listing executions:', error.message);
        throw error;
      }
    },

    async getLandingPageExecution(executionId) {
      try {
        const result = await pool.query(
          'SELECT * FROM landing_page_executions WHERE id = $1',
          [executionId]
        );
        return result.rows[0] || null;
      } catch (error) {
        console.error('❌ Error getting execution:', error.message);
        throw error;
      }
    },

    async createLandingPageExecution(data) {
      try {
        const result = await pool.query(
          `INSERT INTO landing_page_executions
           (landing_page_id, user_id, automation_rule_id, source_event_id,
            execution_type, execution_status, approval_status, is_auto_executable,
            requested_payload, queued_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
           RETURNING *`,
          [
            data.landingPageId,
            data.userId,
            data.automationRuleId || null,
            data.sourceEventId || null,
            data.executionType,
            data.approvalStatus === 'not_required' ? 'queued' : 'awaiting_approval',
            data.approvalStatus || 'not_required',
            data.isAutoExecutable || false,
            JSON.stringify(data.requestedPayload || {}),
          ]
        );
        return result.rows[0];
      } catch (error) {
        console.error('❌ Error creating execution:', error.message);
        throw error;
      }
    },

    async updateLandingPageExecutionStatus(executionId, data) {
      try {
        const fields = [];
        const values = [];
        let idx = 1;

        if (data.executionStatus !== undefined) { fields.push(`execution_status = $${idx++}`); values.push(data.executionStatus); }
        if (data.approvalStatus !== undefined) { fields.push(`approval_status = $${idx++}`); values.push(data.approvalStatus); }
        if (data.executionPayload !== undefined) { fields.push(`execution_payload = $${idx++}`); values.push(JSON.stringify(data.executionPayload)); }
        if (data.resultJson !== undefined) { fields.push(`result_json = $${idx++}`); values.push(JSON.stringify(data.resultJson)); }
        if (data.errorMessage !== undefined) { fields.push(`error_message = $${idx++}`); values.push(data.errorMessage); }
        if (data.executedAt !== undefined) { fields.push(`executed_at = $${idx++}`); values.push(data.executedAt); }
        if (data.completedAt !== undefined) { fields.push(`completed_at = $${idx++}`); values.push(data.completedAt); }
        if (data.failedAt !== undefined) { fields.push(`failed_at = $${idx++}`); values.push(data.failedAt); }
        if (data.approvedAt !== undefined) { fields.push(`approved_at = $${idx++}`); values.push(data.approvedAt); }
        if (data.approvedBy !== undefined) { fields.push(`approved_by = $${idx++}`); values.push(data.approvedBy); }
        if (data.rejectedAt !== undefined) { fields.push(`rejected_at = $${idx++}`); values.push(data.rejectedAt); }
        if (data.rejectedBy !== undefined) { fields.push(`rejected_by = $${idx++}`); values.push(data.rejectedBy); }
        if (data.retryCount !== undefined) { fields.push(`retry_count = $${idx++}`); values.push(data.retryCount); }

        if (fields.length === 0) return null;

        fields.push('updated_at = now()');
        values.push(executionId);

        const result = await pool.query(
          `UPDATE landing_page_executions SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
          values
        );
        return result.rows[0] || null;
      } catch (error) {
        console.error('❌ Error updating execution status:', error.message);
        throw error;
      }
    },

    async getLandingPageExecutionQueueSummary(landingPageId) {
      try {
        const result = await pool.query(
          `SELECT
             COUNT(*) AS total_count,
             COUNT(*) FILTER (WHERE execution_status = 'pending') AS pending_count,
             COUNT(*) FILTER (WHERE execution_status = 'awaiting_approval') AS awaiting_approval_count,
             COUNT(*) FILTER (WHERE execution_status = 'running') AS running_count,
             COUNT(*) FILTER (WHERE execution_status = 'completed') AS completed_count,
             COUNT(*) FILTER (WHERE execution_status = 'failed') AS failed_count,
             COUNT(*) FILTER (WHERE execution_status = 'rejected') AS rejected_count
           FROM landing_page_executions
           WHERE landing_page_id = $1`,
          [landingPageId]
        );
        return result.rows[0] || {
          total_count: 0, pending_count: 0, awaiting_approval_count: 0,
          running_count: 0, completed_count: 0, failed_count: 0, rejected_count: 0,
        };
      } catch (error) {
        console.error('❌ Error getting execution queue summary:', error.message);
        throw error;
      }
    },

    async getRunnableLandingPageExecutions(limit = 10) {
      try {
        const result = await pool.query(
          `SELECT * FROM landing_page_executions
           WHERE execution_status = 'queued'
             AND (approval_status = 'not_required' OR approval_status = 'approved')
           ORDER BY queued_at ASC
           LIMIT $1`,
          [limit]
        );
        return result.rows;
      } catch (error) {
        console.error('❌ Error getting runnable executions:', error.message);
        throw error;
      }
    },

    async getAwaitingApprovalExecutions(userId, limit = 50) {
      try {
        const result = await pool.query(
          `SELECT e.* FROM landing_page_executions e
           JOIN landing_pages lp ON lp.id = e.landing_page_id
           WHERE e.execution_status = 'awaiting_approval'
             AND lp.user_id = $1
           ORDER BY e.created_at DESC
           LIMIT $2`,
          [userId, limit]
        );
        return result.rows;
      } catch (error) {
        console.error('❌ Error getting awaiting-approval executions:', error.message);
        throw error;
      }
    },

    // ── Phase 7: Landing Page Execution Settings ──────────────────────────

    async getLandingPageExecutionSettings(userId, landingPageId = null) {
      try {
        let result;
        if (landingPageId) {
          result = await pool.query(
            'SELECT * FROM landing_page_execution_settings WHERE user_id = $1 AND landing_page_id = $2',
            [userId, landingPageId]
          );
        } else {
          result = await pool.query(
            'SELECT * FROM landing_page_execution_settings WHERE user_id = $1 AND landing_page_id IS NULL',
            [userId]
          );
        }
        return result.rows[0] || null;
      } catch (error) {
        console.error('❌ Error getting execution settings:', error.message);
        throw error;
      }
    },

    async upsertLandingPageExecutionSettings(userId, landingPageId, data) {
      try {
        const result = await pool.query(
          `INSERT INTO landing_page_execution_settings
           (user_id, landing_page_id, auto_execute_safe_actions,
            require_approval_for_content_changes, require_approval_for_crm_pushes,
            require_approval_for_variant_creation)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (user_id, landing_page_id)
           DO UPDATE SET
             auto_execute_safe_actions = COALESCE($3, landing_page_execution_settings.auto_execute_safe_actions),
             require_approval_for_content_changes = COALESCE($4, landing_page_execution_settings.require_approval_for_content_changes),
             require_approval_for_crm_pushes = COALESCE($5, landing_page_execution_settings.require_approval_for_crm_pushes),
             require_approval_for_variant_creation = COALESCE($6, landing_page_execution_settings.require_approval_for_variant_creation),
             updated_at = now()
           RETURNING *`,
          [
            userId,
            landingPageId || null,
            data.autoExecuteSafeActions ?? false,
            data.requireApprovalForContentChanges ?? true,
            data.requireApprovalForCrmPushes ?? true,
            data.requireApprovalForVariantCreation ?? true,
          ]
        );
        return result.rows[0];
      } catch (error) {
        console.error('❌ Error upserting execution settings:', error.message);
        throw error;
      }
    }
  };
}

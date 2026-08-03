/**
 * Enhanced Questionnaire Service
 * Comprehensive implementation addressing all questionnaire issues
 */

const { sql } = require('../lib/db');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Email configuration
const createTransporter = () => {
  // Use JSON transport for tests or when explicitly requested
  const useJson = process.env.EMAIL_TRANSPORT === 'json' || process.env.NODE_ENV === 'test';

  // If SMTP creds missing, fall back to json transport to avoid runtime failures
  const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASSWORD;
  const hasSmtp = !!(process.env.SMTP_HOST && process.env.SMTP_USER && smtpPass);

  if (useJson || !hasSmtp) {
    return nodemailer.createTransport({ jsonTransport: true });
  }

  const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || (secure ? 465 : 587),
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: smtpPass,
    },
  });
};

async function sendWithRetry(transporter, mailOptions, retries = 2) {
  let attempt = 0;
  while (true) {
    try {
      return await transporter.sendMail(mailOptions);
    } catch (err) {
      attempt++;
      if (attempt > retries) throw err;
      const backoffMs = 250 * attempt;
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }
}

// Helper to optionally map stored client identifier
async function mapClientIdentifier(rawClientId) {
  if (!rawClientId) return rawClientId;
  try {
    const pref = (process.env.QUESTIONNAIRE_CLIENT_ID_COLUMN || '').toLowerCase();
    if (!pref) return rawClientId;
    const rows = await sql(
      `SELECT id::text AS crm_uuid, COALESCE(client_id::text, '') AS external_id FROM crm_clients 
       WHERE id::text = $1 OR client_id::text = $1 LIMIT 1`,
      [rawClientId]
    );
    const row = rows?.[0];
    if (!row) return rawClientId;
    if (pref === 'client_id' && row.external_id) return row.external_id;
    if (pref === 'id' && row.crm_uuid) return row.crm_uuid;
    return rawClientId;
  } catch (e) {
    return rawClientId;
  }
}

class QuestionnaireService {
  constructor(deps = {}) {
    this.sql = deps.sql || sql;
    this.createTransporter = deps.createTransporter || createTransporter;
    this._colCache = {};
  }

  async ensureSchema() {
    try {
      // Ensure extension for UUIDs
      await this.sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
      // Questionnaires master
      await this.sql`
        CREATE TABLE IF NOT EXISTS questionnaires (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          slug text UNIQUE,
          title text NOT NULL,
          description text,
          fields jsonb NOT NULL DEFAULT '[]'::jsonb,
          is_active boolean DEFAULT true,
          notify_email text,
          created_at timestamptz DEFAULT now()
        )`;
      // Links (use text for foreigns to avoid type operator issues across installs)
      await this.sql`
        CREATE TABLE IF NOT EXISTS questionnaire_links (
          token text PRIMARY KEY,
          questionnaire_id text,
          template_id text,
          client_id text,
          expires_at timestamptz,
          is_used boolean DEFAULT false,
          created_at timestamptz DEFAULT now()
        )`;
      // Responses
      await this.sql`
        CREATE TABLE IF NOT EXISTS questionnaire_responses (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          questionnaire_id text,
          client_id text,
          token text,
          answers jsonb,
          client_name text,
          client_email text,
          submitted_at timestamptz DEFAULT now()
        )`;
      // Helpful indexes
      await this.sql`CREATE INDEX IF NOT EXISTS idx_q_links_client ON questionnaire_links((client_id))`;
      await this.sql`CREATE INDEX IF NOT EXISTS idx_q_resp_client ON questionnaire_responses((client_id))`;
      await this.sql`CREATE INDEX IF NOT EXISTS idx_q_resp_token ON questionnaire_responses((token))`;
    } catch (e) {
      // best-effort; do not throw to avoid breaking endpoints on restricted roles
      console.warn('⚠️ questionnaire ensureSchema:', e.message);
    }
  }

  async tableHasColumn(table, column) {
    const key = `${table}.${column}`;
    if (this._colCache[key] !== undefined) return this._colCache[key];
    try {
      const rows = await this.sql(
        `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2 LIMIT 1`,
        [table, column]
      );
      const exists = !!rows?.length;
      this._colCache[key] = exists;
      return exists;
    } catch {
      this._colCache[key] = false;
      return false;
    }
  }

  async ensureQuestionnaireFromSurvey(surveyId) {
    if (!surveyId) return null;
    // Try find questionnaire with same id first
    const existing = await this.sql`SELECT * FROM questionnaires WHERE id::text = ${surveyId}::text LIMIT 1`;
    if (existing.length) return existing[0];
    // Load survey and convert to questionnaire
    const surveys = await this.sql`SELECT * FROM surveys WHERE id::text = ${surveyId}::text LIMIT 1`;
    if (!surveys.length) return null;
    const s = surveys[0];
    // Convert survey.pages[0].questions to fields
    let fields = [];
    try {
      const pages = s.pages || [];
      const first = Array.isArray(pages) ? pages[0] : null;
      const qs = (first && first.questions) || [];
      fields = qs.map((q, idx) => ({
        key: String(q.id || `q${idx + 1}`),
        label: String(q.title || q.text || `Question ${idx + 1}`),
        type: (q.type === 'textarea' ? 'textarea' : (q.type === 'number' ? 'number' : (q.type === 'email' ? 'email' : (q.type === 'radio' ? 'radio' : (q.type === 'select' ? 'select' : 'text'))))),
        required: !!q.required
      }));
    } catch {}
    const desc = s.description || null;
    const notifyEmail = s.notify_email || s.notifyEmail || null;
    const inserted = await this.sql`
      INSERT INTO questionnaires (title, slug, description, fields, is_active, notify_email)
      VALUES (${s.title || 'Survey'}, ${crypto.randomUUID().replace(/-/g,'').slice(0,10)}, ${desc}, ${JSON.stringify(fields)}, true, ${notifyEmail})
      RETURNING *
    `;
    return inserted[0];
  }
  
  /**
   * Create a questionnaire link with proper token generation and BASE_URL handling
   */
  async createQuestionnaireLink(clientId, questionnaireId = null, expiryDays = 30) {
    try {
      await this.ensureSchema();
      // Generate secure token
      const token = crypto.randomBytes(32).toString('hex');
      
      // Get or create default questionnaire
      let questionnaire;
      if (questionnaireId) {
        const result = await this.sql`SELECT * FROM questionnaires WHERE id::text = ${questionnaireId}::text AND is_active = true LIMIT 1`;
        questionnaire = result[0];
        if (!questionnaire) {
          // Try to convert from surveys table
          questionnaire = await this.ensureQuestionnaireFromSurvey(questionnaireId);
        }
      }
      
      if (!questionnaire) {
        // Get default questionnaire
        const result = await this.sql`SELECT * FROM questionnaires WHERE is_active = true ORDER BY created_at ASC LIMIT 1`;
        questionnaire = result[0];
        
        if (!questionnaire) {
          // create a sensible default to avoid 404s on fresh databases
          const fields = [
            { key: 'sessionType', label: 'Type of photoshoot', type: 'select', options: ['Family','Maternity','Newborn','Business'] },
            { key: 'preferredDate', label: 'Preferred date', type: 'text' },
            { key: 'notes', label: 'Anything we should know?', type: 'textarea' }
          ];
          const inserted = await this.sql`
            INSERT INTO questionnaires (slug, title, description, fields, is_active)
            VALUES (${crypto.randomUUID().replace(/-/g,'').slice(0,10)}, ${'Photography Preferences'}, ${'Help us prepare for your perfect photoshoot'}, ${JSON.stringify(fields)}, true)
            RETURNING *
          `;
          questionnaire = inserted[0];
        }
      }
      
      // Calculate expiry
      const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
      
      // Store the link in database (support legacy template_id column)
      const hasQuestionnaireId = await this.tableHasColumn('questionnaire_links', 'questionnaire_id');
      const hasTemplateId = await this.tableHasColumn('questionnaire_links', 'template_id');
      if (hasQuestionnaireId) {
        await this.sql`
          INSERT INTO questionnaire_links (
            token, questionnaire_id, client_id, expires_at, is_used, created_at
          ) VALUES (
            ${token}, ${questionnaire.id}, ${clientId}, ${expiresAt}, false, NOW()
          )
        `;
      } else if (hasTemplateId) {
        await this.sql`
          INSERT INTO questionnaire_links (
            token, template_id, client_id, expires_at, is_used, created_at
          ) VALUES (
            ${token}, ${questionnaire.id}, ${clientId}, ${expiresAt}, false, NOW()
          )
        `;
      } else {
        // Fallback assume questionnaire_id
        await this.sql`
          INSERT INTO questionnaire_links (
            token, questionnaire_id, client_id, expires_at, is_used, created_at
          ) VALUES (
            ${token}, ${questionnaire.id}, ${clientId}, ${expiresAt}, false, NOW()
          )
        `;
      }
      
      // Generate proper link with BASE_URL
  const baseUrl = process.env.APP_BASE_URL || process.env.APP_URL || process.env.VERCEL_URL || 'https://www.newagefotografie.com';
      const link = `${baseUrl}/q/${token}`;
      
      console.log('✅ Questionnaire link created:', { clientId, token, link });
      
      return {
        success: true,
        token,
        link,
        questionnaire_id: questionnaire.id,
        expires_at: expiresAt.toISOString()
      };
      
    } catch (error) {
      console.error('❌ Create questionnaire link error:', error);
      throw error;
    }
  }
  
  /**
   * Get questionnaire by token with proper validation
   */
  async getQuestionnaireByToken(token) {
    try {
      await this.ensureSchema();
      // Get questionnaire link with questionnaire data
      // Use a safe join that does not reference missing template_id on installs
      let result = await this.sql`
        SELECT 
          ql.token,
          ql.client_id,
          ql.is_used,
          ql.expires_at,
          q.id as questionnaire_id,
          q.title,
          q.fields,
          q.is_active,
          c.first_name as client_first_name,
          c.last_name as client_last_name,
          c.email as client_email
        FROM questionnaire_links ql
        JOIN questionnaires q ON q.id::text = ql.questionnaire_id::text
        LEFT JOIN crm_clients c ON (c.id::text = ql.client_id::text OR c.client_id::text = ql.client_id::text)
        WHERE ql.token = ${token}
        LIMIT 1
      `;
      if (!result.length) {
        // Fallback: some databases used template_id only
        try {
          result = await this.sql`
            SELECT 
              ql.token,
              ql.client_id,
              ql.is_used,
              ql.expires_at,
              q.id as questionnaire_id,
              q.title,
              q.fields,
              q.is_active,
              c.first_name as client_first_name,
              c.last_name as client_last_name,
              c.email as client_email
            FROM questionnaire_links ql
            JOIN questionnaires q ON q.id::text = ql.template_id::text
            LEFT JOIN crm_clients c ON (c.id::text = ql.client_id::text OR c.client_id::text = ql.client_id::text)
            WHERE ql.token = ${token}
            LIMIT 1
          `;
        } catch {}
      }
      
      if (result.length === 0) {
        throw new Error('Questionnaire not found');
      }
      
      const data = result[0];
      
      // Check if expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        throw new Error('Questionnaire link has expired');
      }
      
      // Check if already used (optional - you might want to allow resubmission)
      // if (data.is_used) {
      //   throw new Error('Questionnaire link has already been used');
      // }
      
      const clientName = [data.client_first_name, data.client_last_name].filter(Boolean).join(' ').trim();

      return {
        token: data.token,
        questionnaire: {
          id: data.questionnaire_id,
          title: data.title,
          fields: data.fields,
          is_active: data.is_active
        },
        client: {
          id: data.client_id,
          name: clientName || null,
          email: data.client_email || null
        },
        is_used: data.is_used,
        expires_at: data.expires_at
      };
      
    } catch (error) {
      console.error('❌ Get questionnaire by token error:', error);
      throw error;
    }
  }
  
  /**
   * Submit questionnaire response with email notifications
   */
  async submitQuestionnaireResponse(token, answers, clientContact = {}) {
    try {
      await this.ensureSchema();
      // Get questionnaire details first
      const questionnaire = await this.getQuestionnaireByToken(token);
      if (questionnaire.is_used) {
        throw new Error('Questionnaire link has already been used');
      }
      
      // Extract client info from answers or provided contact
      const clientName = clientContact.name || answers.clientName || questionnaire.client?.name || 'Anonymous';
      const clientEmail = clientContact.email || answers.clientEmail || questionnaire.client?.email || null;
      
      // Generate response ID
      const responseId = crypto.randomUUID();
      
      // Map client identifier if requested
  const mappedClientId = await this.mapClientIdentifier(questionnaire.client?.id);

      // Store response in database
      await this.sql`
        INSERT INTO questionnaire_responses (
          id, questionnaire_id, client_id, token, answers, 
          client_name, client_email, submitted_at
        ) VALUES (
          ${responseId}, ${questionnaire.questionnaire.id}, ${mappedClientId}, 
          ${token}, ${JSON.stringify(answers)}, ${clientName}, ${clientEmail}, NOW()
        )
      `;
      
      // Mark link as used
      await this.sql`
        UPDATE questionnaire_links 
        SET is_used = true 
        WHERE token = ${token}
      `;
      
      // Send email notifications
      await this.sendNotificationEmails(questionnaire, answers, clientName, clientEmail);
      
      console.log('✅ Questionnaire response submitted:', { 
        responseId, 
        token, 
        clientName, 
        clientEmail 
      });
      
      return {
        success: true,
        response_id: responseId,
        message: 'Questionnaire submitted successfully'
      };
      
    } catch (error) {
      console.error('❌ Submit questionnaire response error:', error);
      throw error;
    }
  }
  
  /**
   * Send email notifications for questionnaire submission
   */
  async sendNotificationEmails(questionnaire, answers, clientName, clientEmail) {
    try {
  const transporter = this.createTransporter();
      
      // Prepare email content
      const fieldsMap = {};
      if (questionnaire.questionnaire.fields) {
        questionnaire.questionnaire.fields.forEach(field => {
          fieldsMap[field.key] = field.label;
        });
      }
      
      const answersHtml = Object.entries(answers)
        .filter(([key]) => !['clientName', 'clientEmail'].includes(key))
        .map(([key, value]) => {
          const label = fieldsMap[key] || key;
          return `<li><strong>${label}:</strong> ${value}</li>`;
        }).join('');
      
      const answersText = Object.entries(answers)
        .filter(([key]) => !['clientName', 'clientEmail'].includes(key))
        .map(([key, value]) => {
          const label = fieldsMap[key] || key;
          return `- ${label}: ${value}`;
        }).join('\n');
      
      // Studio notification email
      const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.FROM_EMAIL || 'noreply@newagefotografie.com';
      const studioEmailData = {
        from: fromEmail,
        to: process.env.STUDIO_NOTIFY_EMAIL || 'hallo@newagefotografie.com',
        subject: `New Questionnaire Response: ${clientName}`,
        html: `
          <h2>New Questionnaire Response</h2>
          <p><strong>Client:</strong> ${clientName}</p>
          <p><strong>Email:</strong> ${clientEmail || 'Not provided'}</p>
          <p><strong>Questionnaire:</strong> ${questionnaire.questionnaire.title}</p>
          <p><strong>Submitted:</strong> ${new Date().toLocaleString('de-DE')}</p>
          
          <h3>Responses:</h3>
          <ul>${answersHtml}</ul>
          
          <p><em>This questionnaire was submitted via the New Age Fotografie CRM system.</em></p>
        `,
        text: `
New Questionnaire Response

Client: ${clientName}
Email: ${clientEmail || 'Not provided'}
Questionnaire: ${questionnaire.questionnaire.title}
Submitted: ${new Date().toLocaleString('de-DE')}

Responses:
${answersText}

This questionnaire was submitted via the New Age Fotografie CRM system.
        `.trim()
      };
      
  await sendWithRetry(transporter, studioEmailData);
      console.log('📧 Studio notification email sent');
      
      // Client confirmation email (if email provided)
      if (clientEmail) {
        const clientEmailData = {
          from: fromEmail,
          to: clientEmail,
          subject: 'Thank you for your questionnaire response - New Age Fotografie',
          html: `
            <h2>Thank you for your response!</h2>
            <p>Dear ${clientName},</p>
            <p>Thank you for completing our questionnaire. We have received your responses and will review them carefully.</p>
            <p>We will be in touch soon to discuss your perfect photoshoot experience.</p>
            
            <p>Best regards,<br>
            The New Age Fotografie Team</p>
            
            <p><em>This is an automated confirmation email.</em></p>
          `,
          text: `
Thank you for your response!

Dear ${clientName},

Thank you for completing our questionnaire. We have received your responses and will review them carefully.

We will be in touch soon to discuss your perfect photoshoot experience.

Best regards,
The New Age Fotografie Team

This is an automated confirmation email.
          `.trim()
        };
        
        await sendWithRetry(transporter, clientEmailData);
        console.log('📧 Client confirmation email sent');
      }
      
    } catch (error) {
      console.error('❌ Email notification error:', error);
      // Don't throw - email failure shouldn't fail the submission
    }
  }
  
  /**
   * Get questionnaire responses for admin
   */
  async getQuestionnaireResponses(questionnaireId = null, clientId = null, limit = 50, offset = 0) {
    try {
      await this.ensureSchema();
      let query = `
        SELECT 
          qr.*,
          q.title as questionnaire_title,
          (COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')) AS client_name,
          c.email as client_db_email,
          c.client_id as mapped_client_id,
          c.id as crm_client_uuid
        FROM questionnaire_responses qr
        LEFT JOIN questionnaires q ON q.id::text = qr.questionnaire_id::text
        LEFT JOIN crm_clients c ON (c.id::text = qr.client_id::text OR c.client_id::text = qr.client_id::text)
      `;
      
      const conditions = [];
      const params = [];
      
      if (questionnaireId) {
        conditions.push(`qr.questionnaire_id::text = $${params.length + 1}::text`);
        params.push(questionnaireId);
      }
      
      if (clientId) {
        conditions.push(`qr.client_id::text = $${params.length + 1}::text`);
        params.push(clientId);
      }
      
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      query += ` ORDER BY qr.submitted_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);
      
  const result = await this.sql(query, params);
      
      return {
        success: true,
        responses: result,
        total: result.length,
        limit,
        offset
      };
      
    } catch (error) {
      console.error('❌ Get questionnaire responses error:', error);
      throw error;
    }
  }
  
  /**
   * Attach a response to a client manually
   */
  async attachResponseToClient(responseId, clientId) {
    try {
      const result = await this.sql`
        UPDATE questionnaire_responses 
        SET client_id = ${clientId}
        WHERE id = ${responseId}
        RETURNING *
      `;
      
      if (result.length === 0) {
        throw new Error('Response not found');
      }
      
      console.log('✅ Response attached to client:', { responseId, clientId });
      
      return {
        success: true,
        response: result[0]
      };
      
    } catch (error) {
      console.error('❌ Attach response to client error:', error);
      throw error;
    }
  }
}

QuestionnaireService.prototype.mapClientIdentifier = async function(rawClientId) {
  if (!rawClientId) return rawClientId;
  try {
    const pref = (process.env.QUESTIONNAIRE_CLIENT_ID_COLUMN || '').toLowerCase();
    if (!pref) return rawClientId;
    const rows = await this.sql(
      `SELECT id::text AS crm_uuid, COALESCE(client_id::text, '') AS external_id FROM crm_clients 
       WHERE id::text = $1 OR client_id::text = $1 LIMIT 1`,
      [rawClientId]
    );
    const row = rows?.[0];
    if (!row) return rawClientId;
    if (pref === 'client_id' && row.external_id) return row.external_id;
    if (pref === 'id' && row.crm_uuid) return row.crm_uuid;
    return rawClientId;
  } catch (e) {
    return rawClientId;
  }
};

module.exports = { QuestionnaireService };
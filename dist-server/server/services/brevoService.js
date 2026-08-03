"use strict";
/**
 * Brevo (formerly Sendinblue) Service
 * Supports: Email, SMS, and WhatsApp messaging
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrevoService = void 0;
const db_1 = require("../db");
const schema_1 = require("@shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
// Brevo API Base URL
const BREVO_API_URL = 'https://api.brevo.com/v3';
class BrevoService {
    /**
     * Initialize Brevo service
     */
    static initialize() {
        this.apiKey = process.env.BREVO_API_KEY || null;
        if (!this.apiKey) {
            console.warn('⚠️ BREVO_API_KEY not configured. Brevo service will work in demo mode.');
            return false;
        }
        console.log('✅ Brevo service initialized successfully');
        return true;
    }
    /**
     * Check if Brevo is available
     */
    static isAvailable() {
        return !!this.apiKey;
    }
    /**
     * Find client by email address
     */
    static async findClientByEmail(email) {
        try {
            const clients = await db_1.db
                .select()
                .from(schema_1.crmClients)
                .where((0, drizzle_orm_1.ilike)(schema_1.crmClients.email, email))
                .limit(1);
            return clients[0] || null;
        }
        catch (error) {
            console.error('Error finding client by email:', error);
            return null;
        }
    }
    /**
     * Find client by phone number
     */
    static async findClientByPhone(phone) {
        try {
            // Normalize phone number for comparison
            const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '');
            const clients = await db_1.db
                .select()
                .from(schema_1.crmClients)
                .limit(100); // Get all and filter
            // Find client with matching phone
            for (const client of clients) {
                const clientPhone = (client.phone || '').replace(/[\s\-\(\)]/g, '');
                if (clientPhone && (clientPhone.includes(normalizedPhone) || normalizedPhone.includes(clientPhone))) {
                    return client;
                }
            }
            return null;
        }
        catch (error) {
            console.error('Error finding client by phone:', error);
            return null;
        }
    }
    /**
     * Make API request to Brevo
     */
    static async apiRequest(endpoint, method, body) {
        if (!this.apiKey) {
            throw new Error('Brevo API key not configured');
        }
        const response = await fetch(`${BREVO_API_URL}${endpoint}`, {
            method,
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
                'api-key': this.apiKey,
            },
            body: body ? JSON.stringify(body) : undefined,
        });
        const data = await response.json();
        if (!response.ok) {
            console.error('Brevo API error:', data);
            throw new Error(data.message || `Brevo API error: ${response.status}`);
        }
        return data;
    }
    /**
     * Send email via Brevo API
     */
    static async sendEmail(options) {
        try {
            // Initialize if needed
            if (!this.apiKey) {
                this.initialize();
            }
            // Auto-link to client
            let clientId = options.clientId;
            const recipientEmail = Array.isArray(options.to) ? options.to[0] : options.to;
            if (options.autoLinkClient && !clientId) {
                const client = await this.findClientByEmail(recipientEmail);
                if (client) {
                    clientId = client.id;
                    console.log(`📧 Brevo: Auto-linked email to client: ${client.firstName} ${client.lastName}`);
                }
            }
            // Get email settings for signature
            let emailSignature = '';
            try {
                const { storage } = await import('../storage');
                const settings = await storage.getEmailSettings();
                if (settings.signature_enabled && settings.email_signature) {
                    emailSignature = `\n\n--\n${settings.email_signature}`;
                }
            }
            catch (e) {
                // Ignore signature errors
            }
            // Demo mode if API key not available
            if (!this.apiKey) {
                console.log('📧 Brevo Demo: Email would be sent to:', recipientEmail);
                await db_1.db.insert(schema_1.crmMessages).values({
                    senderName: options.senderName || process.env.BUSINESS_NAME || 'New Age Fotografie',
                    senderEmail: options.senderEmail || process.env.SMTP_FROM || 'noreply@newagefotografie.com',
                    recipientEmail: recipientEmail,
                    subject: options.subject,
                    content: options.textContent || options.htmlContent || '',
                    messageType: 'email',
                    status: 'demo_sent',
                    direction: 'outbound',
                    clientId: clientId,
                    emailMessageId: 'brevo_demo_' + Date.now(),
                    sentAt: new Date(),
                });
                return {
                    success: true,
                    messageId: 'brevo_demo_' + Date.now(),
                    clientId: clientId,
                };
            }
            // Prepare recipients
            const recipients = Array.isArray(options.to)
                ? options.to.map(email => ({ email }))
                : [{ email: options.to }];
            // Add signature to content
            const htmlContent = options.htmlContent
                ? options.htmlContent + (emailSignature ? `<br><br>--<br>${emailSignature.replace(/\n/g, '<br>')}` : '')
                : (options.textContent || '').replace(/\n/g, '<br>') + (emailSignature ? `<br><br>--<br>${emailSignature.replace(/\n/g, '<br>')}` : '');
            // Send via Brevo API
            const emailPayload = {
                sender: {
                    name: options.senderName || process.env.BUSINESS_NAME || 'New Age Fotografie',
                    email: options.senderEmail || process.env.SMTP_FROM || 'hallo@newagefotografie.com',
                },
                to: recipients,
                subject: options.subject,
                htmlContent: htmlContent,
            };
            if (options.replyTo) {
                emailPayload.replyTo = { email: options.replyTo };
            }
            if (options.attachments && options.attachments.length > 0) {
                emailPayload.attachment = options.attachments.map(att => ({
                    name: att.name,
                    content: att.content,
                }));
            }
            console.log('📧 Sending email via Brevo to:', recipientEmail);
            const result = await this.apiRequest('/smtp/email', 'POST', emailPayload);
            // Save to database
            await db_1.db.insert(schema_1.crmMessages).values({
                senderName: options.senderName || process.env.BUSINESS_NAME || 'New Age Fotografie',
                senderEmail: options.senderEmail || process.env.SMTP_FROM || 'hallo@newagefotografie.com',
                recipientEmail: recipientEmail,
                subject: options.subject,
                content: options.textContent || options.htmlContent || '',
                messageType: 'email',
                status: 'sent',
                direction: 'outbound',
                clientId: clientId,
                emailMessageId: result.messageId || `brevo_${Date.now()}`,
                sentAt: new Date(),
            });
            console.log(`✅ Brevo: Email sent successfully to ${recipientEmail}`, { messageId: result.messageId });
            return {
                success: true,
                messageId: result.messageId,
                clientId: clientId,
            };
        }
        catch (error) {
            console.error('❌ Brevo email error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    /**
     * Send SMS via Brevo API
     */
    static async sendSms(options) {
        try {
            // Initialize if needed
            if (!this.apiKey) {
                this.initialize();
            }
            // Auto-link to client
            let clientId = options.clientId;
            if (options.autoLinkClient && !clientId) {
                const client = await this.findClientByPhone(options.to);
                if (client) {
                    clientId = client.id;
                    console.log(`📱 Brevo: Auto-linked SMS to client: ${client.firstName} ${client.lastName}`);
                }
            }
            // Demo mode
            if (!this.apiKey) {
                console.log('📱 Brevo Demo: SMS would be sent to:', options.to);
                await db_1.db.insert(schema_1.crmMessages).values({
                    senderName: options.senderName || 'NewAge',
                    senderEmail: '',
                    recipientEmail: options.to,
                    subject: 'SMS',
                    content: options.content,
                    messageType: 'sms',
                    status: 'demo_sent',
                    direction: 'outbound',
                    clientId: clientId,
                    emailMessageId: 'sms_demo_' + Date.now(),
                    sentAt: new Date(),
                });
                return {
                    success: true,
                    messageId: 'sms_demo_' + Date.now(),
                    clientId: clientId,
                };
            }
            // Send via Brevo API
            const smsPayload = {
                type: 'transactional',
                unicodeEnabled: true,
                sender: options.senderName || 'NewAge', // Max 11 alphanumeric chars
                recipient: options.to,
                content: options.content,
            };
            console.log('📱 Sending SMS via Brevo to:', options.to);
            const result = await this.apiRequest('/transactionalSMS/sms', 'POST', smsPayload);
            // Save to database
            await db_1.db.insert(schema_1.crmMessages).values({
                senderName: options.senderName || 'NewAge',
                senderEmail: '',
                recipientEmail: options.to,
                subject: 'SMS',
                content: options.content,
                messageType: 'sms',
                status: 'sent',
                direction: 'outbound',
                clientId: clientId,
                emailMessageId: result.messageId?.toString() || `sms_${Date.now()}`,
                sentAt: new Date(),
            });
            console.log(`✅ Brevo: SMS sent successfully to ${options.to}`, { messageId: result.messageId });
            return {
                success: true,
                messageId: result.messageId?.toString(),
                clientId: clientId,
            };
        }
        catch (error) {
            console.error('❌ Brevo SMS error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    /**
     * Send WhatsApp message via Brevo API
     * Note: Requires WhatsApp Business account and approved templates
     */
    static async sendWhatsApp(options) {
        try {
            // Initialize if needed
            if (!this.apiKey) {
                this.initialize();
            }
            // Auto-link to client
            let clientId = options.clientId;
            if (options.autoLinkClient && !clientId) {
                const client = await this.findClientByPhone(options.to);
                if (client) {
                    clientId = client.id;
                    console.log(`💬 Brevo: Auto-linked WhatsApp to client: ${client.firstName} ${client.lastName}`);
                }
            }
            // Demo mode
            if (!this.apiKey) {
                console.log('💬 Brevo Demo: WhatsApp would be sent to:', options.to);
                await db_1.db.insert(schema_1.crmMessages).values({
                    senderName: 'New Age Fotografie',
                    senderEmail: '',
                    recipientEmail: options.to,
                    subject: 'WhatsApp',
                    content: `Template ID: ${options.templateId}`,
                    messageType: 'whatsapp',
                    status: 'demo_sent',
                    direction: 'outbound',
                    clientId: clientId,
                    emailMessageId: 'whatsapp_demo_' + Date.now(),
                    sentAt: new Date(),
                });
                return {
                    success: true,
                    messageId: 'whatsapp_demo_' + Date.now(),
                    clientId: clientId,
                };
            }
            // Send via Brevo WhatsApp API
            // Note: This uses Brevo's Conversations API for WhatsApp
            const whatsappPayload = {
                senderNumber: process.env.BREVO_WHATSAPP_SENDER || '', // Your WhatsApp Business number
                contactNumbers: [options.to],
                templateId: options.templateId,
                params: options.templateParams || [],
            };
            console.log('💬 Sending WhatsApp via Brevo to:', options.to);
            const result = await this.apiRequest('/whatsapp/sendMessage', 'POST', whatsappPayload);
            // Save to database
            await db_1.db.insert(schema_1.crmMessages).values({
                senderName: 'New Age Fotografie',
                senderEmail: '',
                recipientEmail: options.to,
                subject: 'WhatsApp',
                content: `Template ID: ${options.templateId}`,
                messageType: 'whatsapp',
                status: 'sent',
                direction: 'outbound',
                clientId: clientId,
                emailMessageId: result.messageId || `whatsapp_${Date.now()}`,
                sentAt: new Date(),
            });
            console.log(`✅ Brevo: WhatsApp sent successfully to ${options.to}`);
            return {
                success: true,
                messageId: result.messageId,
                clientId: clientId,
            };
        }
        catch (error) {
            console.error('❌ Brevo WhatsApp error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    /**
     * Get account info and credits
     */
    static async getAccountInfo() {
        try {
            if (!this.apiKey) {
                return { success: false, error: 'API key not configured' };
            }
            const account = await this.apiRequest('/account', 'GET');
            return {
                success: true,
                email: account.email,
                credits: {
                    email: account.plan?.[0]?.credits || 0,
                    sms: account.plan?.[1]?.credits || 0,
                },
                plan: account.plan?.[0]?.type || 'free',
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
}
exports.BrevoService = BrevoService;
BrevoService.apiKey = null;

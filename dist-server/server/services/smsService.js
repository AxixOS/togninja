"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SMSTemplates = exports.SMSService = void 0;
const db_1 = require("../db");
const schema_1 = require("@shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
const node_fetch_1 = __importDefault(require("node-fetch"));
class SMSService {
    /**
     * Initialize SMS service with configuration
     */
    static async initialize() {
        try {
            // First try to get from database
            const configs = await db_1.db.select().from(schema_1.smsConfig).where((0, drizzle_orm_1.eq)(schema_1.smsConfig.isActive, true)).limit(1);
            if (configs.length > 0) {
                this.config = configs[0];
                console.log(`✅ SMS service initialized with ${this.config.provider} from database`);
                return true;
            }
            // If no database config, try environment variables for Vonage
            if (process.env.VONAGE_API_KEY && process.env.VONAGE_API_SECRET) {
                this.config = {
                    provider: 'vonage',
                    apiKey: process.env.VONAGE_API_KEY,
                    apiSecret: process.env.VONAGE_API_SECRET,
                    fromNumber: process.env.VONAGE_PHONE_NUMBER || 'TogNinja CRM',
                    isActive: true
                };
                console.log('✅ SMS service initialized with Vonage from environment variables');
                console.log(`📱 Vonage API Key: ${process.env.VONAGE_API_KEY}`);
                return true;
            }
            console.warn('⚠️ No SMS configuration found - SMS will work in demo mode');
            return false;
        }
        catch (error) {
            console.error('❌ SMS service initialization failed:', error.message);
            console.warn('📱 SMS service will work in demo mode');
            return false;
        }
    }
    /**
     * Send SMS using Twilio
     */
    static async sendViaTwilio(to, content) {
        try {
            const accountSid = this.config.accountSid;
            const authToken = this.config.authToken;
            const fromNumber = this.config.fromNumber;
            const response = await (0, node_fetch_1.default)(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    From: fromNumber,
                    To: to,
                    Body: content,
                }),
            });
            const result = await response.json();
            if (response.ok) {
                return {
                    success: true,
                    messageId: result.sid,
                };
            }
            else {
                throw new Error(result.message || 'Twilio API error');
            }
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    /**
     * Send SMS using Vonage (Nexmo)
     */
    static async sendViaVonage(to, content, messageType = 'sms') {
        try {
            // Use the correct field mapping for Vonage
            const apiKey = this.config.apiKey || this.config.accountSid; // Try apiKey first, fallback to accountSid
            const apiSecret = this.config.apiSecret || this.config.authToken; // Try apiSecret first, fallback to authToken
            const fromNumber = this.config.fromNumber;
            if (messageType === 'whatsapp') {
                // WhatsApp Business API via Vonage
                const response = await (0, node_fetch_1.default)('https://messages-sandbox.nexmo.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64'),
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        from: fromNumber,
                        to: to,
                        message_type: 'text',
                        text: content,
                        channel: 'whatsapp'
                    }),
                });
                const result = await response.json();
                if (response.ok) {
                    return {
                        success: true,
                        messageId: result.message_uuid,
                    };
                }
                else {
                    throw new Error(result.detail || result.title || 'WhatsApp API error');
                }
            }
            else {
                // Standard SMS
                const response = await (0, node_fetch_1.default)('https://rest.nexmo.com/sms/json', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        api_key: apiKey,
                        api_secret: apiSecret,
                        from: fromNumber,
                        to: to.replace(/^\+/, ''), // Remove leading + for Vonage
                        text: content,
                    }),
                });
                const result = await response.json();
                if (result.messages && result.messages[0].status === '0') {
                    return {
                        success: true,
                        messageId: result.messages[0]['message-id'],
                    };
                }
                else {
                    const error = result.messages?.[0]?.['error-text'] || 'SMS API error';
                    throw new Error(error);
                }
            }
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    /**
     * Find client by phone number
     */
    static async findClientByPhone(phone) {
        try {
            // Clean phone number for search
            const cleanPhone = phone.replace(/[^\d+]/g, '');
            const clients = await db_1.db
                .select()
                .from(schema_1.crmClients)
                .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.crmClients.phone, `%${cleanPhone}%`), (0, drizzle_orm_1.ilike)(schema_1.crmClients.phone, `%${cleanPhone.replace('+', '')}%`)))
                .limit(1);
            return clients[0] || null;
        }
        catch (error) {
            console.error('Error finding client by phone:', error);
            return null;
        }
    }
    /**
     * Send individual SMS
     */
    static async sendSMS(options) {
        try {
            if (!this.config) {
                await this.initialize();
                if (!this.config) {
                    throw new Error('SMS service not configured');
                }
            }
            // Auto-link to client if requested
            let clientId = options.clientId;
            if (options.autoLinkClient && !clientId) {
                const client = await this.findClientByPhone(options.to);
                if (client) {
                    clientId = client.id;
                    console.log(`📱 Auto-linked SMS to client: ${client.firstName} ${client.lastName}`);
                }
            }
            // Send SMS/WhatsApp based on provider
            let result;
            const messageType = options.messageType || 'sms';
            switch (this.config.provider) {
                case 'twilio':
                    result = await this.sendViaTwilio(options.to, options.content);
                    break;
                case 'vonage':
                    result = await this.sendViaVonage(options.to, options.content, messageType);
                    break;
                default:
                    throw new Error(`Unsupported SMS provider: ${this.config.provider}`);
            }
            // Save to database
            const messageRecord = await db_1.db.insert(schema_1.crmMessages).values({
                senderName: process.env.BUSINESS_NAME || 'New Age Fotografie',
                senderEmail: process.env.SMTP_FROM || process.env.SMTP_USER || '',
                subject: messageType === 'whatsapp' ? 'WhatsApp Message' : 'SMS Message',
                content: options.content,
                messageType: messageType,
                status: result.success ? 'sent' : 'failed',
                clientId: clientId,
                phoneNumber: options.to,
                smsProvider: this.config.provider,
                smsMessageId: result.messageId,
                smsStatus: result.success ? 'sent' : 'failed',
                campaignId: options.campaignId,
                sentAt: result.success ? new Date() : null,
            }).returning();
            console.log(`${result.success ? '✅' : '❌'} SMS ${result.success ? 'sent' : 'failed'} to ${options.to}`, {
                messageId: result.messageId,
                clientLinked: !!clientId
            });
            return {
                success: result.success,
                messageId: result.messageId,
                clientId: clientId,
                error: result.error,
            };
        }
        catch (error) {
            console.error('❌ Failed to send SMS:', error);
            // Still save failed attempt to database for tracking
            try {
                await db_1.db.insert(schema_1.crmMessages).values({
                    senderName: process.env.BUSINESS_NAME || 'New Age Fotografie',
                    senderEmail: process.env.SMTP_FROM || process.env.SMTP_USER || '',
                    subject: 'SMS Message',
                    content: options.content,
                    messageType: 'sms',
                    status: 'failed',
                    clientId: options.clientId,
                    phoneNumber: options.to,
                    smsProvider: this.config?.provider || 'unknown',
                    campaignId: options.campaignId,
                });
            }
            catch (dbError) {
                console.error('Failed to save failed SMS attempt:', dbError);
            }
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    /**
     * Get target clients for bulk messaging
     */
    static async getTargetClients(options) {
        try {
            let query = db_1.db.select().from(schema_1.crmClients);
            switch (options.targetType) {
                case 'all':
                    // No additional filters
                    break;
                case 'leads':
                    query = query.where((0, drizzle_orm_1.eq)(schema_1.crmClients.status, 'lead'));
                    break;
                case 'clients':
                    query = query.where((0, drizzle_orm_1.eq)(schema_1.crmClients.status, 'active'));
                    break;
                case 'custom':
                    if (options.targetClientIds && options.targetClientIds.length > 0) {
                        query = query.where((0, drizzle_orm_1.inArray)(schema_1.crmClients.id, options.targetClientIds));
                    }
                    break;
                case 'segment':
                    const conditions = [];
                    if (options.targetCriteria?.status) {
                        conditions.push((0, drizzle_orm_1.inArray)(schema_1.crmClients.status, options.targetCriteria.status));
                    }
                    // For spend-based filtering, you'd need to join with invoices/orders
                    // This is a simplified version
                    if (options.targetCriteria?.location) {
                        conditions.push((0, drizzle_orm_1.or)(...options.targetCriteria.location.map(loc => (0, drizzle_orm_1.ilike)(schema_1.crmClients.city, `%${loc}%`))));
                    }
                    if (conditions.length > 0) {
                        query = query.where((0, drizzle_orm_1.and)(...conditions));
                    }
                    break;
            }
            // Only include clients with phone numbers
            // loosen typing for the query so the compiler does not complain about Drizzle generics here
            query = query.where((0, drizzle_orm_1.and)(schema_1.crmClients.phone != null, schema_1.crmClients.phone != ''));
            return await query.execute();
        }
        catch (error) {
            console.error('Error getting target clients:', error);
            return [];
        }
    }
    /**
     * Send bulk SMS campaign
     */
    static async sendBulkSMS(options) {
        try {
            // Get target clients
            const targetClients = await this.getTargetClients(options);
            if (targetClients.length === 0) {
                throw new Error('No target clients found with phone numbers');
            }
            // Create campaign record
            const campaign = await db_1.db.insert(schema_1.messageCampaigns).values({
                name: `SMS Campaign - ${new Date().toISOString().split('T')[0]}`,
                messageType: 'sms',
                content: options.content,
                targetType: options.targetType,
                targetCriteria: options.targetCriteria ? JSON.stringify(options.targetCriteria) : null,
                targetClientIds: options.targetClientIds,
                scheduledAt: options.scheduledAt,
                status: options.scheduledAt ? 'scheduled' : 'sending',
                totalRecipients: targetClients.length,
            }).returning();
            const campaignId = campaign[0].id;
            // If scheduled for later, just save the campaign
            if (options.scheduledAt && options.scheduledAt > new Date()) {
                console.log(`📅 SMS campaign scheduled for ${options.scheduledAt}`);
                return {
                    success: true,
                    campaignId,
                    totalRecipients: targetClients.length,
                    sentCount: 0,
                    failedCount: 0,
                };
            }
            // Send SMS to each client
            let sentCount = 0;
            let failedCount = 0;
            const errors = [];
            console.log(`📱 Starting bulk SMS campaign to ${targetClients.length} clients...`);
            for (const client of targetClients) {
                try {
                    const result = await this.sendSMS({
                        to: client.phone,
                        content: options.content.replace('{name}', client.firstName || 'Kunde'),
                        clientId: client.id,
                        campaignId,
                    });
                    if (result.success) {
                        sentCount++;
                    }
                    else {
                        failedCount++;
                        errors.push(`${client.email}: ${result.error}`);
                    }
                    // Small delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                catch (error) {
                    failedCount++;
                    errors.push(`${client.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }
            // Update campaign results
            await db_1.db
                .update(schema_1.messageCampaigns)
                .set({
                status: 'completed',
                sentCount,
                failedCount,
            })
                .where((0, drizzle_orm_1.eq)(schema_1.messageCampaigns.id, campaignId));
            console.log(`✅ Bulk SMS campaign completed: ${sentCount} sent, ${failedCount} failed`);
            return {
                success: true,
                campaignId,
                totalRecipients: targetClients.length,
                sentCount,
                failedCount,
                errors: errors.length > 0 ? errors : undefined,
            };
        }
        catch (error) {
            console.error('❌ Bulk SMS campaign failed:', error);
            return {
                success: false,
                totalRecipients: 0,
                sentCount: 0,
                failedCount: 0,
                errors: [error instanceof Error ? error.message : 'Unknown error'],
            };
        }
    }
    /**
     * Get SMS history for a specific client
     */
    static async getClientSMSHistory(clientId) {
        try {
            return await db_1.db
                .select()
                .from(schema_1.crmMessages)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.crmMessages.clientId, clientId), (0, drizzle_orm_1.eq)(schema_1.crmMessages.messageType, 'sms')))
                .orderBy(schema_1.crmMessages.createdAt);
        }
        catch (error) {
            console.error('Error fetching client SMS history:', error);
            return [];
        }
    }
    /**
     * Get campaign statistics
     */
    static async getCampaignStats(campaignId) {
        try {
            const campaign = await db_1.db
                .select()
                .from(schema_1.messageCampaigns)
                .where((0, drizzle_orm_1.eq)(schema_1.messageCampaigns.id, campaignId))
                .limit(1);
            if (campaign.length === 0) {
                return null;
            }
            const messages = await db_1.db
                .select()
                .from(schema_1.crmMessages)
                .where((0, drizzle_orm_1.eq)(schema_1.crmMessages.campaignId, campaignId));
            return {
                campaign: campaign[0],
                messages,
                deliveredCount: messages.filter(m => m.smsStatus === 'delivered').length,
            };
        }
        catch (error) {
            console.error('Error fetching campaign stats:', error);
            return null;
        }
    }
}
exports.SMSService = SMSService;
SMSService.config = null;
// SMS templates for common scenarios
exports.SMSTemplates = {
    /**
     * Appointment reminder
     */
    appointmentReminder: (clientName, date, time) => `Hallo ${clientName}! Erinnerung: Ihr Fotoshoot-Termin ist morgen um ${time} am ${date}. Wir freuen uns auf Sie! - New Age Fotografie`,
    /**
     * Booking confirmation
     */
    bookingConfirmation: (clientName, date) => `Hallo ${clientName}! Ihr Fotoshoot-Termin am ${date} ist bestätigt. Details folgen per E-Mail. Freuen uns auf Sie! - New Age Fotografie`,
    /**
     * Gallery ready notification
     */
    galleryReady: (clientName, galleryLink) => `Hallo ${clientName}! Ihre Bilder sind fertig! Schauen Sie hier: ${galleryLink} - New Age Fotografie`,
    /**
     * Special offer
     */
    specialOffer: (clientName, discount) => `Hallo ${clientName}! Exklusiv für Sie: ${discount} auf Ihr nächstes Fotoshoot. Jetzt buchen! - New Age Fotografie`,
    /**
     * Thank you message
     */
    thankYou: (clientName) => `Hallo ${clientName}! Vielen Dank für Ihr Vertrauen. Ihre Bilder sind in Bearbeitung. Freuen uns auf Ihr Feedback! - New Age Fotografie`,
};
exports.default = SMSService;

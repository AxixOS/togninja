"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testEmailConfig = exports.markMessageAsRead = exports.getBulkTargetPreview = exports.updateSMSConfig = exports.getSMSConfig = exports.getAllCommunications = exports.getClientCommunications = exports.sendBulkSMS = exports.sendSMS = exports.sendEmail = void 0;
const enhancedEmailService_1 = __importDefault(require("../services/enhancedEmailService"));
const smsService_1 = __importDefault(require("../services/smsService"));
const db_1 = require("../db");
const schema_1 = require("@shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
/**
 * Send individual email with auto client linking
 */
const sendEmail = async (req, res) => {
    try {
        const { to, subject, content, html, clientId, autoLinkClient = true, attachments } = req.body;
        if (!to || !subject || !content) {
            return res.status(400).json({
                error: 'Missing required fields: to, subject, content'
            });
        }
        // Normalize attachments (convert base64 string -> Buffer)
        let normalizedAttachments = undefined;
        if (Array.isArray(attachments) && attachments.length > 0) {
            try {
                normalizedAttachments = attachments.map((att) => {
                    if (att?.content && typeof att.content === 'string') {
                        // Attempt base64 decode; ignore failures silently
                        try {
                            return {
                                filename: att.filename || att.name || 'attachment',
                                content: Buffer.from(att.content, 'base64'),
                                contentType: att.contentType || att.mimetype || undefined,
                            };
                        }
                        catch {
                            return {
                                filename: att.filename || att.name || 'attachment',
                                content: undefined,
                                contentType: att.contentType || att.mimetype || undefined,
                            };
                        }
                    }
                    return att;
                });
            }
            catch (e) {
                console.warn('Attachment normalization failed, continuing without attachments');
            }
        }
        const result = await enhancedEmailService_1.default.sendEmail({
            to,
            subject,
            content,
            html,
            clientId,
            autoLinkClient,
            attachments: normalizedAttachments,
        });
        res.json(result);
    }
    catch (error) {
        console.error('Send email error:', error);
        res.status(500).json({
            error: 'Failed to send email',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.sendEmail = sendEmail;
/**
 * Send individual SMS with auto client linking
 */
const sendSMS = async (req, res) => {
    try {
        const { to, content, clientId, autoLinkClient = true } = req.body;
        if (!to || !content) {
            return res.status(400).json({
                error: 'Missing required fields: to, content'
            });
        }
        const result = await smsService_1.default.sendSMS({
            to,
            content,
            clientId,
            autoLinkClient,
        });
        res.json(result);
    }
    catch (error) {
        console.error('Send SMS error:', error);
        res.status(500).json({
            error: 'Failed to send SMS',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.sendSMS = sendSMS;
/**
 * Send bulk SMS campaign
 */
const sendBulkSMS = async (req, res) => {
    try {
        const { content, targetType, targetCriteria, targetClientIds, scheduledAt } = req.body;
        if (!content || !targetType) {
            return res.status(400).json({
                error: 'Missing required fields: content, targetType'
            });
        }
        const result = await smsService_1.default.sendBulkSMS({
            content,
            targetType,
            targetCriteria,
            targetClientIds,
            scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        });
        res.json(result);
    }
    catch (error) {
        console.error('Bulk SMS error:', error);
        res.status(500).json({
            error: 'Failed to send bulk SMS',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.sendBulkSMS = sendBulkSMS;
/**
 * Get client communication history
 */
const getClientCommunications = async (req, res) => {
    try {
        const { clientId } = req.params;
        if (!clientId) {
            return res.status(400).json({ error: 'Client ID required' });
        }
        const communications = await db_1.db
            .select()
            .from(schema_1.crmMessages)
            .where((0, drizzle_orm_1.eq)(schema_1.crmMessages.clientId, clientId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.crmMessages.createdAt));
        res.json({ communications });
    }
    catch (error) {
        console.error('Get client communications error:', error);
        res.status(500).json({
            error: 'Failed to fetch communications',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getClientCommunications = getClientCommunications;
/**
 * Get all communications with client info
 */
const getAllCommunications = async (req, res) => {
    try {
        const { limit = 50, messageType } = req.query;
        const baseQuery = db_1.db
            .select({
            id: schema_1.crmMessages.id,
            subject: schema_1.crmMessages.subject,
            content: schema_1.crmMessages.content,
            messageType: schema_1.crmMessages.messageType,
            status: schema_1.crmMessages.status,
            phoneNumber: schema_1.crmMessages.phoneNumber,
            sentAt: schema_1.crmMessages.sentAt,
            createdAt: schema_1.crmMessages.createdAt,
            // Client info
            clientId: schema_1.crmMessages.clientId,
            clientName: schema_1.crmClients.firstName,
            clientLastName: schema_1.crmClients.lastName,
            clientEmail: schema_1.crmClients.email,
            clientPhone: schema_1.crmClients.phone,
        })
            .from(schema_1.crmMessages)
            .leftJoin(schema_1.crmClients, (0, drizzle_orm_1.eq)(schema_1.crmMessages.clientId, schema_1.crmClients.id));
        const filtered = messageType
            ? baseQuery.where((0, drizzle_orm_1.eq)(schema_1.crmMessages.messageType, messageType))
            : baseQuery;
        const communications = await filtered
            .orderBy((0, drizzle_orm_1.desc)(schema_1.crmMessages.createdAt))
            .limit(parseInt(limit));
        res.json({ communications });
    }
    catch (error) {
        console.error('Get all communications error:', error);
        res.status(500).json({
            error: 'Failed to fetch communications',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getAllCommunications = getAllCommunications;
/**
 * Get SMS configuration
 */
const getSMSConfig = async (req, res) => {
    try {
        const config = await db_1.db
            .select()
            .from(schema_1.smsConfig)
            .where((0, drizzle_orm_1.eq)(schema_1.smsConfig.isActive, true))
            .limit(1);
        if (config.length === 0) {
            // No DB config found — check environment variables (Vonage / Twilio)
            if (process.env.VONAGE_API_KEY && process.env.VONAGE_API_SECRET) {
                return res.json({
                    configured: true,
                    provider: 'vonage',
                    fromNumber: process.env.VONAGE_PHONE_NUMBER || 'TogNinja CRM',
                    isActive: true,
                    note: 'Configured via environment variables'
                });
            }
            if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER) {
                return res.json({
                    configured: true,
                    provider: 'twilio',
                    fromNumber: process.env.TWILIO_FROM_NUMBER,
                    isActive: true,
                    note: 'Configured via environment variables'
                });
            }
            return res.json({
                configured: false,
                message: 'SMS not configured'
            });
        }
        // Don't send sensitive data to frontend
        res.json({
            configured: true,
            provider: config[0].provider,
            fromNumber: config[0].fromNumber,
            isActive: config[0].isActive,
        });
    }
    catch (error) {
        console.error('Get SMS config error:', error);
        res.status(500).json({
            error: 'Failed to fetch SMS configuration',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getSMSConfig = getSMSConfig;
/**
 * Update SMS configuration
 */
const updateSMSConfig = async (req, res) => {
    try {
        const { provider, accountSid, authToken, fromNumber, apiKey, apiSecret } = req.body;
        // Validate based on provider
        if (provider === 'vonage') {
            if (!provider || !apiKey || !apiSecret) {
                return res.status(400).json({
                    error: 'Missing required fields for Vonage: provider, apiKey, apiSecret'
                });
            }
        }
        else if (provider === 'twilio') {
            if (!provider || !accountSid || !authToken || !fromNumber) {
                return res.status(400).json({
                    error: 'Missing required fields for Twilio: provider, accountSid, authToken, fromNumber'
                });
            }
        }
        else {
            return res.status(400).json({
                error: 'Unsupported provider. Use "vonage" or "twilio"'
            });
        }
        // Deactivate existing configs
        await db_1.db
            .update(schema_1.smsConfig)
            .set({ isActive: false });
        // Create new config
        const newConfig = await db_1.db
            .insert(schema_1.smsConfig)
            .values({
            provider,
            accountSid: accountSid || null,
            authToken: authToken || null,
            fromNumber: fromNumber || 'TogNinja CRM',
            apiKey: apiKey || null,
            // Handle special "from-env" value for API secret
            apiSecret: apiSecret === 'from-env' ? null : (apiSecret || null),
            isActive: true,
        })
            .returning();
        // Reinitialize SMS service with new config
        await smsService_1.default.initialize();
        res.json({
            success: true,
            message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} configuration updated successfully`,
            config: {
                provider: newConfig[0].provider,
                fromNumber: newConfig[0].fromNumber,
                isActive: newConfig[0].isActive,
                hasApiKey: !!newConfig[0].apiKey,
                hasApiSecret: !!newConfig[0].apiSecret,
            }
        });
    }
    catch (error) {
        console.error('Update SMS config error:', error);
        res.status(500).json({
            error: 'Failed to update SMS configuration',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.updateSMSConfig = updateSMSConfig;
/**
 * Get target preview for bulk messaging
 */
const getBulkTargetPreview = async (req, res) => {
    try {
        const { targetType, targetCriteria, targetClientIds } = req.body;
        if (!targetType) {
            return res.status(400).json({ error: 'Target type required' });
        }
        const targetClients = await smsService_1.default.getTargetClients({
            content: '', // Not needed for preview
            targetType,
            targetCriteria,
            targetClientIds,
        });
        res.json({
            totalRecipients: targetClients.length,
            clients: targetClients.map(client => ({
                id: client.id,
                name: `${client.firstName} ${client.lastName}`,
                email: client.email,
                phone: client.phone,
                status: client.status,
            }))
        });
    }
    catch (error) {
        console.error('Get bulk target preview error:', error);
        res.status(500).json({
            error: 'Failed to get target preview',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getBulkTargetPreview = getBulkTargetPreview;
/**
 * Mark message as read
 */
const markMessageAsRead = async (req, res) => {
    try {
        const { messageId } = req.params;
        await db_1.db
            .update(schema_1.crmMessages)
            .set({
            status: 'read',
            readAt: new Date()
        })
            .where((0, drizzle_orm_1.eq)(schema_1.crmMessages.id, messageId));
        res.json({ success: true });
    }
    catch (error) {
        console.error('Mark message as read error:', error);
        res.status(500).json({
            error: 'Failed to mark message as read',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.markMessageAsRead = markMessageAsRead;
/**
 * Test email configuration
 */
const testEmailConfig = async (req, res) => {
    try {
        const { testEmail } = req.body;
        if (!testEmail) {
            return res.status(400).json({ error: 'Test email address required' });
        }
        const result = await enhancedEmailService_1.default.sendEmail({
            to: testEmail,
            subject: 'Test E-Mail von New Age Fotografie CRM',
            content: 'Dies ist eine Test-E-Mail zur Überprüfung der E-Mail-Konfiguration.',
            autoLinkClient: false,
        });
        res.json(result);
    }
    catch (error) {
        console.error('Test email config error:', error);
        res.status(500).json({
            error: 'Failed to test email configuration',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.testEmailConfig = testEmailConfig;
exports.default = {
    sendEmail: exports.sendEmail,
    sendSMS: exports.sendSMS,
    sendBulkSMS: exports.sendBulkSMS,
    getClientCommunications: exports.getClientCommunications,
    getAllCommunications: exports.getAllCommunications,
    getSMSConfig: exports.getSMSConfig,
    updateSMSConfig: exports.updateSMSConfig,
    getBulkTargetPreview: exports.getBulkTargetPreview,
    markMessageAsRead: exports.markMessageAsRead,
    testEmailConfig: exports.testEmailConfig,
};

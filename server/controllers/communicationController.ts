import { Request, Response } from 'express';
import EnhancedEmailService from '../services/enhancedEmailService';
import SMSService from '../services/smsService';
import { db } from '../db';
import { crmClients, crmMessages, smsConfig } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import { config as configReader } from '../config-reader';
import { getSiteIdentity } from '../lib/siteIdentity';

/**
 * Send individual email with auto client linking
 */
export const sendEmail = async (req: Request, res: Response) => {
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
        normalizedAttachments = attachments.map((att: any) => {
          if (att?.content && typeof att.content === 'string') {
            // Attempt base64 decode; ignore failures silently
            try {
              return {
                filename: att.filename || att.name || 'attachment',
                content: Buffer.from(att.content, 'base64'),
                contentType: att.contentType || att.mimetype || undefined,
              };
            } catch {
              return {
                filename: att.filename || att.name || 'attachment',
                content: undefined,
                contentType: att.contentType || att.mimetype || undefined,
              };
            }
          }
          return att;
        });
      } catch (e) {
        console.warn('Attachment normalization failed, continuing without attachments');
      }
    }

    const result = await EnhancedEmailService.sendEmail({
      to,
      subject,
      content,
      html,
      clientId,
      autoLinkClient,
      attachments: normalizedAttachments,
    });

    res.json(result);

  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ 
      error: 'Failed to send email',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Send individual SMS with auto client linking
 */
export const sendSMS = async (req: Request, res: Response) => {
  try {
    const { to, content, clientId, autoLinkClient = true, messageType } = req.body;

    if (!to || !content) {
      return res.status(400).json({
        error: 'Missing required fields: to, content'
      });
    }

    // Forward the channel — without this, a WhatsApp request was silently sent as SMS.
    const result = await SMSService.sendSMS({
      to,
      content,
      clientId,
      autoLinkClient,
      messageType: messageType === 'whatsapp' ? 'whatsapp' : 'sms',
    });

    res.json(result);

  } catch (error) {
    console.error('Send SMS error:', error);
    res.status(500).json({ 
      error: 'Failed to send SMS',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Send bulk SMS campaign
 */
export const sendBulkSMS = async (req: Request, res: Response) => {
  try {
    const { 
      content, 
      targetType, 
      targetCriteria, 
      targetClientIds, 
      scheduledAt 
    } = req.body;

    if (!content || !targetType) {
      return res.status(400).json({ 
        error: 'Missing required fields: content, targetType' 
      });
    }

    const result = await SMSService.sendBulkSMS({
      content,
      targetType,
      targetCriteria,
      targetClientIds,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
    });

    res.json(result);

  } catch (error) {
    console.error('Bulk SMS error:', error);
    res.status(500).json({ 
      error: 'Failed to send bulk SMS',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get client communication history
 */
export const getClientCommunications = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    if (!clientId) {
      return res.status(400).json({ error: 'Client ID required' });
    }

    const communications = await db
      .select()
      .from(crmMessages)
      .where(eq(crmMessages.clientId, clientId))
      .orderBy(desc(crmMessages.createdAt));

    res.json({ communications });

  } catch (error) {
    console.error('Get client communications error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch communications',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get all communications with client info
 */
export const getAllCommunications = async (req: Request, res: Response) => {
  try {
    const { limit = 50, messageType } = req.query;

    const baseQuery = db
      .select({
        id: crmMessages.id,
        subject: crmMessages.subject,
        content: crmMessages.content,
        messageType: crmMessages.messageType,
        status: crmMessages.status,
        phoneNumber: crmMessages.phoneNumber,
        sentAt: crmMessages.sentAt,
        createdAt: crmMessages.createdAt,
        // Client info
        clientId: crmMessages.clientId,
        clientName: crmClients.firstName,
        clientLastName: crmClients.lastName,
        clientEmail: crmClients.email,
        clientPhone: crmClients.phone,
      })
      .from(crmMessages)
      .leftJoin(crmClients, eq(crmMessages.clientId, crmClients.id));

    const filtered = messageType
      ? baseQuery.where(eq(crmMessages.messageType, messageType as string))
      : baseQuery;

    const communications = await filtered
      .orderBy(desc(crmMessages.createdAt))
      .limit(parseInt(limit as string));

    res.json({ communications });

  } catch (error) {
    console.error('Get all communications error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch communications',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get SMS configuration
 */
export const getSMSConfig = async (req: Request, res: Response) => {
  try {
    const config = await db
      .select()
      .from(smsConfig)
      .where(eq(smsConfig.isActive, true))
      .limit(1);

    if (config.length === 0) {
      // Onboarding-configured provider (studio_integrations via config-reader)
      const siProvider = await configReader.get('sms_provider');
      if (siProvider) {
        return res.json({
          configured: true,
          provider: siProvider,
          fromNumber: (await configReader.get('sms_from_number')) || 'TogNinja CRM',
          isActive: true,
          note: 'Configured via onboarding (studio integrations)'
        });
      }

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

  } catch (error) {
    console.error('Get SMS config error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch SMS configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Update SMS configuration
 */
export const updateSMSConfig = async (req: Request, res: Response) => {
  try {
    const { provider, accountSid, authToken, fromNumber, apiKey, apiSecret } = req.body;

    // Validate based on provider
    if (provider === 'vonage') {
      if (!provider || !apiKey || !apiSecret) {
        return res.status(400).json({ 
          error: 'Missing required fields for Vonage: provider, apiKey, apiSecret' 
        });
      }
    } else if (provider === 'twilio') {
      if (!provider || !accountSid || !authToken || !fromNumber) {
        return res.status(400).json({ 
          error: 'Missing required fields for Twilio: provider, accountSid, authToken, fromNumber' 
        });
      }
    } else {
      return res.status(400).json({ 
        error: 'Unsupported provider. Use "vonage" or "twilio"' 
      });
    }

    // Deactivate existing configs
    await db
      .update(smsConfig)
      .set({ isActive: false });

    // Create new config
    const newConfig = await db
      .insert(smsConfig)
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
    await SMSService.initialize();

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

  } catch (error) {
    console.error('Update SMS config error:', error);
    res.status(500).json({ 
      error: 'Failed to update SMS configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get target preview for bulk messaging
 */
export const getBulkTargetPreview = async (req: Request, res: Response) => {
  try {
    const { targetType, targetCriteria, targetClientIds } = req.body;

    if (!targetType) {
      return res.status(400).json({ error: 'Target type required' });
    }

    const targetClients = await SMSService.getTargetClients({
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

  } catch (error) {
    console.error('Get bulk target preview error:', error);
    res.status(500).json({ 
      error: 'Failed to get target preview',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Mark message as read
 */
export const markMessageAsRead = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;

    await db
      .update(crmMessages)
      .set({ 
        status: 'read',
        readAt: new Date()
      })
      .where(eq(crmMessages.id, messageId));

    res.json({ success: true });

  } catch (error) {
    console.error('Mark message as read error:', error);
    res.status(500).json({ 
      error: 'Failed to mark message as read',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Test email configuration
 */
export const testEmailConfig = async (req: Request, res: Response) => {
  try {
    const { testEmail } = req.body;

    if (!testEmail) {
      return res.status(400).json({ error: 'Test email address required' });
    }

    // A studio testing their own SMTP should get a mail that looks like it came from THEM,
    // in the language they work in. This was hardcoded German and signed with the origin
    // studio's name, so a UK photographer's first test of their mail setup arrived as
    // "Test E-Mail von New Age Fotografie CRM".
    const identity = getSiteIdentity();
    const german = String(identity.lang || 'en').toLowerCase().startsWith('de');

    const result = await EnhancedEmailService.sendEmail({
      to: testEmail,
      subject: german
        ? `Test-E-Mail von ${identity.name}`
        : `Test email from ${identity.name}`,
      content: german
        ? 'Dies ist eine Test-E-Mail zur Überprüfung der E-Mail-Konfiguration.'
        : 'This is a test email, sent to check your email configuration is working.',
      autoLinkClient: false,
    });

    res.json(result);

  } catch (error) {
    console.error('Test email config error:', error);
    res.status(500).json({ 
      error: 'Failed to test email configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export default {
  sendEmail,
  sendSMS,
  sendBulkSMS,
  getClientCommunications,
  getAllCommunications,
  getSMSConfig,
  updateSMSConfig,
  getBulkTargetPreview,
  markMessageAsRead,
  testEmailConfig,
};

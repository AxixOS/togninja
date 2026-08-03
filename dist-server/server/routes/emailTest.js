"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const nodemailer_1 = __importDefault(require("nodemailer"));
const router = (0, express_1.Router)();
// Test email configuration endpoint
router.post('/test', async (req, res) => {
    try {
        const { testEmail } = req.body;
        if (!testEmail) {
            return res.status(400).json({
                success: false,
                error: 'Test email address is required'
            });
        }
        // Create a test transporter (this will test SMTP settings without sending)
        const transporter = nodemailer_1.default.createTransport({
            host: process.env.SMTP_HOST || 'smtp.mail.yahoo.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS || 'demo-password'
            }
        });
        // Verify the connection
        try {
            await transporter.verify();
            // If verification passes, send a test email
            const mailOptions = {
                from: `"${process.env.BUSINESS_NAME || 'New Age Fotografie'}" <${process.env.SMTP_FROM}>`,
                to: testEmail,
                subject: 'Test Email from CRM Communications System',
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #7c3aed;">Email Configuration Test</h1>
            <p>Congratulations! Your SMTP configuration is working correctly.</p>
            <p>This is a test email sent from your CRM communications system.</p>
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #374151; margin-top: 0;">Configuration Details:</h3>
              <ul style="color: #6b7280;">
                <li><strong>SMTP Host:</strong> ${process.env.SMTP_HOST}</li>
                <li><strong>SMTP Port:</strong> ${process.env.SMTP_PORT}</li>
                <li><strong>From Email:</strong> ${process.env.SMTP_FROM}</li>
                <li><strong>Business Name:</strong> ${process.env.BUSINESS_NAME}</li>
                <li><strong>Test Time:</strong> ${new Date().toLocaleString()}</li>
              </ul>
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              You can now use the communications system to send emails and SMS messages that will automatically link to your client records.
            </p>
          </div>
        `
            };
            const result = await transporter.sendMail(mailOptions);
            return res.json({
                success: true,
                message: 'Test email sent successfully',
                messageId: result.messageId,
                config: {
                    host: process.env.SMTP_HOST,
                    port: process.env.SMTP_PORT,
                    from: process.env.SMTP_FROM,
                    businessName: process.env.BUSINESS_NAME
                }
            });
        }
        catch (verifyError) {
            console.error('SMTP verification failed:', verifyError);
            return res.status(400).json({
                success: false,
                error: 'SMTP configuration failed',
                details: verifyError.message,
                suggestions: [
                    'Check your SMTP host and port settings',
                    'Verify your email credentials',
                    'Ensure less secure app access is enabled (for Gmail/Yahoo)',
                    'Use an app-specific password instead of your regular password',
                    'Check if your email provider requires specific SMTP settings'
                ]
            });
        }
    }
    catch (error) {
        console.error('Email test error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to test email configuration',
            details: error.message
        });
    }
});
// Get current email configuration (without sensitive data)
router.get('/config', (req, res) => {
    try {
        const config = {
            host: process.env.SMTP_HOST || 'Not configured',
            port: process.env.SMTP_PORT || 'Not configured',
            from: process.env.SMTP_FROM || 'Not configured',
            businessName: process.env.BUSINESS_NAME || 'Not configured',
            hasCredentials: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
            status: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
                ? 'Configured'
                : 'Incomplete configuration'
        };
        return res.json({
            success: true,
            config
        });
    }
    catch (error) {
        console.error('Config fetch error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch email configuration'
        });
    }
});
exports.default = router;

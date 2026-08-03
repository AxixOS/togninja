import { Router } from 'express';
import { z } from 'zod';
import nodemailer from 'nodemailer';
import { getSmtpTransporter, getFromAddress } from '../utils/smtp-helper';
import { config } from '../config-reader';

const router = Router();

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

  // Create a test transporter using shared smtp-helper (DB first, env fallback)
  const transporter = await getSmtpTransporter();

    // Verify the connection
    try {
      await transporter.verify();
      
      // If verification passes, send a test email
      const mailOptions = {
        from: await getFromAddress(),
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
                <li><strong>From Address:</strong> ${await getFromAddress()}</li>
                <li><strong>Test Time:</strong> ${new Date().toLocaleString()}</li>
              </ul>
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              You can now use the communications system to send emails and SMS messages that will automatically link to your client records.
            </p>
          </div>
        `
      };

  const result = await transporter.sendMail(mailOptions as any);
      
      return res.json({
        success: true,
        message: 'Test email sent successfully',
        messageId: result.messageId,
      });

    } catch (verifyError) {
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

  } catch (error) {
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

  } catch (error) {
    console.error('Config fetch error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch email configuration'
    });
  }
});

export default router;

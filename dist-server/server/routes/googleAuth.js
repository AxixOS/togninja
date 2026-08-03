"use strict";
/**
 * Google Calendar OAuth Authentication Routes
 * Handles user authentication and token management
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const googleapis_1 = require("googleapis");
const db_1 = require("../db");
const schema_1 = require("@shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("../auth");
const router = (0, express_1.Router)();
// Determine the correct redirect URI based on environment
const getRedirectUri = () => {
    // In production, always use the www subdomain
    if (process.env.NODE_ENV === 'production') {
        return 'https://www.newagefotografie.com/api/auth/google/callback';
    }
    // In development, use BASE_URL or localhost
    return `${process.env.BASE_URL || 'http://localhost:3001'}/api/auth/google/callback`;
};
// OAuth2 client setup
const oauth2Client = new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, getRedirectUri());
// Scopes required for calendar access
const SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
];
/**
 * Start OAuth flow - redirect user to Google consent screen
 */
router.get('/google/connect', auth_1.requireAuth, (req, res) => {
    console.log('[GOOGLE-OAUTH] Connect endpoint hit');
    try {
        const userId = req.user?.id;
        console.log('[GOOGLE-OAUTH] User ID:', userId);
        if (!userId) {
            console.log('[GOOGLE-OAUTH] No user ID found');
            return res.status(401).json({ error: 'Not authenticated' });
        }
        console.log('[GOOGLE-OAUTH] Generating auth URL with credentials:', {
            hasClientId: !!process.env.GOOGLE_CLIENT_ID,
            hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
            baseUrl: process.env.BASE_URL
        });
        // Generate authorization URL
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline', // Request refresh token
            scope: SCOPES,
            state: userId.toString(), // Pass user ID through state
            prompt: 'consent', // Force consent screen to get refresh token
        });
        console.log('[GOOGLE-OAUTH] Generated auth URL:', authUrl.substring(0, 100) + '...');
        res.json({ authUrl });
    }
    catch (error) {
        console.error('Error generating auth URL:', error);
        res.status(500).json({ error: 'Failed to generate authorization URL' });
    }
});
/**
 * OAuth callback - exchange code for tokens
 */
router.get('/google/callback', async (req, res) => {
    try {
        const { code, state } = req.query;
        if (!code || typeof code !== 'string') {
            return res.status(400).send('Missing authorization code');
        }
        const userId = state;
        if (!userId) {
            return res.status(400).send('Invalid state parameter');
        }
        // Exchange code for tokens
        const { tokens } = await oauth2Client.getToken(code);
        if (!tokens.refresh_token) {
            return res.status(400).send('No refresh token received. Please disconnect and reconnect.');
        }
        // Set credentials
        oauth2Client.setCredentials(tokens);
        // Get user's primary calendar ID
        const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
        const calendarList = await calendar.calendarList.list();
        const primaryCalendar = calendarList.data.items?.find(cal => cal.primary);
        if (!primaryCalendar) {
            return res.status(400).send('Could not find primary calendar');
        }
        // Save configuration to database
        const existingConfig = await db_1.db
            .select()
            .from(schema_1.calendarSyncSettings)
            .where((0, drizzle_orm_1.eq)(schema_1.calendarSyncSettings.userId, userId))
            .limit(1);
        if (existingConfig.length > 0) {
            // Update existing config
            await db_1.db
                .update(schema_1.calendarSyncSettings)
                .set({
                calendarId: primaryCalendar.id,
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                syncEnabled: true,
                lastSyncAt: null, // Reset last sync
                provider: 'google',
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.calendarSyncSettings.id, existingConfig[0].id));
        }
        else {
            // Create new config
            await db_1.db.insert(schema_1.calendarSyncSettings).values({
                id: crypto.randomUUID(),
                userId,
                provider: 'google',
                calendarId: primaryCalendar.id,
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                syncEnabled: true,
                syncDirection: 'bidirectional',
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }
        // Redirect to success page
        res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Google Calendar Connected</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .card {
              background: white;
              padding: 2rem;
              border-radius: 1rem;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              text-align: center;
              max-width: 400px;
            }
            .success-icon {
              font-size: 4rem;
              margin-bottom: 1rem;
            }
            h1 {
              color: #1a202c;
              margin-bottom: 0.5rem;
            }
            p {
              color: #718096;
              margin-bottom: 1.5rem;
            }
            button {
              background: #667eea;
              color: white;
              border: none;
              padding: 0.75rem 2rem;
              border-radius: 0.5rem;
              font-size: 1rem;
              cursor: pointer;
              transition: background 0.2s;
            }
            button:hover {
              background: #5568d3;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="success-icon">✅</div>
            <h1>Google Calendar Connected!</h1>
            <p>Your Photography CRM is now synced with Google Calendar. Any changes you make in either place will be kept in sync.</p>
            <button onclick="window.close()">Close this window</button>
            <script>
              setTimeout(() => {
                if (window.opener) {
                  window.opener.postMessage({ type: 'GOOGLE_CALENDAR_CONNECTED' }, '*');
                  setTimeout(() => window.close(), 1000);
                }
              }, 2000);
            </script>
          </div>
        </body>
      </html>
    `);
    }
    catch (error) {
        console.error('OAuth callback error:', error);
        // Always return JSON for API requests
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(500).json({ error: 'OAuth callback failed', message: error.message });
        }
        // Otherwise, fallback to HTML for browser
        res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Connection Failed</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: #f7fafc;
            }
            .card {
              background: white;
              padding: 2rem;
              border-radius: 1rem;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              text-align: center;
              max-width: 400px;
            }
            .error-icon {
              font-size: 4rem;
              margin-bottom: 1rem;
            }
            h1 {
              color: #e53e3e;
              margin-bottom: 0.5rem;
            }
            p {
              color: #718096;
              margin-bottom: 1.5rem;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="error-icon">❌</div>
            <h1>Connection Failed</h1>
            <p>${error.message}</p>
            <button onclick="window.close()">Close</button>
          </div>
        </body>
      </html>
    `);
    }
});
/**
 * Get current sync status
 */
router.get('/google/status', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        const config = await db_1.db
            .select()
            .from(schema_1.calendarSyncSettings)
            .where((0, drizzle_orm_1.eq)(schema_1.calendarSyncSettings.userId, userId))
            .limit(1);
        if (config.length === 0) {
            return res.json({ connected: false });
        }
        const userConfig = config[0];
        res.json({
            connected: true,
            syncEnabled: userConfig.syncEnabled,
            calendarId: userConfig.calendarId,
            lastSyncAt: userConfig.lastSyncAt,
        });
    }
    catch (error) {
        console.error('Error getting sync status:', error);
        res.status(500).json({ error: 'Failed to get sync status' });
    }
});
/**
 * Disconnect Google Calendar
 */
router.post('/google/disconnect', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        // Delete configuration
        await db_1.db
            .delete(schema_1.calendarSyncSettings)
            .where((0, drizzle_orm_1.eq)(schema_1.calendarSyncSettings.userId, userId));
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error disconnecting:', error);
        res.status(500).json({ error: 'Failed to disconnect' });
    }
});
/**
 * Toggle sync on/off
 */
router.post('/google/toggle-sync', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { enabled } = req.body;
        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        await db_1.db
            .update(schema_1.calendarSyncSettings)
            .set({ syncEnabled: enabled, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.calendarSyncSettings.userId, userId));
        res.json({ success: true, syncEnabled: enabled });
    }
    catch (error) {
        console.error('Error toggling sync:', error);
        res.status(500).json({ error: 'Failed to toggle sync' });
    }
});
exports.default = router;

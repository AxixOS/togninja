/**
 * Google Calendar OAuth Authentication Routes
 * Handles user authentication and token management
 */

import { Router, Request, Response } from 'express';
import { google } from 'googleapis';
import { db } from '../db';
import { calendarSyncSettings, calendarSyncLogs } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAuth } from '../auth';
import { importGoogleCalendarEvents } from '../services/calendarService';
import { GMAIL_SCOPES, makeOAuthClient, getConnectedEmail, saveGmailConnection, clearGmailConnection, getGmailConnection } from '../services/gmailService';

const router = Router();

// Determine the correct redirect URI based on environment
const getRedirectUri = () => {
  const base = process.env.APP_URL || process.env.BASE_URL || 'http://localhost:3001';
  return `${base}/api/auth/google/callback`;
};

// OAuth2 client setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  getRedirectUri()
);

// Scopes required for calendar access
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
];

/**
 * Start OAuth flow - redirect user to Google consent screen
 */
router.get('/google/connect', requireAuth, (req: Request, res: Response) => {
  console.log('[GOOGLE-OAUTH] Connect endpoint hit');
  try {
  const userId = (req as any).user?.id as string | undefined;
    console.log('[GOOGLE-OAUTH] User ID:', userId);
    
    if (!userId) {
      console.log('[GOOGLE-OAUTH] No user ID found');
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Without credentials generateAuthUrl still returns a URL — with client_id=undefined
    // in it — so the studio is sent to a Google error page instead of being told this
    // instance has no Google app configured. The Gmail branch below already guards this;
    // this one did not.
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(400).json({
        error: 'Google is not configured on this instance (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set). You can skip this and connect Google later.',
      });
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
  } catch (error: any) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

/**
 * Start Gmail OAuth — same shared Google app, Gmail scopes. One-click alternative to
 * Custom SMTP/IMAP (no app password, no enabling IMAP). Reuses the /google/callback URI;
 * the `gmail:` state prefix routes it to the Gmail branch there.
 */
router.get('/google/gmail/connect', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    if (!process.env.GOOGLE_CLIENT_ID) return res.status(400).json({ error: 'Google sign-in is not configured on this instance (GOOGLE_CLIENT_ID missing).' });
    const authUrl = makeOAuthClient().generateAuthUrl({
      access_type: 'offline',
      scope: GMAIL_SCOPES,
      state: `gmail:${userId}`,
      prompt: 'consent',
    });
    res.json({ authUrl });
  } catch (error: any) {
    console.error('[GMAIL-OAUTH] connect error:', error?.message || error);
    res.status(500).json({ error: 'Failed to generate Gmail authorization URL' });
  }
});

router.get('/google/gmail/status', requireAuth, async (_req: Request, res: Response) => {
  const conn = await getGmailConnection();
  res.json({ connected: !!conn, email: conn?.email || null });
});

router.post('/google/gmail/disconnect', requireAuth, async (_req: Request, res: Response) => {
  try { await clearGmailConnection(); res.json({ success: true }); }
  catch { res.status(500).json({ error: 'Failed to disconnect Gmail' }); }
});

/**
 * OAuth callback - exchange code for tokens
 */
router.get('/google/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    if (!code || typeof code !== 'string') {
      return res.status(400).send('Missing authorization code');
    }

    // Gmail branch — state is "gmail:<userId>". Store the mail connection and finish.
    if (typeof state === 'string' && state.startsWith('gmail:')) {
      const gmailAuth = makeOAuthClient();
      const { tokens } = await gmailAuth.getToken(code);
      if (!tokens.refresh_token) return res.status(400).send('No refresh token received. Please disconnect and reconnect.');
      gmailAuth.setCredentials(tokens);
      const email = await getConnectedEmail(gmailAuth);
      await saveGmailConnection(email, tokens.refresh_token);
      try { const { config } = await import('../config-reader'); config.invalidate(); } catch { /* ignore */ }
      try { const { invalidateTransporter } = await import('../utils/smtp-helper'); invalidateTransporter(); } catch { /* ignore */ }
      return res.send(`<!DOCTYPE html><html><head><title>Gmail Connected</title><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:linear-gradient(135deg,#ea4335,#fbbc05)}.card{background:#fff;padding:2rem;border-radius:1rem;box-shadow:0 20px 60px rgba(0,0,0,.3);text-align:center;max-width:400px}</style></head><body><div class="card"><div style="font-size:3rem">✅</div><h1>Gmail Connected</h1><p>${email} is now connected — your inbox will sync and email sends through Gmail. No password needed.</p><button onclick="window.close()">Close</button><script>setTimeout(()=>{if(window.opener){window.opener.postMessage({type:'GMAIL_CONNECTED'},'*');setTimeout(()=>window.close(),800);}},1500);</script></div></body></html>`);
    }

  const userId = state as string;

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
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const calendarList = await calendar.calendarList.list();
    const primaryCalendar = calendarList.data.items?.find(cal => cal.primary);

    if (!primaryCalendar) {
      return res.status(400).send('Could not find primary calendar');
    }

    // Save configuration to database
    // Update THIS user's config
    const existingConfig = await db
      .select()
      .from(calendarSyncSettings)
      .where(eq(calendarSyncSettings.userId, userId))
      .limit(1);

    if (existingConfig.length > 0) {
      // Update existing config
      await db
        .update(calendarSyncSettings)
        .set({
          calendarId: primaryCalendar.id!,
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token!,
          syncEnabled: true,
          lastSyncAt: null, // Reset last sync
          provider: 'google',
          updatedAt: new Date(),
        })
        .where(eq(calendarSyncSettings.id, existingConfig[0].id));
    } else {
      // Create new config
      await db.insert(calendarSyncSettings).values({
        id: crypto.randomUUID(),
        userId,
        provider: 'google',
        calendarId: primaryCalendar.id!,
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token!,
        syncEnabled: true,
        syncDirection: 'bidirectional',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Also update any OTHER sync configs pointing to the same calendar
    // (e.g., multiple admin users sharing the same Google Calendar)
    try {
      const allConfigs = await db.select().from(calendarSyncSettings);
      for (const cfg of allConfigs) {
        if (cfg.userId !== userId && cfg.calendarId === primaryCalendar.id) {
          await db
            .update(calendarSyncSettings)
            .set({
              accessToken: tokens.access_token!,
              refreshToken: tokens.refresh_token!,
              syncEnabled: true,
              updatedAt: new Date(),
            })
            .where(eq(calendarSyncSettings.id, cfg.id));
          console.log(`[GOOGLE-OAUTH] Also refreshed tokens for user ${cfg.userId} (same calendar)`);
        }
      }
    } catch (e) {
      console.warn('[GOOGLE-OAUTH] Could not update other configs:', e);
    }

    // Trigger a full import in the background (don't block the response)
    importGoogleCalendarEvents(undefined, userId)
      .then(result => {
        console.log(`[GOOGLE-OAUTH] Auto-import after reconnection: ${result.imported} imported, ${result.updated} updated, ${result.skipped} skipped`);
      })
      .catch(err => {
        console.error('[GOOGLE-OAUTH] Auto-import failed:', err?.message || err);
      });

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
  } catch (error: any) {
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
router.get('/google/status', requireAuth, async (req: Request, res: Response) => {
  try {
  const userId = (req as any).user?.id as string | undefined;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const config = await db
      .select()
      .from(calendarSyncSettings)
      .where(eq(calendarSyncSettings.userId, userId))
      .limit(1);

    if (config.length === 0) {
      return res.json({ connected: false });
    }

    const userConfig = config[0];

    // Check recent sync logs for invalid_grant errors (most reliable detection)
    let tokenExpired = false;
    try {
      const recentLogs = await db
        .select()
        .from(calendarSyncLogs)
        .where(eq(calendarSyncLogs.syncSettingId, userConfig.id))
        .orderBy(desc(calendarSyncLogs.createdAt))
        .limit(3);

      // If any of the last 3 sync logs contain invalid_grant, tokens are expired
      tokenExpired = recentLogs.some(log => {
        const errors = log.errors as any;
        if (Array.isArray(errors)) {
          return errors.some((e: any) => String(e).includes('invalid_grant'));
        }
        return String(errors || '').includes('invalid_grant');
      });

      if (tokenExpired) {
        console.warn('[Google-Status] Token expired (detected from sync logs) for user', userId);
      }
    } catch (logErr) {
      console.warn('[Google-Status] Could not check sync logs:', logErr);
    }

    // Also try a live API call if sync logs didn't detect expiry
    if (!tokenExpired && userConfig.accessToken && userConfig.refreshToken) {
      try {
        const testClient = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          getRedirectUri()
        );
        testClient.setCredentials({
          access_token: userConfig.accessToken,
          refresh_token: userConfig.refreshToken,
        });

        // Persist refreshed tokens from the test call
        testClient.on('tokens', async (tokens: any) => {
          try {
            const updates: any = { updatedAt: new Date() };
            if (tokens.access_token) updates.accessToken = tokens.access_token;
            if (tokens.refresh_token) updates.refreshToken = tokens.refresh_token;
            await db
              .update(calendarSyncSettings)
              .set(updates)
              .where(eq(calendarSyncSettings.id, userConfig.id));
            console.log('[Google-Status] Refreshed OAuth tokens saved during status check');
          } catch (err) {
            console.warn('[Google-Status] Failed to save refreshed tokens:', err);
          }
        });

        const cal = google.calendar({ version: 'v3', auth: testClient });
        await cal.events.list({
          calendarId: userConfig.calendarId || 'primary',
          maxResults: 1,
          timeMin: new Date().toISOString(),
        });

        // If we got here, token is valid — re-enable sync if it was disabled
        if (!userConfig.syncEnabled) {
          await db
            .update(calendarSyncSettings)
            .set({ syncEnabled: true, updatedAt: new Date() })
            .where(eq(calendarSyncSettings.id, userConfig.id));
          console.log('[Google-Status] Re-enabled sync for user', userId, '(token is valid)');
        }
      } catch (tokenErr: any) {
        const errMsg = String(tokenErr?.message || tokenErr?.response?.data?.error || '');
        if (errMsg.includes('invalid_grant') || errMsg.includes('Token has been expired') || errMsg.includes('Token has been revoked') || errMsg.includes('unauthorized')) {
          tokenExpired = true;
          console.warn('[Google-Status] Token expired (detected from API test) for user', userId, ':', errMsg);
        }
      }
    }

    res.json({
      connected: true,
      tokenExpired,
      syncEnabled: userConfig.syncEnabled,
      calendarId: userConfig.calendarId,
      lastSyncAt: userConfig.lastSyncAt,
      email: userConfig.calendarId,
    });
  } catch (error: any) {
    console.error('Error getting sync status:', error);
    res.status(500).json({ error: 'Failed to get sync status' });
  }
});

/**
 * Disconnect Google Calendar
 */
router.post('/google/disconnect', requireAuth, async (req: Request, res: Response) => {
  try {
  const userId = (req as any).user?.id as string | undefined;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Delete configuration
    await db
      .delete(calendarSyncSettings)
      .where(eq(calendarSyncSettings.userId, userId));

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error disconnecting:', error);
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

/**
 * Toggle sync on/off
 */
router.post('/google/toggle-sync', requireAuth, async (req: Request, res: Response) => {
  try {
  const userId = (req as any).user?.id as string | undefined;
    const { enabled } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    await db
      .update(calendarSyncSettings)
      .set({ syncEnabled: enabled, updatedAt: new Date() })
      .where(eq(calendarSyncSettings.userId, userId));

    res.json({ success: true, syncEnabled: enabled });
  } catch (error: any) {
    console.error('Error toggling sync:', error);
    res.status(500).json({ error: 'Failed to toggle sync' });
  }
});

export default router;

/**
 * Google Calendar 2-Way Sync Service
 * Handles bidirectional synchronization between CRM and Google Calendar
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { randomUUID } from 'node:crypto';
import { db } from '../db';
import { photographySessions, calendarSyncLogs, calendarSyncSettings } from '@shared/schema';
import { eq, and, gte } from 'drizzle-orm';

interface SyncConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  calendarId: string;
  userId: string; // matches calendarSyncSettings.userId (text)
  syncSettingId: string; // FK for logging into calendarSyncLogs
}

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  updated: string;
}

interface CRMSession {
  id: string;
  title: string;
  description?: string;
  sessionType: string;
  startTime: Date | string;
  endTime: Date | string;
  locationName?: string;
  locationAddress?: string;
  googleCalendarEventId?: string;
  externalCalendarSync: boolean;
  updatedAt: Date;
}

export class GoogleCalendarSyncService {
  private oauth2Client: OAuth2Client;
  private calendar: any;
  private config: SyncConfig;

  constructor(config: SyncConfig) {
    this.config = config;
    
    // Initialize OAuth2 client
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      `${process.env.BASE_URL || 'http://localhost:3001'}/api/auth/google/callback`
    );

    // Set refresh token
    this.oauth2Client.setCredentials({
      refresh_token: config.refreshToken,
    });

    // Handle token refresh - persist new tokens to DB when googleapis auto-refreshes
    this.oauth2Client.on('tokens', async (tokens: any) => {
      try {
        const updates: any = { updatedAt: new Date() };
        if (tokens.access_token) updates.accessToken = tokens.access_token;
        if (tokens.refresh_token) updates.refreshToken = tokens.refresh_token;
        await db
          .update(calendarSyncSettings)
          .set(updates)
          .where(eq(calendarSyncSettings.userId, config.userId));
        console.log('[GCalSync] Refreshed OAuth tokens saved to DB');
      } catch (err) {
        console.warn('[GCalSync] Failed to save refreshed tokens:', err);
      }
    });

    // Initialize Calendar API
    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Full bidirectional sync
   */
  async performSync(): Promise<{ success: boolean; imported: number; updated: number; deleted: number; errors: string[] }> {
    const results = {
      success: true,
      imported: 0,
      updated: 0,
      deleted: 0,
      errors: [] as string[],
    };

    try {
      console.log('🔄 Starting 2-way Google Calendar sync...');

      // Step 1: Push local changes to Google
      const pushResults = await this.pushLocalChangesToGoogle();
      results.updated += pushResults.updated;
      results.errors.push(...pushResults.errors);

      // Step 2: Pull Google changes to local
      const pullResults = await this.pullGoogleChangesToLocal();
      results.imported += pullResults.imported;
      results.updated += pullResults.updated;
      results.deleted += pullResults.deleted;
      results.errors.push(...pullResults.errors);

      console.log(`✅ Sync complete: ${results.imported} imported, ${results.updated} updated, ${results.deleted} deleted`);

      // Log sync operation
      await this.logSync('success', results);

    } catch (error: any) {
      console.error('❌ Sync failed:', error);
      results.success = false;
      results.errors.push(error.message);
      await this.logSync('error', results, error.message);
    }

    return results;
  }

  /**
   * Push local CRM sessions to Google Calendar
   */
  private async pushLocalChangesToGoogle(): Promise<{ updated: number; errors: string[] }> {
    const results = { updated: 0, errors: [] as string[] };

    try {
      // Get all sessions that should sync and were modified recently
      const sessions = await db
        .select()
        .from(photographySessions)
        .where(
          and(
            eq(photographySessions.externalCalendarSync, true),
            gte(photographySessions.updatedAt, new Date(Date.now() - 6 * 60 * 1000)) // Last 6 minutes
          )
        ) as any as CRMSession[];

      for (const session of sessions) {
        try {
          if (session.googleCalendarEventId) {
            // Update existing event
            await this.updateGoogleEvent(session as CRMSession);
            results.updated++;
          } else {
            // Create new event
            const eventId = await this.createGoogleEvent(session as CRMSession);
            if (eventId) {
              // Store the Google event ID
              await db
                .update(photographySessions)
                .set({ googleCalendarEventId: eventId })
                .where(eq(photographySessions.id, session.id));
              results.updated++;
            }
          }
        } catch (error: any) {
          console.error(`Error syncing session ${session.id}:`, error.message);
          results.errors.push(`Session ${session.id}: ${error.message}`);
        }
      }
    } catch (error: any) {
      results.errors.push(`Push failed: ${error.message}`);
    }

    return results;
  }

  /**
   * Pull Google Calendar events to local CRM
   */
  private async pullGoogleChangesToLocal(): Promise<{ imported: number; updated: number; deleted: number; errors: string[] }> {
    const results = { imported: 0, updated: 0, deleted: 0, errors: [] as string[] };

    try {
      // Get events modified in the last 6 minutes (covers any changes since last sync)
      const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000);
      // Use a wide time window (1 year back, 2 years ahead) to catch changes to past events too
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const twoYearsAhead = new Date();
      twoYearsAhead.setFullYear(twoYearsAhead.getFullYear() + 2);

      const response = await this.calendar.events.list({
        calendarId: this.config.calendarId,
        timeMin: oneYearAgo.toISOString(),
        timeMax: twoYearsAhead.toISOString(),
        singleEvents: true,
        orderBy: 'updated',
        updatedMin: sixMinutesAgo.toISOString(),
      });

      const events = response.data.items || [];

      for (const event of events) {
        try {
          if (event.status === 'cancelled') {
            // Handle deleted events
            await this.handleDeletedGoogleEvent(event.id);
            results.deleted++;
          } else {
            // Check if event exists locally
            const existingSession = await db
              .select()
              .from(photographySessions)
              .where(eq(photographySessions.googleCalendarEventId, event.id))
              .limit(1);

            if (existingSession.length > 0) {
              // Update existing session
              await this.updateLocalSession(event, existingSession[0]);
              results.updated++;
            } else {
              // Import new session
              await this.importGoogleEvent(event);
              results.imported++;
            }
          }
        } catch (error: any) {
          console.error(`Error processing event ${event.id}:`, error.message);
          results.errors.push(`Event ${event.id}: ${error.message}`);
        }
      }
    } catch (error: any) {
      results.errors.push(`Pull failed: ${error.message}`);
    }

    return results;
  }

  /**
   * Create event in Google Calendar
   */
  private async createGoogleEvent(session: CRMSession): Promise<string | null> {
    try {
      const event = {
        summary: session.title,
        description: session.description || `${session.sessionType} photography session`,
        location: session.locationAddress || session.locationName || '',
        start: {
          dateTime: new Date(session.startTime).toISOString(),
          timeZone: 'Europe/Vienna',
        },
        end: {
          dateTime: new Date(session.endTime).toISOString(),
          timeZone: 'Europe/Vienna',
        },
        colorId: this.getColorForSessionType(session.sessionType),
      };

      const response = await this.calendar.events.insert({
        calendarId: this.config.calendarId,
        resource: event,
      });

      console.log(`✅ Created Google event: ${response.data.id}`);
      return response.data.id;
    } catch (error: any) {
      console.error('Error creating Google event:', error.message);
      throw error;
    }
  }

  /**
   * Update event in Google Calendar
   */
  private async updateGoogleEvent(session: CRMSession): Promise<void> {
    try {
      const event = {
        summary: session.title,
        description: session.description || `${session.sessionType} photography session`,
        location: session.locationAddress || session.locationName || '',
        start: {
          dateTime: new Date(session.startTime).toISOString(),
          timeZone: 'Europe/Vienna',
        },
        end: {
          dateTime: new Date(session.endTime).toISOString(),
          timeZone: 'Europe/Vienna',
        },
        colorId: this.getColorForSessionType(session.sessionType),
      };

      await this.calendar.events.update({
        calendarId: this.config.calendarId,
        eventId: session.googleCalendarEventId,
        resource: event,
      });

      console.log(`✅ Updated Google event: ${session.googleCalendarEventId}`);
    } catch (error: any) {
      console.error('Error updating Google event:', error.message);
      throw error;
    }
  }

  /**
   * Delete event from Google Calendar
   */
  async deleteGoogleEvent(googleEventId: string): Promise<void> {
    try {
      await this.calendar.events.delete({
        calendarId: this.config.calendarId,
        eventId: googleEventId,
      });

      console.log(`✅ Deleted Google event: ${googleEventId}`);
    } catch (error: any) {
      console.error('Error deleting Google event:', error.message);
      throw error;
    }
  }

  /**
   * Import Google Calendar event to CRM
   */
  private async importGoogleEvent(event: GoogleCalendarEvent): Promise<void> {
    try {
      // Parse session type from title or description
      const sessionType = this.parseSessionType(event.summary, event.description);

      await db.insert(photographySessions).values({
        id: randomUUID(),
        title: event.summary || 'Imported Event',
        description: event.description,
        sessionType,
        status: 'confirmed',
        startTime: new Date(event.start?.dateTime || Date.now()),
        endTime: new Date(event.end?.dateTime || (Date.now() + 60 * 60 * 1000)),
        locationName: event.location || null,
        googleCalendarEventId: event.id,
        externalCalendarSync: true,
        depositPaid: false,
        finalPaymentPaid: false,
        paymentStatus: 'pending',
        conflictDetected: false,
        weatherDependent: false,
        goldenHourOptimized: false,
        portfolioWorthy: false,
        editingStatus: 'not_started',
        deliveryStatus: 'pending',
        isRecurring: false,
        reminderSent: false,
        confirmationSent: false,
        followUpSent: false,
        isOnlineBookable: true,
        availabilityStatus: 'booked',
        priority: 'medium',
        isPublic: false,
      } as any);

      console.log(`✅ Imported event: ${event.summary}`);
    } catch (error: any) {
      console.error('Error importing event:', error.message);
      throw error;
    }
  }

  /**
   * Update local CRM session from Google event
   */
  private async updateLocalSession(event: GoogleCalendarEvent, existingSession: any): Promise<void> {
    try {
      // Compare timestamps - only update if Google event is newer
  const googleUpdated = new Date(event.updated);
  const localUpdated = new Date(existingSession.updatedAt);

      if (googleUpdated <= localUpdated) {
        console.log(`⏭️ Skipping update - local is newer: ${event.summary}`);
        return;
      }

      await db
        .update(photographySessions)
        .set({
          title: event.summary || (existingSession as any).title,
          description: event.description,
          startTime: new Date(event.start?.dateTime || (existingSession as any).startTime),
          endTime: new Date(event.end?.dateTime || (existingSession as any).endTime),
          locationName: event.location || (existingSession as any).locationName,
        } as any)
        .where(eq(photographySessions.id, (existingSession as any).id));

      console.log(`✅ Updated session from Google: ${event.summary}`);
    } catch (error: any) {
      console.error('Error updating local session:', error.message);
      throw error;
    }
  }

  /**
   * Handle deleted Google Calendar event
   */
  private async handleDeletedGoogleEvent(googleEventId: string): Promise<void> {
    try {
      const session = await db
        .select()
        .from(photographySessions)
        .where(eq(photographySessions.googleCalendarEventId, googleEventId))
        .limit(1);

      if (session.length > 0) {
        // Option 1: Soft delete by updating status
        await db
          .update(photographySessions)
          .set({ status: 'cancelled' })
          .where(eq(photographySessions.id, session[0].id));

        console.log(`✅ Marked session as cancelled: ${session[0].title}`);
      }
    } catch (error: any) {
      console.error('Error handling deleted event:', error.message);
      throw error;
    }
  }

  /**
   * Get Google Calendar color ID for session type
   */
  private getColorForSessionType(sessionType: string): string {
    const colorMap: Record<string, string> = {
      wedding: '4', // Pink
      portrait: '7', // Blue
      event: '9', // Purple
      commercial: '10', // Green
      family: '5', // Yellow
    };

    return colorMap[sessionType.toLowerCase()] || '1'; // Default lavender
  }

  /**
   * Parse session type from event title/description
   */
  private parseSessionType(title?: string, description?: string): string {
    const text = `${title} ${description}`.toLowerCase();

    if (text.includes('wedding')) return 'wedding';
    if (text.includes('portrait')) return 'portrait';
    if (text.includes('family')) return 'family';
    if (text.includes('event')) return 'event';
    if (text.includes('commercial')) return 'commercial';

    return 'other';
  }

  /**
   * Log sync operation
   */
  private async logSync(status: 'success' | 'error', results: any, errorMessage?: string): Promise<void> {
    try {
      await db.insert(calendarSyncLogs).values({
        id: randomUUID(),
        syncSettingId: this.config.syncSettingId,
        syncType: 'bidirectional',
        status,
        eventsProcessed: (results.imported || 0) + (results.updated || 0) + (results.deleted || 0),
        eventsCreated: results.imported || 0,
        eventsUpdated: results.updated || 0,
        eventsDeleted: results.deleted || 0,
        errors: (errorMessage ? [errorMessage] : (results.errors || [])) as any,
      });
    } catch (error) {
      console.error('Error logging sync:', error);
    }
  }
}

/**
 * Factory function to create sync service for a user
 */
export async function createSyncServiceForUser(userId: string): Promise<GoogleCalendarSyncService | null> {
  try {
    // Get user's Google Calendar sync settings
    const config = await db
      .select()
      .from(calendarSyncSettings)
      .where(and(eq(calendarSyncSettings.userId, userId), eq(calendarSyncSettings.provider, 'google')))
      .limit(1);

    if (config.length === 0 || !config[0].refreshToken || config[0].syncEnabled === false) {
      console.log(`No Google Calendar config found for user ${userId}`);
      return null;
    }

    const userConfig = config[0];

    return new GoogleCalendarSyncService({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      refreshToken: userConfig.refreshToken!,
      calendarId: userConfig.calendarId!,
      userId,
      syncSettingId: userConfig.id!,
    });
  } catch (error) {
    console.error('Error creating sync service:', error);
    return null;
  }
}

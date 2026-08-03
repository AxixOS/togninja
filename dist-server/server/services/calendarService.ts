/**
 * Studio Calendar Service
 * Handles appointment scheduling and Google Calendar integration
 */

import { db } from '../db';
import { studioAppointments, googleCalendarConfig, crmClients, calendarSyncSettings, photographySessions } from '@shared/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { google } from 'googleapis';

/**
 * Import all Google Calendar events (past and future) into the CRM
 * Uses the calendarSyncSettings table for OAuth tokens (set by OAuth flow)
 * This is a standalone function that can be called from routes
 * @param {Date} [fromDate] - Optional: Only import events from this date forward
 * @param {string} [userId] - Optional: User ID to get OAuth tokens for
 * @returns {Promise<{imported: number, updated: number, deleted: number, skipped: number, errors: any[]}>}
 */
export async function importGoogleCalendarEvents(fromDate?: Date, userId?: string): Promise<{imported: number, updated: number, deleted: number, skipped: number, errors: any[]}> {
    // Find an active sync config (if userId provided, filter by it)
    let configs;
    if (userId) {
      configs = await db
        .select()
        .from(calendarSyncSettings)
        .where(and(eq(calendarSyncSettings.userId, userId), eq(calendarSyncSettings.syncEnabled, true)))
        .limit(1);
    } else {
      configs = await db
        .select()
        .from(calendarSyncSettings)
        .where(eq(calendarSyncSettings.syncEnabled, true))
        .limit(1);
    }

    if (configs.length === 0) {
      throw new Error('No Google Calendar sync configured. Please connect your Google Calendar first.');
    }

    const syncConfig = configs[0];
    
    if (!syncConfig.accessToken || !syncConfig.refreshToken) {
      throw new Error('Google Calendar OAuth tokens missing. Please reconnect your Google Calendar.');
    }

    // Initialize OAuth client with tokens from calendarSyncSettings
    const base = process.env.APP_URL || process.env.BASE_URL || 'http://localhost:3001';
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${base}/api/auth/google/callback`
    );

    oauth2Client.setCredentials({
      access_token: syncConfig.accessToken,
      refresh_token: syncConfig.refreshToken,
    });

    // Handle token refresh - persist new tokens to DB when googleapis auto-refreshes
    oauth2Client.on('tokens', async (tokens: any) => {
      try {
        const updates: Record<string, any> = { updatedAt: new Date() };
        if (tokens.access_token) updates.accessToken = tokens.access_token;
        if (tokens.refresh_token) updates.refreshToken = tokens.refresh_token;
        await db
          .update(calendarSyncSettings)
          .set(updates)
          .where(eq(calendarSyncSettings.id, syncConfig.id));
        console.log('[CalendarService] Refreshed OAuth tokens saved to DB');
      } catch (err) {
        console.warn('[CalendarService] Failed to save refreshed tokens:', err);
      }
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Fetch events from 1 year ago to 2 years in future to ensure past AND future events
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const twoYearsAhead = new Date();
    twoYearsAhead.setFullYear(twoYearsAhead.getFullYear() + 2);

    const timeMin = fromDate ? fromDate.toISOString() : oneYearAgo.toISOString();
    const timeMax = twoYearsAhead.toISOString();

    console.log(`📅 Fetching Google Calendar events from ${timeMin} to ${timeMax}`);

    const events: any[] = [];
    let pageToken: string | undefined = undefined;
    
    try {
      do {
        const response = await calendar.events.list({
          calendarId: syncConfig.calendarId || 'primary',
          timeMin,
          timeMax,
          maxResults: 2500,
          singleEvents: true,
          orderBy: 'startTime',
          pageToken,
        });
        if (response.data.items) events.push(...response.data.items);
        pageToken = response.data.nextPageToken ?? undefined;
      } while (pageToken);
    } catch (apiError: any) {
      const msg = apiError?.message || '';
      if (msg.includes('invalid_grant') || msg.includes('Token has been expired') || msg.includes('Token has been revoked')) {
        throw new Error('invalid_grant: Google Calendar authorization has expired. Please disconnect and reconnect in Calendar Sync settings.');
      }
      throw apiError;
    }

    console.log(`📅 Found ${events.length} events in Google Calendar`);

    let imported = 0, updated = 0, deleted = 0, skipped = 0;
    const errors: any[] = [];

    for (const event of events) {
      // Skip all-day events that don't have dateTime (only have date)
      const startDateTime = event.start?.dateTime || event.start?.date;
      const endDateTime = event.end?.dateTime || event.end?.date;
      
      if (!event.id || !startDateTime || !endDateTime) {
        skipped++;
        continue;
      }

      // Check if event already exists in photographySessions (by google_calendar_event_id)
      const existingSession = await db
        .select()
        .from(photographySessions)
        .where(eq(photographySessions.googleCalendarEventId, event.id))
        .limit(1);

      if (existingSession.length > 0) {
        // Update existing session if it changed
        const existing = existingSession[0];
        const newStart = new Date(startDateTime);
        const newEnd = new Date(endDateTime);
        
        if (
          existing.title !== (event.summary || 'Google Event') ||
          existing.startTime.getTime() !== newStart.getTime() ||
          existing.endTime.getTime() !== newEnd.getTime() ||
          existing.locationName !== (event.location || null)
        ) {
          try {
            await db
              .update(photographySessions)
              .set({
                title: event.summary || 'Google Event',
                description: event.description || null,
                startTime: newStart,
                endTime: newEnd,
                locationName: event.location || null,
                updatedAt: new Date(),
              })
              .where(eq(photographySessions.id, existing.id));
            updated++;
          } catch (err) {
            errors.push({ eventId: event.id, error: err });
          }
        } else {
          skipped++;
        }
        continue;
      }

      // Insert new event as photography session
      try {
        // Parse client name from event summary (often in format "Familienshooting mit Name")
        const summary = event.summary || 'Google Event';
        let clientName = null;
        const mitMatch = summary.match(/mit\s+(.+)$/i);
        if (mitMatch) {
          clientName = mitMatch[1].trim();
        }
        
        // Determine session type from summary
        let sessionType = 'portrait';
        const lowerSummary = summary.toLowerCase();
        if (lowerSummary.includes('familie') || lowerSummary.includes('family')) sessionType = 'family';
        else if (lowerSummary.includes('hochzeit') || lowerSummary.includes('wedding')) sessionType = 'wedding';
        else if (lowerSummary.includes('baby') || lowerSummary.includes('newborn')) sessionType = 'portrait';
        else if (lowerSummary.includes('business') || lowerSummary.includes('commercial')) sessionType = 'commercial';
        else if (lowerSummary.includes('event')) sessionType = 'event';

        const newStart = new Date(startDateTime);
        const newEnd = new Date(endDateTime);
        const isPast = newStart < new Date();

        // Generate a unique ID using crypto
        const sessionId = `gcal_${event.id}_${Date.now()}`;

        await db.insert(photographySessions).values({
          id: sessionId,
          title: summary,
          description: event.description || null,
          sessionType: sessionType,
          status: isPast ? 'completed' : 'scheduled',
          startTime: newStart,
          endTime: newEnd,
          clientName: clientName,
          locationName: event.location || null,
          googleCalendarEventId: event.id,
          icalUid: event.iCalUID || null,
          externalCalendarSync: true,
          deliveryStatus: isPast ? 'delivered' : 'pending',
          editingStatus: isPast ? 'completed' : 'pending',
          priority: 'medium',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        imported++;
      } catch (err: any) {
        console.error(`Failed to import event ${event.id}:`, err.message || err);
        errors.push({ eventId: event.id, error: err.message || String(err) });
      }
    }

    // Update last sync time
    await db
      .update(calendarSyncSettings)
      .set({ lastSyncAt: new Date(), updatedAt: new Date() })
      .where(eq(calendarSyncSettings.id, syncConfig.id));

    console.log(`✅ Sync complete: ${imported} imported, ${updated} updated, ${skipped} skipped, ${errors.length} errors`);

    return { imported, updated, deleted, skipped, errors };
}

interface CreateAppointmentOptions {
  clientId: string;
  title: string;
  description?: string;
  appointmentType: 'consultation' | 'photoshoot' | 'delivery' | 'meeting';
  startDateTime: Date;
  endDateTime: Date;
  location?: string;
  notes?: string;
  reminderDateTime?: Date;
  syncToGoogle?: boolean;
}

interface UpdateAppointmentOptions {
  id: string;
  title?: string;
  description?: string;
  appointmentType?: 'consultation' | 'photoshoot' | 'delivery' | 'meeting';
  status?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  startDateTime?: Date;
  endDateTime?: Date;
  location?: string;
  notes?: string;
  reminderDateTime?: Date;
  syncToGoogle?: boolean;
}

interface GoogleCalendarEvent {
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: string;
  attendees?: Array<{ email: string; displayName?: string }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
}

class StudioCalendarService {
  private static googleAuth: any = null;
  private static calendar: any = null;

  /**
   * Initialize Google Calendar integration
   */
  static async initializeGoogleCalendar(): Promise<boolean> {
    try {
      // Get Google Calendar configuration from database
      const configs = await db
        .select()
        .from(googleCalendarConfig)
        .where(eq(googleCalendarConfig.isActive, true))
        .limit(1);

      if (configs.length === 0) {
        console.log('📅 No Google Calendar configuration found');
        return false;
      }

      const config = configs[0];

      // Initialize Google Auth
      this.googleAuth = new google.auth.OAuth2(
        config.clientId,
        config.clientSecret,
        'urn:ietf:wg:oauth:2.0:oob' // For installed applications
      );

      if (config.accessToken && config.refreshToken) {
        this.googleAuth.setCredentials({
          access_token: config.accessToken,
          refresh_token: config.refreshToken,
        });

        this.calendar = google.calendar({ version: 'v3', auth: this.googleAuth });
        console.log('✅ Google Calendar integration initialized');
        return true;
      }

      console.log('⚠️ Google Calendar credentials incomplete');
      return false;

    } catch (error) {
      console.error('❌ Google Calendar initialization failed:', error);
      return false;
    }
  }

  /**
   * Create a new appointment
   */
  static async createAppointment(options: CreateAppointmentOptions): Promise<{
    success: boolean;
    appointmentId?: string;
    googleEventId?: string;
    error?: string;
  }> {
    try {
      // Get client information
      const client = await db
        .select()
        .from(crmClients)
        .where(eq(crmClients.id, options.clientId))
        .limit(1);

      if (client.length === 0) {
        throw new Error('Client not found');
      }

      const clientInfo = client[0];

      // Create appointment in database
      const newAppointment = await db
        .insert(studioAppointments)
        .values({
          clientId: options.clientId,
          title: options.title,
          description: options.description,
          appointmentType: options.appointmentType,
          startDateTime: options.startDateTime,
          endDateTime: options.endDateTime,
          location: options.location || 'Studio',
          notes: options.notes,
          reminderDateTime: options.reminderDateTime,
        })
        .returning();

      const appointment = newAppointment[0];
      let googleEventId: string | undefined;

      // Sync to Google Calendar if enabled
      if (options.syncToGoogle && this.calendar) {
        try {
          const googleEvent = await this.createGoogleCalendarEvent({
            summary: `${options.title} - ${clientInfo.firstName} ${clientInfo.lastName}`,
            description: options.description || `${options.appointmentType} with ${clientInfo.firstName} ${clientInfo.lastName}`,
            start: {
              dateTime: options.startDateTime.toISOString(),
              timeZone: 'Europe/Vienna',
            },
            end: {
              dateTime: options.endDateTime.toISOString(),
              timeZone: 'Europe/Vienna',
            },
            location: options.location || 'Studio',
            attendees: clientInfo.email ? [{
              email: clientInfo.email,
              displayName: `${clientInfo.firstName} ${clientInfo.lastName}`
            }] : undefined,
            reminders: {
              useDefault: false,
              overrides: options.reminderDateTime ? [{
                method: 'email',
                minutes: Math.round((options.startDateTime.getTime() - options.reminderDateTime.getTime()) / (1000 * 60))
              }] : undefined,
            },
          });

          if (googleEvent.id) {
            googleEventId = googleEvent.id;
            
            // Update appointment with Google Calendar event ID
            await db
              .update(studioAppointments)
              .set({ googleCalendarEventId: googleEventId })
              .where(eq(studioAppointments.id, appointment.id));
          }

        } catch (googleError) {
          console.error('⚠️ Failed to sync to Google Calendar:', googleError);
          // Don't fail the entire appointment creation if Google sync fails
        }
      }

      console.log(`✅ Appointment created: ${options.title} for ${clientInfo.firstName} ${clientInfo.lastName}`);

      return {
        success: true,
        appointmentId: appointment.id,
        googleEventId,
      };

    } catch (error) {
      console.error('❌ Failed to create appointment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update an existing appointment
   */
  static async updateAppointment(options: UpdateAppointmentOptions): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Get existing appointment
      const existing = await db
        .select()
        .from(studioAppointments)
        .where(eq(studioAppointments.id, options.id))
        .limit(1);

      if (existing.length === 0) {
        throw new Error('Appointment not found');
      }

      const appointment = existing[0];

      // Update appointment in database
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (options.title !== undefined) updateData.title = options.title;
      if (options.description !== undefined) updateData.description = options.description;
      if (options.appointmentType !== undefined) updateData.appointmentType = options.appointmentType;
      if (options.status !== undefined) updateData.status = options.status;
      if (options.startDateTime !== undefined) updateData.startDateTime = options.startDateTime;
      if (options.endDateTime !== undefined) updateData.endDateTime = options.endDateTime;
      if (options.location !== undefined) updateData.location = options.location;
      if (options.notes !== undefined) updateData.notes = options.notes;
      if (options.reminderDateTime !== undefined) updateData.reminderDateTime = options.reminderDateTime;

      await db
        .update(studioAppointments)
        .set(updateData)
        .where(eq(studioAppointments.id, options.id));

      // Update Google Calendar event if it exists and sync is enabled
      if (options.syncToGoogle && appointment.googleCalendarEventId && this.calendar) {
        try {
          // Get client information for updated event
          const client = await db
            .select()
            .from(crmClients)
            .where(eq(crmClients.id, appointment.clientId))
            .limit(1);

          if (client.length > 0) {
            const clientInfo = client[0];

            await this.updateGoogleCalendarEvent(appointment.googleCalendarEventId, {
              summary: `${options.title || appointment.title} - ${clientInfo.firstName} ${clientInfo.lastName}`,
              description: options.description || appointment.description || `${options.appointmentType || appointment.appointmentType} with ${clientInfo.firstName} ${clientInfo.lastName}`,
              start: {
                dateTime: (options.startDateTime || appointment.startDateTime).toISOString(),
                timeZone: 'Europe/Vienna',
              },
              end: {
                dateTime: (options.endDateTime || appointment.endDateTime).toISOString(),
                timeZone: 'Europe/Vienna',
              },
              location: options.location || appointment.location,
            });
          }

        } catch (googleError) {
          console.error('⚠️ Failed to update Google Calendar event:', googleError);
        }
      }

      console.log(`✅ Appointment updated: ${options.id}`);

      return { success: true };

    } catch (error) {
      console.error('❌ Failed to update appointment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get appointments for a date range
   */
  static async getAppointments(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      // Get studio appointments
      const appointments = await db
        .select({
          id: studioAppointments.id,
          clientId: studioAppointments.clientId,
          title: studioAppointments.title,
          description: studioAppointments.description,
          appointmentType: studioAppointments.appointmentType,
          status: studioAppointments.status,
          startDateTime: studioAppointments.startDateTime,
          endDateTime: studioAppointments.endDateTime,
          location: studioAppointments.location,
          notes: studioAppointments.notes,
          reminderSent: studioAppointments.reminderSent,
          reminderDateTime: studioAppointments.reminderDateTime,
          googleCalendarEventId: studioAppointments.googleCalendarEventId,
          createdAt: studioAppointments.createdAt,
          // Client information
          clientName: crmClients.firstName,
          clientLastName: crmClients.lastName,
          clientEmail: crmClients.email,
          clientPhone: crmClients.phone,
        })
        .from(studioAppointments)
        .leftJoin(crmClients, eq(studioAppointments.clientId, crmClients.id))
        .where(
          and(
            gte(studioAppointments.startDateTime, startDate),
            lte(studioAppointments.startDateTime, endDate)
          )
        )
        .orderBy(studioAppointments.startDateTime);

      // Also get imported photography sessions and format them as appointments
      const { photographySessions } = await import('@shared/schema');
      const sessions = await db
        .select({
          id: photographySessions.id,
          clientId: photographySessions.clientId,
          title: photographySessions.title,
          description: photographySessions.description,
          appointmentType: photographySessions.sessionType,
          status: photographySessions.status,
          startDateTime: photographySessions.startTime,
          endDateTime: photographySessions.endTime,
          location: photographySessions.locationName,
          notes: photographySessions.notes,
          reminderSent: photographySessions.reminderSent,
          reminderDateTime: photographySessions.startTime, // Use start time as reminder placeholder
          googleCalendarEventId: photographySessions.icalUid,
          createdAt: photographySessions.createdAt,
          // Client information from session data
          clientName: photographySessions.clientName,
          clientLastName: photographySessions.clientEmail, // Use email as last name placeholder
          clientEmail: photographySessions.clientEmail,
          clientPhone: photographySessions.clientPhone,
        })
        .from(photographySessions)
        .where(
          and(
            gte(photographySessions.startTime, startDate),
            lte(photographySessions.startTime, endDate)
          )
        )
        .orderBy(photographySessions.startTime);

      // Combine and sort all appointments/sessions
      const allAppointments = [...appointments, ...sessions].sort((a, b) => 
        new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
      );

      return allAppointments;

    } catch (error) {
      console.error('❌ Failed to get appointments:', error);
      return [];
    }
  }

  /**
   * Get appointments for a specific client
   */
  static async getClientAppointments(clientId: string): Promise<any[]> {
    try {
      const appointments = await db
        .select()
        .from(studioAppointments)
        .where(eq(studioAppointments.clientId, clientId))
        .orderBy(desc(studioAppointments.startDateTime));

      return appointments;

    } catch (error) {
      console.error('❌ Failed to get client appointments:', error);
      return [];
    }
  }

  /**
   * Delete an appointment
   */
  static async deleteAppointment(appointmentId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Get appointment to check for Google Calendar event
      const appointment = await db
        .select()
        .from(studioAppointments)
        .where(eq(studioAppointments.id, appointmentId))
        .limit(1);

      if (appointment.length === 0) {
        throw new Error('Appointment not found');
      }

      // Delete from Google Calendar if event exists
      if (appointment[0].googleCalendarEventId && this.calendar) {
        try {
          await this.deleteGoogleCalendarEvent(appointment[0].googleCalendarEventId);
        } catch (googleError) {
          console.error('⚠️ Failed to delete Google Calendar event:', googleError);
        }
      }

      // Delete from database
      await db
        .delete(studioAppointments)
        .where(eq(studioAppointments.id, appointmentId));

      console.log(`✅ Appointment deleted: ${appointmentId}`);

      return { success: true };

    } catch (error) {
      console.error('❌ Failed to delete appointment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create Google Calendar event
   */
  private static async createGoogleCalendarEvent(event: GoogleCalendarEvent): Promise<any> {
    if (!this.calendar) {
      throw new Error('Google Calendar not initialized');
    }

    const response = await this.calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    return response.data;
  }

  /**
   * Public wrapper to create a Google Calendar event. Ensures initialization.
   */
  static async createGoogleEventPublic(event: GoogleCalendarEvent): Promise<any> {
    if (!this.calendar) {
      const ok = await this.initializeGoogleCalendar();
      if (!ok) throw new Error('Google Calendar not configured');
    }
    return await this.createGoogleCalendarEvent(event);
  }

  /**
   * Update Google Calendar event
   */
  private static async updateGoogleCalendarEvent(eventId: string, event: Partial<GoogleCalendarEvent>): Promise<any> {
    if (!this.calendar) {
      throw new Error('Google Calendar not initialized');
    }

    const response = await this.calendar.events.update({
      calendarId: 'primary',
      eventId: eventId,
      resource: event,
    });

    return response.data;
  }

  /**
   * Delete Google Calendar event
   */
  private static async deleteGoogleCalendarEvent(eventId: string): Promise<void> {
    if (!this.calendar) {
      throw new Error('Google Calendar not initialized');
    }

    await this.calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
    });
  }
}

export default StudioCalendarService;

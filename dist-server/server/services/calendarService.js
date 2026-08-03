"use strict";
/**
 * Studio Calendar Service
 * Handles appointment scheduling and Google Calendar integration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.importGoogleCalendarEvents = importGoogleCalendarEvents;
const db_1 = require("../db");
const schema_1 = require("@shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
const googleapis_1 = require("googleapis");
/**
 * Import all Google Calendar events (past and future) into the CRM
 * Uses the calendarSyncSettings table for OAuth tokens (set by OAuth flow)
 * This is a standalone function that can be called from routes
 * @param {Date} [fromDate] - Optional: Only import events from this date forward
 * @param {string} [userId] - Optional: User ID to get OAuth tokens for
 * @returns {Promise<{imported: number, updated: number, deleted: number, skipped: number, errors: any[]}>}
 */
async function importGoogleCalendarEvents(fromDate, userId) {
    // Find an active sync config (if userId provided, filter by it)
    let configs;
    if (userId) {
        configs = await db_1.db
            .select()
            .from(schema_1.calendarSyncSettings)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.calendarSyncSettings.userId, userId), (0, drizzle_orm_1.eq)(schema_1.calendarSyncSettings.syncEnabled, true)))
            .limit(1);
    }
    else {
        configs = await db_1.db
            .select()
            .from(schema_1.calendarSyncSettings)
            .where((0, drizzle_orm_1.eq)(schema_1.calendarSyncSettings.syncEnabled, true))
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
    const oauth2Client = new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.NODE_ENV === 'production'
        ? 'https://www.newagefotografie.com/api/auth/google/callback'
        : `${process.env.BASE_URL || 'http://localhost:3001'}/api/auth/google/callback`);
    oauth2Client.setCredentials({
        access_token: syncConfig.accessToken,
        refresh_token: syncConfig.refreshToken,
    });
    const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
    // Fetch events from 1 year ago to 2 years in future to ensure past AND future events
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const twoYearsAhead = new Date();
    twoYearsAhead.setFullYear(twoYearsAhead.getFullYear() + 2);
    const timeMin = fromDate ? fromDate.toISOString() : oneYearAgo.toISOString();
    const timeMax = twoYearsAhead.toISOString();
    console.log(`📅 Fetching Google Calendar events from ${timeMin} to ${timeMax}`);
    const events = [];
    let pageToken = undefined;
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
        if (response.data.items)
            events.push(...response.data.items);
        pageToken = response.data.nextPageToken ?? undefined;
    } while (pageToken);
    console.log(`📅 Found ${events.length} events in Google Calendar`);
    let imported = 0, updated = 0, deleted = 0, skipped = 0;
    const errors = [];
    for (const event of events) {
        // Skip all-day events that don't have dateTime (only have date)
        const startDateTime = event.start?.dateTime || event.start?.date;
        const endDateTime = event.end?.dateTime || event.end?.date;
        if (!event.id || !startDateTime || !endDateTime) {
            skipped++;
            continue;
        }
        // Check if event already exists in photographySessions (by google_calendar_event_id)
        const existingSession = await db_1.db
            .select()
            .from(schema_1.photographySessions)
            .where((0, drizzle_orm_1.eq)(schema_1.photographySessions.googleCalendarEventId, event.id))
            .limit(1);
        if (existingSession.length > 0) {
            // Update existing session if it changed
            const existing = existingSession[0];
            const newStart = new Date(startDateTime);
            const newEnd = new Date(endDateTime);
            if (existing.title !== (event.summary || 'Google Event') ||
                existing.startTime.getTime() !== newStart.getTime() ||
                existing.endTime.getTime() !== newEnd.getTime() ||
                existing.locationName !== (event.location || null)) {
                try {
                    await db_1.db
                        .update(schema_1.photographySessions)
                        .set({
                        title: event.summary || 'Google Event',
                        description: event.description || null,
                        startTime: newStart,
                        endTime: newEnd,
                        locationName: event.location || null,
                        updatedAt: new Date(),
                    })
                        .where((0, drizzle_orm_1.eq)(schema_1.photographySessions.id, existing.id));
                    updated++;
                }
                catch (err) {
                    errors.push({ eventId: event.id, error: err });
                }
            }
            else {
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
            if (lowerSummary.includes('familie') || lowerSummary.includes('family'))
                sessionType = 'family';
            else if (lowerSummary.includes('hochzeit') || lowerSummary.includes('wedding'))
                sessionType = 'wedding';
            else if (lowerSummary.includes('baby') || lowerSummary.includes('newborn'))
                sessionType = 'portrait';
            else if (lowerSummary.includes('business') || lowerSummary.includes('commercial'))
                sessionType = 'commercial';
            else if (lowerSummary.includes('event'))
                sessionType = 'event';
            const newStart = new Date(startDateTime);
            const newEnd = new Date(endDateTime);
            const isPast = newStart < new Date();
            // Generate a unique ID using crypto
            const sessionId = `gcal_${event.id}_${Date.now()}`;
            await db_1.db.insert(schema_1.photographySessions).values({
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
        }
        catch (err) {
            console.error(`Failed to import event ${event.id}:`, err.message || err);
            errors.push({ eventId: event.id, error: err.message || String(err) });
        }
    }
    // Update last sync time
    await db_1.db
        .update(schema_1.calendarSyncSettings)
        .set({ lastSyncAt: new Date(), updatedAt: new Date() })
        .where((0, drizzle_orm_1.eq)(schema_1.calendarSyncSettings.id, syncConfig.id));
    console.log(`✅ Sync complete: ${imported} imported, ${updated} updated, ${skipped} skipped, ${errors.length} errors`);
    return { imported, updated, deleted, skipped, errors };
}
class StudioCalendarService {
    /**
     * Initialize Google Calendar integration
     */
    static async initializeGoogleCalendar() {
        try {
            // Get Google Calendar configuration from database
            const configs = await db_1.db
                .select()
                .from(schema_1.googleCalendarConfig)
                .where((0, drizzle_orm_1.eq)(schema_1.googleCalendarConfig.isActive, true))
                .limit(1);
            if (configs.length === 0) {
                console.log('📅 No Google Calendar configuration found');
                return false;
            }
            const config = configs[0];
            // Initialize Google Auth
            this.googleAuth = new googleapis_1.google.auth.OAuth2(config.clientId, config.clientSecret, 'urn:ietf:wg:oauth:2.0:oob' // For installed applications
            );
            if (config.accessToken && config.refreshToken) {
                this.googleAuth.setCredentials({
                    access_token: config.accessToken,
                    refresh_token: config.refreshToken,
                });
                this.calendar = googleapis_1.google.calendar({ version: 'v3', auth: this.googleAuth });
                console.log('✅ Google Calendar integration initialized');
                return true;
            }
            console.log('⚠️ Google Calendar credentials incomplete');
            return false;
        }
        catch (error) {
            console.error('❌ Google Calendar initialization failed:', error);
            return false;
        }
    }
    /**
     * Create a new appointment
     */
    static async createAppointment(options) {
        try {
            // Get client information
            const client = await db_1.db
                .select()
                .from(schema_1.crmClients)
                .where((0, drizzle_orm_1.eq)(schema_1.crmClients.id, options.clientId))
                .limit(1);
            if (client.length === 0) {
                throw new Error('Client not found');
            }
            const clientInfo = client[0];
            // Create appointment in database
            const newAppointment = await db_1.db
                .insert(schema_1.studioAppointments)
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
            let googleEventId;
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
                        await db_1.db
                            .update(schema_1.studioAppointments)
                            .set({ googleCalendarEventId: googleEventId })
                            .where((0, drizzle_orm_1.eq)(schema_1.studioAppointments.id, appointment.id));
                    }
                }
                catch (googleError) {
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
        }
        catch (error) {
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
    static async updateAppointment(options) {
        try {
            // Get existing appointment
            const existing = await db_1.db
                .select()
                .from(schema_1.studioAppointments)
                .where((0, drizzle_orm_1.eq)(schema_1.studioAppointments.id, options.id))
                .limit(1);
            if (existing.length === 0) {
                throw new Error('Appointment not found');
            }
            const appointment = existing[0];
            // Update appointment in database
            const updateData = {
                updatedAt: new Date(),
            };
            if (options.title !== undefined)
                updateData.title = options.title;
            if (options.description !== undefined)
                updateData.description = options.description;
            if (options.appointmentType !== undefined)
                updateData.appointmentType = options.appointmentType;
            if (options.status !== undefined)
                updateData.status = options.status;
            if (options.startDateTime !== undefined)
                updateData.startDateTime = options.startDateTime;
            if (options.endDateTime !== undefined)
                updateData.endDateTime = options.endDateTime;
            if (options.location !== undefined)
                updateData.location = options.location;
            if (options.notes !== undefined)
                updateData.notes = options.notes;
            if (options.reminderDateTime !== undefined)
                updateData.reminderDateTime = options.reminderDateTime;
            await db_1.db
                .update(schema_1.studioAppointments)
                .set(updateData)
                .where((0, drizzle_orm_1.eq)(schema_1.studioAppointments.id, options.id));
            // Update Google Calendar event if it exists and sync is enabled
            if (options.syncToGoogle && appointment.googleCalendarEventId && this.calendar) {
                try {
                    // Get client information for updated event
                    const client = await db_1.db
                        .select()
                        .from(schema_1.crmClients)
                        .where((0, drizzle_orm_1.eq)(schema_1.crmClients.id, appointment.clientId))
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
                }
                catch (googleError) {
                    console.error('⚠️ Failed to update Google Calendar event:', googleError);
                }
            }
            console.log(`✅ Appointment updated: ${options.id}`);
            return { success: true };
        }
        catch (error) {
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
    static async getAppointments(startDate, endDate) {
        try {
            // Get studio appointments
            const appointments = await db_1.db
                .select({
                id: schema_1.studioAppointments.id,
                clientId: schema_1.studioAppointments.clientId,
                title: schema_1.studioAppointments.title,
                description: schema_1.studioAppointments.description,
                appointmentType: schema_1.studioAppointments.appointmentType,
                status: schema_1.studioAppointments.status,
                startDateTime: schema_1.studioAppointments.startDateTime,
                endDateTime: schema_1.studioAppointments.endDateTime,
                location: schema_1.studioAppointments.location,
                notes: schema_1.studioAppointments.notes,
                reminderSent: schema_1.studioAppointments.reminderSent,
                reminderDateTime: schema_1.studioAppointments.reminderDateTime,
                googleCalendarEventId: schema_1.studioAppointments.googleCalendarEventId,
                createdAt: schema_1.studioAppointments.createdAt,
                // Client information
                clientName: schema_1.crmClients.firstName,
                clientLastName: schema_1.crmClients.lastName,
                clientEmail: schema_1.crmClients.email,
                clientPhone: schema_1.crmClients.phone,
            })
                .from(schema_1.studioAppointments)
                .leftJoin(schema_1.crmClients, (0, drizzle_orm_1.eq)(schema_1.studioAppointments.clientId, schema_1.crmClients.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_1.studioAppointments.startDateTime, startDate), (0, drizzle_orm_1.lte)(schema_1.studioAppointments.startDateTime, endDate)))
                .orderBy(schema_1.studioAppointments.startDateTime);
            // Also get imported photography sessions and format them as appointments
            const { photographySessions } = await import('@shared/schema');
            const sessions = await db_1.db
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
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(photographySessions.startTime, startDate), (0, drizzle_orm_1.lte)(photographySessions.startTime, endDate)))
                .orderBy(photographySessions.startTime);
            // Combine and sort all appointments/sessions
            const allAppointments = [...appointments, ...sessions].sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());
            return allAppointments;
        }
        catch (error) {
            console.error('❌ Failed to get appointments:', error);
            return [];
        }
    }
    /**
     * Get appointments for a specific client
     */
    static async getClientAppointments(clientId) {
        try {
            const appointments = await db_1.db
                .select()
                .from(schema_1.studioAppointments)
                .where((0, drizzle_orm_1.eq)(schema_1.studioAppointments.clientId, clientId))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.studioAppointments.startDateTime));
            return appointments;
        }
        catch (error) {
            console.error('❌ Failed to get client appointments:', error);
            return [];
        }
    }
    /**
     * Delete an appointment
     */
    static async deleteAppointment(appointmentId) {
        try {
            // Get appointment to check for Google Calendar event
            const appointment = await db_1.db
                .select()
                .from(schema_1.studioAppointments)
                .where((0, drizzle_orm_1.eq)(schema_1.studioAppointments.id, appointmentId))
                .limit(1);
            if (appointment.length === 0) {
                throw new Error('Appointment not found');
            }
            // Delete from Google Calendar if event exists
            if (appointment[0].googleCalendarEventId && this.calendar) {
                try {
                    await this.deleteGoogleCalendarEvent(appointment[0].googleCalendarEventId);
                }
                catch (googleError) {
                    console.error('⚠️ Failed to delete Google Calendar event:', googleError);
                }
            }
            // Delete from database
            await db_1.db
                .delete(schema_1.studioAppointments)
                .where((0, drizzle_orm_1.eq)(schema_1.studioAppointments.id, appointmentId));
            console.log(`✅ Appointment deleted: ${appointmentId}`);
            return { success: true };
        }
        catch (error) {
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
    static async createGoogleCalendarEvent(event) {
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
    static async createGoogleEventPublic(event) {
        if (!this.calendar) {
            const ok = await this.initializeGoogleCalendar();
            if (!ok)
                throw new Error('Google Calendar not configured');
        }
        return await this.createGoogleCalendarEvent(event);
    }
    /**
     * Update Google Calendar event
     */
    static async updateGoogleCalendarEvent(eventId, event) {
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
    static async deleteGoogleCalendarEvent(eventId) {
        if (!this.calendar) {
            throw new Error('Google Calendar not initialized');
        }
        await this.calendar.events.delete({
            calendarId: 'primary',
            eventId: eventId,
        });
    }
}
StudioCalendarService.googleAuth = null;
StudioCalendarService.calendar = null;
exports.default = StudioCalendarService;

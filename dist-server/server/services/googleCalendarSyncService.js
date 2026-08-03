"use strict";
/**
 * Google Calendar 2-Way Sync Service
 * Handles bidirectional synchronization between CRM and Google Calendar
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleCalendarSyncService = void 0;
exports.createSyncServiceForUser = createSyncServiceForUser;
const googleapis_1 = require("googleapis");
const node_crypto_1 = require("node:crypto");
const db_1 = require("../db");
const schema_1 = require("@shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
class GoogleCalendarSyncService {
    constructor(config) {
        this.config = config;
        // Initialize OAuth2 client
        this.oauth2Client = new googleapis_1.google.auth.OAuth2(config.clientId, config.clientSecret, `${process.env.BASE_URL || 'http://localhost:3001'}/api/auth/google/callback`);
        // Set refresh token
        this.oauth2Client.setCredentials({
            refresh_token: config.refreshToken,
        });
        // Initialize Calendar API
        this.calendar = googleapis_1.google.calendar({ version: 'v3', auth: this.oauth2Client });
    }
    /**
     * Full bidirectional sync
     */
    async performSync() {
        const results = {
            success: true,
            imported: 0,
            updated: 0,
            deleted: 0,
            errors: [],
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
        }
        catch (error) {
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
    async pushLocalChangesToGoogle() {
        const results = { updated: 0, errors: [] };
        try {
            // Get all sessions that should sync and were modified recently
            const sessions = await db_1.db
                .select()
                .from(schema_1.photographySessions)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.photographySessions.externalCalendarSync, true), (0, drizzle_orm_1.gte)(schema_1.photographySessions.updatedAt, new Date(Date.now() - 6 * 60 * 1000)) // Last 6 minutes
            ));
            for (const session of sessions) {
                try {
                    if (session.googleCalendarEventId) {
                        // Update existing event
                        await this.updateGoogleEvent(session);
                        results.updated++;
                    }
                    else {
                        // Create new event
                        const eventId = await this.createGoogleEvent(session);
                        if (eventId) {
                            // Store the Google event ID
                            await db_1.db
                                .update(schema_1.photographySessions)
                                .set({ googleCalendarEventId: eventId })
                                .where((0, drizzle_orm_1.eq)(schema_1.photographySessions.id, session.id));
                            results.updated++;
                        }
                    }
                }
                catch (error) {
                    console.error(`Error syncing session ${session.id}:`, error.message);
                    results.errors.push(`Session ${session.id}: ${error.message}`);
                }
            }
        }
        catch (error) {
            results.errors.push(`Push failed: ${error.message}`);
        }
        return results;
    }
    /**
     * Pull Google Calendar events to local CRM
     */
    async pullGoogleChangesToLocal() {
        const results = { imported: 0, updated: 0, deleted: 0, errors: [] };
        try {
            // Get events modified in the last 6 minutes
            const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000);
            const response = await this.calendar.events.list({
                calendarId: this.config.calendarId,
                timeMin: sixMinutesAgo.toISOString(),
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
                    }
                    else {
                        // Check if event exists locally
                        const existingSession = await db_1.db
                            .select()
                            .from(schema_1.photographySessions)
                            .where((0, drizzle_orm_1.eq)(schema_1.photographySessions.googleCalendarEventId, event.id))
                            .limit(1);
                        if (existingSession.length > 0) {
                            // Update existing session
                            await this.updateLocalSession(event, existingSession[0]);
                            results.updated++;
                        }
                        else {
                            // Import new session
                            await this.importGoogleEvent(event);
                            results.imported++;
                        }
                    }
                }
                catch (error) {
                    console.error(`Error processing event ${event.id}:`, error.message);
                    results.errors.push(`Event ${event.id}: ${error.message}`);
                }
            }
        }
        catch (error) {
            results.errors.push(`Pull failed: ${error.message}`);
        }
        return results;
    }
    /**
     * Create event in Google Calendar
     */
    async createGoogleEvent(session) {
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
        }
        catch (error) {
            console.error('Error creating Google event:', error.message);
            throw error;
        }
    }
    /**
     * Update event in Google Calendar
     */
    async updateGoogleEvent(session) {
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
        }
        catch (error) {
            console.error('Error updating Google event:', error.message);
            throw error;
        }
    }
    /**
     * Delete event from Google Calendar
     */
    async deleteGoogleEvent(googleEventId) {
        try {
            await this.calendar.events.delete({
                calendarId: this.config.calendarId,
                eventId: googleEventId,
            });
            console.log(`✅ Deleted Google event: ${googleEventId}`);
        }
        catch (error) {
            console.error('Error deleting Google event:', error.message);
            throw error;
        }
    }
    /**
     * Import Google Calendar event to CRM
     */
    async importGoogleEvent(event) {
        try {
            // Parse session type from title or description
            const sessionType = this.parseSessionType(event.summary, event.description);
            await db_1.db.insert(schema_1.photographySessions).values({
                id: (0, node_crypto_1.randomUUID)(),
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
            });
            console.log(`✅ Imported event: ${event.summary}`);
        }
        catch (error) {
            console.error('Error importing event:', error.message);
            throw error;
        }
    }
    /**
     * Update local CRM session from Google event
     */
    async updateLocalSession(event, existingSession) {
        try {
            // Compare timestamps - only update if Google event is newer
            const googleUpdated = new Date(event.updated);
            const localUpdated = new Date(existingSession.updatedAt);
            if (googleUpdated <= localUpdated) {
                console.log(`⏭️ Skipping update - local is newer: ${event.summary}`);
                return;
            }
            await db_1.db
                .update(schema_1.photographySessions)
                .set({
                title: event.summary || existingSession.title,
                description: event.description,
                startTime: new Date(event.start?.dateTime || existingSession.startTime),
                endTime: new Date(event.end?.dateTime || existingSession.endTime),
                locationName: event.location || existingSession.locationName,
            })
                .where((0, drizzle_orm_1.eq)(schema_1.photographySessions.id, existingSession.id));
            console.log(`✅ Updated session from Google: ${event.summary}`);
        }
        catch (error) {
            console.error('Error updating local session:', error.message);
            throw error;
        }
    }
    /**
     * Handle deleted Google Calendar event
     */
    async handleDeletedGoogleEvent(googleEventId) {
        try {
            const session = await db_1.db
                .select()
                .from(schema_1.photographySessions)
                .where((0, drizzle_orm_1.eq)(schema_1.photographySessions.googleCalendarEventId, googleEventId))
                .limit(1);
            if (session.length > 0) {
                // Option 1: Soft delete by updating status
                await db_1.db
                    .update(schema_1.photographySessions)
                    .set({ status: 'cancelled' })
                    .where((0, drizzle_orm_1.eq)(schema_1.photographySessions.id, session[0].id));
                console.log(`✅ Marked session as cancelled: ${session[0].title}`);
            }
        }
        catch (error) {
            console.error('Error handling deleted event:', error.message);
            throw error;
        }
    }
    /**
     * Get Google Calendar color ID for session type
     */
    getColorForSessionType(sessionType) {
        const colorMap = {
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
    parseSessionType(title, description) {
        const text = `${title} ${description}`.toLowerCase();
        if (text.includes('wedding'))
            return 'wedding';
        if (text.includes('portrait'))
            return 'portrait';
        if (text.includes('family'))
            return 'family';
        if (text.includes('event'))
            return 'event';
        if (text.includes('commercial'))
            return 'commercial';
        return 'other';
    }
    /**
     * Log sync operation
     */
    async logSync(status, results, errorMessage) {
        try {
            await db_1.db.insert(schema_1.calendarSyncLogs).values({
                id: (0, node_crypto_1.randomUUID)(),
                syncSettingId: this.config.syncSettingId,
                syncType: 'bidirectional',
                status,
                eventsProcessed: (results.imported || 0) + (results.updated || 0) + (results.deleted || 0),
                eventsCreated: results.imported || 0,
                eventsUpdated: results.updated || 0,
                eventsDeleted: results.deleted || 0,
                errors: (errorMessage ? [errorMessage] : (results.errors || [])),
            });
        }
        catch (error) {
            console.error('Error logging sync:', error);
        }
    }
}
exports.GoogleCalendarSyncService = GoogleCalendarSyncService;
/**
 * Factory function to create sync service for a user
 */
async function createSyncServiceForUser(userId) {
    try {
        // Get user's Google Calendar sync settings
        const config = await db_1.db
            .select()
            .from(schema_1.calendarSyncSettings)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.calendarSyncSettings.userId, userId), (0, drizzle_orm_1.eq)(schema_1.calendarSyncSettings.provider, 'google')))
            .limit(1);
        if (config.length === 0 || !config[0].refreshToken || config[0].syncEnabled === false) {
            console.log(`No Google Calendar config found for user ${userId}`);
            return null;
        }
        const userConfig = config[0];
        return new GoogleCalendarSyncService({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            refreshToken: userConfig.refreshToken,
            calendarId: userConfig.calendarId,
            userId,
            syncSettingId: userConfig.id,
        });
    }
    catch (error) {
        console.error('Error creating sync service:', error);
        return null;
    }
}

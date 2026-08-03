"use strict";
/**
 * Scheduler Routes
 * Client Self-Booking System - like Sprout Studio Schedulers
 *
 * Allows photographers to create booking links that clients can use
 * to self-schedule appointments based on availability.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const schema_1 = require("../../shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
const crypto_1 = require("crypto");
const date_fns_1 = require("date-fns");
const router = (0, express_1.Router)();
// ==================== ADMIN ROUTES (require auth) ====================
// GET /api/schedulers - List all schedulers
router.get('/', async (req, res) => {
    try {
        const allSchedulers = await db_1.db
            .select()
            .from(schema_1.schedulers)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.schedulers.createdAt));
        res.json(allSchedulers);
    }
    catch (error) {
        console.error('Error fetching schedulers:', error);
        res.status(500).json({ error: 'Failed to fetch schedulers' });
    }
});
// GET /api/schedulers/:id - Get single scheduler
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [scheduler] = await db_1.db
            .select()
            .from(schema_1.schedulers)
            .where((0, drizzle_orm_1.eq)(schema_1.schedulers.id, id));
        if (!scheduler) {
            return res.status(404).json({ error: 'Scheduler not found' });
        }
        res.json(scheduler);
    }
    catch (error) {
        console.error('Error fetching scheduler:', error);
        res.status(500).json({ error: 'Failed to fetch scheduler' });
    }
});
// POST /api/schedulers - Create new scheduler
router.post('/', async (req, res) => {
    try {
        const { name, description, sessionType = 'portrait', duration = 60, location, price, availabilityType = 'ongoing', startDate, endDate, timezone = 'Europe/Vienna', weeklyAvailability, specificDates, bufferBefore = 0, bufferAfter = 0, minNotice = 24, maxAdvance = 90, maxPerDay, availabilityIncrements = 60, confirmationMessage, questionnaireId, autoApprove = true, sendReminders = true, reminderHours = 24, brandName, brandColor = '#0d9488' } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Scheduler name is required' });
        }
        // Generate URL-friendly slug
        const baseSlug = name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
        // Check for slug uniqueness and append random suffix if needed
        const existingSlug = await db_1.db
            .select({ slug: schema_1.schedulers.slug })
            .from(schema_1.schedulers)
            .where((0, drizzle_orm_1.eq)(schema_1.schedulers.slug, baseSlug));
        const slug = existingSlug.length > 0
            ? `${baseSlug}-${(0, crypto_1.randomUUID)().slice(0, 8)}`
            : baseSlug;
        const id = (0, crypto_1.randomUUID)();
        // Default weekly availability (Mon-Fri, 9-5)
        const defaultWeeklyAvailability = {
            monday: [{ start: '09:00', end: '17:00' }],
            tuesday: [{ start: '09:00', end: '17:00' }],
            wednesday: [{ start: '09:00', end: '17:00' }],
            thursday: [{ start: '09:00', end: '17:00' }],
            friday: [{ start: '09:00', end: '17:00' }],
            saturday: [],
            sunday: []
        };
        const [newScheduler] = await db_1.db.insert(schema_1.schedulers).values({
            id,
            name,
            slug,
            description,
            sessionType,
            duration,
            location,
            price: price?.toString(),
            availabilityType,
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null,
            timezone,
            weeklyAvailability: weeklyAvailability || defaultWeeklyAvailability,
            specificDates,
            bufferBefore,
            bufferAfter,
            minNotice,
            maxAdvance,
            maxPerDay,
            availabilityIncrements,
            confirmationMessage,
            questionnaireId,
            autoApprove,
            sendReminders,
            reminderHours,
            brandName,
            brandColor,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        }).returning();
        res.status(201).json(newScheduler);
    }
    catch (error) {
        console.error('Error creating scheduler:', error);
        res.status(500).json({ error: 'Failed to create scheduler' });
    }
});
// PUT /api/schedulers/:id - Update scheduler
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = { ...req.body, updatedAt: new Date() };
        // Don't allow changing ID
        delete updates.id;
        delete updates.createdAt;
        // Convert price to string if provided
        if (updates.price !== undefined) {
            updates.price = updates.price?.toString();
        }
        // Convert dates
        if (updates.startDate) {
            updates.startDate = new Date(updates.startDate);
        }
        if (updates.endDate) {
            updates.endDate = new Date(updates.endDate);
        }
        const [updated] = await db_1.db
            .update(schema_1.schedulers)
            .set(updates)
            .where((0, drizzle_orm_1.eq)(schema_1.schedulers.id, id))
            .returning();
        if (!updated) {
            return res.status(404).json({ error: 'Scheduler not found' });
        }
        res.json(updated);
    }
    catch (error) {
        console.error('Error updating scheduler:', error);
        res.status(500).json({ error: 'Failed to update scheduler' });
    }
});
// DELETE /api/schedulers/:id - Delete scheduler
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Check for existing bookings
        const existingBookings = await db_1.db
            .select({ id: schema_1.schedulerBookings.id })
            .from(schema_1.schedulerBookings)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.schedulerBookings.schedulerId, id), (0, drizzle_orm_1.ne)(schema_1.schedulerBookings.status, 'cancelled')))
            .limit(1);
        if (existingBookings.length > 0) {
            return res.status(400).json({
                error: 'Cannot delete scheduler with active bookings. Cancel or complete bookings first.'
            });
        }
        const [deleted] = await db_1.db
            .delete(schema_1.schedulers)
            .where((0, drizzle_orm_1.eq)(schema_1.schedulers.id, id))
            .returning();
        if (!deleted) {
            return res.status(404).json({ error: 'Scheduler not found' });
        }
        res.json({ message: 'Scheduler deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting scheduler:', error);
        res.status(500).json({ error: 'Failed to delete scheduler' });
    }
});
// GET /api/schedulers/:id/bookings - Get bookings for a scheduler
router.get('/:id/bookings', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, from, to } = req.query;
        let conditions = [(0, drizzle_orm_1.eq)(schema_1.schedulerBookings.schedulerId, id)];
        if (status) {
            conditions.push((0, drizzle_orm_1.eq)(schema_1.schedulerBookings.status, status));
        }
        if (from) {
            conditions.push((0, drizzle_orm_1.gte)(schema_1.schedulerBookings.scheduledDate, new Date(from)));
        }
        if (to) {
            conditions.push((0, drizzle_orm_1.lte)(schema_1.schedulerBookings.scheduledDate, new Date(to)));
        }
        const bookings = await db_1.db
            .select()
            .from(schema_1.schedulerBookings)
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.schedulerBookings.scheduledDate));
        res.json(bookings);
    }
    catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});
// GET /api/schedulers/bookings/all - Get all bookings across all schedulers
router.get('/bookings/all', async (req, res) => {
    try {
        const { status, from, to } = req.query;
        let conditions = [];
        if (status) {
            conditions.push((0, drizzle_orm_1.eq)(schema_1.schedulerBookings.status, status));
        }
        if (from) {
            conditions.push((0, drizzle_orm_1.gte)(schema_1.schedulerBookings.scheduledDate, new Date(from)));
        }
        if (to) {
            conditions.push((0, drizzle_orm_1.lte)(schema_1.schedulerBookings.scheduledDate, new Date(to)));
        }
        const bookings = await db_1.db
            .select({
            booking: schema_1.schedulerBookings,
            scheduler: schema_1.schedulers
        })
            .from(schema_1.schedulerBookings)
            .leftJoin(schema_1.schedulers, (0, drizzle_orm_1.eq)(schema_1.schedulerBookings.schedulerId, schema_1.schedulers.id))
            .where(conditions.length > 0 ? (0, drizzle_orm_1.and)(...conditions) : undefined)
            .orderBy((0, drizzle_orm_1.asc)(schema_1.schedulerBookings.scheduledDate));
        res.json(bookings);
    }
    catch (error) {
        console.error('Error fetching all bookings:', error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});
// PUT /api/schedulers/bookings/:bookingId/status - Update booking status
router.put('/bookings/:bookingId/status', async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { status, cancellationReason } = req.body;
        const updateData = {
            status,
            updatedAt: new Date()
        };
        if (status === 'cancelled') {
            updateData.cancelledAt = new Date();
            updateData.cancellationReason = cancellationReason;
        }
        const [updated] = await db_1.db
            .update(schema_1.schedulerBookings)
            .set(updateData)
            .where((0, drizzle_orm_1.eq)(schema_1.schedulerBookings.id, bookingId))
            .returning();
        if (!updated) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        // If confirmed and autoApprove, create a photography session
        if (status === 'confirmed' && !updated.sessionId) {
            const [scheduler] = await db_1.db
                .select()
                .from(schema_1.schedulers)
                .where((0, drizzle_orm_1.eq)(schema_1.schedulers.id, updated.schedulerId));
            if (scheduler) {
                const sessionId = (0, crypto_1.randomUUID)();
                await db_1.db.insert(schema_1.photographySessions).values({
                    id: sessionId,
                    title: `${scheduler.name} - ${updated.clientName}`,
                    description: updated.clientNotes || '',
                    sessionType: scheduler.sessionType,
                    status: 'scheduled',
                    startTime: updated.scheduledDate,
                    endTime: updated.scheduledEndDate,
                    clientName: updated.clientName,
                    clientEmail: updated.clientEmail,
                    clientPhone: updated.clientPhone,
                    locationName: scheduler.location,
                    basePrice: scheduler.price ? parseFloat(scheduler.price) : 0,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                // Update booking with session ID
                await db_1.db
                    .update(schema_1.schedulerBookings)
                    .set({ sessionId })
                    .where((0, drizzle_orm_1.eq)(schema_1.schedulerBookings.id, bookingId));
                updated.sessionId = sessionId;
            }
        }
        res.json(updated);
    }
    catch (error) {
        console.error('Error updating booking status:', error);
        res.status(500).json({ error: 'Failed to update booking status' });
    }
});
// POST /api/schedulers/:id/blocked-times - Add blocked time
router.post('/:id/blocked-times', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, startDate, endDate, isAllDay, reason } = req.body;
        const blockedTime = await db_1.db.insert(schema_1.schedulerBlockedTimes).values({
            id: (0, crypto_1.randomUUID)(),
            schedulerId: id === 'all' ? null : id,
            title,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            isAllDay: isAllDay || false,
            reason,
            createdAt: new Date()
        }).returning();
        res.status(201).json(blockedTime[0]);
    }
    catch (error) {
        console.error('Error creating blocked time:', error);
        res.status(500).json({ error: 'Failed to create blocked time' });
    }
});
// DELETE /api/schedulers/blocked-times/:blockedTimeId - Remove blocked time
router.delete('/blocked-times/:blockedTimeId', async (req, res) => {
    try {
        const { blockedTimeId } = req.params;
        const [deleted] = await db_1.db
            .delete(schema_1.schedulerBlockedTimes)
            .where((0, drizzle_orm_1.eq)(schema_1.schedulerBlockedTimes.id, blockedTimeId))
            .returning();
        if (!deleted) {
            return res.status(404).json({ error: 'Blocked time not found' });
        }
        res.json({ message: 'Blocked time deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting blocked time:', error);
        res.status(500).json({ error: 'Failed to delete blocked time' });
    }
});
// ==================== PUBLIC ROUTES (no auth required) ====================
// GET /api/schedulers/public/:slug - Get public scheduler info by slug
router.get('/public/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const [scheduler] = await db_1.db
            .select({
            id: schema_1.schedulers.id,
            name: schema_1.schedulers.name,
            slug: schema_1.schedulers.slug,
            description: schema_1.schedulers.description,
            sessionType: schema_1.schedulers.sessionType,
            duration: schema_1.schedulers.duration,
            location: schema_1.schedulers.location,
            price: schema_1.schedulers.price,
            timezone: schema_1.schedulers.timezone,
            availabilityIncrements: schema_1.schedulers.availabilityIncrements,
            brandName: schema_1.schedulers.brandName,
            brandColor: schema_1.schedulers.brandColor,
            questionnaireId: schema_1.schedulers.questionnaireId,
            isActive: schema_1.schedulers.isActive
        })
            .from(schema_1.schedulers)
            .where((0, drizzle_orm_1.eq)(schema_1.schedulers.slug, slug));
        if (!scheduler) {
            return res.status(404).json({ error: 'Scheduler not found' });
        }
        if (!scheduler.isActive) {
            return res.status(404).json({ error: 'This scheduler is not currently available' });
        }
        // If there's a questionnaire, fetch its fields
        let questionnaireFields = null;
        if (scheduler.questionnaireId) {
            const [questionnaire] = await db_1.db
                .select({ fields: schema_1.questionnaires.fields })
                .from(schema_1.questionnaires)
                .where((0, drizzle_orm_1.eq)(schema_1.questionnaires.id, scheduler.questionnaireId));
            questionnaireFields = questionnaire?.fields;
        }
        res.json({ ...scheduler, questionnaireFields });
    }
    catch (error) {
        console.error('Error fetching public scheduler:', error);
        res.status(500).json({ error: 'Failed to fetch scheduler' });
    }
});
// GET /api/schedulers/public/:slug/availability - Get available time slots
router.get('/public/:slug/availability', async (req, res) => {
    try {
        const { slug } = req.params;
        const { date, month } = req.query;
        const [scheduler] = await db_1.db
            .select()
            .from(schema_1.schedulers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.schedulers.slug, slug), (0, drizzle_orm_1.eq)(schema_1.schedulers.isActive, true)));
        if (!scheduler) {
            return res.status(404).json({ error: 'Scheduler not found' });
        }
        // Get date range to check
        let startDate;
        let endDate;
        if (month) {
            // Return availability for entire month
            const [year, monthNum] = month.split('-').map(Number);
            startDate = new Date(year, monthNum - 1, 1);
            endDate = new Date(year, monthNum, 0); // Last day of month
        }
        else if (date) {
            // Return time slots for specific date
            startDate = (0, date_fns_1.startOfDay)((0, date_fns_1.parseISO)(date));
            endDate = (0, date_fns_1.endOfDay)((0, date_fns_1.parseISO)(date));
        }
        else {
            // Return next 30 days
            startDate = (0, date_fns_1.startOfDay)(new Date());
            endDate = (0, date_fns_1.addDays)(startDate, 30);
        }
        // Apply min notice rule
        const minDate = (0, date_fns_1.addMinutes)(new Date(), scheduler.minNotice * 60);
        if (startDate < minDate)
            startDate = minDate;
        // Apply max advance rule — but NOT for specific_dates availability,
        // because the photographer explicitly chose those dates and they
        // should all be bookable regardless of the maxAdvance window.
        if (scheduler.availabilityType !== 'specific_dates') {
            const maxDate = (0, date_fns_1.addDays)(new Date(), scheduler.maxAdvance);
            if (endDate > maxDate)
                endDate = maxDate;
        }
        // Get existing bookings for this scheduler
        const existingBookings = await db_1.db
            .select({
            scheduledDate: schema_1.schedulerBookings.scheduledDate,
            scheduledEndDate: schema_1.schedulerBookings.scheduledEndDate
        })
            .from(schema_1.schedulerBookings)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.schedulerBookings.schedulerId, scheduler.id), (0, drizzle_orm_1.ne)(schema_1.schedulerBookings.status, 'cancelled'), (0, drizzle_orm_1.gte)(schema_1.schedulerBookings.scheduledDate, startDate), (0, drizzle_orm_1.lte)(schema_1.schedulerBookings.scheduledDate, endDate)));
        // Get existing photography sessions (to block those times too)
        const existingSessions = await db_1.db
            .select({
            startTime: schema_1.photographySessions.startTime,
            endTime: schema_1.photographySessions.endTime
        })
            .from(schema_1.photographySessions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.ne)(schema_1.photographySessions.status, 'cancelled'), (0, drizzle_orm_1.gte)(schema_1.photographySessions.startTime, startDate), (0, drizzle_orm_1.lte)(schema_1.photographySessions.startTime, endDate)));
        // Get blocked times
        const blockedTimes = await db_1.db
            .select()
            .from(schema_1.schedulerBlockedTimes)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.schedulerBlockedTimes.schedulerId, scheduler.id), (0, drizzle_orm_1.isNull)(schema_1.schedulerBlockedTimes.schedulerId)), (0, drizzle_orm_1.lte)(schema_1.schedulerBlockedTimes.startDate, endDate), (0, drizzle_orm_1.gte)(schema_1.schedulerBlockedTimes.endDate, startDate)));
        // Generate available slots
        const availableSlots = generateAvailableSlots(scheduler, startDate, endDate, existingBookings, existingSessions, blockedTimes);
        // If requesting specific date, return time slots
        if (date) {
            res.json({
                date,
                slots: availableSlots
            });
        }
        else {
            // Group by date for month view
            const slotsByDate = {};
            availableSlots.forEach(slot => {
                const dateKey = (0, date_fns_1.format)(slot.start, 'yyyy-MM-dd');
                if (!slotsByDate[dateKey]) {
                    slotsByDate[dateKey] = [];
                }
                slotsByDate[dateKey].push(slot);
            });
            res.json({
                startDate: (0, date_fns_1.format)(startDate, 'yyyy-MM-dd'),
                endDate: (0, date_fns_1.format)(endDate, 'yyyy-MM-dd'),
                availability: slotsByDate
            });
        }
    }
    catch (error) {
        console.error('Error fetching availability:', error);
        res.status(500).json({ error: 'Failed to fetch availability' });
    }
});
// POST /api/schedulers/public/:slug/book - Book an appointment
router.post('/public/:slug/book', async (req, res) => {
    try {
        const { slug } = req.params;
        const { clientName, clientEmail, clientPhone, scheduledDate, clientNotes, questionnaireResponses } = req.body;
        if (!clientName || !clientEmail || !scheduledDate) {
            return res.status(400).json({
                error: 'Client name, email, and scheduled date are required'
            });
        }
        const [scheduler] = await db_1.db
            .select()
            .from(schema_1.schedulers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.schedulers.slug, slug), (0, drizzle_orm_1.eq)(schema_1.schedulers.isActive, true)));
        if (!scheduler) {
            return res.status(404).json({ error: 'Scheduler not found' });
        }
        const bookingStart = new Date(scheduledDate);
        const bookingEnd = (0, date_fns_1.addMinutes)(bookingStart, scheduler.duration);
        // Verify the slot is still available
        const conflictingBookings = await db_1.db
            .select({ id: schema_1.schedulerBookings.id })
            .from(schema_1.schedulerBookings)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.schedulerBookings.schedulerId, scheduler.id), (0, drizzle_orm_1.ne)(schema_1.schedulerBookings.status, 'cancelled'), (0, drizzle_orm_1.lte)(schema_1.schedulerBookings.scheduledDate, bookingEnd), (0, drizzle_orm_1.gte)(schema_1.schedulerBookings.scheduledEndDate, bookingStart)))
            .limit(1);
        if (conflictingBookings.length > 0) {
            return res.status(409).json({
                error: 'This time slot is no longer available. Please select another time.'
            });
        }
        // Check for existing CRM client
        let clientId = null;
        const existingClients = await db_1.db
            .select({ id: schema_1.crmClients.id })
            .from(schema_1.crmClients)
            .where((0, drizzle_orm_1.eq)(schema_1.crmClients.email, clientEmail.toLowerCase()))
            .limit(1);
        if (existingClients.length > 0) {
            clientId = existingClients[0].id;
        }
        const bookingId = (0, crypto_1.randomUUID)();
        const status = scheduler.autoApprove ? 'confirmed' : 'pending';
        const [booking] = await db_1.db.insert(schema_1.schedulerBookings).values({
            id: bookingId,
            schedulerId: scheduler.id,
            clientId,
            clientName,
            clientEmail: clientEmail.toLowerCase(),
            clientPhone,
            scheduledDate: bookingStart,
            scheduledEndDate: bookingEnd,
            timezone: scheduler.timezone,
            status,
            clientNotes,
            questionnaireResponses,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            source: 'scheduler',
            createdAt: new Date(),
            updatedAt: new Date()
        }).returning();
        // If auto-approve, create the photography session immediately
        let sessionId = null;
        if (scheduler.autoApprove) {
            sessionId = (0, crypto_1.randomUUID)();
            await db_1.db.insert(schema_1.photographySessions).values({
                id: sessionId,
                title: `${scheduler.name} - ${clientName}`,
                description: clientNotes || '',
                sessionType: scheduler.sessionType,
                status: 'scheduled',
                startTime: bookingStart,
                endTime: bookingEnd,
                clientId,
                clientName,
                clientEmail: clientEmail.toLowerCase(),
                clientPhone,
                locationName: scheduler.location,
                basePrice: scheduler.price ? parseFloat(scheduler.price) : 0,
                isOnlineBookable: true,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            // Update booking with session ID
            await db_1.db
                .update(schema_1.schedulerBookings)
                .set({ sessionId, confirmationSent: true, confirmationSentAt: new Date() })
                .where((0, drizzle_orm_1.eq)(schema_1.schedulerBookings.id, bookingId));
        }
        // TODO: Send confirmation email
        res.status(201).json({
            success: true,
            booking: {
                id: bookingId,
                scheduledDate: bookingStart,
                scheduledEndDate: bookingEnd,
                status,
                confirmationNumber: bookingId.slice(0, 8).toUpperCase()
            },
            message: scheduler.autoApprove
                ? 'Your appointment has been confirmed!'
                : 'Your booking request has been received and is pending confirmation.'
        });
    }
    catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ error: 'Failed to create booking' });
    }
});
// Helper function to generate available time slots
function generateAvailableSlots(scheduler, startDate, endDate, existingBookings, existingSessions, blockedTimes, googleBusyTimes) {
    if (!googleBusyTimes) googleBusyTimes = [];
    const slots = [];
    const weeklyAvailability = scheduler.weeklyAvailability;
    const specificDates = scheduler.specificDates;
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const increment = scheduler.availabilityIncrements || 60;
    const duration = scheduler.duration || 60;
    const bufferBefore = scheduler.bufferBefore || 0;
    const bufferAfter = scheduler.bufferAfter || 0;
    const totalBlockedTime = duration + bufferBefore + bufferAfter;
    // Use the scheduler's configured timezone (default: Europe/Vienna)
    const tz = scheduler.timezone || 'Europe/Vienna';
    // Try to load date-fns-tz for timezone handling
    let fromZonedTime, formatInTimeZone;
    try {
        const dateFnsTz = require('date-fns-tz');
        fromZonedTime = dateFnsTz.fromZonedTime;
        formatInTimeZone = dateFnsTz.formatInTimeZone;
    } catch (e) {
        // Fallback: no timezone conversion
        fromZonedTime = null;
        formatInTimeZone = null;
    }
    // For date_range, clamp the iteration window to the scheduler's start/end dates
    let iterStart = startDate;
    let iterEnd = endDate;
    if (scheduler.availabilityType === 'date_range') {
        if (scheduler.startDate && new Date(scheduler.startDate) > iterStart) {
            iterStart = (0, date_fns_1.startOfDay)(new Date(scheduler.startDate));
        }
        if (scheduler.endDate && new Date(scheduler.endDate) < iterEnd) {
            iterEnd = (0, date_fns_1.endOfDay)(new Date(scheduler.endDate));
        }
        if (iterStart > iterEnd) return slots;
    }
    // Iterate through each day in the range
    const days = (0, date_fns_1.eachDayOfInterval)({ start: iterStart, end: iterEnd });
    for (const day of days) {
        // Determine the time windows for this day based on availability type
        let dayWindows = [];
        if (scheduler.availabilityType === 'specific_dates' && specificDates) {
            // Only allow dates explicitly listed in specificDates
            const dayStr = (0, date_fns_1.format)(day, 'yyyy-MM-dd');
            const match = specificDates.find(sd => sd.date === dayStr);
            if (!match) continue; // Day not in the allowed specific dates
            dayWindows = match.windows || [];
            // If the specific date entry has no windows, use the weekly availability as fallback
            if (dayWindows.length === 0 && weeklyAvailability) {
                const dayOfWeek = (0, date_fns_1.getDay)(day);
                const dayName = dayNames[dayOfWeek];
                dayWindows = weeklyAvailability[dayName] || [];
            }
        } else {
            // For 'ongoing' and 'date_range', use weekly availability
            if (!weeklyAvailability) continue;
            const dayOfWeek = (0, date_fns_1.getDay)(day);
            const dayName = dayNames[dayOfWeek];
            dayWindows = weeklyAvailability[dayName] || [];
        }
        if (dayWindows.length === 0) continue;
        // Count bookings for this day (for maxPerDay check)
        const dayStart = (0, date_fns_1.startOfDay)(day);
        const dayEnd = (0, date_fns_1.endOfDay)(day);
        const bookingsOnDay = existingBookings.filter(b => {
            const bookingDate = new Date(b.scheduledDate);
            return bookingDate >= dayStart && bookingDate <= dayEnd;
        });
        if (scheduler.maxPerDay && bookingsOnDay.length >= scheduler.maxPerDay)
            continue;
        // Generate slots for each availability window
        for (const window of dayWindows) {
            const [startHour, startMin] = window.start.split(':').map(Number);
            const [endHour, endMin] = window.end.split(':').map(Number);
            // Use fromZonedTime for timezone-correct conversion if available
            const localSlotStart = (0, date_fns_1.setMinutes)((0, date_fns_1.setHours)(day, startHour), startMin);
            let slotStart = fromZonedTime ? fromZonedTime(localSlotStart, tz) : localSlotStart;
            const localWindowEnd = (0, date_fns_1.setMinutes)((0, date_fns_1.setHours)(day, endHour), endMin);
            const windowEnd = fromZonedTime ? fromZonedTime(localWindowEnd, tz) : localWindowEnd;
            while ((0, date_fns_1.addMinutes)(slotStart, totalBlockedTime) <= windowEnd) {
                const slotEnd = (0, date_fns_1.addMinutes)(slotStart, duration);
                const bufferedStart = (0, date_fns_1.addMinutes)(slotStart, -bufferBefore);
                const bufferedEnd = (0, date_fns_1.addMinutes)(slotEnd, bufferAfter);
                // Check if slot is in the future (with min notice)
                const minNoticeTime = (0, date_fns_1.addMinutes)(new Date(), scheduler.minNotice * 60);
                if (slotStart < minNoticeTime) {
                    slotStart = (0, date_fns_1.addMinutes)(slotStart, increment);
                    continue;
                }
                // Check for conflicts with existing bookings
                const hasBookingConflict = existingBookings.some(booking => {
                    const bookingStart = new Date(booking.scheduledDate);
                    const bookingEnd = new Date(booking.scheduledEndDate);
                    return bufferedStart < bookingEnd && bufferedEnd > bookingStart;
                });
                // Check for conflicts with existing sessions
                const hasSessionConflict = existingSessions.some(session => {
                    const sessionStart = new Date(session.startTime);
                    const sessionEnd = new Date(session.endTime);
                    return bufferedStart < sessionEnd && bufferedEnd > sessionStart;
                });
                // Check for blocked times
                const isBlocked = blockedTimes.some(blocked => {
                    const blockedStart = new Date(blocked.startDate);
                    const blockedEnd = new Date(blocked.endDate);
                    return slotStart < blockedEnd && slotEnd > blockedStart;
                });
                // Check for Google Calendar conflicts
                const hasGoogleConflict = googleBusyTimes.some(busy => {
                    return bufferedStart < busy.end && bufferedEnd > busy.start;
                });
                if (!hasBookingConflict && !hasSessionConflict && !isBlocked && !hasGoogleConflict) {
                    slots.push({
                        start: slotStart,
                        end: slotEnd,
                        formatted: formatInTimeZone ? formatInTimeZone(slotStart, tz, 'HH:mm') : (0, date_fns_1.format)(slotStart, 'HH:mm')
                    });
                }
                slotStart = (0, date_fns_1.addMinutes)(slotStart, increment);
            }
        }
    }
    return slots;
}
exports.default = router;

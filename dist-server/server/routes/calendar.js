"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const schema_1 = require("../../shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
const calendarService_1 = require("../services/calendarService");
const router = (0, express_1.Router)();
// POST /api/calendar/import-google-events - Import all Google Calendar events (past and future) into CRM
router.post('/import-google-events', async (req, res) => {
    try {
        const { fromDate } = req.body;
        const result = await (0, calendarService_1.importGoogleCalendarEvents)(fromDate ? new Date(fromDate) : undefined);
        res.json({ success: true, ...result });
    }
    catch (error) {
        console.error('Failed to import Google Calendar events:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// GET /api/calendar/sessions - Retrieve calendar sessions with filters
router.get('/sessions', async (req, res) => {
    try {
        const { start_date, end_date, client_id, session_type, status, limit = '20' } = req.query;
        const baseQuery = db_1.db.select({
            id: schema_1.photographySessions.id,
            clientId: schema_1.photographySessions.clientId,
            sessionType: schema_1.photographySessions.sessionType,
            startTime: schema_1.photographySessions.startTime,
            endTime: schema_1.photographySessions.endTime,
            locationName: schema_1.photographySessions.locationName,
            notes: schema_1.photographySessions.notes,
            basePrice: schema_1.photographySessions.basePrice,
            depositAmount: schema_1.photographySessions.depositAmount,
            equipmentList: schema_1.photographySessions.equipmentList,
            status: schema_1.photographySessions.status,
            createdAt: schema_1.photographySessions.createdAt,
            updatedAt: schema_1.photographySessions.updatedAt
        }).from(schema_1.photographySessions);
        // Apply filters
        const conditions = [];
        if (start_date) {
            conditions.push((0, drizzle_orm_1.gte)(schema_1.photographySessions.startTime, new Date(start_date)));
        }
        if (end_date) {
            conditions.push((0, drizzle_orm_1.lte)(schema_1.photographySessions.startTime, new Date(end_date)));
        }
        if (client_id) {
            conditions.push((0, drizzle_orm_1.eq)(schema_1.photographySessions.clientId, client_id));
        }
        if (session_type) {
            conditions.push((0, drizzle_orm_1.eq)(schema_1.photographySessions.sessionType, session_type));
        }
        if (status) {
            conditions.push((0, drizzle_orm_1.eq)(schema_1.photographySessions.status, status));
        }
        const finalQuery = conditions.length > 0
            ? baseQuery.where((0, drizzle_orm_1.and)(...conditions))
            : baseQuery;
        const sessions = await finalQuery
            .orderBy((0, drizzle_orm_1.asc)(schema_1.photographySessions.startTime))
            .limit(parseInt(limit));
        res.json(sessions);
    }
    catch (error) {
        console.error('Failed to fetch calendar sessions:', error);
        res.status(500).json({ error: 'Failed to fetch calendar sessions' });
    }
});
// POST /api/calendar/sessions - Create new photography session
router.post('/sessions', async (req, res) => {
    try {
        const { client_id, session_type, session_date, duration_minutes = 120, location, notes = '', price = 0, deposit_required = 0, equipment_needed = [] } = req.body;
        // Validate required fields
        if (!client_id || !session_type || !session_date || !location) {
            return res.status(400).json({
                error: 'Missing required fields: client_id, session_type, session_date, location'
            });
        }
        const sessionId = crypto.randomUUID();
        const [newSession] = await db_1.db.insert(schema_1.photographySessions).values({
            id: sessionId,
            clientId: client_id,
            sessionType: session_type,
            startTime: new Date(session_date),
            endTime: new Date(new Date(session_date).getTime() + (duration_minutes || 120) * 60000),
            locationName: location,
            notes,
            basePrice: price,
            depositAmount: deposit_required,
            equipmentList: equipment_needed,
            status: 'CONFIRMED',
            createdAt: new Date(),
            updatedAt: new Date()
        }).returning();
        res.status(201).json(newSession);
    }
    catch (error) {
        console.error('Failed to create photography session:', error);
        res.status(500).json({ error: 'Failed to create photography session' });
    }
});
// PUT /api/calendar/sessions/:id - Update photography session
router.put('/sessions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };
        // Remove ID from update data
        delete updateData.id;
        // Convert session_date if provided
        if (updateData.session_date) {
            updateData.startTime = new Date(updateData.session_date);
            delete updateData.session_date;
        }
        // Convert equipment_needed to JSON string if provided
        if (updateData.equipment_needed && Array.isArray(updateData.equipment_needed)) {
            updateData.equipmentList = updateData.equipment_needed;
            delete updateData.equipment_needed;
        }
        // Set updated timestamp
        updateData.updatedAt = new Date();
        const [updatedSession] = await db_1.db
            .update(schema_1.photographySessions)
            .set(updateData)
            .where((0, drizzle_orm_1.eq)(schema_1.photographySessions.id, id))
            .returning();
        if (!updatedSession) {
            return res.status(404).json({ error: 'Session not found' });
        }
        res.json(updatedSession);
    }
    catch (error) {
        console.error('Failed to update photography session:', error);
        res.status(500).json({ error: 'Failed to update photography session' });
    }
});
// DELETE /api/calendar/sessions/:id - Cancel/Delete photography session
router.delete('/sessions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { cancellation_reason, refund_amount = 0 } = req.body;
        const [cancelledSession] = await db_1.db
            .update(schema_1.photographySessions)
            .set({
            status: 'CANCELLED',
            cancellation_reason,
            refund_amount,
            updatedAt: new Date()
        })
            .where((0, drizzle_orm_1.eq)(schema_1.photographySessions.id, id))
            .returning();
        if (!cancelledSession) {
            return res.status(404).json({ error: 'Session not found' });
        }
        res.json({
            message: 'Session cancelled successfully',
            session: cancelledSession
        });
    }
    catch (error) {
        console.error('Failed to cancel photography session:', error);
        res.status(500).json({ error: 'Failed to cancel photography session' });
    }
});
// GET /api/calendar/availability - Check calendar availability
router.get('/availability', async (req, res) => {
    try {
        const { date, duration_minutes = '120' } = req.query;
        if (!date) {
            return res.status(400).json({ error: 'Date parameter is required' });
        }
        // Get existing sessions for the date
        const existingSessions = await db_1.db
            .select({
            startTime: schema_1.photographySessions.startTime,
            endTime: schema_1.photographySessions.endTime
        })
            .from(schema_1.photographySessions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_1.photographySessions.startTime, new Date(date)), (0, drizzle_orm_1.lte)(schema_1.photographySessions.startTime, new Date(`${date} 23:59:59`)), (0, drizzle_orm_1.eq)(schema_1.photographySessions.status, 'CONFIRMED')))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.photographySessions.startTime));
        // Define working hours (9 AM to 6 PM)
        const workingHours = { start: 9, end: 18 };
        const requestedDuration = parseInt(duration_minutes);
        const availableSlots = [];
        const bookedSlots = existingSessions.map((session) => {
            const start = new Date(session.startTime);
            const end = new Date(session.endTime);
            return {
                start: start.getHours() + (start.getMinutes() / 60),
                end: end.getHours() + (end.getMinutes() / 60)
            };
        });
        // Check each hour slot
        for (let hour = workingHours.start; hour < workingHours.end; hour++) {
            const slotEnd = hour + (requestedDuration / 60);
            if (slotEnd <= workingHours.end) {
                const isAvailable = !bookedSlots.some(booked => (hour < booked.end && slotEnd > booked.start));
                if (isAvailable) {
                    availableSlots.push({
                        time: `${hour.toString().padStart(2, '0')}:00`,
                        duration: `${requestedDuration} minutes`
                    });
                }
            }
        }
        res.json({
            date,
            total_available_slots: availableSlots.length,
            available_slots: availableSlots,
            booked_sessions: existingSessions.length
        });
    }
    catch (error) {
        console.error('Failed to check calendar availability:', error);
        res.status(500).json({ error: 'Failed to check calendar availability' });
    }
});
exports.default = router;

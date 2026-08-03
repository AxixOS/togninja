import { Router } from 'express';
import { db } from '../db';
import { photographySessions } from '../../shared/schema';
import { eq, desc, asc, and, gte, lte, like } from 'drizzle-orm';
import StudioCalendarService, { importGoogleCalendarEvents } from '../services/calendarService';

const router = Router();

// POST /api/calendar/import-google-events - Import all Google Calendar events (past and future) into CRM
router.post('/import-google-events', async (req, res) => {
  try {
    const { fromDate } = req.body;
    const result = await importGoogleCalendarEvents(fromDate ? new Date(fromDate) : undefined);
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Failed to import Google Calendar events:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/calendar/sessions - Retrieve calendar sessions with filters
router.get('/sessions', async (req, res) => {
  try {
    const { 
      start_date, 
      end_date, 
      client_id, 
      session_type, 
      status,
      limit = '20'
    } = req.query;

  const baseQuery = db.select({
      id: photographySessions.id,
      clientId: photographySessions.clientId,
      sessionType: photographySessions.sessionType,
      startTime: photographySessions.startTime,
      endTime: photographySessions.endTime,
      locationName: photographySessions.locationName,
      notes: photographySessions.notes,
      basePrice: photographySessions.basePrice,
      depositAmount: photographySessions.depositAmount,
      equipmentList: photographySessions.equipmentList,
      status: photographySessions.status,
      createdAt: photographySessions.createdAt,
      updatedAt: photographySessions.updatedAt
  }).from(photographySessions);

    // Apply filters
    const conditions = [];
    
    if (start_date) {
      conditions.push(gte(photographySessions.startTime, new Date(start_date as string)));
    }
    
    if (end_date) {
      conditions.push(lte(photographySessions.startTime, new Date(end_date as string)));
    }
    
    if (client_id) {
      conditions.push(eq(photographySessions.clientId, client_id as string));
    }
    
    if (session_type) {
      conditions.push(eq(photographySessions.sessionType, session_type as any));
    }
    
    if (status) {
      conditions.push(eq(photographySessions.status, status as any));
    }

    const finalQuery = conditions.length > 0
      ? baseQuery.where(and(...conditions))
      : baseQuery;

  const sessions = await finalQuery
      .orderBy(asc(photographySessions.startTime))
      .limit(parseInt(limit as string));

    res.json(sessions);
  } catch (error) {
    console.error('Failed to fetch calendar sessions:', error);
    res.status(500).json({ error: 'Failed to fetch calendar sessions' });
  }
});

// POST /api/calendar/sessions - Create new photography session
router.post('/sessions', async (req, res) => {
  try {
    const {
      client_id,
      session_type,
      session_date,
      duration_minutes = 120,
      location,
      notes = '',
      price = 0,
      deposit_required = 0,
      equipment_needed = []
    } = req.body;

    // Validate required fields
    if (!client_id || !session_type || !session_date || !location) {
      return res.status(400).json({ 
        error: 'Missing required fields: client_id, session_type, session_date, location' 
      });
    }

    const sessionId = crypto.randomUUID();

    const [newSession] = await db.insert(photographySessions).values({
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
    } as any).returning();

    res.status(201).json(newSession);
  } catch (error) {
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
      updateData.startTime = new Date(updateData.session_date as string);
      delete updateData.session_date;
    }
    
    // Convert equipment_needed to JSON string if provided
    if (updateData.equipment_needed && Array.isArray(updateData.equipment_needed)) {
      updateData.equipmentList = updateData.equipment_needed;
      delete updateData.equipment_needed;
    }
    
    // Set updated timestamp
  updateData.updatedAt = new Date();

    const [updatedSession] = await db
      .update(photographySessions)
      .set(updateData as any)
      .where(eq(photographySessions.id, id))
      .returning();

    if (!updatedSession) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(updatedSession);
  } catch (error) {
    console.error('Failed to update photography session:', error);
    res.status(500).json({ error: 'Failed to update photography session' });
  }
});

// DELETE /api/calendar/sessions/:id - Cancel/Delete photography session
router.delete('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { cancellation_reason, refund_amount = 0 } = req.body;

    const [cancelledSession] = await db
      .update(photographySessions)
      .set({
        status: 'CANCELLED',
        cancellation_reason,
        refund_amount,
        updatedAt: new Date()
      } as any)
      .where(eq(photographySessions.id, id))
      .returning();

    if (!cancelledSession) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ 
      message: 'Session cancelled successfully', 
      session: cancelledSession 
    });
  } catch (error) {
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
    const existingSessions = await db
      .select({
        startTime: photographySessions.startTime,
        endTime: photographySessions.endTime
      })
      .from(photographySessions)
      .where(
        and(
          gte(photographySessions.startTime, new Date(date as string)),
          lte(photographySessions.startTime, new Date(`${date} 23:59:59`)),
          eq(photographySessions.status, 'CONFIRMED')
        )
      )
      .orderBy(asc(photographySessions.startTime));

    // Define working hours (9 AM to 6 PM)
    const workingHours = { start: 9, end: 18 };
    const requestedDuration = parseInt(duration_minutes as string);

    const availableSlots = [];
    const bookedSlots = existingSessions.map((session: any) => {
      const start = new Date(session.startTime as string);
      const end = new Date(session.endTime as string);
      return {
        start: start.getHours() + (start.getMinutes() / 60),
        end: end.getHours() + (end.getMinutes() / 60)
      };
    });

    // Check each hour slot
    for (let hour = workingHours.start; hour < workingHours.end; hour++) {
      const slotEnd = hour + (requestedDuration / 60);
      
      if (slotEnd <= workingHours.end) {
        const isAvailable = !bookedSlots.some(booked => 
          (hour < booked.end && slotEnd > booked.start)
        );

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
  } catch (error) {
    console.error('Failed to check calendar availability:', error);
    res.status(500).json({ error: 'Failed to check calendar availability' });
  }
});

export default router;
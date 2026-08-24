/**
 * Scheduler Routes
 * Client Self-Booking System - like Sprout Studio Schedulers
 * 
 * Allows photographers to create booking links that clients can use
 * to self-schedule appointments based on availability.
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { 
  schedulers, 
  schedulerBookings, 
  schedulerBlockedTimes,
  photographySessions,
  crmClients,
  questionnaires
} from '../../shared/schema';
import { eq, and, gte, lte, gt, lt, desc, asc, or, isNull, ne } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { sendBookingConfirmation } from '../lib/bookingEmails';
import { 
  addMinutes, 
  addDays, 
  startOfDay, 
  endOfDay, 
  format, 
  parseISO, 
  isWithinInterval,
  eachDayOfInterval,
  getDay,
  setHours,
  setMinutes
} from 'date-fns';
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import {
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  getGoogleCalendarBusyTimes,
  GCalUnavailableError,
  getGCalHealthState,
  isGoogleCalendarConfigured,
  runGCalHealthCheck
} from '../services/schedulerGoogleCalendar';

const router = Router();

// ==================== ADMIN ROUTES (require auth) ====================

// GET /api/schedulers/gcal-health - Health status for the admin banner.
// Returns the in-memory health state populated by the periodic health-check
// cron and by every availability/booking call. `?probe=1` forces a fresh probe.
router.get('/gcal-health', async (req: Request, res: Response) => {
  try {
    if (req.query.probe === '1') {
      await runGCalHealthCheck();
    }
    const configured = await isGoogleCalendarConfigured();
    const state = getGCalHealthState();
    res.json({
      configured,
      ...state,
    });
  } catch (error: any) {
    console.error('Error reading GCal health:', error);
    res.status(500).json({ error: 'Failed to read Google Calendar health' });
  }
});

// GET /api/schedulers - List all schedulers
router.get('/', async (req: Request, res: Response) => {
  try {
    const allSchedulers = await db
      .select()
      .from(schedulers)
      .orderBy(desc(schedulers.createdAt));
    
    res.json(allSchedulers);
  } catch (error) {
    console.error('Error fetching schedulers:', error);
    res.status(500).json({ error: 'Failed to fetch schedulers' });
  }
});

// GET /api/schedulers/:id - Get single scheduler
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const [scheduler] = await db
      .select()
      .from(schedulers)
      .where(eq(schedulers.id, id));
    
    if (!scheduler) {
      return res.status(404).json({ error: 'Scheduler not found' });
    }
    
    res.json(scheduler);
  } catch (error) {
    console.error('Error fetching scheduler:', error);
    res.status(500).json({ error: 'Failed to fetch scheduler' });
  }
});

// POST /api/schedulers - Create new scheduler
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      name,
      slug: customSlug,
      description,
      sessionType = 'portrait',
      duration = 60,
      location,
      price,
      availabilityType = 'ongoing',
      startDate,
      endDate,
      // The studio's own timezone. This literal was the ORIGIN studio's, so a
      // Shreveport studio's first scheduler was created in Vienna time and offered
      // their nine-to-five to clients as two in the morning. DEFAULT_CAL_TZ is
      // hydrated from studio_configs.timezone at boot.
      timezone = process.env.DEFAULT_CAL_TZ || 'UTC',
      weeklyAvailability,
      specificDates,
      bufferBefore = 0,
      bufferAfter = 0,
      minNotice = 24,
      maxAdvance = 90,
      maxPerDay,
      availabilityIncrements = 60,
      confirmationMessage,
      questionnaireId,
      autoApprove = true,
      sendReminders = true,
      reminderHours = 24,
      reminderTimings,
      reminderEmailSubject,
      reminderEmailBody,
      brandName,
      brandColor = '#0d9488'
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Scheduler name is required' });
    }

    // Use custom slug if provided, otherwise generate from name
    const baseSlug = (customSlug || name).toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    
    // Check for slug uniqueness and append random suffix if needed
    const existingSlug = await db
      .select({ slug: schedulers.slug })
      .from(schedulers)
      .where(eq(schedulers.slug, baseSlug));
    
    const slug = existingSlug.length > 0 
      ? `${baseSlug}-${randomUUID().slice(0, 8)}`
      : baseSlug;

    const id = randomUUID();

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

    const [newScheduler] = await db.insert(schedulers).values({
      id,
      name,
      slug,
      description,
      sessionType,
      duration,
      location,
      price: (price !== undefined && price !== null && price !== '') ? price.toString() : '0',
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
      reminderTimings: reminderTimings || null,
      reminderEmailSubject: reminderEmailSubject || null,
      reminderEmailBody: reminderEmailBody || null,
      brandName,
      brandColor,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    res.status(201).json(newScheduler);
  } catch (error: any) {
    console.error('Error creating scheduler:', error);
    res.status(500).json({ error: 'Failed to create scheduler', detail: error?.message || String(error) });
  }
});

// PUT /api/schedulers/:id - Update scheduler
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updatedAt: new Date() };
    
    // Don't allow changing ID
    delete updates.id;
    delete updates.createdAt;

    // Validate slug uniqueness if slug is being changed
    if (updates.slug !== undefined && updates.slug !== '') {
      const cleanSlug = updates.slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '').replace(/--+/g, '-');
      if (!cleanSlug) {
        return res.status(400).json({ error: 'Invalid slug. Use only lowercase letters, numbers, and hyphens.' });
      }
      const existing = await db
        .select({ id: schedulers.id })
        .from(schedulers)
        .where(and(eq(schedulers.slug, cleanSlug), ne(schedulers.id, id)));
      if (existing.length > 0) {
        return res.status(409).json({ error: `The slug "${cleanSlug}" is already in use by another scheduler.` });
      }
      updates.slug = cleanSlug;
    } else if (updates.slug === '') {
      delete updates.slug; // Don't clear slug to empty
    }

    // Convert price to string if provided (empty string → '0' for decimal column)
    if (updates.price !== undefined) {
      updates.price = (updates.price !== null && updates.price !== '') ? updates.price.toString() : '0';
    }

    // Convert dates (empty strings → null for timestamp columns)
    if (updates.startDate !== undefined) {
      updates.startDate = updates.startDate ? new Date(updates.startDate) : null;
    }
    if (updates.endDate !== undefined) {
      updates.endDate = updates.endDate ? new Date(updates.endDate) : null;
    }

    const [updated] = await db
      .update(schedulers)
      .set(updates)
      .where(eq(schedulers.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Scheduler not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating scheduler:', error);
    res.status(500).json({ error: 'Failed to update scheduler' });
  }
});

// DELETE /api/schedulers/:id - Delete scheduler
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check for existing bookings
    const existingBookings = await db
      .select({ id: schedulerBookings.id })
      .from(schedulerBookings)
      .where(and(
        eq(schedulerBookings.schedulerId, id),
        ne(schedulerBookings.status, 'cancelled')
      ))
      .limit(1);

    if (existingBookings.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete scheduler with active bookings. Cancel or complete bookings first.' 
      });
    }

    const [deleted] = await db
      .delete(schedulers)
      .where(eq(schedulers.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Scheduler not found' });
    }

    res.json({ message: 'Scheduler deleted successfully' });
  } catch (error) {
    console.error('Error deleting scheduler:', error);
    res.status(500).json({ error: 'Failed to delete scheduler' });
  }
});

// GET /api/schedulers/:id/bookings - Get bookings for a scheduler
router.get('/:id/bookings', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, from, to } = req.query;

    let conditions = [eq(schedulerBookings.schedulerId, id)];
    
    if (status) {
      conditions.push(eq(schedulerBookings.status, status as string));
    }
    if (from) {
      conditions.push(gte(schedulerBookings.scheduledDate, new Date(from as string)));
    }
    if (to) {
      conditions.push(lte(schedulerBookings.scheduledDate, new Date(to as string)));
    }

    const bookings = await db
      .select()
      .from(schedulerBookings)
      .where(and(...conditions))
      .orderBy(asc(schedulerBookings.scheduledDate));

    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// GET /api/schedulers/bookings/all - Get all bookings across all schedulers
router.get('/bookings/all', async (req: Request, res: Response) => {
  try {
    const { status, from, to } = req.query;

    let conditions: any[] = [];
    
    if (status) {
      conditions.push(eq(schedulerBookings.status, status as string));
    }
    if (from) {
      conditions.push(gte(schedulerBookings.scheduledDate, new Date(from as string)));
    }
    if (to) {
      conditions.push(lte(schedulerBookings.scheduledDate, new Date(to as string)));
    }

    const bookings = await db
      .select({
        booking: schedulerBookings,
        scheduler: schedulers
      })
      .from(schedulerBookings)
      .leftJoin(schedulers, eq(schedulerBookings.schedulerId, schedulers.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(schedulerBookings.scheduledDate));

    res.json(bookings);
  } catch (error) {
    console.error('Error fetching all bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// DELETE /api/schedulers/bookings/:bookingId - Delete a booking
router.delete('/bookings/:bookingId', async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;

    const [deleted] = await db
      .delete(schedulerBookings)
      .where(eq(schedulerBookings.id, bookingId))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({ message: 'Booking deleted successfully' });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ error: 'Failed to delete booking' });
  }
});

// PUT /api/schedulers/bookings/:bookingId/status - Update booking status
router.put('/bookings/:bookingId/status', async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const { status, cancellationReason } = req.body;

    const updateData: any = { 
      status, 
      updatedAt: new Date() 
    };

    if (status === 'cancelled') {
      updateData.cancelledAt = new Date();
      updateData.cancellationReason = cancellationReason;
    }

    // Fetch the current booking to check for Google Calendar event
    const [currentBooking] = await db
      .select()
      .from(schedulerBookings)
      .where(eq(schedulerBookings.id, bookingId));

    const [updated] = await db
      .update(schedulerBookings)
      .set(updateData)
      .where(eq(schedulerBookings.id, bookingId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // If confirmed and autoApprove, create a photography session
    if (status === 'confirmed' && !updated.sessionId) {
      const [scheduler] = await db
        .select()
        .from(schedulers)
        .where(eq(schedulers.id, updated.schedulerId));

      if (scheduler) {
        const sessionId = randomUUID();
        await db.insert(photographySessions).values({
          id: sessionId,
          title: `${scheduler.name} - ${updated.clientName}`,
          description: updated.clientNotes || '',
          sessionType: scheduler.sessionType,
          status: 'scheduled',
          startTime: updated.scheduledDate,
          endTime: updated.scheduledEndDate,
          // The auto-approve path sets clientId; this one did not, so a booking the
          // studio confirmed BY HAND produced a calendar session with no link to the
          // client record — invisible until someone opened the client and found the
          // shoot missing. The id is already on the booking row.
          clientId: updated.clientId,
          clientName: updated.clientName,
          clientEmail: updated.clientEmail,
          clientPhone: updated.clientPhone,
          locationName: scheduler.location,
          basePrice: scheduler.price ? parseFloat(scheduler.price) : 0,
          createdAt: new Date(),
          updatedAt: new Date()
        } as any);

        // The other transition to confirmed, and the other place a client heard nothing.
        const mailed = await sendBookingConfirmation({
          booking: {
            id: bookingId,
            clientName: updated.clientName,
            clientEmail: updated.clientEmail,
            clientPhone: updated.clientPhone,
            clientNotes: updated.clientNotes,
            scheduledDate: updated.scheduledDate,
            scheduledEndDate: updated.scheduledEndDate,
          },
          scheduler: {
            name: scheduler.name, location: scheduler.location,
            confirmationMessage: scheduler.confirmationMessage, timezone: scheduler.timezone,
          },
        });
        if (mailed.problem) console.warn(`[scheduler] booking ${bookingId}: ${mailed.problem}`);

        await db
          .update(schedulerBookings)
          .set({
            sessionId,
            confirmationSent: mailed.clientEmailed,
            confirmationSentAt: mailed.clientEmailed ? new Date() : null,
          })
          .where(eq(schedulerBookings.id, bookingId));

        updated.sessionId = sessionId;

        // Create Google Calendar event for newly confirmed booking
        try {
          const gcalEventId = await createGoogleCalendarEvent({
            summary: `${scheduler.name} - ${updated.clientName}`,
            description: `Booked via Scheduler\nClient: ${updated.clientName}\nEmail: ${updated.clientEmail}${updated.clientPhone ? '\nPhone: ' + updated.clientPhone : ''}${updated.clientNotes ? '\nNotes: ' + updated.clientNotes : ''}`,
            location: scheduler.location || undefined,
            startTime: new Date(updated.scheduledDate),
            endTime: new Date(updated.scheduledEndDate),
            clientEmail: updated.clientEmail,
            clientName: updated.clientName,
          });

          if (gcalEventId) {
            await db
              .update(schedulerBookings)
              .set({ googleCalendarEventId: gcalEventId })
              .where(eq(schedulerBookings.id, bookingId));
            await db
              .update(photographySessions)
              .set({ googleCalendarEventId: gcalEventId } as any)
              .where(eq(photographySessions.id, sessionId));
          }
        } catch (gcalErr) {
          console.warn('[Scheduler] GCal event creation on confirm failed:', gcalErr);
        }
      }
    }

    // If cancelled, delete the Google Calendar event
    if (status === 'cancelled' && currentBooking?.googleCalendarEventId) {
      try {
        await deleteGoogleCalendarEvent(currentBooking.googleCalendarEventId);
        await db
          .update(schedulerBookings)
          .set({ googleCalendarEventId: null })
          .where(eq(schedulerBookings.id, bookingId));
      } catch (gcalErr) {
        console.warn('[Scheduler] GCal event deletion on cancel failed:', gcalErr);
      }
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ error: 'Failed to update booking status' });
  }
});

// POST /api/schedulers/:id/blocked-times - Add blocked time
router.post('/:id/blocked-times', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, startDate, endDate, isAllDay, reason } = req.body;

    const blockedTime = await db.insert(schedulerBlockedTimes).values({
      id: randomUUID(),
      schedulerId: id === 'all' ? null : id,
      title,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isAllDay: isAllDay || false,
      reason,
      createdAt: new Date()
    }).returning();

    res.status(201).json(blockedTime[0]);
  } catch (error) {
    console.error('Error creating blocked time:', error);
    res.status(500).json({ error: 'Failed to create blocked time' });
  }
});

// DELETE /api/schedulers/blocked-times/:blockedTimeId - Remove blocked time
router.delete('/blocked-times/:blockedTimeId', async (req: Request, res: Response) => {
  try {
    const { blockedTimeId } = req.params;

    const [deleted] = await db
      .delete(schedulerBlockedTimes)
      .where(eq(schedulerBlockedTimes.id, blockedTimeId))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Blocked time not found' });
    }

    res.json({ message: 'Blocked time deleted successfully' });
  } catch (error) {
    console.error('Error deleting blocked time:', error);
    res.status(500).json({ error: 'Failed to delete blocked time' });
  }
});

// ==================== PUBLIC ROUTES (no auth required) ====================

// GET /api/schedulers/public/_index - Every session type a client may book.
//
// THE PATH SHAPE IS LOAD-BEARING IN THREE WAYS, none of which any guard can see:
//   1. It must sit under '/public/' WITH the trailing slash. The auth gate in
//      server/routes.ts exempts exactly req.path.startsWith('/public/'), so a sibling
//      named '/api/schedulers/public' would 401 every anonymous visitor - which reads
//      as a broken session rather than as a routing mistake.
//   2. It must have two segments. A one-segment path is matched first by
//      router.get('/:id') above, which looks up a scheduler whose id is 'public' and
//      answers 404 'Scheduler not found'.
//   3. It must stay ABOVE '/public/:slug' below, or that param route swallows it and
//      answers the same 404. scripts/route-dupes.mjs compares literal path strings and
//      cannot see param-route shadowing, so a later reorder would fail silently and no
//      script would catch it. This comment is the only warning there is.
// '_index' can never collide with a real slug: both slug writers replace every
// character outside their own allow-list with '-' (POST / uses [^a-z0-9], PUT /:id
// uses [^a-z0-9-]), and neither list contains an underscore.
//
// Deliberately NO availability here. /public/:slug/availability below fans out to
// Google Calendar busy lookups; doing that per row would cost one GCal round trip per
// session type per page view, on a page that only needs to list what exists.
router.get('/public/_index', async (req: Request, res: Response) => {
  try {
    // isActive is the ENTIRE notion of 'published' - the table has no draft state - so
    // it is the only predicate. That deliberately matches /public/:slug below: a
    // date_range scheduler whose endDate has passed still answers there, so excluding
    // it here would leave the product with two different answers to 'is this bookable'.
    const activeSchedulers = await db
      .select({
        // Key names copied from the projection in /public/:slug below rather than
        // retyped: Drizzle silently DROPS a key that is not a table property, so a typo
        // here would not error, it would render a blank field on the card.
        name: schedulers.name,
        slug: schedulers.slug,
        description: schedulers.description,
        sessionType: schedulers.sessionType,
        duration: schedulers.duration,
        location: schedulers.location,
        price: schedulers.price,
        brandColor: schedulers.brandColor
      })
      .from(schedulers)
      .where(eq(schedulers.isActive, true))
      .orderBy(asc(schedulers.name));

    // A bare array, matching GET / above. No id and no questionnaireId: a card needs
    // neither, and this payload is served to anyone on the internet.
    res.json(activeSchedulers);
  } catch (error) {
    console.error('Error fetching public scheduler index:', error);
    res.status(500).json({ error: 'Failed to fetch schedulers' });
  }
});

// GET /api/schedulers/public/:slug - Get public scheduler info by slug
router.get('/public/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const [scheduler] = await db
      .select({
        id: schedulers.id,
        name: schedulers.name,
        slug: schedulers.slug,
        description: schedulers.description,
        sessionType: schedulers.sessionType,
        duration: schedulers.duration,
        location: schedulers.location,
        price: schedulers.price,
        timezone: schedulers.timezone,
        availabilityIncrements: schedulers.availabilityIncrements,
        brandName: schedulers.brandName,
        brandColor: schedulers.brandColor,
        questionnaireId: schedulers.questionnaireId,
        isActive: schedulers.isActive
      })
      .from(schedulers)
      .where(eq(schedulers.slug, slug));

    if (!scheduler) {
      return res.status(404).json({ error: 'Scheduler not found' });
    }

    if (!scheduler.isActive) {
      return res.status(404).json({ error: 'This scheduler is not currently available' });
    }

    // If there's a questionnaire, fetch its fields
    let questionnaireFields = null;
    if (scheduler.questionnaireId) {
      const [questionnaire] = await db
        .select({ fields: questionnaires.fields })
        .from(questionnaires)
        .where(eq(questionnaires.id, scheduler.questionnaireId));
      
      questionnaireFields = questionnaire?.fields;
    }

    res.json({ ...scheduler, questionnaireFields });
  } catch (error) {
    console.error('Error fetching public scheduler:', error);
    res.status(500).json({ error: 'Failed to fetch scheduler' });
  }
});

// GET /api/schedulers/public/:slug/availability - Get available time slots
router.get('/public/:slug/availability', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { date, month } = req.query;

    const [scheduler] = await db
      .select()
      .from(schedulers)
      .where(and(eq(schedulers.slug, slug), eq(schedulers.isActive, true)));

    if (!scheduler) {
      return res.status(404).json({ error: 'Scheduler not found' });
    }

    // Get date range to check
    let startDate: Date;
    let endDate: Date;

    if (month) {
      // Return availability for entire month
      const [year, monthNum] = (month as string).split('-').map(Number);
      startDate = new Date(year, monthNum - 1, 1);
      endDate = new Date(year, monthNum, 0); // Last day of month
    } else if (date) {
      // Return time slots for specific date
      startDate = startOfDay(parseISO(date as string));
      endDate = endOfDay(parseISO(date as string));
    } else {
      // Return next 30 days
      startDate = startOfDay(new Date());
      endDate = addDays(startDate, 30);
    }

    // Apply min notice rule
    const minDate = addMinutes(new Date(), scheduler.minNotice * 60);
    if (startDate < minDate) startDate = minDate;

    // Apply max advance rule — but NOT for specific_dates availability,
    // because the photographer explicitly chose those dates and they
    // should all be bookable regardless of the maxAdvance window.
    if (scheduler.availabilityType !== 'specific_dates') {
      const maxDate = addDays(new Date(), scheduler.maxAdvance);
      if (endDate > maxDate) endDate = maxDate;
    }

    // Get existing bookings for this scheduler
    const existingBookings = await db
      .select({
        scheduledDate: schedulerBookings.scheduledDate,
        scheduledEndDate: schedulerBookings.scheduledEndDate
      })
      .from(schedulerBookings)
      .where(and(
        eq(schedulerBookings.schedulerId, scheduler.id),
        ne(schedulerBookings.status, 'cancelled'),
        gte(schedulerBookings.scheduledDate, startDate),
        lte(schedulerBookings.scheduledDate, endDate)
      ));

    // Get existing photography sessions (to block those times too)
    const existingSessions = await db
      .select({
        startTime: photographySessions.startTime,
        endTime: photographySessions.endTime
      })
      .from(photographySessions)
      .where(and(
        ne(photographySessions.status, 'cancelled'),
        gte(photographySessions.startTime, startDate),
        lte(photographySessions.startTime, endDate)
      ));

    // Get blocked times
    const blockedTimes = await db
      .select()
      .from(schedulerBlockedTimes)
      .where(and(
        or(
          eq(schedulerBlockedTimes.schedulerId, scheduler.id),
          isNull(schedulerBlockedTimes.schedulerId)
        ),
        lte(schedulerBlockedTimes.startDate, endDate),
        gte(schedulerBlockedTimes.endDate, startDate)
      ));

    // Fetch Google Calendar busy times to prevent double-bookings.
    // FAIL CLOSED: if Google Calendar is configured but unreachable we must
    // NOT show any slots, otherwise we offer times that are actually busy in
    // GCal and end up with double bookings (see GCalUnavailableError).
    let googleBusyTimes: Array<{ start: Date; end: Date }> = [];
    try {
      googleBusyTimes = await getGoogleCalendarBusyTimes(startDate, endDate);
    } catch (gcalErr: any) {
      if (gcalErr instanceof GCalUnavailableError) {
        console.error('[Scheduler] ❌ Google Calendar unreachable — returning NO availability to prevent double bookings:', gcalErr.reason);
        return res.status(503).json({
          error: 'Calendar temporarily unavailable',
          googleCalendarUnavailable: true,
          reason: gcalErr.reason,
          message: 'Online booking is temporarily disabled because we cannot verify Google Calendar availability. Please reconnect Google Calendar in Calendar Sync settings.',
          availability: {},
          slots: []
        });
      }
      console.warn('[Scheduler] Google Calendar busy-time check failed (non-fatal), proceeding without:', gcalErr);
    }

    // Generate available slots
    const availableSlots = generateAvailableSlots(
      scheduler,
      startDate,
      endDate,
      existingBookings,
      existingSessions,
      blockedTimes,
      googleBusyTimes
    );

    // If requesting specific date, return time slots
    if (date) {
      res.json({ 
        date,
        slots: availableSlots 
      });
    } else {
      // Group by date for month view
      const slotsByDate: Record<string, any[]> = {};
      availableSlots.forEach(slot => {
        const dateKey = format(slot.start, 'yyyy-MM-dd');
        if (!slotsByDate[dateKey]) {
          slotsByDate[dateKey] = [];
        }
        slotsByDate[dateKey].push(slot);
      });

      res.json({ 
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        availability: slotsByDate 
      });
    }
  } catch (error) {
    console.error('Error fetching availability:', error);
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
});

// POST /api/schedulers/public/:slug/book - Book an appointment
router.post('/public/:slug/book', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { 
      clientName, 
      clientEmail, 
      clientPhone,
      scheduledDate,
      clientNotes,
      questionnaireResponses
    } = req.body;

    if (!clientName || !clientEmail || !clientPhone || !scheduledDate) {
      return res.status(400).json({ 
        error: 'Client name, email, phone number, and scheduled date are required' 
      });
    }

    const [scheduler] = await db
      .select()
      .from(schedulers)
      .where(and(eq(schedulers.slug, slug), eq(schedulers.isActive, true)));

    if (!scheduler) {
      return res.status(404).json({ error: 'Scheduler not found' });
    }

    const bookingStart = new Date(scheduledDate);
    const bookingEnd = addMinutes(bookingStart, scheduler.duration);

    // Verify the slot is still available
    // Use strict comparisons (lt/gt) to match the availability check logic —
    // adjacent slots (one ending exactly when the next starts) are NOT conflicts
    const conflictingBookings = await db
      .select({ id: schedulerBookings.id })
      .from(schedulerBookings)
      .where(and(
        eq(schedulerBookings.schedulerId, scheduler.id),
        ne(schedulerBookings.status, 'cancelled'),
        lt(schedulerBookings.scheduledDate, bookingEnd),
        gt(schedulerBookings.scheduledEndDate, bookingStart)
      ))
      .limit(1);

    if (conflictingBookings.length > 0) {
      return res.status(409).json({ 
        error: 'This time slot is no longer available. Please select another time.' 
      });
    }

    // Also check Google Calendar for conflicts (double-booking prevention).
    // FAIL CLOSED: if GCal is configured but unreachable, refuse the booking
    // rather than silently saving a phantom-free slot.
    try {
      const gcalBusy = await getGoogleCalendarBusyTimes(bookingStart, bookingEnd);
      const hasGcalConflict = gcalBusy.some(busy => 
        bookingStart < busy.end && bookingEnd > busy.start
      );
      if (hasGcalConflict) {
        return res.status(409).json({
          error: 'This time slot is no longer available. Please select another time.'
        });
      }
    } catch (gcalErr: any) {
      if (gcalErr instanceof GCalUnavailableError) {
        console.error('[Scheduler] ❌ Refusing booking — Google Calendar unreachable:', gcalErr.reason);
        return res.status(503).json({
          error: 'Online booking is temporarily unavailable. Please try again later or contact us directly.',
          googleCalendarUnavailable: true
        });
      }
      console.warn('[Scheduler] Google Calendar conflict check failed (non-fatal), proceeding:', gcalErr);
    }

    // Check for existing CRM client
    let clientId = null;
    const existingClients = await db
      .select({ id: crmClients.id })
      .from(crmClients)
      .where(eq(crmClients.email, clientEmail.toLowerCase()))
      .limit(1);

    if (existingClients.length > 0) {
      clientId = existingClients[0].id;
    }

    const bookingId = randomUUID();
    const status = scheduler.autoApprove ? 'confirmed' : 'pending';

    const [booking] = await db.insert(schedulerBookings).values({
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
      sessionId = randomUUID();
      await db.insert(photographySessions).values({
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
        externalCalendarSync: true,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any);

      // Tell the client. Nothing here sent an email before — the scheduler saved a
      // confirmationMessage and this line recorded confirmationSent: true regardless, so
      // the database asserted a confirmation that had never existed.
      const mailed = await sendBookingConfirmation({
        booking: {
          id: bookingId, clientName, clientEmail, clientPhone, clientNotes,
          scheduledDate: bookingStart, scheduledEndDate: bookingEnd,
        },
        scheduler: {
          name: scheduler.name, location: scheduler.location,
          confirmationMessage: scheduler.confirmationMessage, timezone: scheduler.timezone,
        },
      });
      if (mailed.problem) console.warn(`[scheduler] booking ${bookingId}: ${mailed.problem}`);

      await db
        .update(schedulerBookings)
        // Recorded from what actually happened, not assumed.
        .set({
          sessionId,
          confirmationSent: mailed.clientEmailed,
          confirmationSentAt: mailed.clientEmailed ? new Date() : null,
        })
        .where(eq(schedulerBookings.id, bookingId));
    }

    // Create Google Calendar event for confirmed bookings
    let googleCalendarEventId: string | null = null;
    if (status === 'confirmed') {
      try {
        console.log(`[Scheduler] Creating Google Calendar event for booking ${bookingId} - ${clientName}`);
        googleCalendarEventId = await createGoogleCalendarEvent({
          summary: `${scheduler.name} - ${clientName}`,
          description: `Booked via Scheduler\nClient: ${clientName}\nEmail: ${clientEmail}${clientPhone ? '\nPhone: ' + clientPhone : ''}${clientNotes ? '\nNotes: ' + clientNotes : ''}`,
          location: scheduler.location || undefined,
          startTime: bookingStart,
          endTime: bookingEnd,
          clientEmail: clientEmail.toLowerCase(),
          clientName,
        });

        if (googleCalendarEventId) {
          console.log(`[Scheduler] ✅ Google Calendar event created: ${googleCalendarEventId} for booking ${bookingId}`);
          // Store Google Calendar event ID on the booking
          await db
            .update(schedulerBookings)
            .set({ googleCalendarEventId })
            .where(eq(schedulerBookings.id, bookingId));

          // Also store on the photography session if one was created
          if (sessionId) {
            await db
              .update(photographySessions)
              .set({ googleCalendarEventId } as any)
              .where(eq(photographySessions.id, sessionId));
          }
        } else {
          console.error(`[Scheduler] ❌ Google Calendar sync FAILED for booking ${bookingId} - ${clientName}. Event was NOT created on Google Calendar. Booking is saved in CRM but not synced.`);
        }
      } catch (gcalErr) {
        console.warn('[Scheduler] Google Calendar event creation failed, booking still saved:', gcalErr);
      }
    }

    // TODO: Send confirmation email

    res.status(201).json({
      success: true,
      booking: {
        id: bookingId,
        scheduledDate: bookingStart,
        scheduledEndDate: bookingEnd,
        status,
        confirmationNumber: bookingId.slice(0, 8).toUpperCase(),
        googleCalendarEventId
      },
      message: scheduler.autoApprove 
        ? 'Your appointment has been confirmed!'
        : 'Your booking request has been received and is pending confirmation.'
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// POST /api/schedulers/bookings/:bookingId/sync-gcal - Manual retry Google Calendar sync
router.post('/bookings/:bookingId/sync-gcal', async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;

    // Get the booking
    const [booking] = await db
      .select()
      .from(schedulerBookings)
      .where(eq(schedulerBookings.id, bookingId))
      .limit(1);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.googleCalendarEventId) {
      return res.json({ success: true, message: 'Already synced', googleCalendarEventId: booking.googleCalendarEventId });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot sync cancelled booking' });
    }

    // Get scheduler for title
    const [scheduler] = await db
      .select()
      .from(schedulers)
      .where(eq(schedulers.id, booking.schedulerId))
      .limit(1);

    const schedulerName = scheduler?.name || 'Appointment';
    const bookingStart = new Date(booking.scheduledDate!);
    const bookingEnd = new Date(booking.scheduledEndDate!);

    const googleCalendarEventId = await createGoogleCalendarEvent({
      summary: `${schedulerName} - ${booking.clientName}`,
      description: `Booked via Scheduler\nClient: ${booking.clientName}\nEmail: ${booking.clientEmail}${booking.clientPhone ? '\nPhone: ' + booking.clientPhone : ''}${booking.clientNotes ? '\nNotes: ' + booking.clientNotes : ''}`,
      location: scheduler?.location || undefined,
      startTime: bookingStart,
      endTime: bookingEnd,
      clientEmail: booking.clientEmail!,
      clientName: booking.clientName!,
    });

    if (!googleCalendarEventId) {
      return res.status(500).json({ error: 'Google Calendar sync failed. Check server logs for details.' });
    }

    // Update booking with event ID
    await db
      .update(schedulerBookings)
      .set({ googleCalendarEventId })
      .where(eq(schedulerBookings.id, bookingId));

    // Update photography session if linked
    if (booking.sessionId) {
      await db
        .update(photographySessions)
        .set({ googleCalendarEventId } as any)
        .where(eq(photographySessions.id, booking.sessionId));
    }

    console.log(`[Scheduler] ✅ Manual GCal sync successful for booking ${bookingId}: ${googleCalendarEventId}`);
    res.json({ success: true, googleCalendarEventId });
  } catch (error) {
    console.error('Error syncing booking to Google Calendar:', error);
    res.status(500).json({ error: 'Failed to sync to Google Calendar' });
  }
});

// Helper function to generate available time slots
function generateAvailableSlots(
  scheduler: any,
  startDate: Date,
  endDate: Date,
  existingBookings: any[],
  existingSessions: any[],
  blockedTimes: any[],
  googleBusyTimes: Array<{ start: Date; end: Date }> = []
): Array<{ start: Date; end: Date; formatted: string }> {
  const slots: Array<{ start: Date; end: Date; formatted: string }> = [];
  const weeklyAvailability = scheduler.weeklyAvailability as Record<string, Array<{ start: string; end: string }>>;
  const specificDates = scheduler.specificDates as Array<{ date: string; windows: Array<{ start: string; end: string }> }> | null;

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const increment = scheduler.availabilityIncrements || 60;
  const duration = scheduler.duration || 60;
  const bufferBefore = scheduler.bufferBefore || 0;
  const bufferAfter = scheduler.bufferAfter || 0;
  const totalBlockedTime = duration + bufferBefore + bufferAfter;
  
  // The scheduler's own timezone; then the studio's; then UTC. Never another
  // studio's city. Availability is computed in tz, so a wrong value here does not
  // mislabel the slots — it offers the wrong ones.
  const tz = scheduler.timezone || process.env.DEFAULT_CAL_TZ || 'UTC';

  // For date_range, clamp the iteration window to the scheduler's start/end dates
  let iterStart = startDate;
  let iterEnd = endDate;
  if (scheduler.availabilityType === 'date_range') {
    if (scheduler.startDate && new Date(scheduler.startDate) > iterStart) {
      iterStart = startOfDay(new Date(scheduler.startDate));
    }
    if (scheduler.endDate && new Date(scheduler.endDate) < iterEnd) {
      iterEnd = endOfDay(new Date(scheduler.endDate));
    }
    // If the clamped window is empty, return no slots
    if (iterStart > iterEnd) return slots;
  }

  // Iterate through each day in the range
  const days = eachDayOfInterval({ start: iterStart, end: iterEnd });

  for (const day of days) {
    // Determine the time windows for this day based on availability type
    let dayWindows: Array<{ start: string; end: string }> = [];

    if (scheduler.availabilityType === 'specific_dates' && specificDates) {
      // Only allow dates explicitly listed in specificDates
      const dayStr = format(day, 'yyyy-MM-dd');
      const match = specificDates.find(sd => sd.date === dayStr);
      if (!match) continue; // Day not in the allowed specific dates
      dayWindows = match.windows || [];
      // If the specific date entry has no windows, use the weekly availability as fallback
      if (dayWindows.length === 0 && weeklyAvailability) {
        const dayOfWeek = getDay(day);
        const dayName = dayNames[dayOfWeek];
        dayWindows = weeklyAvailability[dayName] || [];
      }
    } else {
      // For 'ongoing' and 'date_range', use weekly availability
      if (!weeklyAvailability) continue;
      const dayOfWeek = getDay(day);
      const dayName = dayNames[dayOfWeek];
      dayWindows = weeklyAvailability[dayName] || [];
    }

    if (dayWindows.length === 0) continue;

    // Count bookings for this day (for maxPerDay check)
    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);
    const bookingsOnDay = existingBookings.filter(b => {
      const bookingDate = new Date(b.scheduledDate);
      return bookingDate >= dayStart && bookingDate <= dayEnd;
    });

    if (scheduler.maxPerDay && bookingsOnDay.length >= scheduler.maxPerDay) continue;

    // Generate slots for each availability window
    for (const window of dayWindows) {
      const [startHour, startMin] = window.start.split(':').map(Number);
      const [endHour, endMin] = window.end.split(':').map(Number);

      // Use fromZonedTime to convert "local timezone" times to correct UTC
      // setHours/setMinutes create a date in server-local time (UTC on Heroku),
      // fromZonedTime interprets those values as being in the scheduler's timezone
      // and returns the correct UTC Date
      const localSlotStart = setMinutes(setHours(day, startHour), startMin);
      let slotStart = fromZonedTime(localSlotStart, tz);
      const localWindowEnd = setMinutes(setHours(day, endHour), endMin);
      const windowEnd = fromZonedTime(localWindowEnd, tz);

      while (addMinutes(slotStart, totalBlockedTime) <= windowEnd) {
        const slotEnd = addMinutes(slotStart, duration);
        const bufferedStart = addMinutes(slotStart, -bufferBefore);
        const bufferedEnd = addMinutes(slotEnd, bufferAfter);

        // Check if slot is in the future (with min notice)
        const minNoticeTime = addMinutes(new Date(), scheduler.minNotice * 60);
        if (slotStart < minNoticeTime) {
          slotStart = addMinutes(slotStart, increment);
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

        // Check for Google Calendar conflicts (external events)
        const hasGoogleConflict = googleBusyTimes.some(busy => {
          return bufferedStart < busy.end && bufferedEnd > busy.start;
        });

        if (!hasBookingConflict && !hasSessionConflict && !isBlocked && !hasGoogleConflict) {
          slots.push({
            start: slotStart,
            end: slotEnd,
            // Format the time in the scheduler's timezone for display
            formatted: formatInTimeZone(slotStart, tz, 'HH:mm')
          });
        }

        slotStart = addMinutes(slotStart, increment);
      }
    }
  }

  return slots;
}

export default router;
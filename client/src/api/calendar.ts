import { supabase } from '../lib/supabase';

// Types for the calendar system
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  timezone: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  visibility: 'public' | 'private' | 'confidential';
  importance: 'low' | 'normal' | 'high';
  category_id?: string;
  calendar_id: string;
  color: string;
  is_recurring: boolean;
  recurrence_rule?: string;
  recurrence_exception_dates?: string[];
  parent_event_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  external_id?: string;
  external_source?: string;
  ical_uid: string;
  is_bookable: boolean;
  max_attendees?: number;
  booking_window_start?: string;
  booking_window_end?: string;
}

export interface Calendar {
  id: string;
  name: string;
  description?: string;
  color: string;
  is_default: boolean;
  is_public: boolean;
  timezone: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  external_id?: string;
  external_source?: string;
  sync_enabled: boolean;
  sync_url?: string;
  last_sync?: string;
}

export interface EventCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  created_by: string;
  created_at: string;
}

export interface EventAttendee {
  id: string;
  event_id: string;
  email: string;
  name?: string;
  role: 'organizer' | 'attendee' | 'optional';
  status: 'pending' | 'accepted' | 'declined' | 'tentative';
  response_date?: string;
  notes?: string;
  created_at: string;
}

export interface EventReminder {
  id: string;
  event_id: string;
  type: 'email' | 'popup' | 'sms' | 'push';
  minutes_before: number;
  sent_at?: string;
  created_at: string;
}

export interface CreateEventData {
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time: string;
  all_day?: boolean;
  timezone?: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
  visibility?: 'public' | 'private' | 'confidential';
  importance?: 'low' | 'normal' | 'high';
  category_id?: string;
  calendar_id: string;
  color?: string;
  is_recurring?: boolean;
  recurrence_rule?: string;
  is_bookable?: boolean;
  max_attendees?: number;
  attendees?: Omit<EventAttendee, 'id' | 'event_id' | 'created_at'>[];
  reminders?: Omit<EventReminder, 'id' | 'event_id' | 'created_at' | 'sent_at'>[];
}

// Calendar API functions
export async function listCalendars(): Promise<Calendar[]> {
  // First, try to get existing calendars
  const { data, error } = await supabase
    .from('calendars')
    .select('*')
    .order('name');

  if (error) throw error;

  // If no calendars exist, initialize default data for the user
  if (!data || data.length === 0) {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      try {
        // Call the initialization function
        await supabase.rpc('initialize_user_calendar_data', { user_id: user.id });
        
        // Fetch calendars again after initialization
        const { data: newData, error: newError } = await supabase
          .from('calendars')
          .select('*')
          .order('name');
        
        if (newError) throw newError;
        return newData || [];
      } catch (initError) {
        // console.warn removed
        return [];
      }
    }
  }

  return data || [];
}

export async function createCalendar(calendar: Omit<Calendar, 'id' | 'owner_id' | 'created_at' | 'updated_at'>): Promise<Calendar> {
  const { data: user } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('calendars')
    .insert([{
      ...calendar,
      owner_id: user.user?.id
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCalendar(id: string, updates: Partial<Calendar>): Promise<Calendar> {
  const { data, error } = await supabase
    .from('calendars')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCalendar(id: string): Promise<void> {
  const { error } = await supabase
    .from('calendars')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Event API functions
export async function listEvents(
  startDate?: string,
  endDate?: string,
  calendarIds?: string[]
): Promise<CalendarEvent[]> {
  let query = supabase
    .from('calendar_events')
    .select(`
      *,
      calendars(name, color),
      calendar_categories(name, color, icon),
      calendar_event_attendees(*),
      calendar_event_reminders(*)
    `)
    .order('start_time');

  // Filter by date range
  if (startDate) {
    query = query.gte('start_time', startDate);
  }
  if (endDate) {
    query = query.lte('end_time', endDate);
  }
  
  // Filter by calendar IDs
  if (calendarIds && calendarIds.length > 0) {
    query = query.in('calendar_id', calendarIds);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function getEvent(id: string): Promise<CalendarEvent> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select(`
      *,
      calendars(name, color),
      calendar_categories(name, color, icon),
      calendar_event_attendees(*),
      calendar_event_reminders(*),
      calendar_event_attachments(*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createEvent(eventData: CreateEventData): Promise<CalendarEvent> {
  const { data: user } = await supabase.auth.getUser();
  
  // Prepare attendees data for the JSONB column
  const attendeesData = eventData.attendees || [];
  
  // Create the event with attendees in JSONB column
  const { data: event, error: eventError } = await supabase
    .from('calendar_events')
    .insert([{
      title: eventData.title,
      description: eventData.description,
      location: eventData.location,
      start_time: eventData.start_time,
      end_time: eventData.end_time,
      all_day: eventData.all_day || false,
      timezone: eventData.timezone || 'UTC',
      status: eventData.status || 'confirmed',
      visibility: eventData.visibility || 'public',
      importance: eventData.importance || 'normal',
      category_id: eventData.category_id,
      calendar_id: eventData.calendar_id,
      color: eventData.color || '#3B82F6',
      is_recurring: eventData.is_recurring || false,
      recurrence_rule: eventData.recurrence_rule,
      is_bookable: eventData.is_bookable || false,
      max_attendees: eventData.max_attendees,
      attendees: attendeesData, // Store as JSONB
      created_by: user.user?.id
    }])
    .select()
    .single();

  if (eventError) {
    // console.error removed
    throw eventError;
  }

  // Also add attendees to the separate attendees table if they exist
  if (attendeesData.length > 0) {
    const attendeesToInsert = attendeesData.map(attendee => ({
      event_id: event.id,
      name: attendee.name || '',
      email: attendee.email || '',
      role: attendee.role || 'attendee',
      status: attendee.status || 'pending'
    }));

    const { error: attendeesError } = await supabase
      .from('calendar_event_attendees')
      .insert(attendeesToInsert);

    if (attendeesError) {
      // console.warn removed
      // Don't throw error as the main event was created successfully
    }
  }

  // Add reminders if provided
  if (eventData.reminders && eventData.reminders.length > 0) {
    const remindersToInsert = eventData.reminders.map(reminder => ({
      event_id: event.id,
      type: reminder.type,
      minutes_before: reminder.minutes_before
    }));

    const { error: remindersError } = await supabase
      .from('calendar_event_reminders')
      .insert(remindersToInsert);

    if (remindersError) {
      // console.warn removed
      // Don't throw error as the main event was created successfully
    }
  }

  return event;
}

export async function updateEvent(id: string, updates: Partial<CreateEventData>): Promise<CalendarEvent> {
  const { data, error } = await supabase
    .from('calendar_events')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Event categories
export async function listEventCategories(): Promise<EventCategory[]> {
  // First, try to get existing categories
  const { data, error } = await supabase
    .from('calendar_categories')
    .select('*')
    .order('name');

  if (error) throw error;

  // If no categories exist, the initialization function should have been called by listCalendars
  // But let's make sure by checking if user has any calendars
  if (!data || data.length === 0) {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      try {
        // Call the initialization function (safe to call multiple times)
        await supabase.rpc('initialize_user_calendar_data', { user_id: user.id });
        
        // Fetch categories again after initialization
        const { data: newData, error: newError } = await supabase
          .from('calendar_categories')
          .select('*')
          .order('name');
        
        if (newError) throw newError;
        return newData || [];
      } catch (initError) {
        // console.warn removed
        return [];
      }
    }
  }

  return data || [];
}

export async function createEventCategory(category: Omit<EventCategory, 'id' | 'created_by' | 'created_at'>): Promise<EventCategory> {
  const { data: user } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('calendar_categories')
    .insert([{
      ...category,
      created_by: user.user?.id
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Attendee management
export async function addAttendee(eventId: string, attendee: Omit<EventAttendee, 'id' | 'event_id' | 'created_at'>): Promise<EventAttendee> {
  const { data, error } = await supabase
    .from('calendar_event_attendees')
    .insert([{
      ...attendee,
      event_id: eventId
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAttendeeStatus(attendeeId: string, status: EventAttendee['status']): Promise<EventAttendee> {
  const { data, error } = await supabase
    .from('calendar_event_attendees')
    .update({
      status,
      response_date: new Date().toISOString()
    })
    .eq('id', attendeeId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeAttendee(attendeeId: string): Promise<void> {
  const { error } = await supabase
    .from('calendar_event_attendees')
    .delete()
    .eq('id', attendeeId);

  if (error) throw error;
}

// Availability and booking
export async function getAvailability(calendarId: string, date: string): Promise<{ start_time: string; end_time: string }[]> {
  const dayOfWeek = new Date(date).getDay();
  
  const { data, error } = await supabase
    .from('calendar_availability')
    .select('start_time, end_time')
    .eq('calendar_id', calendarId)
    .eq('day_of_week', dayOfWeek)
    .eq('is_active', true);

  if (error) throw error;
  return data || [];
}

export async function getBookableSlots(
  calendarId: string,
  date: string,
  duration: number = 60 // duration in minutes
): Promise<{ start_time: string; end_time: string }[]> {
  // Get availability for the day
  const availability = await getAvailability(calendarId, date);
    // Get existing events for the day
  const { data: existingEvents, error } = await supabase
    .from('calendar_events')
    .select('start_time, end_time')
    .eq('calendar_id', calendarId)
    .gte('start_time', `${date}T00:00:00`)
    .lt('start_time', `${date}T23:59:59`);

  if (error) throw error;

  // Calculate free slots (simplified implementation)
  const freeSlots: { start_time: string; end_time: string }[] = [];
  
  for (const slot of availability) {
    // This is a simplified implementation
    // In a real application, you would need more complex slot calculation
    const slotStart = new Date(`${date}T${slot.start_time}`);
    const slotEnd = new Date(`${date}T${slot.end_time}`);
    
    // Check if slot conflicts with existing events
    const hasConflict = existingEvents?.some(event => {
      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.end_time);
      return slotStart < eventEnd && slotEnd > eventStart;
    });
    
    if (!hasConflict) {
      freeSlots.push({
        start_time: slotStart.toISOString(),
        end_time: new Date(slotStart.getTime() + duration * 60000).toISOString()
      });
    }
  }

  return freeSlots;
}

// iCal export
export async function exportToICAL(calendarId?: string, userId?: string): Promise<string> {
  let query = supabase
    .from('calendar_events')
    .select(`
      *,
      calendars(name),
      calendar_event_attendees(*)
    `)
    .order('start_time');

  if (calendarId) {
    query = query.eq('calendar_id', calendarId);
  }

  if (userId) {
    query = query.eq('created_by', userId);
  }

  const { data: events, error } = await query;

  if (error) throw error;

  // Generate iCal format
  let icalString = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Your Company//Your App//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ].join('\r\n');

  for (const event of events || []) {
    icalString += '\r\n' + eventToICAL(event);
  }

  icalString += '\r\nEND:VCALENDAR';

  return icalString;
}

function eventToICAL(event: any): string {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const lines = [
    'BEGIN:VEVENT',
    `UID:${event.ical_uid}`,
    `DTSTART:${formatDate(event.start_time)}`,
    `DTEND:${formatDate(event.end_time)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description || ''}`,
    `LOCATION:${event.location || ''}`,
    `STATUS:${event.status.toUpperCase()}`,
    `CREATED:${formatDate(event.created_at)}`,
    `LAST-MODIFIED:${formatDate(event.updated_at)}`
  ];

  // Add attendees
  if (event.calendar_event_attendees) {
    for (const attendee of event.calendar_event_attendees) {
      lines.push(`ATTENDEE;CN=${attendee.name || attendee.email};ROLE=${attendee.role.toUpperCase()};PARTSTAT=${attendee.status.toUpperCase()}:mailto:${attendee.email}`);
    }
  }

  // Add recurrence rule if applicable
  if (event.is_recurring && event.recurrence_rule) {
    lines.push(`RRULE:${event.recurrence_rule}`);
  }

  lines.push('END:VEVENT');

  return lines.join('\r\n');
}

// Import from iCal
export async function importFromICAL(icalData: string, calendarId: string): Promise<{ imported: number; errors: string[] }> {
  const events = parseICAL(icalData);
  let imported = 0;
  const errors: string[] = [];

  for (const eventData of events) {
    try {
      await createEvent({
        ...eventData,
        calendar_id: calendarId
      });
      imported++;
    } catch (error) {
      errors.push(`Failed to import event "${eventData.title}": ${error}`);
    }
  }

  return { imported, errors };
}

function parseICAL(icalData: string): CreateEventData[] {
  // This is a simplified iCal parser
  // In a real application, you would use a proper iCal parsing library
  const events: CreateEventData[] = [];
  const lines = icalData.split('\r\n');
  let currentEvent: any = {};
  let inEvent = false;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = {};
    } else if (line === 'END:VEVENT') {
      if (currentEvent.title && currentEvent.start_time && currentEvent.end_time) {
        events.push(currentEvent);
      }
      inEvent = false;
    } else if (inEvent) {
      const [key, value] = line.split(':');
      switch (key) {
        case 'SUMMARY':
          currentEvent.title = value;
          break;
        case 'DESCRIPTION':
          currentEvent.description = value;
          break;
        case 'LOCATION':
          currentEvent.location = value;
          break;
        case 'DTSTART':
          currentEvent.start_time = parseICALDate(value);
          break;
        case 'DTEND':
          currentEvent.end_time = parseICALDate(value);
          break;
        // Add more field parsing as needed
      }
    }
  }

  return events;
}

function parseICALDate(icalDate: string): string {
  // Convert iCal date format to ISO string
  // This is simplified - real implementation would handle timezones properly
  const year = icalDate.substr(0, 4);
  const month = icalDate.substr(4, 2);
  const day = icalDate.substr(6, 2);
  const hour = icalDate.substr(9, 2) || '00';
  const minute = icalDate.substr(11, 2) || '00';
  const second = icalDate.substr(13, 2) || '00';

  return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
}

// Calendar utilities for iCal export and appointment management

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
  attendees?: string[];
  allDay?: boolean;
  recurring?: boolean;
  recurrenceRule?: string;
}

export interface ICalOptions {
  prodId?: string;
  method?: 'PUBLISH' | 'REQUEST' | 'REPLY' | 'CANCEL';
  calName?: string;
  timezone?: string;
}

/**
 * Generate iCal (.ics) content from calendar events
 */
export function generateICalContent(events: CalendarEvent[], options: ICalOptions = {}): string {
  const {
    prodId = '-//TogNinja//TogNinja CRM//EN',
    method = 'PUBLISH',
    calName = 'TogNinja Calendar',
    timezone = 'Europe/Berlin'
  } = options;

  let icalContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${prodId}`,
    `METHOD:${method}`,
    `X-WR-CALNAME:${calName}`,
    `X-WR-TIMEZONE:${timezone}`,
    'CALSCALE:GREGORIAN'
  ];

  // Add timezone information
  icalContent.push(
    'BEGIN:VTIMEZONE',
    `TZID:${timezone}`,
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0200',
    'TZNAME:CEST',
    'DTSTART:20070325T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0200',
    'TZOFFSETTO:+0100',
    'TZNAME:CET',
    'DTSTART:20071028T030000',
    'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
    'END:STANDARD',
    'END:VTIMEZONE'
  );

  // Add events
  events.forEach(event => {
    const eventLines = generateEventLines(event, timezone);
    icalContent.push(...eventLines);
  });

  icalContent.push('END:VCALENDAR');

  return icalContent.join('\r\n');
}

/**
 * Generate iCal event lines for a single event
 */
function generateEventLines(event: CalendarEvent, timezone: string): string[] {
  const lines = ['BEGIN:VEVENT'];

  // Required fields
  lines.push(`UID:${event.id}@togninja.com`);
  lines.push(`DTSTAMP:${formatICalDate(new Date())}`);

  // Event times
  if (event.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${formatICalDate(event.start, true)}`);
    lines.push(`DTEND;VALUE=DATE:${formatICalDate(event.end, true)}`);
  } else {
    lines.push(`DTSTART;TZID=${timezone}:${formatICalDate(event.start)}`);
    lines.push(`DTEND;TZID=${timezone}:${formatICalDate(event.end)}`);
  }

  // Event details
  lines.push(`SUMMARY:${escapeICalText(event.title)}`);
  
  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICalText(event.description)}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeICalText(event.location)}`);
  }

  // Attendees
  if (event.attendees && event.attendees.length > 0) {
    event.attendees.forEach(attendee => {
      lines.push(`ATTENDEE:MAILTO:${attendee}`);
    });
  }

  // Recurrence
  if (event.recurring && event.recurrenceRule) {
    lines.push(`RRULE:${event.recurrenceRule}`);
  }

  // Status and other properties
  lines.push('STATUS:CONFIRMED');
  lines.push('TRANSP:OPAQUE');

  lines.push('END:VEVENT');

  return lines;
}

/**
 * Format date for iCal format
 */
function formatICalDate(date: Date, dateOnly = false): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  if (dateOnly) {
    return `${year}${month}${day}`;
  }

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

/**
 * Escape text for iCal format
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

/**
 * Download iCal file
 */
export function downloadICalFile(content: string, filename = 'calendar.ics'): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

/**
 * Export events to iCal format and download
 */
export function exportToIcal(events: CalendarEvent[], filename?: string, options?: ICalOptions): void {
  const content = generateICalContent(events, options);
  const defaultFilename = `togninja-calendar-${new Date().toISOString().split('T')[0]}.ics`;
  downloadICalFile(content, filename || defaultFilename);
}

/**
 * Parse iCal content to extract events
 */
export function parseICalContent(content: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const lines = content.split(/\r?\n/);
  let currentEvent: Partial<CalendarEvent> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === 'BEGIN:VEVENT') {
      currentEvent = {};
    } else if (line === 'END:VEVENT' && currentEvent) {
      if (currentEvent.id && currentEvent.title && currentEvent.start && currentEvent.end) {
        events.push(currentEvent as CalendarEvent);
      }
      currentEvent = null;
    } else if (currentEvent && line.includes(':')) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':');

      switch (key) {
        case 'UID':
          currentEvent.id = value.split('@')[0];
          break;
        case 'SUMMARY':
          currentEvent.title = unescapeICalText(value);
          break;
        case 'DESCRIPTION':
          currentEvent.description = unescapeICalText(value);
          break;
        case 'LOCATION':
          currentEvent.location = unescapeICalText(value);
          break;
        case 'DTSTART':
          currentEvent.start = parseICalDate(value);
          break;
        case 'DTEND':
          currentEvent.end = parseICalDate(value);
          break;
        case 'RRULE':
          currentEvent.recurring = true;
          currentEvent.recurrenceRule = value;
          break;
      }
    }
  }

  return events;
}

/**
 * Parse iCal date string
 */
function parseICalDate(dateString: string): Date {
  // Remove timezone info for now (simplified parsing)
  const cleanDate = dateString.replace(/;.*$/, '');
  
  if (cleanDate.length === 8) {
    // Date only format (YYYYMMDD)
    const year = parseInt(cleanDate.substring(0, 4));
    const month = parseInt(cleanDate.substring(4, 6)) - 1;
    const day = parseInt(cleanDate.substring(6, 8));
    return new Date(year, month, day);
  } else if (cleanDate.length === 15) {
    // DateTime format (YYYYMMDDTHHMMSS)
    const year = parseInt(cleanDate.substring(0, 4));
    const month = parseInt(cleanDate.substring(4, 6)) - 1;
    const day = parseInt(cleanDate.substring(6, 8));
    const hour = parseInt(cleanDate.substring(9, 11));
    const minute = parseInt(cleanDate.substring(11, 13));
    const second = parseInt(cleanDate.substring(13, 15));
    return new Date(year, month, day, hour, minute, second);
  }

  return new Date();
}

/**
 * Unescape iCal text
 */
function unescapeICalText(text: string): string {
  return text
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

/**
 * Import events from iCal file
 */
export async function importFromICalFile(file: File): Promise<CalendarEvent[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const events = parseICalContent(content);
        resolve(events);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Generate recurring events based on RRULE
 */
export function generateRecurringEvents(baseEvent: CalendarEvent, endDate: Date): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  
  if (!baseEvent.recurring || !baseEvent.recurrenceRule) {
    return [baseEvent];
  }

  // Simplified recurring event generation
  // In a real implementation, you'd use a library like 'rrule' for full RRULE support
  const rule = baseEvent.recurrenceRule;
  const current = new Date(baseEvent.start);
  let eventCount = 0;
  const maxEvents = 1000; // Safety limit

  while (current <= endDate && eventCount < maxEvents) {
    const newEvent: CalendarEvent = {
      ...baseEvent,
      id: `${baseEvent.id}-${eventCount}`,
      start: new Date(current),
      end: new Date(current.getTime() + (baseEvent.end.getTime() - baseEvent.start.getTime()))
    };

    events.push(newEvent);

    // Simple weekly recurrence (extend this for full RRULE support)
    if (rule.includes('FREQ=WEEKLY')) {
      current.setDate(current.getDate() + 7);
    } else if (rule.includes('FREQ=DAILY')) {
      current.setDate(current.getDate() + 1);
    } else if (rule.includes('FREQ=MONTHLY')) {
      current.setMonth(current.getMonth() + 1);
    } else {
      break; // Unknown frequency
    }

    eventCount++;
  }

  return events;
}

/**
 * Validate calendar event
 */
export function validateCalendarEvent(event: Partial<CalendarEvent>): string[] {
  const errors: string[] = [];

  if (!event.title || event.title.trim() === '') {
    errors.push('Title is required');
  }

  if (!event.start) {
    errors.push('Start date/time is required');
  }

  if (!event.end) {
    errors.push('End date/time is required');
  }

  if (event.start && event.end && event.start >= event.end) {
    errors.push('End date/time must be after start date/time');
  }

  return errors;
}

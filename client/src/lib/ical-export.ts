import { CalendarEvent } from '../types/calendar';

export interface ICalEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
  attendees?: string[];
}

export const generateICalContent = (events: CalendarEvent[]): string => {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
  let icalContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NewAge Photography//Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];

  events.forEach(event => {
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    
    // Format dates for iCal (YYYYMMDDTHHMMSSZ format)
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    icalContent.push(
      'BEGIN:VEVENT',
      `UID:${event.id}@newagephotography.com`,
      `DTSTART:${formatDate(startDate)}`,
      `DTEND:${formatDate(endDate)}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.description || ''}`,
      `LOCATION:${event.location || ''}`,
      `CREATED:${timestamp}`,
      `LAST-MODIFIED:${timestamp}`,
      `STATUS:${event.status?.toUpperCase() || 'CONFIRMED'}`,
      'END:VEVENT'
    );
  });

  icalContent.push('END:VCALENDAR');
  
  return icalContent.join('\r\n');
};

export const downloadICalFile = (events: CalendarEvent[], filename = 'calendar-export.ics') => {
  const icalContent = generateICalContent(events);
  const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

export const generateICalUrl = (events: CalendarEvent[]): string => {
  const icalContent = generateICalContent(events);
  const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
  return URL.createObjectURL(blob);
};

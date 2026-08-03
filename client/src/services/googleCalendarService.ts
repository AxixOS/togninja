interface CalendarEvent {
  id?: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees?: string[];
  clientId?: string;
}

interface GoogleCalendarConfig {
  calendarId: string;
  apiKey?: string;
  clientId?: string;
}

class GoogleCalendarService {
  private config: GoogleCalendarConfig;
  private isAuthenticated = false;

  constructor() {
    // Your shareable Google Calendar ID
    this.config = {
      calendarId: 'parrottsimon02@gmail.com',
      // These would need to be set up in Google Cloud Console for full integration
      apiKey: import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY || '',
      clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
    };
  }

  // Initialize Google Calendar API
  async initialize(): Promise<boolean> {
    try {
      // For now, we'll create a fallback system that works with the shareable calendar
      // In production, this would use the Google Calendar API
      console.log('Google Calendar service initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize Google Calendar:', error);
      return false;
    }
  }

  // Create a calendar event
  async createEvent(event: CalendarEvent, options: { promptGoogle?: boolean } = {}): Promise<string | null> {
    try {
      // For now, we'll create a local event and provide instructions for manual addition
      const eventData = {
        id: event.id || `event_${Date.now()}`,
        title: event.title,
        description: event.description || '',
        startTime: event.startTime.toISOString(),
        endTime: event.endTime.toISOString(),
        location: event.location || '',
        attendees: event.attendees || [],
        clientId: event.clientId
      };

      // Store locally for now
      const events = this.getLocalEvents();
      events.push(eventData);
      localStorage.setItem('calendarEvents', JSON.stringify(events));

      if (options.promptGoogle) {
        const googleCalendarUrl = this.generateGoogleCalendarUrl(event);
        if (window.confirm('Would you like to also add this event to Google Calendar?')) {
          window.open(googleCalendarUrl, '_blank');
        }
      }

      return eventData.id;
    } catch (error) {
      console.error('Failed to create calendar event:', error);
      return null;
    }
  }

  // Update a calendar event
  async updateEvent(eventId: string, updates: Partial<CalendarEvent>): Promise<boolean> {
    try {
      const events = this.getLocalEvents();
      const eventIndex = events.findIndex(e => e.id === eventId);
      
      if (eventIndex === -1) {
        throw new Error('Event not found');
      }

      events[eventIndex] = { ...events[eventIndex], ...updates };
      localStorage.setItem('calendarEvents', JSON.stringify(events));

      return true;
    } catch (error) {
      console.error('Failed to update calendar event:', error);
      return false;
    }
  }

  // Delete a calendar event
  async deleteEvent(eventId: string): Promise<boolean> {
    try {
      const events = this.getLocalEvents();
      const filteredEvents = events.filter(e => e.id !== eventId);
      localStorage.setItem('calendarEvents', JSON.stringify(filteredEvents));

      return true;
    } catch (error) {
      console.error('Failed to delete calendar event:', error);
      return false;
    }
  }

  // Get events for a date range
  async getEvents(startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    try {
      const events = this.getLocalEvents();
      
      return events.filter(event => {
        const eventStart = new Date(event.startTime);
        return eventStart >= startDate && eventStart <= endDate;
      }).map(event => ({
        ...event,
        startTime: new Date(event.startTime),
        endTime: new Date(event.endTime)
      }));
    } catch (error) {
      console.error('Failed to get calendar events:', error);
      return [];
    }
  }

  // Get events for a specific client
  async getClientEvents(clientId: string): Promise<CalendarEvent[]> {
    try {
      const events = this.getLocalEvents();
      
      return events.filter(event => event.clientId === clientId).map(event => ({
        ...event,
        startTime: new Date(event.startTime),
        endTime: new Date(event.endTime)
      }));
    } catch (error) {
      console.error('Failed to get client events:', error);
      return [];
    }
  }

  // Generate Google Calendar URL for manual event creation
  private generateGoogleCalendarUrl(event: CalendarEvent): string {
    const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
    
    const params = new URLSearchParams({
      text: event.title,
      dates: `${this.formatDateForGoogle(event.startTime)}/${this.formatDateForGoogle(event.endTime)}`,
      details: event.description || '',
      location: event.location || '',
      ctz: 'Europe/Vienna' // Austria timezone
    });

    return `${baseUrl}&${params.toString()}`;
  }

  // Format date for Google Calendar URL
  private formatDateForGoogle(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }

  // Get events from local storage
  private getLocalEvents(): any[] {
    try {
      const stored = localStorage.getItem('calendarEvents');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get local events:', error);
      return [];
    }
  }

  // Get the public calendar URL for sharing
  getPublicCalendarUrl(): string {
    return 'https://calendar.google.com/calendar/u/0?cid=cGFycm90dHNpbW9uMDJAZ21haWwuY29t';
  }

  // Get calendar embed URL
  getEmbedUrl(): string {
    return 'https://calendar.google.com/calendar/embed?src=parrottsimon02%40gmail.com&ctz=Europe%2FVienna';
  }
}

export const googleCalendarService = new GoogleCalendarService();
export type { CalendarEvent };

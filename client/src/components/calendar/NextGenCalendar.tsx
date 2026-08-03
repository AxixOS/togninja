import React, { useState, useEffect, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  Plus,
  Download,
  Upload,
  Settings,
  Search,
  Grid3X3,
  List,
  Clock,
  MapPin,
  Repeat,
  Eye,
  EyeOff,
  Share2,
  X,
  Check,
  AlertCircle,
  FileText
} from 'lucide-react';
import {
  listEvents,
  listCalendars,
  listEventCategories,
  createEvent,
  updateEvent,
  deleteEvent,
  exportToICAL,
  importFromICAL,
  CalendarEvent,
  Calendar,
  EventCategory
} from '../../api/calendar';
import ICalIntegration from './ICalIntegration';

interface NextGenCalendarProps {
  className?: string;
}

const NextGenCalendar: React.FC<NextGenCalendarProps> = ({ className = '' }) => {
  // State management
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI State
  const [currentView, setCurrentView] = useState('dayGridMonth');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [showCalendarSettings, setShowCalendarSettings] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showICalModal, setShowICalModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // Filters and settings
  const [visibleCalendars, setVisibleCalendars] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewOptions, setViewOptions] = useState({
    showWeekends: true,
    showTimeSlots: true,
    showAllDay: true,
    defaultDuration: '01:00',
    businessHours: {
      start: '09:00',
      end: '17:00'
    }
  });

  // Event form state
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    location: '',
    start_time: '',
    end_time: '',
    all_day: false,
    calendar_id: '',
    category_id: '',
    color: '#3B82F6',    visibility: 'public' as 'public' | 'private' | 'confidential',
    importance: 'normal' as 'low' | 'normal' | 'high',
    is_recurring: false,
    recurrence_rule: '',    attendees: [] as { email: string; name?: string; role: 'organizer' | 'attendee' | 'optional'; status: 'pending' | 'accepted' | 'declined' | 'tentative'; response_date?: string; notes?: string }[],
    reminders: [] as { type: 'email' | 'popup' | 'sms' | 'push'; minutes_before: number }[]
  });

  // Load initial data
  useEffect(() => {
    loadCalendarData();
  }, []);

  const loadCalendarData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [eventsData, calendarsData, categoriesData] = await Promise.all([
        listEvents(),
        listCalendars(),
        listEventCategories()
      ]);

      setEvents(eventsData);
      setCalendars(calendarsData);
      setCategories(categoriesData);
      setVisibleCalendars(calendarsData.map(cal => cal.id));

      // Auto-select first calendar for new events if none selected
      if (calendarsData.length > 0 && !eventForm.calendar_id) {
        setEventForm(prev => ({
          ...prev,
          calendar_id: calendarsData[0].id
        }));
      }

      // console.log removed

    } catch (err: any) {
      // console.error removed
      setError('Failed to load calendar data: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Filter events based on current filters
  const filteredEvents = events.filter(event => {
    // Calendar visibility filter
    if (!visibleCalendars.includes(event.calendar_id)) return false;
    
    // Category filter
    if (selectedCategories.length > 0 && event.category_id && !selectedCategories.includes(event.category_id)) {
      return false;
    }
    
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        event.title.toLowerCase().includes(searchLower) ||
        event.description?.toLowerCase().includes(searchLower) ||
        event.location?.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  // Convert events to FullCalendar format
  const calendarEvents = filteredEvents.map(event => ({
    id: event.id,
    title: event.title,
    start: event.start_time,
    end: event.end_time,
    allDay: event.all_day,
    backgroundColor: event.color,
    borderColor: event.color,
    textColor: getContrastColor(event.color),
    extendedProps: {
      description: event.description,
      location: event.location,
      visibility: event.visibility,
      importance: event.importance,
      category_id: event.category_id,
      calendar_id: event.calendar_id,      attendees: (event as any).calendar_event_attendees || [],
      reminders: (event as any).calendar_event_reminders || []
    },
    classNames: [
      `event-${event.visibility}`,
      `event-${event.importance}`,
      event.is_recurring ? 'event-recurring' : ''
    ].filter(Boolean)
  }));

  // Helper function to get contrasting text color
  const getContrastColor = (hexColor: string): string => {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#FFFFFF';
  };

  // Event handlers
  const handleDateSelect = useCallback((selectInfo: any) => {
    const defaultCalendar = calendars.find(cal => cal.is_default) || calendars[0];
    
    setEventForm({
      title: '',
      description: '',
      location: '',
      start_time: selectInfo.startStr,
      end_time: selectInfo.endStr || selectInfo.startStr,
      all_day: selectInfo.allDay || false,
      calendar_id: defaultCalendar?.id || '',
      category_id: '',
      color: '#3B82F6',
      visibility: 'public',
      importance: 'normal',
      is_recurring: false,
      recurrence_rule: '',
      attendees: [],
      reminders: [{ type: 'email', minutes_before: 15 }]
    });
    
    setEditingEvent(null);
    setShowEventModal(true);
  }, [calendars]);

  const handleEventClick = useCallback((clickInfo: any) => {
    const event = events.find(e => e.id === clickInfo.event.id);
    if (event) {
      setSelectedEvent(event);
      setEventForm({
        title: event.title,
        description: event.description || '',
        location: event.location || '',
        start_time: event.start_time,
        end_time: event.end_time,
        all_day: event.all_day,
        calendar_id: event.calendar_id,
        category_id: event.category_id || '',
        color: event.color,
        visibility: event.visibility,
        importance: event.importance,
        is_recurring: event.is_recurring,
        recurrence_rule: event.recurrence_rule || '',
        attendees: [],
        reminders: []
      });
      setEditingEvent(event);
      setShowEventModal(true);
    }
  }, [events]);

  const handleEventResize = useCallback(async (resizeInfo: any) => {
    try {
      await updateEvent(resizeInfo.event.id, {
        start_time: resizeInfo.event.startStr,
        end_time: resizeInfo.event.endStr
      });
      await loadCalendarData();
    } catch (err) {
      // console.error removed
      setError('Failed to update event');
    }
  }, []);

  const handleEventDrop = useCallback(async (dropInfo: any) => {
    try {
      await updateEvent(dropInfo.event.id, {
        start_time: dropInfo.event.startStr,
        end_time: dropInfo.event.endStr
      });
      await loadCalendarData();
    } catch (err) {
      // console.error removed
      setError('Failed to move event');
    }
  }, []);

  const handleSaveEvent = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Validation
      if (!eventForm.title.trim()) {
        setError('Event title is required');
        return;
      }
      
      if (!eventForm.start_time) {
        setError('Start time is required');
        return;
      }
      
      if (!eventForm.end_time) {
        setError('End time is required');
        return;
      }
      
      // Ensure we have a calendar_id - use the first available calendar if none selected
      let calendarId = eventForm.calendar_id;
      if (!calendarId && calendars.length > 0) {
        calendarId = calendars[0].id;
        // console.log removed
      }
      
      if (!calendarId) {
        setError('No calendar available. Please create a calendar first.');
        return;
      }
      
      const eventData = {
        ...eventForm,
        calendar_id: calendarId
      };
      
      // console.log removed
      
      if (editingEvent) {
        await updateEvent(editingEvent.id, eventData);
        // console.log removed
      } else {
        const newEvent = await createEvent(eventData);
        // console.log removed
      }
      
      await loadCalendarData();
      setShowEventModal(false);
      resetEventForm();
      
      // Show success message
      // console.log removed
      
    } catch (err: any) {
      // console.error removed
      // console.error removed
      // console.error removed
      
      let errorMessage = 'Failed to save event';
      if (err.message) {
        errorMessage += ': ' + err.message;
      }
      if (err.details) {
        errorMessage += ' (' + err.details + ')';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    
    if (confirm('Are you sure you want to delete this event?')) {
      try {
        setLoading(true);
        await deleteEvent(selectedEvent.id);
        await loadCalendarData();
        setShowEventModal(false);
        resetEventForm();
      } catch (err: any) {
        // console.error removed
        setError('Failed to delete event');
      } finally {
        setLoading(false);
      }
    }
  };

  const resetEventForm = () => {
    setEventForm({
      title: '',
      description: '',
      location: '',
      start_time: '',
      end_time: '',
      all_day: false,
      calendar_id: '',
      category_id: '',
      color: '#3B82F6',
      visibility: 'public',
      importance: 'normal',
      is_recurring: false,
      recurrence_rule: '',
      attendees: [],
      reminders: []
    });
    setSelectedEvent(null);
    setEditingEvent(null);
  };

  const handleExportCalendar = async () => {
    try {
      const icalData = await exportToICAL();
      const blob = new Blob([icalData], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'calendar.ics';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      // console.error removed
      setError('Failed to export calendar');
    }
  };

  const handleImportCalendar = async (file: File) => {
    try {
      const text = await file.text();
      const defaultCalendar = calendars.find(cal => cal.is_default) || calendars[0];
      
      if (!defaultCalendar) {
        setError('No calendar available for import');
        return;
      }

      const result = await importFromICAL(text, defaultCalendar.id);
      
      if (result.errors.length > 0) {
        // console.warn removed
      }
      
      await loadCalendarData();
      setShowImportModal(false);
      
      alert(`Successfully imported ${result.imported} events${result.errors.length > 0 ? ` with ${result.errors.length} errors` : ''}`);
    } catch (err) {
      // console.error removed
      setError('Failed to import calendar');
    }
  };

  const toggleCalendarVisibility = (calendarId: string) => {
    setVisibleCalendars(prev => 
      prev.includes(calendarId)
        ? prev.filter(id => id !== calendarId)
        : [...prev, calendarId]
    );
  };

  const viewButtons = [
    { key: 'dayGridMonth', label: 'Month', icon: Grid3X3 },
    { key: 'timeGridWeek', label: 'Week', icon: CalendarIcon },
    { key: 'timeGridDay', label: 'Day', icon: Clock },
    { key: 'listWeek', label: 'List', icon: List }
  ];

  return (
    <div className={`next-gen-calendar ${className}`}>
      {/* Calendar Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* View Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {viewButtons.map(button => (
                <button
                  key={button.key}
                  onClick={() => setCurrentView(button.key)}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentView === button.key
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <button.icon size={16} className="mr-1" />
                  {button.label}
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <button
              onClick={() => handleDateSelect({ startStr: new Date().toISOString(), allDay: false })}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <Plus size={16} className="mr-2" />
              New Event
            </button>

            <button
              onClick={handleExportCalendar}
              className="border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg flex items-center"
            >
              <Download size={16} className="mr-2" />
              Export
            </button>            <button
              onClick={() => setShowImportModal(true)}
              className="border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg flex items-center"
            >
              <Upload size={16} className="mr-2" />
              Import
            </button>

            <button
              onClick={() => setShowICalModal(true)}
              className="border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg flex items-center"
            >
              <Share2 size={16} className="mr-2" />
              iCal Sync
            </button>

            <button
              onClick={() => setShowCalendarSettings(true)}
              className="border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg flex items-center"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>

        {/* Calendars and Categories Filter */}
        <div className="flex items-center space-x-6">
          {/* Calendar Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Calendars:</span>
            <div className="flex space-x-2">
              {calendars.map(calendar => (
                <button
                  key={calendar.id}
                  onClick={() => toggleCalendarVisibility(calendar.id)}
                  className={`flex items-center px-3 py-1 rounded-full text-sm ${
                    visibleCalendars.includes(calendar.id)
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: calendar.color }}
                  />
                  {calendar.name}
                  {visibleCalendars.includes(calendar.id) ? (
                    <Eye size={12} className="ml-1" />
                  ) : (
                    <EyeOff size={12} className="ml-1" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter */}
          {categories.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Categories:</span>
              <div className="flex space-x-2">
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategories(prev => 
                      prev.includes(category.id)
                        ? prev.filter(id => id !== category.id)
                        : [...prev, category.id]
                    )}
                    className={`flex items-center px-2 py-1 rounded-full text-xs ${
                      selectedCategories.includes(category.id)
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <div
                      className="w-2 h-2 rounded-full mr-1"
                      style={{ backgroundColor: category.color }}
                    />
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 m-4 rounded-lg flex items-start">
          <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main Calendar */}
      <div className="flex-1 p-4">
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            <span className="ml-3 text-gray-600">Loading calendar...</span>
          </div>
        ) : (
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={currentView}
            headerToolbar={false} // We use custom header
            height="auto"
            events={calendarEvents}
            selectable={true}
            editable={true}
            droppable={true}
            eventResizableFromStart={true}
            weekends={viewOptions.showWeekends}
            businessHours={viewOptions.showTimeSlots ? {
              startTime: viewOptions.businessHours.start,
              endTime: viewOptions.businessHours.end
            } : false}
            select={handleDateSelect}
            eventClick={handleEventClick}
            eventResize={handleEventResize}
            eventDrop={handleEventDrop}
            dayMaxEvents={true}
            eventTimeFormat={{
              hour: 'numeric',
              minute: '2-digit',
              meridiem: 'short'
            }}
            slotDuration={viewOptions.defaultDuration}
            allDaySlot={viewOptions.showAllDay}
            nowIndicator={true}
            eventDisplay="block"
            displayEventTime={true}
            eventClassNames={(arg) => {
              const event = arg.event;
              const classes = ['calendar-event'];
              
              if (event.extendedProps.importance === 'high') classes.push('event-high-priority');
              if (event.extendedProps.visibility === 'private') classes.push('event-private');
              
              return classes;
            }}
          />
        )}
      </div>

      {/* Event Modal */}
      <AnimatePresence>
        {showEventModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingEvent ? 'Edit Event' : 'New Event'}
                </h2>
                <button
                  onClick={() => setShowEventModal(false)}
                  className="text-gray-500 hover:text-gray-700 p-2"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Event Title *
                      </label>
                      <input
                        type="text"
                        value={eventForm.title}
                        onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter event title"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date & Time *
                      </label>
                      <input
                        type="datetime-local"
                        value={eventForm.start_time.slice(0, 16)}
                        onChange={(e) => setEventForm(prev => ({ ...prev, start_time: e.target.value + ':00.000Z' }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Date & Time *
                      </label>
                      <input
                        type="datetime-local"
                        value={eventForm.end_time.slice(0, 16)}
                        onChange={(e) => setEventForm(prev => ({ ...prev, end_time: e.target.value + ':00.000Z' }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Calendar
                      </label>
                      <select
                        value={eventForm.calendar_id}
                        onChange={(e) => setEventForm(prev => ({ ...prev, calendar_id: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select calendar...</option>
                        {calendars.map(calendar => (
                          <option key={calendar.id} value={calendar.id}>
                            {calendar.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category
                      </label>
                      <select
                        value={eventForm.category_id}
                        onChange={(e) => setEventForm(prev => ({ ...prev, category_id: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select category...</option>
                        {categories.map(category => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Description and Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={eventForm.description}
                      onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Event description..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="text"
                        value={eventForm.location}
                        onChange={(e) => setEventForm(prev => ({ ...prev, location: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Event location"
                      />
                    </div>
                  </div>

                  {/* Event Options */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Visibility
                      </label>
                      <select
                        value={eventForm.visibility}
                        onChange={(e) => setEventForm(prev => ({ ...prev, visibility: e.target.value as any }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                        <option value="confidential">Confidential</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Importance
                      </label>
                      <select
                        value={eventForm.importance}
                        onChange={(e) => setEventForm(prev => ({ ...prev, importance: e.target.value as any }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Color
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          value={eventForm.color}
                          onChange={(e) => setEventForm(prev => ({ ...prev, color: e.target.value }))}
                          className="w-12 h-12 border border-gray-300 rounded-lg cursor-pointer"
                        />
                        <input
                          type="text"
                          value={eventForm.color}
                          onChange={(e) => setEventForm(prev => ({ ...prev, color: e.target.value }))}
                          className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Checkboxes */}
                  <div className="flex items-center space-x-6">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={eventForm.all_day}
                        onChange={(e) => setEventForm(prev => ({ ...prev, all_day: e.target.checked }))}
                        className="mr-2 rounded border-gray-300 focus:ring-blue-500"
                      />
                      All Day Event
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={eventForm.is_recurring}
                        onChange={(e) => setEventForm(prev => ({ ...prev, is_recurring: e.target.checked }))}
                        className="mr-2 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <Repeat size={16} className="mr-1" />
                      Recurring Event
                    </label>
                  </div>

                  {/* Recurrence Rule (if recurring) */}
                  {eventForm.is_recurring && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Recurrence Pattern
                      </label>
                      <select
                        value={eventForm.recurrence_rule}
                        onChange={(e) => setEventForm(prev => ({ ...prev, recurrence_rule: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select pattern...</option>
                        <option value="FREQ=DAILY">Daily</option>
                        <option value="FREQ=WEEKLY">Weekly</option>
                        <option value="FREQ=MONTHLY">Monthly</option>
                        <option value="FREQ=YEARLY">Yearly</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-6 border-t border-gray-200">
                <div>
                  {editingEvent && (
                    <button
                      onClick={handleDeleteEvent}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center"
                    >
                      <X size={16} className="mr-2" />
                      Delete Event
                    </button>
                  )}
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowEventModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEvent}
                    disabled={!eventForm.title || !eventForm.start_time || !eventForm.end_time}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center disabled:bg-gray-400"
                  >
                    <Check size={16} className="mr-2" />
                    {editingEvent ? 'Update Event' : 'Create Event'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Import Modal */}
      <AnimatePresence>
        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-md"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Import Calendar</h2>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="text-gray-500 hover:text-gray-700 p-2"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">Drop your .ics file here or click to browse</p>
                  <input
                    type="file"
                    accept=".ics,.ical"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImportCalendar(file);
                      }
                    }}
                    className="hidden"
                    id="calendar-import"
                  />
                  <label
                    htmlFor="calendar-import"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer inline-flex items-center"
                  >
                    <Upload size={16} className="mr-2" />
                    Choose File
                  </label>
                </div>
              </div>
            </motion.div>
          </div>        )}
      </AnimatePresence>

      {/* iCal Integration Modal */}      <ICalIntegration
        isOpen={showICalModal}
        onClose={() => setShowICalModal(false)}
        onImportSuccess={loadCalendarData}
      />      {/* Custom CSS for calendar styling */}
      <style>{`
        .next-gen-calendar .fc {
          font-family: inherit;
        }
        
        .next-gen-calendar .fc-event {
          border-radius: 6px;
          border: none;
          padding: 2px 6px;
          font-size: 12px;
          font-weight: 500;
        }
        
        .next-gen-calendar .fc-event.event-high-priority {
          box-shadow: 0 0 0 2px #EF4444;
        }
        
        .next-gen-calendar .fc-event.event-private {
          background-image: repeating-linear-gradient(
            45deg,
            transparent,
            transparent 2px,
            rgba(255, 255, 255, 0.1) 2px,
            rgba(255, 255, 255, 0.1) 4px
          );
        }
        
        .next-gen-calendar .fc-daygrid-event {
          border-radius: 4px;
          margin: 1px 2px;
        }
        
        .next-gen-calendar .fc-timegrid-event {
          border-radius: 4px;
        }
        
        .next-gen-calendar .fc-button-primary {
          background-color: #3B82F6;
          border-color: #3B82F6;
        }
        
        .next-gen-calendar .fc-button-primary:hover {
          background-color: #2563EB;
          border-color: #2563EB;
        }
        
        .next-gen-calendar .fc-today-button {
          background-color: #059669;
          border-color: #059669;
        }
      `}</style>
    </div>
  );
};

export default NextGenCalendar;

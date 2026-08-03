import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Plus, Calendar as CalendarIcon, Clock, MapPin, User, Filter } from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  clientName: string;
  clientId: string;
  type: 'photoshoot' | 'consultation' | 'delivery' | 'other';
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
}

const AdminCalendarPage: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, [selectedDate]);

  const fetchEvents = async () => {
    try {
      // Simulate API call - replace with actual endpoint
      const mockEvents: CalendarEvent[] = [
        {
          id: '1',
          title: 'Mueller Family Photoshoot',
          description: 'Outdoor family session in Stadtpark',
          startTime: '2025-01-26T10:00:00Z',
          endTime: '2025-01-26T11:30:00Z',
          location: 'Stadtpark Wien',
          clientName: 'Sarah Mueller',
          clientId: '1',
          type: 'photoshoot',
          status: 'confirmed'
        },
        {
          id: '2',
          title: 'Schmidt Wedding Consultation',
          description: 'Initial consultation for wedding photography',
          startTime: '2025-01-26T14:00:00Z',
          endTime: '2025-01-26T15:00:00Z',
          location: 'Studio',
          clientName: 'Michael Schmidt',
          clientId: '2',
          type: 'consultation',
          status: 'scheduled'
        },
        {
          id: '3',
          title: 'Weber Newborn Session',
          description: 'Newborn photography session',
          startTime: '2025-01-27T09:00:00Z',
          endTime: '2025-01-27T11:00:00Z',
          location: 'Studio',
          clientName: 'Anna Weber',
          clientId: '3',
          type: 'photoshoot',
          status: 'confirmed'
        },
        {
          id: '4',
          title: 'Photo Delivery - Huber',
          description: 'Deliver final photos to client',
          startTime: '2025-01-27T16:00:00Z',
          endTime: '2025-01-27T16:30:00Z',
          location: 'Client Office',
          clientName: 'Thomas Huber',
          clientId: '4',
          type: 'delivery',
          status: 'scheduled'
        }
      ];
      setEvents(mockEvents);
    } catch (error) {
      // console.error removed
    } finally {
      setLoading(false);
    }
  };

  const getEventTypeColor = (type: CalendarEvent['type']) => {
    const colors = {
      photoshoot: 'bg-purple-100 text-purple-800 border-purple-200',
      consultation: 'bg-blue-100 text-blue-800 border-blue-200',
      delivery: 'bg-green-100 text-green-800 border-green-200',
      other: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[type];
  };

  const getStatusBadge = (status: CalendarEvent['status']) => {
    const statusConfig = {
      scheduled: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Scheduled' },
      confirmed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Confirmed' },
      completed: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Completed' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled' }
    };

    const config = statusConfig[status];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getEventsForDate = (date: string) => {
    return events.filter(event => 
      event.startTime.split('T')[0] === date
    ).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  };

  const generateWeekDates = (selectedDate: string) => {
    const date = new Date(selectedDate);
    const week = [];
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay() + 1); // Start from Monday

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push(day.toISOString().split('T')[0]);
    }
    return week;
  };

  const weekDates = generateWeekDates(selectedDate);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Calendar</h1>
            <p className="text-gray-600">Manage appointments and schedule events</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex rounded-lg border border-gray-300">
              <button
                onClick={() => setViewMode('day')}
                className={`px-4 py-2 text-sm font-medium ${
                  viewMode === 'day' ? 'bg-purple-600 text-white' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-4 py-2 text-sm font-medium border-l border-gray-300 ${
                  viewMode === 'week' ? 'bg-purple-600 text-white' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-4 py-2 text-sm font-medium border-l border-gray-300 ${
                  viewMode === 'month' ? 'bg-purple-600 text-white' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Month
              </button>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <Plus size={20} className="mr-2" />
              Add Event
            </button>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
            <div className="flex items-center space-x-4">
              <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Filter size={20} className="mr-2" />
                Filter Events
              </button>
              <button
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Today
              </button>
            </div>
          </div>
        </div>

        {/* Calendar View */}
        {viewMode === 'week' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="grid grid-cols-7 gap-0 border-b border-gray-200">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                <div key={day} className="p-4 text-center border-r border-gray-200 last:border-r-0">
                  <div className="text-sm font-medium text-gray-500">{day}</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {new Date(weekDates[index]).getDate()}
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0 min-h-96">
              {weekDates.map((date, index) => {
                const dayEvents = getEventsForDate(date);
                return (
                  <div key={date} className="p-2 border-r border-gray-200 last:border-r-0">
                    <div className="space-y-1">
                      {dayEvents.map((event) => (
                        <div
                          key={event.id}
                          className={`p-2 rounded border text-xs ${getEventTypeColor(event.type)}`}
                        >
                          <div className="font-medium truncate">{event.title}</div>
                          <div className="flex items-center text-xs opacity-75">
                            <Clock size={10} className="mr-1" />
                            {new Date(event.startTime).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Events List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Events for {new Date(selectedDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {getEventsForDate(selectedDate).map((event) => (
              <div key={event.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-medium text-gray-900">{event.title}</h4>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getEventTypeColor(event.type)}`}>
                        {event.type}
                      </span>
                      {getStatusBadge(event.status)}
                    </div>
                    <p className="text-gray-600 mb-3">{event.description}</p>
                    <div className="flex items-center space-x-6 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Clock size={16} className="mr-2" />
                        {new Date(event.startTime).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        })} - {new Date(event.endTime).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        })}
                      </div>
                      <div className="flex items-center">
                        <MapPin size={16} className="mr-2" />
                        {event.location}
                      </div>
                      <div className="flex items-center">
                        <User size={16} className="mr-2" />
                        {event.clientName}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button className="text-blue-600 hover:text-blue-900 text-sm">Edit</button>
                    <button className="text-red-600 hover:text-red-900 text-sm">Cancel</button>
                  </div>
                </div>
              </div>
            ))}
            {getEventsForDate(selectedDate).length === 0 && (
              <div className="p-6 text-center text-gray-500">
                No events scheduled for this date.
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminCalendarPage;
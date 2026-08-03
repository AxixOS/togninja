import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Edit, 
  Trash2, 
  Copy, 
  ExternalLink,
  Clock,
  MapPin,
  DollarSign,
  Users,
  Check,
  X,
  Loader2,
  Settings,
  Link as LinkIcon,
  Eye,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Mail,
  ArrowUpDown
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface Scheduler {
  id: string;
  name: string;
  slug: string;
  description: string;
  sessionType: string;
  duration: number;
  location: string;
  price: string;
  availabilityType: string;
  startDate: string | null;
  endDate: string | null;
  timezone: string;
  weeklyAvailability: Record<string, Array<{ start: string; end: string }>>;
  specificDates: Array<{ date: string; windows: Array<{ start: string; end: string }> }> | null;
  bufferBefore: number;
  bufferAfter: number;
  minNotice: number;
  maxAdvance: number;
  maxPerDay: number | null;
  availabilityIncrements: number;
  autoApprove: boolean;
  sendReminders: boolean;
  reminderHours: number;
  brandName: string;
  brandColor: string;
  isActive: boolean;
  createdAt: string;
}

interface SchedulerBooking {
  id: string;
  schedulerId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  scheduledDate: string;
  scheduledEndDate: string;
  status: string;
  clientNotes: string;
  confirmationSent: boolean;
  createdAt: string;
}

const defaultWeeklyAvailability = {
  monday: [{ start: '09:00', end: '17:00' }],
  tuesday: [{ start: '09:00', end: '17:00' }],
  wednesday: [{ start: '09:00', end: '17:00' }],
  thursday: [{ start: '09:00', end: '17:00' }],
  friday: [{ start: '09:00', end: '17:00' }],
  saturday: [],
  sunday: []
};

export default function AdminSchedulersPage() {
  // State
  const [schedulers, setSchedulers] = useState<Scheduler[]>([]);
  const [bookings, setBookings] = useState<SchedulerBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'schedulers' | 'bookings'>('schedulers');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingScheduler, setEditingScheduler] = useState<Scheduler | null>(null);
  const [expandedScheduler, setExpandedScheduler] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Bookings sort state
  const [bookingSortField, setBookingSortField] = useState<'clientName' | 'scheduledDate' | 'status'>('scheduledDate');
  const [bookingSortDirection, setBookingSortDirection] = useState<'asc' | 'desc'>('desc');

  const toggleBookingSort = (field: 'clientName' | 'scheduledDate' | 'status') => {
    if (bookingSortField === field) {
      setBookingSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setBookingSortField(field);
      setBookingSortDirection(field === 'clientName' ? 'asc' : 'desc');
    }
  };

  const sortedBookings = [...bookings].sort((a, b) => {
    const dir = bookingSortDirection === 'asc' ? 1 : -1;
    switch (bookingSortField) {
      case 'clientName':
        return dir * a.clientName.localeCompare(b.clientName);
      case 'scheduledDate':
        return dir * (new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
      case 'status': {
        const order: Record<string, number> = { pending: 0, confirmed: 1, completed: 2, cancelled: 3 };
        return dir * ((order[a.status] ?? 4) - (order[b.status] ?? 4));
      }
      default:
        return 0;
    }
  });

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    sessionType: 'portrait',
    duration: 60,
    location: '',
    price: '',
    availabilityType: 'ongoing',
    startDate: '',
    endDate: '',
    timezone: 'Europe/Vienna',
    weeklyAvailability: defaultWeeklyAvailability as Record<string, Array<{ start: string; end: string }>>,
    specificDates: [] as Array<{ date: string; windows: Array<{ start: string; end: string }> }>,
    bufferBefore: 0,
    bufferAfter: 0,
    minNotice: 24,
    maxAdvance: 90,
    maxPerDay: null as number | null,
    availabilityIncrements: 60,
    autoApprove: true,
    sendReminders: true,
    reminderHours: 24,
    reminderTimings: [] as Array<{ value: number; unit: string }>,
    reminderEmailSubject: '',
    reminderEmailBody: '',
    confirmationMessage: '',
    brandName: '',
    brandColor: '#0d9488'
  });

  // Fetch data
  useEffect(() => {
    fetchSchedulers();
    fetchAllBookings();
  }, []);

  const fetchSchedulers = async () => {
    try {
      const response = await fetch('/api/schedulers', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setSchedulers(data);
      }
    } catch (error) {
      console.error('Error fetching schedulers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllBookings = async () => {
    try {
      const response = await fetch('/api/schedulers/bookings/all', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setBookings(data.map((item: any) => item.booking));
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const handleCreateScheduler = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/schedulers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const newScheduler = await response.json();
        setSchedulers([newScheduler, ...schedulers]);
        setShowCreateModal(false);
        resetForm();
      } else {
        const errorData = await response.json().catch(() => null);
        alert(errorData?.error || `Failed to create scheduler (${response.status})`);
      }
    } catch (error) {
      console.error('Error creating scheduler:', error);
      alert('Network error — could not create scheduler');
    }
  };

  const handleUpdateScheduler = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScheduler) return;

    try {
      const response = await fetch(`/api/schedulers/${editingScheduler.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const updated = await response.json();
        setSchedulers(schedulers.map(s => s.id === updated.id ? updated : s));
        setEditingScheduler(null);
        resetForm();
      } else {
        const errorData = await response.json().catch(() => null);
        alert(errorData?.error || `Failed to update scheduler (${response.status})`);
      }
    } catch (error) {
      console.error('Error updating scheduler:', error);
      alert('Network error — could not update scheduler');
    }
  };

  const handleDeleteScheduler = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scheduler?')) return;

    try {
      const response = await fetch(`/api/schedulers/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        setSchedulers(schedulers.filter(s => s.id !== id));
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete scheduler');
      }
    } catch (error) {
      console.error('Error deleting scheduler:', error);
    }
  };

  const handleToggleActive = async (scheduler: Scheduler) => {
    try {
      const response = await fetch(`/api/schedulers/${scheduler.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: !scheduler.isActive })
      });

      if (response.ok) {
        setSchedulers(schedulers.map(s => 
          s.id === scheduler.id ? { ...s, isActive: !s.isActive } : s
        ));
      }
    } catch (error) {
      console.error('Error toggling scheduler:', error);
    }
  };

  const handleUpdateBookingStatus = async (bookingId: string, status: string) => {
    try {
      const response = await fetch(`/api/schedulers/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        fetchAllBookings();
      }
    } catch (error) {
      console.error('Error updating booking:', error);
    }
  };

  const handleDeleteBooking = async (bookingId: string, clientName: string) => {
    if (!confirm(`Delete booking for ${clientName}? This cannot be undone.`)) return;
    try {
      const response = await fetch(`/api/schedulers/bookings/${bookingId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        fetchAllBookings();
        fetchSchedulers();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete booking');
      }
    } catch (error) {
      console.error('Error deleting booking:', error);
      alert('Failed to delete booking');
    }
  };

  const copyBookingLink = (slug: string) => {
    const link = `${window.location.origin}/book/${slug}`;
    navigator.clipboard.writeText(link);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      sessionType: 'portrait',
      duration: 60,
      location: '',
      price: '',
      availabilityType: 'ongoing',
      startDate: '',
      endDate: '',
      timezone: 'Europe/Vienna',
      weeklyAvailability: defaultWeeklyAvailability,
      specificDates: [],
      bufferBefore: 0,
      bufferAfter: 0,
      minNotice: 24,
      maxAdvance: 90,
      maxPerDay: null,
      availabilityIncrements: 60,
      autoApprove: true,
      sendReminders: true,
      reminderHours: 24,
      reminderTimings: [],
      reminderEmailSubject: '',
      reminderEmailBody: '',
      confirmationMessage: '',
      brandName: '',
      brandColor: '#0d9488'
    });
  };

  const openEditModal = (scheduler: Scheduler) => {
    setFormData({
      name: scheduler.name,
      slug: scheduler.slug || '',
      description: scheduler.description || '',
      sessionType: scheduler.sessionType,
      duration: scheduler.duration,
      location: scheduler.location || '',
      price: scheduler.price || '',
      availabilityType: scheduler.availabilityType || 'ongoing',
      startDate: scheduler.startDate ? scheduler.startDate.split('T')[0] : '',
      endDate: scheduler.endDate ? scheduler.endDate.split('T')[0] : '',
      timezone: scheduler.timezone,
      weeklyAvailability: scheduler.weeklyAvailability || defaultWeeklyAvailability,
      specificDates: scheduler.specificDates || [],
      bufferBefore: scheduler.bufferBefore,
      bufferAfter: scheduler.bufferAfter,
      minNotice: scheduler.minNotice,
      maxAdvance: scheduler.maxAdvance,
      maxPerDay: scheduler.maxPerDay,
      availabilityIncrements: scheduler.availabilityIncrements,
      autoApprove: scheduler.autoApprove,
      sendReminders: scheduler.sendReminders,
      reminderHours: scheduler.reminderHours,
      reminderTimings: (scheduler as any).reminderTimings || [],
      reminderEmailSubject: (scheduler as any).reminderEmailSubject || '',
      reminderEmailBody: (scheduler as any).reminderEmailBody || '',
      confirmationMessage: (scheduler as any).confirmationMessage || '',
      brandName: scheduler.brandName || '',
      brandColor: scheduler.brandColor || '#0d9488'
    });
    setEditingScheduler(scheduler);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Scheduler form modal
  const renderSchedulerForm = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingScheduler ? 'Edit Scheduler' : 'Create New Scheduler'}
          </h2>
        </div>

        <form onSubmit={editingScheduler ? handleUpdateScheduler : handleCreateScheduler} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Basic Information</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                placeholder="e.g., Shooting, Consultation"
              />
            </div>

            {/* Custom Slug (URL) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Booking URL Slug {editingScheduler && <span className="text-gray-400 font-normal">(change to customise your link)</span>}
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 whitespace-nowrap">{window.location.origin}/book/</span>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => {
                    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-');
                    setFormData({ ...formData, slug: val });
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  placeholder={formData.name ? formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : 'auto-generated-from-name'}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Leave empty to auto-generate from the name. Use only lowercase letters, numbers, and hyphens.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                placeholder="Brief description for clients"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Session Type</label>
                <select
                  value={formData.sessionType}
                  onChange={(e) => setFormData({ ...formData, sessionType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                >
                  <option value="portrait">Portrait</option>
                  <option value="family">Family</option>
                  <option value="wedding">Wedding</option>
                  <option value="newborn">Newborn</option>
                  <option value="maternity">Maternity</option>
                  <option value="event">Event</option>
                  <option value="commercial">Commercial</option>
                  <option value="consultation">Consultation</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                <select
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                  <option value={180}>3 hours</option>
                  <option value={240}>4 hours</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  placeholder="Studio, On-location, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (€)</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Availability Settings */}
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <h3 className="font-medium text-gray-900">Availability Settings</h3>

            {/* Availability Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Availability Type</label>
              <select
                value={formData.availabilityType}
                onChange={(e) => setFormData({ ...formData, availabilityType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              >
                <option value="ongoing">Ongoing (recurring weekly schedule)</option>
                <option value="date_range">Date Range (available within a period)</option>
                <option value="specific_dates">Specific Dates Only</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {formData.availabilityType === 'ongoing' && 'Clients can book on any matching day within the max advance window.'}
                {formData.availabilityType === 'date_range' && 'Clients can only book between the start and end dates below.'}
                {formData.availabilityType === 'specific_dates' && 'Clients can only book on the exact dates you specify below.'}
              </p>
            </div>

            {/* Date Range inputs (only for date_range type) */}
            {formData.availabilityType === 'date_range' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            )}

            {/* Weekly Schedule Editor (for ongoing and date_range) */}
            {(formData.availabilityType === 'ongoing' || formData.availabilityType === 'date_range') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Weekly Schedule</label>
                <div className="space-y-2 bg-gray-50 rounded-lg p-3">
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                    const dayWindows = formData.weeklyAvailability[day] || [];
                    const isEnabled = dayWindows.length > 0;
                    
                    return (
                      <div key={day} className="flex items-center gap-3">
                        <label className="flex items-center gap-2 w-28 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={(e) => {
                              const newAvail = { ...formData.weeklyAvailability };
                              if (e.target.checked) {
                                newAvail[day] = [{ start: '09:00', end: '17:00' }];
                              } else {
                                newAvail[day] = [];
                              }
                              setFormData({ ...formData, weeklyAvailability: newAvail });
                            }}
                            className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                          />
                          <span className="text-sm font-medium text-gray-700 capitalize">{day}</span>
                        </label>
                        
                        {isEnabled && dayWindows.map((window, windowIdx) => (
                          <div key={windowIdx} className="flex items-center gap-1">
                            <input
                              type="time"
                              value={window.start}
                              onChange={(e) => {
                                const newAvail = { ...formData.weeklyAvailability };
                                newAvail[day] = [...dayWindows];
                                newAvail[day][windowIdx] = { ...newAvail[day][windowIdx], start: e.target.value };
                                setFormData({ ...formData, weeklyAvailability: newAvail });
                              }}
                              className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-teal-500"
                            />
                            <span className="text-gray-400 text-sm">–</span>
                            <input
                              type="time"
                              value={window.end}
                              onChange={(e) => {
                                const newAvail = { ...formData.weeklyAvailability };
                                newAvail[day] = [...dayWindows];
                                newAvail[day][windowIdx] = { ...newAvail[day][windowIdx], end: e.target.value };
                                setFormData({ ...formData, weeklyAvailability: newAvail });
                              }}
                              className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-teal-500"
                            />
                            {dayWindows.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newAvail = { ...formData.weeklyAvailability };
                                  newAvail[day] = dayWindows.filter((_, i) => i !== windowIdx);
                                  setFormData({ ...formData, weeklyAvailability: newAvail });
                                }}
                                className="p-1 text-red-400 hover:text-red-600"
                                title="Remove window"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                        
                        {isEnabled && (
                          <button
                            type="button"
                            onClick={() => {
                              const newAvail = { ...formData.weeklyAvailability };
                              newAvail[day] = [...dayWindows, { start: '13:00', end: '17:00' }];
                              setFormData({ ...formData, weeklyAvailability: newAvail });
                            }}
                            className="text-xs text-teal-600 hover:text-teal-700 whitespace-nowrap"
                          >
                            + Add window
                          </button>
                        )}
                        
                        {!isEnabled && (
                          <span className="text-xs text-gray-400">Unavailable</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Specific Dates Editor */}
            {formData.availabilityType === 'specific_dates' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Available Dates</label>
                <div className="space-y-2 bg-gray-50 rounded-lg p-3">
                  {formData.specificDates.map((sd, sdIdx) => (
                    <div key={sdIdx} className="flex items-center gap-3 bg-white p-2 rounded border border-gray-200">
                      <input
                        type="date"
                        value={sd.date}
                        onChange={(e) => {
                          const newDates = [...formData.specificDates];
                          newDates[sdIdx] = { ...sd, date: e.target.value };
                          setFormData({ ...formData, specificDates: newDates });
                        }}
                        className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-teal-500"
                      />
                      {sd.windows.map((w, wIdx) => (
                        <div key={wIdx} className="flex items-center gap-1">
                          <input
                            type="time"
                            value={w.start}
                            onChange={(e) => {
                              const newDates = [...formData.specificDates];
                              const newWindows = [...sd.windows];
                              newWindows[wIdx] = { ...w, start: e.target.value };
                              newDates[sdIdx] = { ...sd, windows: newWindows };
                              setFormData({ ...formData, specificDates: newDates });
                            }}
                            className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-teal-500"
                          />
                          <span className="text-gray-400 text-sm">–</span>
                          <input
                            type="time"
                            value={w.end}
                            onChange={(e) => {
                              const newDates = [...formData.specificDates];
                              const newWindows = [...sd.windows];
                              newWindows[wIdx] = { ...w, end: e.target.value };
                              newDates[sdIdx] = { ...sd, windows: newWindows };
                              setFormData({ ...formData, specificDates: newDates });
                            }}
                            className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-teal-500"
                          />
                          {sd.windows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newDates = [...formData.specificDates];
                                newDates[sdIdx] = { ...sd, windows: sd.windows.filter((_, i) => i !== wIdx) };
                                setFormData({ ...formData, specificDates: newDates });
                              }}
                              className="p-1 text-red-400 hover:text-red-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const newDates = [...formData.specificDates];
                          newDates[sdIdx] = { ...sd, windows: [...sd.windows, { start: '13:00', end: '17:00' }] };
                          setFormData({ ...formData, specificDates: newDates });
                        }}
                        className="text-xs text-teal-600 hover:text-teal-700 whitespace-nowrap"
                      >
                        + Window
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, specificDates: formData.specificDates.filter((_, i) => i !== sdIdx) });
                        }}
                        className="p-1 text-red-400 hover:text-red-600 ml-auto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  
                  <button
                    type="button"
                    onClick={() => {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      const dateStr = tomorrow.toISOString().split('T')[0];
                      setFormData({
                        ...formData,
                        specificDates: [...formData.specificDates, { date: dateStr, windows: [{ start: '09:00', end: '17:00' }] }]
                      });
                    }}
                    className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add Date
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Only the dates listed above will be available for booking. Each date also needs its time windows set.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time Increments</label>
                <select
                  value={formData.availabilityIncrements}
                  onChange={(e) => setFormData({ ...formData, availabilityIncrements: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>60 minutes</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Per Day</label>
                <input
                  type="number"
                  value={formData.maxPerDay || ''}
                  onChange={(e) => setFormData({ ...formData, maxPerDay: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  placeholder="Unlimited"
                  min="1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Buffer Before (min)</label>
                <input
                  type="number"
                  value={formData.bufferBefore}
                  onChange={(e) => setFormData({ ...formData, bufferBefore: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Buffer After (min)</label>
                <input
                  type="number"
                  value={formData.bufferAfter}
                  onChange={(e) => setFormData({ ...formData, bufferAfter: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Notice (hours)</label>
                <input
                  type="number"
                  value={formData.minNotice}
                  onChange={(e) => setFormData({ ...formData, minNotice: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Advance (days)</label>
                <input
                  type="number"
                  value={formData.maxAdvance}
                  onChange={(e) => setFormData({ ...formData, maxAdvance: parseInt(e.target.value) || 30 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  min="1"
                />
              </div>
            </div>
          </div>

          {/* Confirmation Settings */}
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <h3 className="font-medium text-gray-900">Booking Options</h3>

            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.autoApprove}
                  onChange={(e) => setFormData({ ...formData, autoApprove: e.target.checked })}
                  className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                />
                <span className="ml-2 text-sm text-gray-700">Auto-approve bookings</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.sendReminders}
                  onChange={(e) => setFormData({ ...formData, sendReminders: e.target.checked })}
                  className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                />
                <span className="ml-2 text-sm text-gray-700">Send email reminders</span>
              </label>
            </div>

            {/* Email Reminder Settings (visible when sendReminders is checked) */}
            {formData.sendReminders && (
              <div className="ml-6 space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                {/* Multiple Reminder Timings */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reminder Schedule</label>
                  <p className="text-xs text-gray-500 mb-2">Add one or more reminders to send before the appointment.</p>
                  {(formData.reminderTimings.length > 0 ? formData.reminderTimings : [{ value: formData.reminderHours >= 24 ? formData.reminderHours / 24 : formData.reminderHours, unit: formData.reminderHours >= 24 ? 'days' : 'hours' }]).map((timing, idx) => (
                    <div key={idx} className="flex items-center gap-2 mb-2">
                      <input
                        type="number"
                        min={1}
                        value={timing.value}
                        onChange={(e) => {
                          const timings = formData.reminderTimings.length > 0
                            ? [...formData.reminderTimings]
                            : [{ value: formData.reminderHours >= 24 ? formData.reminderHours / 24 : formData.reminderHours, unit: formData.reminderHours >= 24 ? 'days' : 'hours' }];
                          timings[idx] = { ...timings[idx], value: parseInt(e.target.value) || 1 };
                          setFormData({ ...formData, reminderTimings: timings });
                        }}
                        className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm"
                      />
                      <select
                        value={timing.unit}
                        onChange={(e) => {
                          const timings = formData.reminderTimings.length > 0
                            ? [...formData.reminderTimings]
                            : [{ value: formData.reminderHours >= 24 ? formData.reminderHours / 24 : formData.reminderHours, unit: formData.reminderHours >= 24 ? 'days' : 'hours' }];
                          timings[idx] = { ...timings[idx], unit: e.target.value };
                          setFormData({ ...formData, reminderTimings: timings });
                        }}
                        className="px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm"
                      >
                        <option value="hours">hours before</option>
                        <option value="days">days before</option>
                        <option value="weeks">weeks before</option>
                      </select>
                      {(formData.reminderTimings.length > 1 || idx > 0) && (
                        <button
                          type="button"
                          onClick={() => {
                            const timings = [...(formData.reminderTimings.length > 0 ? formData.reminderTimings : [{ value: formData.reminderHours >= 24 ? formData.reminderHours / 24 : formData.reminderHours, unit: formData.reminderHours >= 24 ? 'days' : 'hours' }])];
                            timings.splice(idx, 1);
                            setFormData({ ...formData, reminderTimings: timings });
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const timings = formData.reminderTimings.length > 0
                        ? [...formData.reminderTimings]
                        : [{ value: formData.reminderHours >= 24 ? formData.reminderHours / 24 : formData.reminderHours, unit: formData.reminderHours >= 24 ? 'days' : 'hours' }];
                      timings.push({ value: 2, unit: 'hours' });
                      setFormData({ ...formData, reminderTimings: timings });
                    }}
                    className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add another reminder
                  </button>
                </div>

                {/* Custom Reminder Email Template */}
                <div className="pt-3 border-t border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reminder Email Subject</label>
                  <input
                    type="text"
                    value={formData.reminderEmailSubject}
                    onChange={(e) => setFormData({ ...formData, reminderEmailSubject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm"
                    placeholder="Reminder: Your {{session_type}} session on {{date}}"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reminder Email Body</label>
                  <textarea
                    value={formData.reminderEmailBody}
                    onChange={(e) => setFormData({ ...formData, reminderEmailBody: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm"
                    rows={5}
                    placeholder={`Hi {{client_name}},\n\nThis is a friendly reminder about your upcoming {{session_type}} session.\n\n📅 Date: {{date}}\n🕐 Time: {{time}}\n📍 Location: {{location}}\n\nWe look forward to seeing you!\n\nBest regards,\n{{brand_name}}`}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Placeholders: {'{{client_name}}'}, {'{{date}}'}, {'{{time}}'}, {'{{location}}'}, {'{{session_type}}'}, {'{{brand_name}}'}, {'{{booking_link}}'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmation Message</label>
                  <textarea
                    value={formData.confirmationMessage}
                    onChange={(e) => setFormData({ ...formData, confirmationMessage: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm"
                    rows={3}
                    placeholder="Custom message included in the booking confirmation email. Leave empty for the default."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Available placeholders: {'{{client_name}}'}, {'{{date}}'}, {'{{time}}'}, {'{{location}}'}, {'{{session_type}}'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Branding */}
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <h3 className="font-medium text-gray-900">Branding</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name</label>
                <input
                  type="text"
                  value={formData.brandName}
                  onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  placeholder="Your studio name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.brandColor}
                    onChange={(e) => setFormData({ ...formData, brandColor: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.brandColor}
                    onChange={(e) => setFormData({ ...formData, brandColor: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                setShowCreateModal(false);
                setEditingScheduler(null);
                resetForm();
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-teal-600 hover:bg-teal-700 rounded-lg"
            >
              {editingScheduler ? 'Save Changes' : 'Create Scheduler'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
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
            <h1 className="text-2xl font-semibold text-gray-900">Schedulers</h1>
            <p className="text-gray-600">Create booking links for clients to self-schedule appointments</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            <Plus className="w-5 h-5" />
            Add New
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('schedulers')}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'schedulers'
                  ? 'border-teal-600 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <CalendarIcon className="w-4 h-4 inline mr-2" />
              Schedulers ({schedulers.length})
            </button>
            <button
              onClick={() => setActiveTab('bookings')}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'bookings'
                  ? 'border-teal-600 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Bookings ({bookings.length})
            </button>
          </div>
        </div>

        {/* Schedulers Tab */}
        {activeTab === 'schedulers' && (
          <div className="space-y-4">
            {schedulers.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No schedulers yet</h3>
                <p className="text-gray-500 mb-4">Create your first scheduler to let clients book appointments</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                >
                  Create Scheduler
                </button>
              </div>
            ) : (
              schedulers.map(scheduler => (
                <div key={scheduler.id} className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setExpandedScheduler(
                          expandedScheduler === scheduler.id ? null : scheduler.id
                        )}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {expandedScheduler === scheduler.id ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>

                      <div
                        className="w-3 h-10 rounded-full"
                        style={{ backgroundColor: scheduler.brandColor }}
                      />

                      <div>
                        <h3 className="font-medium text-gray-900">{scheduler.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {scheduler.duration} min
                          </span>
                          {scheduler.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {scheduler.location}
                            </span>
                          )}
                          {scheduler.price && parseFloat(scheduler.price) > 0 && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              €{parseFloat(scheduler.price).toFixed(0)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Active toggle */}
                      <button
                        onClick={() => handleToggleActive(scheduler)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          scheduler.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {scheduler.isActive ? 'Active' : 'Inactive'}
                      </button>

                      {/* Copy link button */}
                      <button
                        onClick={() => copyBookingLink(scheduler.slug)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-teal-600 hover:bg-teal-50 rounded-lg"
                        title="Copy booking link"
                      >
                        {copiedSlug === scheduler.slug ? (
                          <>
                            <Check className="w-4 h-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copy Link
                          </>
                        )}
                      </button>

                      {/* Preview button */}
                      <a
                        href={`/book/${scheduler.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                        title="Preview booking page"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>

                      {/* Edit button */}
                      <button
                        onClick={() => openEditModal(scheduler)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                        title="Edit scheduler"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      {/* Delete button */}
                      <button
                        onClick={() => handleDeleteScheduler(scheduler.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete scheduler"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {expandedScheduler === scheduler.id && (
                    <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Session Type</p>
                          <p className="font-medium capitalize">{scheduler.sessionType}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Availability</p>
                          <p className="font-medium capitalize">
                            {scheduler.availabilityType === 'date_range' ? 'Date Range' : 
                             scheduler.availabilityType === 'specific_dates' ? 'Specific Dates' : 
                             'Ongoing'}
                            {scheduler.availabilityType === 'date_range' && scheduler.startDate && scheduler.endDate && (
                              <span className="text-gray-400 text-xs block">
                                {new Date(scheduler.startDate).toLocaleDateString()} – {new Date(scheduler.endDate).toLocaleDateString()}
                              </span>
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Auto Approve</p>
                          <p className="font-medium">{scheduler.autoApprove ? 'Yes' : 'No'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Time Increments</p>
                          <p className="font-medium">{scheduler.availabilityIncrements} min</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Min Notice</p>
                          <p className="font-medium">{scheduler.minNotice} hours</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Max Advance</p>
                          <p className="font-medium">{scheduler.maxAdvance} days</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Max Per Day</p>
                          <p className="font-medium">{scheduler.maxPerDay || 'Unlimited'}</p>
                        </div>
                      </div>

                      {/* Weekly schedule summary */}
                      {scheduler.weeklyAvailability && (scheduler.availabilityType === 'ongoing' || scheduler.availabilityType === 'date_range') && (
                        <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                          <p className="text-xs text-gray-500 mb-2 font-medium">Weekly Schedule</p>
                          <div className="grid grid-cols-7 gap-1 text-xs text-center">
                            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((label, i) => {
                              const dayKey = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'][i];
                              const windows = scheduler.weeklyAvailability[dayKey] || [];
                              return (
                                <div key={dayKey} className={`p-1 rounded ${windows.length > 0 ? 'bg-teal-50 text-teal-700' : 'bg-gray-50 text-gray-400'}`}>
                                  <p className="font-medium">{label}</p>
                                  {windows.length > 0 ? windows.map((w: any, j: number) => (
                                    <p key={j}>{w.start}–{w.end}</p>
                                  )) : <p>Off</p>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Specific dates summary */}
                      {scheduler.specificDates && scheduler.availabilityType === 'specific_dates' && (
                        <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                          <p className="text-xs text-gray-500 mb-2 font-medium">Available Dates ({scheduler.specificDates.length})</p>
                          <div className="flex flex-wrap gap-1">
                            {(scheduler.specificDates as any[]).map((sd: any, i: number) => (
                              <span key={i} className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded text-xs">
                                {sd.date} ({sd.windows?.map((w: any) => `${w.start}–${w.end}`).join(', ')})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">Booking Link</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-sm text-gray-700 bg-gray-50 px-2 py-1 rounded">
                            {window.location.origin}/book/{scheduler.slug}
                          </code>
                          <button
                            onClick={() => copyBookingLink(scheduler.slug)}
                            className="text-teal-600 hover:text-teal-700"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {bookings.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings yet</h3>
                <p className="text-gray-500">Bookings will appear here when clients schedule appointments</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700 select-none"
                      onClick={() => toggleBookingSort('clientName')}
                    >
                      <span className="inline-flex items-center gap-1">
                        Client
                        {bookingSortField === 'clientName' ? (
                          bookingSortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </span>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700 select-none"
                      onClick={() => toggleBookingSort('scheduledDate')}
                    >
                      <span className="inline-flex items-center gap-1">
                        Date & Time
                        {bookingSortField === 'scheduledDate' ? (
                          bookingSortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </span>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700 select-none"
                      onClick={() => toggleBookingSort('status')}
                    >
                      <span className="inline-flex items-center gap-1">
                        Status
                        {bookingSortField === 'status' ? (
                          bookingSortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </span>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedBookings.map(booking => {
                    const isNew = (() => {
                      try {
                        const created = new Date(booking.createdAt);
                        return !isNaN(created.getTime()) && (Date.now() - created.getTime()) < 48 * 60 * 60 * 1000;
                      } catch { return false; }
                    })();
                    return (
                    <tr key={booking.id} className={`hover:bg-gray-50 ${isNew ? 'bg-blue-50/50' : ''}`}>
                      <td className="px-4 py-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">{booking.clientName}</p>
                            {isNew && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-600 text-white animate-pulse">
                                New
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{booking.clientEmail}</p>
                          {booking.clientPhone && (
                            <p className="text-sm text-gray-500">{booking.clientPhone}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-900">
                          {format(parseISO(booking.scheduledDate), 'MMM d, yyyy')}
                        </p>
                        <p className="text-sm text-gray-500">
                          {format(parseISO(booking.scheduledDate), 'h:mm a')}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(booking.status)}`}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {booking.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleUpdateBookingStatus(booking.id, 'confirmed')}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                                title="Confirm"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleUpdateBookingStatus(booking.id, 'cancelled')}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {booking.status === 'confirmed' && (
                            <button
                              onClick={() => handleUpdateBookingStatus(booking.id, 'completed')}
                              className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                            >
                              Mark Complete
                            </button>
                          )}
                          <a
                            href={`mailto:${booking.clientEmail}?subject=${encodeURIComponent(`Your appointment on ${format(parseISO(booking.scheduledDate), 'MMMM d, yyyy')} at ${format(parseISO(booking.scheduledDate), 'h:mm a')}`)}`}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                            title="Email client"
                          >
                            <Mail className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => handleDeleteBooking(booking.id, booking.clientName)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Delete booking"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingScheduler) && renderSchedulerForm()}
    </AdminLayout>
  );
}

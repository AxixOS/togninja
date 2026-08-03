import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  AlertCircle,
  User,
  Mail,
  Phone,
  MessageSquare
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  parseISO,
  isToday,
  isBefore,
  startOfDay,
  isAfter
} from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { useLanguage } from '../../context/LanguageContext';

interface Scheduler {
  id: string;
  name: string;
  slug: string;
  description: string;
  sessionType: string;
  duration: number;
  location: string;
  price: string;
  timezone: string;
  availabilityIncrements: number;
  brandName: string;
  brandColor: string;
  questionnaireFields?: any[];
}

interface TimeSlot {
  start: string;
  end: string;
  formatted: string;
}

interface AvailabilityData {
  startDate: string;
  endDate: string;
  availability: Record<string, TimeSlot[]>;
}

export default function PublicSchedulerPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const dateLocale = language === 'de' ? de : enUS;
  const dayNames = t('scheduler.dayNames').split(',');

  // State
  const [scheduler, setScheduler] = useState<Scheduler | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availability, setAvailability] = useState<AvailabilityData | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [step, setStep] = useState<'calendar' | 'time' | 'details' | 'confirm'>('calendar');
  
  // Form state
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    clientNotes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<any>(null);
  const [autoScrolling, setAutoScrolling] = useState(false);
  const [hasAutoScrolled, setHasAutoScrolled] = useState(false);

  // Fetch scheduler info
  useEffect(() => {
    const fetchScheduler = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/schedulers/public/${slug}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('This booking link is not available.');
          } else {
            setError('Failed to load booking page.');
          }
          return;
        }

        const data = await response.json();
        setScheduler(data);
      } catch (err) {
        setError('Failed to load booking page.');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchScheduler();
    }
  }, [slug]);

  // Fetch availability when month changes
  useEffect(() => {
    const fetchAvailability = async () => {
      if (!scheduler) return;

      try {
        setAvailabilityLoading(true);
        const monthStr = format(currentMonth, 'yyyy-MM');
        const response = await fetch(`/api/schedulers/public/${slug}/availability?month=${monthStr}`);
        
        if (response.ok) {
          const data = await response.json();
          setAvailability(data);
        }
      } catch (err) {
        console.error('Failed to fetch availability:', err);
      } finally {
        setAvailabilityLoading(false);
      }
    };

    fetchAvailability();
  }, [scheduler, currentMonth, slug]);

  // Check if a date has available slots
  const hasAvailability = (date: Date): boolean => {
    if (!availability) return false;
    const dateKey = format(date, 'yyyy-MM-dd');
    const slots = availability.availability[dateKey];
    return slots && slots.length > 0;
  };

  // Find the first available date in current availability data
  const getFirstAvailableDate = (): Date | null => {
    if (!availability) return null;
    const now = startOfDay(new Date());
    const sortedKeys = Object.keys(availability.availability)
      .filter(key => availability.availability[key]?.length > 0)
      .sort();
    for (const key of sortedKeys) {
      const d = parseISO(key);
      if (!isBefore(d, now)) return d;
    }
    return null;
  };

  // Auto-scroll to next month with availability if current month is empty
  useEffect(() => {
    if (!availability || availabilityLoading || hasAutoScrolled) return;
    
    const firstAvail = getFirstAvailableDate();
    if (firstAvail) {
      // Current month has availability — no need to scroll
      setHasAutoScrolled(true);
      return;
    }
    
    // No availability this month — auto-advance up to 6 months
    const tryNextMonth = async () => {
      setAutoScrolling(true);
      let searchMonth = addMonths(currentMonth, 1);
      const maxSearch = 6;
      
      for (let i = 0; i < maxSearch; i++) {
        try {
          const monthStr = format(searchMonth, 'yyyy-MM');
          const response = await fetch(`/api/schedulers/public/${slug}/availability?month=${monthStr}`);
          if (response.ok) {
            const data: AvailabilityData = await response.json();
            const hasAny = Object.values(data.availability).some(slots => slots && slots.length > 0);
            if (hasAny) {
              setCurrentMonth(searchMonth);
              setHasAutoScrolled(true);
              setAutoScrolling(false);
              return;
            }
          }
        } catch {}
        searchMonth = addMonths(searchMonth, 1);
      }
      // No availability found in next 6 months
      setHasAutoScrolled(true);
      setAutoScrolling(false);
    };
    
    tryNextMonth();
  }, [availability, availabilityLoading]);

  // Get slots for selected date
  const getSlotsForDate = (date: Date): TimeSlot[] => {
    if (!availability) return [];
    const dateKey = format(date, 'yyyy-MM-dd');
    return availability.availability[dateKey] || [];
  };

  // Handle date selection
  const handleDateSelect = (date: Date) => {
    if (!hasAvailability(date)) return;
    setSelectedDate(date);
    setSelectedSlot(null);
    setStep('time');
  };

  // Handle time slot selection
  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setStep('details');
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSlot || !scheduler) return;

    try {
      setSubmitting(true);

      const response = await fetch(`/api/schedulers/public/${slug}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          scheduledDate: selectedSlot.start
        })
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to book appointment');
        return;
      }

      setBookingResult(result);
      setStep('confirm');
    } catch (err) {
      setError('Failed to book appointment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Calendar rendering
  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    // Get the day of week the month starts on (0 = Sunday)
    const startDay = monthStart.getDay();
    const emptyDays = Array(startDay).fill(null);

    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-xl font-semibold text-gray-900">
            {format(currentMonth, 'MMMM yyyy', { locale: dateLocale })}
          </h2>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {emptyDays.map((_, index) => (
            <div key={`empty-${index}`} className="aspect-square" />
          ))}
          {daysInMonth.map(day => {
            const hasSlots = hasAvailability(day);
            const isPast = isBefore(day, startOfDay(new Date()));
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const today = isToday(day);
            const isFirstAvailable = !isPast && hasSlots && getFirstAvailableDate() && isSameDay(day, getFirstAvailableDate()!);

            return (
              <button
                key={day.toISOString()}
                onClick={() => handleDateSelect(day)}
                disabled={!hasSlots || isPast}
                className={`
                  aspect-square flex items-center justify-center rounded-lg text-sm font-medium
                  transition-all duration-200
                  ${isPast ? 'bg-gray-100 text-gray-300 cursor-not-allowed line-through' : ''}
                  ${!isPast && !hasSlots ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : ''}
                  ${hasSlots && !isPast && !isSelected ? 'bg-green-50 text-green-800 hover:bg-green-100 cursor-pointer border-2 border-green-400' : ''}
                  ${isFirstAvailable && !isSelected ? 'bg-green-100 border-green-500 ring-2 ring-green-400 ring-offset-1 font-bold' : ''}
                  ${isSelected ? 'bg-green-600 text-white hover:bg-green-700 border-2 border-green-600' : ''}
                  ${today && !isSelected ? 'ring-2 ring-teal-400 ring-offset-2' : ''}
                `}
                style={isSelected ? { backgroundColor: scheduler?.brandColor } : {}}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>

        {(availabilityLoading || autoScrolling) && (
          <div className="flex items-center justify-center py-4 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            {autoScrolling ? t('scheduler.findingDates') : t('scheduler.loadingAvailability')}
          </div>
        )}

        {/* Legend */}
        {!availabilityLoading && !autoScrolling && (
          <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <span className="inline-block w-4 h-4 rounded bg-green-50 border-2 border-green-400"></span>
              {t('scheduler.available')}
            </div>
            <div className="flex items-center gap-1">
              <span className="inline-block w-4 h-4 rounded bg-gray-100"></span>
              {t('scheduler.notAvailable')}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Time slot selection
  const renderTimeSelection = () => {
    if (!selectedDate) return null;
    const slots = getSlotsForDate(selectedDate);

    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <button
          onClick={() => setStep('calendar')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          {t('scheduler.backToCalendar')}
        </button>

        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {t('scheduler.selectTime')}
        </h2>
        <p className="text-gray-600 mb-6">
          {format(selectedDate, 'EEEE, d. MMMM yyyy', { locale: dateLocale })}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {slots.map((slot, index) => (
            <button
              key={index}
              onClick={() => handleSlotSelect(slot)}
              className={`
                px-4 py-3 rounded-lg text-sm font-medium transition-all
                ${selectedSlot?.start === slot.start 
                  ? 'text-white' 
                  : 'bg-gray-50 text-gray-900 hover:bg-teal-50 hover:border-teal-300 border border-gray-200'}
              `}
              style={selectedSlot?.start === slot.start ? { backgroundColor: scheduler?.brandColor } : {}}
            >
              {slot.formatted}
            </button>
          ))}
        </div>

        {slots.length === 0 && (
          <p className="text-center text-gray-500 py-8">
            {t('scheduler.noTimes')}
          </p>
        )}
      </div>
    );
  };

  // Booking form
  const renderBookingForm = () => {
    if (!selectedSlot || !selectedDate) return null;

    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <button
          onClick={() => setStep('time')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          {t('scheduler.backToTime')}
        </button>

        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          {t('scheduler.yourDetails')}
        </h2>

        {/* Selected time summary */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center text-gray-700">
            <CalendarIcon className="w-5 h-5 mr-2" />
            <span>{format(selectedDate, 'EEEE, d. MMMM yyyy', { locale: dateLocale })}</span>
          </div>
          <div className="flex items-center text-gray-700 mt-2">
            <Clock className="w-5 h-5 mr-2" />
            <span>{selectedSlot.formatted} ({scheduler?.duration} {t('scheduler.minutes')})</span>
          </div>
          {scheduler?.location && (
            <div className="flex items-center text-gray-700 mt-2">
              <MapPin className="w-5 h-5 mr-2" />
              <span>{scheduler.location}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <User className="w-4 h-4 inline mr-1" />
              {t('scheduler.yourName')} *
            </label>
            <input
              type="text"
              required
              value={formData.clientName}
              onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              placeholder={t('scheduler.namePlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Mail className="w-4 h-4 inline mr-1" />
              {t('scheduler.email')} *
            </label>
            <input
              type="email"
              required
              value={formData.clientEmail}
              onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Phone className="w-4 h-4 inline mr-1" />
              {t('scheduler.phone')} *
            </label>
            <input
              type="tel"
              required
              value={formData.clientPhone}
              onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              placeholder="+43 123 456 7890"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <MessageSquare className="w-4 h-4 inline mr-1" />
              {t('scheduler.notes')}
            </label>
            <textarea
              value={formData.clientNotes}
              onChange={(e) => setFormData({ ...formData, clientNotes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              placeholder={t('scheduler.notesPlaceholder')}
            />
          </div>

          {error && (
            <div className="flex items-center text-red-600 bg-red-50 px-4 py-3 rounded-lg">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 text-white font-medium rounded-lg transition-colors flex items-center justify-center"
            style={{ backgroundColor: scheduler?.brandColor || '#0d9488' }}
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                {t('scheduler.booking')}
              </>
            ) : (
              <>
                <Check className="w-5 h-5 mr-2" />
                {t('scheduler.confirmBooking')}
              </>
            )}
          </button>
        </form>
      </div>
    );
  };

  // Confirmation screen
  const renderConfirmation = () => {
    if (!bookingResult || !selectedDate || !selectedSlot) return null;

    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <div 
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ backgroundColor: scheduler?.brandColor || '#0d9488' }}
        >
          <Check className="w-8 h-8 text-white" />
        </div>

        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          {t('scheduler.bookingConfirmed')}
        </h2>
        <p className="text-gray-600 mb-6">
          {bookingResult.message}
        </p>

        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
          <h3 className="font-medium text-gray-900 mb-3">{t('scheduler.appointmentDetails')}</h3>
          <div className="space-y-2 text-gray-700">
            <div className="flex items-center">
              <CalendarIcon className="w-5 h-5 mr-2 text-gray-500" />
              <span>{format(selectedDate, 'EEEE, d. MMMM yyyy', { locale: dateLocale })}</span>
            </div>
            <div className="flex items-center">
              <Clock className="w-5 h-5 mr-2 text-gray-500" />
              <span>{selectedSlot.formatted}</span>
            </div>
            {scheduler?.location && (
              <div className="flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-gray-500" />
                <span>{scheduler.location}</span>
              </div>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">{t('scheduler.confirmationNumber')}</p>
            <p className="font-mono font-semibold text-gray-900">
              {bookingResult.booking?.confirmationNumber}
            </p>
          </div>
        </div>

        <p className="text-sm text-gray-500">
          {t('scheduler.confirmationEmail')} {formData.clientEmail}
        </p>
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-gray-600">{t('scheduler.loading')}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !scheduler) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {t('scheduler.unavailable')}
          </h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!scheduler) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          {scheduler.brandName && (
            <h1 
              className="text-2xl font-bold mb-2"
              style={{ color: scheduler.brandColor }}
            >
              {scheduler.brandName}
            </h1>
          )}
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {scheduler.name}
          </h2>
          {scheduler.description && (
            <p className="text-gray-600">{scheduler.description}</p>
          )}

          {/* Session info */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-sm text-gray-600">
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              {scheduler.duration} {t('scheduler.minutes')}
            </div>
            {scheduler.location && (
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-1" />
                {scheduler.location}
              </div>
            )}
            {scheduler.price && parseFloat(scheduler.price) > 0 && (
              <div className="flex items-center">
                <DollarSign className="w-4 h-4 mr-1" />
                €{parseFloat(scheduler.price).toFixed(0)}
              </div>
            )}
          </div>
        </div>

        {/* Step content */}
        {step === 'calendar' && renderCalendar()}
        {step === 'time' && renderTimeSelection()}
        {step === 'details' && renderBookingForm()}
        {step === 'confirm' && renderConfirmation()}

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>{t('scheduler.timezone')}: {scheduler.timezone}</p>
        </div>
      </div>
    </div>
  );
}

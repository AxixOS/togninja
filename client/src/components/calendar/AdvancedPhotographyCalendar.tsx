import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isAfter, isBefore, startOfWeek, endOfWeek, eachHourOfInterval, startOfDay, addDays, subDays, addWeeks, subWeeks, startOfYear, endOfYear } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, Plus, MapPin, Camera, Clock, DollarSign, AlertTriangle, CheckCircle, Star, Sun, Cloud, Users, Filter, Search, Download, Upload, RefreshCw, Settings, Eye, Edit, Trash2, Copy, ExternalLink, Printer } from 'lucide-react';

interface PhotographySession {
  id: string;
  title: string;
  description?: string;
  sessionType: string;
  status: string;
  startTime: string;
  endTime: string;
  clientId?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  attendees?: any[];
  locationName?: string;
  locationAddress?: string;
  locationCoordinates?: string;
  basePrice?: number;
  depositAmount?: number;
  depositPaid: boolean;
  finalPayment?: number;
  finalPaymentPaid: boolean;
  paymentStatus: string;
  equipmentList?: string[];
  crewMembers?: string[];
  conflictDetected: boolean;
  weatherDependent: boolean;
  goldenHourOptimized: boolean;
  backupPlan?: string;
  notes?: string;
  portfolioWorthy: boolean;
  editingStatus: string;
  deliveryStatus: string;
  deliveryDate?: string;
  isRecurring: boolean;
  recurrenceRule?: string;
  parentEventId?: string;
  googleCalendarEventId?: string;
  icalUid?: string;
  externalCalendarSync: boolean;
  reminderSettings?: any;
  reminderSent: boolean;
  confirmationSent: boolean;
  followUpSent: boolean;
  isOnlineBookable: boolean;
  bookingRequirements?: any;
  availabilityStatus: string;
  color?: string;
  priority: string;
  isPublic: boolean;
  category?: string;
  galleryId?: string;
  photographerId?: string;
  tags?: string[];
  customFields?: any;
  createdAt: string;
  updatedAt: string;
}

interface CrmClient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  tags?: string[];
  notes?: string;
  source?: string;
  lifetime_value?: number;
}

interface CalendarProps {
  sessions: PhotographySession[];
  clients: CrmClient[];
  isLoading?: boolean;
  onSessionClick: (session: PhotographySession) => void;
  onCreateSession: (date?: Date) => void;
  onUpdateSession: (session: PhotographySession) => void;
  onDeleteSession: (sessionId: string) => void;
  onDuplicateSession: (session: PhotographySession) => void;
  onExportCalendar: () => void;
  onImportCalendar: (file: File) => void;
  onSyncExternalCalendar: () => void;
  onOpenSettings?: () => void;
}

type CalendarView = 'month' | 'week' | 'day' | 'agenda' | 'list';
type FilterType = 'all' | 'sessionType' | 'status' | 'client' | 'paymentStatus' | 'priority';

const AdvancedPhotographyCalendar: React.FC<CalendarProps> = ({
  sessions,
  clients,
  isLoading = false,
  onSessionClick,
  onCreateSession,
  onUpdateSession,
  onDeleteSession,
  onDuplicateSession,
  onExportCalendar,
  onImportCalendar,
  onSyncExternalCalendar,
  onOpenSettings
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<CalendarView>('month');
  const [expandedDay, setExpandedDay] = useState<{ date: Date; sessions: PhotographySession[]; anchorRect: DOMRect } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterValue, setFilterValue] = useState('');
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [draggedSession, setDraggedSession] = useState<PhotographySession | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [listSortOrder, setListSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [filterYear, setFilterYear] = useState<string>('');

  // Quick navigation helpers to jump between events
  const sortedEventDates = React.useMemo(() => {
    return (sessions || [])
      .map(s => {
        try {
          return s.startTime ? parseISO(s.startTime) : (s.endTime ? parseISO(s.endTime) : null);
        } catch { return null; }
      })
      .filter((d: Date | null): d is Date => !!d && !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());
  }, [sessions]);

  const jumpToNextEvent = () => {
    if (!sortedEventDates.length) return;
    const now = currentDate;
    const next = sortedEventDates.find(d => d.getTime() >= now.getTime());
    setCurrentDate(next || sortedEventDates[sortedEventDates.length - 1]);
  };

  const jumpToPrevEvent = () => {
    if (!sortedEventDates.length) return;
    const nowTs = currentDate.getTime();
    const prevList = sortedEventDates.filter(d => d.getTime() <= nowTs);
    const prev = prevList.length ? prevList[prevList.length - 1] : sortedEventDates[0];
    setCurrentDate(prev);
  };

  // Build a quick index of clients by id for display fallbacks
  const clientById = React.useMemo(() => {
    const map = new Map<string, { name: string; email?: string }>();
    for (const c of clients || []) {
      const name = (c as any).name || `${(c as any).firstName || ''} ${(c as any).lastName || ''}`.trim();
      if ((c as any).id) map.set((c as any).id, { name, email: (c as any).email });
    }
    return map;
  }, [clients]);

  // Gallery covers state for avatars
  const [galleryCovers, setGalleryCovers] = useState<Map<string, string>>(new Map());

  // Fetch gallery covers for clients when they change
  useEffect(() => {
    const fetchGalleryCovers = async () => {
      const coverMap = new Map<string, string>();
      
      // Get all unique client IDs from sessions
  // Use Array.from(Set) to avoid downlevel iteration issues in stricter TS targets
  const clientIds = Array.from(new Set(sessions.map(s => s.clientId).filter(Boolean)));
      
      // Fetch gallery covers for each client
      await Promise.all(clientIds.map(async (clientId) => {
        try {
          const response = await fetch(`/api/crm/clients/${clientId}/gallery-cover`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          if (response.ok) {
            const data = await response.json();
            if (data.coverImage) {
              coverMap.set(clientId, data.coverImage);
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch gallery cover for client ${clientId}:`, error);
        }
      }));
      
      setGalleryCovers(coverMap);
    };

    if (sessions.length > 0) {
      fetchGalleryCovers();
    }
  }, [sessions]);

  const getDisplayClientName = (session: PhotographySession) => {
    if (session.clientName && session.clientName.trim()) return session.clientName;
    if (session.clientId) {
      const found = clientById.get(session.clientId);
      if (found?.name) return found.name;
    }
    return '';
  };

  const getDisplayClientEmail = (session: PhotographySession) => {
    if (session.clientEmail && session.clientEmail.trim()) return session.clientEmail;
    if (session.clientId) {
      const found = clientById.get(session.clientId);
      if (found?.email) return found.email;
    }
    return '';
  };

  const initials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return (parts[0]?.[0] || '').toUpperCase() + (parts[1]?.[0] || '').toUpperCase();
  };

  const ClientChip: React.FC<{ session: PhotographySession }> = ({ session }) => {
    const name = getDisplayClientName(session);
    if (!name) return null;
    const email = getDisplayClientEmail(session);
    const id = session.clientId;
    const coverImage = id ? galleryCovers.get(id) : null;
    
    return (
      <div className="flex items-center gap-1 truncate opacity-80">
        <div className="w-4 h-4 rounded-full bg-gray-200 text-[9px] leading-none flex items-center justify-center text-gray-700 overflow-hidden">
          {coverImage ? (
            <img 
              src={coverImage} 
              alt={`${name} avatar`}
              className="w-full h-full object-cover rounded-full"
              onError={(e) => {
                // Fallback to initials if image fails to load
                const target = e.target as HTMLImageElement;
                (target as HTMLElement).style.display = 'none';
                const next = target.nextElementSibling as HTMLElement | null;
                if (next) next.style.display = 'flex';
              }}
            />
          ) : null}
          <span className={`${coverImage ? 'hidden' : 'flex'} items-center justify-center w-full h-full`}>
            {initials(name) || '👤'}
          </span>
        </div>
        {id ? (
          <Link
            to={`/admin/clients/${id}`}
            className="underline hover:text-blue-700 truncate"
            title={email || name}
            onClick={(e) => e.stopPropagation()}
          >
            {name}
          </Link>
        ) : (
          <span className="truncate" title={email || name}>{name}</span>
        )}
      </div>
    );
  };

  // Filter and search sessions (memoized to avoid re-computing on every render)
  const filteredSessions = React.useMemo(() => sessions.filter(session => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = session.title.toLowerCase().includes(query) ||
                           session.clientName?.toLowerCase().includes(query) ||
                           session.locationName?.toLowerCase().includes(query) ||
                           session.sessionType.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Month/Year filter
    if (filterMonth || filterYear) {
      const start = session.startTime ? parseISO(session.startTime) : (session.endTime ? parseISO(session.endTime) : null);
      if (!start) return false;
      const monthOk = filterMonth ? (format(start, 'MM') === filterMonth.padStart(2, '0')) : true;
      const yearOk = filterYear ? (format(start, 'yyyy') === filterYear) : true;
      if (!(monthOk && yearOk)) return false;
    }

    // Type filter
    if (filterType !== 'all' && filterValue) {
      switch (filterType) {
        case 'sessionType':
          if (session.sessionType !== filterValue) return false;
          break;
        case 'status':
          if (session.status !== filterValue) return false;
          break;
        case 'client':
          if (session.clientName !== filterValue) return false;
          break;
        case 'paymentStatus':
          if (session.paymentStatus !== filterValue) return false;
          break;
        case 'priority':
          if (session.priority !== filterValue) return false;
          break;
      }
    }

    return true;
  }), [sessions, searchQuery, filterType, filterValue, filterMonth, filterYear]);

  // Pre-compute date-indexed map for O(1) per-cell lookups
  // Eliminates ~1M parseISO+isSameDay calls per render (24k sessions × 42 cells)
  const sessionsByDate = React.useMemo(() => {
    const map = new Map<string, PhotographySession[]>();
    for (const session of filteredSessions) {
      const st = session.startTime ? parseISO(session.startTime) : null;
      const et = !st && session.endTime ? parseISO(session.endTime) : null;
      const date = st || et;
      if (date && !isNaN(date.getTime())) {
        const key = format(date, 'yyyy-MM-dd');
        const list = map.get(key);
        if (list) list.push(session);
        else map.set(key, [session]);
      }
    }
    return map;
  }, [filteredSessions]);

  // Get unique values for filters
  const sessionTypes = Array.from(new Set(sessions.map(s => s.sessionType)));
  const statuses = Array.from(new Set(sessions.map(s => s.status)));
  const clientNames = Array.from(new Set(sessions.map(s => s.clientName).filter(Boolean)));
  const paymentStatuses = Array.from(new Set(sessions.map(s => s.paymentStatus)));
  const priorities = Array.from(new Set(sessions.map(s => s.priority)));

  // Color coding for different session types
  const getSessionTypeColor = (sessionType: string) => {
    const colors = {
      'wedding': 'bg-pink-100 border-pink-300 text-pink-800',
      'portrait': 'bg-blue-100 border-blue-300 text-blue-800',
      'commercial': 'bg-green-100 border-green-300 text-green-800',
      'event': 'bg-purple-100 border-purple-300 text-purple-800',
      'family': 'bg-orange-100 border-orange-300 text-orange-800',
      'fashion': 'bg-indigo-100 border-indigo-300 text-indigo-800',
    };
    return colors[sessionType as keyof typeof colors] || 'bg-gray-100 border-gray-300 text-gray-800';
  };

  // Status icons
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-3 h-3 text-green-600" />;
      case 'in-progress': return <Camera className="w-3 h-3 text-blue-600" />;
      case 'scheduled': return <Clock className="w-3 h-3 text-orange-600" />;
      case 'cancelled': return <AlertTriangle className="w-3 h-3 text-red-600" />;
      default: return <Clock className="w-3 h-3 text-gray-600" />;
    }
  };

  // Priority indicators
  const getPriorityIndicator = (priority: string) => {
    switch (priority) {
      case 'urgent': return <div className="w-2 h-2 bg-red-500 rounded-full"></div>;
      case 'high': return <div className="w-2 h-2 bg-orange-500 rounded-full"></div>;
      case 'medium': return <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>;
      case 'low': return <div className="w-2 h-2 bg-green-500 rounded-full"></div>;
      default: return <div className="w-2 h-2 bg-gray-500 rounded-full"></div>;
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, session: PhotographySession) => {
    setDraggedSession(session);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    if (draggedSession) {
      const updatedSession = {
        ...draggedSession,
        startTime: format(targetDate, "yyyy-MM-dd'T'HH:mm:ss"),
        endTime: format(addDays(targetDate, 0), "yyyy-MM-dd'T'HH:mm:ss")
      };
      onUpdateSession(updatedSession);
      setDraggedSession(null);
    }
  };

  // Calendar view renderers
  // Get event dot color based on session type
  const getEventDotColor = (sessionType: string) => {
    const colors: Record<string, string> = {
      'wedding': 'bg-pink-500',
      'portrait': 'bg-blue-500',
      'commercial': 'bg-green-500',
      'event': 'bg-purple-500',
      'family': 'bg-teal-500',
      'fashion': 'bg-indigo-500',
    };
    return colors[sessionType] || 'bg-gray-500';
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Day headers - Sprout style */}
        <div className="grid grid-cols-7 bg-white border-b border-gray-200">
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day, index) => (
            <div 
              key={day} 
              className={`py-3 text-center text-xs font-semibold tracking-wider ${
                index === 6 ? 'text-teal-600' : 'text-gray-500'
              }`}
            >
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            const daysSessions = sessionsByDate.get(format(day, 'yyyy-MM-dd')) || [];
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isSaturday = day.getDay() === 6;
            const rowIndex = Math.floor(index / 7);

            return (
              <div
                key={day.toISOString()}
                className={`min-h-[140px] border-b border-r border-gray-200 transition-colors ${
                  !isCurrentMonth ? 'bg-gray-50' : 'bg-white'
                } ${isSelected ? 'bg-blue-50' : ''} hover:bg-gray-50 cursor-pointer`}
                onClick={() => setSelectedDate(day)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, day)}
                onDoubleClick={() => onCreateSession(day)}
              >
                {/* Day number */}
                <div className="p-2 flex justify-start">
                  <span 
                    className={`inline-flex items-center justify-center w-8 h-8 text-sm font-medium rounded-full ${
                      isToday 
                        ? 'bg-teal-500 text-white' 
                        : isSaturday && isCurrentMonth
                          ? 'text-teal-600'
                          : !isCurrentMonth 
                            ? 'text-gray-400' 
                            : 'text-gray-700'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                </div>
                
                {/* Events list - Sprout style */}
                <div className="px-1 pb-2 space-y-1">
                  {daysSessions.slice(0, 4).map(session => {
                    const startTime = session.startTime ? parseISO(session.startTime) : null;
                    const timeStr = startTime ? format(startTime, 'ha').toLowerCase() : '';
                    const clientName = getDisplayClientName(session);
                    const displayTitle = clientName 
                      ? `${session.title} mit ${clientName.split(' ')[0]}`
                      : session.title;
                    
                    return (
                      <div
                        key={session.id}
                        className="flex items-center gap-1.5 text-xs cursor-pointer hover:bg-gray-100 rounded px-1 py-0.5 truncate"
                        draggable
                        onDragStart={(e) => handleDragStart(e, session)}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSessionClick(session);
                        }}
                      >
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getEventDotColor(session.sessionType)}`}></span>
                        <span className="text-gray-500 flex-shrink-0">{timeStr}</span>
                        <span className="font-medium text-gray-800 truncate">{displayTitle}</span>
                      </div>
                    );
                  })}
                  {daysSessions.length > 4 && (
                    <button
                      className="text-xs text-teal-600 font-medium px-1 hover:text-teal-800 hover:underline cursor-pointer bg-teal-50 rounded w-full text-left"
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setExpandedDay({ date: day, sessions: daysSessions, anchorRect: rect });
                      }}
                    >
                      +{daysSessions.length - 4} more
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const weekEnd = endOfWeek(currentDate);
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="overflow-auto max-h-[600px]">
        <div className="grid grid-cols-8 gap-1 min-w-[800px]">
          {/* Time column */}
          <div className="col-span-1">
            <div className="h-12 border-b border-gray-200"></div>
            {hours.map(hour => (
              <div key={hour} className="h-16 border-b border-gray-100 p-1 text-xs text-gray-500">
                {format(new Date().setHours(hour, 0, 0, 0), 'HH:mm')}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map(day => {
            const daysSessions = sessionsByDate.get(format(day, 'yyyy-MM-dd')) || [];
            const isToday = isSameDay(day, new Date());

            return (
              <div key={day.toISOString()} className="col-span-1">
                <div className={`h-12 border-b border-gray-200 p-2 text-center ${isToday ? 'bg-blue-50' : ''}`}>
                  <div className="font-medium">{format(day, 'EEE')}</div>
                  <div className={`text-sm ${isToday ? 'text-blue-600 font-bold' : ''}`}>
                    {format(day, 'd')}
                  </div>
                </div>
                
                <div className="relative">
                  {hours.map(hour => (
                    <div 
                      key={hour} 
                      className="h-16 border-b border-gray-100 cursor-pointer hover:bg-gray-50"
                      onDoubleClick={() => {
                        const sessionDate = new Date(day);
                        sessionDate.setHours(hour, 0, 0, 0);
                        onCreateSession(sessionDate);
                      }}
                    ></div>
                  ))}
                  
                  {/* Sessions overlay */}
                  {daysSessions.map(session => {
                    const startTime = parseISO(session.startTime);
                    const endTime = parseISO(session.endTime);
                    const startHour = startTime.getHours() + startTime.getMinutes() / 60;
                    const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
                    
                    return (
                      <div
                        key={session.id}
                        className={`absolute left-1 right-1 rounded p-1 text-xs border cursor-pointer ${getSessionTypeColor(session.sessionType)}`}
                        style={{
                          top: `${startHour * 64}px`,
                          height: `${Math.max(duration * 64, 32)}px`,
                        }}
                        draggable
                        onDragStart={(e) => handleDragStart(e, session)}
                        onClick={() => onSessionClick(session)}
                      >
                        <div className="font-medium truncate">{session.title}</div>
                        <ClientChip session={session} />
                        <div className="flex items-center space-x-1 mt-1">
                          {getPriorityIndicator(session.priority)}
                          {getStatusIcon(session.status)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const daysSessions = sessionsByDate.get(format(currentDate, 'yyyy-MM-dd')) || [];

    return (
      <div className="overflow-auto max-h-[600px]">
        <div className="grid grid-cols-2 gap-4 min-w-[600px]">
          {/* Time slots */}
          <div>
            <div className="h-12 border-b border-gray-200 p-2 text-center bg-gray-50">
              <div className="font-medium">{format(currentDate, 'EEEE, MMMM d, yyyy')}</div>
            </div>
            
            <div className="relative">
              {hours.map(hour => (
                <div 
                  key={hour} 
                  className="h-16 border-b border-gray-100 p-2 cursor-pointer hover:bg-gray-50"
                  onDoubleClick={() => {
                    const sessionDate = new Date(currentDate);
                    sessionDate.setHours(hour, 0, 0, 0);
                    onCreateSession(sessionDate);
                  }}
                >
                  <div className="text-sm text-gray-500">
                    {format(new Date().setHours(hour, 0, 0, 0), 'HH:mm')}
                  </div>
                </div>
              ))}
              
              {/* Sessions overlay */}
              {daysSessions.map(session => {
                const startTime = parseISO(session.startTime);
                const endTime = parseISO(session.endTime);
                const startHour = startTime.getHours() + startTime.getMinutes() / 60;
                const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
                
                return (
                  <div
                    key={session.id}
                    className={`absolute left-2 right-2 rounded p-2 border cursor-pointer ${getSessionTypeColor(session.sessionType)}`}
                    style={{
                      top: `${startHour * 64}px`,
                      height: `${Math.max(duration * 64, 48)}px`,
                    }}
                    onClick={() => onSessionClick(session)}
                  >
                    <div className="font-medium">{session.title}</div>
                    <ClientChip session={session} />
                    <div className="text-sm">{format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}</div>
                    <div className="flex items-center space-x-2 mt-1">
                      {getPriorityIndicator(session.priority)}
                      {getStatusIcon(session.status)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Session details sidebar */}
          <div className="bg-gray-50 p-4">
            <h3 className="font-medium mb-4">Sessions Today</h3>
            <div className="space-y-3">
              {daysSessions.map(session => (
                <div key={session.id} className="bg-white p-3 rounded border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{session.title}</span>
                    <div className="flex items-center space-x-2">
                      {getPriorityIndicator(session.priority)}
                      {getStatusIcon(session.status)}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>{session.clientName}</div>
                    <div>{format(parseISO(session.startTime), 'HH:mm')} - {format(parseISO(session.endTime), 'HH:mm')}</div>
                    {session.locationName && <div>📍 {session.locationName}</div>}
                    {session.paymentStatus !== 'fully_paid' && (
                      <div className="text-orange-600">💰 Payment: {session.paymentStatus}</div>
                    )}
                  </div>
                  <div className="flex space-x-2 mt-2">
                    <button 
                      onClick={() => onSessionClick(session)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      <Eye className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => onUpdateSession(session)}
                      className="text-xs text-green-600 hover:text-green-800"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => onDuplicateSession(session)}
                      className="text-xs text-purple-600 hover:text-purple-800"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAgendaView = () => {
    const upcomingSessions = filteredSessions
      .filter(session => isAfter(parseISO(session.startTime), new Date()))
      .sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime())
      .slice(0, 50);

    return (
      <div id="agenda-print-area" className="space-y-4">
        {upcomingSessions.map(session => {
          const startTime = parseISO(session.startTime);
          const endTime = parseISO(session.endTime);

          return (
            <div key={session.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`px-2 py-1 rounded text-xs font-medium ${getSessionTypeColor(session.sessionType)}`}>
                    {session.sessionType}
                  </div>
                  <h3 className="font-medium">{session.title}</h3>
                  <div className="flex items-center space-x-2">
                    {getPriorityIndicator(session.priority)}
                    {getStatusIcon(session.status)}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => onSessionClick(session)}
                    className="p-1 text-blue-600 hover:text-blue-800"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onUpdateSession(session)}
                    className="p-1 text-green-600 hover:text-green-800"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onDuplicateSession(session)}
                    className="p-1 text-purple-600 hover:text-purple-800"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onDeleteSession(session.id)}
                    className="p-1 text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <Clock className="w-4 h-4" />
                    <span>{format(startTime, 'MMM d, yyyy')}</span>
                  </div>
                  <div className="ml-6">
                    {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
                  </div>
                </div>

                <div>
                  {getDisplayClientName(session) && (
                    <div className="flex items-center space-x-2 mb-1">
                      <Users className="w-4 h-4" />
                      <ClientChip session={session} />
                    </div>
                  )}
                  {session.locationName && (
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4" />
                      <span>{session.locationName}</span>
                    </div>
                  )}
                </div>

                <div>
                  {session.basePrice && (
                    <div className="flex items-center space-x-2 mb-1">
                      <DollarSign className="w-4 h-4" />
                      <span>${session.basePrice} ({session.paymentStatus})</span>
                    </div>
                  )}
                  {session.equipmentList && session.equipmentList.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <Camera className="w-4 h-4" />
                      <span>{session.equipmentList.length} items</span>
                    </div>
                  )}
                </div>
              </div>

              {session.notes && (
                <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                  {session.notes}
                </div>
              )}

              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  {session.weatherDependent && (
                    <div className="flex items-center space-x-1">
                      <Cloud className="w-3 h-3" />
                      <span>Weather dependent</span>
                    </div>
                  )}
                  {session.goldenHourOptimized && (
                    <div className="flex items-center space-x-1">
                      <Sun className="w-3 h-3" />
                      <span>Golden hour</span>
                    </div>
                  )}
                  {session.portfolioWorthy && (
                    <div className="flex items-center space-x-1">
                      <Star className="w-3 h-3" />
                      <span>Portfolio worthy</span>
                    </div>
                  )}
                  {session.externalCalendarSync && (
                    <div className="flex items-center space-x-1">
                      <ExternalLink className="w-3 h-3" />
                      <span>Synced</span>
                    </div>
                  )}
                </div>
                
                {session.conflictDetected && (
                  <div className="flex items-center space-x-1 text-red-600 text-xs">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Conflict detected</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {upcomingSessions.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No upcoming sessions found</p>
          </div>
        )}
      </div>
    );
  };

  const renderListView = () => {
    const sorted = [...filteredSessions].sort((a, b) => {
      const at = parseISO(a.startTime).getTime();
      const bt = parseISO(b.startTime).getTime();
      return listSortOrder === 'asc' ? at - bt : bt - at;
    });
    const groupedSessions = sorted.reduce((groups, session) => {
      const date = format(parseISO(session.startTime), 'yyyy-MM-dd');
      if (!groups[date]) groups[date] = [];
      groups[date].push(session);
      return groups;
    }, {} as Record<string, PhotographySession[]>);

    const sortedDates = Object.keys(groupedSessions).sort((a, b) => listSortOrder === 'asc' ? a.localeCompare(b) : b.localeCompare(a));

    return (
      <div className="space-y-6">
        {sortedDates.map(date => (
          <div key={date} className="bg-white border rounded-lg">
            <div className="bg-gray-50 px-4 py-2 border-b">
              <h3 className="font-medium">{format(parseISO(date), 'EEEE, MMMM d, yyyy')}</h3>
            </div>
            <div className="divide-y">
              {groupedSessions[date].map(session => (
                <div key={session.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`px-2 py-1 rounded text-xs font-medium ${getSessionTypeColor(session.sessionType)}`}>
                        {session.sessionType}
                      </div>
                      <div>
                        <div className="font-medium">{session.title}</div>
                        {getDisplayClientName(session) && (
                          <div className="text-sm text-gray-600">
                            <ClientChip session={session} />
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {format(parseISO(session.startTime), 'HH:mm')} - {format(parseISO(session.endTime), 'HH:mm')}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        {getPriorityIndicator(session.priority)}
                        {getStatusIcon(session.status)}
                      </div>
                      <div className="flex space-x-1">
                        <button 
                          onClick={() => onSessionClick(session)}
                          className="p-1 text-blue-600 hover:text-blue-800"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => onUpdateSession(session)}
                          className="p-1 text-green-600 hover:text-green-800"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => onDuplicateSession(session)}
                          className="p-1 text-purple-600 hover:text-purple-800"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header - Clean Sprout-style */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {/* Left side - Title and Navigation */}
          <div className="flex items-center space-x-6">
            <h2 className="text-2xl font-semibold text-gray-900">Calendar</h2>
            
            {/* Navigation */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-4 py-1.5 text-sm font-medium text-teal-600 bg-teal-50 border border-teal-200 rounded-full hover:bg-teal-100 transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => {
                  if (view === 'day') setCurrentDate(subDays(currentDate, 1));
                  else if (view === 'week') setCurrentDate(subWeeks(currentDate, 1));
                  else setCurrentDate(subMonths(currentDate, 1));
                }}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={() => {
                  if (view === 'day') setCurrentDate(addDays(currentDate, 1));
                  else if (view === 'week') setCurrentDate(addWeeks(currentDate, 1));
                  else setCurrentDate(addMonths(currentDate, 1));
                }}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            {/* Date display - adapts to current view */}
            <h3 className="text-xl font-semibold text-gray-900">
              {view === 'day' 
                ? format(currentDate, 'EEEE, MMMM d, yyyy')
                : view === 'week'
                ? `${format(startOfWeek(currentDate), 'MMM d')} – ${format(endOfWeek(currentDate), 'MMM d, yyyy')}`
                : format(currentDate, 'MMMM yyyy')}
            </h3>
          </div>

          {/* Right side - View selector and actions */}
          <div className="flex items-center space-x-3">
            {/* View selector dropdown */}
            <select
              value={view}
              onChange={(e) => setView(e.target.value as CalendarView)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
              <option value="agenda">Agenda</option>
              <option value="list">List</option>
            </select>
            
            {/* Export button */}
            <button
              onClick={onExportCalendar}
              className="flex items-center space-x-2 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
            
            {/* Import button */}
            <label className="flex items-center space-x-2 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Import</span>
              <input
                type="file"
                accept=".ics,.csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && onImportCalendar(e.target.files[0])}
              />
            </label>

            {/* Print button - visible in agenda and list views */}
            {(view === 'agenda' || view === 'list') && (
              <button
                onClick={() => {
                  // Hide non-printable UI, then trigger browser print
                  const printStyle = document.createElement('style');
                  printStyle.id = 'agenda-print-style';
                  printStyle.textContent = `
                    @media print {
                      /* Hide sidebar, header nav, action buttons */
                      nav, aside, [data-sidebar], .admin-sidebar,
                      button, label, input, select,
                      [class*="hover:"], .no-print,
                      #agenda-print-style + * { }
                      header { display: none !important; }
                      /* Show only the agenda content area */
                      body * { visibility: hidden; }
                      #agenda-print-area, #agenda-print-area * { visibility: visible; }
                      #agenda-print-area { position: absolute; left: 0; top: 0; width: 100%; }
                      /* Clean up for print */
                      #agenda-print-area button,
                      #agenda-print-area .no-print { display: none !important; }
                      #agenda-print-area { font-size: 11px; }
                      @page { margin: 1cm; }
                    }
                  `;
                  document.head.appendChild(printStyle);
                  window.print();
                  // Clean up after print dialog closes
                  setTimeout(() => printStyle.remove(), 1000);
                }}
                className="flex items-center space-x-2 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Print</span>
              </button>
            )}

            {/* New Session button - accent color */}
            <button
              onClick={() => onCreateSession()}
              className="flex items-center space-x-2 px-4 py-1.5 text-sm font-medium text-white bg-teal-500 rounded-md hover:bg-teal-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Session</span>
            </button>
          </div>
        </div>

        {/* Secondary row - View tabs, Search, Filters */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-4">
            {/* View tabs - pill style */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {(['day', 'week', 'month', 'agenda', 'list'] as CalendarView[]).map(viewType => (
                <button
                  key={viewType}
                  onClick={() => setView(viewType)}
                  className={`px-3 py-1 text-sm font-medium rounded-md capitalize transition-colors ${
                    view === viewType 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {viewType}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search sessions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 border border-gray-300 rounded-md w-48 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            {/* Filter button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-3 py-1.5 border rounded-md text-sm transition-colors ${
                showFilters ? 'bg-teal-50 border-teal-300 text-teal-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>

            {/* Month/Year quick filters */}
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-white"
            >
              <option value="">All months</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={String(m).padStart(2, '0')}>{format(new Date(2000, m - 1), 'MMMM')}</option>
              ))}
            </select>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-white"
            >
              <option value="">All years</option>
              {Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 3 + i).map(y => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
          </div>

          {/* Session count / Loading indicator */}
          <div className="text-sm text-gray-500 flex items-center space-x-2">
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Loading sessions...</span>
              </>
            ) : (
              <span>{filteredSessions.length} of {sessions.length} sessions</span>
            )}
          </div>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by</label>
                <select
                  value={filterType}
                  onChange={(e) => {
                    setFilterType(e.target.value as FilterType);
                    setFilterValue('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="all">All</option>
                  <option value="sessionType">Session Type</option>
                  <option value="status">Status</option>
                  <option value="client">Client</option>
                  <option value="paymentStatus">Payment Status</option>
                  <option value="priority">Priority</option>
                </select>
              </div>

              {filterType !== 'all' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                  <select
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Select...</option>
                    {filterType === 'sessionType' && sessionTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                    {filterType === 'status' && statuses.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                    {filterType === 'client' && clientNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                    {filterType === 'paymentStatus' && paymentStatuses.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                    {filterType === 'priority' && priorities.map(priority => (
                      <option key={priority} value={priority}>{priority}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-end">
                <button
                  onClick={() => {
                    setFilterType('all');
                    setFilterValue('');
                    setSearchQuery('');
                    setFilterMonth('');
                    setFilterYear('');
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-100 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
            {view === 'list' && (
              <div className="mt-3 flex items-center space-x-3">
                <span className="text-sm text-gray-700">List sort:</span>
                <select
                  value={listSortOrder}
                  onChange={(e) => setListSortOrder(e.target.value as 'asc' | 'desc')}
                  className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Calendar content */}
      <div className="p-4">
        {view === 'month' && renderMonthView()}
        {view === 'week' && renderWeekView()}
        {view === 'day' && renderDayView()}
        {view === 'agenda' && renderAgendaView()}
        {view === 'list' && renderListView()}
      </div>

      {/* Expanded Day Popup - shows all sessions for a day when +N more is clicked */}
      {expandedDay && (
        <div
          className="fixed inset-0 z-50"
          onClick={() => setExpandedDay(null)}
        >
          <div className="fixed inset-0 bg-black bg-opacity-20" />
          <div
            className="absolute bg-white rounded-lg shadow-2xl border border-gray-200 w-80 max-h-96 overflow-hidden flex flex-col"
            style={{
              top: Math.min(expandedDay.anchorRect.bottom + 4, window.innerHeight - 400),
              left: Math.min(expandedDay.anchorRect.left, window.innerWidth - 340),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
              <h3 className="font-semibold text-gray-800">{format(expandedDay.date, 'EEEE, MMMM d')}</h3>
              <button
                onClick={() => setExpandedDay(null)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ×
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-1">
              {expandedDay.sessions
                .sort((a, b) => {
                  const at = a.startTime ? new Date(a.startTime).getTime() : 0;
                  const bt = b.startTime ? new Date(b.startTime).getTime() : 0;
                  return at - bt;
                })
                .map(session => {
                  const startTime = session.startTime ? parseISO(session.startTime) : null;
                  const timeStr = startTime ? format(startTime, 'h:mm a') : '';
                  const clientName = getDisplayClientName(session);
                  const displayTitle = clientName
                    ? `${session.title} mit ${clientName.split(' ')[0]}`
                    : session.title;

                  return (
                    <button
                      key={session.id}
                      className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm hover:bg-blue-50 rounded-lg transition-colors"
                      onClick={() => {
                        setExpandedDay(null);
                        onSessionClick(session);
                      }}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getEventDotColor(session.sessionType)}`}></span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-800 truncate">{displayTitle}</div>
                        <div className="text-xs text-gray-500">{timeStr}{session.locationName ? ` · ${session.locationName}` : ''}</div>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                        session.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                        session.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                        session.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {session.status}
                      </span>
                    </button>
                  );
                })}
            </div>
            <div className="px-4 py-2 border-t bg-gray-50 text-xs text-gray-500 text-center">
              {expandedDay.sessions.length} session{expandedDay.sessions.length !== 1 ? 's' : ''} · Click to view details
            </div>
          </div>
        </div>
      )}

      {/* Footer - View Legend */}
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
        <button className="flex items-center space-x-2 text-sm text-teal-600 hover:text-teal-700">
          <span className="w-4 h-4 rounded-full border-2 border-teal-500 flex items-center justify-center text-xs">?</span>
          <span>View Legend</span>
        </button>
      </div>
    </div>
  );
};

export default AdvancedPhotographyCalendar;
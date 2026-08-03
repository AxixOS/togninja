import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import AdvancedPhotographyCalendar from '../../components/calendar/AdvancedPhotographyCalendar';
import GoogleCalendarIntegration from '../../components/calendar/GoogleCalendarIntegration';
import { Calendar, Camera, Clock, DollarSign, MapPin, TrendingUp, AlertTriangle, CheckCircle, Plus, Sun, Cloud, Star, ChevronLeft, ChevronRight, Settings, Link2, Copy, Check, Share2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isAfter } from 'date-fns';

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

interface DashboardStats {
  totalSessions: number;
  upcomingSessions: number;
  completedSessions: number;
  totalRevenue: number;
  pendingDeposits: number;
  equipmentConflicts: number;
  newLeads?: number;
}

// Get UTC offset in hours for a given IANA timezone on a specific date
const getTimezoneOffsetHours = (timezone: string, date: Date): number => {
  try {
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    return (tzDate.getTime() - utcDate.getTime()) / 3600000;
  } catch {
    return 1; // default CET
  }
};

// Golden Hour calculation returning formatted windows plus raw Date objects for scheduling suggestions
// Default coordinates: Vienna, Austria (48.2082°N, 16.3738°E)
const calculateGoldenHour = (date: Date, latitude: number = 48.2082, longitude: number = 16.3738, utcOffsetHours: number = 1) => {
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  const solarDeclination = 23.45 * Math.sin((2 * Math.PI * (284 + dayOfYear)) / 365) * Math.PI / 180;
  const latRad = latitude * Math.PI / 180;
  const hourAngle = Math.acos(-Math.tan(latRad) * Math.tan(solarDeclination));
  const solarNoon = 12 - (longitude / 15) + utcOffsetHours;
  const sunriseHour = solarNoon - (hourAngle * 12 / Math.PI);
  const sunsetHour = solarNoon + (hourAngle * 12 / Math.PI);
  const morningGoldenStart = sunriseHour;
  const morningGoldenEnd = sunriseHour + 1;
  const eveningGoldenStart = sunsetHour - 1;
  const eveningGoldenEnd = sunsetHour;
  const formatHour = (hour: number) => {
    const h = Math.floor(hour);
    const m = Math.floor((hour - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };
  const hourToDate = (base: Date, hour: number) => {
    const d = new Date(base);
    const h = Math.floor(hour);
    const m = Math.floor((hour - h) * 60);
    d.setHours(h, m, 0, 0);
    return d;
  };
  return {
    morning: `${formatHour(morningGoldenStart)} - ${formatHour(morningGoldenEnd)}`,
    evening: `${formatHour(eveningGoldenStart)} - ${formatHour(eveningGoldenEnd)}`,
    windows: {
      morning: { start: hourToDate(date, morningGoldenStart), end: hourToDate(date, morningGoldenEnd) },
      evening: { start: hourToDate(date, eveningGoldenStart), end: hourToDate(date, eveningGoldenEnd) }
    }
  };
};

const PhotographyCalendarPage: React.FC = () => {
  const [sessions, setSessions] = useState<PhotographySession[]>([]);
  const [showGoogleCalendarModal, setShowGoogleCalendarModal] = useState(false);
  const [showLocationScoutModal, setShowLocationScoutModal] = useState(false);
  const [showEquipmentCheckModal, setShowEquipmentCheckModal] = useState(false);
  const [locationScoutQuery, setLocationScoutQuery] = useState('');
  const [equipmentChecklist, setEquipmentChecklist] = useState<{id: string; name: string; checked: boolean; category: string}[]>([
    { id: '1', name: 'Camera Body (Primary)', checked: false, category: 'Camera' },
    { id: '2', name: 'Camera Body (Backup)', checked: false, category: 'Camera' },
    { id: '3', name: '24-70mm f/2.8 Lens', checked: false, category: 'Lenses' },
    { id: '4', name: '70-200mm f/2.8 Lens', checked: false, category: 'Lenses' },
    { id: '5', name: '50mm f/1.4 Lens', checked: false, category: 'Lenses' },
    { id: '6', name: '85mm f/1.8 Lens', checked: false, category: 'Lenses' },
    { id: '7', name: 'Speedlight Flash x2', checked: false, category: 'Lighting' },
    { id: '8', name: 'Light Stands x2', checked: false, category: 'Lighting' },
    { id: '9', name: 'Softbox / Umbrella', checked: false, category: 'Lighting' },
    { id: '10', name: 'Reflector (5-in-1)', checked: false, category: 'Lighting' },
    { id: '11', name: 'Memory Cards (formatted)', checked: false, category: 'Storage' },
    { id: '12', name: 'Extra Batteries', checked: false, category: 'Power' },
    { id: '13', name: 'Battery Charger', checked: false, category: 'Power' },
    { id: '14', name: 'Tripod', checked: false, category: 'Support' },
    { id: '15', name: 'Lens Cleaning Kit', checked: false, category: 'Accessories' },
    { id: '16', name: 'Camera Bag', checked: false, category: 'Accessories' },
  ]);
  const [selectedSession, setSelectedSession] = useState<PhotographySession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [newLeadsCount, setNewLeadsCount] = useState(8);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [activeView, setActiveView] = useState('calendar');
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [dateFormat, setDateFormat] = useState(localStorage.getItem('preferredDateFormat') || 'MM/dd/yyyy');
  // Lightweight CRM client type for selector
  type ClientLight = { id: string; firstName: string; lastName: string; email?: string; phone?: string };
  const [clients, setClients] = useState<ClientLight[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    sessionType: 'portrait',
    status: 'scheduled',
    startTime: '',
    endTime: '',
    clientId: '',
    clientName: '',
    clientEmail: '',
    locationName: '',
    locationAddress: '',
    locationCoordinates: '',
    basePrice: '',
    depositAmount: '',
    equipmentList: [] as string[],
    weatherDependent: false,
    goldenHourOptimized: false,
    portfolioWorthy: false
  });
  const [newClientDraft, setNewClientDraft] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [creatingClient, setCreatingClient] = useState(false);
  const [manualEndOverride, setManualEndOverride] = useState(false);
  const [manualStartOverride, setManualStartOverride] = useState(false);
  const [clientNameSuggestions, setClientNameSuggestions] = useState<ClientLight[]>([]);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [showClientAttach, setShowClientAttach] = useState(false);
  const [clientAttachSearch, setClientAttachSearch] = useState('');
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientData, setNewClientData] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [savingClient, setSavingClient] = useState(false);

  const [stats, setStats] = useState<DashboardStats>({
    totalSessions: 0,
    upcomingSessions: 0,
    completedSessions: 0,
    totalRevenue: 0,
    pendingDeposits: 0,
    equipmentConflicts: 0,
    newLeads: 0,
  });

  const [serverStatsLoaded, setServerStatsLoaded] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  
  // Studio location for Golden Hour calculation
  interface StudioLocation {
    latitude: number;
    longitude: number;
    timezone: string;
    city: string;
    country: string;
    address: string | null;
  }
  const [studioLocation, setStudioLocation] = useState<StudioLocation>({
    latitude: 48.2082, // Default Vienna
    longitude: 16.3738,
    timezone: 'Europe/Vienna',
    city: 'Vienna',
    country: 'Austria',
    address: null
  });
  const [weatherData, setWeatherData] = useState<{ temp?: number; conditions?: string; icon?: string } | null>(null);
  
  // Scheduler share modal state
  const [showShareSchedulerModal, setShowShareSchedulerModal] = useState(false);
  const [availableSchedulers, setAvailableSchedulers] = useState<Array<{ id: number; name: string; slug: string; isActive: boolean }>>([]);
  const [copiedSchedulerId, setCopiedSchedulerId] = useState<number | null>(null);
  
  // Map loaded clients to the shape expected by AdvancedPhotographyCalendar (id, name, email)
  const clientsForCalendar = clients.map(c => ({
    id: c.id,
    name: `${c.firstName} ${c.lastName}`.trim(),
    email: c.email || '',
    phone: c.phone,
  }));

  useEffect(() => {
    fetchSessions();
    fetchLeadsCount();
    fetchDashboardStats();
    // Preload clients so calendar can resolve names from clientId
    fetchClients();
    // Fetch studio location for Golden Hour calculation
    fetchStudioLocation();
  }, []);

  useEffect(() => {
    fetchAnalytics(period);
  }, [period]);

  // Fetch studio location for Golden Hour & Weather features
  const fetchStudioLocation = async () => {
    try {
      const resp = await fetch('/api/admin/studio-location', {
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      });
      if (!resp.ok) return;
      const data = await resp.json();
      setStudioLocation({
        latitude: data.latitude || 48.2082,
        longitude: data.longitude || 16.3738,
        timezone: data.timezone || 'Europe/Vienna',
        city: data.city || 'Vienna',
        country: data.country || 'Austria',
        address: data.address || null
      });
      // Also fetch weather data using location
      fetchWeatherData(data.latitude || 48.2082, data.longitude || 16.3738);
    } catch (err) {
      console.warn('[Calendar] Failed to fetch studio location, using defaults');
    }
  };

  // Fetch weather data for the studio location
  const fetchWeatherData = async (lat: number, lon: number) => {
    try {
      // Using Open-Meteo free API (no API key required)
      const resp = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
      );
      if (!resp.ok) return;
      const data = await resp.json();
      if (data.current_weather) {
        const wmo = data.current_weather.weathercode;
        // Map WMO weather codes to conditions
        const conditions = getWeatherConditions(wmo);
        setWeatherData({
          temp: data.current_weather.temperature,
          conditions: conditions,
          icon: getWeatherIcon(wmo)
        });
      }
    } catch (err) {
      console.warn('[Calendar] Failed to fetch weather data');
    }
  };

  // Map WMO weather codes to human-readable conditions
  const getWeatherConditions = (code: number): string => {
    if (code === 0) return 'Clear sky';
    if (code <= 3) return 'Partly cloudy';
    if (code <= 49) return 'Foggy';
    if (code <= 59) return 'Drizzle';
    if (code <= 69) return 'Rain';
    if (code <= 79) return 'Snow';
    if (code <= 99) return 'Thunderstorm';
    return 'Unknown';
  };

  // Map WMO codes to emoji icons
  const getWeatherIcon = (code: number): string => {
    if (code === 0) return '☀️';
    if (code <= 3) return '⛅';
    if (code <= 49) return '🌫️';
    if (code <= 59) return '🌧️';
    if (code <= 69) return '🌧️';
    if (code <= 79) return '❄️';
    if (code <= 99) return '⛈️';
    return '🌤️';
  };

  // Fetch available schedulers for share modal
  const fetchSchedulers = async () => {
    try {
      const resp = await fetch('/api/schedulers', {
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      });
      if (!resp.ok) return;
      const data = await resp.json();
      setAvailableSchedulers(data.filter((s: any) => s.isActive));
    } catch (err) {
      console.warn('[Calendar] Failed to fetch schedulers');
    }
  };

  const handleShareSchedulerClick = () => {
    fetchSchedulers();
    setShowShareSchedulerModal(true);
  };

  const copySchedulerLink = (scheduler: { id: number; slug: string }) => {
    const link = `${window.location.origin}/schedule/${scheduler.slug}`;
    navigator.clipboard.writeText(link);
    setCopiedSchedulerId(scheduler.id);
    setTimeout(() => setCopiedSchedulerId(null), 2000);
  };

  const fetchLeadsCount = async () => {
    try {
      const response = await fetch('/api/leads/list?status=new', {
        credentials: 'include'
      });
      if (!response.ok) return;
      const data = await response.json();
      setNewLeadsCount(data.count || (data.rows?.length ?? 0));
    } catch (error) {
      // console.log removed
    }
  };

  const fetchClients = async () => {
    try {
      setClientsLoading(true);
      const resp = await fetch('/api/crm/clients', {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!resp.ok) {
        console.warn('[Calendar] Failed to fetch clients:', resp.status, resp.statusText);
        return setClients([]);
      }
      const data = await resp.json();
      console.log('[Calendar] Fetched clients:', data?.length ?? 0, 'records');
      const mapped: ClientLight[] = (Array.isArray(data) ? data : []).map((c: any) => ({
        id: c.id,
        firstName: c.first_name ?? c.firstName ?? '',
        lastName: c.last_name ?? c.lastName ?? '',
        email: c.email,
        phone: c.phone,
      }));
      setClients(mapped);
    } catch (err) {
      console.error('[Calendar] Error fetching clients:', err);
      setClients([]);
    } finally {
      setClientsLoading(false);
    }
  };

  // (Legacy fetchDashboardStats removed; replaced later with enhanced version using auth + fallback)

  const fetchSessions = async () => {
    try {
      setIsLoading(true);
      // Limit to ±2 years to avoid loading 24k+ historical sessions
      const now = new Date();
      const from = new Date(now.getFullYear() - 2, 0, 1).toISOString();
      const to = new Date(now.getFullYear() + 2, 11, 31).toISOString();

      // Try authenticated endpoint first, fallback to debug endpoint
      let response = await fetch(`/api/photography/sessions?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });
      
      // If authenticated endpoint fails, fallback to debug endpoint for reliability
      if (!response.ok) {
        console.warn('[Calendar] Auth endpoint failed, using debug endpoint');
        response = await fetch('/api/debug/photography-sessions?limit=10000', {
          credentials: 'include'
        });
      }
      
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      } else {
        console.error('[Calendar] Failed to fetch sessions:', response.status);
        setSessions([]);
      }
    } catch (error) {
      console.error('[Calendar] Error fetching sessions:', error);
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  };
  // serverStatsLoaded is declared above; do not redeclare

  const computeDerivedStats = (list: PhotographySession[]) => {
    const now = new Date();
    const in30Days = new Date(); in30Days.setDate(in30Days.getDate() + 30);
    let totalRevenue = 0;
    let upcoming = 0;
    let completed = 0;
    let pendingDeposits = 0;
    // Simple equipment conflict detection (same start day & overlapping time w/ shared equipment)
    let equipmentConflicts = 0;
    const byDay: Record<string, PhotographySession[]> = {};

    list.forEach(s => {
      if (s.basePrice && typeof s.basePrice === 'number') totalRevenue += s.basePrice;
      const start = s.startTime ? new Date(s.startTime) : null;
      const end = s.endTime ? new Date(s.endTime) : null;
      if (start && start >= now && start <= in30Days) upcoming++;
      if (s.status === 'completed') {
        if (start && start.getFullYear() === now.getFullYear() && start.getMonth() === now.getMonth()) completed++;
      }
      if (s.depositAmount && !(s as any).depositPaid) pendingDeposits++;
      if (start) {
        const key = start.toISOString().slice(0,10);
        byDay[key] = byDay[key] || []; byDay[key].push(s);
      }
    });
    // naive conflict calc
    Object.values(byDay).forEach(daySessions => {
      for (let i=0;i<daySessions.length;i++) {
        for (let j=i+1;j<daySessions.length;j++) {
          const a = daySessions[i]; const b = daySessions[j];
          if (!a.equipmentList || !b.equipmentList) continue;
          const overlapEquip = a.equipmentList.filter(e => b.equipmentList!.includes(e));
          if (overlapEquip.length) {
            const aStart = new Date(a.startTime).getTime();
            const aEnd = new Date(a.endTime).getTime();
            const bStart = new Date(b.startTime).getTime();
            const bEnd = new Date(b.endTime).getTime();
            const overlapTime = aStart < bEnd && bStart < aEnd;
            if (overlapTime) equipmentConflicts++;
          }
        }
      }
    });
    return {
      totalSessions: list.length,
      upcomingSessions: upcoming,
      completedSessions: completed,
      totalRevenue,
      pendingDeposits,
      equipmentConflicts
    } as DashboardStats;
  };

  const fetchDashboardStats = async () => {
    try {
      const resp = await fetch('/api/admin/dashboard-stats', {
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      });
      if (!resp.ok) return;
      const data = await resp.json();
      setStats({
        totalSessions: data.totalSessions ?? 0,
        upcomingSessions: data.upcomingSessions ?? 0,
        completedSessions: data.completedSessions ?? 0,
        totalRevenue: data.totalRevenue ?? 0,
        pendingDeposits: data.pendingDeposits ?? 0,
        equipmentConflicts: data.equipmentConflicts ?? 0,
        newLeads: data.newLeads ?? 0,
      });
      setServerStatsLoaded(true);
      if (typeof data.newLeads === 'number') setNewLeadsCount(data.newLeads);
    } catch (err) {
      // ignore; fallback will compute
    }
  };

  const fetchAnalytics = async (p: 'week' | 'month') => {
    try {
      const resp = await fetch(`/api/admin/calendar-analytics?period=${p}`, {
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      });
      if (!resp.ok) return setAnalytics(null);
      const data = await resp.json();
      setAnalytics(data);
    } catch (_) {
      setAnalytics(null);
    }
  };

  // Fallback / live recompute when sessions load (if server stats unavailable)
  useEffect(() => {
    if (!serverStatsLoaded) {
      setStats(computeDerivedStats(sessions));
    }
  }, [sessions, serverStatsLoaded]);
  // Session type color helper (restored after metrics patch)
  const getSessionTypeColor = (sessionType: string) => {
    const colors: Record<string,string> = {
      wedding: 'bg-pink-100 border-pink-300 text-pink-800',
      portrait: 'bg-blue-100 border-blue-300 text-blue-800',
      commercial: 'bg-green-100 border-green-300 text-green-800',
      event: 'bg-purple-100 border-purple-300 text-purple-800',
      family: 'bg-orange-100 border-orange-300 text-orange-800',
      fashion: 'bg-indigo-100 border-indigo-300 text-indigo-800'
    };
    return colors[sessionType] || 'bg-gray-100 border-gray-300 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-3 h-3 text-green-600" />;
      case 'in-progress': return <Camera className="w-3 h-3 text-blue-600" />;
      case 'scheduled': return <Clock className="w-3 h-3 text-orange-600" />;
      case 'cancelled': return <AlertTriangle className="w-3 h-3 text-red-600" />;
      default: return <Clock className="w-3 h-3 text-gray-600" />;
    }
  };

  // Helper to format a Date to yyyy-MM-ddTHH:mm in local time for datetime-local inputs
  const formatLocalDateTime = (date: Date) => {
    const tzOffsetMs = date.getTimezoneOffset() * 60000;
    const local = new Date(date.getTime() - tzOffsetMs);
    return local.toISOString().slice(0, 16);
  };

  const handleCreateSession = () => {
    // Load CRM clients when opening the form to enable linking
    fetchClients();
    setEditingSessionId(null); // Ensure we're in create mode
    // Ensure start & end time default visibility
    setFormData(prev => {
      if (!prev.startTime) {
        const start = formatLocalDateTime(new Date());
        // Portrait default = +1 hour per requirement
        const endDate = new Date();
        endDate.setHours(endDate.getHours() + 1);
        const end = formatLocalDateTime(endDate);
        return { ...prev, startTime: start, endTime: prev.sessionType === 'portrait' ? end : prev.endTime };
      }
      // If session type is portrait and endTime missing, set +1h
      if (prev.sessionType === 'portrait' && prev.startTime && !prev.endTime) {
        const startDate = new Date(prev.startTime);
        const endDate = new Date(startDate.getTime() + 60 * 60000);
        return { ...prev, endTime: formatLocalDateTime(endDate) };
      }
      return prev;
    });
    setShowSessionForm(true);
  };

  const handleSubmitSession = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const sessionData = {
        ...formData,
        basePrice: formData.basePrice ? parseFloat(formData.basePrice) : undefined,
        depositAmount: formData.depositAmount ? parseFloat(formData.depositAmount) : undefined,
        equipmentList: formData.equipmentList.filter(item => item.trim() !== ''),
        startTime: formData.startTime ? new Date(formData.startTime).toISOString() : undefined,
        endTime: formData.endTime ? new Date(formData.endTime).toISOString() : undefined
      };

      const isEditing = !!editingSessionId;
      const url = isEditing ? `/api/photography/sessions/${editingSessionId}` : '/api/photography/sessions';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify(sessionData),
      });

      if (response.ok) {
        setShowSessionForm(false);
        setEditingSessionId(null);
        setFormData({
          title: '',
          description: '',
          sessionType: 'portrait',
          status: 'scheduled',
          startTime: '',
          endTime: '',
          clientId: '',
          clientName: '',
          clientEmail: '',
          locationName: '',
          locationAddress: '',
          locationCoordinates: '',
          basePrice: '',
          depositAmount: '',
          equipmentList: [],
          weatherDependent: false,
          goldenHourOptimized: false,
          portfolioWorthy: false
        });
        fetchSessions(); // Refresh the sessions list
      } else {
        alert(`Failed to ${isEditing ? 'update' : 'create'} session. Please try again.`);
      }
    } catch (error) {
      alert(`Error ${editingSessionId ? 'updating' : 'creating'} session. Please try again.`);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    if (field === 'endTime') setManualEndOverride(true);
    if (field === 'startTime') setManualStartOverride(true);
    if (field === 'clientName') {
      const v = (value || '').toLowerCase();
      if (v.length >= 2) {
        const suggestions = clients.filter(c => {
          const full = `${c.firstName} ${c.lastName}`.trim().toLowerCase();
          return full.includes(v);
        }).slice(0, 5);
        setClientNameSuggestions(suggestions);
      } else {
        setClientNameSuggestions([]);
      }
    }
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Keep portrait sessions to 1 hour by default unless manually overridden
  useEffect(() => {
    if (formData.sessionType === 'portrait' && formData.startTime) {
      if (!manualEndOverride || !formData.endTime) {
        const startDate = new Date(formData.startTime);
        const endDate = new Date(startDate.getTime() + 60 * 60000);
        const tzOffsetMs = endDate.getTimezoneOffset() * 60000;
        const local = new Date(endDate.getTime() - tzOffsetMs).toISOString().slice(0, 16);
        setFormData(prev => ({ ...prev, endTime: local }));
      }
    }
  }, [formData.sessionType, formData.startTime]);

  // Suggest a golden hour start time automatically when toggled on (if user hasn't manually set start)
  useEffect(() => {
    if (formData.goldenHourOptimized) {
      if (!formData.startTime || !manualStartOverride) {
        const base = formData.startTime ? new Date(formData.startTime) : new Date();
        let lat = 52.52, lon = 13.405; // default
        if (formData.locationCoordinates && formData.locationCoordinates.includes(',')) {
          const [plat, plon] = formData.locationCoordinates.split(',').map(parseFloat);
            if (!isNaN(plat) && !isNaN(plon)) { lat = plat; lon = plon; }
        }
        const tzOff = getTimezoneOffsetHours(studioLocation.timezone, base);
        const golden = calculateGoldenHour(base, lat, lon, tzOff);
        const now = new Date();
        let target = golden.windows.evening.start > now ? golden.windows.evening.start : golden.windows.morning.start;
        if (golden.windows.evening.end < now) {
          // choose tomorrow morning
          const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
          const goldenTomorrow = calculateGoldenHour(tomorrow, lat, lon, tzOff);
          target = goldenTomorrow.windows.morning.start;
        }
        const tzOffsetMs = target.getTimezoneOffset() * 60000;
        const startLocal = new Date(target.getTime() - tzOffsetMs).toISOString().slice(0, 16);
        const endLocal = new Date(target.getTime() + 60*60000 - tzOffsetMs).toISOString().slice(0, 16);
        setFormData(prev => ({ ...prev, startTime: startLocal, endTime: endLocal }));
      }
    }
  }, [formData.goldenHourOptimized]);

  // If user types an exact existing client name, auto-link
  useEffect(() => {
    if (formData.clientName) {
      const normalized = formData.clientName.trim().toLowerCase();
      const exact = clients.find(c => `${c.firstName} ${c.lastName}`.trim().toLowerCase() === normalized);
      if (exact) {
        if (!formData.clientId) handleInputChange('clientId', exact.id);
        if (!formData.clientEmail && exact.email) handleInputChange('clientEmail', exact.email);
      }
    }
  }, [formData.clientName, clients]);

  const addEquipmentItem = () => {
    const equipment = prompt('Enter equipment item:');
    if (equipment) {
      setFormData(prev => ({
        ...prev,
        equipmentList: [...prev.equipmentList, equipment]
      }));
    }
  };

  const removeEquipmentItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      equipmentList: prev.equipmentList.filter((_, i) => i !== index)
    }));
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session? This cannot be undone.')) return;
    try {
      const response = await fetch(`/api/photography/sessions/${sessionId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` },
      });
      if (response.ok) {
        setSelectedSession(null);
        fetchSessions();
      } else {
        alert('Failed to delete session. Please try again.');
      }
    } catch {
      alert('Error deleting session. Please try again.');
    }
  };

  const handleSessionClick = (session: PhotographySession) => {
    setSelectedSession(session);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Photography Calendar</h1>
            <p className="text-gray-600 mt-1">
              Advanced photography session management system with equipment tracking and client workflow tools
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">Date Format:</label>
              <select 
                value={dateFormat}
                onChange={(e) => {
                  setDateFormat(e.target.value);
                  localStorage.setItem('preferredDateFormat', e.target.value);
                }}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="MM/dd/yyyy">MM/DD/YYYY</option>
                <option value="dd/MM/yyyy">DD/MM/YYYY</option>
                <option value="yyyy-MM-dd">YYYY-MM-DD</option>
                <option value="dd.MM.yyyy">DD.MM.YYYY</option>
              </select>
            </div>
            <button 
              onClick={() => setShowGoogleCalendarModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
            >
              <Settings size={18} />
              <span>Calendar Sync</span>
            </button>
            <button 
              onClick={handleCreateSession}
              className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
            >
              <Camera className="w-4 h-4" />
              <span>New Session</span>
            </button>
          </div>
        </div>

        {/* Key Business Metrics - Highlighted Section */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Key Business Metrics</h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Period:</span>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as 'week' | 'month')}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-purple-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Total Revenue</span>
                <DollarSign className="h-5 w-5 text-purple-500" />
              </div>
              <div className="text-2xl font-bold text-purple-600">€{stats.totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-gray-500 mt-1">
                {analytics?.revenue?.delta !== undefined ? (
                  <span>
                    {analytics.revenue.delta >= 0 ? '↗' : '↘'} {Math.abs(Math.round(analytics.revenue.deltaPct))}% vs previous {period}
                  </span>
                ) : 'Based on session base prices'}
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">New Leads</span>
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-blue-600">{newLeadsCount}</div>
              <p className="text-xs text-gray-500 mt-1">
                {analytics?.leads?.delta !== undefined ? (
                  <span>
                    {analytics.leads.delta >= 0 ? '↗' : '↘'} {Math.abs(Math.round(analytics.leads.deltaPct))}% vs previous {period}
                  </span>
                ) : 'Last 7 days'}
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Upcoming Bookings</span>
                <Calendar className="h-5 w-5 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-green-600">{stats.upcomingSessions}</div>
              <p className="text-xs text-gray-500 mt-1">
                {analytics?.sessionsBooked?.delta !== undefined ? (
                  <span>
                    {analytics.sessionsBooked.delta >= 0 ? '↗' : '↘'} {Math.abs(Math.round(analytics.sessionsBooked.deltaPct))}% booked vs previous {period}
                  </span>
                ) : 'Next 30 days'}
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-orange-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Conversion Rate</span>
                <CheckCircle className="h-5 w-5 text-orange-500" />
              </div>
              <div className="text-2xl font-bold text-orange-600">{
                analytics?.conversion?.currentPct !== undefined ? `${Math.round(analytics.conversion.currentPct)}%` : (() => {
                  const leads = stats.newLeads ?? newLeadsCount ?? 0;
                  const booked = stats.upcomingSessions + stats.completedSessions;
                  if (leads <= 0) return '—';
                  const pct = Math.min(100, Math.round((booked / leads) * 100));
                  return `${pct}%`;
                })()
              }</div>
              <p className="text-xs text-gray-500 mt-1">
                {analytics?.conversion?.deltaPct !== undefined ? (
                  <span>
                    {analytics.conversion.deltaPct >= 0 ? '↗' : '↘'} {Math.abs(Math.round(analytics.conversion.deltaPct))}% vs previous {period}
                  </span>
                ) : 'Booked sessions vs new leads'}
              </p>
            </div>
          </div>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Total Sessions</span>
              <Calendar className="h-4 w-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold">{stats.totalSessions}</div>
            <p className="text-xs text-gray-500">All time</p>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Upcoming</span>
              <Clock className="h-4 w-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold">{stats.upcomingSessions}</div>
            <p className="text-xs text-gray-500">Next 30 days</p>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Completed</span>
              <CheckCircle className="h-4 w-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold">{stats.completedSessions}</div>
            <p className="text-xs text-gray-500">This month</p>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Revenue</span>
              <DollarSign className="h-4 w-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-gray-500">This month</p>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Pending Deposits</span>
              <TrendingUp className="h-4 w-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold">{stats.pendingDeposits}</div>
            <p className="text-xs text-gray-500">
              {stats.pendingDeposits > 0 ? 'Need attention' : 'All current'}
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Equipment Conflicts</span>
              <AlertTriangle className="h-4 w-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold">{stats.equipmentConflicts}</div>
            <p className="text-xs text-gray-500">
              {stats.equipmentConflicts > 0 ? 'Needs resolution' : 'All clear'}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button 
              onClick={handleCreateSession}
              className="flex flex-col items-center space-y-2 p-4 border rounded-lg hover:bg-gray-50"
            >
              <Camera className="w-6 h-6" />
              <span className="text-sm">Schedule Session</span>
            </button>
            <button
              onClick={() => setShowLocationScoutModal(true)}
              className="flex flex-col items-center space-y-2 p-4 border rounded-lg hover:bg-gray-50">
              <MapPin className="w-6 h-6" />
              <span className="text-sm">Location Scouting</span>
            </button>
            <button
              onClick={() => setShowEquipmentCheckModal(true)}
              className="flex flex-col items-center space-y-2 p-4 border rounded-lg hover:bg-gray-50">
              <CheckCircle className="w-6 h-6" />
              <span className="text-sm">Equipment Check</span>
            </button>
            <button
              onClick={() => {
                window.location.href = '/admin/reports';
              }}
              className="flex flex-col items-center space-y-2 p-4 border rounded-lg hover:bg-gray-50">
              <TrendingUp className="w-6 h-6" />
              <span className="text-sm">Revenue Report</span>
            </button>
            <button
              onClick={handleShareSchedulerClick}
              className="flex flex-col items-center space-y-2 p-4 border rounded-lg hover:bg-gray-50 relative">
              <Share2 className="w-6 h-6 text-purple-600" />
              <span className="text-sm">Share Booking Link</span>
              <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded-full">NEW</span>
            </button>
          </div>
        </div>

        {/* Feature Highlights - Wired with Real Data */}
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">New Photography Calendar Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Golden Hour - Using studio location */}
            <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
              <Sun className="w-5 h-5 text-yellow-600 mt-1" />
              <div>
                <h4 className="font-medium text-gray-900">Golden Hour Optimization</h4>
                <div className="text-sm text-gray-700 mt-1">
                  <p className="text-xs text-gray-500">Today in {studioLocation.city}:</p>
                  <p>🌅 Morning: <span className="font-medium">{calculateGoldenHour(new Date(), studioLocation.latitude, studioLocation.longitude, getTimezoneOffsetHours(studioLocation.timezone, new Date())).morning}</span></p>
                  <p>🌇 Evening: <span className="font-medium">{calculateGoldenHour(new Date(), studioLocation.latitude, studioLocation.longitude, getTimezoneOffsetHours(studioLocation.timezone, new Date())).evening}</span></p>
                </div>
              </div>
            </div>
            {/* Weather Integration - Real weather data */}
            <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
              <Cloud className="w-5 h-5 text-blue-600 mt-1" />
              <div>
                <h4 className="font-medium text-gray-900">Weather Integration</h4>
                <div className="text-sm text-gray-700 mt-1">
                  {weatherData ? (
                    <>
                      <p className="text-xs text-gray-500">Current in {studioLocation.city}:</p>
                      <p>{weatherData.icon} {weatherData.temp}°C - {weatherData.conditions}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {weatherData.conditions?.toLowerCase().includes('rain') || weatherData.conditions?.toLowerCase().includes('storm') 
                          ? '⚠️ Consider indoor backup' 
                          : '✅ Good outdoor conditions'}
                      </p>
                    </>
                  ) : (
                    <p className="text-gray-500">Loading weather data...</p>
                  )}
                </div>
              </div>
            </div>
            {/* Equipment Management - Show conflicts */}
            <div className="flex items-start space-x-3 p-3 bg-purple-50 rounded-lg">
              <Camera className="w-5 h-5 text-purple-600 mt-1" />
              <div>
                <h4 className="font-medium text-gray-900">Equipment Management</h4>
                <div className="text-sm text-gray-700 mt-1">
                  {stats.equipmentConflicts > 0 ? (
                    <p className="text-red-600">⚠️ {stats.equipmentConflicts} conflict{stats.equipmentConflicts > 1 ? 's' : ''} detected</p>
                  ) : (
                    <p className="text-green-600">✅ No equipment conflicts</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">{sessions.filter(s => s.equipmentList && s.equipmentList.length > 0).length} sessions with equipment</p>
                </div>
              </div>
            </div>
            {/* Portfolio Tracking - Show portfolio-worthy sessions */}
            <div className="flex items-start space-x-3 p-3 bg-orange-50 rounded-lg">
              <Star className="w-5 h-5 text-orange-600 mt-1" />
              <div>
                <h4 className="font-medium text-gray-900">Portfolio Tracking</h4>
                <div className="text-sm text-gray-700 mt-1">
                  <p>⭐ {sessions.filter(s => s.portfolioWorthy).length} portfolio-worthy sessions</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {sessions.filter(s => s.status === 'completed' && !s.portfolioWorthy).length} completed sessions to review
                  </p>
                </div>
              </div>
            </div>
            {/* AI-Powered Analytics */}
            <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600 mt-1" />
              <div>
                <h4 className="font-medium text-gray-900">AI-Powered Analytics</h4>
                <div className="text-sm text-gray-700 mt-1">
                  <p>📊 {stats.upcomingSessions} upcoming sessions</p>
                  <p>💰 €{stats.totalRevenue.toLocaleString()} this month</p>
                  <p className="text-xs text-gray-500 mt-1">{stats.completedSessions} sessions completed</p>
                </div>
              </div>
            </div>
            {/* Workflow Automation - Show delivery/editing status (recent completed sessions only) */}
            <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-blue-600 mt-1" />
              <div>
                <h4 className="font-medium text-gray-900">Workflow Automation</h4>
                <div className="text-sm text-gray-700 mt-1">
                  {(() => {
                    const cutoff = new Date();
                    cutoff.setDate(cutoff.getDate() - 90);
                    const recent = sessions.filter(s => s.status === 'completed' && new Date(s.startTime) >= cutoff);
                    const editing = recent.filter(s => s.editingStatus === 'pending' || s.editingStatus === 'in_progress').length;
                    const delivery = recent.filter(s => s.editingStatus === 'completed' && s.deliveryStatus === 'pending').length;
                    return (
                      <>
                        <p>📸 {editing} in editing queue</p>
                        <p>📬 {delivery} pending delivery</p>
                      </>
                    );
                  })()}
                  <p className="text-xs text-gray-500 mt-1">{stats.pendingDeposits} deposits pending</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Photography Calendar */}
        <AdvancedPhotographyCalendar 
          sessions={sessions}
          clients={clientsForCalendar}
          isLoading={isLoading}
          onSessionClick={handleSessionClick}
          onCreateSession={handleCreateSession}
          onUpdateSession={() => {}} // Will be implemented
          onDeleteSession={(sessionId: string) => handleDeleteSession(sessionId)}
          onDuplicateSession={() => {}} // Will be implemented
          onExportCalendar={async () => {
            try {
              // Trigger browser download of ICS feed generated by server
              window.location.href = '/api/calendar/photography-sessions.ics';
            } catch (_) {
              alert('Failed to export calendar.');
            }
          }}
          onImportCalendar={async (file: File) => {
            try {
              if (!file) return;
              if (!file.name.toLowerCase().endsWith('.ics')) {
                alert('Please select a .ics file to import.');
                return;
              }
              const text = await file.text();
              const params = new URLSearchParams({ includePast: 'true' });
              const resp = await fetch(`/api/calendar/import/ics?${params.toString()}`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                },
                body: JSON.stringify({ icsContent: text, fileName: file.name })
              });
              if (!resp.ok) {
                const err = await resp.json().catch(() => ({}));
                alert(`Import failed: ${err.error || resp.statusText}`);
                return;
              }
              const data = await resp.json();
              alert(`Imported ${data.imported ?? 0} events from ${file.name}.`);
              fetchSessions();
            } catch (e) {
              alert('Error importing .ics file.');
            }
          }}
          onSyncExternalCalendar={async () => {
            try {
              // Use the OAuth-based manual sync endpoint (not the old ICS import)
              const resp = await fetch('/api/calendar/manual-sync', {
                method: 'POST',
                credentials: 'include',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                },
              });
              const data = await resp.json();
              if (resp.ok && data.success) {
                alert(`Sync complete! Imported ${data.imported ?? 0}, Updated ${data.updated ?? 0} events.`);
                fetchSessions();
              } else if (data.tokenExpired) {
                alert('Google Calendar authorization has expired.\n\nPlease open Calendar Sync settings and click "Disconnect", then "Connect Google Calendar" to re-authorize.');
              } else {
                const errorMsg = data.errors?.join(', ') || data.error || resp.statusText;
                alert(`Sync failed: ${errorMsg}`);
              }
            } catch (e) {
              alert('Error syncing from Google Calendar. Please check Calendar Sync settings.');
            }
          }}
          onOpenSettings={() => setShowGoogleCalendarModal(true)}
        />

        {/* Session Legend */}
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Session Types & Indicators</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-pink-200 rounded border border-pink-300"></div>
              <span>Wedding</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-200 rounded border border-blue-300"></div>
              <span>Portrait</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-200 rounded border border-green-300"></div>
              <span>Commercial</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-200 rounded border border-purple-300"></div>
              <span>Event</span>
            </div>
            <div className="flex items-center space-x-2">
              <Sun className="w-3 h-3 text-yellow-600" />
              <span>Golden Hour</span>
            </div>
            <div className="flex items-center space-x-2">
              <Cloud className="w-3 h-3 text-blue-600" />
              <span>Weather Dependent</span>
            </div>
            <div className="flex items-center space-x-2">
              <Star className="w-3 h-3 text-purple-600" />
              <span>Portfolio Worthy</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-3 h-3 text-green-600" />
              <span>Completed</span>
            </div>
          </div>
        </div>

        {/* Session Form Modal */}
        {showSessionForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-medium mb-4">{editingSessionId ? 'Edit Photography Session' : 'Create New Photography Session'}</h3>
              
              <form onSubmit={handleSubmitSession} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Session Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Session Type</label>
                  <select
                    value={formData.sessionType}
                    onChange={(e) => handleInputChange('sessionType', e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="portrait">Portrait</option>
                    <option value="wedding">Wedding</option>
                    <option value="commercial">Commercial</option>
                    <option value="event">Event</option>
                    <option value="family">Family</option>
                    <option value="fashion">Fashion</option>
                  </select>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-lg font-medium mb-2 text-gray-800">Start Time</label>
                      <input
                        type="datetime-local"
                        value={formData.startTime}
                        onChange={(e) => {
                          handleInputChange('startTime', e.target.value);
                          // Auto-calculate end time based on session type
                          if (e.target.value) {
                            const startDate = new Date(e.target.value);
                            const durationMinutes = formData.sessionType === 'wedding' ? 480 : 60; // portrait & others default 60
                            const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
                            const endTimeString = formatLocalDateTime(endDate);
                            if (formData.sessionType === 'portrait') {
                              handleInputChange('endTime', endTimeString);
                            } else if (!formData.endTime) {
                              handleInputChange('endTime', endTimeString);
                            }
                          }
                        }}
                        className="w-full border rounded px-4 py-3 text-lg font-medium"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-lg font-medium mb-2 text-gray-800">End Time</label>
                      <input
                        type="datetime-local"
                        value={formData.endTime}
                        onChange={(e) => handleInputChange('endTime', e.target.value)}
                        className="w-full border rounded px-4 py-3 text-lg font-medium"
                        required
                      />
                    </div>
                  </div>
                  
                  {formData.goldenHourOptimized && formData.startTime && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <div className="flex items-center space-x-2 mb-2">
                        <Sun className="w-4 h-4 text-yellow-600" />
                        <span className="text-sm font-medium text-yellow-800">Golden Hour Optimization</span>
                      </div>
                      {(() => {
                        const sessionDate = new Date(formData.startTime);
                        // Vienna, Austria coordinates for Golden Hour calculation
                        const goldenHours = calculateGoldenHour(sessionDate, studioLocation.latitude, studioLocation.longitude, getTimezoneOffsetHours(studioLocation.timezone, sessionDate));
                        return (
                          <div className="text-xs text-yellow-700 space-y-1">
                            <p><strong>Morning Golden Hour:</strong> {goldenHours.morning}</p>
                            <p><strong>Evening Golden Hour:</strong> {goldenHours.evening}</p>
                            <p className="text-yellow-600 mt-2">💡 Consider weather conditions for optimal lighting</p>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Link to existing CRM client (optional) */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Link Client (optional)
                    {clientsLoading && <span className="ml-2 text-gray-400 text-xs">Loading...</span>}
                    {!clientsLoading && clients.length > 0 && (
                      <span className="ml-2 text-gray-400 text-xs">({clients.length} clients available)</span>
                    )}
                  </label>
                  <input
                    type="text"
                    placeholder="Search clients by name or email"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="w-full border rounded px-3 py-2 mb-2"
                  />
                  <select
                    value={formData.clientId}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleInputChange('clientId', val);
                      const c = clients.find(cl => cl.id === val);
                      if (c) {
                        handleInputChange('clientName', `${c.firstName} ${c.lastName}`.trim());
                        if (c.email) handleInputChange('clientEmail', c.email);
                      }
                    }}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">{clientsLoading ? '— Loading clients... —' : '— No linked client —'}</option>
                    {(clientsLoading ? [] : clients)
                      .filter(c => {
                        const q = clientSearch.trim().toLowerCase();
                        if (!q) return true;
                        const full = `${c.firstName} ${c.lastName}`.toLowerCase();
                        return full.includes(q) || (c.email?.toLowerCase().includes(q) ?? false);
                      })
                      .slice(0, 100)
                      .map(c => (
                        <option key={c.id} value={c.id}>
                          {c.firstName} {c.lastName}{c.email ? ` — ${c.email}` : ''}
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Selecting a client will auto-fill name and email.</p>
                  {/* Quick create client */}
                  <div className="mt-3 p-2 border rounded bg-gray-50">
                    <div className="text-xs font-medium mb-2">Quick create client</div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="First name"
                        value={newClientDraft.firstName}
                        onChange={(e) => setNewClientDraft({ ...newClientDraft, firstName: e.target.value })}
                        className="border rounded px-2 py-1 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Last name"
                        value={newClientDraft.lastName}
                        onChange={(e) => setNewClientDraft({ ...newClientDraft, lastName: e.target.value })}
                        className="border rounded px-2 py-1 text-sm"
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        value={newClientDraft.email}
                        onChange={(e) => setNewClientDraft({ ...newClientDraft, email: e.target.value })}
                        className="border rounded px-2 py-1 text-sm col-span-2"
                      />
                      <input
                        type="text"
                        placeholder="Phone (optional)"
                        value={newClientDraft.phone}
                        onChange={(e) => setNewClientDraft({ ...newClientDraft, phone: e.target.value })}
                        className="border rounded px-2 py-1 text-sm col-span-2"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={creatingClient || !newClientDraft.firstName || !newClientDraft.lastName || !newClientDraft.email}
                      onClick={async () => {
                        if (!newClientDraft.firstName || !newClientDraft.lastName || !newClientDraft.email) {
                          alert('Please fill in First name, Last name, and Email to create a new client.');
                          return;
                        }
                        try {
                          setCreatingClient(true);
                          const resp = await fetch('/api/crm/clients', {
                            method: 'POST',
                            credentials: 'include',
                            headers: { 
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${localStorage.getItem('token')}`
                            },
                            body: JSON.stringify({
                              firstName: newClientDraft.firstName.trim(),
                              lastName: newClientDraft.lastName.trim(),
                              email: newClientDraft.email.trim(),
                              phone: newClientDraft.phone?.trim() || undefined,
                            }),
                          });
                          if (!resp.ok) {
                            const errorData = await resp.json().catch(() => ({}));
                            alert(`Failed to create client: ${errorData.error || errorData.message || resp.statusText}`);
                            return;
                          }
                          const created = await resp.json();
                          // refresh clients list and select the new client
                          await fetchClients();
                          handleInputChange('clientId', created.id);
                          handleInputChange('clientName', `${created.first_name || created.firstName || ''} ${created.last_name || created.lastName || ''}`.trim());
                          if (created.email) handleInputChange('clientEmail', created.email);
                          setNewClientDraft({ firstName: '', lastName: '', email: '', phone: '' });
                          alert('✅ Client created and linked successfully!');
                        } catch (err: any) {
                          console.error('Error creating client:', err);
                          alert(`Error creating client: ${err.message || 'Unknown error'}`);
                        } finally {
                          setCreatingClient(false);
                        }
                      }}
                      className={`text-xs px-3 py-1 rounded ${
                        creatingClient || !newClientDraft.firstName || !newClientDraft.lastName || !newClientDraft.email
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                      title={!newClientDraft.firstName || !newClientDraft.lastName || !newClientDraft.email 
                        ? 'Fill in First name, Last name, and Email above to enable' 
                        : 'Create new client and link to this session'}
                    >
                      {creatingClient ? 'Creating…' : 'Create & Link Client'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Client Name</label>
                  <input
                    type="text"
                    value={formData.clientName}
                    onChange={(e) => handleInputChange('clientName', e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  />
                  {clientNameSuggestions.length > 0 && (
                    <ul className="mt-1 border rounded bg-white shadow divide-y max-h-40 overflow-auto text-sm">
                      {clientNameSuggestions.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => {
                              handleInputChange('clientName', `${c.firstName} ${c.lastName}`.trim());
                              handleInputChange('clientId', c.id);
                              if (c.email) handleInputChange('clientEmail', c.email);
                              setClientNameSuggestions([]);
                            }}
                            className="w-full text-left px-2 py-1 hover:bg-gray-50"
                          >
                            {c.firstName} {c.lastName}{c.email ? ` — ${c.email}` : ''}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Base Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.basePrice}
                      onChange={(e) => handleInputChange('basePrice', e.target.value)}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Deposit ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.depositAmount}
                      onChange={(e) => handleInputChange('depositAmount', e.target.value)}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium">Equipment List</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.equipmentList.map((item, index) => (
                      <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm flex items-center">
                        {item}
                        <button
                          type="button"
                          onClick={() => removeEquipmentItem(index)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addEquipmentItem}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    + Add Equipment
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.weatherDependent}
                      onChange={(e) => handleInputChange('weatherDependent', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm">Weather Dependent</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.goldenHourOptimized}
                      onChange={(e) => handleInputChange('goldenHourOptimized', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm">Golden Hour Optimized</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.portfolioWorthy}
                      onChange={(e) => handleInputChange('portfolioWorthy', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm">Portfolio Worthy</span>
                  </label>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
                  >
                    {editingSessionId ? 'Save Changes' : 'Create Session'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSessionForm(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Session Detail Modal */}
        {selectedSession && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">{selectedSession.title}</h3>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Session Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Type:</span>
                        <span className={`px-2 py-1 rounded text-xs ${getSessionTypeColor(selectedSession.sessionType)}`}>
                          {selectedSession.sessionType}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(selectedSession.status)}
                          <span>{selectedSession.status}</span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Start:</span>
                        <span>{format(parseISO(selectedSession.startTime), 'MMM d, yyyy h:mm a')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">End:</span>
                        <span>{format(parseISO(selectedSession.endTime), 'MMM d, yyyy h:mm a')}</span>
                      </div>
                      {selectedSession.clientName && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Client:</span>
                          <span>{selectedSession.clientName}</span>
                        </div>
                      )}
                      {selectedSession.clientEmail && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Email:</span>
                          <span>{selectedSession.clientEmail}</span>
                        </div>
                      )}
                      {selectedSession.locationName && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Location:</span>
                          <span>{selectedSession.locationName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Client Attach / Create Section */}
                  <div className="border rounded-lg p-3 bg-gray-50">
                    <h4 className="font-medium mb-2 text-sm">Client Assignment</h4>
                    {selectedSession.clientId ? (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-green-700">✅ Linked to: {selectedSession.clientName || selectedSession.clientId}</span>
                        <button
                          onClick={async () => {
                            try {
                              await fetch(`/api/photography/sessions/${selectedSession.id}`, {
                                method: 'PUT',
                                credentials: 'include',
                                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` },
                                body: JSON.stringify({ clientId: null, clientName: '', clientEmail: '' }),
                              });
                              setSelectedSession({ ...selectedSession, clientId: undefined, clientName: undefined, clientEmail: undefined });
                              fetchSessions();
                            } catch { alert('Failed to unlink client'); }
                          }}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Unlink
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-amber-600">⚠️ No client linked</p>
                        {!showClientAttach && !showNewClientForm && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => { fetchClients(); setShowClientAttach(true); }}
                              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Attach Existing Client
                            </button>
                            <button
                              onClick={() => setShowNewClientForm(true)}
                              className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              + New Client
                            </button>
                          </div>
                        )}

                        {/* Existing client picker */}
                        {showClientAttach && (
                          <div className="space-y-2">
                            <input
                              type="text"
                              placeholder="Search by name or email..."
                              value={clientAttachSearch}
                              onChange={(e) => setClientAttachSearch(e.target.value)}
                              className="w-full border rounded px-2 py-1.5 text-sm"
                              autoFocus
                            />
                            <div className="max-h-40 overflow-y-auto border rounded bg-white">
                              {clients
                                .filter(c => {
                                  if (!clientAttachSearch) return true;
                                  const t = clientAttachSearch.toLowerCase();
                                  const name = `${c.firstName} ${c.lastName}`.toLowerCase();
                                  return name.includes(t) || (c.email || '').toLowerCase().includes(t);
                                })
                                .slice(0, 15)
                                .map(c => (
                                  <button
                                    key={c.id}
                                    className="w-full text-left px-2 py-1.5 text-sm hover:bg-blue-50 border-b last:border-0"
                                    onClick={async () => {
                                      try {
                                        await fetch(`/api/photography/sessions/${selectedSession.id}`, {
                                          method: 'PUT',
                                          credentials: 'include',
                                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` },
                                          body: JSON.stringify({ clientId: c.id, clientName: `${c.firstName} ${c.lastName}`.trim(), clientEmail: c.email || '' }),
                                        });
                                        setSelectedSession({ ...selectedSession, clientId: c.id, clientName: `${c.firstName} ${c.lastName}`.trim(), clientEmail: c.email });
                                        setShowClientAttach(false);
                                        setClientAttachSearch('');
                                        fetchSessions();
                                      } catch { alert('Failed to attach client'); }
                                    }}
                                  >
                                    <div className="font-medium">{c.firstName} {c.lastName}</div>
                                    {c.email && <div className="text-xs text-gray-500">{c.email}</div>}
                                  </button>
                                ))}
                              {clients.filter(c => {
                                if (!clientAttachSearch) return true;
                                const t = clientAttachSearch.toLowerCase();
                                const name = `${c.firstName} ${c.lastName}`.toLowerCase();
                                return name.includes(t) || (c.email || '').toLowerCase().includes(t);
                              }).length === 0 && (
                                <div className="px-2 py-3 text-sm text-gray-500 text-center">No clients found</div>
                              )}
                            </div>
                            <div className="flex gap-2 items-center">
                              <button onClick={() => { setShowClientAttach(false); setClientAttachSearch(''); }} className="text-xs text-gray-500 hover:underline">Cancel</button>
                              <span className="text-gray-300">|</span>
                              <button onClick={() => { setShowClientAttach(false); setClientAttachSearch(''); setShowNewClientForm(true); }} className="text-xs text-green-600 hover:underline font-medium">+ Add New Client</button>
                            </div>
                          </div>
                        )}

                        {/* New client form */}
                        {showNewClientForm && (
                          <div className="space-y-2 border rounded p-2 bg-white">
                            <div className="grid grid-cols-2 gap-2">
                              <input placeholder="First name*" value={newClientData.firstName} onChange={e => setNewClientData(d => ({ ...d, firstName: e.target.value }))} className="border rounded px-2 py-1 text-sm" />
                              <input placeholder="Last name*" value={newClientData.lastName} onChange={e => setNewClientData(d => ({ ...d, lastName: e.target.value }))} className="border rounded px-2 py-1 text-sm" />
                            </div>
                            <input placeholder="Email" value={newClientData.email} onChange={e => setNewClientData(d => ({ ...d, email: e.target.value }))} className="w-full border rounded px-2 py-1 text-sm" />
                            <input placeholder="Phone" value={newClientData.phone} onChange={e => setNewClientData(d => ({ ...d, phone: e.target.value }))} className="w-full border rounded px-2 py-1 text-sm" />
                            <div className="flex gap-2">
                              <button
                                disabled={savingClient || !newClientData.firstName.trim() || !newClientData.lastName.trim()}
                                onClick={async () => {
                                  setSavingClient(true);
                                  try {
                                    const cRes = await fetch('/api/crm/clients', {
                                      method: 'POST',
                                      credentials: 'include',
                                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` },
                                      body: JSON.stringify({ firstName: newClientData.firstName.trim(), lastName: newClientData.lastName.trim(), email: newClientData.email.trim(), phone: newClientData.phone.trim(), status: 'active' }),
                                    });
                                    if (!cRes.ok) throw new Error('Failed to create client');
                                    const newClient = await cRes.json();
                                    const clientId = newClient.id;
                                    const clientName = `${newClientData.firstName.trim()} ${newClientData.lastName.trim()}`;
                                    await fetch(`/api/photography/sessions/${selectedSession.id}`, {
                                      method: 'PUT',
                                      credentials: 'include',
                                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` },
                                      body: JSON.stringify({ clientId, clientName, clientEmail: newClientData.email.trim() }),
                                    });
                                    setSelectedSession({ ...selectedSession, clientId, clientName, clientEmail: newClientData.email.trim() });
                                    setShowNewClientForm(false);
                                    setNewClientData({ firstName: '', lastName: '', email: '', phone: '' });
                                    fetchSessions();
                                    fetchClients();
                                  } catch (err: any) {
                                    alert(err.message || 'Failed to create client');
                                  } finally {
                                    setSavingClient(false);
                                  }
                                }}
                                className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                              >
                                {savingClient ? 'Saving...' : 'Create & Attach'}
                              </button>
                              <button onClick={() => { setShowNewClientForm(false); setNewClientData({ firstName: '', lastName: '', email: '', phone: '' }); }} className="text-xs text-gray-500 hover:underline">Cancel</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {selectedSession.description && (
                    <div>
                      <h4 className="font-medium mb-2">Description</h4>
                      <p className="text-sm text-gray-600">{selectedSession.description}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {(selectedSession.basePrice || selectedSession.depositAmount) && (
                    <div>
                      <h4 className="font-medium mb-2">Pricing</h4>
                      <div className="space-y-2 text-sm">
                        {selectedSession.basePrice && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Base Price:</span>
                            <span>${selectedSession.basePrice}</span>
                          </div>
                        )}
                        {selectedSession.depositAmount && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Deposit:</span>
                            <span>${selectedSession.depositAmount}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedSession.equipmentList && selectedSession.equipmentList.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Equipment List</h4>
                      <div className="flex flex-wrap gap-1">
                        {selectedSession.equipmentList.map((equipment, index) => (
                          <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                            {equipment}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="font-medium mb-2">Special Features</h4>
                    <div className="space-y-1 text-sm">
                      {selectedSession.goldenHourOptimized && (
                        <div className="flex items-center space-x-2">
                          <Sun className="w-4 h-4 text-yellow-600" />
                          <span>Golden Hour Optimized</span>
                        </div>
                      )}
                      {selectedSession.weatherDependent && (
                        <div className="flex items-center space-x-2">
                          <Cloud className="w-4 h-4 text-blue-600" />
                          <span>Weather Dependent</span>
                        </div>
                      )}
                      {selectedSession.portfolioWorthy && (
                        <div className="flex items-center space-x-2">
                          <Star className="w-4 h-4 text-purple-600" />
                          <span>Portfolio Worthy</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 mt-6 border-t">
                <button
                  onClick={() => handleDeleteSession(selectedSession.id)}
                  className="px-4 py-2 text-red-600 border border-red-300 rounded hover:bg-red-50"
                >
                  Delete Session
                </button>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    // Populate form with selected session data and open in edit mode
                    if (!selectedSession) return;
                    fetchClients();
                    setEditingSessionId(selectedSession.id);
                    setFormData({
                      title: selectedSession.title || '',
                      description: selectedSession.description || '',
                      sessionType: selectedSession.sessionType || 'portrait',
                      status: selectedSession.status || 'scheduled',
                      startTime: selectedSession.startTime ? formatLocalDateTime(new Date(selectedSession.startTime)) : '',
                      endTime: selectedSession.endTime ? formatLocalDateTime(new Date(selectedSession.endTime)) : '',
                      clientId: selectedSession.clientId || '',
                      clientName: selectedSession.clientName || '',
                      clientEmail: selectedSession.clientEmail || '',
                      locationName: selectedSession.locationName || '',
                      locationAddress: selectedSession.locationAddress || '',
                      locationCoordinates: selectedSession.locationCoordinates || '',
                      basePrice: selectedSession.basePrice ? String(selectedSession.basePrice) : '',
                      depositAmount: selectedSession.depositAmount ? String(selectedSession.depositAmount) : '',
                      equipmentList: selectedSession.equipmentList || [],
                      weatherDependent: selectedSession.weatherDependent || false,
                      goldenHourOptimized: selectedSession.goldenHourOptimized || false,
                      portfolioWorthy: selectedSession.portfolioWorthy || false
                    });
                    setManualEndOverride(true);
                    setManualStartOverride(true);
                    setSelectedSession(null);
                    setShowSessionForm(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Edit Session
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Location Scouting Modal */}
        {showLocationScoutModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <MapPin className="h-6 w-6 text-teal-600 mr-3" />
                    <h2 className="text-xl font-semibold text-gray-900">Location Scouting</h2>
                  </div>
                  <button
                    onClick={() => {
                      setShowLocationScoutModal(false);
                      setLocationScoutQuery('');
                    }}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-4">
                  Search for a location to scout for your next photoshoot. Opens in Google Maps.
                </p>
                <input
                  type="text"
                  value={locationScoutQuery}
                  onChange={(e) => setLocationScoutQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && locationScoutQuery.trim()) {
                      window.open(`https://www.google.com/maps/search/${encodeURIComponent(locationScoutQuery.trim())}`, '_blank');
                    }
                  }}
                  placeholder="e.g., Vienna parks, Schönbrunn Palace, urban rooftops..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-4 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  autoFocus
                />
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-2">Quick suggestions:</p>
                  <div className="flex flex-wrap gap-2">
                    {['Vienna parks', 'Schönbrunn Palace', 'Danube riverbank', 'Urban streets', 'Coffee shops Vienna', 'Prater'].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setLocationScoutQuery(suggestion)}
                        className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      if (locationScoutQuery.trim()) {
                        window.open(`https://www.google.com/maps/search/${encodeURIComponent(locationScoutQuery.trim())}`, '_blank');
                      }
                    }}
                    disabled={!locationScoutQuery.trim()}
                    className={`flex-1 py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 ${
                      locationScoutQuery.trim()
                        ? 'bg-teal-600 text-white hover:bg-teal-700'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                    Open in Google Maps
                  </button>
                  <button
                    onClick={() => {
                      setShowLocationScoutModal(false);
                      setLocationScoutQuery('');
                    }}
                    className="px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Equipment Check Modal */}
        {showEquipmentCheckModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CheckCircle className="h-6 w-6 text-teal-600 mr-3" />
                    <h2 className="text-xl font-semibold text-gray-900">Equipment Checklist</h2>
                  </div>
                  <button
                    onClick={() => setShowEquipmentCheckModal(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {equipmentChecklist.filter(i => i.checked).length} of {equipmentChecklist.length} items checked
                </p>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                {['Camera', 'Lenses', 'Lighting', 'Storage', 'Power', 'Support', 'Accessories'].map((category) => {
                  const items = equipmentChecklist.filter(i => i.category === category);
                  if (items.length === 0) return null;
                  return (
                    <div key={category} className="mb-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">{category}</h3>
                      <div className="space-y-2">
                        {items.map((item) => (
                          <label
                            key={item.id}
                            className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                              item.checked 
                                ? 'bg-teal-50 border-teal-300' 
                                : 'bg-white border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={item.checked}
                              onChange={() => {
                                setEquipmentChecklist(prev => 
                                  prev.map(i => i.id === item.id ? { ...i, checked: !i.checked } : i)
                                );
                              }}
                              className="w-5 h-5 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                            />
                            <span className={`ml-3 ${item.checked ? 'text-teal-700 line-through' : 'text-gray-700'}`}>
                              {item.name}
                            </span>
                            {item.checked && (
                              <CheckCircle className="w-4 h-4 text-teal-600 ml-auto" />
                            )}
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setEquipmentChecklist(prev => prev.map(i => ({ ...i, checked: true })));
                    }}
                    className="flex-1 py-2 px-4 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium"
                  >
                    Check All
                  </button>
                  <button
                    onClick={() => {
                      setEquipmentChecklist(prev => prev.map(i => ({ ...i, checked: false })));
                    }}
                    className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium"
                  >
                    Reset All
                  </button>
                  <button
                    onClick={() => setShowEquipmentCheckModal(false)}
                    className="py-2 px-4 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-medium"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Share Scheduler Modal */}
        {showShareSchedulerModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Share2 className="h-6 w-6 text-purple-600 mr-3" />
                    <h2 className="text-xl font-semibold text-gray-900">Share Booking Link</h2>
                  </div>
                  <button
                    onClick={() => setShowShareSchedulerModal(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-4">
                  Send a booking link to clients so they can schedule their own appointment - no back and forth needed!
                </p>
                {availableSchedulers.length > 0 ? (
                  <div className="space-y-3">
                    {availableSchedulers.map((scheduler) => (
                      <div
                        key={scheduler.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{scheduler.name}</p>
                          <p className="text-sm text-gray-500">/schedule/{scheduler.slug}</p>
                        </div>
                        <button
                          onClick={() => copySchedulerLink(scheduler)}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            copiedSchedulerId === scheduler.id
                              ? 'bg-green-100 text-green-700'
                              : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                          }`}
                        >
                          {copiedSchedulerId === scheduler.id ? '✓ Copied!' : 'Copy Link'}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Share2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No active schedulers found</p>
                    <button
                      onClick={() => {
                        setShowShareSchedulerModal(false);
                        window.location.href = '/admin/schedulers';
                      }}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                    >
                      Create Your First Scheduler
                    </button>
                  </div>
                )}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setShowShareSchedulerModal(false);
                      window.location.href = '/admin/schedulers';
                    }}
                    className="w-full py-2 text-purple-600 hover:text-purple-700 font-medium text-sm"
                  >
                    Manage Schedulers →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Google Calendar Integration Modal */}
        <GoogleCalendarIntegration
          isOpen={showGoogleCalendarModal}
          onClose={() => setShowGoogleCalendarModal(false)}
          onConnectionSuccess={() => {
            // console.log removed
            // Refresh sessions to show synced events
            fetchSessions();
          }}
        />
      </div>
    </AdminLayout>
  );
};

export default PhotographyCalendarPage;
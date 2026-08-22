import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import { Plus, Calendar, Clock, MapPin, User, Euro, Camera, CheckCircle, XCircle, AlertCircle, Search } from 'lucide-react';
import { useStudioCurrency } from '../../hooks/useStudioCurrency';
import { useLanguage } from '../../context/LanguageContext';

interface Session {
  id: string;
  client_name: string;
  client_email: string;
  session_type: string;
  session_date: string;
  duration_minutes: number;
  location: string;
  price: number;
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'COMPLETED';
  notes: string;
  equipment_needed: string[];
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

const CalendarPage: React.FC = () => {
  const { currency, format: formatPrice } = useStudioCurrency();
  const { language } = useLanguage();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [googleEvents, setGoogleEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingGoogleEvents, setLoadingGoogleEvents] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('');
  
  // Create session form state
  const [newSession, setNewSession] = useState({
    client_id: '',
    session_type: 'FAMILY',
    session_date: '',
    session_time: '',
    duration_minutes: 120,
    location: '',
    notes: '',
    price: 0,
    deposit_required: 0,
    equipment_needed: []
  });

  const sessionTypes = [
    'FAMILY', 'NEWBORN', 'MATERNITY', 'BUSINESS', 'WEDDING', 
    'EVENT', 'PORTRAIT', 'HEADSHOT', 'COUPLE', 'ENGAGEMENT'
  ];

  // Fetch clients once on mount (don't re-fetch on filter changes)
  useEffect(() => {
    fetchClients();
    fetchGoogleCalendarEvents();
  }, []);

  // Fetch sessions when filters change
  useEffect(() => {
    fetchSessions();
  }, [selectedStatusFilter, selectedTypeFilter]);

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/crm/clients');
      
      if (!response.ok) {
        console.warn(`Failed to fetch clients: ${response.status}`);
        setClients([]); // Calendar can work without full client list
        return;
      }
      
      const data = await response.json();
      setClients(data);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
      setClients([]); // Don't crash calendar if clients fail to load
    }
  };

  const fetchGoogleCalendarEvents = async () => {
    try {
      setLoadingGoogleEvents(true);
      const response = await fetch('/api/calendar/google-events');
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.events) {
          setGoogleEvents(data.events);
          console.log(`Loaded ${data.events.length} Google Calendar events`);
        }
      } else {
        console.warn('Failed to load Google Calendar events:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch Google Calendar events:', error);
    } finally {
      setLoadingGoogleEvents(false);
    }
  };

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null); // Clear previous errors
      
      const params = new URLSearchParams();
      if (selectedStatusFilter) params.append('status', selectedStatusFilter);
      if (selectedTypeFilter) params.append('session_type', selectedTypeFilter);
      
      const response = await fetch(`/api/calendar/sessions?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load sessions: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setSessions(data);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      setError(error instanceof Error ? error.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    try {
      if (!newSession.client_id || !newSession.session_date || !newSession.session_time || !newSession.location) {
        alert('Please fill in all required fields');
        return;
      }

      const sessionDateTime = `${newSession.session_date} ${newSession.session_time}:00`;
      
      const response = await fetch('/api/calendar/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newSession,
          session_date: sessionDateTime
        }),
      });

      if (response.ok) {
        setIsCreateModalOpen(false);
        setNewSession({
          client_id: '',
          session_type: 'FAMILY',
          session_date: '',
          session_time: '',
          duration_minutes: 120,
          location: '',
          notes: '',
          price: 0,
          deposit_required: 0,
          equipment_needed: []
        });
        fetchSessions();
      } else {
        const error = await response.json();
        alert(`Failed to create session: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to create session:', error);
      alert('Failed to create session');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'PENDING': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'CANCELLED': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'COMPLETED': return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      case 'COMPLETED': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-GB', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatSessionType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase().replace('_', ' ');
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="ml-2 text-gray-600">Loading calendar...</span>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="p-8 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">
            ⚠️ Calendar Temporarily Unavailable
          </h2>
          <p className="text-yellow-700 mb-4">{error}</p>
          <div className="space-x-2">
            <Button onClick={() => {
              setError(null);
              fetchSessions();
              fetchClients();
              fetchGoogleCalendarEvents();
            }}>
              Try Again
            </Button>
            <Button onClick={() => window.location.reload()} className="bg-gray-500 hover:bg-gray-600">
              Reload Page
            </Button>
          </div>
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
            <h1 className="text-2xl font-semibold text-gray-900">Photography Calendar</h1>
            <p className="text-gray-600">Manage photography sessions and bookings</p>
          </div>
          
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                Book Session
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Photography Session</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="client">Client *</Label>
                    <Select value={newSession.client_id} onValueChange={(value) => setNewSession({...newSession, client_id: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map(client => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.first_name} {client.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="session_type">Session Type *</Label>
                    <Select value={newSession.session_type} onValueChange={(value) => setNewSession({...newSession, session_type: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {sessionTypes.map(type => (
                          <SelectItem key={type} value={type}>
                            {formatSessionType(type)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date">Date *</Label>
                    <Input
                      type="date"
                      value={newSession.session_date}
                      onChange={(e) => setNewSession({...newSession, session_date: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="time">Time *</Label>
                    <Input
                      type="time"
                      value={newSession.session_time}
                      onChange={(e) => setNewSession({...newSession, session_time: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input
                      type="number"
                      value={newSession.duration_minutes}
                      onChange={(e) => setNewSession({...newSession, duration_minutes: parseInt(e.target.value)})}
                      min={30}
                      max={480}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="price">Price ({currency})</Label>
                    <Input
                      type="number"
                      value={newSession.price}
                      onChange={(e) => setNewSession({...newSession, price: parseFloat(e.target.value)})}
                      min={0}
                      step={0.01}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    value={newSession.location}
                    onChange={(e) => setNewSession({...newSession, location: e.target.value})}
                    placeholder="Studio, outdoor location, client home..."
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    value={newSession.notes}
                    onChange={(e) => setNewSession({...newSession, notes: e.target.value})}
                    placeholder="Special requirements, equipment notes..."
                    rows={3}
                  />
                </div>

                <Button onClick={handleCreateSession} className="w-full bg-purple-600 hover:bg-purple-700">
                  <Calendar className="h-4 w-4 mr-2" />
                  Create Session
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex space-x-4">
          <div className="flex-1">
            <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1">
            <Select value={selectedTypeFilter} onValueChange={setSelectedTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                {sessionTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {formatSessionType(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                  <p className="text-2xl font-bold text-gray-900">{sessions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Confirmed</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {sessions.filter(s => s.status === 'CONFIRMED').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertCircle className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {sessions.filter(s => s.status === 'PENDING').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Euro className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatPrice(sessions.reduce((sum, s) => sum + (s.price || 0), 0))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Google Calendar Events */}
        {googleEvents.length > 0 && (
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center text-blue-900">
                <Calendar className="h-5 w-5 mr-2" />
                Google Calendar Events ({googleEvents.length})
                {loadingGoogleEvents && <span className="ml-2 text-sm text-blue-600">Syncing...</span>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {googleEvents.slice(0, 10).map((event, idx) => (
                  <div key={event.id || idx} className="flex items-center justify-between p-3 bg-white rounded border border-blue-200">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{event.title || 'Untitled Event'}</div>
                      <div className="text-sm text-gray-600 flex items-center mt-1">
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(event.start).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                        {event.location && (
                          <span className="ml-3 flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {event.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {googleEvents.length > 10 && (
                  <div className="text-center text-sm text-blue-600 pt-2">
                    + {googleEvents.length - 10} more events
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sessions List */}
        <div className="grid grid-cols-1 gap-4">
          {sessions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No sessions found</h3>
                <p className="text-gray-600 mb-4">Start by creating your first photography session</p>
                <Button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Book First Session
                </Button>
              </CardContent>
            </Card>
          ) : (
            sessions.map(session => (
              <Card key={session.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-2">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(session.status)}
                          <Badge className={getStatusBadgeColor(session.status)}>
                            {session.status}
                          </Badge>
                        </div>
                        <Badge variant="outline" className="bg-purple-50 text-purple-700">
                          {formatSessionType(session.session_type)}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center text-gray-600">
                          <User className="h-4 w-4 mr-2" />
                          <span className="font-medium">{session.client_name}</span>
                        </div>
                        
                        <div className="flex items-center text-gray-600">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span>{formatDate(session.session_date)}</span>
                        </div>
                        
                        <div className="flex items-center text-gray-600">
                          <Clock className="h-4 w-4 mr-2" />
                          <span>{session.duration_minutes} minutes</span>
                        </div>
                        
                        <div className="flex items-center text-gray-600">
                          <MapPin className="h-4 w-4 mr-2" />
                          <span>{session.location}</span>
                        </div>
                        
                        <div className="flex items-center text-gray-600">
                          <Euro className="h-4 w-4 mr-2" />
                          <span>{formatPrice(session.price || 0)}</span>
                        </div>
                        
                        <div className="flex items-center text-gray-600">
                          <Camera className="h-4 w-4 mr-2" />
                          <span>{session.equipment_needed?.length || 0} items</span>
                        </div>
                      </div>
                      
                      {session.notes && (
                        <div className="mt-3 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          {session.notes}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex space-x-2 ml-4">
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default CalendarPage;
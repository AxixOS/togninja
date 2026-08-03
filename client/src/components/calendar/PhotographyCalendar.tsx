import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus, MapPin, Camera, Clock, DollarSign, AlertTriangle, CheckCircle, Star, Sun, Cloud, Camera as CameraIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isAfter, isBefore } from 'date-fns';

interface PhotographySession {
  id: string;
  title: string;
  description?: string;
  sessionType: string;
  status: string;
  startTime: string;
  endTime: string;
  clientName?: string;
  clientEmail?: string;
  locationName?: string;
  locationAddress?: string;
  basePrice?: number;
  depositAmount?: number;
  depositPaid: boolean;
  equipmentList?: string[];
  weatherDependent: boolean;
  goldenHourOptimized: boolean;
  portfolioWorthy: boolean;
  editingStatus: string;
}

interface CalendarViewProps {
  sessions: PhotographySession[];
  onSessionClick: (session: PhotographySession) => void;
  onCreateSession: () => void;
}

export const getSessionTypeColor = (sessionType: string) => {
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

export const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed': return <CheckCircle className="w-3 h-3 text-green-600" />;
    case 'in-progress': return <Camera className="w-3 h-3 text-blue-600" />;
    case 'scheduled': return <Clock className="w-3 h-3 text-orange-600" />;
    case 'cancelled': return <AlertTriangle className="w-3 h-3 text-red-600" />;
    default: return <Clock className="w-3 h-3 text-gray-600" />;
  }
};

const CalendarView: React.FC<CalendarViewProps> = ({ sessions, onSessionClick, onCreateSession }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getSessionsForDate = (date: Date) => {
    return sessions.filter(session => 
      isSameDay(parseISO(session.startTime), date)
    );
  };

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-gray-900">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <div className="flex space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <Button onClick={onCreateSession} className="flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>New Session</span>
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 bg-white border border-gray-200 rounded-lg p-4">
        {/* Day Headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 border-b">
            {day}
          </div>
        ))}

        {/* Calendar Days */}
        {daysInMonth.map(day => {
          const daySession = getSessionsForDate(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          
          return (
            <div
              key={day.toISOString()}
              className={`min-h-[120px] p-2 border-b border-r cursor-pointer hover:bg-gray-50 ${
                !isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''
              } ${isSelected ? 'bg-blue-50' : ''}`}
              onClick={() => setSelectedDate(day)}
            >
              <div className="text-sm font-medium mb-1">
                {format(day, 'd')}
              </div>
              
              <div className="space-y-1">
                {daySession.slice(0, 3).map(session => (
                  <div
                    key={session.id}
                    className={`text-xs p-1 rounded border cursor-pointer hover:shadow-sm ${getSessionTypeColor(session.sessionType)}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSessionClick(session);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate flex-1">{session.title}</span>
                      {getStatusIcon(session.status)}
                    </div>
                    <div className="flex items-center space-x-1 mt-1">
                      {session.goldenHourOptimized && (
                        <Sun className="w-2 h-2 text-yellow-600" />
                      )}
                      {session.weatherDependent && (
                        <Cloud className="w-2 h-2 text-blue-600" />
                      )}
                      {session.portfolioWorthy && (
                        <Star className="w-2 h-2 text-purple-600" />
                      )}
                    </div>
                  </div>
                ))}
                
                {daySession.length > 3 && (
                  <div className="text-xs text-gray-500 p-1">
                    +{daySession.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Session Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Session Types & Indicators</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
};

const TimelineView: React.FC<CalendarViewProps> = ({ sessions, onSessionClick, onCreateSession }) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  
  const sortedSessions = [...sessions].sort((a, b) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Timeline View</h2>
        <Button onClick={onCreateSession} className="flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>New Session</span>
        </Button>
      </div>

      <div className="space-y-2">
        {sortedSessions.map(session => (
          <Card
            key={session.id}
            className="hover:shadow-md transition-shadow"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => onSessionClick(session)}>
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline" className={getSessionTypeColor(session.sessionType)}>
                      {session.sessionType}
                    </Badge>
                    <span className="font-medium">{session.title}</span>
                    {getStatusIcon(session.status)}
                  </div>
                  
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{format(parseISO(session.startTime), 'MMM d, h:mm a')}</span>
                    </div>
                    {session.clientName && (
                      <div className="flex items-center space-x-1">
                        <Camera className="w-4 h-4" />
                        <span>{session.clientName}</span>
                      </div>
                    )}
                    {session.locationName && (
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-4 h-4" />
                        <span>{session.locationName}</span>
                      </div>
                    )}
                    {session.basePrice && (
                      <div className="flex items-center space-x-1">
                        <DollarSign className="w-4 h-4" />
                        <span>${session.basePrice}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

const ShootOverview: React.FC<CalendarViewProps> = ({ sessions, onSessionClick, onCreateSession }) => {
  const upcomingSessions = sessions.filter(session => 
    isAfter(parseISO(session.startTime), new Date()) && session.status === 'scheduled'
  );

  const equipmentConflicts = sessions.filter(session => 
    session.equipmentList && session.equipmentList.length > 0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Shoot Overview</h2>
        <Button onClick={onCreateSession} className="flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>New Session</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Upcoming Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Camera className="w-5 h-5" />
              <span>Upcoming Sessions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingSessions.slice(0, 5).map(session => (
                <div
                  key={session.id}
                  className="p-3 border rounded cursor-pointer hover:bg-gray-50"
                  onClick={() => onSessionClick(session)}
                >
                  <div className="font-medium text-sm">{session.title}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {format(parseISO(session.startTime), 'MMM d, h:mm a')}
                  </div>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      {session.sessionType}
                    </Badge>
                    {session.goldenHourOptimized && (
                      <Sun className="w-3 h-3 text-yellow-600" />
                    )}
                    {session.portfolioWorthy && (
                      <Star className="w-3 h-3 text-purple-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Equipment Needs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CameraIcon className="w-5 h-5" />
              <span>Equipment Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {equipmentConflicts.slice(0, 5).map(session => (
                <div key={session.id} className="p-3 border rounded">
                  <div className="font-medium text-sm">{session.title}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    Equipment: {session.equipmentList?.slice(0, 2).join(', ')}
                    {session.equipmentList && session.equipmentList.length > 2 && ' ...'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Revenue Pipeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5" />
              <span>Revenue Pipeline</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sessions
                .filter(session => session.basePrice && session.status !== 'cancelled')
                .slice(0, 5)
                .map(session => (
                  <div key={session.id} className="p-3 border rounded">
                    <div className="font-medium text-sm">{session.title}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      ${session.basePrice} 
                      {session.depositPaid ? (
                        <Badge variant="outline" className="ml-2 text-green-600">
                          Deposit Paid
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="ml-2 text-orange-600">
                          Pending
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export const PhotographyCalendar: React.FC = () => {
  const [sessions, setSessions] = useState<PhotographySession[]>([]);
  const [selectedSession, setSelectedSession] = useState<PhotographySession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState('calendar');

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setIsLoading(true);
      // In dev, optionally use the debug endpoint which is public and returns up to 50 sessions
      const useDebug = import.meta.env.VITE_USE_DEBUG_SESSIONS === 'true';
      const endpoint = useDebug ? '/api/debug/photography-sessions' : '/api/photography/sessions';
      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      }
    } catch (error) {
      // swallow in UI; kept intentionally quiet for dev
    } finally {
      setIsLoading(false);
    }
  };

  const handleSessionClick = (session: PhotographySession) => {
    setSelectedSession(session);
  };

  const handleCreateSession = () => {
    // Navigate to session creation form
    // console.log removed
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-400 animate-spin" />
          <div className="text-gray-600">Loading sessions...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="overview">Shoot Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <CalendarView
            sessions={sessions}
            onSessionClick={handleSessionClick}
            onCreateSession={handleCreateSession}
          />
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <TimelineView
            sessions={sessions}
            onSessionClick={handleSessionClick}
            onCreateSession={handleCreateSession}
          />
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <ShootOverview
            sessions={sessions}
            onSessionClick={handleSessionClick}
            onCreateSession={handleCreateSession}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="text-center py-12">
            <Camera className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">AI-Powered Analytics</h3>
            <p className="text-gray-600">
              Coming soon: Booking patterns, revenue forecasting, and equipment optimization insights.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Session Detail Dialog */}
      <Dialog open={!!selectedSession} onOpenChange={(open) => !open && setSelectedSession(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedSession?.title}</DialogTitle>
          </DialogHeader>
          
          {selectedSession && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Session Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <Badge variant="outline">{selectedSession.sessionType}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(selectedSession.status)}
                        <span>{selectedSession.status}</span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span>{format(parseISO(selectedSession.startTime), 'MMM d, yyyy h:mm a')}</span>
                    </div>
                    {selectedSession.clientName && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Client:</span>
                        <span>{selectedSession.clientName}</span>
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

                {selectedSession.description && (
                  <div>
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-sm text-gray-600">{selectedSession.description}</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Business Details</h4>
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
                        <div className="flex items-center space-x-2">
                          <span>${selectedSession.depositAmount}</span>
                          <Badge variant={selectedSession.depositPaid ? "default" : "outline"}>
                            {selectedSession.depositPaid ? "Paid" : "Pending"}
                          </Badge>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Editing Status:</span>
                      <span className="capitalize">{selectedSession.editingStatus}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Special Features</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedSession.goldenHourOptimized && (
                      <Badge variant="outline" className="flex items-center space-x-1">
                        <Sun className="w-3 h-3" />
                        <span>Golden Hour</span>
                      </Badge>
                    )}
                    {selectedSession.weatherDependent && (
                      <Badge variant="outline" className="flex items-center space-x-1">
                        <Cloud className="w-3 h-3" />
                        <span>Weather Dependent</span>
                      </Badge>
                    )}
                    {selectedSession.portfolioWorthy && (
                      <Badge variant="outline" className="flex items-center space-x-1">
                        <Star className="w-3 h-3" />
                        <span>Portfolio Worthy</span>
                      </Badge>
                    )}
                  </div>
                </div>

                {selectedSession.equipmentList && selectedSession.equipmentList.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Equipment List</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedSession.equipmentList.map((equipment, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {equipment}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PhotographyCalendar;
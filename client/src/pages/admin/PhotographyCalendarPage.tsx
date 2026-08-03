import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Calendar, Camera, Clock, DollarSign, MapPin, TrendingUp, AlertTriangle, CheckCircle, Plus, Sun, Cloud, Star } from 'lucide-react';

interface DashboardStats {
  totalSessions: number;
  upcomingSessions: number;
  completedSessions: number;
  totalRevenue: number;
  pendingDeposits: number;
  equipmentConflicts: number;
}

const PhotographyCalendarPage: React.FC = () => {
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [editingSession, setEditingSession] = useState(null);

  // Mock stats - in real app would come from API
  const stats: DashboardStats = {
    totalSessions: 45,
    upcomingSessions: 12,
    completedSessions: 33,
    totalRevenue: 18750,
    pendingDeposits: 3,
    equipmentConflicts: 1
  };

  const handleCreateSession = () => {
    setEditingSession(null);
    setShowSessionForm(true);
  };

  const handleEditSession = (session: any) => {
    setEditingSession(session);
    setShowSessionForm(true);
  };

  const handleSaveSession = async (sessionData: any) => {
    try {
      const endpoint = editingSession 
        ? `/api/photography/sessions/${editingSession.id}` 
        : '/api/photography/sessions';
      
      const method = editingSession ? 'PUT' : 'POST';
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      });

      if (response.ok) {
        // console.log removed
        setShowSessionForm(false);
        setEditingSession(null);
        // Refresh the calendar data
        window.location.reload();
      } else {
        // console.error removed
      }
    } catch (error) {
      // console.error removed
    }
  };

  const handleCancelForm = () => {
    setShowSessionForm(false);
    setEditingSession(null);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Photography Calendar</h1>
            <p className="text-gray-600 mt-1">
              Manage sessions, equipment, and scheduling with advanced photography workflow tools
            </p>
          </div>
          <Button onClick={handleCreateSession} className="flex items-center space-x-2">
            <Camera className="w-4 h-4" />
            <span>New Session</span>
          </Button>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSessions}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upcomingSessions}</div>
              <p className="text-xs text-muted-foreground">Next 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedSessions}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Deposits</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingDeposits}</div>
              <p className="text-xs text-muted-foreground">
                {stats.pendingDeposits > 0 ? 'Need attention' : 'All current'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Equipment Conflicts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.equipmentConflicts}</div>
              <p className="text-xs text-muted-foreground">
                {stats.equipmentConflicts > 0 ? 'Needs resolution' : 'All clear'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="flex flex-col items-center space-y-2 h-auto py-4">
                <Camera className="w-6 h-6" />
                <span className="text-sm">Schedule Session</span>
              </Button>
              <Button variant="outline" className="flex flex-col items-center space-y-2 h-auto py-4">
                <MapPin className="w-6 h-6" />
                <span className="text-sm">Location Scouting</span>
              </Button>
              <Button variant="outline" className="flex flex-col items-center space-y-2 h-auto py-4">
                <CheckCircle className="w-6 h-6" />
                <span className="text-sm">Equipment Check</span>
              </Button>
              <Button variant="outline" className="flex flex-col items-center space-y-2 h-auto py-4">
                <TrendingUp className="w-6 h-6" />
                <span className="text-sm">Revenue Report</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        {(stats.pendingDeposits > 0 || stats.equipmentConflicts > 0) && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <span>Attention Required</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.pendingDeposits > 0 && (
                  <div className="flex items-center justify-between p-2 bg-white rounded border">
                    <span className="text-sm">
                      <strong>{stats.pendingDeposits}</strong> sessions have pending deposits
                    </span>
                    <Badge variant="outline">Action needed</Badge>
                  </div>
                )}
                {stats.equipmentConflicts > 0 && (
                  <div className="flex items-center justify-between p-2 bg-white rounded border">
                    <span className="text-sm">
                      <strong>{stats.equipmentConflicts}</strong> equipment conflict detected
                    </span>
                    <Badge variant="outline">Resolve</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Photography Calendar Component */}
        <Card>
          <CardContent className="p-6">
            <PhotographyCalendar />
          </CardContent>
        </Card>

        {/* Session Form Dialog */}
        <Dialog open={showSessionForm} onOpenChange={(open) => !open && handleCancelForm()}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingSession ? 'Edit Photography Session' : 'Create New Photography Session'}
              </DialogTitle>
            </DialogHeader>
            <SessionForm
              onSave={handleSaveSession}
              onCancel={handleCancelForm}
              initialData={editingSession}
              isEditing={!!editingSession}
            />
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default PhotographyCalendarPage;
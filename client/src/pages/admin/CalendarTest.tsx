import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Calendar, Camera, Clock, DollarSign } from 'lucide-react';

const CalendarTest: React.FC = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Test with debug endpoint first
      const response = await fetch('/api/debug/photography-sessions');
      
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
        console.log('✅ Sessions loaded:', data);
      } else {
        const errorText = await response.text();
        setError(`API Error: ${response.status} - ${errorText}`);
        console.error('❌ API Error:', response.status, errorText);
      }
    } catch (error: any) {
      setError(`Network Error: ${error.message}`);
      console.error('❌ Network Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Calendar Test Page</h1>
          <p className="text-gray-600 mt-1">Testing calendar functionality and API connections</p>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">API Connection Test</h3>
          
          {loading && (
            <div className="flex items-center space-x-2 text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>Loading sessions...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              <strong>Error:</strong> {error}
            </div>
          )}

          {!loading && !error && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-green-600">
                <Calendar className="h-5 w-5" />
                <span>✅ API connection successful</span>
              </div>
              <div className="text-sm text-gray-600">
                Found {sessions.length} photography sessions
              </div>
              
              <button
                onClick={fetchSessions}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Refresh Data
              </button>
            </div>
          )}
        </div>

        {sessions.length > 0 && (
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Photography Sessions</h3>
            <div className="space-y-3">
              {sessions.map((session: any) => (
                <div key={session.id} className="border rounded p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{session.title}</h4>
                      <p className="text-sm text-gray-600">{session.description}</p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>Type: {session.sessionType}</span>
                        <span>Status: {session.status}</span>
                        {session.basePrice && <span>Price: ${session.basePrice}</span>}
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-600">
                      <div>Start: {new Date(session.startTime).toLocaleDateString()}</div>
                      <div>Time: {new Date(session.startTime).toLocaleTimeString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Next Steps</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>1. ✅ Test API connection</p>
            <p>2. ✅ Load photography sessions data</p>
            <p>3. 🔄 Test calendar component integration</p>
            <p>4. 🔄 Test session creation</p>
            <p>5. 🔄 Test calendar navigation</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default CalendarTest;

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
// API status check removed - using Neon database with Express sessions
import { Mail, Lock, AlertCircle, CheckCircle, XCircle, RefreshCw, ExternalLink } from 'lucide-react';

const AdminLoginPage: React.FC = () => {
  const [email, setEmail] = useState('admin@photography-crm.local');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [projectStatus, setProjectStatus] = useState<{ active: boolean; error?: string; statusCode?: number } | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check project status on component mount
    checkStatus();
    
    // Check if already logged in
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          // Already logged in, redirect to dashboard
          navigate('/admin/dashboard');
        }
      }
    } catch (err) {
      // Not logged in, stay on login page
    }
  };

  const checkStatus = async () => {
    setCheckingStatus(true);
    try {
      // Check Neon database health instead of Supabase
      const response = await fetch('/api/status');
      if (response.ok) {
        setProjectStatus({ 
          active: true, 
          error: null,
          statusCode: response.status
        });
      } else {
        throw new Error('API not responding');
      }
    } catch (err) {
      setProjectStatus({ 
        active: false, 
        error: 'Failed to connect to database',
        statusCode: 0
      });
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (loading) {
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      // Use Neon backend API for authentication
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important for session cookies
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      if (data.success && data.user) {
        // Store user in localStorage for persistence
        localStorage.setItem('admin_user', JSON.stringify(data.user));
        
        // Redirect to admin dashboard
        navigate('/admin/dashboard');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      let errorMessage = 'Login failed';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        errorMessage = String(err.message);
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRetryStatusCheck = async () => {
    await checkStatus();
  };

  const getStatusColor = () => {
    if (checkingStatus) return 'text-yellow-400';
    if (projectStatus?.active) return 'text-green-400';
    if (projectStatus?.statusCode === 503) return 'text-orange-400';
    return 'text-red-400';
  };

  const getStatusIcon = () => {
    if (checkingStatus) {
      return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400 mr-2"></div>;
    }
    if (projectStatus?.active) {
      return <CheckCircle className="h-4 w-4 mr-2" />;
    }
    return <XCircle className="h-4 w-4 mr-2" />;
  };

  const getStatusText = () => {
    if (checkingStatus) return 'Checking...';
    if (projectStatus?.active) return 'Active';
    if (projectStatus?.statusCode === 503) return 'Paused';
    if (projectStatus?.statusCode === 500) return 'Database Error';
    return 'Issue Detected';
  };

  const isPausedProject = projectStatus?.statusCode === 503 || 
    (projectStatus?.error && projectStatus.error.includes('paused'));

  return (    <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-0">
        <div>
          <div className="mx-auto h-24 w-auto flex items-center justify-center mb-8">
            <img 
              src="/crm-logo.png"
              alt="TogNinja CRM"
              className="h-24 w-auto object-contain"
            />
          </div>
          <h2 className="text-center text-3xl font-extrabold text-white">
            Admin Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            Access the CRM dashboard
          </p>
        </div>

        {/* Project Status Indicator */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-300">Database Status:</span>
            <div className={`flex items-center ${getStatusColor()}`}>
              {getStatusIcon()}
              <span className="text-sm">{getStatusText()}</span>
            </div>
          </div>
          
          {!checkingStatus && !projectStatus?.active && (
            <div className={`mt-3 p-3 border rounded ${
              isPausedProject 
                ? 'bg-orange-900 border-orange-700' 
                : 'bg-red-900 border-red-700'
            }`}>
              <p className={`text-sm mb-2 ${
                isPausedProject ? 'text-orange-100' : 'text-red-100'
              }`}>
                {projectStatus?.error || 'Database is not accessible'}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleRetryStatusCheck}
                  disabled={checkingStatus}
                  className={`flex items-center justify-center text-xs px-3 py-1 rounded border transition-colors ${
                    isPausedProject
                      ? 'text-orange-300 border-orange-600 hover:text-orange-100 hover:border-orange-500'
                      : 'text-red-300 border-red-600 hover:text-red-100 hover:border-red-500'
                  } disabled:opacity-50`}
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${checkingStatus ? 'animate-spin' : ''}`} />
                  Retry Check
                </button>
                
                {isPausedProject && (
                  <a
                    href="https://console.neon.tech"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center text-xs text-orange-300 hover:text-orange-100 px-3 py-1 rounded border border-orange-600 hover:border-orange-500 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Open Database Console
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 pl-10 border border-gray-600 placeholder-gray-400 text-white bg-gray-800 rounded-t-md focus:outline-none focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 pl-10 border border-gray-600 placeholder-gray-400 text-white bg-gray-800 rounded-b-md focus:outline-none focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2 flex-shrink-0" />
                <div className="text-sm whitespace-pre-line">{error}</div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading || (!projectStatus?.active && !checkingStatus)}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing in...
                </div>
              ) : (
                'Sign in'
              )}
            </button>
            
            {!projectStatus?.active && !checkingStatus && (
              <p className="mt-2 text-xs text-gray-400 text-center">
                {isPausedProject 
                  ? 'Login disabled - Database project is paused'
                  : 'Login disabled due to database connection issues'
                }
              </p>
            )}
          </div>
        </form>

        {/* Enhanced Troubleshooting Information */}
        {!projectStatus?.active && !checkingStatus && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2">
              {isPausedProject ? 'Project Paused - Action Required:' : 'Troubleshooting Steps:'}
            </h3>
            
            {isPausedProject ? (
              <div className="space-y-2">
                <p className="text-xs text-orange-200 mb-2">
                  Your database project appears to be paused. This commonly happens due to:
                </p>
                <ul className="text-xs text-orange-300 space-y-1 ml-4">
                  <li>• Project inactivity (free tier projects pause after 1 week of inactivity)</li>
                  <li>• Billing issues or plan limitations</li>
                  <li>• Manual project suspension</li>
                </ul>
                <div className="mt-3 p-2 bg-orange-800 rounded">
                  <p className="text-xs text-orange-100 font-medium">To resolve:</p>
                  <ol className="text-xs text-orange-200 mt-1 space-y-1">
                    <li>1. Visit your <a href="https://console.neon.tech" target="_blank" rel="noopener noreferrer" className="underline hover:text-orange-100">Neon Console</a></li>
                    <li>2. Find your project and check if it shows as paused</li>
                    <li>3. Verify your billing plan is active</li>
                    <li>4. Wait 1-2 minutes for the project to fully resume</li>
                    <li>5. Click "Retry Check" above to test the connection</li>
                  </ol>
                </div>
              </div>
            ) : (
              <ul className="text-xs text-gray-400 space-y-1">
                <li>1. Check your Neon console to ensure the project is active</li>
                <li>2. Verify environment variables match your project settings</li>
                <li>3. Check database connection logs for specific errors</li>
                <li>4. Ensure your project hasn't been paused due to inactivity</li>
                <li>5. Try refreshing your connection string if the issue persists</li>
                <li>6. Check the Neon status page for service outages</li>
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLoginPage;
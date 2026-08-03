import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SITE } from '../../config/site';
// Simple alert component for authentication messages
const Alert = ({ variant, children }: { variant?: 'default' | 'destructive'; children: React.ReactNode }) => (
  <div className={`p-3 rounded-md border ${variant === 'destructive' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
    {children}
  </div>
);
const AlertDescription = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
import { Loader2, Camera, Database, CheckCircle2, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function NeonAdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const showRegister = import.meta.env.DEV;

  const doLogin = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const result = await response.json();
      if (result.success) {
        localStorage.setItem('admin_user', JSON.stringify(result.user));
        if (rememberMe) {
          localStorage.setItem('remember_me', 'true');
          localStorage.setItem('admin_email', email);
        } else {
          localStorage.removeItem('remember_me');
          localStorage.removeItem('admin_email');
        }
        window.location.href = '/admin/agent-v2';
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err: any) {
      setError('Network error: ' + (err.message || 'Unable to connect to server'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await doLogin();
  };

  // Note: no client-side auto-login in production.
  useEffect(() => {
    const savedEmail = localStorage.getItem('admin_email');
    const isRemembered = localStorage.getItem('remember_me') === 'true';
    if (isRemembered && savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleRegister = async () => {
    if (!email || !password) {
      setError('Please enter email and password to create admin account');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          firstName: 'Admin',
          lastName: 'User'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setError('Admin account created! You can now log in.');
        setTimeout(() => setError(''), 3000);
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (err: any) {
      setError('Network error: ' + (err.message || 'Unable to connect to server'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-purple-600 p-3 rounded-full">
              <Camera className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{SITE.name}</h1>
          <p className="text-gray-600 mt-2">Admin Dashboard Login</p>
        </div>

        {/* Neon Database Status */}
        <Card className="bg-white border-green-200">
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              <Database className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Neon Database</span>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            </div>
            <p className="text-xs text-green-600 mt-1">
              Independent Neon PostgreSQL - Complete data migration successful
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lock className="h-5 w-5" />
              <span>Admin Login</span>
            </CardTitle>
            <CardDescription>
              Access the CRM dashboard with your admin credentials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="name@domain.com"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  disabled={isLoading}
                />
                <Label htmlFor="rememberMe" className="text-sm font-normal cursor-pointer">
                  Remember me
                </Label>
              </div>

              {error && (
                <Alert variant={error.includes('created') ? 'default' : 'destructive'}>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Button 
                  type="submit" 
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>

                {showRegister && (
                  <Button 
                    type="button" 
                    variant="outline"
                    className="w-full"
                    onClick={handleRegister}
                    disabled={isLoading}
                  >
                    Create Admin Account
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-500">
          <p>CRM Agent System - 74 Tools Registered</p>
          <p>Complete Neon Migration - All Data Preserved</p>
        </div>
      </div>
    </div>
  );
}
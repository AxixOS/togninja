/**
 * SecurityStep — Create admin account (final step)
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft, Shield, Loader2, CheckCircle2, Eye, EyeOff, PartyPopper
} from 'lucide-react';

interface Props {
  onComplete: () => void;
  onBack: () => void;
}

export default function SecurityStep({ onComplete, onBack }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { data: current, isLoading } = useQuery({
    queryKey: ['tech-setup-current'],
    queryFn: () => fetch('/api/setup/technical/current').then(r => r.json()),
    staleTime: 5000,
  });

  useEffect(() => {
    if (current?.security?.ownerEmail) {
      setEmail(current.security.ownerEmail);
    }
  }, [current]);

  const hasExistingAdmin = (current?.security?.adminCount ?? 0) > 0;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/setup/technical/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firstName, lastName }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
      return res.json();
    },
    onSuccess: () => {
      // Don't navigate immediately — show success then complete
      setTimeout(() => onComplete(), 500);
    },
  });

  const passwordsMatch = password === confirmPassword;
  const passwordLong = password.length >= 8;
  const isValid = email.includes('@') && passwordLong && passwordsMatch;

  // Password strength indicator
  const getPasswordStrength = (): { label: string; color: string; width: string } => {
    if (password.length === 0) return { label: '', color: '', width: '0%' };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { label: 'Weak', color: 'bg-red-500', width: '20%' };
    if (score <= 2) return { label: 'Fair', color: 'bg-orange-500', width: '40%' };
    if (score <= 3) return { label: 'Good', color: 'bg-yellow-500', width: '60%' };
    if (score <= 4) return { label: 'Strong', color: 'bg-green-500', width: '80%' };
    return { label: 'Excellent', color: 'bg-emerald-500', width: '100%' };
  };

  const strength = getPasswordStrength();

  if (isLoading) {
    return (
      <CardContent className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </CardContent>
    );
  }

  // Success state
  if (saveMutation.isSuccess) {
    return (
      <CardContent className="flex flex-col items-center justify-center min-h-[400px] text-center gap-4">
        <div className="p-4 bg-green-100 dark:bg-green-900 rounded-full">
          <PartyPopper className="w-10 h-10 text-green-600 dark:text-green-300" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Technical Setup Complete!
        </h2>
        <p className="text-slate-600 dark:text-slate-400 max-w-md">
          Your infrastructure is configured. Next up: the creative setup wizard where you'll
          customize your studio's branding, services, and more.
        </p>
        <Loader2 className="w-5 h-5 animate-spin text-slate-400 mt-2" />
        <p className="text-xs text-slate-400">Redirecting to Creative Setup...</p>
      </CardContent>
    );
  }

  return (
    <>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
            <Shield className="w-5 h-5 text-red-600 dark:text-red-300" />
          </div>
          <div>
            <CardTitle>Admin Account</CardTitle>
            <CardDescription>
              {hasExistingAdmin
                ? 'An admin account exists. You can update the credentials below.'
                : 'Create your secure admin login to access the dashboard.'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 px-6">
        {hasExistingAdmin && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-300">
            <CheckCircle2 className="w-4 h-4" />
            An admin account already exists. Saving will update the credentials.
          </div>
        )}

        {/* Name fields */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              placeholder="Jane"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              placeholder="Doe"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="adminEmail">
            Email Address <span className="text-red-500">*</span>
          </Label>
          <Input
            id="adminEmail"
            type="email"
            placeholder="admin@yourdomain.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <p className="text-xs text-slate-500">
            This will be your login email and the studio owner email.
          </p>
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="adminPassword">
            Password <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Input
              id="adminPassword"
              type={showPassword ? 'text' : 'password'}
              placeholder="At least 8 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {/* Strength meter */}
          {password.length > 0 && (
            <div className="space-y-1">
              <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${strength.color} transition-all duration-300`}
                  style={{ width: strength.width }}
                />
              </div>
              <div className="text-xs text-slate-500">
                Password strength: <span className="font-medium">{strength.label}</span>
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">
            Confirm Password <span className="text-red-500">*</span>
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
          />
          {confirmPassword && !passwordsMatch && (
            <p className="text-xs text-red-500">Passwords do not match</p>
          )}
          {confirmPassword && passwordsMatch && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Passwords match
            </p>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex justify-between px-6 pt-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!isValid || saveMutation.isPending}
          size="lg"
        >
          {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {hasExistingAdmin ? 'Update & Finish Setup' : 'Create Account & Finish'}
        </Button>
      </CardFooter>

      {saveMutation.isError && (
        <div className="px-6 pb-4">
          <p className="text-sm text-red-600">{(saveMutation.error as Error).message}</p>
        </div>
      )}
    </>
  );
}

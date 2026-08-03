/**
 * My Subscription Page
 * Allows users to view and manage their storage subscription
 */

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { formatAppDateLong } from '../lib/dateFormat';
import {
  CreditCard,
  Package,
  TrendingUp,
  Calendar,
  HardDrive,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Subscription {
  id: number;
  userId: string;
  tier: 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'canceled' | 'past_due' | 'incomplete';
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  storageLimit: number;
  currentStorageBytes: number;
  createdAt: string;
  updatedAt: string;
}

interface SubscriptionStats {
  hasSubscription: boolean;
  subscription?: Subscription;
  usage?: {
    currentStorageBytes: number;
    storageLimit: number;
    fileCount: number;
    percentUsed: number;
    remainingBytes: number;
  };
  files?: any[];
}

const PLAN_DETAILS = {
  starter: {
    name: 'Starter',
    price: '€9.99',
    priceValue: 9.99,
    storage: '50GB',
    storageBytes: 53687091200,
    clients: 100,
    features: [
      '50GB of storage',
      'Up to 100 clients',
      'Basic file management',
      'Email support',
    ],
    color: 'blue',
  },
  professional: {
    name: 'Professional',
    price: '€19.99',
    priceValue: 19.99,
    storage: '200GB',
    storageBytes: 214748364800,
    clients: 500,
    features: [
      '200GB of storage',
      'Up to 500 clients',
      'Advanced file management',
      'Priority email support',
      'Gallery transfer feature',
    ],
    color: 'purple',
  },
  enterprise: {
    name: 'Enterprise',
    price: '€39.99',
    priceValue: 39.99,
    storage: '1TB',
    storageBytes: 1099511627776,
    clients: null,
    features: [
      '1TB of storage',
      'Unlimited clients',
      'Premium file management',
      'Priority support',
      'Gallery transfer feature',
      'Custom integrations',
    ],
    color: 'orange',
  },
};

function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatDate(dateString: string): string {
  return formatAppDateLong(dateString);
}

export default function MySubscriptionPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showCancelDialog, setShowCancelDialog] = React.useState(false);

  // Fetch subscription data
  const { data: stats, isLoading } = useQuery<SubscriptionStats>({
    queryKey: ['subscription-stats'],
    queryFn: async () => {
      const res = await fetch('/api/storage-stats/dashboard', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch subscription');
      return res.json();
    },
  });

  // Open Stripe Customer Portal
  const { mutate: openBillingPortal, isPending: isOpeningPortal } = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/storage/create-portal-session', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to create portal session');
      return res.json();
    },
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });

  // Cancel subscription
  const { mutate: cancelSubscription, isPending: isCanceling } = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/storage/cancel-subscription', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to cancel subscription');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-stats'] });
      setShowCancelDialog(false);
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        </div>
      </div>
    );
  }

  if (!stats?.hasSubscription) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>No Active Subscription</CardTitle>
              <CardDescription>
                You don't have an active storage subscription yet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Subscribe to a plan to start uploading and managing your files in the archive.
              </p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => navigate('/storage-plans')}>
                View Plans
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  const subscription = stats.subscription!;
  const usage = stats.usage!;
  const currentPlan = PLAN_DETAILS[subscription.tier];

  // Status badge styling
  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string; icon: any }> = {
      active: { variant: 'default', label: 'Active', icon: CheckCircle },
      canceled: { variant: 'secondary', label: 'Canceled', icon: XCircle },
      past_due: { variant: 'destructive', label: 'Past Due', icon: AlertCircle },
      incomplete: { variant: 'destructive', label: 'Incomplete', icon: AlertCircle },
    };
    const config = variants[status] || variants.active;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">My Subscription</h1>
          <p className="text-gray-600 mt-1">
            Manage your storage plan and billing
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Current Plan & Usage */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Plan Card */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Current Plan
                    </CardTitle>
                    <CardDescription>
                      Your active subscription details
                    </CardDescription>
                  </div>
                  {getStatusBadge(subscription.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Plan Info */}
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <h3 className="text-2xl font-bold">{currentPlan.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {currentPlan.storage} storage • {currentPlan.clients ? `${currentPlan.clients} clients` : 'Unlimited clients'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-primary">{currentPlan.price}</p>
                    <p className="text-sm text-muted-foreground">per month</p>
                  </div>
                </div>

                {/* Billing Period */}
                <div className="flex items-center gap-4 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Current billing period</p>
                    <p className="text-muted-foreground">
                      {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
                    </p>
                  </div>
                </div>

                {subscription.cancelAtPeriodEnd && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <p className="text-sm text-orange-800">
                      ⚠️ Your subscription will be canceled on {formatDate(subscription.currentPeriodEnd)}
                    </p>
                  </div>
                )}

                {/* Plan Features */}
                <div>
                  <p className="font-medium mb-3">Plan features</p>
                  <ul className="space-y-2">
                    {currentPlan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Storage Usage Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="w-5 h-5" />
                  Storage Usage
                </CardTitle>
                <CardDescription>
                  Your current storage consumption
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-3xl font-bold">
                      {formatBytes(usage.currentStorageBytes)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      of {formatBytes(usage.storageLimit)} used
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-muted-foreground">
                      {usage.percentUsed.toFixed(1)}%
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {usage.fileCount} files
                    </p>
                  </div>
                </div>

                <Progress 
                  value={usage.percentUsed > 100 ? 100 : usage.percentUsed}
                  className={`h-3 ${
                    usage.percentUsed >= 90 ? '[&>div]:bg-red-500' : 
                    usage.percentUsed >= 75 ? '[&>div]:bg-yellow-500' : 
                    '[&>div]:bg-blue-500'
                  }`}
                />

                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{formatBytes(usage.remainingBytes)} remaining</span>
                  {usage.percentUsed >= 90 && (
                    <span className="text-red-600 font-medium">
                      Running low on storage
                    </span>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" onClick={() => navigate('/my-archive')}>
                  <HardDrive className="w-4 h-4 mr-2" />
                  Manage Files
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Right Column - Actions & Upgrade */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => openBillingPortal()}
                  disabled={isOpeningPortal}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Manage Billing
                  <ExternalLink className="w-3 h-3 ml-auto" />
                </Button>

                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => navigate('/storage-plans')}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  View All Plans
                </Button>

                <Separator />

                <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      className="w-full justify-start" 
                      variant="ghost"
                      disabled={subscription.cancelAtPeriodEnd}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancel Subscription
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Cancel Subscription?</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to cancel your subscription? You'll lose access to your storage at the end of the current billing period.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
                        Keep Subscription
                      </Button>
                      <Button 
                        variant="destructive" 
                        onClick={() => cancelSubscription()}
                        disabled={isCanceling}
                      >
                        {isCanceling ? 'Canceling...' : 'Yes, Cancel'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            {/* Upgrade Options */}
            {subscription.tier !== 'enterprise' && (
              <Card className="border-2 border-primary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowUpCircle className="w-5 h-5" />
                    Upgrade Available
                  </CardTitle>
                  <CardDescription>
                    Get more storage and features
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {subscription.tier === 'starter' && (
                    <div className="space-y-3">
                      <div className="p-3 bg-muted rounded-lg">
                        <h4 className="font-semibold mb-1">Professional Plan</h4>
                        <p className="text-2xl font-bold text-primary mb-2">{PLAN_DETAILS.professional.price}/mo</p>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          <li>✓ 200GB storage (4x more)</li>
                          <li>✓ 500 clients</li>
                          <li>✓ Gallery transfer</li>
                        </ul>
                      </div>
                      <Button className="w-full" onClick={() => navigate('/storage-plans')}>
                        Upgrade Now
                      </Button>
                    </div>
                  )}
                  {subscription.tier === 'professional' && (
                    <div className="space-y-3">
                      <div className="p-3 bg-muted rounded-lg">
                        <h4 className="font-semibold mb-1">Enterprise Plan</h4>
                        <p className="text-2xl font-bold text-primary mb-2">{PLAN_DETAILS.enterprise.price}/mo</p>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          <li>✓ 1TB storage (5x more)</li>
                          <li>✓ Unlimited clients</li>
                          <li>✓ Custom integrations</li>
                        </ul>
                      </div>
                      <Button className="w-full" onClick={() => navigate('/storage-plans')}>
                        Upgrade Now
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Setup Wizard - Phase 2: Integrations
 * 
 * Connect external services:
 * - Instagram (for social proof & content)
 * - Google (for reviews, calendar, analytics)
 * - Calendar (booking sync)
 * - Stripe (payment processing)
 */

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowRight, Check, ExternalLink, Link2, Instagram, Calendar, CreditCard, Globe } from 'lucide-react';

interface IntegrationsPhaseProps {
  status?: {
    complete: boolean;
    instagram: boolean;
    stripe: boolean;
  };
  features?: Record<string, boolean>;
  onComplete: () => void;
}

interface IntegrationItem {
  id: string;
  name: string;
  description: string;
  icon: any;
  connected: boolean;
  connectUrl?: string;
  required: boolean;
  featureFlag?: string;
}

export default function IntegrationsPhase({ status, features, onComplete }: IntegrationsPhaseProps) {
  const [connecting, setConnecting] = useState<string | null>(null);
  
  // Fetch current integration status
  const { data: integrations, isLoading, refetch } = useQuery({
    queryKey: ['setup-integrations'],
    queryFn: async () => {
      const res = await fetch('/api/setup/integrations');
      if (!res.ok) throw new Error('Failed to fetch integrations');
      return res.json();
    }
  });
  
  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/setup/integrations/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('Failed to complete integrations');
      return res.json();
    },
    onSuccess: () => {
      onComplete();
    }
  });
  
  const integrationItems: IntegrationItem[] = [
    {
      id: 'instagram',
      name: 'Instagram',
      description: 'Import your best photos and show social proof',
      icon: Instagram,
      connected: integrations?.instagram?.connected || false,
      connectUrl: '/api/auth/instagram',
      required: false,
      featureFlag: 'socialProof'
    },
    {
      id: 'google',
      name: 'Google',
      description: 'Sync Google Reviews and connect Analytics',
      icon: Globe,
      connected: integrations?.google?.connected || false,
      connectUrl: '/api/auth/google',
      required: false
    },
    {
      id: 'calendar',
      name: 'Calendar',
      description: 'Sync bookings with your calendar',
      icon: Calendar,
      connected: integrations?.calendar?.connected || false,
      connectUrl: '/settings/calendar',
      required: false
    },
    {
      id: 'stripe',
      name: 'Stripe',
      description: 'Accept payments and manage subscriptions',
      icon: CreditCard,
      connected: integrations?.stripe?.connected || false,
      connectUrl: '/settings/payments',
      required: true
    }
  ];
  
  const handleConnect = (integration: IntegrationItem) => {
    if (!integration.connectUrl) return;
    
    setConnecting(integration.id);
    
    // For OAuth flows, open in new window
    if (integration.connectUrl.startsWith('/api/auth/')) {
      const popup = window.open(
        integration.connectUrl,
        'Connect ' + integration.name,
        'width=600,height=700'
      );
      
      // Poll for completion
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          setConnecting(null);
          refetch();
        }
      }, 500);
    } else {
      // For internal pages, just navigate
      window.location.href = integration.connectUrl;
    }
  };
  
  const connectedCount = integrationItems.filter(i => i.connected).length;
  const requiredMet = integrationItems
    .filter(i => i.required)
    .every(i => i.connected);
  
  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
        <p className="mt-4 text-gray-600">Loading integrations...</p>
      </div>
    );
  }
  
  return (
    <>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
            <Link2 className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <CardTitle className="text-2xl">Connect your tools</CardTitle>
            <CardDescription>
              Integrate with the services you already use
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl mb-6">
          <div>
            <p className="font-medium text-blue-900">
              {connectedCount} of {integrationItems.length} integrations connected
            </p>
            <p className="text-sm text-blue-700">
              You can always add more integrations later
            </p>
          </div>
          <Badge variant="secondary" className="bg-blue-100">
            {connectedCount}/{integrationItems.length}
          </Badge>
        </div>
        
        <div className="space-y-3">
          {integrationItems.map(integration => {
            const Icon = integration.icon;
            const isFeatureEnabled = !integration.featureFlag || features?.[integration.featureFlag];
            
            return (
              <div
                key={integration.id}
                className={`
                  flex items-center justify-between p-4 rounded-xl border
                  ${integration.connected 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-white hover:bg-gray-50'
                  }
                  ${!isFeatureEnabled ? 'opacity-50' : ''}
                `}
              >
                <div className="flex items-center gap-4">
                  <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center
                    ${integration.connected ? 'bg-green-200' : 'bg-gray-100'}
                  `}>
                    <Icon className={`w-6 h-6 ${integration.connected ? 'text-green-700' : 'text-gray-600'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{integration.name}</h3>
                      {integration.required && (
                        <Badge variant="outline" className="text-xs">Required</Badge>
                      )}
                      {!isFeatureEnabled && (
                        <Badge variant="secondary" className="text-xs">Pro Feature</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{integration.description}</p>
                    {integration.connected && integrations?.[integration.id]?.email && (
                      <p className="text-xs text-green-600 mt-1">
                        Connected as {integrations[integration.id].email}
                      </p>
                    )}
                  </div>
                </div>
                
                <div>
                  {integration.connected ? (
                    <div className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-600" />
                      <span className="text-green-600 font-medium">Connected</span>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => handleConnect(integration)}
                      disabled={connecting === integration.id || !isFeatureEnabled}
                      className="gap-2"
                    >
                      {connecting === integration.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          Connect
                          <ExternalLink className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between pt-6 border-t">
        <div>
          {!requiredMet && (
            <p className="text-sm text-amber-600">
              ⚠️ Please connect required integrations before continuing
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={() => completeMutation.mutate()}
            disabled={completeMutation.isPending}
          >
            Skip for now
          </Button>
          <Button 
            onClick={() => completeMutation.mutate()}
            disabled={completeMutation.isPending || !requiredMet}
            className="gap-2"
          >
            {completeMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </CardFooter>
    </>
  );
}

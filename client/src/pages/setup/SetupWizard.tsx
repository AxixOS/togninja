/**
 * Setup Wizard - Main Container Component
 * 
 * 5-Phase onboarding wizard for new TogNinja installations:
 * 1. Basics - Business info, branding, timezone
 * 2. Integrations - Connect Instagram, Google, Calendar, Payments
 * 3. Scanning - IA scan of existing content
 * 4. Fix First - Quick wins to fix critical issues
 * 5. Drafts - Review and publish auto-generated content
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  Circle, 
  ArrowRight, 
  Building2, 
  Link2, 
  Scan, 
  Wrench, 
  FileEdit,
  Loader2,
  Sparkles
} from 'lucide-react';

import BasicsPhase from './phases/BasicsPhase';
import IntegrationsPhase from './phases/IntegrationsPhase';
import ScanningPhase from './phases/ScanningPhase';
import FixFirstPhase from './phases/FixFirstPhase';
import DraftsPhase from './phases/DraftsPhase';

type SetupPhase = 'basics' | 'integrations' | 'scanning' | 'fix_first' | 'drafts' | 'complete';

interface SetupStatus {
  currentStep: SetupPhase;
  progressPct: number;
  phases: {
    basics: { complete: boolean; data: any };
    integrations: { complete: boolean; instagram: boolean; stripe: boolean };
    scanning: { complete: boolean; pagesScanned: number };
    fixFirst: { complete: boolean; itemsTotal: number; itemsCompleted: number };
    drafts: { complete: boolean; draftsGenerated: number; draftsPublished: number };
  };
  setupMode: boolean;
  features: Record<string, boolean>;
}

const PHASES: { key: SetupPhase; label: string; icon: any; description: string }[] = [
  { 
    key: 'basics', 
    label: 'Basics', 
    icon: Building2,
    description: 'Business info & branding'
  },
  { 
    key: 'integrations', 
    label: 'Integrations', 
    icon: Link2,
    description: 'Connect your tools'
  },
  { 
    key: 'scanning', 
    label: 'Scanning', 
    icon: Scan,
    description: 'Analyze your content'
  },
  { 
    key: 'fix_first', 
    label: 'Fix First', 
    icon: Wrench,
    description: 'Quick wins'
  },
  { 
    key: 'drafts', 
    label: 'Drafts', 
    icon: FileEdit,
    description: 'Review & publish'
  }
];

export default function SetupWizard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activePhase, setActivePhase] = useState<SetupPhase>('basics');
  
  // Fetch setup status
  const { data: status, isLoading, error } = useQuery<SetupStatus>({
    queryKey: ['setup-status'],
    queryFn: async () => {
      const res = await fetch('/api/setup/status');
      if (!res.ok) throw new Error('Failed to fetch setup status');
      return res.json();
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });
  
  // Complete setup mutation
  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/setup/complete', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to complete setup');
      return res.json();
    },
    onSuccess: (data) => {
      navigate(data.redirectTo || '/dashboard');
    }
  });
  
  // Set active phase based on status
  useEffect(() => {
    if (status?.currentStep) {
      setActivePhase(status.currentStep);
    }
  }, [status?.currentStep]);
  
  const handlePhaseComplete = (nextPhase: SetupPhase) => {
    queryClient.invalidateQueries({ queryKey: ['setup-status'] });
    setActivePhase(nextPhase);
  };
  
  const handleFinish = () => {
    completeMutation.mutate();
  };
  
  const isPhaseComplete = (phase: SetupPhase): boolean => {
    if (!status?.phases) return false;
    const phaseKey = phase.replace('_', '') as keyof typeof status.phases;
    return status.phases[phaseKey]?.complete || false;
  };
  
  const isPhaseAccessible = (phase: SetupPhase): boolean => {
    const phaseIndex = PHASES.findIndex(p => p.key === phase);
    const currentIndex = PHASES.findIndex(p => p.key === activePhase);
    
    // Can access current, completed, or next phase
    return phaseIndex <= currentIndex + 1;
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading setup wizard...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Setup Error</CardTitle>
            <CardDescription>
              There was a problem loading the setup wizard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">TogNinja Setup</h1>
                <p className="text-sm text-gray-500">Let's get your studio ready</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {status?.progressPct || 0}% Complete
                </p>
                <Progress 
                  value={status?.progressPct || 0} 
                  className="w-32 h-2"
                />
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-8">
          {/* Sidebar - Phase Navigation */}
          <aside className="col-span-3">
            <nav className="space-y-2 sticky top-24">
              {PHASES.map((phase, index) => {
                const isActive = activePhase === phase.key;
                const isComplete = isPhaseComplete(phase.key);
                const isAccessible = isPhaseAccessible(phase.key);
                const Icon = phase.icon;
                
                return (
                  <button
                    key={phase.key}
                    onClick={() => isAccessible && setActivePhase(phase.key)}
                    disabled={!isAccessible}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left
                      transition-all duration-200
                      ${isActive 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                        : isComplete
                          ? 'bg-green-50 text-green-700 hover:bg-green-100'
                          : isAccessible
                            ? 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
                            : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                      }
                    `}
                  >
                    <div className={`
                      w-8 h-8 rounded-lg flex items-center justify-center
                      ${isActive 
                        ? 'bg-white/20' 
                        : isComplete 
                          ? 'bg-green-200' 
                          : 'bg-gray-100'
                      }
                    `}>
                      {isComplete && !isActive ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{phase.label}</p>
                      <p className={`text-xs truncate ${isActive ? 'text-blue-100' : 'text-gray-500'}`}>
                        {phase.description}
                      </p>
                    </div>
                    {isComplete && (
                      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                        Done
                      </Badge>
                    )}
                  </button>
                );
              })}
            </nav>
          </aside>
          
          {/* Main Content */}
          <main className="col-span-9">
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              {activePhase === 'basics' && (
                <BasicsPhase 
                  initialData={status?.phases.basics.data}
                  onComplete={() => handlePhaseComplete('integrations')}
                />
              )}
              
              {activePhase === 'integrations' && (
                <IntegrationsPhase 
                  status={status?.phases.integrations}
                  features={status?.features}
                  onComplete={() => handlePhaseComplete('scanning')}
                />
              )}
              
              {activePhase === 'scanning' && (
                <ScanningPhase 
                  onComplete={() => handlePhaseComplete('fix_first')}
                />
              )}
              
              {activePhase === 'fix_first' && (
                <FixFirstPhase 
                  onComplete={() => handlePhaseComplete('drafts')}
                />
              )}
              
              {activePhase === 'drafts' && (
                <DraftsPhase 
                  onComplete={handleFinish}
                />
              )}
            </Card>
          </main>
        </div>
      </div>
    </div>
  );
}

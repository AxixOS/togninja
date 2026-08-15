/**
 * TechnicalSetupWizard — Stage 1 of Onboarding
 *
 * Guides the user through configuring infrastructure and credentials
 * before the creative/branding setup wizard (Stage 2) runs.
 *
 * Steps:
 *  1. Welcome       — overview of what's required
 *  2. Domain & URLs — app URL, frontend URL, public site base URL
 *  3. Email / SMTP  — SMTP, IMAP, Brevo
 *  4. Stripe        — publishable key, secret key, webhook secret
 *  5. File Storage   — Backblaze / S3 / R2
 *  6. Extras        — AI keys, Google OAuth, analytics, SMS
 *  7. Security      — admin account creation
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  Globe, Mail, CreditCard, HardDrive, Sparkles, Shield, Rocket,
  CheckCircle2, Circle, ArrowRight
} from 'lucide-react';

// Step components
import WelcomeStep from './technical/WelcomeStep';
import DomainStep from './technical/DomainStep';
import EmailStep from './technical/EmailStep';
import StripeStep from './technical/StripeStep';
import StorageStep from './technical/StorageStep';
import ExtrasStep from './technical/ExtrasStep';
import SecurityStep from './technical/SecurityStep';

type TechStep = 'welcome' | 'domain' | 'email' | 'stripe' | 'storage' | 'extras' | 'security';

interface StepDef {
  key: TechStep;
  label: string;
  icon: React.ElementType;
  required: boolean;
}

const STEPS: StepDef[] = [
  { key: 'welcome',  label: 'Welcome',       icon: Rocket,     required: false },
  { key: 'domain',   label: 'Domain & URLs',  icon: Globe,      required: true  },
  { key: 'email',    label: 'Email / SMTP',   icon: Mail,       required: true  },
  { key: 'stripe',   label: 'Payments',       icon: CreditCard, required: true  },
  { key: 'storage',  label: 'File Storage',   icon: HardDrive,  required: true  },
  // required: the OpenAI key lives here and it is what writes the studio's website.
  { key: 'extras',   label: 'AI & Extras',    icon: Sparkles,   required: true },
  { key: 'security', label: 'Admin Account',  icon: Shield,     required: true  },
];

interface TechStatus {
  technicalSetupComplete: boolean;
  steps: Record<string, boolean>;
  progress: number;
}

export default function TechnicalSetupWizard() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState<TechStep>('welcome');

  const { data: status, refetch } = useQuery<TechStatus>({
    queryKey: ['technical-setup-status'],
    queryFn: () => fetch('/api/setup/technical/status').then(r => r.json()),
    refetchInterval: 30_000,
  });

  // If technical setup is already complete, redirect to creative setup
  useEffect(() => {
    if (status?.technicalSetupComplete) {
      navigate('/setup', { replace: true });
    }
  }, [status?.technicalSetupComplete, navigate]);

  const currentIndex = STEPS.findIndex(s => s.key === activeStep);
  const progressPercent = Math.round((currentIndex / (STEPS.length - 1)) * 100);

  const handleStepComplete = (nextStep?: TechStep) => {
    refetch();
    if (nextStep) {
      setActiveStep(nextStep);
    } else {
      // Move to next step
      const next = STEPS[currentIndex + 1];
      if (next) setActiveStep(next.key);
    }
  };

  const handleFinish = async () => {
    try {
      await fetch('/api/setup/technical/complete', { method: 'POST' });
      navigate('/setup');
    } catch {
      // Redirect anyway
      navigate('/setup');
    }
  };

  const isStepComplete = (key: TechStep): boolean => {
    if (key === 'welcome') return currentIndex > 0;
    return status?.steps?.[key] ?? false;
  };

  const isStepAccessible = (index: number): boolean => {
    // Welcome is always accessible, and any step where previous required steps are done
    if (index === 0) return true;
    // Allow navigating to any step that's <= currentIndex or already complete
    return index <= currentIndex || isStepComplete(STEPS[index].key);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900">
      {/* Top progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Progress value={progressPercent} className="h-1 rounded-none" />
      </div>

      <div className="container max-w-6xl mx-auto px-4 py-8 pt-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Technical Setup
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Configure your app's infrastructure — Step {currentIndex + 1} of {STEPS.length}
          </p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar — step navigation */}
          <div className="hidden md:block w-64 flex-shrink-0">
            <Card>
              <CardContent className="p-4">
                <nav className="space-y-1">
                  {STEPS.map((step, idx) => {
                    const Icon = step.icon;
                    const complete = isStepComplete(step.key);
                    const active = step.key === activeStep;
                    const accessible = isStepAccessible(idx);

                    return (
                      <button
                        key={step.key}
                        onClick={() => accessible && setActiveStep(step.key)}
                        disabled={!accessible}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left',
                          active && 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-800',
                          !active && complete && 'text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/50',
                          !active && !complete && accessible && 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800',
                          !accessible && 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                        )}
                      >
                        {complete ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                        ) : active ? (
                          <ArrowRight className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        ) : (
                          <Circle className="w-5 h-5 flex-shrink-0 opacity-40" />
                        )}
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{step.label}</span>
                        {step.required && !complete && (
                          <span className="ml-auto text-[10px] text-orange-500 font-semibold">REQ</span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>

            {/* Progress summary */}
            <Card className="mt-4">
              <CardContent className="p-4">
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Progress</div>
                <Progress value={status?.progress ?? 0} className="h-2 mb-2" />
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {status?.progress ?? 0}% configured
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main content area */}
          <div className="flex-1 min-w-0">
            <Card className="min-h-[500px]">
              {activeStep === 'welcome' && (
                <WelcomeStep 
                  onComplete={() => handleStepComplete('domain')} 
                  status={status}
                />
              )}
              {activeStep === 'domain' && (
                <DomainStep
                  onComplete={() => handleStepComplete('email')}
                  onBack={() => setActiveStep('welcome')}
                />
              )}
              {activeStep === 'email' && (
                <EmailStep
                  onComplete={() => handleStepComplete('stripe')}
                  onBack={() => setActiveStep('domain')}
                />
              )}
              {activeStep === 'stripe' && (
                <StripeStep
                  onComplete={() => handleStepComplete('storage')}
                  onBack={() => setActiveStep('email')}
                />
              )}
              {activeStep === 'storage' && (
                <StorageStep
                  onComplete={() => handleStepComplete('extras')}
                  onBack={() => setActiveStep('stripe')}
                />
              )}
              {activeStep === 'extras' && (
                <ExtrasStep
                  onComplete={() => handleStepComplete('security')}
                  onBack={() => setActiveStep('storage')}
                />
              )}
              {activeStep === 'security' && (
                <SecurityStep
                  onComplete={handleFinish}
                  onBack={() => setActiveStep('extras')}
                />
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

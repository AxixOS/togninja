/**
 * WelcomeStep — Overview of what's needed for technical setup
 */

import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Globe, Mail, CreditCard, HardDrive, Sparkles, Shield,
  ArrowRight, Clock, CheckCircle2
} from 'lucide-react';

interface Props {
  onComplete: () => void;
  status?: {
    steps: Record<string, boolean>;
    progress: number;
  } | null;
}

const CHECKLIST = [
  {
    icon: Globe,
    title: 'Domain & URLs',
    description: 'Your app URL and public website address',
    time: '1 min',
    required: true,
  },
  {
    icon: Mail,
    title: 'Email / SMTP',
    description: 'SMTP server details for sending emails (and optional IMAP for receiving)',
    time: '2–3 min',
    required: true,
  },
  {
    icon: CreditCard,
    title: 'Stripe Payments',
    description: 'Publishable key, secret key, and webhook secret from Stripe dashboard',
    time: '2 min',
    required: true,
  },
  {
    icon: HardDrive,
    title: 'File Storage',
    description: 'Backblaze B2 / AWS S3 / Cloudflare R2 credentials for file uploads',
    time: '2 min',
    required: true,
  },
  {
    icon: Sparkles,
    title: 'AI & Extras',
    // Was "all optional", and the OpenAI key sat inside it. That key is what reads the
    // studio's existing website and writes the new one — skip it and onboarding crawls
    // the site, generates nothing, and finishes without saying so. The single thing the
    // product promises cannot be an optional step a buyer is invited to skip.
    description: 'OpenAI key (required — this writes your website). Google, Analytics and SMS optional',
    time: '2 min',
    required: true,
  },
  {
    icon: Shield,
    title: 'Admin Account',
    description: 'Create your secure admin login',
    time: '1 min',
    required: true,
  },
];

export default function WelcomeStep({ onComplete, status }: Props) {
  return (
    <>
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl">Welcome to Technical Setup</CardTitle>
        <CardDescription className="text-base max-w-lg mx-auto">
          Let's configure the infrastructure your app needs to run. Have the following
          credentials ready — you can skip optional steps and come back later.
        </CardDescription>
      </CardHeader>

      <CardContent className="px-6 pb-2">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
          <Clock className="w-4 h-4" />
          <span>Estimated time: 10–15 minutes</span>
        </div>

        <div className="grid gap-3">
          {CHECKLIST.map((item) => {
            const Icon = item.icon;
            const done = status?.steps?.[item.title.toLowerCase().split(' ')[0]] ?? false;

            return (
              <div
                key={item.title}
                className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                  done
                    ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/30'
                    : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
                }`}
              >
                <div className={`p-2 rounded-lg ${
                  done
                    ? 'bg-green-100 dark:bg-green-900'
                    : 'bg-slate-100 dark:bg-slate-700'
                }`}>
                  {done ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <Icon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-slate-900 dark:text-white">
                      {item.title}
                    </span>
                    {item.required ? (
                      <span className="text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded font-semibold">
                        REQUIRED
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-semibold">
                        OPTIONAL
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    {item.description}
                  </p>
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap mt-1">
                  ~{item.time}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>

      <CardFooter className="flex justify-end px-6 pt-4">
        <Button onClick={onComplete} size="lg">
          Let's Get Started
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardFooter>
    </>
  );
}

import { ExternalLink, LayoutDashboard, PartyPopper, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';

/**
 * The last screen of setup, and the first moment a studio has a site.
 *
 * Finishing used to POST the two completion endpoints and navigate('/admin') — so the studio
 * went from a wizard step straight into a dashboard, having never once been shown the thing
 * they had just spent ten minutes making. The site existed and nothing offered to open it.
 *
 * Two doors, and the site goes FIRST. A photographer's reason for buying this is the website;
 * the CRM is what they use afterwards. It opens in a new tab deliberately — sending them away
 * from this screen would lose the second door, and a studio who wants both should not have to
 * navigate back.
 *
 * THE HONEST PART. Finishing setup does not mean everything works. On a fresh instance the
 * essentials path never asks for SMTP, Stripe or storage, so a studio can arrive here unable
 * to send an email, take a payment, or store a photograph — and the old dismissible banner on
 * the dashboard was the only thing that said so. What is missing is named here, once, while
 * they are still in the frame of mind for setting things up.
 *
 * Read from /api/setup/technical/status, which since v1.9.204 measures through the capability
 * layer rather than asserting. Before that it reported everything configured the moment an
 * admin existed, and this card would have congratulated a studio on a CRM that could not send
 * an invoice.
 */
const LABEL: Record<string, string> = {
  email: 'sending email to clients',
  stripe: 'taking card payments',
  storage: 'storing photographs',
  extras: 'writing your website copy',
  domain: 'your public web address',
};

export default function SetupCompleteCard() {
  const { data: tech } = useQuery<any>({
    queryKey: ['/api/setup/technical/status', 'complete-card'],
    queryFn: async () => (await fetch('/api/setup/technical/status')).json(),
    staleTime: 0,
  });

  // security is the admin account, which by definition exists by the time this renders.
  const missing = Object.entries((tech?.steps || {}) as Record<string, boolean>)
    .filter(([k, v]) => !v && k !== 'security' && LABEL[k])
    .map(([k]) => LABEL[k]);

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
            <PartyPopper className="h-5 w-5 text-emerald-700" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Your site and CRM are ready</h1>
            <p className="text-sm text-gray-500">
              Everything from here on you can change whenever you like.
            </p>
          </div>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          {/* The site first: it is the thing they came for, and the thing they have not seen. */}
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-xl border-2 border-gray-900 bg-gray-900 p-4 text-left transition-colors hover:bg-black"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-white">
              <ExternalLink className="h-4 w-4" />
              View your website
            </span>
            <span className="mt-1 block text-xs text-white/70">
              Opens in a new tab, so this page stays open.
            </span>
          </a>

          <a
            href="/admin"
            className="group rounded-xl border-2 border-gray-200 p-4 text-left transition-colors hover:border-gray-300"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <LayoutDashboard className="h-4 w-4" />
              Go to your admin area
            </span>
            <span className="mt-1 block text-xs text-gray-500">
              Bookings, clients, invoices and galleries.
            </span>
          </a>
        </div>

        {missing.length > 0 && (
          <div className="mt-7 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-amber-900">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {missing.length} thing{missing.length === 1 ? '' : 's'} still to connect
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-amber-900/90">
              Your site is live and the CRM works, but{' '}
              {missing.length === 1
                ? missing[0]
                : `${missing.slice(0, -1).join(', ')} and ${missing[missing.length - 1]}`}{' '}
              {missing.length === 1 ? 'will not work' : 'will not work'} until you add the keys for
              {missing.length === 1 ? ' it' : ' them'}.
            </p>
            <a
              href="/admin/settings/technical-setup"
              className="mt-3 inline-block text-xs font-medium text-amber-900 underline underline-offset-2"
            >
              Connect them now
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

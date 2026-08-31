import { ExternalLink, LayoutDashboard, PartyPopper, AlertTriangle } from 'lucide-react';
import { useCapabilities } from '@/hooks/useCapabilities';
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
// The LABEL map that used to live here is gone with the six-key steps object it
// translated. Capability labels are written once, in server/lib/capabilities.ts, and
// every screen that names a missing piece now uses those words.

export default function SetupCompleteCard() {
  /**
   * THE SAME SOURCE THE DASHBOARD USES, because they were answering with different numbers.
   *
   * This counted falsy entries in GET /api/setup/technical/status's `steps`, which is a fixed
   * six-key object built by measureSteps() — and only FOUR of those keys are capabilities
   * (email, stripe, storage, extras). So this card could never report more than five things,
   * and in practice looked at four of the ten in the registry. It said "3 things still to
   * connect" while the dashboard banner, reading /api/capabilities, said 6 at the same moment.
   *
   * A studio who saw both learned that the product does not know its own state. The registry
   * is the thing every refusal in the product already reads, so it is the one that answers.
   */
  const { capabilities, tasks } = useCapabilities();

  const missing = [
    ...Object.values(capabilities)
      .filter((c: any) => c.owner === 'studio' && !c.available)
      .map((c: any) => String(c.label).toLowerCase()),
    // The work that needs no credential — prices and clients — for the same reason the
    // dashboard lists it: a studio who cannot sell anything is not finished.
    ...tasks.filter((t) => !t.done).map((t) => t.label.toLowerCase()),
  ];

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

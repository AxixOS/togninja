import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, ArrowRight, Info } from 'lucide-react';
import { useCapability } from '../../hooks/useCapabilities';

/**
 * One padlock, everywhere.
 *
 * WHAT IT REPLACES. Three features each invented their own refusal in the same week, so a
 * studio met a different-looking wall depending on which page they were on. This renders the
 * same thing every time, driven by server/lib/capabilities.ts.
 *
 * WHAT IT DELIBERATELY IS NOT: a blocker. Every gate states what STILL WORKS, because almost
 * none of these actually stop the studio doing their job — no Stripe means invoices are paid
 * another way, no Google means the built-in calendar still runs. A padlock that only says
 * "configure X" turns an incomplete setup into a product that feels broken.
 */

interface Props {
  capability: string;
  children: React.ReactNode;
  /**
   * `hide` removes the feature entirely. `explain` (the default) shows what it would do and
   * why it is unavailable — better nearly always, because a studio cannot ask for a feature
   * they have never been shown, which is how print_products sat empty from the day it shipped.
   */
  mode?: 'explain' | 'hide';
}

export const CapabilityGate: React.FC<Props> = ({ capability, children, mode = 'explain' }) => {
  const { available, info, loading } = useCapability(capability);

  // Render the feature while the answer is unknown. A padlock that flashes on every
  // navigation is worse than one that appears a beat late; the server refuses authoritatively
  // either way.
  if (loading || available) return <>{children}</>;
  if (mode === 'hide') return null;

  const platformOwned = info?.owner === 'platform';

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
      <div className="flex items-start gap-3">
        <span className="rounded-lg bg-white border border-gray-200 p-2 text-gray-400">
          <Lock className="h-4 w-4" />
        </span>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900">
            {info?.label || 'Not available yet'}
          </h3>
          <p className="mt-1 text-sm text-gray-600">{info?.blockedMessage}</p>

          {info?.worksWithout && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-gray-500">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{info.worksWithout}</span>
            </p>
          )}

          {/* Only when the studio can actually act. A platform credential offers no link,
              because sending somebody to a settings page that cannot fix their problem
              wastes their time and teaches them the padlocks are noise. */}
          {!platformOwned && info?.settingsPath && (
            <Link
              to={info.settingsPath}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
            >
              Set this up <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default CapabilityGate;

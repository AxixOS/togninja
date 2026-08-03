import React, { useState, useEffect, useCallback } from 'react';
import { X, Gift } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { submitNewsletterForm } from '../lib/forms';

/**
 * Exit-intent lead capture. Offers the €50 voucher (the site's lead magnet) to a
 * visitor about to leave, so the ~95% who bounce aren't all lost.
 *
 * Triggers:
 *  - Desktop: the cursor leaves the top of the viewport (classic exit intent).
 *  - Any device: a dwell fallback (~40s) so mobile visitors, where mouseleave
 *    doesn't fire, still get one chance to see it.
 *
 * Shown at most once per week (localStorage), never on checkout/admin/success
 * routes where it would interrupt a purchase, and reuses the existing newsletter
 * endpoint (so it lands as a lead + fires the same conversion tracking).
 */
const STORAGE_KEY = 'exitIntentShownAt';
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 1 week
const DWELL_MS = 40_000;

const SUPPRESSED_PREFIXES = ['/cart', '/checkout', '/admin', '/vouchers/success', '/voucher/thank-you', '/voucher-success'];

const ExitIntentPopup: React.FC = () => {
  const { t, language } = useLanguage();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  const suppressed = SUPPRESSED_PREFIXES.some((p) => location.pathname.startsWith(p));

  const recentlyShown = () => {
    try {
      const ts = Number(localStorage.getItem(STORAGE_KEY) || 0);
      return ts > 0 && Date.now() - ts < COOLDOWN_MS;
    } catch {
      return false;
    }
  };

  const trigger = useCallback(() => {
    if (recentlyShown()) return;
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch { /* ignore */ }
    setOpen(true);
  }, []);

  useEffect(() => {
    if (suppressed || recentlyShown()) return;

    const onMouseOut = (e: MouseEvent) => {
      // Cursor left through the top edge (heading for the tab bar / close button).
      if (e.clientY <= 0 && !e.relatedTarget) trigger();
    };
    const dwell = window.setTimeout(trigger, DWELL_MS);
    document.addEventListener('mouseout', onMouseOut);
    return () => {
      document.removeEventListener('mouseout', onMouseOut);
      window.clearTimeout(dwell);
    };
  }, [suppressed, trigger]);

  if (!open || suppressed) return null;

  const de = language === 'de';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('loading');
    try {
      await submitNewsletterForm(email.trim(), { sourcePath: location.pathname });
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      onClick={() => setOpen(false)}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
          aria-label={de ? 'Schließen' : 'Close'}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-purple-100">
          <Gift className="h-7 w-7 text-purple-600" />
        </div>

        {status === 'done' ? (
          <>
            <h2 className="text-2xl font-bold text-gray-900">{de ? 'Fast geschafft!' : 'Almost there!'}</h2>
            <p className="mt-2 text-gray-600">{t('newsletter.thanks')}</p>
            <button
              onClick={() => setOpen(false)}
              className="mt-6 w-full rounded-lg bg-purple-600 py-3 font-semibold text-white transition-colors hover:bg-purple-700"
            >
              {de ? 'Schließen' : 'Close'}
            </button>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-gray-900">
              {de ? 'Warten Sie – €50 geschenkt!' : 'Wait — here’s €50 off!'}
            </h2>
            <p className="mt-2 text-gray-600">{t('newsletter.subtitle')}</p>
            <form onSubmit={handleSubmit} className="mt-5 space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('newsletter.placeholder')}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-pink-500 py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {status === 'loading' ? (de ? 'Wird gesendet…' : 'Sending…') : t('newsletter.button')}
              </button>
              {status === 'error' && (
                <p className="text-sm text-red-500">
                  {de ? 'Etwas ist schiefgelaufen. Bitte erneut versuchen.' : 'Something went wrong. Please try again.'}
                </p>
              )}
            </form>
            <button
              onClick={() => setOpen(false)}
              className="mt-3 text-sm text-gray-400 underline hover:text-gray-600"
            >
              {de ? 'Nein danke' : 'No thanks'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ExitIntentPopup;

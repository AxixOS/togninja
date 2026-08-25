import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  AlertTriangle, ArrowRight, Check, Loader2, RefreshCw, Info, ExternalLink,
} from 'lucide-react';

/**
 * Moving a domain across without losing what it earned.
 *
 * THE PROBLEM A PHOTOGRAPHER CANNOT SEE. Onboarding rebuilds about a dozen pages. A working
 * studio often has eighty indexed. Point the domain here and the rest are orphaned — and they
 * do not even 404, because the SPA catch-all answers any unmatched path with the homepage at
 * HTTP 200. Eighty dead URLs become eighty copies of one page, which Google reads as
 * duplication across the whole domain.
 *
 * So this page exists to say, before anybody touches DNS: here is what you have, here is what
 * survives, here is where the rest will point. It is the scariest moment in the product and
 * the best chance it has to look like it knows what it is doing.
 */

interface Redirect {
  from_path: string;
  to_path: string;
  reason: string;
  confidence: 'strong' | 'likely' | 'fallback' | 'manual';
  approved: boolean;
}

export default function SiteMigrationPage() {
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const [website, setWebsite] = useState('');
  const [redirects, setRedirects] = useState<Redirect[]>([]);
  const [kept, setKept] = useState<string[]>([]);
  const [discovered, setDiscovered] = useState<number | null>(null);
  const [unknown, setUnknown] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/migration/plan', { credentials: 'include' });
      const d = await r.json();
      setWebsite(d.website || '');
      setRedirects(d.redirects || []);
    } catch {
      setMsg({ type: 'err', text: 'Could not read the current plan.' });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const build = async () => {
    setBuilding(true);
    setMsg(null);
    setUnknown(null);
    try {
      const r = await fetch('/api/migration/plan', { method: 'POST', credentials: 'include' });
      const d = await r.json();
      if (!r.ok) { setMsg({ type: 'err', text: d.message || d.error || 'Could not build the plan.' }); return; }
      if (d.unknown) { setUnknown(d.message); return; }
      setDiscovered(d.discovered);
      setKept(d.kept || []);
      await load();
      setMsg({ type: 'ok', text: d.note || 'Plan built. Nothing has changed yet.' });
    } catch (e: any) {
      setMsg({ type: 'err', text: e?.message || 'Could not build the plan.' });
    } finally {
      setBuilding(false);
    }
  };

  const setApproval = async (approve: boolean, paths?: string[]) => {
    try {
      await fetch(`/api/migration/${approve ? 'approve' : 'revoke'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(paths ? { paths } : {}),
      });
      await load();
      setMsg({
        type: 'ok',
        text: approve
          ? 'Live. Those addresses now forward to their new pages.'
          : 'Turned off. Those addresses no longer forward.',
      });
    } catch {
      setMsg({ type: 'err', text: 'That did not save.' });
    }
  };

  const approvedCount = redirects.filter((r) => r.approved).length;
  const fallbacks = redirects.filter((r) => r.confidence === 'fallback');
  const matched = redirects.filter((r) => r.confidence !== 'fallback');

  const badge = (c: Redirect['confidence']) => {
    const map = {
      strong: ['bg-green-50 text-green-800 border-green-200', 'good match'],
      likely: ['bg-green-50 text-green-800 border-green-200', 'likely match'],
      manual: ['bg-blue-50 text-blue-800 border-blue-200', 'you chose'],
      fallback: ['bg-amber-50 text-amber-800 border-amber-200', 'no equivalent'],
    } as const;
    const [cls, label] = map[c] || map.fallback;
    return <span className={`px-2 py-0.5 rounded text-[11px] border ${cls} whitespace-nowrap`}>{label}</span>;
  };

  const table = (rows: Redirect[]) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[36rem]">
        <tbody>
          {rows.map((r) => (
            <tr key={r.from_path} className="border-b border-gray-100 last:border-0">
              <td className="py-2 pr-3 font-mono text-xs text-gray-800 whitespace-nowrap">{r.from_path}</td>
              <td className="py-2 pr-3 text-gray-400"><ArrowRight className="w-3.5 h-3.5" /></td>
              <td className="py-2 pr-3 font-mono text-xs text-gray-800 whitespace-nowrap">{r.to_path}</td>
              <td className="py-2 pr-3">{badge(r.confidence)}</td>
              <td className="py-2 text-xs text-gray-500">{r.approved ? 'live' : 'not live'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold text-gray-900">Moving your website address</h1>
        <p className="mt-1 text-sm text-gray-600 max-w-2xl">
          Your old site has pages that people and Google already know about. When you point
          your address here, those pages need somewhere to go — otherwise the traffic they
          earned is lost. This works out where each one should land.
        </p>

        {msg && (
          <div className={`mt-4 rounded-lg border p-3 text-sm ${
            msg.type === 'ok'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'}`}>
            {msg.text}
          </div>
        )}

        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[14rem]">
              <p className="text-sm font-medium text-gray-900">Your existing site</p>
              <p className="text-sm text-gray-600 font-mono break-all">{website || 'not set'}</p>
            </div>
            <button
              type="button"
              onClick={build}
              disabled={building || !website}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {building ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {redirects.length ? 'Check again' : 'Find my pages'}
            </button>
          </div>
          {!website && (
            <p className="mt-3 text-xs text-gray-500">
              Add your current website address in Settings first — that is the site we would be
              moving from.
            </p>
          )}
        </div>

        {/* A site with no readable sitemap is a normal site. Saying "0 pages found" would be
            telling the studio something false about their own website. */}
        {unknown && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="flex items-start gap-2 text-sm text-amber-900">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{unknown}</span>
            </p>
          </div>
        )}

        {discovered !== null && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              [discovered, 'pages on your old site'],
              [kept.length, 'already here'],
              [matched.length, 'have a new home'],
              [fallbacks.length, 'no equivalent'],
            ].map(([n, label]) => (
              <div key={String(label)} className="rounded-lg border border-gray-200 bg-white p-3">
                <p className="text-2xl font-semibold text-gray-900">{n as number}</p>
                <p className="text-xs text-gray-500">{label as string}</p>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <p className="mt-6 text-sm text-gray-500 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </p>
        ) : redirects.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <p className="text-sm text-gray-600">
              No plan yet. Find your pages first, and nothing will change until you say so.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <p className="text-sm text-gray-700 flex-1">
                <strong>{approvedCount}</strong> of {redirects.length} are live.
              </p>
              <button
                type="button"
                onClick={() => setApproval(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-800"
              >
                <Check className="w-4 h-4" /> Turn them all on
              </button>
              {approvedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setApproval(false)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Turn them all off
                </button>
              )}
            </div>

            {matched.length > 0 && (
              <section className="mt-5 rounded-xl border border-gray-200 bg-white p-5">
                <h2 className="text-base font-semibold text-gray-900">Pages with a new home</h2>
                <p className="mt-1 mb-3 text-sm text-gray-600">
                  These matched something on your new site, so anyone following an old link
                  lands somewhere relevant.
                </p>
                {table(matched)}
              </section>
            )}

            {/* The number that actually matters before switching DNS. */}
            {fallbacks.length > 0 && (
              <section className="mt-5 rounded-xl border border-amber-200 bg-amber-50/40 p-5">
                <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  {fallbacks.length} pages with nothing equivalent here
                </h2>
                <p className="mt-1 mb-3 text-sm text-gray-700 max-w-2xl">
                  These will point at your homepage. That keeps the link working and passes on
                  the value the page had built up — but it is not the same page. If any of
                  these matter, the better answer is to recreate them here before you switch.
                </p>
                {table(fallbacks)}
              </section>
            )}

            <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4 text-xs text-gray-600">
              <p className="flex items-start gap-2">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  These only do anything once your address points here. Until then your old
                  site carries on exactly as it is. Turning them on now is safe and means
                  nothing breaks the moment you switch.
                </span>
              </p>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

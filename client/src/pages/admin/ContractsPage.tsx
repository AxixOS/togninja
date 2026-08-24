// Every contract the studio has, what state it is in, and the two things they came here
// to do: send it, and get the link.
//
// WHAT THE LIST ENDPOINT GIVES AND WHAT IT DOES NOT. GET /api/contracts returns counts —
// signer_count and signed_count — and no names, and no access_token. Counts answer "is it
// done"; they do not answer "who is holding it up", which is the question a photographer
// actually has when a contract has been sitting on `sent` for four days. So a row expands,
// and expanding fetches GET /api/contracts/:id once. That single call carries the signers
// AND the token, so the same fetch that answers "who has signed" is the one that makes
// Copy link possible. Two calls for the two halves of one question would be silly.
//
// SEND IS NOT A BUTTON THAT ALWAYS WORKS, AND THAT IS THE FEATURE. POST /:id/send re-runs
// mergeContract() over the STORED body and refuses on any unresolved field, and refuses
// again if nobody has been named as a signer. Both refusals arrive with a sentence written
// for a person — canSend()'s own wording — so they are shown verbatim, next to the row,
// with a way to go and fix it. Rewriting them here would put a second vocabulary in front
// of the studio for the same event.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  ScrollText,
  Download,
  Send,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import {
  ContractApiError,
  clientNameOf,
  copyLink,
  fmtDate,
  getContract,
  listContracts,
  sendContract,
  signUrlFor,
  statusMeta,
  type ContractDetail,
  type ContractListRow,
} from './contractsApi';

type Filter = 'all' | 'draft' | 'out' | 'signed';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Drafts' },
  { id: 'out', label: 'Waiting on a signature' },
  { id: 'signed', label: 'Signed' },
];

const matchesFilter = (row: ContractListRow, filter: Filter): boolean => {
  const status = String(row.status || '').toLowerCase();
  if (filter === 'all') return true;
  if (filter === 'draft') return status === 'draft';
  if (filter === 'signed') return status === 'signed';
  return status === 'sent' || status === 'viewed';
};

const ContractsPage: React.FC = () => {
  const { language } = useLanguage();

  const [rows, setRows] = useState<ContractListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  // One cache for both jobs the detail call does here: naming the signers, and producing
  // the token that Copy link needs.
  const [details, setDetails] = useState<Record<string, ContractDetail>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [rowError, setRowError] = useState<Record<string, string>>({});
  // Kept apart from rowError: what happens after a successful send is NEWS, not a problem,
  // and painting it amber would train the studio to dismiss the amber ones.
  const [rowNote, setRowNote] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listContracts();
      setRows(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e: any) {
      setRows([]);
      setError(e instanceof ContractApiError ? e.message : 'Could not load your contracts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => rows.filter((r) => matchesFilter(r, filter)), [rows, filter]);

  const noteError = (id: string, message: string) =>
    setRowError((prev) => ({ ...prev, [id]: message }));

  const clearError = (id: string) => {
    setRowError((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setRowNote((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const noteResult = (id: string, message: string) =>
    setRowNote((prev) => ({ ...prev, [id]: message }));

  /** Fetch the detail row once, and keep it. */
  const ensureDetail = useCallback(
    async (id: string): Promise<ContractDetail | null> => {
      if (details[id]) return details[id];
      try {
        const d = await getContract(id);
        setDetails((prev) => ({ ...prev, [id]: d }));
        return d;
      } catch (e: any) {
        noteError(id, e instanceof ContractApiError ? e.message : 'Could not load this contract.');
        return null;
      }
    },
    [details],
  );

  const toggle = async (id: string) => {
    const open = !expanded[id];
    setExpanded((prev) => ({ ...prev, [id]: open }));
    if (open && !details[id]) {
      setBusy(id);
      await ensureDetail(id);
      setBusy(null);
    }
  };

  const doCopy = async (id: string) => {
    clearError(id);
    setBusy(id);
    try {
      const d = await ensureDetail(id);
      if (!d) return;
      if (!d.access_token) {
        // A draft has no token: the capability is minted by the send, not by the create.
        noteError(id, 'There is no link yet — a contract gets its link when you send it.');
        return;
      }
      const ok = await copyLink(signUrlFor(d.access_token));
      if (ok) {
        setCopied(id);
        window.setTimeout(() => setCopied((c) => (c === id ? null : c)), 2000);
      } else {
        noteError(id, `Could not reach the clipboard. The link is ${signUrlFor(d.access_token)}`);
      }
    } finally {
      setBusy(null);
    }
  };

  const doSend = async (row: ContractListRow) => {
    clearError(row.id);
    // Every send mints a FRESH access_token and overwrites the old one, which is how the
    // route revokes a link. Useful, and destructive if it is a surprise: a client halfway
    // through reading the contract in another tab is looking at a link that has just
    // stopped working, and nobody would connect the two.
    if (String(row.status).toLowerCase() !== 'draft') {
      const ok = window.confirm(
        'Resending creates a new link and the one you already sent will stop working. Send again?',
      );
      if (!ok) return;
    }
    setBusy(row.id);
    try {
      const r = await sendContract(row.id);
      // Reflect the new state without a round trip, then take the token straight into the
      // cache so Copy link works on the row the studio is already looking at.
      setRows((prev) =>
        prev.map((x) => (x.id === row.id ? { ...x, status: 'sent', sent_at: new Date().toISOString() } : x)),
      );
      setDetails((prev) => {
        const existing = prev[row.id];
        return existing
          ? { ...prev, [row.id]: { ...existing, status: 'sent', access_token: r.token } }
          : prev;
      });
      const url = signUrlFor(r.token);
      const ok = await copyLink(url);
      if (ok) {
        setCopied(row.id);
        window.setTimeout(() => setCopied((c) => (c === row.id ? null : c)), 2500);
      }
      // Say what actually happened. POST /:id/send mints the link and moves the contract
      // to `sent` — it emails nobody, and there is no mailer anywhere in that route. A
      // button labelled Send that quietly does not send is how a studio waits a week for a
      // signature on a link that never left this screen.
      noteResult(
        row.id,
        ok
          ? 'Marked as sent, and the link is on your clipboard. Nothing was emailed — send it to your signers yourself.'
          : `Marked as sent. Nothing was emailed — send this link to your signers: ${url}`,
      );
    } catch (e: any) {
      // The server's own sentence. 'unresolved_fields' and 'no_signers' both arrive with
      // prose meant to be read by the person who has to fix it.
      noteError(row.id, e instanceof ContractApiError ? e.message : 'Could not send the contract.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-[1200px] mx-auto">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ScrollText className="w-6 h-6 text-purple-600" />
              Contracts
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              What you have sent, who has signed, and what is still waiting.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={load}
              className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <Link
              to="/admin/contracts/templates"
              className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <FileText className="w-4 h-4" /> Templates
            </Link>
            <Link
              to="/admin/contracts/new"
              className="px-3 py-2 text-sm rounded-lg bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> New contract
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-xs border transition ${
                filter === f.id
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading contracts…
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <ScrollText className="w-8 h-8 text-gray-300 mx-auto" />
            <h2 className="mt-3 text-base font-semibold text-gray-900">No contracts yet</h2>
            <p className="mt-1 text-sm text-gray-600 max-w-md mx-auto">
              Write a template first — the wording you use for every client — then make a contract
              from it for one client and send them the link.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <Link
                to="/admin/contracts/templates"
                className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Write a template
              </Link>
              <Link
                to="/admin/contracts/new"
                className="px-3 py-2 text-sm rounded-lg bg-purple-600 text-white hover:bg-purple-700"
              >
                New contract
              </Link>
            </div>
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-600">
            Nothing in this list. {rows.length} contract{rows.length === 1 ? '' : 's'} in total.
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="text-left font-medium px-4 py-3">Contract</th>
                    <th className="text-left font-medium px-4 py-3">Status</th>
                    <th className="text-left font-medium px-4 py-3">Signed</th>
                    <th className="text-left font-medium px-4 py-3">Last activity</th>
                    <th className="text-right font-medium px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visible.map((row) => {
                    const meta = statusMeta(row.status);
                    const client = clientNameOf(row);
                    const detail = details[row.id];
                    const isOpen = !!expanded[row.id];
                    const working = busy === row.id;
                    const signedAll = row.signer_count > 0 && row.signed_count >= row.signer_count;
                    const lastActivity =
                      row.signed_at || row.viewed_at || row.sent_at || row.created_at;
                    return (
                      <React.Fragment key={row.id}>
                        <tr className="hover:bg-gray-50/60">
                          <td className="px-4 py-3">
                            <Link
                              to={`/admin/contracts/${row.id}`}
                              className="font-medium text-gray-900 hover:text-purple-700"
                            >
                              {row.title}
                            </Link>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {client || row.client_email || 'No client record attached'}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full border text-xs ${meta.className}`}>
                              {meta.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => toggle(row.id)}
                              className="inline-flex items-center gap-1 text-xs text-gray-700 hover:text-purple-700"
                              title="Show who has to sign"
                            >
                              {isOpen ? (
                                <ChevronDown className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                              <span className={signedAll ? 'text-green-700 font-medium' : ''}>
                                {row.signed_count} of {row.signer_count}
                              </span>
                            </button>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">
                            {fmtDate(lastActivity, language) || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1.5">
                              <Link
                                to={`/admin/contracts/${row.id}`}
                                className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                              >
                                Open
                              </Link>
                              <button
                                type="button"
                                onClick={() => doCopy(row.id)}
                                disabled={working}
                                title="Copy the link the client signs at"
                                className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1.5"
                              >
                                {copied === row.id ? (
                                  <Check className="w-3.5 h-3.5 text-green-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                                {copied === row.id ? 'Copied' : 'Copy link'}
                              </button>
                              {/* The executed PDF. GET /:id/pdf shipped with nothing linking
                                  to it, so the studio's own signed copy was unreachable from
                                  every screen. Only offered once the contract IS signed. */}
                              {String(row.status).toLowerCase() === 'signed' && (
                                <a
                                  href={`/api/contracts/${row.id}/pdf`}
                                  title="Download the signed contract"
                                  className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  PDF
                                </a>
                              )}
                              {String(row.status).toLowerCase() !== 'signed' && (
                                <button
                                  type="button"
                                  onClick={() => doSend(row)}
                                  disabled={working}
                                  title="Creates the signing link and marks this as sent. It does not email anybody — you send the link."
                                  className="px-2.5 py-1.5 text-xs rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1.5"
                                >
                                  {working ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Send className="w-3.5 h-3.5" />
                                  )}
                                  {String(row.status).toLowerCase() === 'draft' ? 'Send' : 'Resend'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {rowError[row.id] && (
                          <tr>
                            <td colSpan={5} className="px-4 pb-3">
                              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 flex items-start gap-2">
                                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                <div className="break-all">
                                  {rowError[row.id]}{' '}
                                  <Link
                                    to={`/admin/contracts/${row.id}`}
                                    className="underline whitespace-nowrap"
                                  >
                                    Open the contract
                                  </Link>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}

                        {rowNote[row.id] && (
                          <tr>
                            <td colSpan={5} className="px-4 pb-3">
                              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900 break-all">
                                {rowNote[row.id]}
                              </div>
                            </td>
                          </tr>
                        )}

                        {isOpen && (
                          <tr className="bg-gray-50/60">
                            <td colSpan={5} className="px-4 py-3">
                              {!detail ? (
                                <div className="text-xs text-gray-500 flex items-center gap-2">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading signers…
                                </div>
                              ) : detail.signers.length === 0 ? (
                                <div className="text-xs text-gray-600">
                                  Nobody has been named as a signer yet, so this cannot be sent.{' '}
                                  <Link to={`/admin/contracts/${row.id}`} className="underline">
                                    Add the signers
                                  </Link>
                                  .
                                </div>
                              ) : (
                                <ul className="space-y-1">
                                  {detail.signers.map((s) => (
                                    <li key={s.id} className="text-xs text-gray-700 flex items-center gap-2">
                                      {s.signed_at ? (
                                        <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
                                      ) : (
                                        <span className="w-3.5 h-3.5 rounded-full border border-gray-300 shrink-0" />
                                      )}
                                      <span className="font-medium text-gray-900">{s.name}</span>
                                      <span className="text-gray-500">{s.email}</span>
                                      <span className="text-gray-400">({s.role})</span>
                                      <span className={s.signed_at ? 'text-green-700' : 'text-gray-500'}>
                                        {s.signed_at
                                          ? `signed ${fmtDate(s.signed_at, language)}`
                                          : 'not signed yet'}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                              {detail?.access_token && (
                                <div className="mt-2 text-xs text-gray-500 flex items-center gap-2 break-all">
                                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                  <a
                                    href={signUrlFor(detail.access_token)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="underline"
                                  >
                                    {signUrlFor(detail.access_token)}
                                  </a>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ContractsPage;

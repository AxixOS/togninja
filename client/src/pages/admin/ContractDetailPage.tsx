// One contract: what it says, who has to sign it, and whether it may be sent.
//
// THIS SCREEN'S CHECK IS THE SERVER'S CHECK. POST /:id/send does exactly this before it
// will let anything out:
//
//     const recheck = mergeContract(contract.body, {});
//     const verdict = canSend(recheck);
//
// and so does this page — same functions, same argument, the body the server stored. Not a
// version of the check, the check. The Send button is disabled on `verdict.ok` and the
// reason shown is `verdict.reason`, so a studio is never told "looks fine" by a screen and
// "no" by the server a click later.
//
// (Running the merge over an already-merged body is not a second substitution: `values` is
// empty, so nothing is filled and nothing is escaped a second time. What it does is
// re-scan for tokens that survived, which is the only thing anybody wants to know here.)
//
// WHY THE SIGNER LIST LOCKS ITSELF. PUT /:id/signers is a REPLACE: it deletes every
// contract_signers row for the contract and re-inserts the list it was given. Those rows
// hold signature, signed_ip and signed_user_agent — the evidence a signature happened.
// Editing signers after somebody has signed would therefore not "update" anything, it
// would destroy a signature, silently, in a table nobody looks at until it matters. So the
// editor closes as soon as a single signature is recorded and says why.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Loader2,
  Lock,
  Mail,
  Plus,
  Save,
  Send,
  Trash2,
  Users,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { sanitizeContractHtml } from '../../lib/sanitizeContractHtml';
import { canSend, mergeContract } from '../../../../shared/contractMerge';
import {
  ContractApiError,
  MERGE_FIELD_BY_KEY,
  copyLink,
  fmtDate,
  getContract,
  saveSigners,
  sendContract,
  signUrlFor,
  statusMeta,
  type ContractDetail,
  type SignerInput,
} from './contractsApi';

const BLANK_SIGNER: SignerInput = { name: '', email: '', role: 'client' };

const ContractDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { language } = useLanguage();

  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [rows, setRows] = useState<SignerInput[]>([]);
  const [signersDirty, setSignersDirty] = useState(false);
  const [savingSigners, setSavingSigners] = useState(false);
  const [signerError, setSignerError] = useState<string | null>(null);

  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const d = await getContract(id);
      setContract(d);
      setRows(
        (d.signers || []).map((s) => ({ name: s.name, email: s.email, role: s.role || 'client' })),
      );
      setSignersDirty(false);
      setLoadError(null);
    } catch (e: any) {
      setContract(null);
      setLoadError(e instanceof ContractApiError ? e.message : 'Could not load the contract.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // ── The gate ──────────────────────────────────────────────────────────────
  const merged = useMemo(() => mergeContract(contract?.body || '', {}), [contract?.body]);
  const verdict = useMemo(() => canSend(merged), [merged]);
  const safeBody = useMemo(() => sanitizeContractHtml(merged.text), [merged.text]);

  const signers = contract?.signers || [];
  const anySigned = signers.some((s) => !!s.signed_at);
  const signedCount = signers.filter((s) => !!s.signed_at).length;
  const status = String(contract?.status || '').toLowerCase();
  const alreadySigned = status === 'signed';

  /**
   * Why Send is unavailable, in the words the server would use.
   *
   * Order matters: the merge gate first, because that is the one the studio can act on
   * without leaving the page, then signers, then the terminal state.
   */
  const blockedReason = useMemo((): string | null => {
    if (!contract) return 'Still loading.';
    if (alreadySigned) return 'That contract has already been signed.';
    if (!verdict.ok) return verdict.reason || null;
    if (signers.length === 0) return 'Add who needs to sign before sending.';
    if (signersDirty) return 'Save the signer list first — what is on screen is not what would be sent.';
    return null;
  }, [contract, alreadySigned, verdict, signers.length, signersDirty]);

  // ── Signers ───────────────────────────────────────────────────────────────

  const setRow = (index: number, patch: Partial<SignerInput>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
    setSignersDirty(true);
  };

  const addRow = () => {
    setRows((prev) => [...prev, { ...BLANK_SIGNER }]);
    setSignersDirty(true);
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
    setSignersDirty(true);
  };

  /**
   * Offer the people this contract is already about.
   *
   * merge_values is what the server merged the body from, so [Client Name] and
   * [Studio Name] here are the same strings that appear in the document. Taking them from
   * anywhere else would risk a signer line that disagrees with the contract it is attached
   * to.
   */
  const suggestion = useMemo((): SignerInput[] => {
    const v = contract?.merge_values || {};
    const out: SignerInput[] = [];
    if (v['Client Name'] && v['Client Email']) {
      out.push({ name: v['Client Name'], email: v['Client Email'], role: 'client' });
    }
    if (v['Studio Name'] && v['Studio Email']) {
      out.push({ name: v['Studio Name'], email: v['Studio Email'], role: 'studio' });
    }
    return out;
  }, [contract]);

  const persistSigners = async () => {
    if (!id) return;
    setSignerError(null);
    const cleaned = rows
      .map((r) => ({ name: r.name.trim(), email: r.email.trim(), role: r.role || 'client' }))
      .filter((r) => r.name || r.email);
    if (!cleaned.length) {
      setSignerError('A contract needs at least one signer.');
      return;
    }
    const incomplete = cleaned.find((r) => !r.name || !r.email);
    if (incomplete) {
      setSignerError('Every signer needs a name and an email.');
      return;
    }
    setSavingSigners(true);
    try {
      await saveSigners(id, cleaned);
      await load();
    } catch (e: any) {
      setSignerError(e instanceof ContractApiError ? e.message : 'Could not save the signers.');
    } finally {
      setSavingSigners(false);
    }
  };

  // ── Sending ───────────────────────────────────────────────────────────────

  const doSend = async () => {
    if (!id) return;
    setSendError(null);
    // Every send mints a fresh token and the previous link stops working. Worth a sentence
    // when there already is one out there.
    if (contract?.access_token) {
      const ok = window.confirm(
        'Resending creates a new link and the one you already sent will stop working. Send again?',
      );
      if (!ok) return;
    }
    setSending(true);
    try {
      await sendContract(id);
      await load();
    } catch (e: any) {
      setSendError(e instanceof ContractApiError ? e.message : 'Could not send the contract.');
    } finally {
      setSending(false);
    }
  };

  const doCopy = async () => {
    if (!contract?.access_token) return;
    const ok = await copyLink(signUrlFor(contract.access_token));
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } else {
      setSendError('Could not reach the clipboard — the link is on screen, copy it by hand.');
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6 text-sm text-gray-500 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading contract…
        </div>
      </AdminLayout>
    );
  }

  if (!contract) {
    return (
      <AdminLayout>
        <div className="p-6 max-w-2xl">
          <Link to="/admin/contracts" className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center gap-1.5 mb-4">
            <ArrowLeft className="w-4 h-4" /> Contracts
          </Link>
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{loadError || 'Contract not found.'}</span>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const meta = statusMeta(contract.status);
  const signUrl = contract.access_token ? signUrlFor(contract.access_token) : '';

  return (
    <AdminLayout>
      <div className="p-6 max-w-[1200px] mx-auto">
        <Link
          to="/admin/contracts"
          className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center gap-1.5 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Contracts
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{contract.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-600">
              <span className={`inline-block px-2 py-0.5 rounded-full border ${meta.className}`}>
                {meta.label}
              </span>
              {contract.created_at && <span>Created {fmtDate(contract.created_at, language)}</span>}
              {contract.sent_at && <span>Sent {fmtDate(contract.sent_at, language)}</span>}
              {contract.viewed_at && <span>Opened {fmtDate(contract.viewed_at, language)}</span>}
              {contract.signed_at && (
                <span className="text-green-700">Signed {fmtDate(contract.signed_at, language)}</span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <button
              type="button"
              onClick={doSend}
              disabled={sending || !!blockedReason}
              title={
                blockedReason ||
                'Creates the signing link and marks this as sent. It does not email anybody — you send the link.'
              }
              className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {contract.access_token ? 'Send again' : 'Send'}
            </button>
            {blockedReason ? (
              <span className="text-xs text-amber-700 max-w-xs text-right">{blockedReason}</span>
            ) : (
              // The endpoint mints a token and sets status to 'sent'. There is no mailer in
              // it, and a studio that assumes otherwise waits for a signature on a link
              // nobody was ever given.
              <span className="text-xs text-gray-500 max-w-xs text-right">
                This makes the link and marks it sent. It does not email anybody.
              </span>
            )}
            {sendError && <span className="text-xs text-red-700 max-w-xs text-right">{sendError}</span>}
          </div>
        </div>

        {/* ── Unresolved fields ── */}
        {(merged.unknown.length > 0 || merged.missing.length > 0) && (
          <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4">
            <div className="flex gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-700" />
              <div className="text-sm text-amber-900">
                <p className="font-medium">This contract still has placeholders in it.</p>
                {merged.unknown.length > 0 && (
                  <p className="mt-2">
                    <span className="font-mono text-xs">
                      {merged.unknown.map((k) => `[${k}]`).join('  ')}
                    </span>{' '}
                    — not a merge field at all. The wording came from a template with a typo in it, and
                    because the body is a snapshot, this contract cannot be repaired by editing that
                    template:{' '}
                    <Link to="/admin/contracts/templates" className="underline">
                      fix the template
                    </Link>{' '}
                    and make the contract again.
                  </p>
                )}
                {merged.missing.length > 0 && (
                  <div className="mt-2">
                    <p>These had no value when the contract was built:</p>
                    <ul className="mt-1 space-y-0.5">
                      {merged.missing.map((k) => (
                        <li key={k} className="text-xs">
                          <span className="font-mono">[{k}]</span>
                          {MERGE_FIELD_BY_KEY[k] ? ` — ${MERGE_FIELD_BY_KEY[k].label}` : ''}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs">
                      The text is fixed at the moment it is created, so this one has to be made again
                      with the value filled in.{' '}
                      <Link to="/admin/contracts/new" className="underline">
                        Make it again
                      </Link>
                      .
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr,360px] gap-6 items-start">
          {/* ── The document ── */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              What your client will read
            </h2>
            <div
              className="prose prose-sm max-w-none prose-headings:font-semibold prose-a:text-blue-700"
              // The stored body, through the same allowlist sanitiser the signing page uses.
              dangerouslySetInnerHTML={{ __html: safeBody }}
            />
          </div>

          <div className="space-y-6">
            {/* ── The link ── */}
            {signUrl && (
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h2 className="text-sm font-semibold text-gray-900 mb-2">The signing link</h2>
                <p className="text-xs text-gray-500 mb-2">
                  Nothing was emailed — sending only created this link. Anyone holding it can open and
                  sign the contract, because the link is the whole of the authorisation, so give it to
                  the signers and nobody else.
                </p>
                <div className="text-xs font-mono text-gray-700 break-all bg-gray-50 border border-gray-200 rounded-lg p-2">
                  {signUrl}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={doCopy}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy link'}
                  </button>
                  <a
                    href={signUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open it
                  </a>
                </div>
              </div>
            )}

            {/* ── Signers ── */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" /> Signers
                </h2>
                <span className="text-xs text-gray-500">
                  {signedCount} of {signers.length} signed
                </span>
              </div>

              {/* Who has signed, from the saved rows — never from the editor above it. */}
              {signers.length > 0 && (
                <ul className="mb-3 space-y-1">
                  {signers.map((s) => (
                    <li key={s.id} className="text-xs flex items-start gap-2">
                      {s.signed_at ? (
                        <Check className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-gray-300 mt-0.5 shrink-0" />
                      )}
                      <span className="min-w-0">
                        <span className="font-medium text-gray-900">{s.name}</span>{' '}
                        <span className="text-gray-500 break-all">{s.email}</span>
                        <span className="block text-gray-500">
                          {s.role === 'studio' ? 'Your studio' : 'Client'} ·{' '}
                          {s.signed_at ? `signed ${fmtDate(s.signed_at, language)}` : 'not signed yet'}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {anySigned ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600 flex gap-2">
                  <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>
                    The signer list is locked because a signature has been recorded. Saving it replaces
                    every row, which would throw away the signature and the record of who gave it.
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  {rows.length === 0 && suggestion.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setRows(suggestion);
                        setSignersDirty(true);
                      }}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-dashed border-purple-300 text-purple-700 hover:bg-purple-50 flex items-center justify-center gap-1.5"
                    >
                      <Mail className="w-3.5 h-3.5" /> Use the people named in this contract
                    </button>
                  )}

                  {rows.map((r, i) => (
                    <div key={i} className="rounded-lg border border-gray-200 p-2 space-y-2">
                      <div className="flex gap-2">
                        <input
                          value={r.name}
                          onChange={(e) => setRow(i, { name: e.target.value })}
                          placeholder="Full name"
                          className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded-lg text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => removeRow(i)}
                          title="Remove this signer"
                          className="px-2 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <input
                        value={r.email}
                        onChange={(e) => setRow(i, { email: e.target.value })}
                        placeholder="Email"
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs"
                      />
                      <select
                        value={r.role}
                        onChange={(e) => setRow(i, { role: e.target.value })}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                      >
                        <option value="client">Client</option>
                        <option value="studio">Your studio</option>
                      </select>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addRow}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-dashed border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add a signer
                  </button>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={persistSigners}
                      disabled={savingSigners || !signersDirty}
                      className="px-3 py-1.5 text-xs rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      {savingSigners ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      Save signers
                    </button>
                    {signersDirty && <span className="text-xs text-amber-700">Unsaved</span>}
                    {signerError && <span className="text-xs text-red-700">{signerError}</span>}
                  </div>
                </div>
              )}
            </div>

            {/* ── The values it was built from ── */}
            {contract.merge_values && Object.keys(contract.merge_values).length > 0 && (
              <details className="rounded-xl border border-gray-200 bg-white p-4">
                <summary className="text-sm font-semibold text-gray-900 cursor-pointer">
                  Values this was built from
                </summary>
                <p className="mt-2 text-xs text-gray-500">
                  Kept so you can see why the contract says what it says. Changing them here is not
                  possible on purpose — the text a client signs is the text that was created.
                </p>
                <dl className="mt-2 space-y-1">
                  {Object.entries(contract.merge_values).map(([k, v]) => (
                    <div key={k} className="text-xs flex gap-2">
                      <dt className="font-mono text-gray-500 shrink-0">[{k}]</dt>
                      <dd className="text-gray-800 break-all">{String(v || '') || '—'}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ContractDetailPage;

// Making one client's contract out of a template.
//
// THE PREVIEW ON THIS PAGE IS mergeContract() — imported from shared/contractMerge.ts,
// which is the module server/routes/contracts.ts calls when it builds the body it stores.
// Nothing here re-implements substitution, and nothing here decides what counts as
// missing: the engine reports that and this page displays it.
//
// WHAT THIS PREVIEW HONESTLY IS. The browser cannot see all of the studio's own row. The
// server merges [Studio Name], [City Name], [State/Country] and [Today] out of
// studio_configs; the admin endpoint that exposes that row does not carry `country`, and
// the date is formatted server-side. So the unresolved fields are shown in TWO groups —
// the ones the studio has to fill, and the ones the server fills on create — and the
// second group is never presented as a problem. A warning that fires on something already
// handled is how a studio learns to click past the warning that is real.
//
// The authority is therefore the DRAFT, one screen along: there the body has been merged
// by the server and mergeContract() runs over that stored text, which is exactly what
// POST /:id/send does before it will let anything out.
//
// WHY AN UNKNOWN FIELD BLOCKS CREATION. contracts.body is a SNAPSHOT taken at create time
// and never re-rendered. A template with [Sesion Date] in it therefore produces a draft
// that can never be sent and can never be repaired — fixing the template does not touch
// the row. Making it anyway would just leave the studio a piece of litter that looks like
// a contract, so the way through is to fix the template first.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Check,
  FilePlus,
  Info,
  Loader2,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useStudioCurrency } from '../../hooks/useStudioCurrency';
import { sanitizeContractHtml } from '../../lib/sanitizeContractHtml';
import { mergeContract, fieldsUsed } from '../../../../shared/contractMerge';
import {
  ContractApiError,
  MERGE_FIELD_BY_KEY,
  createContract,
  fetchStudioMergeValues,
  fmtDate,
  isClientFilled,
  isServerFilled,
  listTemplates,
  type ContractTemplate,
} from './contractsApi';

interface ClientRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

/** A plain amount, in any of the ways a person writes one. */
const MONEY_NUMERIC = /^-?\d+(?:[.,]\d{1,2})?$/;

const ContractComposerPage: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { currency, format: formatMoney } = useStudioCurrency();

  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [studioValues, setStudioValues] = useState<Record<string, string>>({});
  const [studioUnreadable, setStudioUnreadable] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [templateId, setTemplateId] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [title, setTitle] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tpl, studio] = await Promise.all([listTemplates(), fetchStudioMergeValues()]);
      setTemplates(Array.isArray(tpl) ? tpl : []);
      setStudioValues(studio.values);
      setStudioUnreadable(studio.unreadable);
      setLoadError(null);
    } catch (e: any) {
      setLoadError(e instanceof ContractApiError ? e.message : 'Could not load your contract templates.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Clients are a nice-to-have here: a contract can be made without one, and the fields it
  // would have filled become fields the studio types. So a failure is left silent rather
  // than blocking the page.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/crm/clients', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (cancelled) return;
        const rows = (Array.isArray(data) ? data : []).map((c: any) => ({
          id: String(c.id),
          firstName: c.firstName || c.first_name || '',
          lastName: c.lastName || c.last_name || '',
          email: c.email || '',
          phone: c.phone || '',
        }));
        setClients(rows);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const template = useMemo(
    () => templates.find((t) => t.id === templateId) || null,
    [templates, templateId],
  );
  const client = useMemo(() => clients.find((c) => c.id === clientId) || null, [clients, clientId]);

  const filteredClients = useMemo(() => {
    const q = clientFilter.trim().toLowerCase();
    if (!q) return clients.slice(0, 200);
    return clients
      .filter((c) => `${c.firstName} ${c.lastName} ${c.email}`.toLowerCase().includes(q))
      .slice(0, 200);
  }, [clients, clientFilter]);

  // Keep the title following the template until somebody types their own.
  useEffect(() => {
    if (!titleTouched) setTitle(template?.name || '');
  }, [template, titleTouched]);

  const usedKeys = useMemo(() => (template ? fieldsUsed(template.body) : []), [template]);
  const unknownKeys = useMemo(() => usedKeys.filter((k) => !MERGE_FIELD_BY_KEY[k]), [usedKeys]);

  /** The fields this template needs from a person, in the order the palette groups them. */
  const askKeys = useMemo(
    () => usedKeys.filter((k) => MERGE_FIELD_BY_KEY[k] && !isServerFilled(k)),
    [usedKeys],
  );

  /**
   * What a typed value becomes in the document.
   *
   * A bare amount is put through the studio's own currency formatter — the studio sells in
   * whatever it sells in, and a contract that says the fee in the wrong currency is a
   * contract about a different amount of money. Anything that is not a plain number is
   * left exactly as typed, because "950 plus travel" is a sentence and formatting it would
   * destroy it.
   */
  const resolveValue = useCallback(
    (key: string, raw: string): string => {
      const text = String(raw || '').trim();
      if (!text) return '';
      const field = MERGE_FIELD_BY_KEY[key];
      if (field?.source === 'money' && MONEY_NUMERIC.test(text)) {
        return formatMoney(Number(text.split(',').join('.')));
      }
      if (field?.source === 'date' || key === 'Session Date') {
        const pretty = fmtDate(text, language);
        return pretty || text;
      }
      return text;
    },
    [formatMoney, language],
  );

  /** Only what the studio actually typed, resolved. Empty inputs are not values. */
  const typedValues = useMemo(() => {
    const out: Record<string, string> = {};
    for (const key of askKeys) {
      const resolved = resolveValue(key, values[key] || '');
      if (resolved) out[key] = resolved;
    }
    return out;
  }, [askKeys, values, resolveValue]);

  const clientValues = useMemo(() => {
    if (!client) return {} as Record<string, string>;
    const name = [client.firstName, client.lastName].filter(Boolean).join(' ').trim();
    const out: Record<string, string> = {};
    if (name) out['Client Name'] = name;
    if (client.email) out['Client Email'] = client.email;
    if (client.phone) out['Client Phone'] = client.phone;
    return out;
  }, [client]);

  // The same precedence the route uses: studio values, then the client record, then
  // anything typed. Object.assign order in POST / is studio -> client -> values.
  const previewValues = useMemo(
    () => ({ ...studioValues, ...clientValues, ...typedValues }),
    [studioValues, clientValues, typedValues],
  );

  const merged = useMemo(
    () => mergeContract(template?.body || '', previewValues),
    [template, previewValues],
  );
  const safePreview = useMemo(() => sanitizeContractHtml(merged.text), [merged.text]);

  // Split, so a field the server is about to fill never sits in the same list as a field
  // nobody has filled.
  const missingYours = merged.missing.filter((k) => !isServerFilled(k));
  const missingServer = merged.missing.filter((k) => isServerFilled(k));

  const create = async () => {
    setCreateError(null);
    if (!templateId) {
      setCreateError('Choose a template.');
      return;
    }
    setCreating(true);
    try {
      const r = await createContract({
        templateId,
        clientId: clientId || null,
        title: title.trim() || undefined,
        // Only non-empty values. The route does Object.assign(merged, values), so sending
        // an empty string for a field would OVERWRITE the value it derived from the client
        // record or the studio profile and turn a filled field into a missing one.
        values: typedValues,
      });
      navigate(`/admin/contracts/${r.id}`);
    } catch (e: any) {
      setCreateError(e instanceof ContractApiError ? e.message : 'Could not create the contract.');
      setCreating(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-[1200px] mx-auto">
        <Link
          to="/admin/contracts"
          className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center gap-1.5 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Contracts
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FilePlus className="w-6 h-6 text-purple-600" />
          New contract
        </h1>
        <p className="text-sm text-gray-600 mt-1 mb-6">
          Pick the wording, pick the client, fill in what only you know. You will get a draft to check
          before anything is sent.
        </p>

        {loadError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{loadError}</span>
          </div>
        )}

        {loading ? (
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : templates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <h2 className="text-base font-semibold text-gray-900">No templates yet</h2>
            <p className="mt-1 text-sm text-gray-600 max-w-md mx-auto">
              A contract is made from a template. Write one first — it is the wording you use for every
              client, with [merge fields] where the details go.
            </p>
            <Link
              to="/admin/contracts/templates"
              className="mt-4 inline-block px-3 py-2 text-sm rounded-lg bg-purple-600 text-white hover:bg-purple-700"
            >
              Write a template
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* ── The form ── */}
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Template</label>
                  <select
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    <option value="">Choose a template…</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Client</label>
                  <input
                    value={clientFilter}
                    onChange={(e) => setClientFilter(e.target.value)}
                    placeholder="Search by name or email…"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2"
                  />
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    <option value="">No client record — I will type their details</option>
                    {filteredClients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {[c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || c.id}
                        {c.email ? ` · ${c.email}` : ''}
                      </option>
                    ))}
                  </select>
                  {clientId && !client && (
                    <p className="mt-1 text-xs text-amber-700">
                      That client is filtered out of the list above, but is still selected.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Title (what you will see in your list)
                  </label>
                  <input
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setTitleTouched(true);
                    }}
                    placeholder={template?.name || 'Contract'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              {template && unknownKeys.length > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                  <div className="flex gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">This template uses fields that do not exist.</p>
                      <p className="mt-1 font-mono text-xs">
                        {unknownKeys.map((k) => `[${k}]`).join('  ')}
                      </p>
                      <p className="mt-2 text-xs">
                        A contract keeps the text it was built from, so fixing the template afterwards
                        would not repair this one — and it could never be sent.{' '}
                        <Link to="/admin/contracts/templates" className="underline">
                          Fix the template first
                        </Link>
                        .
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {template && askKeys.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <h2 className="text-sm font-semibold text-gray-900 mb-3">Details for this contract</h2>
                  <div className="space-y-3">
                    {askKeys.map((key) => {
                      const field = MERGE_FIELD_BY_KEY[key];
                      const fromClient = isClientFilled(key) ? clientValues[key] : '';
                      const raw = values[key] || '';
                      const resolved = resolveValue(key, raw);
                      const isDate = field.source === 'date' || key === 'Session Date';
                      const isMoney = field.source === 'money';
                      return (
                        <div key={key}>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            {field.label}{' '}
                            <span className="font-mono text-gray-400">[{key}]</span>
                            {isMoney && <span className="ml-1 text-gray-400">({currency})</span>}
                          </label>
                          <input
                            type={isDate ? 'date' : 'text'}
                            value={raw}
                            onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                            placeholder={fromClient || field.label}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                          {fromClient && !raw && (
                            <p className="mt-1 text-xs text-gray-500">
                              From the client record: <span className="text-gray-700">{fromClient}</span>
                            </p>
                          )}
                          {resolved && (isMoney || isDate) && (
                            <p className="mt-1 text-xs text-gray-500">
                              Merged as <span className="text-gray-700">{resolved}</span>
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── What is still unresolved ── */}
              {template && (
                <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                  <h2 className="text-sm font-semibold text-gray-900">Before you send</h2>

                  {missingYours.length === 0 && unknownKeys.length === 0 ? (
                    <p className="text-sm text-green-700 flex items-center gap-2">
                      <Check className="w-4 h-4" /> Every field you have to fill is filled.
                    </p>
                  ) : (
                    missingYours.length > 0 && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                        <p className="font-medium">Still showing as a placeholder:</p>
                        <ul className="mt-1 space-y-0.5">
                          {missingYours.map((k) => (
                            <li key={k} className="text-xs">
                              <span className="font-mono">[{k}]</span>
                              {MERGE_FIELD_BY_KEY[k] ? ` — ${MERGE_FIELD_BY_KEY[k].label}` : ''}
                              {isClientFilled(k) && client
                                ? ' (the client record has nothing here, so type it)'
                                : ''}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  )}

                  {missingServer.length > 0 && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600 flex gap-2">
                      <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <div>
                        <p>
                          <span className="font-mono">{missingServer.map((k) => `[${k}]`).join(' ')}</span>{' '}
                          {missingServer.length === 1 ? 'is' : 'are'} filled from your studio profile when
                          the draft is created, so {missingServer.length === 1 ? 'it is' : 'they are'} not
                          something to fill in here.
                        </p>
                        {missingServer.some((k) => studioUnreadable.includes(k)) && (
                          <p className="mt-1">
                            This screen cannot read {missingServer.filter((k) => studioUnreadable.includes(k)).map((k) => `[${k}]`).join(' ')}{' '}
                            at all, which is why the preview still shows the placeholder. The draft will
                            show you the real text.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={create}
                  disabled={creating || !templateId || unknownKeys.length > 0}
                  className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FilePlus className="w-4 h-4" />}
                  Create draft
                </button>
                <span className="text-xs text-gray-500">
                  Nothing is sent yet — the draft is where you add who signs and check the wording.
                </span>
                {createError && (
                  <span className="text-xs text-red-700 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {createError}
                  </span>
                )}
              </div>
            </div>

            {/* ── The preview ── */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 lg:sticky lg:top-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">Preview</h2>
              <p className="text-xs text-gray-500 mb-3">
                Merged with the same function the server sends with, and rendered with the same
                sanitiser your client's page uses.
              </p>
              {template ? (
                <div
                  className="prose prose-sm max-w-none prose-headings:font-semibold prose-a:text-blue-700 border border-gray-200 rounded-lg p-5 max-h-[70vh] overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: safePreview }}
                />
              ) : (
                <p className="text-sm text-gray-500">Choose a template to see it.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ContractComposerPage;

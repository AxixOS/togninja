// Where a photographer writes the contract they will send, and sees what it will look
// like when it goes out.
//
// THE PALETTE IS NOT A LIST OF FIELD NAMES I TYPED. It is MERGE_FIELDS, imported from
// shared/contractMerge.ts — the same array the server merges against. A second copy here
// would be right on the day it was written and wrong on the day somebody adds a field: the
// editor would offer a token the sender does not know, and the studio would find out when
// a contract refused to send.
//
// THE PREVIEW IS mergeContract(). Not a regex over the body, not a lookalike — the
// function server/routes/contracts.ts calls when it builds the document. That is the whole
// point of the module being in shared/: a preview that substitutes differently from the
// sender is worse than no preview, because it is a document the studio believes they have
// checked. The rendering runs through client/src/lib/sanitizeContractHtml.ts as well, for
// the same reason: it is what the client's signing page renders with, so what is on this
// screen is what they will see.
//
// WHAT THE PREVIEW HERE CAN AND CANNOT TELL YOU. A template has no client and no fee yet,
// so this fills every known field with a SAMPLE value and says so out loud. That makes
// `missing` meaningless on this screen and `unknown` the signal that matters: a token that
// is not a merge field at all is a bug in the template, canSend() refuses it, and it is
// refused here where it can still be fixed rather than at the moment somebody presses Send
// on a real client's contract.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  Code2,
  Eye,
  FileText,
  Loader2,
  Plus,
  Save,
  ScrollText,
  Trash2,
  WrapText,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useStudioCurrency } from '../../hooks/useStudioCurrency';
import { sanitizeContractHtml } from '../../lib/sanitizeContractHtml';
import { MERGE_FIELDS, mergeContract, canSend, fieldsUsed } from '../../../../shared/contractMerge';
import {
  ContractApiError,
  MERGE_FIELD_BY_KEY,
  SOURCE_LABEL,
  SOURCE_ORDER,
  createTemplate,
  fetchStudioMergeValues,
  fmtDate,
  listTemplates,
  updateTemplate,
  type ContractTemplate,
} from './contractsApi';

interface Draft {
  id: string | null;
  name: string;
  category: string;
  body: string;
}

const EMPTY: Draft = { id: null, name: '', category: 'general', body: '' };

/**
 * A skeleton for somebody staring at an empty box.
 *
 * Structure and merge fields only. There is deliberately no specimen wording under
 * "Terms" — a studio's terms are the studio's, and prose invented here would eventually be
 * sent to a real client as though a photographer had agreed to it.
 */
const OUTLINE = [
  '<h2>Photography agreement</h2>',
  '<p>This agreement is made on [Today] between [Studio Name] ("the photographer") and [Client Name] ("the client").</p>',
  '<h3>The session</h3>',
  '<ul>',
  '  <li>Date: [Session Date]</li>',
  '  <li>Type: [Session Type]</li>',
  '  <li>Location: [Session Location]</li>',
  '</ul>',
  '<h3>Fees</h3>',
  '<ul>',
  '  <li>Total fee: [Total Fee]</li>',
  '  <li>Retainer due on booking: [Retainer Amount]</li>',
  '  <li>Balance of [Balance Amount], due [Final Due Date]</li>',
  '</ul>',
  '<h3>Terms</h3>',
  '<p></p>',
  '<h3>Contact</h3>',
  '<p>[Studio Name], [Studio Address], [City Name], [State/Country] — [Studio Email], [Studio Phone]</p>',
].join('\n');

/** Money and dates a sample preview reads with. Amounts are formatted in the studio's own
 *  currency by the caller; nothing here prints a symbol. */
const SAMPLE_AMOUNT: Record<string, number> = {
  'Total Fee': 1200,
  'Retainer Amount': 300,
  'Balance Amount': 900,
};

const SAMPLE_DAYS_AHEAD: Record<string, number> = {
  'Session Date': 21,
  'Final Due Date': 14,
  Today: 0,
};

const SAMPLE_TEXT: Record<string, string> = {
  'Client Name': 'Alex Morgan',
  'Client Email': 'alex.morgan@example.com',
  'Client Phone': '555 0142',
  'Session Type': 'Portrait session',
  'Session Location': 'The studio',
};

const escapeHtml = (v: string): string =>
  // split/join rather than String.replace: a replacement string treats $& and $$ as
  // backreferences, and this runs over text a photographer pasted from anywhere.
  v.split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;');

const ContractTemplatesPage: React.FC = () => {
  const { language } = useLanguage();
  const { format: formatMoney } = useStudioCurrency();

  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [view, setView] = useState<'source' | 'preview'>('source');

  const [studioValues, setStudioValues] = useState<Record<string, string>>({});
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listTemplates();
      setTemplates(Array.isArray(rows) ? rows : []);
      setLoadError(null);
    } catch (e: any) {
      setTemplates([]);
      setLoadError(e instanceof ContractApiError ? e.message : 'Could not load your contract templates.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    fetchStudioMergeValues().then((r) => {
      if (!cancelled) setStudioValues(r.values);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── The sample the preview merges with ────────────────────────────────────
  //
  // Real studio details where the browser can read them, so the header of the document
  // looks like the studio's own; a plainly artificial value everywhere else. Fields the
  // browser cannot read fall back to the field's own label ("Your country"), which reads
  // as the placeholder it is instead of inventing a country for somebody.
  const sampleValues = useMemo(() => {
    const out: Record<string, string> = {};
    for (const f of MERGE_FIELDS) {
      if (studioValues[f.key]) {
        out[f.key] = studioValues[f.key];
        continue;
      }
      if (f.key in SAMPLE_AMOUNT) {
        out[f.key] = formatMoney(SAMPLE_AMOUNT[f.key]);
        continue;
      }
      if (f.key in SAMPLE_DAYS_AHEAD) {
        const when = new Date(Date.now() + SAMPLE_DAYS_AHEAD[f.key] * 24 * 60 * 60 * 1000);
        out[f.key] = fmtDate(when.toISOString(), language);
        continue;
      }
      out[f.key] = SAMPLE_TEXT[f.key] || f.label;
    }
    return out;
  }, [studioValues, formatMoney, language]);

  // The same call the server makes. Everything the studio is told below comes out of this
  // one result — there is no second opinion on this page about what a field is.
  const merged = useMemo(() => mergeContract(draft.body, sampleValues), [draft.body, sampleValues]);
  const verdict = useMemo(() => canSend(merged), [merged]);
  const safePreview = useMemo(() => sanitizeContractHtml(merged.text), [merged.text]);

  const usedKeys = useMemo(() => fieldsUsed(draft.body), [draft.body]);
  const knownUsed = usedKeys.filter((k) => !!MERGE_FIELD_BY_KEY[k]);

  // ── Editing ───────────────────────────────────────────────────────────────

  const setBody = (body: string) => {
    setDraft((d) => ({ ...d, body }));
    setDirty(true);
    setSaved(false);
  };

  const openTemplate = (t: ContractTemplate) => {
    if (dirty && !window.confirm('You have unsaved changes to this template. Discard them?')) return;
    setDraft({ id: t.id, name: t.name, category: t.category || 'general', body: t.body || '' });
    setDirty(false);
    setSaved(false);
    setSaveError(null);
    setView('source');
  };

  const startNew = () => {
    if (dirty && !window.confirm('You have unsaved changes to this template. Discard them?')) return;
    setDraft({ ...EMPTY });
    setDirty(false);
    setSaved(false);
    setSaveError(null);
    setView('source');
  };

  /**
   * Drop a merge token where the cursor is.
   *
   * Built with slice(), never String.replace: `$&` and `$$` inside a REPLACEMENT string are
   * backreferences, and a template body is arbitrary text a photographer pasted in.
   */
  const insertField = (key: string) => {
    const token = `[${key}]`;
    const el = bodyRef.current;
    if (!el) {
      setBody(draft.body + token);
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    setBody(el.value.slice(0, start) + token + el.value.slice(end));
    // After React has re-rendered with the new value, or the caret jumps to the end and
    // the next insert lands somewhere the person was not looking.
    requestAnimationFrame(() => {
      const caret = start + token.length;
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  };

  const looksLikeMarkup = /<(p|div|h[1-6]|ul|ol|table|br)\b/i.test(draft.body);

  /**
   * Turn pasted plain text into paragraphs.
   *
   * The body is rendered as HTML on the client's page, so line breaks in pasted text
   * collapse and a contract arrives as one unbroken wall. This is offered as an explicit
   * EDIT to the source — the studio can see the result and undo it by editing — and not as
   * a transform applied on save. A save-time rewrite would mean the text somebody proofread
   * and the text stored are two different documents.
   */
  const wrapParagraphs = () => {
    const src = draft.body;
    if (!src.trim() || looksLikeMarkup) return;
    // Some pasted bodies are CRLF. Rebuild with whatever the text already uses so the
    // source does not end up with two kinds of line ending in it.
    const eol = src.includes('\r\n') ? '\r\n' : '\n';
    const blocks = src
      .split(/\r?\n\s*\r?\n/)
      .map((b) => b.trim())
      .filter(Boolean)
      .map((b) => `<p>${b.split(/\r?\n/).map(escapeHtml).join('<br />')}</p>`);
    setBody(blocks.join(eol));
  };

  const save = async () => {
    setSaveError(null);
    if (!draft.name.trim()) {
      setSaveError('Give the template a name.');
      return;
    }
    if (!draft.body.trim()) {
      setSaveError('The template has no content.');
      return;
    }
    setSaving(true);
    try {
      if (draft.id) {
        await updateTemplate(draft.id, {
          name: draft.name.trim(),
          body: draft.body,
          category: draft.category.trim() || 'general',
        });
      } else {
        const r = await createTemplate({
          name: draft.name.trim(),
          body: draft.body,
          category: draft.category.trim() || 'general',
        });
        setDraft((d) => ({ ...d, id: r.id }));
      }
      setDirty(false);
      setSaved(true);
      await load();
    } catch (e: any) {
      setSaveError(e instanceof ContractApiError ? e.message : 'Could not save the template.');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Archive rather than delete. There is no DELETE endpoint, and there should not be: a
   * contract already sent points at its template_id, and the body a client signed is a
   * snapshot that must keep making sense to look at.
   */
  const archive = async () => {
    if (!draft.id) return;
    if (!window.confirm(`Archive "${draft.name}"? It stays attached to contracts already made from it, but you will not be able to pick it for a new one.`)) {
      return;
    }
    setSaving(true);
    try {
      await updateTemplate(draft.id, { isActive: false });
      setDraft({ ...EMPTY });
      setDirty(false);
      await load();
    } catch (e: any) {
      setSaveError(e instanceof ContractApiError ? e.message : 'Could not archive the template.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-[1400px] mx-auto">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ScrollText className="w-6 h-6 text-purple-600" />
              Contract templates
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Write it once, with [merge fields] where the details go. The details are filled in when
              you make a contract for a client.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/admin/contracts"
              className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Contracts
            </Link>
            <button
              type="button"
              onClick={startNew}
              className="px-3 py-2 text-sm rounded-lg bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> New template
            </button>
          </div>
        </div>

        {loadError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{loadError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[260px,1fr] gap-6">
          {/* ── The templates themselves ── */}
          <aside className="space-y-2">
            {loading ? (
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
              </div>
            ) : templates.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600">
                No templates yet. Create one, or start from the outline in the editor.
              </div>
            ) : (
              templates.map((t) => {
                const broken = (t.fieldsUsed || []).filter((k) => !MERGE_FIELD_BY_KEY[k]);
                const active = draft.id === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => openTemplate(t)}
                    className={`w-full text-left rounded-lg border p-3 transition ${
                      active ? 'border-purple-400 bg-purple-50' : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium text-gray-900 text-sm flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="truncate">{t.name}</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {t.category || 'general'} · {(t.fieldsUsed || []).length} field
                      {(t.fieldsUsed || []).length === 1 ? '' : 's'}
                    </div>
                    {broken.length > 0 && (
                      <div className="mt-1 text-xs text-red-700 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {broken.length} unknown field{broken.length === 1 ? '' : 's'}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </aside>

          {/* ── The editor ── */}
          <section className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr,200px] gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Template name</label>
                  <input
                    value={draft.name}
                    onChange={(e) => {
                      setDraft((d) => ({ ...d, name: e.target.value }));
                      setDirty(true);
                      setSaved(false);
                    }}
                    placeholder="Portrait session agreement"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                  <input
                    value={draft.category}
                    onChange={(e) => {
                      setDraft((d) => ({ ...d, category: e.target.value }));
                      setDirty(true);
                      setSaved(false);
                    }}
                    placeholder="general"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>

            {/* ── Merge fields ── */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <h2 className="text-sm font-semibold text-gray-900">Merge fields</h2>
                <p className="text-xs text-gray-500">
                  Click one to drop it in where your cursor is. These are the only tokens the sender
                  understands.
                </p>
              </div>
              <div className="mt-3 space-y-3">
                {SOURCE_ORDER.map((source) => {
                  const fields = MERGE_FIELDS.filter((f) => f.source === source);
                  if (!fields.length) return null;
                  return (
                    <div key={source}>
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        {SOURCE_LABEL[source]}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {fields.map((f) => {
                          const inUse = knownUsed.includes(f.key);
                          return (
                            <button
                              key={f.key}
                              type="button"
                              title={f.label}
                              onClick={() => insertField(f.key)}
                              className={`px-2 py-1 rounded-md border text-xs font-mono transition ${
                                inUse
                                  ? 'border-purple-300 bg-purple-50 text-purple-800'
                                  : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              [{f.key}]
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Body + preview ── */}
            <div className="rounded-xl border border-gray-200 bg-white">
              <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-4 py-2 flex-wrap">
                <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setView('source')}
                    className={`px-3 py-1.5 text-xs flex items-center gap-1.5 ${
                      view === 'source' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700'
                    }`}
                  >
                    <Code2 className="w-3.5 h-3.5" /> Write
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('preview')}
                    className={`px-3 py-1.5 text-xs flex items-center gap-1.5 ${
                      view === 'preview' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {!draft.body.trim() && (
                    <button
                      type="button"
                      onClick={() => setBody(OUTLINE)}
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Start from an outline
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={wrapParagraphs}
                    disabled={!draft.body.trim() || looksLikeMarkup}
                    title={
                      looksLikeMarkup
                        ? 'This body already contains markup, so it is left alone.'
                        : 'Wrap blank-line-separated text in paragraphs.'
                    }
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <WrapText className="w-3.5 h-3.5" /> Paragraphs
                  </button>
                </div>
              </div>

              {view === 'source' ? (
                <textarea
                  ref={bodyRef}
                  value={draft.body}
                  onChange={(e) => setBody(e.target.value)}
                  spellCheck
                  placeholder="Write the contract here. Use the buttons above to insert [merge fields]."
                  className="w-full h-[460px] p-4 font-mono text-sm leading-relaxed outline-none resize-y rounded-b-xl"
                />
              ) : (
                <div className="p-4">
                  <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Preview with <strong>sample</strong> details. The real client, dates and amounts are
                    merged when you make a contract from this template — this shows you how it reads and
                    whether every field is one the sender knows.
                  </div>
                  {draft.body.trim() ? (
                    <div
                      className="prose prose-sm max-w-none prose-headings:font-semibold prose-a:text-blue-700 border border-gray-200 rounded-lg p-5 bg-white"
                      // Sanitised by the same allowlist parse the client's signing page uses,
                      // so this is not an approximation of what they will see.
                      dangerouslySetInnerHTML={{ __html: safePreview }}
                    />
                  ) : (
                    <p className="text-sm text-gray-500">Nothing to preview yet.</p>
                  )}
                </div>
              )}
            </div>

            {/* ── What the merge engine says about this template ── */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">Fields in this template</h2>
              {usedKeys.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No merge fields yet. A contract with no fields is the same document for every client.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {usedKeys.map((k) => {
                    const field = MERGE_FIELD_BY_KEY[k];
                    return (
                      <span
                        key={k}
                        title={field ? field.label : 'Not a merge field — this will block sending.'}
                        className={`px-2 py-1 rounded-md border text-xs font-mono ${
                          field
                            ? 'border-gray-200 bg-gray-50 text-gray-700'
                            : 'border-red-300 bg-red-50 text-red-800'
                        }`}
                      >
                        [{k}]
                      </span>
                    );
                  })}
                </div>
              )}

              {merged.unknown.length > 0 && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 flex gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    {/* canSend()'s own words, not a paraphrase — this is the sentence the studio
                        will meet again on the Send button if the template ships like this. */}
                    <p>{verdict.reason}</p>
                    <p className="mt-1 text-xs">
                      Fix the spelling, or pick the field from the palette above so the token is exact.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ── Save ── */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {draft.id ? 'Save template' : 'Create template'}
              </button>
              {draft.id && (
                <button
                  type="button"
                  onClick={archive}
                  disabled={saving}
                  className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Archive
                </button>
              )}
              {dirty && <span className="text-xs text-amber-700">Unsaved changes</span>}
              {saved && !dirty && (
                <span className="text-xs text-green-700 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Saved
                </span>
              )}
              {saveError && (
                <span className="text-xs text-red-700 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {saveError}
                </span>
              )}
            </div>
          </section>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ContractTemplatesPage;

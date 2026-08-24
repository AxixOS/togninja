import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { AlertCircle, Check, Clock, Download, FileText, Loader2, Printer } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { useLanguage } from '../../context/LanguageContext';
import { sanitizeContractHtml } from '../../lib/sanitizeContractHtml';
import SignaturePad from '../../components/contracts/SignaturePad';
import {
  encodeDrawnSignature,
  looksLikeEncodedPath,
  sanitizeTypedSignature,
  MAX_TYPED_SIGNATURE_CHARS,
  type SignatureStroke,
} from '../../../../shared/contractSignature';

// The client's half of contracts: the page a photographer's client opens from the link
// they were emailed, reads, and signs.
//
// A STANDALONE SHELL, not the marketing site. No Layout, no header, no nav. A contract is
// a document; wrapping it in a site that is trying to sell photoshoots makes it look like
// an advert with a signature box, and every link out of it is a way to lose somebody
// halfway through signing.
//
// WHAT THE SERVER WILL AND WILL NOT TELL US. GET /api/contracts/public/:token deliberately
// returns only the title, the body and the signers - no client id, no template, no other
// contract - because the token is the whole of the authorisation. This page is built to
// live inside that and must not push it wider. The one extra call it makes is to
// /api/studio-config, which is already public to every visitor of the site, purely so the
// document is headed with the studio's own name instead of being anonymous.
//
// THE OUTCOMES THAT ARE NOT ERRORS. Two of the states here are ordinary and are presented
// as such:
//
//   409 already_signed - the sign UPDATE is conditional on signed_at IS NULL, so a second
//   attempt cannot overwrite the first signature or its evidence. Somebody double-clicked,
//   or refreshed a stale tab, or two people opened the same shared link. The right answer
//   is "that is already recorded, here is where things stand", NOT a red error that makes
//   a client believe their signature failed and ring the studio about it.
//
//   410 expired - the contract's signing window closed. That is the system working, and
//   the client needs to be told what to do next rather than shown an apology.
//
// AND THE ONE THIS PAGE MUST NOT GET WRONG. The link is SHARED: one token, several signers,
// one email forwarded to a partner. So the page can never quietly assume who is holding it.
// A signer is preselected only when exactly one is left to sign AND nobody has signed on
// this device yet - because the one name left after a partner signs is the partner's, and
// a Sign button sitting under somebody else's name is the whole failure mode. With two or
// more, nothing is selected until a person picks their own name, and the confirmation they
// tick names them out loud.

interface PublicSigner {
  id: string;
  name: string;
  email: string;
  role: string;
  /** snake_case: this comes straight off the pg row. */
  signed_at: string | null;
}

interface PublicContract {
  title: string;
  body: string;
  status: string;
  signedAt: string | null;
  signers: PublicSigner[];
}

type LoadState = 'loading' | 'ready' | 'invalid' | 'expired' | 'error';

/**
 * Show enough of a co-signer's address to tell two people apart, and no more.
 *
 * The endpoint returns every signer's full email - it has to, so the studio's own tooling
 * can use it - but this page is opened by whoever holds the link. Printing both parties'
 * addresses in full turns a leaked contract link into a leaked address book, so the local
 * part is masked here. Narrowing what is DISPLAYED is not the same as narrowing what the
 * endpoint returns, and only the former is this page's business.
 */
function maskEmail(email: string): string {
  const value = String(email || '');
  const at = value.indexOf('@');
  if (at < 1) return '';
  return value.slice(0, 1) + '•••••' + value.slice(at);
}

/**
 * The page frame.
 *
 * Declared at MODULE scope, not inside the component. A component defined in the body of
 * another component is a brand new type on every render, so React unmounts and remounts
 * everything inside it - which here would wipe the signature canvas on every keystroke and
 * every state change while somebody was signing.
 */
function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <Helmet>
        {/* A contract has no business in a search index. */}
        <meta name="robots" content="noindex, nofollow" />
        <title>{title}</title>
      </Helmet>
      <div className="max-w-3xl mx-auto">{children}</div>
    </div>
  );
}

function Notice({
  tone,
  icon,
  title,
  body,
  children,
}: {
  tone: 'neutral' | 'warning' | 'good';
  icon: React.ReactNode;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  const ring =
    tone === 'good'
      ? 'border-green-200 bg-green-50'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50'
        : 'border-gray-200 bg-white';
  return (
    <div className={`rounded-xl border p-6 ${ring}`}>
      <div className="flex gap-3">
        <div className="mt-0.5 shrink-0">{icon}</div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-gray-700">{body}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function ContractSignPage() {
  const { token } = useParams<{ token: string }>();
  const { language, t } = useLanguage();
  const dateLocale = language === 'de' ? de : enUS;

  const [state, setState] = useState<LoadState>('loading');
  const [contract, setContract] = useState<PublicContract | null>(null);
  const [serverMessage, setServerMessage] = useState<string>('');
  const [studioName, setStudioName] = useState<string>('');

  const [selectedSignerId, setSelectedSignerId] = useState<string | null>(null);
  const [mode, setMode] = useState<'draw' | 'type'>('draw');
  const [strokes, setStrokes] = useState<SignatureStroke[]>([]);
  const [typedName, setTypedName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<{ complete: boolean; remaining: number } | null>(null);
  const [alreadySigned, setAlreadySigned] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      setState('invalid');
      return;
    }
    try {
      const res = await fetch(`/api/contracts/public/${encodeURIComponent(token)}`);
      if (res.status === 404) {
        setState('invalid');
        return;
      }
      if (res.status === 410) {
        const body = await res.json().catch(() => ({}));
        setServerMessage(String(body?.message || ''));
        setState('expired');
        return;
      }
      if (!res.ok) {
        setState('error');
        return;
      }
      const data = await res.json();
      setContract({ ...data, signers: Array.isArray(data?.signers) ? data.signers : [] });
      setState('ready');
    } catch {
      setState('error');
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    // The heading only. A failure here leaves the document unheaded, which is a cosmetic
    // loss; it must never stop the contract itself from rendering.
    let cancelled = false;
    fetch('/api/studio-config')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d && typeof d.studioName === 'string') setStudioName(d.studioName);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const signers = contract?.signers || [];
  // CLIENT signers only. The studio countersigns from the admin, authenticated —
  // a public token proves somebody was sent a link, not which of the named parties
  // they are, so offering the studio's own name here lets the holder sign as them.
  const signable = signers.filter((s) => (s.role || 'client') !== 'studio');
  const unsigned = signable.filter((s) => !s.signed_at);
  // "Nothing left for YOU to do" — measured over the signers this page may act for.
  // The studio countersigning elsewhere is not this visitor's business.
  const everyoneSigned = signable.length > 0 && unsigned.length === 0;

  // Preselect ONLY when there is nobody else it could be. With two names still to sign, a
  // preselected radio is an invitation for whoever opened the forwarded email to sign as
  // their partner without ever noticing whose name was in the box.
  const soleUnsignedId = unsigned.length === 1 ? unsigned[0].id : null;
  // Somebody has already signed on this device during this visit.
  const signedHere = result !== null || alreadySigned;
  useEffect(() => {
    if (soleUnsignedId && !signedHere) setSelectedSignerId((prev) => prev || soleUnsignedId);
  }, [soleUnsignedId, signedHere]);

  const selectedSigner = signers.find((s) => s.id === selectedSignerId) || null;
  const safeBody = useMemo(() => sanitizeContractHtml(contract?.body), [contract?.body]);
  const typedValue = useMemo(() => sanitizeTypedSignature(typedName), [typedName]);

  // Encoded at the end of every stroke rather than on submit, so "too detailed" is
  // something a person is told while they are still at the pad and can do something about
  // it, not after they press Sign.
  const drawnValue = useMemo(
    () => (strokes.length ? encodeDrawnSignature(strokes) : null),
    [strokes],
  );
  const drawnTooDetailed = strokes.length > 0 && drawnValue === null;
  const typedLooksEncoded = mode === 'type' && looksLikeEncodedPath(typedName);
  const signatureValue = mode === 'draw' ? drawnValue : typedValue;
  const hasSignature =
    mode === 'draw' ? !!drawnValue : typedValue.length >= 2 && !typedLooksEncoded;

  const fmt = (iso: string | null | undefined): string => {
    if (!iso) return '';
    try {
      return format(parseISO(String(iso)), 'PPP', { locale: dateLocale });
    } catch {
      return '';
    }
  };

  /**
   * Empty the signature input and the selection.
   *
   * The selection is cleared too because a couple signing on one phone is the ordinary
   * case: after one of them signs, the next person must choose their own name again rather
   * than find their partner's still selected. (The effect above re-selects automatically
   * when only one signer is left, which is the only time that is unambiguous.)
   */
  const resetSignatureInput = () => {
    setStrokes([]);
    setTypedName('');
    setAgreed(false);
    setSelectedSignerId(null);
  };

  const submit = async () => {
    setFormError(null);
    if (!selectedSignerId) {
      setFormError(t('contractSign.needSigner'));
      return;
    }
    if (typedLooksEncoded) {
      setFormError(t('contractSign.typedLooksEncoded'));
      return;
    }
    if (drawnTooDetailed) {
      setFormError(t('contractSign.tooDetailed'));
      return;
    }
    if (!hasSignature || !signatureValue) {
      setFormError(t('contractSign.needSignature'));
      return;
    }
    if (!agreed) {
      setFormError(t('contractSign.needAgree'));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/contracts/public/${encodeURIComponent(token || '')}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signerId: selectedSignerId, signature: signatureValue }),
      });

      if (res.status === 409) {
        // Not a failure. The first signature stands; show the client where things actually
        // are rather than inviting them to try again against a row that will never move.
        setAlreadySigned(true);
        setResult(null);
        resetSignatureInput();
        await load();
        return;
      }
      if (res.status === 410) {
        setState('expired');
        return;
      }
      if (res.status === 404) {
        setState('invalid');
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.warn('[contract] sign rejected:', res.status, body?.error);
        setFormError(t('contractSign.submitFailed'));
        return;
      }

      const data = await res.json();
      setAlreadySigned(false);
      setResult({ complete: !!data?.complete, remaining: Number(data?.remaining) || 0 });
      resetSignatureInput();
      await load();
    } catch {
      setFormError(t('contractSign.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  // ── The states that replace the whole page ────────────────────────────────

  const pageTitle = contract?.title || t('contractSign.documentLabel');

  if (state === 'loading') {
    return (
      <Shell title={pageTitle}>
        <div className="flex items-center justify-center gap-3 py-24 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>{t('contractSign.loading')}</span>
        </div>
      </Shell>
    );
  }

  if (state === 'invalid') {
    return (
      <Shell title={pageTitle}>
        <Notice
          tone="neutral"
          icon={<AlertCircle className="h-6 w-6 text-gray-400" />}
          title={t('contractSign.invalidTitle')}
          body={t('contractSign.invalidBody')}
        />
      </Shell>
    );
  }

  if (state === 'expired') {
    return (
      <Shell title={pageTitle}>
        <Notice
          tone="warning"
          icon={<Clock className="h-6 w-6 text-amber-500" />}
          title={t('contractSign.expiredTitle')}
          body={serverMessage || t('contractSign.expiredBody')}
        />
      </Shell>
    );
  }

  if (state === 'error' || !contract) {
    return (
      <Shell title={pageTitle}>
        <Notice
          tone="neutral"
          icon={<AlertCircle className="h-6 w-6 text-gray-400" />}
          title={t('contractSign.errorTitle')}
          body={t('contractSign.errorBody')}
        >
          <button
            type="button"
            onClick={() => {
              setState('loading');
              load();
            }}
            className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            {t('contractSign.retry')}
          </button>
        </Notice>
      </Shell>
    );
  }

  // ── The document ──────────────────────────────────────────────────────────

  return (
    <Shell title={pageTitle}>
      <header className="mb-6 text-center print:mb-4">
        {studioName ? (
          <p className="text-sm font-medium uppercase tracking-wide text-gray-500">{studioName}</p>
        ) : null}
        <h1 className="mt-1 text-2xl font-semibold text-gray-900">{contract.title}</h1>
        <p className="mt-1 text-sm text-gray-500 print:hidden">{t('contractSign.reviewNote')}</p>
      </header>

      <article className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        {safeBody ? (
          // Sanitised by client/src/lib/sanitizeContractHtml.ts - an allowlist parse, not a
          // string filter. Raw contract.body must never reach this attribute.
          <div
            className="prose prose-sm max-w-none prose-headings:font-semibold prose-a:text-blue-700"
            dangerouslySetInnerHTML={{ __html: safeBody }}
          />
        ) : (
          <p className="text-sm text-gray-500">{t('contractSign.emptyBody')}</p>
        )}
      </article>

      <div className="mt-3 flex items-center justify-end gap-4 print:hidden">
        {/* The executed copy. GET /public/:token/pdf has existed since this shipped with
            nothing anywhere linking to it, so the signed document was unreachable for the
            one person who most needs to keep it. Shown only once it IS executed - offering
            a "signed copy" of a half-signed document would be worse than offering none. */}
        {everyoneSigned && (
          <a
            href={`/api/contracts/public/${encodeURIComponent(token || '')}/pdf`}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800"
          >
            <Download className="h-4 w-4" />
            {t('contractSign.downloadSigned')}
          </a>
        )}
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800"
        >
          <Printer className="h-4 w-4" />
          {t('contractSign.print')}
        </button>
      </div>

      {/* ── Who has signed, and who has not ── */}
      {signers.length > 0 ? (
        <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">
            {t('contractSign.signaturesTitle')}
          </h2>
          <ul className="mt-3 divide-y divide-gray-100">
            {signers.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{s.name}</p>
                  <p className="truncate text-xs text-gray-500">{maskEmail(s.email)}</p>
                </div>
                {s.signed_at ? (
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                    <Check className="h-3.5 w-3.5" />
                    {t('contractSign.signedOn')} {fmt(s.signed_at)}
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                    {t('contractSign.awaiting')}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ── What just happened, if anything did ── */}
      {result ? (
        <div className="mt-6 print:hidden">
          <Notice
            tone="good"
            icon={<Check className="h-6 w-6 text-green-600" />}
            title={t('contractSign.doneTitle')}
            body={
              result.complete ? t('contractSign.doneCompleteBody') : t('contractSign.donePartialBody')
            }
          >
            {!result.complete && result.remaining > 0 ? (
              <p className="mt-2 text-sm font-medium text-gray-800">
                {t('contractSign.stillToCome')} {result.remaining}{' '}
                {result.remaining === 1 ? t('contractSign.oneMore') : t('contractSign.manyMore')}
              </p>
            ) : null}
            <p className="mt-3 text-sm text-gray-600">{t('contractSign.keepCopy')}</p>
          </Notice>
        </div>
      ) : alreadySigned ? (
        <div className="mt-6 print:hidden">
          <Notice
            tone="neutral"
            icon={<Check className="h-6 w-6 text-gray-400" />}
            title={t('contractSign.alreadyTitle')}
            body={t('contractSign.alreadyBody')}
          />
        </div>
      ) : null}

      {!result && everyoneSigned ? (
        <div className="mt-6 print:hidden">
          <Notice
            tone="good"
            icon={<Check className="h-6 w-6 text-green-600" />}
            title={t('contractSign.fullySignedTitle')}
            body={
              contract.signedAt
                ? `${t('contractSign.fullySignedOn')} ${fmt(contract.signedAt)}`
                : t('contractSign.keepCopy')
            }
          />
        </div>
      ) : null}

      {everyoneSigned ? null : (
        // ── The signing form ──
        //
        // Still rendered after a successful signature when somebody is left to sign, because
        // two people signing on one phone is the ordinary case, not an edge one. Nothing is
        // preselected for the next person, and the box they tick names them.
        <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm print:hidden">
          {unsigned.length === 0 ? (
            <p className="text-sm text-gray-600">{t('contractSign.noSigners')}</p>
          ) : (
            <>
              <h2 className="text-base font-semibold text-gray-900">{t('contractSign.whoTitle')}</h2>
              <p className="mt-1 text-sm text-gray-600">
                {unsigned.length > 1 ? t('contractSign.whoHelpMany') : t('contractSign.whoHelpOne')}
              </p>

              <fieldset className="mt-4">
                <legend className="sr-only">{t('contractSign.whoTitle')}</legend>
                <div className="space-y-2">
                  {unsigned.map((s) => {
                    const active = selectedSignerId === s.id;
                    return (
                      <label
                        key={s.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                          active
                            ? 'border-gray-900 bg-gray-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="contract-signer"
                          className="h-4 w-4"
                          checked={active}
                          onChange={() => {
                            setSelectedSignerId(s.id);
                            // Whoever is signing confirms it under their OWN name, so a box
                            // ticked against the previous selection cannot carry over.
                            setAgreed(false);
                            setFormError(null);
                          }}
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-gray-900">
                            {s.name}
                          </span>
                          <span className="block truncate text-xs text-gray-500">
                            {maskEmail(s.email)}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {!selectedSigner ? (
                <p className="mt-4 text-sm text-gray-500">{t('contractSign.chooseSigner')}</p>
              ) : (
                <div className="mt-6 border-t border-gray-100 pt-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-gray-900">
                      {t('contractSign.signatureTitle')}
                    </h3>
                    <div className="flex rounded-lg bg-gray-100 p-0.5">
                      {(['draw', 'type'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            setMode(m);
                            setFormError(null);
                          }}
                          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                            mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                          }`}
                        >
                          {m === 'draw' ? t('contractSign.tabDraw') : t('contractSign.tabType')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3">
                    {mode === 'draw' ? (
                      <SignaturePad
                        onChange={(next) => {
                          setStrokes(next);
                          setFormError(null);
                        }}
                        disabled={submitting}
                        label={t('contractSign.drawLabel')}
                        hint={t('contractSign.drawHint')}
                        clearLabel={t('contractSign.clear')}
                        undoLabel={t('contractSign.undo')}
                      />
                    ) : (
                      <div>
                        <label htmlFor="typed-signature" className="block text-sm text-gray-600">
                          {t('contractSign.typeLabel')}
                        </label>
                        <input
                          id="typed-signature"
                          type="text"
                          value={typedName}
                          maxLength={MAX_TYPED_SIGNATURE_CHARS}
                          onChange={(e) => {
                            setTypedName(e.target.value);
                            setFormError(null);
                          }}
                          disabled={submitting}
                          placeholder={t('contractSign.typePlaceholder')}
                          className="mt-2 w-full rounded-lg border-2 border-dashed border-gray-300 bg-white px-4 py-4 text-2xl text-gray-900 focus:border-gray-400 focus:outline-none"
                          style={{
                            fontFamily:
                              '"Segoe Script", "Brush Script MT", "Snell Roundhand", cursive',
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {drawnTooDetailed ? (
                    <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                      {t('contractSign.tooDetailed')}
                    </p>
                  ) : null}
                  {typedLooksEncoded ? (
                    <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                      {t('contractSign.typedLooksEncoded')}
                    </p>
                  ) : null}

                  <label className="mt-5 flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4"
                      checked={agreed}
                      disabled={submitting}
                      onChange={(e) => {
                        setAgreed(e.target.checked);
                        setFormError(null);
                      }}
                    />
                    <span className="text-sm leading-relaxed text-gray-700">
                      {t('contractSign.attestIAm')}{' '}
                      <strong className="font-semibold">{selectedSigner.name}</strong>.{' '}
                      {t('contractSign.attestBinding')}
                    </span>
                  </label>

                  {formError ? (
                    <p className="mt-4 flex items-start gap-2 text-sm text-red-700">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{formError}</span>
                    </p>
                  ) : null}

                  <button
                    type="button"
                    onClick={submit}
                    disabled={submitting || !hasSignature || !agreed}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('contractSign.submitting')}
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4" />
                        {t('contractSign.submit')}
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}
    </Shell>
  );
}

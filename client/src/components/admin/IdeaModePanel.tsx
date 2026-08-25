import React, { useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, Wand2, Loader2, AlertCircle, Camera, Eye, Tag, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

// Idea-mode editor panel: the photo-first workflow for a blog post in IDEA status.
//   1. Upload up to 5 images   -> POST /api/blog/idea/:id/images   (B2 + EXIF)
//   2. Add context + consent   -> PUT  /api/blog/idea/:id/context
//   3. Analyse images          -> POST /api/blog/idea/:id/analyze  (Vision + IPTC)
//   4. Generate draft          -> POST /api/blog/idea/:id/generate (IDEA -> DRAFT)

interface IdeaImage {
  url?: string;
  // keywords/title/caption/rating are what the PHOTOGRAPHER wrote, read off the file by
  // extractExif. Deliberately distinct from iptcWritten, which is the IPTC WE embed on
  // export — a file can be richly tagged by the studio and still show "no IPTC" here.
  exif?: {
    make?: string; model?: string; lensModel?: string;
    fNumber?: number; iso?: number; focalLength?: number;
    keywords?: string[]; title?: string; caption?: string; rating?: number;
  } | null;
  vision?: { description?: string; altText?: string; sceneKeywords?: string[]; mood?: string } | null;
  altText?: string;
  iptcWritten?: boolean;
}
interface IdeaContext { location?: string; timing?: string; people?: string; celebration?: string; commentary?: string; }
interface IdeaData { images?: IdeaImage[]; context?: IdeaContext; consent?: { given?: boolean }; }

interface Props {
  postId: string;
  title: string;
  pillar?: string;
  initialIdea?: IdeaData | null;
  onGenerated?: () => void;
}

const getAdminToken = () => (typeof window !== 'undefined' ? (localStorage.getItem('ADMIN_TOKEN') || '') : '');

// Bilingual UI strings — driven by the global EN/DE language toggle.
const STRINGS = {
  de: {
    modeTitle: 'Idee-Modus',
    intro: 'Lade bis zu 5 Fotos hoch, ergänze Kontext und lass den Artikel daraus schreiben. Reihenfolge: Fotos → Kontext → Analysieren → Entwurf erzeugen. Thema:',
    photos: 'Fotos',
    uploadPhotos: 'Fotos hochladen',
    removeImage: 'Bild entfernen',
    noCameraData: 'keine Kameradaten',
    analyzed: 'analysiert',
    notAnalyzed: 'nicht analysiert',
    iptcSet: 'IPTC gesetzt',
    noIptc: 'kein IPTC',
    yourTags: 'Ihre Stichwörter',
    stars: 'Sterne',
    contextHeading: '2. Kontext (Fakten – das Wichtigste für gute Texte)',
    location: 'Ort',
    locationPh: 'z.B. Tageslichtstudio Wien-Margareten',
    timing: 'Zeit / Jahreszeit',
    timingPh: 'z.B. Frühlingsnachmittag',
    people: 'Personen / Namen',
    peoplePh: 'z.B. Familie M. mit zwei Kindern',
    occasion: 'Anlass',
    occasionPh: 'z.B. erstes Familienshooting',
    comment: 'Kommentar / besondere Momente',
    commentPh: 'Was war besonders? Stimmung, Details …',
    consentLabel: 'Einwilligung (DSGVO):',
    consentText: 'Mir liegt die Zustimmung der abgebildeten Personen zur Veröffentlichung dieser Fotos (und genannter Namen) vor.',
    saveContext: 'Kontext speichern',
    analyzeImages: '3. Bilder analysieren',
    generateDraft: '4. Entwurf erzeugen',
    hintAnalyzeFirst: 'Erst Bilder analysieren.',
    hintConsentRequired: 'Einwilligung erforderlich.',
    hintReady: 'Erzeugt den Artikel und wechselt zu „Entwurf".',
    errMax: 'Maximal 5 Bilder pro Beitrag.',
    errUpload: 'Upload fehlgeschlagen',
    errDelete: 'Löschen fehlgeschlagen',
    errSave: 'Speichern fehlgeschlagen',
    errAnalyze: 'Analyse fehlgeschlagen',
    errGenerate: 'Generierung fehlgeschlagen',
    errConsentFirst: 'Bitte bestätige die Einwilligung, bevor du den Entwurf erzeugst.',
    savedContext: 'Kontext gespeichert.',
  },
  en: {
    modeTitle: 'Idea Mode',
    intro: 'Upload up to 5 photos, add context, and have the article written from them. Order: Photos → Context → Analyze → Generate draft. Topic:',
    photos: 'Photos',
    uploadPhotos: 'Upload photos',
    removeImage: 'Remove image',
    noCameraData: 'no camera data',
    analyzed: 'analyzed',
    notAnalyzed: 'not analyzed',
    iptcSet: 'IPTC set',
    noIptc: 'no IPTC',
    yourTags: 'your keywords',
    stars: 'stars',
    contextHeading: '2. Context (facts — the key to good copy)',
    location: 'Location',
    locationPh: 'e.g. daylight studio Vienna-Margareten',
    timing: 'Time / Season',
    timingPh: 'e.g. spring afternoon',
    people: 'People / Names',
    peoplePh: 'e.g. the M. family with two children',
    occasion: 'Occasion',
    occasionPh: 'e.g. first family shoot',
    comment: 'Comment / special moments',
    commentPh: 'What was special? Mood, details …',
    consentLabel: 'Consent (GDPR):',
    consentText: 'I have the consent of the people shown to publish these photos (and any named individuals).',
    saveContext: 'Save context',
    analyzeImages: '3. Analyze images',
    generateDraft: '4. Generate draft',
    hintAnalyzeFirst: 'Analyze images first.',
    hintConsentRequired: 'Consent required.',
    hintReady: 'Generates the article and switches to "Draft".',
    errMax: 'Maximum 5 images per post.',
    errUpload: 'Upload failed',
    errDelete: 'Delete failed',
    errSave: 'Save failed',
    errAnalyze: 'Analysis failed',
    errGenerate: 'Generation failed',
    errConsentFirst: 'Please confirm consent before generating the draft.',
    savedContext: 'Context saved.',
  },
} as const;

const IdeaModePanel: React.FC<Props> = ({ postId, title, pillar, initialIdea, onGenerated }) => {
  const { language } = useLanguage();
  const L = STRINGS[language === 'de' ? 'de' : 'en'];

  const [images, setImages] = useState<IdeaImage[]>(initialIdea?.images || []);
  const [ctx, setCtx] = useState<IdeaContext>(initialIdea?.context || {});
  const [consent, setConsent] = useState<boolean>(!!initialIdea?.consent?.given);
  const [busy, setBusy] = useState<'' | 'upload' | 'context' | 'analyze' | 'generate'>('');

  // Does this article already exist on the studio's own site?
  //
  // Two of their pages targeting one query split the signal rather than doubling it,
  // and the weaker one usually wins. Nothing anywhere showed this happening, so a studio
  // publishing weekly would quietly compete with itself for months.
  //
  // Advisory only — it never disables Generate. A gate that stops the studio writing what
  // they meant to write gets worked around, and then it protects nothing.
  const [conflicts, setConflicts] = useState<Array<{
    url: string; title: string; kind: string; score: number; shared: string[]; severity: 'warn' | 'block';
  }>>([]);

  useEffect(() => {
    let cancelled = false;
    const t = title?.trim();
    if (!t) { setConflicts([]); return; }
    (async () => {
      try {
        const r = await fetch(`/api/blog/coverage-check?title=${encodeURIComponent(t)}`, { credentials: 'include' });
        if (!r.ok) return;
        const d = await r.json();
        if (!cancelled) setConflicts(Array.isArray(d?.conflicts) ? d.conflicts : []);
      } catch { /* advisory: silence is the correct failure */ }
    })();
    return () => { cancelled = true; };
  }, [title]);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const analyzedCount = images.filter(i => i.vision).length;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    if (images.length + files.length > 5) { setError(L.errMax); return; }
    setBusy('upload'); setError(null);
    try {
      const fd = new FormData();
      Array.from(files).forEach(f => fd.append('images', f));
      const res = await fetch(`/api/blog/idea/${postId}/images`, {
        method: 'POST', headers: { 'x-admin-token': getAdminToken() }, body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || L.errUpload);
      setImages(data.images || []);
    } catch (err: any) { setError(err.message); } finally { setBusy(''); (e.target as HTMLInputElement).value = ''; }
  };

  const removeImage = async (index: number) => {
    if (busy) return;
    setError(null);
    try {
      const res = await fetch(`/api/blog/idea/${postId}/images/${index}`, {
        method: 'DELETE', headers: { 'x-admin-token': getAdminToken() },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || L.errDelete);
      setImages(data.images || []);
    } catch (err: any) { setError(err.message); }
  };

  const saveContext = async () => {
    setBusy('context'); setError(null); setSavedMsg(null);
    try {
      const res = await fetch(`/api/blog/idea/${postId}/context`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-token': getAdminToken() },
        body: JSON.stringify({ context: ctx, consent: { given: consent } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || L.errSave);
      setSavedMsg(L.savedContext);
    } catch (err: any) { setError(err.message); } finally { setBusy(''); }
  };

  const analyze = async () => {
    setBusy('analyze'); setError(null);
    try {
      const res = await fetch(`/api/blog/idea/${postId}/analyze`, {
        method: 'POST', headers: { 'x-admin-token': getAdminToken() },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || L.errAnalyze);
      setImages(data.images || []);
    } catch (err: any) { setError(err.message); } finally { setBusy(''); }
  };

  const generate = async () => {
    if (!consent) { setError(L.errConsentFirst); return; }
    setBusy('generate'); setError(null);
    try {
      // persist latest context/consent first
      await fetch(`/api/blog/idea/${postId}/context`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-token': getAdminToken() },
        body: JSON.stringify({ context: ctx, consent: { given: consent } }),
      });
      const res = await fetch(`/api/blog/idea/${postId}/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-token': getAdminToken() },
        body: JSON.stringify({ pillar }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || L.errGenerate);
      onGenerated ? onGenerated() : window.location.reload();
    } catch (err: any) { setError(err.message); setBusy(''); }
  };

  const field = (label: string, key: keyof IdeaContext, placeholder: string, area = false) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {area ? (
        <textarea value={ctx[key] || ''} onChange={e => setCtx({ ...ctx, [key]: e.target.value })}
          rows={2} placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
      ) : (
        <input value={ctx[key] || ''} onChange={e => setCtx({ ...ctx, [key]: e.target.value })}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-center text-purple-800 font-medium"><Wand2 size={18} className="mr-2" /> {L.modeTitle}</div>
        <p className="text-sm text-purple-700 mt-1">
          {L.intro} <strong>{title}</strong>
        </p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start"><AlertCircle className="h-5 w-5 mr-2 mt-0.5" /><span>{error}</span></div>}
      {savedMsg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm">{savedMsg}</div>}

      {/* 1. Images */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold flex items-center mb-3"><ImageIcon size={18} className="mr-2" /> 1. {L.photos} ({images.length}/5)</h3>
        {images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            {images.map((img, i) => (
              <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="relative">
                  {img.url && <img src={img.url} alt={img.altText || ''} className="w-full h-32 object-cover" />}
                  <button type="button" onClick={() => removeImage(i)} disabled={!!busy}
                    title={L.removeImage}
                    className="absolute top-1 right-1 bg-white/90 hover:bg-red-600 hover:text-white text-gray-700 rounded-full p-1 shadow disabled:opacity-50">
                    <X size={14} />
                  </button>
                </div>
                <div className="p-2 space-y-1 text-xs">
                  <div className="flex items-center gap-1 text-gray-600"><Camera size={12} />{img.exif?.model || img.exif?.make || L.noCameraData}</div>
                  <div className={`flex items-center gap-1 ${img.vision ? 'text-green-600' : 'text-gray-400'}`}><Eye size={12} />{img.vision ? L.analyzed : L.notAnalyzed}</div>
                  <div className={`flex items-center gap-1 ${img.iptcWritten ? 'text-green-600' : 'text-gray-400'}`}><Tag size={12} />{img.iptcWritten ? L.iptcSet : L.noIptc}</div>
                  {/* What the photographer already wrote. Shown because it is the answer
                      to "why did it describe my photo that way" — these words are handed
                      to the model, and the star rating decides which frame leads. */}
                  {(img.exif?.keywords?.length || img.exif?.rating != null) && (
                    <div className="flex items-center gap-1 text-purple-700" title={img.exif?.keywords?.join(", ")}>
                      <Tag size={12} />
                      <span className="truncate">
                        {img.exif?.keywords?.length ? `${img.exif.keywords.length} ${L.yourTags}` : null}
                        {img.exif?.keywords?.length && img.exif?.rating != null ? " · " : null}
                        {img.exif?.rating != null ? `${img.exif.rating} ${L.stars}` : null}
                      </span>
                    </div>
                  )}
                  {img.exif?.title && (
                    <div className="text-gray-500 truncate" title={img.exif.title}>„{img.exif.title}"</div>
                  )}
                  {img.altText && <div className="text-gray-500 truncate" title={img.altText}>„{img.altText}"</div>}
                </div>
              </div>
            ))}
          </div>
        )}
        {images.length < 5 && (
          <label className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer text-sm">
            {busy === 'upload' ? <Loader2 size={16} className="animate-spin mr-2" /> : <Upload size={16} className="mr-2" />}
            {L.uploadPhotos}
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} disabled={busy === 'upload'} />
          </label>
        )}
      </div>

      {/* 2. Context + consent */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
        <h3 className="font-semibold">{L.contextHeading}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field(L.location, 'location', L.locationPh)}
          {field(L.timing, 'timing', L.timingPh)}
          {field(L.people, 'people', L.peoplePh)}
          {field(L.occasion, 'celebration', L.occasionPh)}
        </div>
        {field(L.comment, 'commentary', L.commentPh, true)}
        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1" />
          <span><strong>{L.consentLabel}</strong> {L.consentText}</span>
        </label>
        <button type="button" onClick={saveContext} disabled={busy === 'context'}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm disabled:opacity-50">
          {busy === 'context' ? <Loader2 size={16} className="animate-spin inline mr-2" /> : null} {L.saveContext}
        </button>
      </div>

      {/* Cannibalisation notice. Placed ABOVE the generate row so it is read before the
          button, not discovered afterwards in the published article. */}
      {conflicts.length > 0 && (
        <div className={`rounded-lg border p-4 ${
          conflicts[0].severity === 'block'
            ? 'border-red-300 bg-red-50'
            : 'border-amber-300 bg-amber-50'
        }`}>
          <p className={`text-sm font-semibold ${
            conflicts[0].severity === 'block' ? 'text-red-800' : 'text-amber-800'
          }`}>
            {conflicts[0].severity === 'block'
              ? 'You have already published this'
              : 'You have already covered this ground'}
          </p>
          <p className="mt-1 text-sm text-gray-700">
            {conflicts[0].severity === 'block'
              ? 'Publishing a second article on the same query splits your ranking between the two rather than doubling it — and the weaker one usually wins. Change the angle, or update the existing page instead.'
              : 'Take a distinct angle and link to the page below as the authority, rather than competing with it.'}
          </p>
          <ul className="mt-2 space-y-1">
            {conflicts.map((c) => (
              <li key={c.url} className="text-sm">
                <a href={c.url} target="_blank" rel="noopener noreferrer"
                  className="font-medium text-purple-700 underline hover:text-purple-900">
                  {c.title}
                </a>
                <span className="text-gray-500">
                  {' '}— {Math.round(c.score * 100)}% overlap on: {c.shared.join(', ')}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-gray-500">
            The writer is told about this either way, and will link rather than repeat. You can still generate.
          </p>
        </div>
      )}

      {/* 3. Analyse + generate */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <button type="button" onClick={analyze} disabled={busy === 'analyze' || images.length === 0}
          className="px-5 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50 flex items-center">
          {busy === 'analyze' ? <Loader2 size={16} className="animate-spin mr-2" /> : <Eye size={16} className="mr-2" />}
          {L.analyzeImages} {analyzedCount > 0 && `(${analyzedCount}/${images.length})`}
        </button>
        <button type="button" onClick={generate} disabled={busy === 'generate' || analyzedCount === 0 || !consent}
          className="px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center">
          {busy === 'generate' ? <Loader2 size={16} className="animate-spin mr-2" /> : <Wand2 size={16} className="mr-2" />}
          {L.generateDraft}
        </button>
        <span className="text-xs text-gray-500">
          {analyzedCount === 0 ? L.hintAnalyzeFirst : !consent ? L.hintConsentRequired : L.hintReady}
        </span>
      </div>
    </div>
  );
};

export default IdeaModePanel;

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { LandingPageRecord } from '../../types/landingPage.types';
import LandingPageInlineTextField from './LandingPageInlineTextField';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, ImageIcon, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  page: LandingPageRecord;
  title: string;
  onTitleChange: (title: string) => void;
}

interface VoucherProduct { id: string; slug: string; name: string; price: string | number; }

// YouTube/Vimeo → embeddable URL (null for a direct .mp4, which uses <video>).
function heroVideoEmbedUrl(url: string): string | null {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

export default function LandingPageSettingsPanel({ page, title, onTitleChange }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const p = page as any;
  const [voucherSlug, setVoucherSlug] = useState<string>(p.cta_voucher_slug || '');
  // Button destination when there's no voucher (e.g. school-portrait enquiries).
  const [ctaAction, setCtaAction] = useState<string>(p.cta_action || 'enquire');
  const [ctaEmail, setCtaEmail] = useState<string>(p.cta_email || '');
  const [ctaWhatsapp, setCtaWhatsapp] = useState<string>(p.cta_whatsapp || '');
  const [offerAmount, setOfferAmount] = useState<string>(p.cta_voucher_amount != null ? String(p.cta_voucher_amount) : '');
  const [offerTitle, setOfferTitle] = useState<string>(p.cta_voucher_title || '');
  const [heroImage, setHeroImage] = useState<string>(p.hero_image_url || '');
  const [heroVideo, setHeroVideo] = useState<string>(p.hero_video_url || '');
  const [videoPlacement, setVideoPlacement] = useState<string>(p.hero_video_placement || 'hero');
  const [videoPosition, setVideoPosition] = useState<string>(p.hero_video_position || 'top');
  // Which field just auto-saved (shows an inline green ✓ for a few seconds).
  const [savedFlash, setSavedFlash] = useState<string | null>(null);
  const SavedTick = ({ field }: { field: string }) =>
    savedFlash === field ? (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-600">
        <Check className="h-3 w-3" /> Saved
      </span>
    ) : null;

  // ONE dropdown that drives both stored columns (placement + position).
  const VIDEO_POS_MAP: Record<string, { placement: string; position: string }> = {
    hero: { placement: 'hero', position: 'top' },
    below: { placement: 'below', position: 'top' },
    middle: { placement: 'below', position: 'middle' },
    end: { placement: 'below', position: 'end' },
    both: { placement: 'both', position: 'top' },
  };
  const unifiedVideoPos = (() => {
    if (videoPlacement === 'hero') return 'hero';
    if (videoPlacement === 'both') return 'both';
    if (videoPosition === 'middle') return 'middle';
    if (videoPosition === 'end') return 'end';
    return 'below';
  })();
  const setUnifiedVideoPos = (val: string) => {
    const { placement, position } = VIDEO_POS_MAP[val] || VIDEO_POS_MAP.below;
    setVideoPlacement(placement);
    setVideoPosition(position);
    savePatch({ hero_video_placement: placement, hero_video_position: position });
  };
  const [products, setProducts] = useState<VoucherProduct[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Drag-to-fit hero crop: object-position (x/y in %) + zoom. Drag the
  // preview to choose the visible area; saved per page and applied 1:1 on
  // the public hero.
  const parsePos = (raw: any): { x: number; y: number; zoom: number } => {
    try {
      const v = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return {
        x: Math.min(100, Math.max(0, Number(v?.x ?? 50))),
        y: Math.min(100, Math.max(0, Number(v?.y ?? 25))),
        zoom: Math.min(2, Math.max(1, Number(v?.zoom ?? 1))),
      };
    } catch { return { x: 50, y: 25, zoom: 1 }; }
  };
  const [heroPos, setHeroPos] = useState(() => parsePos(p.hero_image_position));
  const posRef = useRef(heroPos);
  posRef.current = heroPos;
  const previewRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const startHeroDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    const rect = previewRef.current?.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const start = { ...posRef.current };
    const onMove = (ev: MouseEvent) => {
      if (!rect) return;
      // Dragging right shows more of the image's left side → x decreases.
      const dx = ((ev.clientX - startX) / rect.width) * 100;
      const dy = ((ev.clientY - startY) / rect.height) * 100;
      setHeroPos({
        x: Math.min(100, Math.max(0, start.x - dx)),
        y: Math.min(100, Math.max(0, start.y - dy)),
        zoom: start.zoom,
      });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setDragging(false);
      saveField('hero_image_position', JSON.stringify(posRef.current));
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const setZoom = (zoom: number) => {
    setHeroPos((prev) => ({ ...prev, zoom }));
  };
  const commitZoom = () => saveField('hero_image_position', JSON.stringify(posRef.current));

  useEffect(() => {
    fetch('/api/vouchers/products', { credentials: 'include' })
      .then(r => (r.ok ? r.json() : []))
      .then(rows => setProducts(Array.isArray(rows) ? rows : (rows?.products || [])))
      .catch(() => {});
  }, []);

  // Persist a single page column (partial update — the editor's content save
  // doesn't touch these columns, so there's no clobber).
  // Persist one or more page columns in a single request.
  const savePatch = async (patch: Record<string, string | null>): Promise<boolean> => {
    try {
      const res = await fetch(`/api/admin/landing-pages/${page.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error('Save failed');
      // Reflect the saved columns in the editor's cached page so the live
      // preview updates immediately, without a refetch that would reseed &
      // wipe unsaved section edits.
      qc.setQueryData(['landing-page', page.id], (old: any) => (old ? { ...old, ...patch } : old));
      // Obvious, in-place confirmation (settings auto-save, so the top Save
      // button never lights up for them).
      const first = Object.keys(patch)[0];
      setSavedFlash(first);
      window.setTimeout(() => setSavedFlash((cur) => (cur === first ? null : cur)), 3000);
      toast({ title: 'Saved', description: 'Setting updated.' });
      return true;
    } catch {
      toast({ title: 'Save failed', description: 'Could not save the setting.', variant: 'destructive' });
      return false;
    }
  };
  const saveField = (field: string, value: string | null): Promise<boolean> => savePatch({ [field]: value });

  // Dedicated save-status for the hero video, so the button gives an
  // unambiguous Saving… → Saved ✓ signal (with a progress bar).
  const [videoSaveStatus, setVideoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveVideoUrl = async () => {
    setVideoSaveStatus('saving');
    const ok = await saveField('hero_video_url', heroVideo.trim() || null);
    setVideoSaveStatus(ok ? 'saved' : 'error');
    if (ok) window.setTimeout(() => setVideoSaveStatus('idle'), 4000);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload/image', { method: 'POST', credentials: 'include', body: fd });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      const url = data.url;
      setHeroImage(url);
      await saveField('hero_image_url', url);
    } catch {
      toast({ title: 'Upload failed', description: 'Could not upload the image.', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-gray-900">Page Settings</h3>
      <p className="flex items-start gap-1.5 rounded-md bg-blue-50 border border-blue-100 px-2.5 py-1.5 text-[11px] text-blue-700">
        <Check className="h-3.5 w-3.5 mt-px flex-shrink-0" />
        <span>These settings <strong>save automatically</strong> when you change them — you don’t need the top “Save” button (that’s only for the section content on the left). Look for the green “✓ Saved”.</span>
      </p>

      <LandingPageInlineTextField
        label="Page Title"
        value={title}
        onChange={onTitleChange}
        placeholder="Landing page title"
      />

      <div className="space-y-2 text-xs text-gray-500">
        <div className="flex justify-between"><span>Type</span><span className="font-medium text-gray-700">{page.page_type || 'Custom'}</span></div>
        {page.primary_service && <div className="flex justify-between"><span>Service</span><span className="font-medium text-gray-700">{page.primary_service}</span></div>}
        {page.city && <div className="flex justify-between"><span>City</span><span className="font-medium text-gray-700">{page.city}</span></div>}
        {page.target_audience && <div className="flex justify-between"><span>Audience</span><span className="font-medium text-gray-700 text-right max-w-[160px] truncate">{page.target_audience}</span></div>}
        {page.offer_summary && <div className="flex justify-between"><span>Offer</span><span className="font-medium text-gray-700 text-right max-w-[160px] truncate">{page.offer_summary}</span></div>}
      </div>

      {/* CTA → dynamic-priced voucher offer */}
      <div className="pt-4 border-t space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-gray-700">Voucher offer — CTA price</Label>
          <span className="flex gap-1.5"><SavedTick field="cta_voucher_amount" /><SavedTick field="cta_voucher_title" /></span>
        </div>
        <div className="flex gap-2">
          <input
            type="number" min="0" step="1" value={offerAmount}
            onChange={(e) => setOfferAmount(e.target.value)}
            onBlur={() => saveField('cta_voucher_amount', offerAmount && Number(offerAmount) > 0 ? offerAmount : null)}
            placeholder="€ e.g. 225"
            className="w-24 border border-gray-300 rounded-md px-2 py-2 text-sm focus:ring-2 focus:ring-purple-500"
          />
          <input
            type="text" value={offerTitle}
            onChange={(e) => setOfferTitle(e.target.value)}
            onBlur={() => saveField('cta_voucher_title', offerTitle || null)}
            placeholder="Offer title (defaults to page title)"
            className="flex-1 border border-gray-300 rounded-md px-2 py-2 text-sm focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <p className="text-xs text-gray-400">
          Set a price and the “Jetzt buchen” CTA sends buyers to personalise &amp; pay <b>exactly this amount</b>
          via Stripe (they download/print the voucher after). This overrides the product below.
        </p>
      </div>

      {/* CTA → Voucher product binding (fixed price; used only if no offer price above) */}
      <div className="pt-4 border-t space-y-2">
        <Label className="text-xs font-semibold text-gray-700">Voucher product (fixed-price alternative)</Label>
        <select
          value={voucherSlug}
          onChange={(e) => { setVoucherSlug(e.target.value); saveField('cta_voucher_slug', e.target.value || null); }}
          className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm focus:ring-2 focus:ring-purple-500"
        >
          <option value="">— Voucher list (/vouchers) —</option>
          {products.map(pr => (
            <option key={pr.id} value={pr.slug}>{pr.name} — €{Number(pr.price).toFixed(0)}</option>
          ))}
        </select>
        <p className="text-xs text-gray-400">
          The CTA sends buyers straight to this product's personalize → Stripe checkout at its price.
          Manage products in <span className="font-medium">Online Voucher Sales</span>.
        </p>
      </div>

      {/* CTA destination when there's NO voucher (enquiry-style pages) */}
      <div className="pt-4 border-t space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-gray-700">Button action (when no voucher)</Label>
          <SavedTick field="cta_action" />
        </div>
        <select
          value={ctaAction}
          onChange={(e) => { setCtaAction(e.target.value); saveField('cta_action', e.target.value); }}
          className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm focus:ring-2 focus:ring-purple-500"
        >
          <option value="enquire">Contact page (default)</option>
          <option value="waitlist">Waitlist page</option>
          <option value="email">Open an email to us</option>
          <option value="whatsapp">Open WhatsApp chat</option>
        </select>
        <p className="text-xs text-gray-400">
          Used only if no voucher offer/product is set above — ideal for enquiry pages like school portraits.
        </p>

        {ctaAction === 'email' && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-gray-600">Send enquiries to (email)</Label>
              <SavedTick field="cta_email" />
            </div>
            <input
              type="email"
              value={ctaEmail}
              onChange={(e) => setCtaEmail(e.target.value)}
              onBlur={() => saveField('cta_email', ctaEmail.trim() || null)}
              placeholder="hallo@yourstudio.com"
              className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-[11px] text-gray-400">Leave blank to use your studio's contact email. Opens the visitor's mail app with a subject pre-filled.</p>
          </div>
        )}

        {ctaAction === 'whatsapp' && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-gray-600">WhatsApp number</Label>
              <SavedTick field="cta_whatsapp" />
            </div>
            <input
              type="tel"
              value={ctaWhatsapp}
              onChange={(e) => setCtaWhatsapp(e.target.value)}
              onBlur={() => saveField('cta_whatsapp', ctaWhatsapp.trim() || null)}
              placeholder="+43 660 1234567"
              className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-[11px] text-gray-400">Include the country code. Leave blank to use your studio's phone number. Opens WhatsApp with a message pre-filled.</p>
          </div>
        )}
      </div>

      {/* Hero media */}
      <div className="pt-4 border-t space-y-3">
        <Label className="text-xs font-semibold text-gray-700">Hero image</Label>
        {heroImage ? (
          // Miniature of the REAL hero (same crop + overlay + headline) that
          // is also the crop TOOL: drag the image to choose the visible area,
          // zoom with the slider. Saved per page, applied 1:1 on the public
          // hero.
          <div
            ref={previewRef}
            onMouseDown={startHeroDrag}
            className={`relative aspect-[5/2] rounded-md border overflow-hidden select-none ${dragging ? 'cursor-grabbing ring-2 ring-purple-400' : 'cursor-grab'}`}
          >
            <img
              src={heroImage}
              alt="Hero"
              draggable={false}
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                objectPosition: `${heroPos.x}% ${heroPos.y}%`,
                transform: heroPos.zoom > 1 ? `scale(${heroPos.zoom})` : undefined,
                transformOrigin: `${heroPos.x}% ${heroPos.y}%`,
              }}
            />
            <div className="absolute inset-0 bg-black/55 pointer-events-none" />
            <div className="absolute inset-0 flex items-center justify-center px-3 pointer-events-none">
              <p className="text-white text-[10px] font-extrabold text-center leading-tight line-clamp-2">
                {((p as any).content_json?.hero?.headline as string) || p.hero_headline || 'Ihre Headline'}
              </p>
            </div>
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => { setHeroImage(''); saveField('hero_image_url', null); }}
              className="absolute top-1 right-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded"
            >Remove</button>
            <span className="absolute bottom-1 left-1 bg-black/50 text-white/80 text-[9px] px-1.5 py-0.5 rounded pointer-events-none">
              ✥ Ziehen zum Ausrichten
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-center h-20 border-2 border-dashed border-gray-200 rounded-md text-gray-400">
            <ImageIcon className="h-5 w-5 mr-2" /> <span className="text-xs">No hero image</span>
          </div>
        )}
        {heroImage && (
          <div className="flex items-center gap-2">
            <Label className="text-[10px] text-gray-500 shrink-0">Zoom</Label>
            <input
              type="range"
              min={1}
              max={2}
              step={0.05}
              value={heroPos.zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              onMouseUp={commitZoom}
              onTouchEnd={commitZoom}
              className="w-full accent-purple-600"
            />
            <span className="text-[10px] text-gray-500 w-8 text-right">{heroPos.zoom.toFixed(2)}×</span>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
        <Button variant="outline" size="sm" className="w-full gap-2" disabled={uploading}
          onClick={() => fileRef.current?.click()}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? 'Uploading…' : 'Upload hero image'}
        </Button>

        <LandingPageInlineTextField
          label="Hero video URL (optional — .mp4, YouTube or Vimeo)"
          value={heroVideo}
          onChange={setHeroVideo}
          placeholder="https://youtu.be/… or https://…/video.mp4"
        />
        <Button
          type="button"
          variant={videoSaveStatus === 'saved' ? 'default' : 'outline'}
          size="sm"
          className={`w-full gap-2 ${videoSaveStatus === 'saved' ? 'bg-green-600 hover:bg-green-600 text-white' : ''}`}
          disabled={videoSaveStatus === 'saving'}
          onClick={saveVideoUrl}
        >
          {videoSaveStatus === 'saving' ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
          ) : videoSaveStatus === 'saved' ? (
            <><Check className="h-4 w-4" /> Saved ✓</>
          ) : (
            <>Save video URL</>
          )}
        </Button>
        {/* Progress bar while the save is in flight (built-in animate-pulse) */}
        {videoSaveStatus === 'saving' && (
          <div className="h-1.5 w-full overflow-hidden rounded bg-purple-100" role="progressbar" aria-label="Saving video URL">
            <div className="h-full w-full bg-purple-600 animate-pulse" />
          </div>
        )}
        {videoSaveStatus === 'error' && (
          <p className="text-xs text-red-600">Save failed — please try again.</p>
        )}

        {/* Live preview — confirms the URL saved AND shows the actual embed so
            you can tell at a glance whether the hero video will play. */}
        {heroVideo.trim() && (
          <div className="mt-1">
            <p className="text-[11px] font-medium text-gray-500 mb-1">Preview</p>
            <div className="relative w-full overflow-hidden rounded-md bg-black" style={{ paddingTop: '56.25%' }}>
              {heroVideoEmbedUrl(heroVideo) ? (
                <iframe
                  className="absolute inset-0 h-full w-full"
                  src={heroVideoEmbedUrl(heroVideo)!}
                  title="Hero video preview"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  loading="lazy"
                />
              ) : (
                <video className="absolute inset-0 h-full w-full object-cover" src={heroVideo} controls muted playsInline />
              )}
            </div>
            {heroVideo !== (p.hero_video_url || '') && (
              <p className="text-[11px] text-amber-600 mt-1">Not saved yet — click “Save video URL”.</p>
            )}
          </div>
        )}
        <p className="text-xs text-gray-400">Paste a direct .mp4 link or a YouTube/Vimeo URL, then click Save.</p>

        {/* ONE dropdown for where the video goes — shown on every landing page. */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-gray-600">Video placement</Label>
            <SavedTick field="hero_video_placement" />
          </div>
          <select
            value={unifiedVideoPos}
            onChange={(e) => setUnifiedVideoPos(e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="hero">As the hero image (background, behind the headline)</option>
            <option value="below">Below the hero</option>
            <option value="middle">In the middle of the page</option>
            <option value="end">At the bottom of the page (above the footer)</option>
            <option value="both">Both — hero background + a section below</option>
          </select>
          <p className="text-[11px] text-gray-400">
            {!heroVideo.trim()
              ? 'Add a Hero video URL above to activate this. Your choice is remembered for this page.'
              : unifiedVideoPos === 'hero'
              ? 'The video plays muted & looping behind the hero (a dark overlay keeps text readable); it takes priority over the hero image.'
              : unifiedVideoPos === 'both'
              ? 'The video plays behind the hero AND again as a section just below it.'
              : unifiedVideoPos === 'below'
              ? 'The hero shows your image; the video plays in its own section just below.'
              : unifiedVideoPos === 'middle'
              ? 'The hero shows your image; the video plays in its own section in the middle of the page.'
              : 'The hero shows your image; the video plays in its own section at the bottom, above the footer.'}
          </p>
        </div>
      </div>
    </div>
  );
}

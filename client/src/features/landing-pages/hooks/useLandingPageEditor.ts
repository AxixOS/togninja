import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getEditableLandingPage, updateLandingPageDraft, suggestLandingPageFields } from '../services/landingPageEditor.client';
import { normalizeLandingPageContent, serializeEditorContent } from '../utils/normalizeLandingPageContent';
import { moveSectionUp, moveSectionDown, toggleSectionVisibility, removeSection, updateSectionData } from '../utils/landingPageEditor.helpers';
import { applySectionPatch } from '../utils/applySectionPatch';
import { evaluateLandingPagePublishReadiness } from '../utils/landingPageReadiness';
import type { LandingPageRecord } from '../types/landingPage.types';
import type { LandingPageGeneratedContent } from '../types/landingPageGeneration.types';
import type { LandingPageSectionKey, LandingPageContentMeta, LandingPageSeoState, LandingPagePublishReadinessResult, LandingPageSectionAlignment } from '../types/landingPageEditor.types';

export function useLandingPageEditor(pageId: string) {
  const qc = useQueryClient();

  // Fetch the page
  const { data: page, isLoading, error: fetchError } = useQuery<LandingPageRecord>({
    queryKey: ['landing-page', pageId],
    queryFn: () => getEditableLandingPage(pageId),
    enabled: !!pageId,
  });

  // Local editor state
  const [content, setContent] = useState<LandingPageGeneratedContent | null>(null);
  const [meta, setMeta] = useState<LandingPageContentMeta | null>(null);
  const [seo, setSeo] = useState<LandingPageSeoState>({ seoTitle: '', metaDescription: '', keyphrase: '', slug: '' });
  const [title, setTitle] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<LandingPageSectionKey | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Initialize from fetched page. Only reseed when the CONTENT actually changed
  // (initial load or a revision restore) — NOT when only a settings column
  // (hero_video_url, hero_image_url, …) changes via the Settings panel. Without
  // this guard, saving a setting refetched the page and wiped any unsaved
  // section edits back to the last-saved content.
  const lastContentRef = useRef<string | null>(null);
  useEffect(() => {
    if (!page) return;
    const cjStr = JSON.stringify(page.content_json ?? null);
    if (lastContentRef.current === cjStr) return;
    lastContentRef.current = cjStr;
    const { content: norm, meta: normMeta } = normalizeLandingPageContent(page.content_json as Record<string, unknown>);
    setContent(norm);
    setMeta(normMeta);
    setTitle(page.title || '');
    setSeo({
      seoTitle: norm.seo?.seoTitle || page.seo_title || '',
      metaDescription: norm.seo?.metaDescription || page.meta_description || '',
      keyphrase: norm.seo?.keyphrase || '',
      slug: page.slug || '',
    });
    setLastSavedAt(page.updated_at || null);
  }, [page]);

  // Mark dirty on any change
  const markDirty = useCallback(() => setIsDirty(true), []);

  // Section updates
  const updateSection = useCallback((key: LandingPageSectionKey, data: unknown) => {
    setContent(prev => prev ? updateSectionData(prev, key, data) : prev);
    markDirty();
  }, [markDirty]);

  const handleMoveSectionUp = useCallback((key: LandingPageSectionKey) => {
    setMeta(prev => prev ? { ...prev, sectionOrder: moveSectionUp(prev.sectionOrder, key) } : prev);
    markDirty();
  }, [markDirty]);

  const handleMoveSectionDown = useCallback((key: LandingPageSectionKey) => {
    setMeta(prev => prev ? { ...prev, sectionOrder: moveSectionDown(prev.sectionOrder, key) } : prev);
    markDirty();
  }, [markDirty]);

  const handleToggleVisibility = useCallback((key: LandingPageSectionKey) => {
    setMeta(prev => prev ? { ...prev, sectionVisibility: toggleSectionVisibility(prev.sectionVisibility, key) } : prev);
    markDirty();
  }, [markDirty]);

  const handleSetAlignment = useCallback((key: LandingPageSectionKey, align: LandingPageSectionAlignment) => {
    setMeta(prev => {
      if (!prev) return prev;
      const current = prev.sectionAlignment || {};
      // 'center' is the default → drop the key rather than storing it.
      const next = { ...current };
      if (align === 'center') delete next[key];
      else next[key] = align;
      return { ...prev, sectionAlignment: next };
    });
    markDirty();
  }, [markDirty]);

  const handleRemoveSection = useCallback((key: LandingPageSectionKey) => {
    if (!content || !meta) return;
    const result = removeSection(content, meta, key);
    setContent(result.content);
    setMeta(result.meta);
    markDirty();
  }, [content, meta, markDirty]);

  const handleApplyPatch = useCallback((sectionKey: LandingPageSectionKey, patchData: unknown) => {
    if (!content || !meta) return;
    const result = applySectionPatch(content, meta, sectionKey, patchData);
    setContent(result.content);
    setMeta(result.meta);
    markDirty();
  }, [content, meta, markDirty]);

  const updateSeoField = useCallback((field: keyof LandingPageSeoState, value: string) => {
    setSeo(prev => ({ ...prev, [field]: value }));
    markDirty();
  }, [markDirty]);

  const updateTitle = useCallback((newTitle: string) => {
    setTitle(newTitle);
    markDirty();
  }, [markDirty]);

  // One-click: ask the AI to fill the recommended/optional fields, applying
  // each suggestion ONLY where the field is currently empty (never overwrites
  // copy the user already wrote). Returns how many fields were filled.
  const [isSuggesting, setIsSuggesting] = useState(false);
  const suggestFields = useCallback(async (): Promise<{ filled: number }> => {
    if (!page || !content) return { filled: 0 };
    setIsSuggesting(true);
    try {
      const { suggestions } = await suggestLandingPageFields(page.id);
      const isEmpty = (v: unknown) => !String(v ?? '').trim();
      let filled = 0;

      // Compute the merge synchronously from CURRENT state so the fill count is
      // accurate and markDirty actually fires. (Counting inside a setState
      // updater ran after this function returned → count was always 0, changes
      // weren't marked dirty, and the optional fields looked un-suggested.)

      // Hero: eyebrow (optional), subheadline (recommended), secondary CTA
      // (optional), badge (optional) — fill each only if currently empty.
      const heroSug = suggestions.hero || {};
      const hero: any = { ...(content.hero || {}) };
      let heroChanged = false;
      (['eyebrow', 'subheadline', 'secondaryCtaText', 'badgeText'] as const).forEach(f => {
        if (isEmpty(hero[f]) && !isEmpty((heroSug as any)[f])) {
          hero[f] = (heroSug as any)[f]; filled++; heroChanged = true;
        }
      });
      if (heroChanged) updateSection('hero', hero);

      // Final CTA secondary button (optional)
      if (content.finalCta) {
        const fc: any = { ...content.finalCta };
        if (isEmpty(fc.secondaryCtaText) && !isEmpty(suggestions.finalCta?.secondaryCtaText)) {
          fc.secondaryCtaText = suggestions.finalCta!.secondaryCtaText; filled++;
          updateSection('finalCta', fc);
        }
      }

      // SEO focus keyphrase (recommended)
      const kp = suggestions.seo?.keyphrase;
      if (isEmpty(seo.keyphrase) && !isEmpty(kp)) {
        updateSeoField('keyphrase', kp!); filled++;
      }

      return { filled };
    } finally {
      setIsSuggesting(false);
    }
  }, [page, content, seo, updateSection, updateSeoField]);

  // Save
  const save = useCallback(async () => {
    if (!page || !content || !meta) return;
    setIsSaving(true);
    setSaveError(null);

    // Sync SEO into content before save
    const updatedContent = {
      ...content,
      seo: {
        ...content.seo,
        seoTitle: seo.seoTitle,
        metaDescription: seo.metaDescription,
        keyphrase: seo.keyphrase,
        suggestedSlug: seo.slug,
      },
    };

    try {
      const payload = {
        title,
        slug: seo.slug,
        seo_title: seo.seoTitle,
        meta_description: seo.metaDescription,
        hero_headline: updatedContent.hero?.headline || '',
        hero_subheadline: updatedContent.hero?.subheadline || '',
        cta_text: updatedContent.hero?.primaryCtaText || updatedContent.finalCta?.primaryCtaText || '',
        content_json: serializeEditorContent(updatedContent, meta),
      };

      await updateLandingPageDraft(page.id, payload);
      const now = new Date().toISOString();
      setLastSavedAt(now);
      setIsDirty(false);
      qc.invalidateQueries({ queryKey: ['landing-page', pageId] });
      qc.invalidateQueries({ queryKey: ['landing-page-revisions', pageId] });
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  }, [page, content, meta, title, seo, pageId, qc]);

  // Readiness
  const readiness = useMemo<LandingPagePublishReadinessResult>(() => {
    if (!page) return { isReady: false, errors: [], warnings: [], completedChecks: [], missingCriticalSections: [] };
    // Build a virtual page record with local edits for real-time readiness
    const virtual: LandingPageRecord = {
      ...page,
      title,
      slug: seo.slug,
      seo_title: seo.seoTitle,
      meta_description: seo.metaDescription,
      content_json: content ? serializeEditorContent(content, meta!) as any : page.content_json,
    };
    return evaluateLandingPagePublishReadiness(virtual);
  }, [page, title, seo, content, meta]);

  return {
    // Data
    page,
    content,
    meta,
    seo,
    title,
    readiness,

    // State
    isLoading,
    fetchError,
    isDirty,
    isSaving,
    lastSavedAt,
    saveError,
    activeSection,

    // Actions
    setActiveSection,
    updateSection,
    updateTitle,
    updateSeoField,
    moveSectionUp: handleMoveSectionUp,
    moveSectionDown: handleMoveSectionDown,
    toggleVisibility: handleToggleVisibility,
    setAlignment: handleSetAlignment,
    removeSection: handleRemoveSection,
    applyPatch: handleApplyPatch,
    suggestFields,
    isSuggesting,
    save,
  };
}

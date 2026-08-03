import type { LandingPageSeoState } from '../../types/landingPageEditor.types';
import LandingPageInlineTextField from './LandingPageInlineTextField';
import LandingPageInlineTextarea from './LandingPageInlineTextarea';

interface Props {
  seo: LandingPageSeoState;
  onUpdate: (field: keyof LandingPageSeoState, value: string) => void;
}

export default function LandingPageSeoPanel({ seo, onUpdate }: Props) {
  const titleLen = seo.seoTitle?.length ?? 0;
  const descLen = seo.metaDescription?.length ?? 0;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">SEO Settings</h3>

      <LandingPageInlineTextField
        label="SEO Title"
        value={seo.seoTitle}
        onChange={v => onUpdate('seoTitle', v)}
        placeholder="Page title for search engines"
        maxLength={70}
        importance="required"
        helperText={titleLen > 60 ? '⚠️ Over 60 characters' : `${titleLen}/60 recommended`}
      />

      <LandingPageInlineTextarea
        label="Meta Description"
        value={seo.metaDescription}
        onChange={v => onUpdate('metaDescription', v)}
        placeholder="Brief description for search results"
        rows={3}
        maxLength={170}
        importance="required"
        helperText={descLen > 160 ? '⚠️ Over 160 characters' : `${descLen}/160 recommended`}
      />

      <LandingPageInlineTextField
        label="Focus Keyphrase"
        value={seo.keyphrase}
        onChange={v => onUpdate('keyphrase', v)}
        placeholder="e.g., family photography vienna"
        importance="recommended"
        helperText="The primary keyword this page should rank for"
      />

      {/* Google SERP preview */}
      <div className="bg-white border rounded-lg p-3 space-y-1">
        <p className="text-xs text-gray-400 mb-2">Search Preview</p>
        <p className="text-blue-700 text-sm font-medium truncate">
          {seo.seoTitle || 'Page Title'}
        </p>
        <p className="text-green-700 text-xs truncate">
          yoursite.com/lp/{seo.slug || 'your-slug'}
        </p>
        <p className="text-gray-600 text-xs line-clamp-2">
          {seo.metaDescription || 'Meta description will appear here...'}
        </p>
      </div>
    </div>
  );
}

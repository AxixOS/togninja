import { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { SITE } from '../../config/site';

const LABELS: Record<string, { name: string; flag: string }> = {
  en: { name: 'English', flag: '🇬🇧' },
  de: { name: 'Deutsch', flag: '🇩🇪' },
  fr: { name: 'Français', flag: '🇫🇷' },
  es: { name: 'Español', flag: '🇪🇸' },
};

interface Props {
  className?: string;
  /** Override selection handling (the public header also swaps the localized URL). */
  onSelect?: (lang: string) => void;
}

/**
 * Language chooser shown in the public + admin headers. Lists only the studio's
 * enabled languages (from LanguageContext, fed by /api/i18n/settings). Renders
 * nothing when a studio has a single language, so it never clutters single-language sites.
 */
export default function LanguageSelector({ className = '', onSelect }: Props) {
  const { language, setLanguage, enabledLanguages } = useLanguage() as any;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Fall back to the studio's OWN language, not a hardcoded ['en','de'] pair. That
  // fallback put a German option in front of every studio that had not explicitly
  // configured its languages — including English-market ones, which then offered
  // visitors a translation they never asked for.
  const langs: string[] = enabledLanguages && enabledLanguages.length
    ? enabledLanguages
    : [(SITE.lang || 'en').slice(0, 2).toLowerCase()];
  if (langs.length <= 1) return null;

  const cur = LABELS[language] || LABELS.en;
  const choose = (l: string) => { (onSelect || setLanguage)(l); setOpen(false); };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-sm hover:opacity-80"
        aria-label="Choose language"
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline">{cur.flag} {cur.name}</span>
        <span className="sm:hidden">{cur.flag}</span>
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {langs.map((l) => {
            const info = LABELS[l] || { name: l.toUpperCase(), flag: '' };
            return (
              <button
                key={l}
                type="button"
                onClick={() => choose(l)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <span>{info.flag} {info.name}</span>
                {language === l && <Check className="w-4 h-4 text-purple-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useQuery } from '@tanstack/react-query';

/**
 * The handful of words the landing page supplies itself.
 *
 * Almost everything on a landing page is the studio's own copy. These four strings are not —
 * they are written into the components, and all of them were written in German:
 *
 *   "Häufige Fragen"                     the FAQ heading
 *   "Jetzt buchen"                       the DEFAULT call to action, used whenever a page
 *                                        has no cta_text of its own
 *   "Alle Bewertungen auf Google ansehen" the reviews link
 *
 * Every studio built from this image shipped them, so a Brighton photographer's page was
 * headed "Häufige Fragen" and its main button said "Jetzt buchen". The CTA one is the worst
 * of the three: it is the fallback, so it appears exactly when a studio has not customised
 * the page — which is every page on the day they launch.
 *
 * Two of these are worse than a label, because they leave the building: the call to action
 * composes an email subject ("Anfrage: ...") and a WhatsApp message ("Hallo, ich
 * interessiere mich für: ...") that a member of the public then sends TO the studio. A
 * visitor to a Brighton photographer's page pressed enquire and sent them German.
 *
 * Same shape as documentLabels() on the server, deliberately: one map, keyed by language,
 * with English as the fallback for any language not yet translated. Adding a language means
 * adding a row here and nothing else.
 */

export interface PublicLabels {
  faqHeading: string;
  ctaDefault: string;
  allReviews: string;
  /** Subject of the enquiry email the CTA composes, given the page title. */
  enquirySubject: (title: string) => string;
  /** Opening of the WhatsApp message the CTA composes, given the page title. */
  enquiryMessage: (title: string) => string;
}

const LABELS: Record<string, PublicLabels> = {
  en: {
    faqHeading: 'Common questions',
    ctaDefault: 'Book now',
    allReviews: 'Read all reviews on Google',
    enquirySubject: (t) => `Enquiry: ${t}`,
    enquiryMessage: (t) => `Hello, I'm interested in: ${t}`,
  },
  de: {
    faqHeading: 'Häufige Fragen',
    ctaDefault: 'Jetzt buchen',
    allReviews: 'Alle Bewertungen auf Google ansehen',
    enquirySubject: (t) => `Anfrage: ${t}`,
    enquiryMessage: (t) => `Hallo, ich interessiere mich für: ${t}`,
  },
  fr: {
    faqHeading: 'Questions fréquentes',
    ctaDefault: 'Réserver',
    allReviews: 'Voir tous les avis sur Google',
    enquirySubject: (t) => `Demande : ${t}`,
    enquiryMessage: (t) => `Bonjour, je suis intéressé par : ${t}`,
  },
  es: {
    faqHeading: 'Preguntas frecuentes',
    ctaDefault: 'Reservar ahora',
    allReviews: 'Ver todas las reseñas en Google',
    enquirySubject: (t) => `Consulta: ${t}`,
    enquiryMessage: (t) => `Hola, me interesa: ${t}`,
  },
};

/** English for anything not translated — never a blank label, never the origin's German. */
export function labelsFor(language?: string | null): PublicLabels {
  const key = String(language || '').slice(0, 2).toLowerCase();
  return LABELS[key] || LABELS.en;
}

/**
 * The studio's site language, for display.
 *
 * Distinct from useSiteLanguage(), which deliberately returns null until the studio's
 * EXPLICIT choice is known because it drives URL rewriting and a wrong guess would 301 real
 * paths. A label has the opposite requirement: it must render something immediately, and the
 * cost of being briefly wrong is a word that changes, not a redirect. So this one takes
 * `lang`, which carries the fallback, and renders English until the answer arrives.
 */
export function usePublicLabels(): PublicLabels {
  const { data } = useQuery({
    queryKey: ['public-site-language'],
    queryFn: async () => {
      const r = await fetch('/api/studio-config');
      if (!r.ok) return null;
      const d = await r.json();
      return String(d?.lang || d?.routeLanguage || '').slice(0, 2).toLowerCase() || null;
    },
    staleTime: 5 * 60 * 1000,
  });

  return labelsFor(data);
}

/**
 * VERIFIED FIGURES — DO NOT REDUCE.
 *
 * These cover a career across three phases (confirmed by the client):
 *   1997–2000  Olan Mills            — up to 40 sessions/day
 *   2004–2012  four studios, South Africa — ~30 shoots/week
 *   2012–present  Vienna, 1050       — ~60 shoots/month
 *
 * Sanity check: 5,431,867 / 27,046 = 200.8 images per session — the figures
 * reconcile with the client's stated capture rate.
 *
 * ⚠️ If an SEO/audit tool ever flags these as "inconsistent" with smaller
 * numbers elsewhere on the site, the resolution is ALWAYS to raise the smaller
 * numbers — NEVER to lower these. (An earlier audit wrongly flagged them as
 * implausible; that was corrected.)
 *
 * Single source of truth: prefer reading numbers from here rather than
 * hardcoding them in components.
 */
export const STATS = {
  families: 27046,
  portraits: 5431867,
  careerSince: 1997,
  viennaSince: 2012,
  yearsExperience: 25, // display as "über 25 Jahre"
  googleRating: 4.8, // confirm current live value before display
  googleReviewCount: null as number | null, // client to supply
} as const;

/** German thousands separators, e.g. 27046 → "27.046", 5431867 → "5.431.867". */
export const formatDe = (n: number): string => n.toLocaleString('de-DE');

/** Rounded, share-safe labels that hold whether the exact figure is 27.046 or higher. */
export const STAT_LABELS = {
  familiesRounded: 'über 27.000', // families
  portraitsRounded: '5 Mio.', // portraits
} as const;

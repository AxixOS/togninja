// PublicLandingPageSeoFooter — Phase 4
import { SITE } from '../../../../config/site';

interface PublicLandingPageSeoFooterProps {
  city?: string | null;
}

/**
 * The copyright line on a generated page, in the studio's own name.
 *
 * IT USED TO INVENT ONE. The line was
 *
 *     {city ? `Studio ${city}` : 'TogNinja Photography'}
 *
 * so a real studio's site read "© 2026 Studio Austria" — a business that does not exist,
 * assembled out of a location — while the site footer directly beneath it said
 * "Van Lonsprech Photography". Reported as "copyright notice always generic".
 *
 * Both halves of that ternary were wrong, and the fallback is the worse of the two: with no
 * city it printed OUR product's name on a customer's public page, which is not merely generic
 * but false, and a copyright line is the one place on a website that is a legal assertion of
 * who owns it.
 *
 * SITE.name is the identity the server injects per tenant (see server/lib/siteIdentity.ts) and
 * is what the site footer, header and SEO defaults already use — so this now agrees with the
 * rest of the page instead of contradicting it two lines apart. It is guaranteed non-empty:
 * config/site.ts falls back to a neutral "My Studio" rather than to any real name.
 *
 * The city stays, as a LOCATION beside the name rather than as the name itself. That was the
 * SEO intent and it is a reasonable one — it just cannot be allowed to stand in for who the
 * business is.
 */
export function PublicLandingPageSeoFooter({ city }: PublicLandingPageSeoFooterProps) {
  const town = (city || '').trim();
  return (
    <footer className="bg-gray-900 text-gray-400 py-8 px-6 text-center text-sm">
      <p>
        © {new Date().getFullYear()} {SITE.name}
        {town ? ` · ${town}` : ''}
      </p>
    </footer>
  );
}

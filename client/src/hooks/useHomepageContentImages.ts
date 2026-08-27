import { useQuery } from '@tanstack/react-query';

/**
 * The two content photographs a studio uploads during onboarding, for the page that is actually
 * their homepage.
 *
 * WHY THIS EXISTS. The wizard asks for three images — a hero and two content blocks — stores all
 * three in homepage_images, and until now displayed one. `content-1` and `content-2` were read
 * by exactly one file, client/src/pages/HomePage.tsx, the built-in template. Onboarding sets
 * studio_configs.homepage_landing_slug, so "/" serves the GENERATED landing page instead, and
 * that renderer had no idea those images existed. A studio uploaded three photographs, paid to
 * store them, and saw one.
 *
 * ONLY ON THE HOMEPAGE. These are homepage images, and the same renderer draws every pillar
 * page. Handing them to all of them would put the same two photographs on "Wildlife Prints",
 * "Photography Courses" and every other service page — which is worse than showing nothing,
 * because it looks deliberate. So this returns images only when the slug being rendered IS the
 * studio's homepage slug, and null everywhere else.
 */
export interface HomepageContentImages {
  /** Beside the opening section. Null unless this page is the homepage and one was uploaded. */
  one: { url: string; alt: string | null } | null;
  /** Beside the second section. */
  two: { url: string; alt: string | null } | null;
}

const EMPTY: HomepageContentImages = { one: null, two: null };

export function useHomepageContentImages(slug: string | undefined): HomepageContentImages {
  const { data: config } = useQuery({
    queryKey: ['/api/studio-config'],
    queryFn: async () => (await fetch('/api/studio-config')).json(),
    staleTime: 5 * 60_000,
  });

  const homeSlug: string | null = config?.homepageLandingSlug ?? null;
  const isHomepage = !!slug && !!homeSlug && slug === homeSlug;

  const { data: images } = useQuery({
    queryKey: ['/api/homepage/images', 'content'],
    queryFn: async () => (await fetch('/api/homepage/images')).json(),
    // Not fetched at all on a pillar page. The answer would be discarded, and a public page
    // should not make a request whose result it has already decided to ignore.
    enabled: isHomepage,
    staleTime: 5 * 60_000,
  });

  if (!isHomepage || !Array.isArray(images)) return EMPTY;

  const pick = (section: string) => {
    const hit = images.find((i: any) => i?.section === section && i?.url);
    return hit ? { url: String(hit.url), alt: hit.alt ? String(hit.alt) : null } : null;
  };

  return { one: pick('content-1'), two: pick('content-2') };
}

import { useQuery } from '@tanstack/react-query';

/**
 * The two content photographs for the page being rendered.
 *
 * WHY THIS EXISTS. Onboarding asks for a hero and two content blocks, stores all three, and
 * until v1.9.182 displayed one: `content-1` and `content-2` were read only by the built-in
 * HomePage template, while onboarding sets studio_configs.homepage_landing_slug so "/" serves
 * the GENERATED page instead. A studio uploaded three photographs and saw one.
 *
 * WHY IT IS NO LONGER HOMEPAGE-ONLY. It used to return images for the homepage and nothing
 * anywhere else, and that was right at the time: there were exactly two content photographs
 * in the whole system, so handing them to every page would have put the same two pictures on
 * "Boudoir Photography", "Queer Wedding Photography" and every other service — which is worse
 * than showing none, because it looks deliberate.
 *
 * What changed is supply. The crawl records forty of a studio's own photographs and the
 * assignment gives each page its OWN pair, stored under that page's slug. The objection was
 * never "pages other than the homepage should not have photographs" — it was "they must not
 * all have the SAME photographs", and that still holds: nothing here reads another page's
 * images, and the assignment never uses one picture twice.
 *
 * A service page on a photographer's website with no photograph on it is the thing this
 * exists to stop.
 */
export interface PageContentImages {
  /** Beside the opening section. Null when this page has none. */
  one: { url: string; alt: string | null } | null;
  /** Beside the second section. */
  two: { url: string; alt: string | null } | null;
}

const EMPTY: PageContentImages = { one: null, two: null };

/**
 * The section keys a page's content photographs are stored under.
 *
 * The homepage keeps 'content-1' / 'content-2' because that is what onboarding has always
 * written and what the wizard's slots are named; renaming them would orphan every studio's
 * existing images. Every other page is keyed by its own slug.
 */
export function contentSectionsFor(slug: string, homepageSlug: string | null): [string, string] {
  if (homepageSlug && slug === homepageSlug) return ['content-1', 'content-2'];
  return [`page-${slug}-1`, `page-${slug}-2`];
}

export function useHomepageContentImages(slug: string | undefined): PageContentImages {
  const { data: config } = useQuery({
    queryKey: ['/api/studio-config'],
    queryFn: async () => (await fetch('/api/studio-config')).json(),
    staleTime: 5 * 60_000,
  });

  const homeSlug: string | null = config?.homepageLandingSlug ?? null;

  const { data: images } = useQuery({
    queryKey: ['/api/homepage/images', 'content'],
    queryFn: async () => (await fetch('/api/homepage/images')).json(),
    // One request serves every page — the rows are small and the same response answers the
    // homepage and every pillar, so a visitor moving between them pays for it once.
    enabled: !!slug,
    staleTime: 5 * 60_000,
  });

  if (!slug || !Array.isArray(images)) return EMPTY;

  const [keyOne, keyTwo] = contentSectionsFor(slug, homeSlug);

  const pick = (section: string) => {
    const hit = images.find((i: any) => i?.section === section && i?.url);
    return hit ? { url: String(hit.url), alt: hit.alt ? String(hit.alt) : null } : null;
  };

  return { one: pick(keyOne), two: pick(keyTwo) };
}

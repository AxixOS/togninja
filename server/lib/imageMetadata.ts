// Image metadata for public-facing images (blog, portfolio, website).
//
// The upload pipelines re-encode with sharp, which STRIPS all EXIF/IPTC/XMP by
// default. That erases the photographer's copyright/credit before the image is
// ever served — bad for attribution and for Google Images' credit/licensable
// surfacing. Passing these options to sharp's `.withMetadata()`:
//   #1 PRESERVES the input image's metadata (EXIF/XMP/ICC) through the re-encode, and
//   #2 STAMPS the studio's copyright + creator (EXIF Copyright/Artist) on every image,
//      so even a bare upload carries "© <year> <studio>".
//
// Note: sharp writes EXIF to both JPEG and WebP; legacy IPTC (JPEG APP13) can't be
// written by sharp, but EXIF Copyright/Artist + any preserved XMP cover the same
// intent and are what Google reads.

export interface StudioMetadataOpts {
  exif: { IFD0: Record<string, string> };
}

/**
 * Build sharp `.withMetadata()` options that keep input metadata and stamp the
 * studio's copyright/creator. `businessName` falls back to BUSINESS_NAME env.
 */
export function studioImageMetadata(businessName?: string): StudioMetadataOpts {
  const name = (businessName || process.env.BUSINESS_NAME || '').trim();
  const year = new Date().getFullYear();
  const IFD0: Record<string, string> = {
    Copyright: name ? `© ${year} ${name}` : `© ${year}`,
  };
  if (name) IFD0.Artist = name;
  return { exif: { IFD0 } };
}

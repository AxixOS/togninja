import { Helmet } from 'react-helmet-async';
import { SITE } from '../../config/site';

interface ServiceSchemaProps {
  serviceName: string;
  description: string;
  url: string;
  image?: string;
  priceRange?: string;
  serviceType?: string;
}

/**
 * JSON-LD Service Schema component for service pages
 * Adds structured data for better SEO visibility
 */
export function ServiceSchema({
  serviceName,
  description,
  url,
  image = `${SITE.url}/og-default.jpg`,
  priceRange = '€€',
  serviceType = 'PhotographyService'
}: ServiceSchemaProps) {
  const siteUrl = SITE.url;
  const fullUrl = url.startsWith('http') ? url : `${siteUrl}${url}`;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: serviceType,
    name: serviceName,
    description: description,
    url: fullUrl,
    image: image,
    provider: {
      '@type': 'LocalBusiness',
      '@id': `${siteUrl}/#business`,
      name: SITE.name,
      url: siteUrl,
      telephone: SITE.phone,
      email: SITE.email,
      priceRange: priceRange,
      // Address comes from the studio's own identity, and is omitted entirely when
      // unset. This was hardcoded to Wehrgasse 11A, 1050 Wien with Vienna coordinates
      // and fixed opening hours — asserted by every instance, on every service page.
      // Geo and opening hours are dropped outright: there is no per-studio source for
      // either, and guessing them is the bug.
      ...(SITE.address.street || SITE.address.city || SITE.address.postalCode || SITE.address.country
        ? {
            address: {
              '@type': 'PostalAddress',
              ...(SITE.address.street ? { streetAddress: SITE.address.street } : {}),
              ...(SITE.address.city ? { addressLocality: SITE.address.city } : {}),
              ...(SITE.address.postalCode ? { postalCode: SITE.address.postalCode } : {}),
              ...(SITE.address.country ? { addressCountry: SITE.address.country } : {}),
            },
          }
        : {}),
    },
    ...(SITE.address.city
      ? { areaServed: { '@type': 'City', name: SITE.address.city } }
      : {}),
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: `${serviceName} Pakete`,
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: `${serviceName} - Basic Paket`
          }
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: `${serviceName} - Premium Paket`
          }
        }
      ]
    }
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}

export default ServiceSchema;

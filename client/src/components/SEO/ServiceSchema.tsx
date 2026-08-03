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
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Wehrgasse 11A/2+5',
        addressLocality: 'Wien',
        postalCode: '1050',
        addressCountry: 'AT',
        addressRegion: 'Wien'
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: 48.191130,
        longitude: 16.356010
      },
      openingHoursSpecification: [
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          opens: '09:00',
          closes: '18:00'
        },
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: 'Saturday',
          opens: '10:00',
          closes: '16:00'
        }
      ]
    },
    areaServed: {
      '@type': 'City',
      name: 'Wien',
      '@id': 'https://www.wikidata.org/wiki/Q1741'
    },
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

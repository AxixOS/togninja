import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { SITE } from '../../config/site';

/**
 * "Our Clients" logo wall — brands THIS studio has photographed for.
 *
 * All logos are SELF-HOSTED WebP under /clients/ (previously hot-linked from the
 * free host postimg.cc, which had no uptime guarantee). Collisions were removed:
 * Erste Group + Design District + a duplicate Leier were sharing another brand's
 * file. Links are rel="nofollow" so the wall doesn't leak link equity site-wide.
 */
const PartnerLogos: React.FC = () => {
  const { language } = useLanguage();

  // The roster is per-studio and EMPTY by default. It used to hardcode one studio's
  // client list — Erste Bank, Mattel, Canon, SPAR, OeBB, Eurovision, Stadt Wien and
  // ~30 more — which every instance then published as its OWN clients, logos and all,
  // with alt text reading "client of {studio name}". Naming third-party brands as
  // customers of a business that has never worked with them is not a branding leak.
  // Until a studio can manage its own roster, the wall stays empty and hidden.
  const clients: { file: string; name: string; link: string }[] = [];


  const altFor = (name: string) =>
    language === 'de'
      ? `Firmenlogo ${name} – Kunde von ${SITE.name}`
      : `Company logo ${name} – client of ${SITE.name}`;

  // Nothing to show → render nothing, rather than an empty "Our Clients" heading.
  if (clients.length === 0) return null;

  return (
    <section className="bg-gray-50 py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
          {language === 'de' ? 'Unsere Kunden' : 'Our Clients'}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8">
          {clients.map((c) => (
            <a
              key={c.file}
              href={c.link}
              target="_blank"
              // nofollow: trust signals, not editorial endorsements.
              rel="noopener noreferrer nofollow"
              className="bg-white rounded-lg p-4 flex items-center justify-center shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              title={c.name}
            >
              <img
                src={`/clients/${c.file}.webp`}
                alt={altFor(c.name)}
                loading="lazy"
                decoding="async"
                width={160}
                height={64}
                className="max-h-16 w-auto object-contain transition-transform hover:scale-105"
                onError={(e) => {
                  const tile = e.currentTarget.closest('a') as HTMLElement | null;
                  if (tile) tile.style.display = 'none';
                }}
              />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PartnerLogos;

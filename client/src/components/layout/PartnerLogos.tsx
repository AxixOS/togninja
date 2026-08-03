import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * "Our Clients" logo wall — brands New Age Fotografie has photographed for.
 *
 * All logos are SELF-HOSTED WebP under /clients/ (previously hot-linked from the
 * free host postimg.cc, which had no uptime guarantee). Collisions were removed:
 * Erste Group + Design District + a duplicate Leier were sharing another brand's
 * file. Links are rel="nofollow" so the wall doesn't leak link equity site-wide.
 */
const PartnerLogos: React.FC = () => {
  const { language } = useLanguage();

  const clients = [
    { file: 'erste-bank', name: 'Erste Bank', link: 'https://www.erstebank.at' },
    { file: 'open-day', name: 'Open Day', link: 'https://www.openday.at' },
    { file: 'bank-austria', name: 'Bank Austria', link: 'https://www.bankaustria.at' },
    { file: 'kira-kinder', name: 'KIRA Kinder', link: 'https://www.kira.at' },
    { file: 'mattel', name: 'Mattel', link: 'https://www.mattel.com' },
    { file: 'remax', name: 'RE/MAX', link: 'https://www.remax.at' },
    { file: 'vapiano', name: 'Vapiano', link: 'https://www.vapiano.at' },
    { file: 'volksbank', name: 'Volksbank', link: 'https://www.volksbank.at' },
    { file: 'trayport', name: 'Trayport', link: 'https://www.trayport.com' },
    { file: 'canon', name: 'Canon', link: 'https://www.canon.at' },
    { file: 'spar', name: 'SPAR', link: 'https://www.spar.at' },
    { file: 'stadt-wien', name: 'Stadt Wien', link: 'https://www.wien.gv.at' },
    { file: 'nielsen', name: 'Nielsen', link: 'https://www.nielsen.com' },
    { file: 'wiener-musikverein', name: 'Wiener Musikverein', link: 'https://www.musikverein.at' },
    { file: 'derenko', name: 'Derenko', link: 'https://www.derenko.at' },
    { file: 'eurovision', name: 'Eurovision Song Contest', link: 'https://www.eurovision.tv' },
    { file: 'google-trusted-photographer', name: 'Google Trusted Photographer', link: 'https://www.google.com/streetview/trusted' },
    { file: 'igepha', name: 'IGEPHA', link: 'https://www.igepha.at' },
    { file: 'q19', name: 'Q19', link: 'https://www.q19.at' },
    { file: 'kieninger-lagler', name: 'Kieninger Lagler', link: 'https://www.kieninger-lagler.at' },
    { file: 'kleine-herzen', name: 'Kleine Herzen', link: 'https://www.kleineherzen.at' },
    { file: 'smartex', name: 'smartex', link: 'https://www.smartex.at' },
    { file: 'porr', name: 'PORR', link: 'https://www.porr.at' },
    { file: 'seeff-properties', name: 'Seeff Properties', link: 'https://www.seeff.com' },
    { file: 'leier', name: 'Leier', link: 'https://www.leier.at' },
    { file: 'liechtenstein-gruppe', name: 'Liechtenstein Gruppe', link: 'https://www.liechtensteingruppe.at' },
    { file: 'oebb', name: 'ÖBB', link: 'https://www.oebb.at' },
    { file: 'mydays', name: 'MyDays', link: 'https://www.mydays.at' },
    { file: 'qualified-austrian-photographer', name: 'Qualified Austrian Photographer', link: 'https://www.wkw.at' },
    { file: 'rih', name: 'RIH', link: 'https://www.rih.at' },
    { file: 'stekovics', name: 'Stekovics', link: 'https://www.stekovics.at' },
  ];

  const altFor = (name: string) =>
    language === 'de'
      ? `Firmenlogo ${name} – Kunde von New Age Fotografie`
      : `Company logo ${name} – client of New Age Fotografie`;

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

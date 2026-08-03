import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Career-history band — the evidence behind the stats.
 *
 * The homepage shows very large figures (27.000+ families, 5M+ portraits). Those
 * are real, but a visitor who only sees "Wien seit 2012" does the arithmetic and
 * disbelieves them. This section supplies the story AND the workings so the
 * numbers reconcile in plain sight, and closes with the conversion argument:
 * trained to do it in ten minutes, now gives you a full hour.
 *
 * Used on the homepage (under the stats band) and atop /warum-new-age-fotografie/.
 */
const CareerStorySection: React.FC = () => {
  const { language } = useLanguage();
  const de = language === 'de';

  const phases = de
    ? [
        { years: '1997–2000', place: 'Olan Mills (UK)', detail: 'Bis zu 40 Porträtsitzungen am Tag. Dort haben wir gelernt, in zehn Minuten ein echtes Lächeln einzufangen.' },
        { years: '2004–2012', place: 'Vier eigene Studios, Südafrika', detail: 'Als „New Age Portraits" – rund 30 Shootings pro Woche.' },
        { years: 'Seit 2012', place: 'Unser Studio in Wien, 1050', detail: 'Rund 60 Shootings pro Monat – jetzt mit einer vollen Stunde Zeit für Ihre Familie.' },
      ]
    : [
        { years: '1997–2000', place: 'Olan Mills (UK)', detail: 'Up to 40 portrait sittings a day. That is where we learned to catch a real smile in ten minutes.' },
        { years: '2004–2012', place: 'Four own studios, South Africa', detail: 'As “New Age Portraits" – around 30 shoots a week.' },
        { years: 'Since 2012', place: 'Our studio in Vienna, 1050', detail: 'Around 60 shoots a month – now with a full hour for your family.' },
      ];

  return (
    <section className="py-14 md:py-16 bg-white border-t border-gray-100" aria-labelledby="career-story-heading">
      <div className="container mx-auto px-4 max-w-4xl">
        <h2 id="career-story-heading" className="text-2xl md:text-4xl font-bold text-center text-purple-900 mb-3">
          {de ? 'Fast 30 Jahre. Drei Länder. Über 27.000 Familien.' : 'Almost 30 years. Three countries. Over 27,000 families.'}
        </h2>
        <p className="text-center text-gray-600 max-w-2xl mx-auto mb-10">
          {de
            ? 'Die großen Zahlen auf dieser Seite sind echt – hier ist, wie sie zustande kommen.'
            : 'The big numbers on this page are real — here is how they add up.'}
        </p>

        {/* The three career phases */}
        <ol className="relative border-l-2 border-purple-200 ml-3 space-y-8">
          {phases.map((p, i) => (
            <li key={i} className="pl-6">
              <span className="absolute -left-[9px] mt-1 h-4 w-4 rounded-full bg-purple-600 ring-4 ring-purple-100" aria-hidden="true" />
              <div className="text-sm font-semibold uppercase tracking-wide text-purple-600">{p.years}</div>
              <div className="text-lg font-bold text-gray-900">{p.place}</div>
              <p className="text-gray-700">{p.detail}</p>
            </li>
          ))}
        </ol>

        {/* The workings — the reconciliation, shown explicitly */}
        <div className="mt-10 rounded-2xl bg-purple-50 p-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-purple-700 mb-2">
            {de ? 'Die Rechnung' : 'The maths'}
          </p>
          <p className="text-lg md:text-xl font-semibold text-purple-900">
            {de
              ? '≈ 27.000 Sitzungen × ≈ 200 Bilder pro Sitzung = über 5 Millionen Porträts'
              : '≈ 27,000 sessions × ≈ 200 images per session = over 5 million portraits'}
          </p>
          <p className="text-gray-700 mt-2">
            {de
              ? 'Über fast drei Jahrzehnte, auf drei Kontinenten – die Zahlen gehen auf.'
              : 'Across nearly three decades on three continents — the figures reconcile.'}
          </p>
        </div>

        {/* The conversion argument */}
        <p className="text-center text-lg md:text-xl font-medium text-gray-900 mt-8">
          {de
            ? 'Damals zehn Minuten pro Familie. Heute eine volle Stunde für Ihre.'
            : 'Back then, ten minutes per family. Today, a full hour for yours.'}
        </p>
      </div>
    </section>
  );
};

export default CareerStorySection;

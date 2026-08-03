import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, MapPin, Phone, Star, Linkedin, Instagram, Facebook } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { RelatedTopicsBlock } from '../../components/SEO/RelatedTopicsBlock';
import { PillarLinksBlock } from '../../components/SEO/PillarLinksBlock';
import { SEOHead } from '../../components/SEO/SEOHead';
import { SITE } from '../../config/site';
import { useLanguage } from '../../context/LanguageContext';

const UeberUnsPage: React.FC = () => {
  const { language, t } = useLanguage();
  const de = language === 'de';

  // Founder photo: prefer the one uploaded in Settings → Manual Website Update
  // → "About Us / Über uns" → Founder Photo (stored as a URL). If none is set,
  // fall back to a file dropped at /team/simon-parrott.jpg. t() returns the raw
  // key when unset, so treat that as "not set".
  const managed = t('manual.ueberuns.founderPhoto');
  const managedPhoto = managed && managed !== 'manual.ueberuns.founderPhoto' ? managed : '';
  const SIMON_PHOTO = managedPhoto || '/team/simon-parrott.jpg';

  // Founder-story paragraphs are editable in Settings → Manual Website Update →
  // "About Us / Über uns" → Founder Story (per language). t() returns the raw
  // key when unset, so fall back to the built-in copy below in that case.
  const mv = (key: string, fallback: React.ReactNode): React.ReactNode => {
    const v = t(key);
    return v && v !== key ? v : fallback;
  };
  const SIMON_LINKEDIN = 'https://www.linkedin.com/in/simon-parrott-192b5867/';
  const SIMON_INSTAGRAM = 'https://www.instagram.com/newagefotografie/';
  const FACEBOOK_URL = 'https://www.facebook.com/NewAgeFotografie';
  const GOOGLE_REVIEW_URL = 'https://g.page/r/CfWCViKtBrjuEAE/review';

  const trustLogos = de
    ? ['BBC', 'Canon', 'Stadt Wien', 'ÖBB', 'Internationale Unternehmen']
    : ['BBC', 'Canon', 'City of Vienna', 'ÖBB', 'International companies'];
  const storyRows = [
    {
      year: de ? 'Vor Wien' : 'Before Vienna',
      station: de ? 'Brighton (UK) & Südafrika' : 'Brighton (UK) & South Africa',
      story: de ? 'Hier habe ich mein Handwerk gelernt – die ersten Schritte in der Portraitfotografie, geprägt durch unterschiedliche Menschen, Kulturen und Geschichten.' : 'Where I learned my craft – the first steps in portrait photography, shaped by different people, cultures and stories.',
    },
    {
      year: de ? 'Brighton (UK)' : 'Brighton (UK)',
      station: de ? 'Professionelle Fotografie' : 'Professional photography',
      story: de ? 'Arbeit in einer der kreativsten Küstenstädte Großbritanniens.' : 'Working in one of the UK’s most creative coastal cities.',
    },
    {
      year: '2012',
      station: de ? 'Wien' : 'Vienna',
      story: de ? `Die Eröffnung von ${SITE.name}.` : `The opening of ${SITE.name}.`,
    },
    {
      year: de ? 'Heute' : 'Today',
      station: de ? 'Fotostudio Wien 1050' : 'Photo Studio Vienna 1050',
      story: de ? 'Tausende Shootings mit Familien, Babys, Paaren und Unternehmen.' : 'Thousands of shoots with families, babies, couples and businesses.',
    },
  ];

  const beliefs = [
    {
      title: de ? 'Mensch vor Kamera' : 'The person before the camera',
      body: de ? 'Niemand muss ein Model sein. Unsere Aufgabe ist es, eine Atmosphäre zu schaffen, in der echte Emotionen entstehen können.' : 'No one has to be a model. Our job is to create an atmosphere in which real emotions can emerge.',
    },
    {
      title: de ? 'Natürlichkeit statt steifer Posen' : 'Naturalness instead of stiff poses',
      body: de ? 'Die schönsten Bilder entstehen oft zwischen den geplanten Momenten: ein Lachen, eine Umarmung, ein Blick.' : 'The most beautiful images often happen between the planned moments: a laugh, a hug, a glance.',
    },
    {
      title: de ? 'Erfahrung macht den Unterschied' : 'Experience makes the difference',
      body: de ? 'Nach tausenden Portraits erkennen wir kleine Details: die richtige Körperhaltung, natürliches Licht, echte Ausdrücke und den perfekten Moment zum Auslösen.' : 'After thousands of portraits we notice the small details: the right posture, natural light, genuine expressions and the perfect moment to press the shutter.',
    },
  ];

  const studioBullets = de
    ? [
        'Familienfotos Wien',
        'Babybauch Fotoshootings',
        'Neugeborenenfotografie',
        'Kinderfotos',
        'Business Portraits',
        'Personal Branding Fotos',
        'Bewerbungsbilder',
        'Paarshootings',
      ]
    : [
        'Family photos in Vienna',
        'Maternity photo shoots',
        'Newborn photography',
        'Children’s photos',
        'Business portraits',
        'Personal branding photos',
        'Application photos',
        'Couple shoots',
      ];

  const shootings = [
    {
      title: de ? 'Familienfotografie Wien' : 'Family Photography Vienna',
      body: de ? 'Familien verändern sich schnell. Unsere Familienfotos halten genau diese Zeit fest – natürlich, emotional und zeitlos.' : 'Families change quickly. Our family photos capture exactly this time – natural, emotional and timeless.',
      cta: de ? 'Familien Fotoshooting entdecken' : 'Discover family photo shoots',
      href: '/familien-fotoshooting-wien/',
    },
    {
      title: de ? 'Babybauch Fotoshooting Wien' : 'Maternity Photo Shoot Vienna',
      body: de ? 'Eine besondere Zeit verdient besondere Erinnerungen. Wir fotografieren Schwangerschaften elegant, modern und mit viel Gefühl.' : 'A special time deserves special memories. We photograph pregnancies elegantly, modernly and with plenty of feeling.',
      cta: de ? 'Babybauch Shooting ansehen' : 'View maternity shoots',
      href: '/schwangerschaftsfotos-wien/',
    },
    {
      title: de ? 'Neugeborenen Fotoshooting Wien' : 'Newborn Photo Shoot Vienna',
      body: de ? 'Die ersten Tage kommen nie zurück. Mit viel Ruhe und Geduld entstehen liebevolle Erinnerungen an diese besondere Anfangszeit.' : 'The first days never come back. With plenty of calm and patience, we create loving memories of this very special beginning.',
      cta: de ? 'Newborn Shooting entdecken' : 'Discover newborn shoots',
      href: '/neugeborenenfotos-wien/',
    },
    {
      title: de ? 'Business Portrait Wien' : 'Business Portrait Vienna',
      body: de ? 'Der erste Eindruck entsteht oft online. Wir erstellen professionelle Portraits für LinkedIn, Webseiten, Bewerbungen und Personal Branding.' : 'First impressions are often made online. We create professional portraits for LinkedIn, websites, job applications and personal branding.',
      cta: de ? 'Business Portraits ansehen' : 'View business portraits',
      href: '/business-portrait-wien/',
    },
  ];

  const steps = [
    {
      title: de ? '1. Kennenlernen' : '1. Getting to know you',
      body: de ? 'Wir sprechen darüber, welche Bilder ihr euch wünscht.' : 'We talk about the kind of images you have in mind.',
    },
    {
      title: de ? '2. Entspannte Atmosphäre' : '2. A relaxed atmosphere',
      body: de ? 'Keine Unsicherheit. Kein Stress. Wir führen euch Schritt für Schritt durch das Shooting.' : 'No awkwardness. No stress. We guide you through the shoot step by step.',
    },
    {
      title: de ? '3. Auswahl eurer Lieblingsbilder' : '3. Choosing your favourite images',
      body: de ? 'Nach dem Shooting sucht ihr eure Favoriten bequem aus.' : 'After the shoot, you comfortably pick out your favourites.',
    },
    {
      title: de ? '4. Erinnerungen für Zuhause' : '4. Memories for your home',
      body: de ? 'Hochwertige Bilder, Wandkunst und Portraits, die bleiben.' : 'High-quality images, wall art and portraits that last.',
    },
  ];

  const reasons = de
    ? [
        'Über 12 Jahre Erfahrung als Fotostudio in Wien',
        'Tausende Menschen fotografiert',
        'Internationale Erfahrung',
        'Persönliche Betreuung',
        'Professionelle Studioqualität',
        'Familienfreundliche Atmosphäre',
        'Bewertungen von echten Kunden',
      ]
    : [
        'Over 12 years of experience as a photo studio in Vienna',
        'Thousands of people photographed',
        'International experience',
        'Personal, attentive care',
        'Professional studio quality',
        'A family-friendly atmosphere',
        'Reviews from real clients',
      ];

  const faqs = [
    {
      question: de ? `Wie lange gibt es ${SITE.name} schon?` : `How long has ${SITE.name} been around?`,
      answer: de ? 'Unser Fotostudio gibt es seit 2012 in Wien. Seitdem durften wir zahlreiche Familien, Unternehmen und Privatpersonen fotografieren.' : 'Our photo studio has been in Vienna since 2012. Since then we have had the pleasure of photographing countless families, businesses and private individuals.',
    },
    {
      question: de ? 'Wo befindet sich das Studio?' : 'Where is the studio located?',
      answer: de ? 'Unser Fotostudio befindet sich im 5. Bezirk in Wien und ist einfach erreichbar.' : 'Our photo studio is located in Vienna’s 5th district and is easy to reach.',
    },
    {
      question: de ? 'Muss ich Erfahrung vor der Kamera haben?' : 'Do I need experience in front of the camera?',
      answer: de ? 'Nein. Die meisten unserer Kunden stehen selten vor einer professionellen Kamera. Wir helfen mit natürlicher Anleitung während des gesamten Shootings.' : 'No. Most of our clients are rarely in front of a professional camera. We help with natural guidance throughout the entire shoot.',
    },
    {
      question: de ? 'Welche Fotoshootings bietet ihr an?' : 'Which photo shoots do you offer?',
      answer: de ? 'Wir fotografieren Familien, Babys, Schwangerschaften, Business Portraits, Paare und besondere Anlässe.' : 'We photograph families, babies, pregnancies, business portraits, couples and special occasions.',
    },
    {
      question: de ? 'Kann man ein Fotoshooting verschenken?' : 'Can you give a photo shoot as a gift?',
      answer: de ? 'Ja. Ein Fotoshooting Gutschein ist eines unserer beliebtesten Geschenke für Geburtstage, Weihnachten oder besondere Momente.' : 'Yes. A photo shoot voucher is one of our most popular gifts for birthdays, Christmas or special moments.',
    },
  ];

  return (
    <Layout>
      <SEOHead
        title={`Über uns | Fotostudio Wien seit 2012 – ${SITE.name}`}
        description={`Lerne ${SITE.name} kennen – dein Fotostudio in Wien seit 2012 für Familienfotografie, Babybauch, Neugeborene und Business Portraits. Persönlich, modern und authentisch.`}
        keywords={`Fotostudio Wien, ${SITE.name} Wien, Familienfotografie Wien, Babybauch Wien, Neugeborene Wien, Business Portrait Wien`}
        canonical="/ueber-uns/"
      />

      {/* Schema.org LocalBusiness structured data */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "name": SITE.name,
          "description": "Fotostudio in Wien seit 2012 für Familienfotografie, Babybauch, Neugeborene und Business Portraits.",
          "address": {
            "@type": "PostalAddress",
            "addressLocality": "Wien",
            "addressCountry": "AT"
          },
          "areaServed": "Vienna, Austria",
          "url": SITE.url,
          "sameAs": [
            "https://www.capetowncarnival.com/",
            "https://eurovision.tv/event/vienna-2015"
          ],
          "founder": {
            "@type": "Person",
            "name": "Simon Parrott",
            "jobTitle": "Photographer",
            "sameAs": [
              SIMON_LINKEDIN,
              SIMON_INSTAGRAM
            ],
            ...(SIMON_PHOTO ? { "image": SIMON_PHOTO } : {})
          },
          "knowsAbout": [
            "family photography",
            "newborn photography",
            "maternity photography",
            "portrait photography",
            "wedding photography",
            "corporate headshots",
            "product photography",
            "real estate photography"
          ]
        })}
      </script>
      
      <div className="min-h-screen bg-white text-slate-900">
        <section className="bg-slate-950 text-white py-24">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-purple-300 mb-6">{de ? 'Über uns' : 'About us'}</p>
            <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">{de ? 'Über uns' : 'About us'} – {SITE.name} {de ? 'Wien' : 'Vienna'}</h1>
            <h2 className="text-2xl md:text-3xl font-semibold mb-6 text-white/95">{de ? 'Euer Fotostudio in Wien für echte Erinnerungen seit 2012' : 'Your photo studio in Vienna for real memories since 2012'}</h2>
            <div className="max-w-3xl mx-auto space-y-4 text-lg md:text-xl text-white/85 leading-relaxed">
              <p>{de ? 'Manche Momente passieren nur einmal.' : 'Some moments only happen once.'}</p>
              <p>{de ? 'Ein Baby ist nur wenige Tage ein Neugeborenes. Kinder verändern sich jedes Jahr. Familien wachsen. Menschen beginnen neue Kapitel.' : 'A baby is a newborn for only a few days. Children change every year. Families grow. People begin new chapters.'}</p>
              <p>{de ? 'Genau deshalb fotografieren wir nicht einfach Bilder.' : 'That is precisely why we don’t simply take pictures.'}</p>
              <p>{de ? 'Wir erschaffen Erinnerungen, die auch in vielen Jahren noch Bedeutung haben.' : 'We create memories that will still hold meaning many years from now.'}</p>
              <p>{de ? <>Willkommen bei <strong>{SITE.name} – eurem Fotostudio in Wien für Familien, Babybauch, Neugeborene, Business Portraits und besondere Lebensmomente.</strong></> : <>Welcome to <strong>{SITE.name} – your photo studio in Vienna for families, maternity, newborns, business portraits and special moments in life.</strong></>}</p>
              <p>{de ? 'Seit 2012 durften wir bereits tausende Menschen vor unserer Kamera begleiten – immer mit demselben Ziel:' : 'Since 2012 we have had the privilege of guiding thousands of people in front of our camera – always with the same goal:'}</p>
              <p className="font-semibold text-white">{de ? 'Natürlich. Persönlich. Zeitlos.' : 'Natural. Personal. Timeless.'}</p>
            </div>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                to="/fotoshootings/"
                className="inline-flex items-center rounded-lg bg-white px-8 py-4 text-base font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                {de ? 'Jetzt Fotoshooting entdecken' : 'Discover a photo shoot now'}
              </Link>
            </div>
            <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-6 py-3">
              <span className="flex gap-0.5" aria-hidden="true">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-amber-400 fill-amber-400" />
                ))}
              </span>
              <span className="text-base md:text-lg font-semibold text-white">
                {de ? '4,9★ · 250+ Google-Bewertungen' : '4.9★ · 250+ Google reviews'}
              </span>
            </div>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">{de ? 'Vertraut von Familien, Unternehmen und bekannten Marken' : 'Trusted by families, businesses and well-known brands'}</h2>
            <p className="text-lg text-slate-700 leading-relaxed max-w-4xl">
              {de ? 'Über die Jahre durften wir nicht nur Familien aus Wien fotografieren, sondern auch mit bekannten Unternehmen, Organisationen und internationalen Marken arbeiten.' : 'Over the years we have photographed not only families from Vienna, but also worked with well-known companies, organisations and international brands.'}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {trustLogos.map((item) => (
                <span key={item} className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
                  {item}
                </span>
              ))}
            </div>
            <p className="mt-8 text-lg text-slate-700">{de ? <>Aber unser wichtigster Auftrag bleibt immer derselbe: <strong>Den Menschen vor unserer Kamera authentisch zu zeigen.</strong></> : <>But our most important task always stays the same: <strong>to show the person in front of our camera authentically.</strong></>}</p>
          </div>
        </section>

        <section className="py-16 bg-slate-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">{de ? <>Die Geschichte hinter {SITE.name}</> : <>The story behind {SITE.name}</>}</h2>
            <h3 className="text-2xl font-semibold text-slate-800 mb-8">{de ? 'Vom internationalen Fotografen zum Fotostudio in Wien' : 'From international photographer to a photo studio in Vienna'}</h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full min-w-[720px] border-collapse">
                <thead className="bg-slate-950 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wide">{de ? 'Jahr' : 'Year'}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wide">{de ? 'Station' : 'Stage'}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wide">{de ? 'Unsere Geschichte' : 'Our story'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {storyRows.map((row) => (
                    <tr key={row.year} className="align-top">
                      <td className="px-6 py-4 font-semibold text-slate-900">{row.year}</td>
                      <td className="px-6 py-4 text-slate-700">{row.station}</td>
                      <td className="px-6 py-4 text-slate-700">{row.story}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">{de ? <>Simon – der Fotograf hinter {SITE.name}</> : <>Simon – the photographer behind {SITE.name}</>}</h2>
            {SIMON_PHOTO && (
              <img
                src={SIMON_PHOTO}
                alt={de ? 'Simon Parrott, Fotograf bei New Age Fotografie Wien' : 'Simon Parrott, photographer at New Age Fotografie Vienna'}
                loading="lazy"
                className="w-40 h-40 rounded-2xl object-cover shadow-lg"
                // Until the photo file is placed at SIMON_PHOTO, hide the
                // element rather than showing a broken-image icon.
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            )}
            <p className="text-lg text-slate-700">{mv('manual.ueberuns.bio.intro', de ? 'Hallo, ich bin Simon.' : 'Hello, I’m Simon.')}</p>
            <p className="text-lg text-slate-700">{de ? 'Nach vielen Jahren hinter der Kamera habe ich eines gelernt: Die beste Technik der Welt bedeutet wenig, wenn Menschen sich vor der Kamera nicht wohlfühlen.' : 'After many years behind the camera, I’ve learned one thing: the best technology in the world means little if people don’t feel comfortable in front of the camera.'}</p>
            <p className="text-lg text-slate-700">{de ? 'Ein gutes Portrait beginnt nicht mit dem Auslösen der Kamera. Es beginnt mit Vertrauen.' : 'A good portrait doesn’t begin with the click of the shutter. It begins with trust.'}</p>
            <p className="text-lg text-slate-700">{mv('manual.ueberuns.bio.craft', de ? <>Mein Handwerk habe ich in Brighton (UK) und Südafrika gelernt, bevor Wien mein Zuhause wurde. Diese internationale Erfahrung prägt bis heute meinen Stil: <strong>moderne, natürliche und authentische Portraits – voller Persönlichkeit Ihrer Familie.</strong></> : <>I learned my craft in Brighton (UK) and South Africa before making Vienna my home. This international experience still shapes my style today: <strong>modern, natural and authentic portraits, full of your family’s personality.</strong></>)}</p>
            <p className="text-lg text-slate-700">{mv('manual.ueberuns.bio.journey', de ? 'Seit der Eröffnung unseres Studios in Wien im Jahr 2012 durften wir Familien wachsen sehen: Babys, die heute schon zur Schule gehen, Teenager, deren Hochzeiten wir später fotografiert haben – und Menschen begleiten, die normalerweise sagen:' : 'Since opening our studio in Vienna in 2012, we’ve watched families grow — babies who are already at school today, teenagers whose weddings we later photographed — and worked with people who usually say:')}</p>
            <p className="text-lg italic text-slate-800">{de ? '“Ich bin nicht fotogen.”' : '“I’m not photogenic.”'}</p>
            <p className="text-lg text-slate-700">{de ? 'Meine Antwort ist immer dieselbe:' : 'My answer is always the same:'}</p>
            <p className="text-xl font-semibold text-slate-950">{mv('manual.ueberuns.bio.closing', de ? 'Doch. Du brauchst nur jemanden hinter der Kamera, der dich wirklich sieht – und das authentische „Du“ einfängt, das man nicht stellen kann.' : 'You are. You just need someone behind the camera who truly sees you — someone who captures the authentic “you” that can’t be posed.')}</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href={SIMON_LINKEDIN}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                <Linkedin className="h-5 w-5 text-[#0a66c2]" /> {de ? 'Simon auf LinkedIn' : 'Simon on LinkedIn'}
              </a>
              <a
                href={SIMON_INSTAGRAM}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                <Instagram className="h-5 w-5 text-[#e1306c]" /> {de ? 'Auf Instagram folgen' : 'Follow on Instagram'}
              </a>
              <a
                href={FACEBOOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                <Facebook className="h-5 w-5 text-[#1877f2]" /> {de ? 'Auf Facebook folgen' : 'Follow on Facebook'}
              </a>
              <a
                href={GOOGLE_REVIEW_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-purple-700"
              >
                <Star className="h-5 w-5 fill-current text-yellow-300" /> {de ? 'Auf Google bewerten' : 'Review us on Google'}
              </a>
            </div>
          </div>
        </section>

        <section className="py-16 bg-slate-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-8">{de ? 'Woran wir als Fotografen glauben' : 'What we believe in as photographers'}</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {beliefs.map((belief) => (
                <div key={belief.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-xl font-semibold mb-3">{belief.title}</h3>
                  <p className="text-slate-700 leading-relaxed">{belief.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-lg text-slate-700 mb-4">{de ? 'Diese Erfahrung bringen wir in jedes Shooting ein.' : 'We bring this experience to every shoot.'}</p>
              <ul className="grid gap-3 sm:grid-cols-2 text-slate-700">
                <li>{de ? '• die richtige Körperhaltung' : '• the right posture'}</li>
                <li>{de ? '• natürliches Licht' : '• natural light'}</li>
                <li>{de ? '• echte Ausdrücke' : '• genuine expressions'}</li>
                <li>{de ? '• den perfekten Moment zum Auslösen' : '• the perfect moment to press the shutter'}</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">{de ? 'Unser Fotostudio in Wien' : 'Our photo studio in Vienna'}</h2>
                <p className="text-lg text-slate-700 leading-relaxed mb-6">{de ? 'Unser Studio befindet sich im Herzen von Wien im 5. Bezirk.' : 'Our studio is located in the heart of Vienna in the 5th district.'}</p>
                <p className="text-lg text-slate-700 leading-relaxed mb-6">{de ? 'Ein heller, entspannter Ort für:' : 'A bright, relaxed space for:'}</p>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {studioBullets.map((item) => (
                    <li key={item} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700">{item}</li>
                  ))}
                </ul>
                <p className="mt-8 text-lg text-slate-700 leading-relaxed">{de ? 'Jedes Shooting ist anders. Deshalb arbeiten wir nicht nach einer festen Vorlage. Wir nehmen uns Zeit für euch.' : 'Every shoot is different. That is why we don’t work to a fixed template. We take our time for you.'}</p>
              </div>
              <div className="rounded-2xl bg-slate-950 p-8 text-white shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <MapPin className="h-6 w-6 text-purple-300" />
                  <h3 className="text-xl font-semibold">{de ? 'Fotostudio Wien 1050' : 'Photo Studio Vienna 1050'}</h3>
                </div>
                <p className="text-white/80 leading-relaxed">{de ? 'Persönlich. Modern. Entspannt. Ein Studio für Familien, Babys, Business Portraits und echte Erinnerungen mitten in Wien.' : 'Personal. Modern. Relaxed. A studio for families, babies, business portraits and real memories in the heart of Vienna.'}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-slate-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">{de ? 'Unsere Fotoshootings in Wien' : 'Our photo shoots in Vienna'}</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {shootings.map((shooting) => (
                <div key={shooting.title} className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                  <h3 className="text-2xl font-semibold mb-3">{shooting.title}</h3>
                  <p className="text-slate-700 leading-relaxed mb-6">{shooting.body}</p>
                  <Link to={shooting.href} className="inline-flex items-center text-sm font-semibold text-purple-700 hover:text-purple-900">
                    {shooting.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-8">{de ? 'So fühlt sich ein Fotoshooting bei uns an' : 'What a photo shoot with us feels like'}</h2>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {steps.map((step) => (
                <div key={step.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                  <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-slate-700 leading-relaxed">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 bg-slate-950 text-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-8">{de ? <>Warum Kunden {SITE.name} wählen</> : <>Why clients choose {SITE.name}</>}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {reasons.map((reason) => (
                <div key={reason} className="flex items-start gap-3 rounded-xl bg-white/5 px-5 py-4 border border-white/10">
                  <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <span className="text-white/90">{reason}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">{de ? 'Auszeichnungen & Bewertungen' : 'Awards & reviews'}</h2>
            <p className="text-lg text-slate-700 leading-relaxed">{de ? 'Unsere Kundenbewertungen bedeuten uns besonders viel, weil sie zeigen, was hinter jedem Bild steckt: Vertrauen. Geduld. Und echte Erinnerungen.' : 'Our client reviews mean a great deal to us, because they show what lies behind every image: trust, patience, and real memories.'}</p>
            <p className="text-3xl tracking-[0.35em] text-amber-500">★★★★★</p>
            <p className="text-lg text-slate-700">{de ? 'Bewertungen auf Google, ProvenExpert und weiteren Plattformen.' : 'Reviews on Google, ProvenExpert and other platforms.'}</p>
          </div>
        </section>

        <section className="py-16 bg-slate-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-8">{de ? 'Häufige Fragen über unser Fotostudio in Wien' : 'Frequently asked questions about our photo studio in Vienna'}</h2>
            <div className="space-y-5">
              {faqs.map((faq) => (
                <div key={faq.question} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-xl font-semibold mb-3">{faq.question}</h3>
                  <p className="text-slate-700 leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">{de ? 'Am Ende geht es nicht um Fotos' : 'In the end, it’s not about photos'}</h2>
            <div className="space-y-4 text-lg md:text-xl text-white/90 max-w-3xl mx-auto">
              <p>{de ? 'Es geht um Menschen.' : 'It’s about people.'}</p>
              <p>{de ? 'Um kleine Momente, die irgendwann große Bedeutung bekommen.' : 'About small moments that one day take on great meaning.'}</p>
              <p>{de ? 'Um Erinnerungen, die bleiben.' : 'About memories that last.'}</p>
              <p>{de ? 'Wir freuen uns darauf, eure Geschichte festzuhalten.' : 'We look forward to capturing your story.'}</p>
            </div>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                to="/fotoshootings/"
                className="inline-flex items-center rounded-lg bg-white px-8 py-4 text-base font-semibold text-purple-700 transition hover:bg-slate-100"
              >
                {de ? 'Jetzt Fotoshooting planen' : 'Plan your photo shoot now'}
              </Link>
              <Link
                to="/kontakt/"
                className="inline-flex items-center rounded-lg border-2 border-white px-8 py-4 text-base font-semibold text-white transition hover:bg-white/10"
              >
                <Phone className="mr-2 h-5 w-5" /> {de ? 'Kontakt aufnehmen' : 'Get in touch'}
              </Link>
            </div>
          </div>
        </section>
      </div>
      <PillarLinksBlock currentPath="/ueber-uns/" title={de ? 'Unsere Fotoshootings in Wien entdecken' : 'Discover our photo shoots in Vienna'} />
      <RelatedTopicsBlock pathname="/ueber-uns/" />
    </Layout>
  );
};

export default UeberUnsPage;

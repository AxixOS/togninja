import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Phone } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { RelatedTopicsBlock } from '../../components/SEO/RelatedTopicsBlock';
import { PillarLinksBlock } from '../../components/SEO/PillarLinksBlock';
import { SEOHead } from '../../components/SEO/SEOHead';
import { SITE } from '../../config/site';
import { useLanguage } from '../../context/LanguageContext';

const UeberUnsPage: React.FC = () => {
  const { language, t } = useLanguage();
  const de = language === 'de';

  // Founder photo: prefer the one uploaded in Settings â†’ Manual Website Update
  // â†’ "About Us / Ãœber uns" â†’ Founder Photo (stored as a URL). If none is set,
  // fall back to a file dropped at /team/simon-parrott.jpg. t() returns the raw
  // key when unset, so treat that as "not set".
  const managed = t('manual.ueberuns.founderPhoto');
  const managedPhoto = managed && managed !== 'manual.ueberuns.founderPhoto' ? managed : '';
  // The studio's own founder photo, or none. The fallback was a hardcoded path to
  // the origin studio's photographer; no /team/ directory ships, so it only ever
  // 404'd and hid itself â€” while its alt text, naming him, stayed in the HTML.
  const founderPhoto = managedPhoto;

  // Founder-story paragraphs are editable in Settings â†’ Manual Website Update â†’
  // "About Us / Ãœber uns" â†’ Founder Story (per language). t() returns the raw
  // key when unset, so fall back to the built-in copy below in that case.
  const mv = (key: string, fallback: React.ReactNode): React.ReactNode => {
    const v = t(key);
    return v && v !== key ? v : fallback;
  };
  // The studio's own founder story, if it has written one. Unset returns '' rather
  // than a fallback: the built-in copy was one real person's first-person biography
  // ("Hello, I'm Simon", learned his craft in Brighton, opened in Vienna in 2012),
  // which is not a default any other studio can truthfully publish. No story means
  // the section does not render â€” see hasFounderStory below.
  const story = (key: string): string => {
    const v = t(key);
    return v && v !== key ? v : '';
  };
  const founderStory = {
    intro: story('manual.ueberuns.bio.intro'),
    craft: story('manual.ueberuns.bio.craft'),
    journey: story('manual.ueberuns.bio.journey'),
    closing: story('manual.ueberuns.bio.closing'),
  };
  const hasFounderStory = !!(founderPhoto || Object.values(founderStory).some(Boolean));
  // The studio's OWN accounts, from its configured identity. These were four
  // hardcoded literals: the origin studio's Instagram and Facebook, a named
  // individual's personal LinkedIn, and â€” worst â€” a "Review us on Google" button
  // pointing at the origin studio's Business Profile. Every buyer shipped a page
  // inviting their own clients to review a competitor. Nothing to review here: no
  // configured accounts means no links.
  const socialLinks = SITE.social.filter(Boolean);
  const socialLabel = (url: string): string => {
    try {
      const host = new URL(url).hostname.replace(/^www\./, '');
      return host.split('.')[0].replace(/^./, (c) => c.toUpperCase());
    } catch {
      return url;
    }
  };

  const beliefs = [
    {
      title: de ? 'Mensch vor Kamera' : 'The person before the camera',
      body: de ? 'Niemand muss ein Model sein. Unsere Aufgabe ist es, eine AtmosphÃ¤re zu schaffen, in der echte Emotionen entstehen kÃ¶nnen.' : 'No one has to be a model. Our job is to create an atmosphere in which real emotions can emerge.',
    },
    {
      title: de ? 'NatÃ¼rlichkeit statt steifer Posen' : 'Naturalness instead of stiff poses',
      body: de ? 'Die schÃ¶nsten Bilder entstehen oft zwischen den geplanten Momenten: ein Lachen, eine Umarmung, ein Blick.' : 'The most beautiful images often happen between the planned moments: a laugh, a hug, a glance.',
    },
    {
      title: de ? 'Erfahrung macht den Unterschied' : 'Experience makes the difference',
      // "After thousands of portraits" was a volume claim; the craft it describes is
      // true from the first shoot.
      body: de ? 'Wir achten auf die kleinen Details: die richtige KÃ¶rperhaltung, natÃ¼rliches Licht, echte AusdrÃ¼cke und den perfekten Moment zum AuslÃ¶sen.' : 'We notice the small details: the right posture, natural light, genuine expressions and the perfect moment to press the shutter.',
    },
  ];



  const steps = [
    {
      title: de ? '1. Kennenlernen' : '1. Getting to know you',
      body: de ? 'Wir sprechen darÃ¼ber, welche Bilder ihr euch wÃ¼nscht.' : 'We talk about the kind of images you have in mind.',
    },
    {
      title: de ? '2. Entspannte AtmosphÃ¤re' : '2. A relaxed atmosphere',
      body: de ? 'Keine Unsicherheit. Kein Stress. Wir fÃ¼hren euch Schritt fÃ¼r Schritt durch das Shooting.' : 'No awkwardness. No stress. We guide you through the shoot step by step.',
    },
    {
      title: de ? '3. Auswahl eurer Lieblingsbilder' : '3. Choosing your favourite images',
      body: de ? 'Nach dem Shooting sucht ihr eure Favoriten bequem aus.' : 'After the shoot, you comfortably pick out your favourites.',
    },
    {
      title: de ? '4. Erinnerungen fÃ¼r Zuhause' : '4. Memories for your home',
      body: de ? 'Hochwertige Bilder, Wandkunst und Portraits, die bleiben.' : 'High-quality images, wall art and portraits that last.',
    },
  ];

  // Four of the seven were claims about the origin studio: "Over 12 years of
  // experience as a photo studio in Vienna", "Thousands of people photographed",
  // "International experience", and "Reviews from real clients" â€” a tenure, a
  // volume, a history and a rating, none of which a new studio has. What is left
  // is what any photographer can say on their first day, and it is an even four
  // so the two-column grid has no orphan.
  const reasons = de
    ? [
        'PersÃ¶nliche Betreuung',
        'Professionelle QualitÃ¤t',
        'Entspannte AtmosphÃ¤re',
        'Zeit fÃ¼r euch â€“ kein Shooting nach Schema',
      ]
    : [
        'Personal, attentive care',
        'Professional quality',
        'A relaxed atmosphere',
        'Time for you â€” no shoot to a fixed template',
      ];


  return (
    <Layout>
      <SEOHead
        title={de ? `Ãœber uns â€“ ${SITE.name}` : `About us â€“ ${SITE.name}`}
        description={
          de
            ? `Lerne ${SITE.name} kennen${SITE.address.city ? ` â€“ dein Fotostudio in ${SITE.address.city}` : ''}. PersÃ¶nlich, modern und authentisch.`
            : `Meet ${SITE.name}${SITE.address.city ? ` â€“ your photo studio in ${SITE.address.city}` : ''}. Personal, modern and authentic.`
        }
        canonical="/ueber-uns/"
      />

      {/* AboutPage schema pointing at the LocalBusiness the homepage already declares.
          This page previously emitted a SECOND LocalBusiness node hardcoded to Vienna,
          naming a specific real person as the founder of the business â€” published as
          every instance's own founder, alongside two unrelated sameAs links. There is
          no per-studio source for founder details, so the safe thing is to assert
          nothing about them here. */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "AboutPage",
          "name": de ? `Ãœber uns â€“ ${SITE.name}` : `About us â€“ ${SITE.name}`,
          "url": `${SITE.url}/ueber-uns/`,
          "mainEntity": { "@id": `${SITE.url}/#business` }
        })}
      </script>
      
      <div className="min-h-screen bg-white text-slate-900">
        <section className="bg-slate-950 text-white py-24">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-purple-300 mb-6">{de ? 'Ãœber uns' : 'About us'}</p>
            {/* No city and no founding year. This read "About us â€“ <studio> Vienna"
                over "Your photo studio in Vienna for real memories since 2012" for
                every buyer, including studios that are not in Vienna and did not
                exist in 2012. A studio's own city belongs in its structured data and
                its pillar headings, both of which now carry it; it does not belong in
                a headline as a fact about a business we cannot verify. */}
            <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">{de ? 'Ãœber uns' : 'About us'} â€“ {SITE.name}</h1>
            <div className="max-w-3xl mx-auto space-y-4 text-lg md:text-xl text-white/85 leading-relaxed">
              <p>{de ? 'Manche Momente passieren nur einmal.' : 'Some moments only happen once.'}</p>
              <p>{de ? 'Ein Baby ist nur wenige Tage ein Neugeborenes. Kinder verÃ¤ndern sich jedes Jahr. Familien wachsen. Menschen beginnen neue Kapitel.' : 'A baby is a newborn for only a few days. Children change every year. Families grow. People begin new chapters.'}</p>
              <p>{de ? 'Genau deshalb fotografieren wir nicht einfach Bilder.' : 'That is precisely why we donâ€™t simply take pictures.'}</p>
              <p>{de ? 'Wir erschaffen Erinnerungen, die auch in vielen Jahren noch Bedeutung haben.' : 'We create memories that will still hold meaning many years from now.'}</p>
              {/* Was a welcome naming Vienna and a fixed service list, followed by
                  "Since 2012 â€¦ thousands of people". A studio that opened this year
                  has no 2012 and no thousands, and a wedding photographer does not
                  shoot newborns. What is left is true of the studio sending it. */}
              <p>{de ? <>Willkommen bei <strong>{SITE.name}</strong>.</> : <>Welcome to <strong>{SITE.name}</strong>.</>}</p>
              <p>{de ? 'Wir begleiten Menschen vor unserer Kamera â€“ immer mit demselben Ziel:' : 'We guide people in front of our camera â€“ always with the same goal:'}</p>
              <p className="font-semibold text-white">{de ? 'NatÃ¼rlich. PersÃ¶nlich. Zeitlos.' : 'Natural. Personal. Timeless.'}</p>
            </div>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                to="/fotoshootings/"
                className="inline-flex items-center rounded-lg bg-white px-8 py-4 text-base font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                {de ? 'Jetzt Fotoshooting entdecken' : 'Discover a photo shoot now'}
              </Link>
            </div>
          </div>
        </section>

        {/* Three sections removed rather than reworded, because none of them has a
            true version for a studio we know nothing about:

            - A "4.9â˜… Â· 250+ Google reviews" badge. A rating and a review count for a
              business that may have neither, asserted in the hero of its own site.
            - "Trusted by families, businesses and well-known brands", under which the
              client list has already gone, above a paragraph claiming years of work
              with international brands.
            - A four-row founding timeline: Brighton, South Africa, Vienna in 2012,
              "Photo Studio Vienna 1050", thousands of shoots. That is one real
              photographer's biography, and it was published under whichever studio
              name owned the site.

            A studio's real history, reviews and clients are things only the studio
            can supply. Until it does, saying nothing is the honest option â€” and a
            shorter page a buyer can publish beats a longer one they cannot. */}

        {/* Renders only for a studio that has written its own founder story in
            Settings â†’ Manual Website Update. There is no default: the previous one
            was a real person's first-person biography, published under whichever
            studio name happened to own the site. A missing section is honest; an
            inherited one is not. */}
        {hasFounderStory && (
        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">{de ? <>Der Fotograf hinter {SITE.name}</> : <>The photographer behind {SITE.name}</>}</h2>
            {founderPhoto && (
              <img
                src={founderPhoto}
                alt={de ? `Fotograf bei ${SITE.name}` : `Photographer at ${SITE.name}`}
                loading="lazy"
                className="w-40 h-40 rounded-2xl object-cover shadow-lg"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            )}
            {founderStory.intro && <p className="text-lg text-slate-700">{founderStory.intro}</p>}
            <p className="text-lg text-slate-700">{de ? 'Ein gutes Portrait beginnt nicht mit dem AuslÃ¶sen der Kamera. Es beginnt mit Vertrauen.' : 'A good portrait doesnâ€™t begin with the click of the shutter. It begins with trust.'}</p>
            {founderStory.craft && <p className="text-lg text-slate-700">{founderStory.craft}</p>}
            {founderStory.journey && <p className="text-lg text-slate-700">{founderStory.journey}</p>}
            {founderStory.closing && <p className="text-xl font-semibold text-slate-950">{founderStory.closing}</p>}
            {socialLinks.length > 0 && (
              <div className="flex flex-wrap gap-3 pt-2">
                {socialLinks.map((url) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    {socialLabel(url)}
                  </a>
                ))}
              </div>
            )}
          </div>
        </section>
        )}

        <section className="py-16 bg-slate-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{de ? 'Woran wir als Fotografen glauben' : 'What we believe in as photographers'}</h2>
            {/* Salvaged from the deleted "trusted by brands" section â€” true of any
                photographer, and the best sentence on the page. */}
            <p className="text-lg text-slate-700 leading-relaxed mb-8 max-w-4xl">{de ? <>Unser wichtigster Auftrag bleibt immer derselbe: <strong>Den Menschen vor unserer Kamera authentisch zu zeigen.</strong></> : <>Our most important task always stays the same: <strong>to show the person in front of our camera authentically.</strong></>}</p>
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
                <li>{de ? 'â€¢ die richtige KÃ¶rperhaltung' : 'â€¢ the right posture'}</li>
                <li>{de ? 'â€¢ natÃ¼rliches Licht' : 'â€¢ natural light'}</li>
                <li>{de ? 'â€¢ echte AusdrÃ¼cke' : 'â€¢ genuine expressions'}</li>
                <li>{de ? 'â€¢ den perfekten Moment zum AuslÃ¶sen' : 'â€¢ the perfect moment to press the shutter'}</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Two more sections removed:

            - "Our photo studio in Vienna", describing premises in the 5th district
              and a card headed "Photo Studio Vienna 1050". Deliberately deleted
              rather than driven from the configured address: that address is a home
              address for a home-based photographer, which is exactly why
              siteIdentity refuses to publish geo coordinates from it. Publishing the
              street in a "Our studio" card would reintroduce by the front door what
              that code declines by the back.
            - "Our photo shoots in Vienna", four cards headed Family / Maternity /
              Newborn / Business Portrait Vienna. Beyond naming the wrong city and
              the wrong services for any studio that does not offer them, all four
              CTAs pointed at routes that do not exist â€” /familien-fotoshooting-wien/
              and siblings â€” which fall through the catch-all and silently return the
              visitor to the homepage with HTTP 200. Four buttons that looked like
              they worked and did nothing.

            What a studio actually offers is already on this page: the pillar block at
            the foot reads the studio's own services and its own city. */}

        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-8">{de ? 'So fÃ¼hlt sich ein Fotoshooting bei uns an' : 'What a photo shoot with us feels like'}</h2>
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
            <h2 className="text-3xl md:text-4xl font-bold mb-8">{de ? <>Warum Kunden {SITE.name} wÃ¤hlen</> : <>Why clients choose {SITE.name}</>}</h2>
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

        {/* Two more removed:

            - "Awards & reviews": five gold stars and "Reviews on Google, ProvenExpert
              and other platforms" for a studio that may be listed on neither and
              rated by nobody. A rating is the one claim a visitor is most entitled to
              rely on.
            - The FAQ. Its heading asked about "our photo studio in Vienna" and its
              questions were "How long has <studio> been around?" and "Where is the
              studio located?" â€” good questions with answers only the studio can give,
              answered here on its behalf with another studio's history and address.
              Two of the five were generic, which is not enough to keep a band for.

            The FAQ is the part worth rebuilding rather than mourning: those questions
            should come from the studio's own crawl or its own editor, which is the
            generated-content path, not a default. */}

        <section className="py-20 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">{de ? 'Am Ende geht es nicht um Fotos' : 'In the end, itâ€™s not about photos'}</h2>
            <div className="space-y-4 text-lg md:text-xl text-white/90 max-w-3xl mx-auto">
              <p>{de ? 'Es geht um Menschen.' : 'Itâ€™s about people.'}</p>
              <p>{de ? 'Um kleine Momente, die irgendwann groÃŸe Bedeutung bekommen.' : 'About small moments that one day take on great meaning.'}</p>
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
      <PillarLinksBlock
        currentPath="/ueber-uns/"
        title={(() => {
          // City and preposition together, so an unset city reads "Unsere Fotoshootings
          // entdecken" rather than leaving a hole mid-sentence.
          const inCity = SITE.address.city ? ` in ${SITE.address.city}` : '';
          return de ? `Unsere Fotoshootings${inCity} entdecken` : `Discover our photo shoots${inCity}`;
        })()}
      />
      <RelatedTopicsBlock pathname="/ueber-uns/" />
    </Layout>
  );
};

export default UeberUnsPage;

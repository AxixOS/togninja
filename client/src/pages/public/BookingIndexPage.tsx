// The booking-site index: every session type this studio has open, on one shareable URL.
//
// Before this page a studio could only hand out per-session deep links (/book/:slug).
// There was nothing to put in an email signature or behind a "Book now" button, so the
// product's whole booking system had no front door.
//
// Two shapes here are deliberate and easy to undo by accident:
//
//   NO <Layout>. The page this one links to (PublicSchedulerPage) is a standalone shell
//   with no site chrome, so wrapping the index in the marketing header would show a
//   header that then VANISHES on the very next click - which reads to a client as having
//   been bounced onto a different website mid-booking. The shell below is copied from
//   PublicSchedulerPage's on purpose.
//
//   NO availability. The index never asks whether a given session has free slots: that
//   answer costs a Google Calendar round trip per scheduler (see the
//   /public/:slug/availability handler), so computing it here would be N calls per page
//   view. A listed session that turns out to be fully booked says so on its own page.
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  MapPin,
  Tag,
  ChevronRight,
  Loader2,
  AlertCircle,
  Calendar as CalendarIcon
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useStudioCurrency } from '../../hooks/useStudioCurrency';

interface BookableSession {
  name: string;
  slug: string;
  description: string | null;
  // Present in the payload but deliberately NOT rendered: sessionType is a fixed English
  // enum from the admin's <select> (portrait/newborn/maternity/...) with no translation
  // anywhere, so printing it would put an English word on a German studio's public page.
  // The studio-authored `name` already says what the session is.
  sessionType: string;
  duration: number;
  location: string | null;
  price: string | null;
  brandColor: string | null;
}

interface StudioConfig {
  studioName?: string;
  logo?: string | null;
}

export default function BookingIndexPage() {
  const { t } = useLanguage();
  // Currency comes from the studio's own configuration. Never write a symbol into the
  // JSX below: this product is sold to studios pricing in USD, GBP and EUR, and a
  // hardcoded one is how the booking page came to advertise euros to a US studio.
  const { format: formatPrice } = useStudioCurrency();

  const [sessions, setSessions] = useState<BookableSession[] | null>(null);
  const [studio, setStudio] = useState<StudioConfig | null>(null);
  const [loading, setLoading] = useState(true);
  // A FLAG, not a message. Two reasons, and the second is the one that bites:
  // storing the translated string would put t() inside the fetch effect's dependencies,
  // and t() is rebuilt on every render of LanguageProvider (it closes over the runtime
  // translation map), so the list would be re-fetched every time an ancestor re-rendered.
  // Resolving the text at render time also means a visitor who switches language after a
  // failure sees the error in the language they just chose.
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        // '_index', not 'public' or 'index': the underscore is what stops this path ever
        // colliding with a real slug, and the two segments are what keep it out of the
        // '/:id' and '/public/:slug' param routes. See the comment on the handler.
        const response = await fetch('/api/schedulers/public/_index');
        if (!response.ok) throw new Error(String(response.status));
        const data = await response.json();
        if (cancelled) return;
        // A non-array means something upstream answered with an error object. An EMPTY
        // array is a legitimate answer - a studio with nothing activated yet - and must
        // fall through to the empty state below, never to the error state.
        setSessions(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const loadStudio = async () => {
      try {
        const response = await fetch('/api/studio-config');
        const data = await response.json();
        if (!cancelled) setStudio(data);
      } catch {
        // Identity is decoration on this page - the list works without it - so a failure
        // here must not take the page down with it.
      }
    };

    load();
    loadStudio();
    return () => {
      cancelled = true;
    };
    // Runs once. Nothing here depends on language: see the note on `failed` above.
  }, []);

  // Titled with the studio's own name rather than a hardcoded one: this is a white-label
  // product, and the tab title is one of the few places that name is read out loud (link
  // previews, browser history, a client's row of open tabs).
  useEffect(() => {
    const name = studio?.studioName;
    document.title = name ? `${t('bookIndex.title')} - ${name}` : t('bookIndex.title');
  }, [studio, t]);

  // Loading state - same shape as PublicSchedulerPage's, so the two pages do not look
  // like they belong to different products while they load.
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-gray-600">{t('bookIndex.loading')}</p>
        </div>
      </div>
    );
  }

  // Error state - reached only when the request itself failed. Zero sessions is not an
  // error and is handled further down.
  if (failed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {t('bookIndex.errorTitle')}
          </h2>
          <p className="text-gray-600">{t('bookIndex.errorBody')}</p>
        </div>
      </div>
    );
  }

  const list = sessions || [];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          {studio?.logo && (
            <img
              src={studio.logo}
              alt={studio.studioName || ''}
              className="h-14 mx-auto mb-4 object-contain"
            />
          )}
          {studio?.studioName && !studio.logo && (
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{studio.studioName}</h1>
          )}
          <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('bookIndex.title')}</h2>
          {list.length > 0 && <p className="text-gray-600">{t('bookIndex.subtitle')}</p>}
        </div>

        {list.length === 0 ? (
          // THE STATE MOST STUDIOS SEE FIRST. is_active is the only notion of "published"
          // and a fresh tenant owns no schedulers at all, so this is the page's default
          // view, not an edge case. It carries NO call to action on purpose: every button
          // that would fit here ("browse packages", "get in touch") points at a page a
          // white-label install cannot promise exists. Saying plainly that nothing is
          // open beats sending a client to a 404.
          <div className="bg-white rounded-xl shadow p-10 text-center">
            <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-900 font-medium mb-1">{t('bookIndex.empty')}</p>
            <p className="text-gray-500 text-sm">{t('bookIndex.emptyHint')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {list.map((session) => (
              // The literal /book/ + slug matters: scripts/ui-verify-links.mjs matches
              // to=/href= against the routes App.tsx registers, and building this URL any
              // other way (a helper it cannot read, a concatenation) drops the link out
              // of that check - which is how a dead /schedule/ link once shipped.
              <Link
                key={session.slug}
                to={`/book/${session.slug}`}
                className="block bg-white rounded-xl shadow hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="flex items-stretch">
                  {/* The scheduler's own accent, the same stripe the admin list and the
                      booking page use for this row. */}
                  <div
                    className="w-2 flex-shrink-0"
                    style={{ backgroundColor: session.brandColor || '#0d9488' }}
                  />
                  <div className="flex-1 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 text-lg">{session.name}</h3>
                        {session.description && (
                          <p className="text-gray-600 text-sm mt-1">{session.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-600">
                          <span className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {session.duration} {t('scheduler.minutes')}
                          </span>
                          {session.location && (
                            <span className="flex items-center">
                              <MapPin className="w-4 h-4 mr-1" />
                              {session.location}
                            </span>
                          )}
                          {session.price && parseFloat(session.price) > 0 && (
                            <span className="flex items-center">
                              {/* A price TAG, not lucide's DollarSign: that icon is a
                                  literal dollar glyph, and this product is sold to
                                  studios that price in EUR and GBP. */}
                              <Tag className="w-4 h-4 mr-1" />
                              {formatPrice(session.price)}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="flex items-center gap-1 text-teal-600 font-medium text-sm whitespace-nowrap">
                        {t('bookIndex.book')}
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { localizePath, canonicalizePath, normalizePath } from '../../shared/routeSlugs';
import { useSiteLanguage } from './hooks/useSiteLanguage';
import { lazyWithRetry } from './lib/lazyWithRetry';
import { QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { queryClient } from './lib/queryClient';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { NeonAuthProvider } from './context/NeonAuthContext';
import { CartProvider } from './context/CartContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { isEnglishPath } from './config/localeRoutes';
import CookieConsent from './components/CookieConsent';
import ConsentScripts from './components/ConsentScripts';
import HomePage from './pages/HomePage';
import FotoshootingsPage from './pages/FotoshootingsPage';
import PortfolioPage from './pages/PortfolioPage';
import BundlePage from './pages/BundlePage';
import BundleThankYouPage from './pages/BundleThankYouPage';
import BundleDeliveryPage from './pages/BundleDeliveryPage';
import GutscheinPage from './pages/GutscheinPage';
import BlogPage from './pages/BlogPage';
import BlogPostPage from './pages/BlogPostPage';
import CaseStudiesPage from './pages/CaseStudiesPage';
import WartelistePage from './pages/WartelistePage';
import KontaktPage from './pages/KontaktPage';
import VouchersPage from './pages/VouchersPage';
import VoucherDetailPage from './pages/VoucherDetailPage';
import VoucherCheckoutPage from './pages/VoucherCheckoutPage';
import VoucherSuccessPage from './pages/VoucherSuccessPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderCompletePage from './pages/OrderCompletePage';
import AccountPage from './pages/AccountPage';
import AccountProfilePage from './pages/AccountProfilePage';
import MyArchivePage from './pages/MyArchivePage';
import MySubscriptionPage from './pages/MySubscriptionPage';
import StorageDemoPage from './pages/StorageDemoPage';
import StorageDemoIndexPage from './pages/StorageDemoIndexPage';
const AdminDashboardPage = lazyWithRetry(() => import('./pages/admin/AdminDashboardPage'));
const AdminDashboardPageDev = lazyWithRetry(() => import('./pages/admin/AdminDashboardPageDev'));
const AdminLoginPage = lazyWithRetry(() => import('./pages/admin/AdminLoginPage'));
const NeonAdminLoginPage = lazyWithRetry(() => import('./pages/admin/NeonAdminLoginPage'));
const AdminLeadsPage = lazyWithRetry(() => import('./pages/admin/AdminLeadsPage'));
const AdminVoucherSalesPageV3 = lazyWithRetry(() => import('./pages/admin/AdminVoucherSalesPageV3'));
const AdminClientsPage = lazyWithRetry(() => import('./pages/admin/ClientsPage'));
const ClientDetailPage = lazyWithRetry(() => import('./pages/admin/ClientDetailPage'));
const ClientFormPage = lazyWithRetry(() => import('./pages/admin/ClientFormPage'));
const LeadSourcesPage = lazyWithRetry(() => import('./pages/admin/LeadSourcesPage'));
const AdminClientsImportPage = lazyWithRetry(() => import('./pages/admin/ClientsImportPage'));
const ImportLogsPage = lazyWithRetry(() => import('./pages/admin/ImportLogsPage'));
const HighValueClientsPage = lazyWithRetry(() => import('./pages/admin/HighValueClientsPage'));
const AdminGalleriesPage = lazyWithRetry(() => import('./pages/admin/AdminGalleriesPage'));
const AdminGalleryCreatePage = lazyWithRetry(() => import('./pages/admin/GalleryCreatePage'));
const AdminGalleryEditPage = lazyWithRetry(() => import('./pages/admin/GalleryEditPage'));
const AdminGalleryDetailPage = lazyWithRetry(() => import('./pages/admin/GalleryDetailPage'));
const InvoicesPage = lazyWithRetry(() => import('./pages/admin/InvoicesPage'));
const AdminPriceWizardPage = lazyWithRetry(() => import('./pages/admin/AdminPriceWizardPage'));
const AccountingExportPage = lazyWithRetry(() => import('./pages/admin/accounting/AccountingExportPage'));
const ProDigitalFilesPage = lazyWithRetry(() => import('./pages/admin/ProDigitalFilesPage'));
const CampaignsPage = lazyWithRetry(() => import('./pages/admin/CampaignsPage'));
const AdminInboxPageV2 = lazyWithRetry(() => import('./pages/admin/AdminInboxPageV2'));
const QuestionnairesPageV2 = lazyWithRetry(() => import('./pages/admin/QuestionnairesPageV2'));
const ComprehensiveReportsPage = lazyWithRetry(() => import('./pages/admin/ComprehensiveReportsPage'));
const SettingsPage = lazyWithRetry(() => import('./pages/admin/SettingsPage'));
const EmailSettingsPage = lazyWithRetry(() => import('./pages/admin/EmailSettingsPage'));
const CustomizationPage = lazyWithRetry(() => import('./pages/admin/CustomizationPage'));
const StudioCustomization = lazyWithRetry(() => import('./pages/admin/StudioCustomization'));
const WebsiteCustomizationWizard = lazyWithRetry(() => import('./pages/admin/WebsiteCustomizationWizard'));
const PhotographyCalendarPage = lazyWithRetry(() => import('./pages/admin/PhotographyCalendarPageSimple'));
import SurveySystemDemoPage from './pages/SurveySystemDemoPage';
import SurveyTakingPage from './pages/SurveyTakingPage';
const AdminBlogPostsPage = lazyWithRetry(() => import('./pages/admin/AdminBlogPostsPage'));
const AdminBlogNewPage = lazyWithRetry(() => import('./pages/admin/AdminBlogNewPage'));
const AdminBlogEditPage = lazyWithRetry(() => import('./pages/admin/AdminBlogEditPage'));
const KnowledgeBasePage = lazyWithRetry(() => import('./pages/admin/KnowledgeBasePage'));
const AgentV2Page = lazyWithRetry(() => import('./pages/admin/AgentV2Page'));
const AgentConsolePage = lazyWithRetry(() => import('./pages/admin/AgentConsolePage'));
const AdminLandingPagesPage = lazyWithRetry(() => import('./pages/admin/AdminLandingPagesPage'));
const BundleDeliveriesPage = lazyWithRetry(() => import('./pages/admin/BundleDeliveriesPage'));
const AdminLandingPageNewPage = lazyWithRetry(() => import('./pages/admin/AdminLandingPageNewPage'));
const AdminLandingPageEditorPage = lazyWithRetry(() => import('./pages/admin/AdminLandingPageEditorPage'));
import PublicLandingPage from './pages/PublicLandingPage';
import { useAuthorityMap } from './hooks/useAuthorityMap';
const WebsiteWizard = lazyWithRetry(() => import('./pages/admin/WebsiteWizard'));
const PriceListSettingsPage = lazyWithRetry(() => import('./pages/admin/settings/PriceListSettingsPage'));
const StorageSettingsPage = lazyWithRetry(() => import('./pages/admin/settings/StorageSettingsPage'));
const SmsSettingsPage = lazyWithRetry(() => import('./pages/admin/settings/SmsSettingsPage'));
const StripeSettingsPage = lazyWithRetry(() => import('./pages/admin/settings/StripeSettingsPage'));
const AiSettingsPage = lazyWithRetry(() => import('./pages/admin/settings/AiSettingsPage'));
const GoogleSettingsPage = lazyWithRetry(() => import('./pages/admin/settings/GoogleSettingsPage'));
const AnalyticsSettingsPage = lazyWithRetry(() => import('./pages/admin/settings/AnalyticsSettingsPage'));
const DomainSettingsPage = lazyWithRetry(() => import('./pages/admin/settings/DomainSettingsPage'));
const CustomDomainSettingsPage = lazyWithRetry(() => import('./pages/admin/settings/CustomDomainSettingsPage'));
const LanguageSettingsPage = lazyWithRetry(() => import('./pages/admin/settings/LanguageSettingsPage'));
const CalculatorSettingsPage = lazyWithRetry(() => import('./pages/admin/settings/CalculatorSettingsPage'));
const PulseSettingsPage = lazyWithRetry(() => import('./pages/admin/settings/PulseSettingsPage'));
const ShootCleanerSettingsPage = lazyWithRetry(() => import('./pages/admin/settings/ShootCleanerSettingsPage'));
const ProdigiSettingsPage = lazyWithRetry(() => import('./pages/admin/settings/ProdigiSettingsPage'));
const ManualWebsiteUpdatePage = lazyWithRetry(() => import('./pages/admin/ManualWebsiteUpdatePage'));
const WebsiteStudioPage = lazyWithRetry(() => import('./pages/admin/WebsiteStudioPage'));
import ProtectedRoute from './components/auth/ProtectedRoute';
import NeonProtectedRoute from './components/auth/NeonProtectedRoute';
import VoucherThankYouPage from './pages/VoucherThankYouPage';
import CartPage from './pages/CartPage';
import UeberUnsPage from './pages/support/UeberUnsPage';
import PreisePage from './pages/support/PreisePage';
import FAQPage from './pages/support/FAQPage';
import KundenstimmenPage from './pages/support/KundenstimmenPage';
import ImpressumPage from './pages/support/ImpressumPage';
import AGBPage from './pages/legal/AGBPage';
import DatenschutzPage from './pages/legal/DatenschutzPage';
import ModelReleasePage from './pages/legal/ModelReleasePage';
import GalleryPage from './pages/GalleryPage';
import PublicGalleriesPage from './pages/PublicGalleriesPage';
import PublicInvoicePage from './pages/PublicInvoicePage';
import { GalleryShopTest } from './pages/GalleryShopTest';
import DownloadDataPage from './pages/DownloadDataPage';
import MockSuccessPage from './pages/MockSuccessPage';
import CommunicationsPage from './pages/CommunicationsPage';
import QuestionnaireFormPage from './pages/QuestionnaireFormPage';
import ImageTestPage from './pages/ImageTestPage';
import BookingIndexPage from './pages/public/BookingIndexPage';
import PublicSchedulerPage from './pages/public/PublicSchedulerPage';
const AdminSchedulersPage = lazyWithRetry(() => import('./pages/admin/AdminSchedulersPage'));
const AdminAutomationsPage = lazyWithRetry(() => import('./pages/admin/AdminAutomationsPage'));
const CalendarSyncPage = lazyWithRetry(() => import('./pages/admin/CalendarSyncPage'));
import CalculatorPage from './pages/CalculatorPage';
const UnifiedSetupWizard = lazyWithRetry(() => import('./pages/setup/UnifiedSetupWizard'));
import ScrollToTop from './components/ScrollToTop';
import ErrorBoundary from './components/ErrorBoundary';

function RouteFallback() {
  // If a code-split chunk takes unusually long (hung request, flaky network), the
  // lazyWithRetry wrapper reloads automatically — but as a last-resort escape
  // hatch we also surface a manual reload so the user is never trapped spinning.
  const [stalled, setStalled] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setStalled(true), 12000);
    return () => clearTimeout(id);
  }, []);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="h-10 w-10 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin" aria-label="Loading" />
      {stalled && (
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-2">Still loading — this can happen right after an update.</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-full bg-purple-600 px-5 py-2 text-sm font-semibold text-white hover:bg-purple-700"
          >
            Reload page
          </button>
        </div>
      )}
    </div>
  );
}

function PrerenderReadySignal() {
  const location = useLocation();

  useEffect(() => {
    let firstFrame = 0;
    let secondFrame = 0;

    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        document.dispatchEvent(new Event('prerender-ready'));
      });
    });

    return () => {
      if (firstFrame) window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [location.pathname]);

  return null;
}

// Force English on the /en/ URL tree (the source of truth for English), without
// persisting it as a manual choice. Other routes keep their existing toggle.
function LanguageRouteSync() {
  const location = useLocation();
  const { language, setLanguage } = useLanguage();
  useEffect(() => {
    if (isEnglishPath(location.pathname) && language !== 'en') {
      setLanguage('en', false);
    }
  }, [location.pathname, language, setLanguage]);
  return null;
}

/**
 * Serve a studio's OWN pillar pages at their real paths.
 *
 * "Build pillar pages" creates a landing page per pillar, but only at /lp/<slug> —
 * while the Authority Map, the nav and every internal link point at the pillar path
 * itself (/boudoir-photography/). Those paths had no route, so a studio's generated
 * pillars existed and were unreachable.
 *
 * This matches the current path against the studio's own pillars and renders the
 * corresponding landing page. It is deliberately LAST in the table, so it only ever
 * sees paths no real route claimed. Unknown paths fall through to the homepage, as
 * they did before.
 */
/**
 * Serves the public routes at paths in the STUDIO'S language.
 *
 * The route table below is written with German paths (/kontakt, /fotoshootings) because
 * that is what the image was built with, and ~420 link literals across the codebase
 * already point at them. Rather than rewrite all of those, this wraps <Routes> and does
 * two things:
 *
 *   • an incoming LOCALISED path (/contact) is matched against the CANONICAL route
 *     (/kontakt) by handing <Routes> a rewritten location — the table is untouched and
 *     the URL bar keeps the localised path;
 *   • an incoming CANONICAL path, on a studio whose language names it differently, is
 *     replaced with the localised one — so a German link in the code still lands the
 *     visitor on /contact, and only one URL is ever canonical.
 *
 * A German studio is unaffected: localizePath returns the path it was given.
 */
function LocalizedRoutes({ children }: { children: React.ReactNode }) {
  const lang = useSiteLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  // Until the language is known, behave exactly as before. Guessing 'en' here would
  // rewrite a German studio's URLs for a moment on every load.
  const canonical = lang ? canonicalizePath(location.pathname, lang) : null;
  const localized = lang ? localizePath(location.pathname, lang) : null;
  const shouldRedirect = !!lang && !canonical && !!localized && localized !== normalizePath(location.pathname);

  useEffect(() => {
    if (shouldRedirect && localized) {
      navigate(`${localized}${location.search}${location.hash}`, { replace: true });
    }
  }, [shouldRedirect, localized, location.search, location.hash, navigate]);

  const routeLocation = canonical ? { ...location, pathname: canonical } : location;
  return <Routes location={routeLocation}>{children}</Routes>;
}

function PillarRoute() {
  const location = useLocation();
  const { map, loading } = useAuthorityMap();

  // Trailing slashes vary between the map, the nav and what a visitor types.
  const norm = (s: string) => '/' + String(s || '').replace(/^\/+|\/+$/g, '');
  // Must stay byte-identical to slugify() in server/lib/landing-mapping.ts, which is
  // what authority-scaffold names the created page with. Not imported because that
  // module lives on the server side of the tree; if you change one, change both.
  const slugFor = (href: string) =>
    String(href || '')
      .replace(/^\/+|\/+$/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'home';

  if (loading) return null;

  const hit = (map?.pillars || []).find((p: any) => norm(p.href) === norm(location.pathname));
  if (!hit) return <RootHome />;

  return <PublicLandingPage slugOverride={slugFor(hit.href)} />;
}

/**
 * Gate for pages a studio has switched off. A disabled page 301s to its live
 * equivalent rather than rendering — an unlinked page that still returns content is
 * still crawlable, and competes with the page the studio actually uses. The page
 * itself stays in the codebase as a template it can switch back on.
 */
function PageGate({ pageId, children }: { pageId: string; children: React.ReactNode }) {
  const [enabled, setEnabled] = useState<boolean | undefined>(undefined);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/studio-config')
      .then(r => r.json())
      .then(async (d) => {
        if (cancelled) return;
        const { isPageEnabled, SITE_PAGES } = await import('../../shared/sitePages');
        const def = SITE_PAGES.find(p => p.id === pageId);
        const ok = isPageEnabled(pageId, d?.enabledPages, d?.lang || d?.siteLanguage || 'en');
        setRedirectTo(def?.redirectTo || '/');
        setEnabled(ok);
      })
      .catch(() => { if (!cancelled) setEnabled(true); }); // never hide a page on a config error
    return () => { cancelled = true; };
  }, [pageId]);

  if (enabled === undefined) return null;
  if (!enabled && redirectTo) return <Navigate to={redirectTo} replace />;
  return <>{children}</>;
}

// Root route: render the studio's AI-generated homepage (a published landing page)
// when one is set as the homepage, otherwise the built-in HomePage. Defaults to
// HomePage while the config loads so there's no blank flash. SSR meta for "/" is
// handled separately in server/vite.ts.
function RootHome() {
  // The server injects the answer into the HTML (window.__HOMEPAGE_LANDING_SLUG__),
  // so the correct homepage renders on the FIRST paint. Previously this started as
  // undefined and rendered the built-in HomePage while /api/studio-config loaded,
  // then swapped to the landing page — the whole homepage visibly replaced by a
  // different one on every single load.
  const injected = typeof window !== 'undefined'
    ? (window as any).__HOMEPAGE_LANDING_SLUG__
    : undefined;
  const [slug, setSlug] = useState<string | null | undefined>(
    injected === undefined ? undefined : (injected || null)
  );

  useEffect(() => {
    // Only ask the API when the server did not tell us (dev server, cached shell).
    if (injected !== undefined) return;
    let cancelled = false;
    fetch('/api/studio-config')
      .then(r => r.json())
      .then(d => { if (!cancelled) setSlug(d?.homepageLandingSlug || null); })
      .catch(() => { if (!cancelled) setSlug(null); });
    return () => { cancelled = true; };
  }, [injected]);

  // Still unknown: render nothing rather than a homepage we may be about to replace.
  // A brief blank beats showing the wrong page and swapping it out.
  if (slug === undefined) return null;
  if (slug) return <PublicLandingPage slugOverride={slug} />;
  return <HomePage />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
      <AuthProvider>
        <NeonAuthProvider>
          <AppProvider>
            <CartProvider>
              <LanguageProvider>
              <Router>
              <PrerenderReadySignal />
              <ScrollToTop />
              <LanguageRouteSync />
              <ErrorBoundary>
              <Suspense fallback={<RouteFallback />}>
              <LocalizedRoutes>
                <Route path="/" element={<RootHome />} />

                {/* TogNinja + ShootCleaner bundle: buy → thank-you (claim) → delivery */}
                <Route path="/bundle" element={<BundlePage />} />
                <Route path="/bundle/thankyou" element={<BundleThankYouPage />} />
                <Route path="/deliver/:token" element={<BundleDeliveryPage />} />

                {/* English (EN) URLs — separately indexable English pages that
                    render the same components with the language forced to EN via
                    LanguageRouteSync. See client/src/config/localeRoutes.ts. */}
                <Route path="/en" element={<HomePage />} />
                <Route path="/en/" element={<HomePage />} />
                <Route path="/en/case-studies/" element={<CaseStudiesPage />} />
                <Route path="/en/pricing/" element={<PreisePage />} />
                <Route path="/en/vouchers/" element={<VouchersPage />} />
                <Route path="/en/contact/" element={<KontaktPage />} />
                <Route path="/en/waitlist/" element={<WartelistePage />} />
                <Route path="/en/about-us/" element={<UeberUnsPage />} />

                <Route path="/portfolio" element={<PortfolioPage />} />
                <Route path="/fotoshootings" element={<FotoshootingsPage />} />
                
                {/* SEO Pillar Pages */}
                
                {/* Support Pages */}
                <Route path="/ueber-uns/" element={<PageGate pageId="ueber-uns-de"><UeberUnsPage /></PageGate>} />
                <Route path="/preise/" element={<PreisePage />} />
                {/* Duplicate pricing page consolidated on /preise/ (server 301s
                    direct hits; this covers client-side navigation too). */}
                <Route path="/fotoshooting-preise-wien/" element={<Navigate to="/preise/" replace />} />
                <Route path="/faq/" element={<FAQPage />} />
                <Route path="/kundenstimmen/" element={<KundenstimmenPage />} />
                <Route path="/impressum/" element={<ImpressumPage />} />
                <Route path="/agb/" element={<AGBPage />} />
                <Route path="/datenschutz/" element={<DatenschutzPage />} />
                <Route path="/model-release/" element={<ModelReleasePage />} />
                {/* SEO pillar hubs (July 2026 audit) */}
                
                <Route path="/gutschein" element={<PageGate pageId="gutschein-de"><GutscheinPage /></PageGate>} />
                {/* /gutschein/{family,newborn,maternity} were the origin studio's own voucher
                    landing pages — hardcoded price tiers, Vienna client photos on third-party
                    image hosts, German copy naming a studio in 1050 Wien. Deleted in the Aug
                    2026 de-branding; SEO_REDIRECTS 301s all three to /vouchers, which reads
                    the studio's real voucher_products. Client-side Navigate covers in-app
                    links that never reach the server. */}
                <Route path="/gutschein/family" element={<Navigate to="/vouchers" replace />} />
                <Route path="/gutschein/newborn" element={<Navigate to="/vouchers" replace />} />
                <Route path="/gutschein/maternity" element={<Navigate to="/vouchers" replace />} />
                <Route path="/voucher/thank-you" element={<VoucherThankYouPage />} />
                <Route path="/blog" element={<BlogPage />} />
                <Route path="/case-studies" element={<CaseStudiesPage />} />
                <Route path="/blog/:slug" element={<BlogPostPage />} />
                <Route path="/lp/:slug" element={<PublicLandingPage />} />
                <Route path="/warteliste" element={<PageGate pageId="warteliste-de"><WartelistePage /></PageGate>} />
                <Route path="/kontakt" element={<PageGate pageId="kontakt-de"><KontaktPage /></PageGate>} />
                <Route path="/vouchers" element={<VouchersPage />} />
                <Route path="/voucher/:slug" element={<VoucherDetailPage />} />
                <Route path="/gutschein/:slug" element={<VoucherDetailPage />} />
                <Route path="/vouchers/checkout/:id" element={<VoucherCheckoutPage />} />
                <Route path="/vouchers/success" element={<VoucherSuccessPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/checkout/:id" element={<CheckoutPage />} />
                <Route path="/checkout/voucher/:id" element={<CheckoutPage />} />
                <Route path="/checkout/success" element={<OrderCompletePage />} />
                <Route path="/checkout/mock-success" element={<MockSuccessPage />} />
                <Route path="/order-complete/:id" element={<OrderCompletePage />} />                <Route path="/account" element={<AccountPage />} />
                <Route path="/account/profile" element={<AccountProfilePage />} />
                <Route path="/my-archive" element={<MyArchivePage />} />
                <Route path="/my-subscription" element={<MySubscriptionPage />} />
                <Route path="/storage-demo-index" element={<StorageDemoIndexPage />} />
                <Route path="/storage-demo" element={<StorageDemoPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/galleries" element={<PublicGalleriesPage />} />
                <Route path="/galerie" element={<Navigate to="/galleries" replace />} />
                <Route path="/gallery/:slug" element={<GalleryPage />} />
                <Route path="/gallery" element={<ProtectedRoute><GalleryPage /></ProtectedRoute>} />
                {/* Dedicated calculator page */}
                <Route path="/calculator" element={<CalculatorPage />} />
                <Route path="/survey-demo" element={<SurveySystemDemoPage />} />
                <Route path="/survey/:id" element={<SurveyTakingPage />} />
                <Route path="/q/:token" element={<QuestionnaireFormPage />} />
                {/* The booking front door: one page listing every active session type.
                    Ungated on purpose - like /q/:token, /gallery/:slug and /invoice/:id,
                    it is not in shared/sitePages.ts, because a switch-off-able booking
                    index would need the admin copy button to respect the switch too. */}
                <Route path="/book" element={<BookingIndexPage />} />
                <Route path="/book/:slug" element={<PublicSchedulerPage />} />
                <Route path="/invoice/:invoiceId" element={<PublicInvoicePage />} />
                <Route path="/inv/:invoiceId" element={<PublicInvoicePage />} />
                <Route path="/download-data" element={<DownloadDataPage />} />

                {/* Admin routes */}
                <Route path="/admin/login" element={<NeonAdminLoginPage />} />
                <Route path="/admin/supabase-login" element={<AdminLoginPage />} />
                <Route path="/admin/dev" element={<AdminDashboardPageDev />} />
                <Route
                  path="/admin"
                  element={
                    <NeonProtectedRoute>
                      <AdminDashboardPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/dashboard"
                  element={
                    <NeonProtectedRoute>
                      <AdminDashboardPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/leads"
                  element={
                    <NeonProtectedRoute>
                      <AdminLeadsPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/voucher-sales"
                  element={
                    <NeonProtectedRoute>
                      <AdminVoucherSalesPageV3 />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/clients"
                  element={
                    <NeonProtectedRoute>
                      <AdminClientsPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/clients/new"
                  element={
                    <NeonProtectedRoute>
                      <ClientFormPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/clients/:id"
                  element={
                    <NeonProtectedRoute>
                      <ClientDetailPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/clients/:id/edit"
                  element={
                    <NeonProtectedRoute>
                      <ClientFormPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/clients/import"
                  element={
                    <NeonProtectedRoute>
                      <AdminClientsImportPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/clients/import-logs"
                  element={
                    <NeonProtectedRoute>
                      <ImportLogsPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/lead-sources"
                  element={
                    <NeonProtectedRoute>
                      <LeadSourcesPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/high-value-clients"
                  element={
                    <NeonProtectedRoute>
                      <HighValueClientsPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/galleries"
                  element={
                    <NeonProtectedRoute>
                      <AdminGalleriesPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/galleries/new"
                  element={
                    <NeonProtectedRoute>
                      <AdminGalleryCreatePage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/galleries/:id/edit"
                  element={
                    <NeonProtectedRoute>
                      <AdminGalleryEditPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/galleries/:id"
                  element={
                    <NeonProtectedRoute>
                      <AdminGalleryDetailPage />
                    </NeonProtectedRoute>
                  }
                />

                <Route
                  path="/admin/calendar"
                  element={
                    <NeonProtectedRoute>
                      <PhotographyCalendarPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/calendar-sync"
                  element={
                    <NeonProtectedRoute>
                      <CalendarSyncPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/schedulers"
                  element={
                    <NeonProtectedRoute>
                      <AdminSchedulersPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/invoices"
                  element={
                    <NeonProtectedRoute>
                      <InvoicesPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/price-wizard"
                  element={
                    <NeonProtectedRoute>
                      <AdminPriceWizardPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/accounting"
                  element={
                    <NeonProtectedRoute>
                      <AccountingExportPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/files"
                  element={
                    <NeonProtectedRoute>
                      <ProDigitalFilesPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/digital-files"
                  element={
                    <NeonProtectedRoute>
                      <ProDigitalFilesPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/campaigns"
                  element={
                    <NeonProtectedRoute>
                      <CampaignsPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/email-campaigns"
                  element={
                    <NeonProtectedRoute>
                      <CampaignsPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/automations"
                  element={
                    <NeonProtectedRoute>
                      <AdminAutomationsPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/inbox"
                  element={
                    <NeonProtectedRoute>
                      <AdminInboxPageV2 />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/communications"
                  element={
                    <NeonProtectedRoute>
                      <CommunicationsPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/questionnaires"
                  element={
                    <NeonProtectedRoute>
                      <QuestionnairesPageV2 />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/reports"
                  element={
                    <NeonProtectedRoute>
                      <ComprehensiveReportsPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/crm-assistant"
                  element={<Navigate to="/admin/dashboard" replace />}
                />
                <Route
                  path="/admin/agent-v2"
                  element={
                    <NeonProtectedRoute>
                      <AgentV2Page />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/landing-pages"
                  element={
                    <NeonProtectedRoute>
                      <AdminLandingPagesPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/landing-pages/new"
                  element={
                    <NeonProtectedRoute>
                      <AdminLandingPageNewPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/landing-pages/:id"
                  element={
                    <NeonProtectedRoute>
                      <AdminLandingPageEditorPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/bundle-deliveries"
                  element={
                    <NeonProtectedRoute>
                      <BundleDeliveriesPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/agent-console"
                  element={
                    <NeonProtectedRoute>
                      <AgentConsolePage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/knowledge-base"
                  element={
                    <NeonProtectedRoute>
                      <KnowledgeBasePage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/settings"
                  element={
                    <NeonProtectedRoute>
                      <SettingsPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/settings/email"
                  element={
                    <NeonProtectedRoute>
                      <EmailSettingsPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/settings/price-list"
                  element={
                    <NeonProtectedRoute>
                      <PriceListSettingsPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/settings/storage"
                  element={
                    <NeonProtectedRoute>
                      <StorageSettingsPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/settings/prodigi"
                  element={
                    <NeonProtectedRoute>
                      <ProdigiSettingsPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/settings/sms"
                  element={
                    <NeonProtectedRoute>
                      <SmsSettingsPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/settings/payments"
                  element={
                    <NeonProtectedRoute>
                      <StripeSettingsPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/settings/ai"
                  element={
                    <NeonProtectedRoute>
                      <AiSettingsPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/settings/google"
                  element={
                    <NeonProtectedRoute>
                      <GoogleSettingsPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/settings/analytics"
                  element={
                    <NeonProtectedRoute>
                      <AnalyticsSettingsPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/settings/domain"
                  element={
                    <NeonProtectedRoute>
                      <DomainSettingsPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/settings/custom-domain"
                  element={
                    <NeonProtectedRoute>
                      <CustomDomainSettingsPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/settings/languages"
                  element={
                    <NeonProtectedRoute>
                      <LanguageSettingsPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/settings/calculator"
                  element={
                    <NeonProtectedRoute>
                      <CalculatorSettingsPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/settings/pulse"
                  element={
                    <NeonProtectedRoute>
                      <PulseSettingsPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/settings/shootcleaner"
                  element={
                    <NeonProtectedRoute>
                      <ShootCleanerSettingsPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/customization"
                  element={
                    <NeonProtectedRoute>
                      <CustomizationPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/studio-templates"
                  element={
                    <NeonProtectedRoute>
                      <StudioCustomization />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/website-wizard"
                  element={
                    <NeonProtectedRoute>
                      <WebsiteCustomizationWizard />
                    </NeonProtectedRoute>
                  }
                />
                {/* Website Studio — one home for Analyse / Customise / Themes. */}
                <Route
                  path="/admin/website-studio"
                  element={
                    <NeonProtectedRoute>
                      <WebsiteStudioPage />
                    </NeonProtectedRoute>
                  }
                />
                {/* Old tool routes now redirect into the Studio tabs (no dead links). */}
                <Route path="/admin/website-analyzer" element={<Navigate to="/admin/website-studio?tab=analyse" replace />} />
                <Route path="/admin/manual-website-update" element={<Navigate to="/admin/website-studio?tab=customise" replace />} />
                {/* Public onboarding wizard entry */}
                <Route path="/onboarding" element={<WebsiteWizard />} />
                
                {/* Onboarding — ONE unified wizard at /setup (old /setup/technical redirects in) */}
                <Route path="/setup/technical" element={<Navigate to="/setup" replace />} />
                <Route path="/setup/technical/*" element={<Navigate to="/setup" replace />} />
                <Route path="/setup" element={<UnifiedSetupWizard />} />
                <Route path="/setup/*" element={<UnifiedSetupWizard />} />
                <Route
                  path="/"
                  element={<HomePage />}
                />
                <Route
                  path="/home"
                  element={<HomePage />}
                />
                <Route
                  path="/admin/studio-calendar"
                  element={<Navigate to="/admin/calendar" replace />}
                />
                <Route
                  path="/admin/gallery"
                  element={<Navigate to="/admin/galleries" replace />}
                />
                <Route
                  path="/admin/blog"
                  element={
                    <NeonProtectedRoute>
                      <AdminBlogPostsPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/blog/posts"
                  element={
                    <NeonProtectedRoute>
                      <AdminBlogPostsPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/blog/new"
                  element={
                    <NeonProtectedRoute>
                      <AdminBlogNewPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/blog/edit/:id"
                  element={
                    <NeonProtectedRoute>
                      <AdminBlogEditPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/clients/new"
                  element={
                    <NeonProtectedRoute>
                      <ClientFormPage />
                    </NeonProtectedRoute>
                  }
                />

                {/* LAST: a studio's own pillar pages, served at their real paths.
                    Everything above has already claimed its route, so this only sees
                    paths nothing else matched. */}
                <Route path="*" element={<PillarRoute />} />
              </LocalizedRoutes>
              </Suspense>
              </ErrorBoundary>
              <CookieConsent privacyPolicyUrl="/datenschutz/" imprintUrl="/impressum/" />
              <ConsentScripts />
            </Router>
              </LanguageProvider>
            </CartProvider>
          </AppProvider>
        </NeonAuthProvider>
      </AuthProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
}

export default App;

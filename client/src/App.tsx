import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
const ClientProfilePage = lazyWithRetry(() => import('./pages/admin/ClientProfilePage'));
const ClientFormPage = lazyWithRetry(() => import('./pages/admin/ClientFormPage'));
const LeadSourcesPage = lazyWithRetry(() => import('./pages/admin/LeadSourcesPage'));
const AdminClientsImportPage = lazyWithRetry(() => import('./pages/admin/ClientsImportPage'));
const ImportLogsPage = lazyWithRetry(() => import('./pages/admin/ImportLogsPage'));
const HighValueClientsPage = lazyWithRetry(() => import('./pages/admin/HighValueClientsPage'));
const GalleriesPage = lazyWithRetry(() => import('./pages/admin/GalleriesPage'));
const AdminGalleriesPage = lazyWithRetry(() => import('./pages/admin/AdminGalleriesPage'));
const CalendarPage = lazyWithRetry(() => import('./pages/admin/CalendarPage'));
const AdminGalleryCreatePage = lazyWithRetry(() => import('./pages/admin/GalleryCreatePage'));
const AdminGalleryEditPage = lazyWithRetry(() => import('./pages/admin/GalleryEditPage'));
const AdminGalleryDetailPage = lazyWithRetry(() => import('./pages/admin/GalleryDetailPage'));
const InvoicesPage = lazyWithRetry(() => import('./pages/admin/InvoicesPage'));
const AdminPriceWizardPage = lazyWithRetry(() => import('./pages/admin/AdminPriceWizardPage'));
const AccountingExportPage = lazyWithRetry(() => import('./pages/admin/accounting/AccountingExportPage'));
const FilesPage = lazyWithRetry(() => import('./pages/admin/FilesPage'));
const ProDigitalFilesPage = lazyWithRetry(() => import('./pages/admin/ProDigitalFilesPage'));
const CampaignsPage = lazyWithRetry(() => import('./pages/admin/CampaignsPage'));
const AdminInboxPageV2 = lazyWithRetry(() => import('./pages/admin/AdminInboxPageV2'));
const QuestionnairesPageV2 = lazyWithRetry(() => import('./pages/admin/QuestionnairesPageV2'));
const ComprehensiveReportsPage = lazyWithRetry(() => import('./pages/admin/ComprehensiveReportsPage'));
const SettingsPage = lazyWithRetry(() => import('./pages/admin/SettingsPage'));
const EmailSettingsPage = lazyWithRetry(() => import('./pages/admin/EmailSettingsPage'));
const CalendarTest = lazyWithRetry(() => import('./pages/admin/CalendarTest'));
const CustomizationPage = lazyWithRetry(() => import('./pages/admin/CustomizationPage'));
const StudioCustomization = lazyWithRetry(() => import('./pages/admin/StudioCustomization'));
const StudioCalendarPage = lazyWithRetry(() => import('./pages/admin/StudioCalendarPage'));
const WebsiteCustomizationWizard = lazyWithRetry(() => import('./pages/admin/WebsiteCustomizationWizard'));
const PhotographyCalendarPage = lazyWithRetry(() => import('./pages/admin/PhotographyCalendarPageSimple'));
import SurveySystemDemoPage from './pages/SurveySystemDemoPage';
import SurveyTakingPage from './pages/SurveyTakingPage';
const AdminBlogPostsPage = lazyWithRetry(() => import('./pages/admin/AdminBlogPostsPage'));
const AdminBlogNewPage = lazyWithRetry(() => import('./pages/admin/AdminBlogNewPage'));
const AdminBlogEditPage = lazyWithRetry(() => import('./pages/admin/AdminBlogEditPage'));
const KnowledgeBasePage = lazyWithRetry(() => import('./pages/admin/KnowledgeBasePage'));
const CRMOperationsAssistant = lazyWithRetry(() => import('./pages/admin/CRMOperationsAssistant'));
const AgentV2Page = lazyWithRetry(() => import('./pages/admin/AgentV2Page'));
const AgentConsolePage = lazyWithRetry(() => import('./pages/admin/AgentConsolePage'));
const AdminLandingPagesPage = lazyWithRetry(() => import('./pages/admin/AdminLandingPagesPage'));
const AdminLandingPageNewPage = lazyWithRetry(() => import('./pages/admin/AdminLandingPageNewPage'));
const AdminLandingPageEditorPage = lazyWithRetry(() => import('./pages/admin/AdminLandingPageEditorPage'));
import PublicLandingPage from './pages/PublicLandingPage';
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
const ManualWebsiteUpdatePage = lazyWithRetry(() => import('./pages/admin/ManualWebsiteUpdatePage'));
import GewerblicheFotografieWienPage from './pages/GewerblicheFotografieWienPage';
import WarumNewAgePage from './pages/WarumNewAgePage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import NeonProtectedRoute from './components/auth/NeonProtectedRoute';
import VoucherThankYouPage from './pages/VoucherThankYouPage';
import CartPage from './pages/CartPage';
import FamilyGutscheinPage from './pages/gutschein/FamilyGutscheinPage';
import NewbornGutscheinPage from './pages/gutschein/NewbornGutscheinPage';
import MaternityGutscheinPage from './pages/gutschein/MaternityGutscheinPage';
import BusinessFotoshootingPage from './pages/fotoshootings/BusinessFotoshootingPage';
import EventFotoshootingPage from './pages/fotoshootings/EventFotoshootingPage';
import WeddingFotoshootingPage from './pages/fotoshootings/WeddingFotoshootingPage';
import FamilienFotoshootingWienPage from './pages/fotoshootings/FamilienFotoshootingWienPage';
import FamilienfotosWienPage from './pages/fotoshootings/FamilienfotosWienPage';
import NeugeborenenfotosWienPage from './pages/fotoshootings/NeugeborenenfotosWienPage';
import BabyfotosWienPage from './pages/fotoshootings/BabyfotosWienPage';
import BabyFotografieWienPage from './pages/fotoshootings/BabyFotografieWienPage';
import SchwangerschaftsfotosWienPage from './pages/fotoshootings/SchwangerschaftsfotosWienPage';
import BusinessPortraitWienPage from './pages/fotoshootings/BusinessPortraitWienPage';
import TeamfotosWienPage from './pages/fotoshootings/TeamfotosWienPage';
import BewerbungsfotosWienPage from './pages/fotoshootings/BewerbungsfotosWienPage';
import EventfotografieWienPage from './pages/fotoshootings/EventfotografieWienPage';
import HochzeitsfotografieWienPage from './pages/fotoshootings/HochzeitsfotografieWienPage';
import ProduktfotografieWienPage from './pages/fotoshootings/ProduktfotografieWienPage';
import ImmobilienfotografieWienPage from './pages/fotoshootings/ImmobilienfotografieWienPage';
import StudioFotografieWienPage from './pages/fotoshootings/StudioFotografieWienPage';
import TestHeroPage from './pages/TestHeroPage';
import KinderFotografieWienPage from './pages/fotoshootings/KinderFotografieWienPage';
import PortraitfotografieWienPage from './pages/fotoshootings/PortraitfotografieWienPage';
import SchulfotografieWienPage from './pages/fotoshootings/SchulfotografieWienPage';
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
              <Routes>
                <Route path="/" element={<HomePage />} />

                {/* English (EN) URLs — separately indexable English pages that
                    render the same components with the language forced to EN via
                    LanguageRouteSync. See client/src/config/localeRoutes.ts. */}
                <Route path="/en" element={<HomePage />} />
                <Route path="/en/" element={<HomePage />} />
                <Route path="/en/family-photography-vienna/" element={<FamilienfotosWienPage />} />
                <Route path="/en/newborn-photography-vienna/" element={<NeugeborenenfotosWienPage />} />
                <Route path="/en/maternity-photography-vienna/" element={<SchwangerschaftsfotosWienPage />} />
                <Route path="/en/business-portraits-vienna/" element={<BusinessPortraitWienPage />} />
                <Route path="/en/case-studies/" element={<CaseStudiesPage />} />
                <Route path="/en/application-photos-vienna/" element={<BewerbungsfotosWienPage />} />
                <Route path="/en/wedding-photography-vienna/" element={<HochzeitsfotografieWienPage />} />
                <Route path="/en/baby-photos-vienna/" element={<BabyfotosWienPage />} />
                <Route path="/en/portrait-photography-vienna/" element={<PortraitfotografieWienPage />} />
                <Route path="/en/pricing/" element={<PreisePage />} />
                <Route path="/en/vouchers/" element={<VouchersPage />} />
                <Route path="/en/contact/" element={<KontaktPage />} />
                <Route path="/en/waitlist/" element={<WartelistePage />} />
                <Route path="/en/about-us/" element={<UeberUnsPage />} />

                <Route path="/portfolio" element={<PortfolioPage />} />
                <Route path="/fotoshootings" element={<FotoshootingsPage />} />
                <Route path="/fotoshootings/business" element={<BusinessFotoshootingPage />} />
                <Route path="/fotoshootings/event" element={<EventFotoshootingPage />} />
                <Route path="/fotoshootings/wedding" element={<WeddingFotoshootingPage />} />
                
                {/* SEO Cornerstone Pages */}
                <Route path="/familienfotos-wien/" element={<FamilienfotosWienPage />} />
                <Route path="/neugeborenenfotos-wien/" element={<NeugeborenenfotosWienPage />} />
                <Route path="/babyfotos-wien/" element={<BabyfotosWienPage />} />
                <Route path="/teamfotos-wien/" element={<TeamfotosWienPage />} />
                <Route path="/bewerbungsfotos-wien/" element={<BewerbungsfotosWienPage />} />
                <Route path="/eventfotografie-wien/" element={<EventfotografieWienPage />} />
                <Route path="/hochzeitsfotografie-wien/" element={<HochzeitsfotografieWienPage />} />
                <Route path="/produkt-fotografie-wien/" element={<ProduktfotografieWienPage />} />
                <Route path="/test-hero" element={<TestHeroPage />} />
                <Route path="/immobilien-fotografie-wien/" element={<ImmobilienfotografieWienPage />} />
                <Route path="/studio-fotografie-wien/" element={<StudioFotografieWienPage />} />
                <Route path="/familien-fotoshooting-wien/" element={<FamilienFotoshootingWienPage />} />
                <Route path="/baby-fotografie-wien/" element={<BabyFotografieWienPage />} />
                <Route path="/schwangerschaftsfotos-wien/" element={<SchwangerschaftsfotosWienPage />} />
                <Route path="/business-portrait-wien/" element={<BusinessPortraitWienPage />} />
                
                {/* SEO Pillar Pages */}
                <Route path="/kinder-fotografie-wien/" element={<KinderFotografieWienPage />} />
                <Route path="/portrait-fotografie-wien/" element={<PortraitfotografieWienPage />} />
                <Route path="/schul-und-hochschulfotografie-wien/" element={<SchulfotografieWienPage />} />
                
                {/* Support Pages */}
                <Route path="/ueber-uns/" element={<UeberUnsPage />} />
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
                <Route path="/gewerbliche-fotografie-wien/" element={<GewerblicheFotografieWienPage />} />
                <Route path="/warum-new-age-fotografie/" element={<WarumNewAgePage />} />
                
                <Route path="/gutschein" element={<GutscheinPage />} />
                <Route path="/gutschein/family" element={<FamilyGutscheinPage />} />
                <Route path="/gutschein/newborn" element={<NewbornGutscheinPage />} />
                <Route path="/gutschein/maternity" element={<MaternityGutscheinPage />} />
                <Route path="/voucher/thank-you" element={<VoucherThankYouPage />} />
                <Route path="/blog" element={<BlogPage />} />
                <Route path="/case-studies" element={<CaseStudiesPage />} />
                <Route path="/blog/:slug" element={<BlogPostPage />} />
                <Route path="/lp/:slug" element={<PublicLandingPage />} />
                <Route path="/warteliste" element={<WartelistePage />} />
                <Route path="/kontakt" element={<KontaktPage />} />
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
                <Route path="/demo-success" element={<MockSuccessPage />} />
                <Route path="/order-complete/:id" element={<OrderCompletePage />} />                <Route path="/account" element={<AccountPage />} />
                <Route path="/account/profile" element={<AccountProfilePage />} />
                <Route path="/my-archive" element={<MyArchivePage />} />
                <Route path="/my-subscription" element={<MySubscriptionPage />} />
                <Route path="/storage-demo-index" element={<StorageDemoIndexPage />} />
                <Route path="/storage-demo" element={<StorageDemoPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/galleries" element={<PublicGalleriesPage />} />
                <Route path="/galerie" element={<PublicGalleriesPage />} />
                <Route path="/gallery/:slug" element={<GalleryPage />} />
                <Route path="/gallery" element={<ProtectedRoute><GalleryPage /></ProtectedRoute>} />
                {/* Dedicated calculator page */}
                <Route path="/calculator" element={<CalculatorPage />} />
                <Route path="/survey-demo" element={<SurveySystemDemoPage />} />
                <Route path="/survey/:id" element={<SurveyTakingPage />} />
                <Route path="/q/:token" element={<QuestionnaireFormPage />} />
                <Route path="/book/:slug" element={<PublicSchedulerPage />} />
                <Route path="/invoice/:invoiceId" element={<PublicInvoicePage />} />
                <Route path="/inv/:invoiceId" element={<PublicInvoicePage />} />
                <Route path="/download-data" element={<DownloadDataPage />} />
                <Route path="/image-test" element={<ImageTestPage />} />

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
                <Route
                  path="/admin/website-analyzer"
                  element={
                    <NeonProtectedRoute>
                      <WebsiteWizard />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/manual-website-update"
                  element={
                    <NeonProtectedRoute>
                      <ManualWebsiteUpdatePage />
                    </NeonProtectedRoute>
                  }
                />
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
                  path="/admin/calendar"
                  element={
                    <NeonProtectedRoute>
                      <PhotographyCalendarPage />
                    </NeonProtectedRoute>
                  }
                />
                <Route
                  path="/admin/calendar-test"
                  element={
                    <NeonProtectedRoute>
                      <CalendarTest />
                    </NeonProtectedRoute>
                  }
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
                <Route path="/gallery-shop-test" element={<GalleryShopTest />} />
              </Routes>
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
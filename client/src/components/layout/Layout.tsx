import React, { ReactNode } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { ThemeScope } from '../public/ThemeScope';
import Header from './Header';
import Breadcrumbs from './Breadcrumbs';
import Footer from './Footer';
import PartnerLogos from './PartnerLogos';
import GoogleReviews from './GoogleReviews';
import WhatsAppButton from '../WhatsAppButton';
import ExitIntentPopup from '../ExitIntentPopup';
import RelatedPages from '../SEO/RelatedPages';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { t } = useLanguage();

  return (
    /*
     * The studio's chosen theme, applied to the WHOLE public site.
     *
     * ThemeScope was only ever wrapped around PublicLandingPage, so picking a preset
     * re-skinned a studio's pillar and landing pages while its homepage, about, contact,
     * pricing, vouchers, blog and portfolio stayed purple with Poppins. Measured: on
     * /fashion-photography, switching aurora -> executive moved --tn-primary from #7c3aed
     * to #1e3a5f and the h1 from system-ui to Georgia; on / nothing moved at all, because
     * there was no .tn-theme element on the page.
     *
     * Nothing else was needed — the override map inside ThemeScope already translates the
     * hardcoded purple/pink Tailwind classes (there are ~1,900 of them across the public
     * pages) into theme tokens. It was simply never pointed at these pages.
     *
     * Safe to put the !important rules here: the admin does not use Layout, so they cannot
     * reach admin screens. The min-h-screen flex column stays inside, so the page still
     * fills the viewport and the footer still sits at the bottom on short pages.
     */
    <ThemeScope>
      <div className="flex flex-col min-h-screen" style={{ position: 'static', overflow: 'visible' }}>
        <Header />
        <Breadcrumbs />
        <main className="flex-grow" style={{ position: 'static', overflow: 'visible' }}>
          {children}
        </main>
        <RelatedPages />
        <GoogleReviews />
        <PartnerLogos />
        <Footer />
        <WhatsAppButton />
        <ExitIntentPopup />
      </div>
    </ThemeScope>
  );
};

export default Layout;
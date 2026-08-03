import React, { ReactNode } from 'react';
import { useLanguage } from '../../context/LanguageContext';
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
  );
};

export default Layout;
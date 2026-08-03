import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';

// Icons for Process Strip
const CalendarIcon = () => (
  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const ClipboardIcon = () => (
  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);

const CameraIcon = () => (
  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ImageIcon = () => (
  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="w-5 h-5 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const InfoIcon = () => (
  <svg className="w-4 h-4 ml-1 inline-block text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="w-4 h-4 ml-1 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
  </svg>
);

// Process Strip Component
const ProcessStrip: React.FC = () => {
  const { t } = useLanguage();

  const steps = [
    { icon: CalendarIcon, labelKey: 'faq.process.step1.label', descKey: 'faq.process.step1.desc' },
    { icon: ClipboardIcon, labelKey: 'faq.process.step2.label', descKey: 'faq.process.step2.desc' },
    { icon: CameraIcon, labelKey: 'faq.process.step3.label', descKey: 'faq.process.step3.desc' },
    { icon: ImageIcon, labelKey: 'faq.process.step4.label', descKey: 'faq.process.step4.desc' },
  ];

  return (
    <div className="mb-16">
      <h3 className="text-2xl font-bold text-center text-purple-900 mb-8">
        {t('faq.processTitle')}
      </h3>
      <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-2">
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <div className="flex flex-col items-center text-center p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow min-w-[140px]">
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 mb-3">
                <step.icon />
              </div>
              <h4 className="font-semibold text-purple-900 mb-1">{t(step.labelKey)}</h4>
              <p className="text-sm text-gray-600 max-w-[150px]">{t(step.descKey)}</p>
            </div>
            {index < steps.length - 1 && (
              <div className="hidden md:flex items-center">
                <ChevronRightIcon />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

// QA Card Component for Common Worries
interface QACardProps {
  questionKey: string;
  microKey: string;
  fullKey: string;
}

const QACard: React.FC<QACardProps> = ({ questionKey, microKey, fullKey }) => {
  const { t } = useLanguage();

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="bg-white rounded-xl p-5 shadow-sm hover:shadow-lg transition-all cursor-help border border-purple-100 hover:border-purple-300">
            <h4 className="font-semibold text-purple-900 mb-2 flex items-start">
              <span>{t(questionKey)}</span>
              <InfoIcon />
            </h4>
            <p className="text-sm text-gray-600">{t(microKey)}</p>
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="max-w-xs bg-purple-900 text-white p-4 rounded-lg shadow-xl text-sm leading-relaxed"
        >
          {t(fullKey)}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Worries Grid Component
const WorriesGrid: React.FC = () => {
  const { t } = useLanguage();

  const worries = [
    { q: 'faq.worry1.q', micro: 'faq.worry1.micro', full: 'faq.worry1.full' },
    { q: 'faq.worry2.q', micro: 'faq.worry2.micro', full: 'faq.worry2.full' },
    { q: 'faq.worry3.q', micro: 'faq.worry3.micro', full: 'faq.worry3.full' },
    { q: 'faq.worry4.q', micro: 'faq.worry4.micro', full: 'faq.worry4.full' },
    { q: 'faq.worry5.q', micro: 'faq.worry5.micro', full: 'faq.worry5.full' },
    { q: 'faq.worry6.q', micro: 'faq.worry6.micro', full: 'faq.worry6.full' },
  ];

  return (
    <div className="mb-16">
      <h3 className="text-2xl font-bold text-center text-purple-900 mb-2">
        {t('faq.worriesTitle')}
      </h3>
      <p className="text-center text-gray-500 mb-8 text-sm">
        {t('faq.confidenceSubtitle')}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {worries.map((worry, index) => (
          <QACard
            key={index}
            questionKey={worry.q}
            microKey={worry.micro}
            fullKey={worry.full}
          />
        ))}
      </div>
    </div>
  );
};

// Clarity Card Component
interface ClarityCardProps {
  questionKey: string;
  microKey: string;
  fullKey: string;
  ctaKey: string;
  linkKey: string;
}

const ClarityCard: React.FC<ClarityCardProps> = ({ questionKey, microKey, fullKey, ctaKey, linkKey }) => {
  const { t } = useLanguage();
  const link = t(linkKey);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-all border border-purple-100">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-help">
              <h4 className="font-bold text-purple-900 mb-2 text-lg flex items-start">
                <span>{t(questionKey)}</span>
                <InfoIcon />
              </h4>
              <p className="text-purple-700 font-medium mb-4">{t(microKey)}</p>
            </div>
          </TooltipTrigger>
          <TooltipContent 
            side="top" 
            className="max-w-xs bg-purple-900 text-white p-4 rounded-lg shadow-xl text-sm leading-relaxed"
          >
            {t(fullKey)}
          </TooltipContent>
        </Tooltip>
        <Link
          to={link}
          className="inline-flex items-center text-sm font-semibold text-purple-600 hover:text-purple-800 transition-colors"
        >
          {t(ctaKey)}
          <ArrowRightIcon />
        </Link>
      </div>
    </TooltipProvider>
  );
};

// Clarity Row Component
const ClarityRow: React.FC = () => {
  const { t } = useLanguage();

  const cards = [
    { q: 'faq.clarity1.q', micro: 'faq.clarity1.micro', full: 'faq.clarity1.full', cta: 'faq.clarity1.cta', link: 'faq.clarity1.link' },
    { q: 'faq.clarity2.q', micro: 'faq.clarity2.micro', full: 'faq.clarity2.full', cta: 'faq.clarity2.cta', link: 'faq.clarity2.link' },
    { q: 'faq.clarity3.q', micro: 'faq.clarity3.micro', full: 'faq.clarity3.full', cta: 'faq.clarity3.cta', link: 'faq.clarity3.link' },
  ];

  return (
    <div>
      <h3 className="text-2xl font-bold text-center text-purple-900 mb-8">
        {t('faq.clarityTitle')}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card, index) => (
          <ClarityCard
            key={index}
            questionKey={card.q}
            microKey={card.micro}
            fullKey={card.full}
            ctaKey={card.cta}
            linkKey={card.link}
          />
        ))}
      </div>
    </div>
  );
};

// Main Component
const HomepageConfidenceSection: React.FC = () => {
  const { t } = useLanguage();

  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-purple-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-purple-900 mb-4">
            {t('faq.confidenceTitle')}
          </h2>
          <div className="w-24 h-1 bg-purple-500 mx-auto rounded-full"></div>
        </div>

        <ProcessStrip />
        <WorriesGrid />
        <ClarityRow />

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 mb-4">{t('faq.ctaContact')}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/warteliste"
              className="inline-flex items-center px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors shadow-md hover:shadow-lg"
            >
              {t('faq.ctaWaitlist')}
              <ArrowRightIcon />
            </Link>
            <Link
              to="/kontakt"
              className="inline-flex items-center px-6 py-3 border-2 border-purple-600 text-purple-600 font-semibold rounded-lg hover:bg-purple-50 transition-colors"
            >
              {t('nav.contact')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomepageConfidenceSection;

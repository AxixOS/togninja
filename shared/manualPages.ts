export type ManualPageFieldType = 'shortText' | 'longForm' | 'richText' | 'image' | 'url';

export interface ManualPageField {
  id: string;
  label: string;
  translationKey: string;
  type?: ManualPageFieldType;
  helperText?: string;
}

export interface ManualPageSection {
  id: string;
  label: string;
  description?: string;
  fields: ManualPageField[];
}

export interface ManualPageDefinition {
  id: string;
  label: string;
  route: string;
  description: string;
  previewUrl?: string;
  tags?: string[];
  sections: ManualPageSection[];
}

const makeField = (
  id: string,
  label: string,
  translationKey: string,
  type: ManualPageFieldType = 'shortText',
  helperText?: string
): ManualPageField => ({ id, label, translationKey, type, helperText });

// FAQ field layout per fotoshooting page – only the entries actually wired into each
// page component are listed. 'heading' -> faqHeading, 'qN' -> faqQN, 'aN' -> faqAN.
// Answers that remain inline JSX (with links) in the page are intentionally omitted.
const FAQ_KEYS: Record<string, string[]> = {
  babyfotos: ['heading', 'q1', 'a1', 'q2', 'a2', 'q3', 'a3', 'q4', 'a4', 'q5', 'a5'],
  bewerbungsfotos: ['heading', 'q1', 'a1', 'q2', 'a2', 'q3', 'q4'],
  businessportraits: ['heading', 'q1', 'a1', 'q2', 'a2', 'q3', 'a3', 'q4', 'a4'],
  schulfotografie: ['heading', 'q1', 'a1', 'q2', 'a2', 'q3', 'a3', 'q4', 'a4'],
  eventfotografie: ['heading', 'q1', 'a1', 'q2', 'a2', 'q3', 'a3', 'q4', 'a4'],
  familienfotos: ['heading', 'q1', 'a1', 'q2', 'a2', 'q3', 'a3'],
  hochzeitsfotografie: ['heading', 'q1', 'a1', 'q2', 'a2', 'q3', 'a3', 'q4', 'a4'],
  immobilienfotografie: ['heading', 'q1', 'a1', 'q2', 'a2', 'q3', 'a3', 'q4', 'a4'],
  portraitfotografie: ['heading', 'q1', 'a1', 'q2', 'a2', 'q3', 'a3', 'q4', 'a4'],
  produktfotografie: ['heading', 'q1', 'a1', 'q2', 'a2', 'q3', 'a3', 'q4', 'a4'],
  studiofotografie: ['heading', 'q1', 'q2', 'a2', 'q3', 'a3', 'q4', 'a4'],
  teamfotos: ['heading', 'q1', 'a1', 'q2', 'a2', 'q3', 'a3', 'q4', 'a4'],
};

export const manualPageManifest: ManualPageDefinition[] = [
  {
    id: 'site-settings',
    label: 'Site Settings',
    route: '/admin/site-settings',
    description: 'Global site settings including logo, branding, and contact information.',
    tags: ['Settings', 'Branding', 'Logo'],
    sections: [
      {
        id: 'site-branding',
        label: 'Logo & Branding',
        description: 'Upload and manage the site logo that appears in the header.',
        fields: [
          makeField('site-logo', 'Site Logo', 'site.logo', 'image', 'The main logo displayed in the website header (recommended size: 200x80px)')
        ]
      },
      {
        id: 'site-reviews',
        label: 'Reviews',
        description: 'The review page visitors are sent to (Google, Facebook or a citation site). Used by the "read/write a review" links across the site.',
        fields: [
          makeField('site-review-url', 'Reviews page URL', 'reviews.googleUrl', 'url', 'e.g. your Google Business review link (https://maps.app.goo.gl/…)'),
        ],
      }
    ]
  },
  {
    id: 'homepage-images',
    label: 'Homepage Images',
    route: '/admin/homepage-images',
    description: 'Manage photo grid and images displayed on the homepage.',
    tags: ['Images', 'Photos', 'Homepage'],
    sections: [
      {
        id: 'photo-grid',
        label: 'Photo Grid Management',
        description: 'Upload and organize images for the homepage photo collage.',
        fields: [
          makeField('photo-grid-manager', 'Photo Grid', 'homepage.photoGrid', 'richText', 'Manage homepage photo grid images - these appear in the collage on the homepage')
        ]
      }
    ]
  },
  {
    id: 'portfolio-images',
    label: 'Portfolio Images',
    route: '/admin/portfolio-images',
    description: 'Manage portfolio gallery images for all photography categories.',
    tags: ['Images', 'Portfolio', 'Gallery'],
    sections: [
      {
        id: 'portfolio-gallery',
        label: 'Portfolio Gallery Management',
        description: 'Upload and organize images for the portfolio page categories.',
        fields: [
          makeField('portfolio-gallery-manager', 'Portfolio Gallery', 'portfolio.gallery', 'richText', 'Manage portfolio images - these appear in the carousels on the portfolio page')
        ]
      }
    ]
  },
  {
    id: 'reviews',
    label: 'Customer Reviews',
    route: '/',
    description: 'Testimonials shown in the "What Our Clients Say" carousel across the site.',
    tags: ['Reviews', 'Testimonials', 'Social Proof'],
    sections: [
      {
        id: 'reviews-header',
        label: 'Section Header',
        description: 'Heading, Google rating summary and the Google reviews link.',
        fields: [
          makeField('reviews-title', 'Section Title', 'reviews.sectionTitle'),
          makeField('reviews-rating', 'Google Rating Summary', 'reviews.ratingSummary'),
          makeField('reviews-google-url', 'Google Reviews URL', 'reviews.googleUrl', 'url')
        ]
      },
      {
        id: 'reviews-r1',
        label: 'Review 1',
        fields: [
          makeField('reviews-r1-author', 'Author Name', 'reviews.r1.author'),
          makeField('reviews-r1-text', 'Review Text', 'reviews.r1.text', 'longForm')
        ]
      },
      {
        id: 'reviews-r2',
        label: 'Review 2',
        fields: [
          makeField('reviews-r2-author', 'Author Name', 'reviews.r2.author'),
          makeField('reviews-r2-text', 'Review Text', 'reviews.r2.text', 'longForm')
        ]
      },
      {
        id: 'reviews-r3',
        label: 'Review 3',
        fields: [
          makeField('reviews-r3-author', 'Author Name', 'reviews.r3.author'),
          makeField('reviews-r3-text', 'Review Text', 'reviews.r3.text', 'longForm')
        ]
      },
      {
        id: 'reviews-r4',
        label: 'Review 4',
        fields: [
          makeField('reviews-r4-author', 'Author Name', 'reviews.r4.author'),
          makeField('reviews-r4-text', 'Review Text', 'reviews.r4.text', 'longForm')
        ]
      },
      {
        id: 'reviews-r5',
        label: 'Review 5',
        fields: [
          makeField('reviews-r5-author', 'Author Name', 'reviews.r5.author'),
          makeField('reviews-r5-text', 'Review Text', 'reviews.r5.text', 'longForm')
        ]
      },
      {
        id: 'reviews-r6',
        label: 'Review 6',
        fields: [
          makeField('reviews-r6-author', 'Author Name', 'reviews.r6.author'),
          makeField('reviews-r6-text', 'Review Text', 'reviews.r6.text', 'longForm')
        ]
      }
    ]
  },
  {
    id: 'home',
    label: 'Homepage',
    route: '/',
    description: 'Hero copy, proof points and FAQs on the primary marketing homepage.',
    tags: ['Marketing', 'Hero', 'SEO'],
    sections: [
      {
        id: 'home-hero',
        label: 'Hero Section',
        description: 'Primary messaging shown above the fold on the homepage.',
        fields: [
          makeField('home-hero-title', 'Hero Title', 'home.heroTitle'),
          makeField('home-hero-subtitle', 'Hero Subtitle', 'home.heroSubtitle', 'longForm'),
          makeField('home-hero-description', 'Hero Description', 'home.heroDescription', 'longForm'),
          makeField('home-hero-cta', 'Primary CTA Label', 'home.bookShootingButton'),
          makeField('home-hero-secondary-cta', 'Secondary CTA Label', 'home.bookNowButton')
        ]
      },
      {
        id: 'home-proof',
        label: 'Proof Points',
        description: 'Stats that build trust directly under the hero.',
        fields: [
          makeField('home-proof-description', 'Studio Summary', 'home.description', 'longForm'),
          makeField('home-proof-happy', 'Happy Families Label', 'home.happyFamilies'),
          makeField('home-proof-portraits', 'Portraits Captured Label', 'home.portraitsCaptured'),
          makeField('home-proof-years', 'Years Experience Label', 'home.yearsExperience')
        ]
      },
      {
        id: 'home-services',
        label: 'Service Highlights',
        description: 'Core offerings below the hero.',
        fields: [
          makeField('home-services-title', 'Section Title', 'home.pregnancyAndFamilyTitle'),
          makeField('home-services-desc-1', 'Highlight 1', 'home.pregnancyDescription1', 'longForm'),
          makeField('home-services-desc-2', 'Highlight 2', 'home.pregnancyDescription2', 'longForm'),
          makeField('home-services-desc-3', 'Highlight 3', 'home.pregnancyDescription3', 'longForm')
        ]
      },
      {
        id: 'home-testimonials',
        label: 'Testimonials',
        fields: [
          makeField('home-testimonials-title', 'Testimonials Title', 'home.testimonialsTitle')
        ]
      },
      {
        id: 'home-faq',
        label: 'FAQ Section',
        description: 'Frequently asked questions at the bottom of the homepage.',
        fields: [
          makeField('home-faq-title', 'FAQ Title', 'home.faqTitle'),
          makeField('home-faq-q1', 'Question 1', 'home.faqQuestion1'),
          makeField('home-faq-a1', 'Answer 1', 'home.faq1Text', 'longForm'),
          makeField('home-faq-q2', 'Question 2', 'home.faqQuestion2'),
          makeField('home-faq-a2', 'Answer 2', 'home.faq2Text', 'longForm'),
          makeField('home-faq-q3', 'Question 3', 'home.faqQuestion3'),
          makeField('home-faq-a3', 'Answer 3', 'home.faq3Text', 'longForm'),
          makeField('home-faq-q4', 'Question 4', 'home.faqQuestion4'),
          makeField('home-faq-a4', 'Answer 4', 'home.faq4Text', 'longForm'),
          makeField('home-faq-q5', 'Question 5', 'home.faqQuestion5'),
          makeField('home-faq-a5', 'Answer 5', 'home.faq5Text', 'longForm'),
          makeField('home-faq-q6', 'Question 6', 'home.faqQuestion6'),
          makeField('home-faq-a6', 'Answer 6', 'home.faq6Text', 'longForm')
        ]
      },
      {
        id: 'home-confidence',
        label: 'Confidence Section Header',
        description: 'Main title and subtitle for the confidence/FAQ section.',
        fields: [
          makeField('confidence-title', 'Section Title', 'faq.confidenceTitle'),
          makeField('confidence-subtitle', 'Section Subtitle', 'faq.confidenceSubtitle', 'longForm'),
          makeField('confidence-cta', 'CTA Text', 'faq.ctaContact'),
          makeField('confidence-waitlist-btn', 'Waitlist Button', 'faq.ctaWaitlist')
        ]
      },
      {
        id: 'home-process',
        label: 'Process Strip (How It Works)',
        description: 'The 4-step process icons shown at the top of the confidence section.',
        fields: [
          makeField('process-title', 'Process Title', 'faq.processTitle'),
          makeField('process-step1-label', 'Step 1 Label', 'faq.process.step1.label'),
          makeField('process-step1-desc', 'Step 1 Description', 'faq.process.step1.desc', 'longForm'),
          makeField('process-step2-label', 'Step 2 Label', 'faq.process.step2.label'),
          makeField('process-step2-desc', 'Step 2 Description', 'faq.process.step2.desc', 'longForm'),
          makeField('process-step3-label', 'Step 3 Label', 'faq.process.step3.label'),
          makeField('process-step3-desc', 'Step 3 Description', 'faq.process.step3.desc', 'longForm'),
          makeField('process-step4-label', 'Step 4 Label', 'faq.process.step4.label'),
          makeField('process-step4-desc', 'Step 4 Description', 'faq.process.step4.desc', 'longForm')
        ]
      },
      {
        id: 'home-worries',
        label: 'Common Worries Grid',
        description: 'The 6 FAQ cards addressing common concerns (hover for full answer).',
        fields: [
          makeField('worries-title', 'Worries Section Title', 'faq.worriesTitle'),
          makeField('worry1-q', 'Worry 1 Question', 'faq.worry1.q'),
          makeField('worry1-micro', 'Worry 1 Short Answer', 'faq.worry1.micro'),
          makeField('worry1-full', 'Worry 1 Full Answer', 'faq.worry1.full', 'longForm'),
          makeField('worry2-q', 'Worry 2 Question', 'faq.worry2.q'),
          makeField('worry2-micro', 'Worry 2 Short Answer', 'faq.worry2.micro'),
          makeField('worry2-full', 'Worry 2 Full Answer', 'faq.worry2.full', 'longForm'),
          makeField('worry3-q', 'Worry 3 Question', 'faq.worry3.q'),
          makeField('worry3-micro', 'Worry 3 Short Answer', 'faq.worry3.micro'),
          makeField('worry3-full', 'Worry 3 Full Answer', 'faq.worry3.full', 'longForm'),
          makeField('worry4-q', 'Worry 4 Question', 'faq.worry4.q'),
          makeField('worry4-micro', 'Worry 4 Short Answer', 'faq.worry4.micro'),
          makeField('worry4-full', 'Worry 4 Full Answer', 'faq.worry4.full', 'longForm'),
          makeField('worry5-q', 'Worry 5 Question', 'faq.worry5.q'),
          makeField('worry5-micro', 'Worry 5 Short Answer', 'faq.worry5.micro'),
          makeField('worry5-full', 'Worry 5 Full Answer', 'faq.worry5.full', 'longForm'),
          makeField('worry6-q', 'Worry 6 Question', 'faq.worry6.q'),
          makeField('worry6-micro', 'Worry 6 Short Answer', 'faq.worry6.micro'),
          makeField('worry6-full', 'Worry 6 Full Answer', 'faq.worry6.full', 'longForm')
        ]
      },
      {
        id: 'home-clarity',
        label: 'Clarity & Value Row',
        description: 'The 3 highlighted cards with pricing, packages, and about info.',
        fields: [
          makeField('clarity-title', 'Clarity Section Title', 'faq.clarityTitle'),
          makeField('clarity1-q', 'Card 1 Question', 'faq.clarity1.q'),
          makeField('clarity1-micro', 'Card 1 Highlight', 'faq.clarity1.micro'),
          makeField('clarity1-full', 'Card 1 Full Text', 'faq.clarity1.full', 'longForm'),
          makeField('clarity1-cta', 'Card 1 CTA', 'faq.clarity1.cta'),
          makeField('clarity2-q', 'Card 2 Question', 'faq.clarity2.q'),
          makeField('clarity2-micro', 'Card 2 Highlight', 'faq.clarity2.micro'),
          makeField('clarity2-full', 'Card 2 Full Text', 'faq.clarity2.full', 'longForm'),
          makeField('clarity2-cta', 'Card 2 CTA', 'faq.clarity2.cta'),
          makeField('clarity3-q', 'Card 3 Question', 'faq.clarity3.q'),
          makeField('clarity3-micro', 'Card 3 Highlight', 'faq.clarity3.micro'),
          makeField('clarity3-full', 'Card 3 Full Text', 'faq.clarity3.full', 'longForm'),
          makeField('clarity3-cta', 'Card 3 CTA', 'faq.clarity3.cta')
        ]
      }
    ]
  },
  {
    id: 'photoshoots',
    label: 'Fotoshootings Overview',
    route: '/fotoshootings',
    description: 'Copy for the shootings overview page (categories and CTAs).',
    tags: ['Services', 'Families'],
    sections: [
      {
        id: 'shoots-hero',
        label: 'Hero Copy',
        fields: [
          makeField('shoots-hero-title', 'Hero Title', 'photoshoots.title'),
          makeField('shoots-hero-subtitle', 'Hero Subtitle', 'photoshoots.subtitle', 'longForm')
        ]
      },
      {
        id: 'shoots-categories',
        label: 'Shoot Types',
        description: 'Cards shown in the grid of shoot types.',
        fields: [
          makeField('shoots-family-title', 'Family Title', 'photoshoots.familyTitle'),
          makeField('shoots-family-desc', 'Family Description', 'photoshoots.familyDescription', 'longForm'),
          makeField('shoots-pregnancy-title', 'Pregnancy Title', 'photoshoots.pregnancyTitle'),
          makeField('shoots-pregnancy-desc', 'Pregnancy Description', 'photoshoots.pregnancyDescription', 'longForm'),
          makeField('shoots-newborn-title', 'Newborn Title', 'photoshoots.newbornTitle'),
          makeField('shoots-newborn-desc', 'Newborn Description', 'photoshoots.newbornDescription', 'longForm'),
          makeField('shoots-business-title', 'Business Title', 'photoshoots.businessTitle'),
          makeField('shoots-business-desc', 'Business Description', 'photoshoots.businessDescription', 'longForm'),
          makeField('shoots-event-title', 'Event Title', 'photoshoots.eventTitle'),
          makeField('shoots-event-desc', 'Event Description', 'photoshoots.eventDescription', 'longForm'),
          makeField('shoots-wedding-title', 'Wedding Title', 'photoshoots.weddingTitle'),
          makeField('shoots-wedding-desc', 'Wedding Description', 'photoshoots.weddingDescription', 'longForm')
        ]
      },
      {
        id: 'shoots-cta',
        label: 'Call To Action Cards',
        fields: [
          makeField('shoots-learn-more', 'Learn More Button', 'photoshoots.learnMore'),
          makeField('shoots-flex-title', 'Flexible Appointments Title', 'photoshoots.flexibleAppointments'),
          makeField('shoots-flex-desc', 'Flexible Appointments Copy', 'photoshoots.flexibleDescription', 'longForm'),
          makeField('shoots-family-title-2', 'Whole Family Title', 'photoshoots.wholeFamily'),
          makeField('shoots-family-desc-2', 'Whole Family Copy', 'photoshoots.wholeFamilyDescription', 'longForm'),
          makeField('shoots-pro-title', 'Professional Equipment Title', 'photoshoots.professionalEquipment'),
          makeField('shoots-pro-desc', 'Professional Equipment Copy', 'photoshoots.professionalDescription', 'longForm')
        ]
      }
    ]
  },
  {
    id: 'gift-cards',
    label: 'Gutschein Landing',
    route: '/gutschein',
    description: 'Hero and package copy for the gift card landing page.',
    tags: ['Vouchers', 'Sales'],
    sections: [
      {
        id: 'gift-hero',
        label: 'Hero Copy',
        fields: [
          makeField('gift-hero-title', 'Hero Title', 'giftCards.heroTitle'),
          makeField('gift-hero-subtitle', 'Hero Subtitle', 'giftCards.heroSubtitle', 'longForm'),
          makeField('gift-hero-intro', 'Section Intro', 'giftCards.sectionIntro', 'longForm')
        ]
      },
      {
        id: 'gift-packages',
        label: 'Voucher Packages',
        fields: [
          makeField('gift-family-title', 'Family Package Title', 'giftCards.familyTitle'),
          makeField('gift-family-desc', 'Family Package Copy', 'giftCards.familyDescription', 'longForm'),
          makeField('gift-pregnancy-title', 'Pregnancy Package Title', 'giftCards.pregnancyTitle'),
          makeField('gift-pregnancy-desc', 'Pregnancy Package Copy', 'giftCards.pregnancyDescription', 'longForm'),
          makeField('gift-newborn-title', 'Newborn Package Title', 'giftCards.newbornTitle'),
          makeField('gift-newborn-desc', 'Newborn Package Copy', 'giftCards.newbornDescription', 'longForm'),
          makeField('gift-card-button', 'Card Button Label', 'giftCards.buttonLabel')
        ]
      }
    ]
  },
  {
    id: 'contact',
    label: 'Kontakt Page',
    route: '/kontakt',
    description: 'Contact hero, studio details and transport notes.',
    tags: ['Conversion', 'Leads'],
    sections: [
      {
        id: 'contact-hero',
        label: 'Hero Copy',
        fields: [
          makeField('contact-title', 'Hero Title', 'contact.title'),
          makeField('contact-subtitle', 'Hero Subtitle', 'contact.subtitle', 'longForm')
        ]
      },
      {
        id: 'contact-details',
        label: 'Studio Details',
        fields: [
          makeField('contact-studio-title', 'Studio Section Title', 'contact.studioTitle'),
          makeField('contact-studio-name', 'Studio Name', 'contact.studioName'),
          makeField('contact-address', 'Studio Address', 'contact.studioAddress'),
          makeField('contact-address-note', 'Address Note', 'contact.addressNote', 'longForm'),
          makeField('contact-phone', 'Phone Number', 'contact.phone'),
          makeField('contact-email', 'Email Address', 'contact.email'),
          makeField('contact-hours', 'Opening Hours', 'contact.openingHours'),
          makeField('contact-transport-title', 'Transport Title', 'contact.transport'),
          makeField('contact-train', 'Public Transport Copy', 'contact.trainInfo', 'longForm'),
          makeField('contact-parking', 'Parking Copy', 'contact.streetParking', 'longForm'),
          makeField('contact-map-title', 'Map Title', 'contact.mapTitle')
        ]
      }
    ]
  },
  {
    id: 'waitlist',
    label: 'Warteliste / Booking',
    route: '/warteliste',
    description: 'Copy for the booking request form.',
    sections: [
      {
        id: 'waitlist-hero',
        label: 'Hero Copy',
        fields: [
          makeField('waitlist-title', 'Hero Title', 'waitlist.title'),
          makeField('waitlist-subtitle', 'Hero Subtitle', 'waitlist.subtitle', 'longForm')
        ]
      },
      {
        id: 'waitlist-form',
        label: 'Form Labels & Messages',
        fields: [
          makeField('waitlist-full-name', 'Full Name Label', 'waitlist.fullName'),
          makeField('waitlist-date', 'Preferred Date Label', 'waitlist.preferredDate'),
          makeField('waitlist-email', 'Email Label', 'waitlist.email'),
          makeField('waitlist-email-ph', 'Email Placeholder', 'waitlist.emailPlaceholder'),
          makeField('waitlist-phone', 'Phone Label', 'waitlist.phone'),
          makeField('waitlist-message', 'Message Label', 'waitlist.message'),
          makeField('waitlist-message-ph', 'Message Placeholder', 'waitlist.messagePlaceholder'),
          makeField('waitlist-submit', 'Submit Label', 'waitlist.submit'),
          makeField('waitlist-submitting', 'Submitting Label', 'waitlist.submitting'),
          makeField('waitlist-success', 'Success Message', 'waitlist.successMessage', 'longForm')
        ]
      }
    ]
  },
  {
    id: 'galleries',
    label: 'Public Galleries',
    route: '/galleries',
    description: 'Public gallery search page copy & empty states.',
    sections: [
      {
        id: 'gallery-hero',
        label: 'Hero Copy',
        fields: [
          makeField('gallery-title', 'Hero Title', 'gallery.publicTitle'),
          makeField('gallery-description', 'Hero Description', 'gallery.publicDescription', 'longForm'),
          makeField('gallery-search', 'Search Placeholder', 'gallery.searchPlaceholder')
        ]
      },
      {
        id: 'gallery-empty',
        label: 'Empty States',
        fields: [
          makeField('gallery-no-results', 'No Results Title', 'gallery.noGalleriesFound'),
          makeField('gallery-no-results-desc', 'No Results Description', 'gallery.noGalleriesDescription', 'longForm'),
          makeField('gallery-none-available', 'No Galleries Available Title', 'gallery.noGalleriesAvailable'),
          makeField('gallery-none-available-desc', 'No Galleries Available Description', 'gallery.noGalleriesAvailableDescription', 'longForm'),
          makeField('gallery-not-found-title', 'Help CTA Title', 'gallery.notFoundTitle'),
          makeField('gallery-not-found-desc', 'Help CTA Description', 'gallery.notFoundDescription', 'longForm'),
          makeField('gallery-contact-cta', 'Contact CTA', 'gallery.contactUs')
        ]
      }
    ]
  },
  {
    id: 'blog',
    label: 'Blog Listing',
    route: '/blog',
    description: 'Hero + empty state copy for the blog listing.',
    sections: [
      {
        id: 'blog-hero',
        label: 'Hero Copy',
        fields: [
          makeField('blog-title', 'Hero Title', 'blog.title'),
          makeField('blog-subtitle', 'Hero Subtitle', 'blog.subtitle', 'longForm'),
          makeField('blog-search', 'Search Placeholder', 'blog.searchPlaceholder')
        ]
      },
      {
        id: 'blog-empty',
        label: 'Empty States',
        fields: [
          makeField('blog-no-posts', 'No Posts Title', 'blog.noPostsFound'),
          makeField('blog-no-match', 'No Match Description', 'blog.noPostsMatchCriteria', 'longForm'),
          makeField('blog-no-yet', 'No Posts Yet Description', 'blog.noPostsYet', 'longForm')
        ]
      }
    ]
  },
  {
    id: 'voucher-success',
    label: 'Voucher Success Flow',
    route: '/voucher/success',
    description: 'Confirmation copy after purchasing a voucher.',
    sections: [
      {
        id: 'voucher-success-main',
        label: 'Success Copy',
        fields: [
          makeField('voucher-success-title', 'Success Title', 'voucher.paymentSuccessful'),
          makeField('voucher-success-message', 'Success Message', 'voucher.thankYouMessage', 'longForm'),
          makeField('voucher-success-next', 'Next Steps Title', 'voucher.whatHappensNext'),
          makeField('voucher-success-email', 'Email Step', 'voucher.emailReceived', 'longForm'),
          makeField('voucher-success-validity', 'Validity Step', 'voucher.validity', 'longForm'),
          makeField('voucher-success-more', 'More Vouchers CTA', 'voucher.moreVouchers'),
          makeField('voucher-success-book', 'Book Appointment CTA', 'voucher.bookAppointment')
        ]
      }
    ]
  },
  {
    id: 'ueber-uns',
    label: 'About Us / Über uns',
    route: '/ueber-uns',
    description: 'The founder photo and story shown on the About Us page (Simon). Edit here — no code needed. Leave a field blank to keep the built-in default.',
    tags: ['About', 'Photo', 'Story'],
    sections: [
      {
        id: 'ueber-uns-founder',
        label: 'Founder Photo',
        description: 'The portrait shown next to the founder story on /ueber-uns/. Recommended a square image (e.g. 600×600).',
        fields: [
          makeField('ueber-uns-founder-photo', 'Founder Photo', 'manual.ueberuns.founderPhoto', 'image', 'Square portrait, e.g. 600×600px'),
        ],
      },
      {
        id: 'ueber-uns-story',
        label: 'Founder Story (text)',
        description: 'The paragraphs of Simon’s story. Each field overrides the built-in text in the CURRENTLY selected language (switch EN/DE at the top). Leave blank to keep the default.',
        fields: [
          makeField('ueber-uns-intro', 'Intro line', 'manual.ueberuns.bio.intro', 'shortText', 'e.g. “Hello, I’m Simon.”'),
          makeField('ueber-uns-craft', 'Craft & style paragraph', 'manual.ueberuns.bio.craft', 'longForm', 'Where you trained and your style (mention “authentic portraits”).'),
          makeField('ueber-uns-journey', 'Studio journey paragraph', 'manual.ueberuns.bio.journey', 'longForm', 'Since opening the studio… ending with “…people who usually say:”'),
          makeField('ueber-uns-closing', 'Closing line', 'manual.ueberuns.bio.closing', 'longForm', 'The reassuring “You are…” answer.'),
        ],
      },
    ],
  },
];

export const manualPageMap = manualPageManifest.reduce<Record<string, ManualPageDefinition>>((acc, page) => {
  acc[page.id] = page;
  return acc;
}, {});

export const getManualPageDefinition = (pageId: string): ManualPageDefinition | undefined => manualPageMap[pageId];

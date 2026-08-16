import { 
  pgTable, 
  text, 
  serial, 
  integer, 
  boolean, 
  uuid, 
  timestamp, 
  decimal, 
  jsonb,
  date,
  pgEnum,
  uniqueIndex
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Legacy Users table (for existing CRM clients)
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  password: text("password"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  avatar: text("avatar"),
  isAdmin: boolean("is_admin").default(false),
  studioId: uuid("studio_id"), // Links user to their studio
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Studio Configuration table (multi-tenant support)
export const studioConfigs = pgTable("studio_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  studioName: text("studio_name").notNull(),
  ownerEmail: text("owner_email").notNull(),
  domain: text("domain"), // custom domain if any
  subdomain: text("subdomain").unique(), // photographer1.yoursaas.com
  activeTemplate: text("active_template").default("template-01-modern-minimal"),
  
  // Branding
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").default("#7C3AED"),
  secondaryColor: text("secondary_color").default("#F59E0B"),
  fontFamily: text("font_family").default("Inter"),
  
  // Business Info
  businessName: text("business_name"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  country: text("country").default("Austria"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  
  // Location Coordinates (for Golden Hour, Weather, etc.)
  latitude: decimal("latitude", { precision: 10, scale: 7 }), // e.g., 48.2082000 (Vienna)
  longitude: decimal("longitude", { precision: 10, scale: 7 }), // e.g., 16.3738000 (Vienna)
  timezone: text("timezone").default("Europe/Vienna"),
  dateFormat: text("date_format").default("auto"), // 'auto' | BCP-47 locale e.g. 'de-AT', 'en-US'
  
  // Social Media
  facebookUrl: text("facebook_url"),
  instagramUrl: text("instagram_url"),
  twitterUrl: text("twitter_url"),
  
  // Operating Hours
  openingHours: jsonb("opening_hours"),
  
  // Features
  enabledFeatures: text("enabled_features").array(),
  
  // SEO
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  
  // URLs (configurable per deployment)
  appUrl: text("app_url"),                     // e.g. https://app.mystudio.com
  frontendUrl: text("frontend_url"),             // e.g. https://mystudio.com
  publicSiteBaseUrl: text("public_site_base_url"), // e.g. https://www.mystudio.com
  
  // Analytics & Tracking
  ga4MeasurementId: text("ga4_measurement_id"),  // e.g. G-XXXXXXXXXX
  metaPixelId: text("meta_pixel_id"),            // e.g. 123456789
  
  // Onboarding / Setup
  technicalSetupComplete: boolean("technical_setup_complete").default(false),
  creativeSetupComplete: boolean("creative_setup_complete").default(false),
  // Durable progress for the creative setup wizard (phase flags, applied/skipped
  // fix ids, published/skipped draft ids). Everything else is derived from the DB.
  onboardingState: jsonb("onboarding_state"),
  // AI-generated homepage (from the studio's existing website, during onboarding):
  // progress state, the generated draft landing page, and the slug currently live at "/".
  homepageGenState: jsonb("homepage_gen_state"),
  homepageDraftLandingId: uuid("homepage_draft_landing_id"),
  homepageLandingSlug: text("homepage_landing_slug"),
  // Which public pages this studio runs — { [pageId]: boolean }. NULL means "use the
  // language defaults"; disabled pages stay in the codebase as reusable templates.
  enabledPages: jsonb("enabled_pages").$type<Record<string, boolean>>(),
  // The language this studio's public site is written in, chosen during onboarding.
  // German/English was the origin studio's requirement, not every buyer's: language was
  // previously readable ONLY from the SITE_LANG env var, so a studio could not choose
  // one and page visibility, generated copy and locale defaults all keyed off a value
  // the studio never set. NULL means "fall back to SITE_LANG, then English".
  siteLanguage: text("site_language"),
  // Studio's own PricingEmbed.com calculator embed URL (homepage price calculator).
  pricingEmbedUrl: text("pricing_embed_url"),

  // Status
  isActive: boolean("is_active").default(true),
  subscriptionStatus: text("subscription_status").default("trial"),
  currency: text("currency").default("EUR"), // studio billing currency (invoices, vouchers)
  vatNumber: text("vat_number"),             // studio VAT / tax id (invoices)
  defaultTaxRate: decimal("default_tax_rate", { precision: 5, scale: 2 }).default("0"), // studio's country tax/VAT %
  taxLabel: text("tax_label").default("VAT"), // label shown on invoices: VAT / USt. / Sales Tax / GST

  // WHO the studio is — the experience/expertise half of E-E-A-T, and the only part of it
  // a crawl cannot infer and a model must never invent. Adding the DB columns via
  // ALTER TABLE is not enough on its own: drizzle's .set() resolves each key against THIS
  // definition, so an unlisted key throws "Cannot read properties of undefined (reading
  // 'name')" and the whole basics save 500s.
  ownerName: text("owner_name"),
  ownerRole: text("owner_role"),
  ownerPortraitUrl: text("owner_portrait_url"),
  foundingYear: integer("founding_year"),
  credentials: jsonb("credentials"), // [{ label, issuer?, year? }]

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Template Definitions table
export const templateDefinitions = pgTable("template_definitions", {
  id: text("id").primaryKey(), // template-01-modern-minimal
  name: text("name").notNull(), // "Modern Minimal"
  description: text("description"),
  category: text("category"), // "minimal", "artistic", "classic", etc.
  previewImage: text("preview_image"),
  demoUrl: text("demo_url"),
  features: text("features").array(),
  colorScheme: jsonb("color_scheme"),
  isActive: boolean("is_active").default(true),
  isPremium: boolean("is_premium").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Admin Users table (authentication for backend access)  
export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role").default("admin"), // admin, user
  status: text("status").default("active"), // active, inactive
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Blog Posts
export const blogPosts = pgTable("blog_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  slug: text("slug").unique().notNull(),
  content: text("content"),
  contentHtml: text("content_html"),
  excerpt: text("excerpt"),
  imageUrl: text("image_url"),
  imageUrl2: text("image_url_2"),
  imageUrl3: text("image_url_3"),
  videoUrl: text("video_url"), // uploaded .mp4 (B2) or a YouTube/Vimeo link
  published: boolean("published").default(false),
  publishedAt: timestamp("published_at"),
  scheduledFor: timestamp("scheduled_for"),
  status: text("status").default("DRAFT"), // IDEA, DRAFT, SCHEDULED, PUBLISHED, ARCHIVED
  authorId: uuid("author_id").references(() => users.id),
  tags: text("tags").array(),
  metaDescription: text("meta_description"),
  seoTitle: text("seo_title"),
  // Idea-mode workflow payload: uploaded images + extracted EXIF/IPTC, OpenAI
  // Vision analysis, user-supplied context (location/timing/people/occasion/
  // commentary) and GDPR consent. Drives the context-first article writer.
  // Shape: { images: [{ url, exif, vision, iptcWritten }], context: {...}, consent: {...} }
  ideaData: jsonb("idea_data"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Lead Sources
export const leadSources = pgTable("lead_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// CRM Clients
export const crmClients = pgTable("crm_clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  clientId: text("client_id").unique(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  country: text("country"),
  company: text("company"),
  vatNumber: text("vat_number"),
  leadSource: text("lead_source"),
  notes: text("notes"),
  status: text("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Audit trail for the client Merge Wizard. Every merge records the survivor,
// a full snapshot of the deleted duplicate, the survivor's pre-merge field
// values, and exactly which child rows were re-pointed — so a mistaken merge
// can be undone.
export const clientMergeAudit = pgTable("client_merge_audit", {
  id: uuid("id").primaryKey().defaultRandom(),
  survivorId: uuid("survivor_id").notNull(),
  mergedClientId: uuid("merged_client_id").notNull(),
  mergedSnapshot: jsonb("merged_snapshot").notNull(),   // full deleted-client row
  survivorBefore: jsonb("survivor_before"),             // survivor fields before enrichment
  relinked: jsonb("relinked").notNull(),                // [{ table, column, ids: [...] }]
  confidence: integer("confidence"),
  matchReason: text("match_reason"),
  actor: text("actor"),
  undone: boolean("undone").default(false),
  undoneAt: timestamp("undone_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// CRM Leads
export const crmLeads = pgTable("crm_leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  company: text("company"),
  message: text("message"),
  source: text("source"),
  status: text("status").default("new"),
  assigned_to: uuid("assigned_to").references(() => users.id),
  priority: text("priority").default("medium"),
  tags: text("tags").array(),
  follow_up_date: date("follow_up_date"),
  value: decimal("value", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// CRM Invoices
export const crmInvoices = pgTable("crm_invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceNumber: text("invoice_number").unique().notNull(),
  clientId: uuid("client_id").references(() => crmClients.id).notNull(),
  issueDate: date("issue_date").notNull(),
  dueDate: date("due_date").notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0"),
  discountType: text("discount_type").default("fixed"), // "fixed" or "percentage"
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).default("0"), // The input value (amount or percent)
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0"), // The calculated discount amount
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("EUR"),
  status: text("status").default("draft"),
  documentType: text("document_type").default("invoice"),
  paymentTerms: text("payment_terms").default("Net 30"),
  notes: text("notes"),
  termsAndConditions: text("terms_and_conditions"),
  footerText: text("footer_text"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripePaymentUrl: text("stripe_payment_url"),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).default("0"),
  disableOnlinePayment: boolean("disable_online_payment").default(false),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// CRM Invoice Items
export const crmInvoiceItems = pgTable("crm_invoice_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id").references(() => crmInvoices.id, { onDelete: "cascade" }).notNull(),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).default("1"),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("0"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// CRM Invoice Payments
export const crmInvoicePayments = pgTable("crm_invoice_payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id").references(() => crmInvoices.id, { onDelete: "cascade" }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").default("bank_transfer"),
  paymentReference: text("payment_reference"),
  paymentDate: date("payment_date").notNull(),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Admin-defined available slots (for embed booking widget)
export const studioAvailableSlots = pgTable("studio_available_slots", {
  id: uuid("id").primaryKey().defaultRandom(),
  studioId: uuid("studio_id").references(() => studioConfigs.id).notNull(),
  startTime: timestamp("start_time").notNull(),
  durationMinutes: integer("duration_minutes").default(120),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const manualPageContent = pgTable("manual_page_content", {
  id: uuid("id").primaryKey().defaultRandom(),
  studioId: uuid("studio_id").references(() => studioConfigs.id, { onDelete: "cascade" }).notNull(),
  pageId: text("page_id").notNull(),
  language: text("language").notNull().default("de"),
  draftContent: jsonb("draft_content").$type<Record<string, string>>().default({}),
  publishedContent: jsonb("published_content").$type<Record<string, string>>().default({}),
  status: text("status").default("draft"),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  pageLanguageStudioUnique: uniqueIndex("manual_page_content_unique").on(table.studioId, table.pageId, table.language)
}));

// Voucher Products (what customers can buy)
export const voucherProducts = pgTable("voucher_products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(), // "Familie Fotoshooting", "Neugeborenen Fotoshooting"
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }), // for showing discounts
  category: text("category"), // "familie", "baby", "hochzeit", "business", "event"
  sessionDuration: integer("session_duration").default(60), // minutes
  sessionType: text("session_type"), // links to photography session types
  
  // Voucher details
  validityPeriod: integer("validity_period").default(1460), // 48 months in days
  redemptionInstructions: text("redemption_instructions"),
  termsAndConditions: text("terms_and_conditions"),
  
  // Display settings
  imageUrl: text("image_url"), // Main hero image
  thumbnailUrl: text("thumbnail_url"), // Small thumbnail for cards/listings
  promoImageUrl: text("promo_image_url"), // Promotional graphic for upsell/conversion
  detailedDescription: text("detailed_description"), // Extensive product description
  displayOrder: integer("display_order").default(0),
  featured: boolean("featured").default(false),
  badge: text("badge"), // "30% OFF", "BESTSELLER", etc.
  
  // Availability
  isActive: boolean("is_active").default(true),
  stockLimit: integer("stock_limit"), // null = unlimited
  maxPerCustomer: integer("max_per_customer").default(5),
  
  // SEO
  slug: text("slug").unique(),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Voucher Templates (hero images for PDF personalization)
export const voucherTemplates = pgTable("voucher_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  category: text("category").notNull(), // "birthday", "love", "christmas", "gratitude", "celebration"
  imageUrl: text("image_url").notNull(),
  occasion: text("occasion").notNull(), // Display text: "Happy Birthday", "Merry Christmas", etc.
  isActive: boolean("is_active").default(true),
  displayOrder: integer("display_order").default(0),
  // PDF design customization (admin-configurable per template)
  bannerColor: text("banner_color").default('#b3202e'),
  bannerTextColor: text("banner_text_color").default('#ffffff'),
  fontFamily: text("font_family").default('Helvetica'),
  messageFontSize: integer("message_font_size").default(22),
  logoUrl: text("logo_url"), // per-template logo override (null = use default)
  footerText: text("footer_text"), // custom footer text
  footerEmail: text("footer_email"), // custom footer email
  footerPhone: text("footer_phone"), // custom footer phone
  termsText: text("terms_text"), // custom terms & conditions
  layoutStyle: text("layout_style").default('classic'), // for future layout variants
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Discount Coupons
export const discountCoupons = pgTable("discount_coupons", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").unique().notNull(), // "WELCOME10", "SUMMER2024"
  name: text("name").notNull(), // "Welcome Discount", "Summer Sale"
  description: text("description"),
  
  // Discount settings
  discountType: text("discount_type").notNull(), // "percentage", "fixed_amount"
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }),
  maxDiscountAmount: decimal("max_discount_amount", { precision: 10, scale: 2 }),
  
  // Usage limits
  usageLimit: integer("usage_limit"), // null = unlimited
  usageCount: integer("usage_count").default(0),
  usageLimitPerCustomer: integer("usage_limit_per_customer").default(1),
  
  // Validity
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true),
  
  // Restrictions
  applicableProducts: text("applicable_products").array(), // product IDs or "all"
  excludedProducts: text("excluded_products").array(),
  firstTimeCustomersOnly: boolean("first_time_customers_only").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Price List Items (for invoice creation)
export const priceListItems = pgTable("price_list_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  studioId: uuid("studio_id").references(() => studioConfigs.id, { onDelete: "cascade" }),
  
  // Item details
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // "PRINTS", "LEINWAND", "DIGITAL", etc.
  
  // Pricing
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("EUR"),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("19.00"), // percentage
  
  // SKU and codes
  sku: text("sku"),
  productCode: text("product_code"),
  
  // Additional details
  unit: text("unit"), // "piece", "hour", "session", etc.
  notes: text("notes"),
  
  // Status
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Voucher Sales (purchases)
export const voucherSales = pgTable("voucher_sales", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").references(() => voucherProducts.id),
  
  // Customer info
  purchaserName: text("purchaser_name").notNull(),
  purchaserEmail: text("purchaser_email").notNull(),
  purchaserPhone: text("purchaser_phone"),
  
  // Gift recipient (if different)
  recipientName: text("recipient_name"),
  recipientEmail: text("recipient_email"),
  giftMessage: text("gift_message"),
  
  // Personalization - customer selected/uploaded images
  customImage: text("custom_image"), // Customer uploaded image URL
  designImage: text("design_image"), // Selected from library template image URL
  personalizationData: jsonb("personalization_data"), // Additional customization options
  // NOTE: pdf_url is persisted via guarded raw SQL in the webhook (see routes.ts), intentionally
  // NOT declared here. Declaring a column that may not exist in the DB makes Drizzle's SELECT
  // (which names every column) fail for the whole table. Re-add only after the column is migrated.
  
  // Voucher details
  voucherCode: text("voucher_code").unique().notNull(),
  originalAmount: decimal("original_amount", { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default('0'),
  finalAmount: decimal("final_amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("EUR"),
  
  // Coupon applied
  couponId: uuid("coupon_id").references(() => discountCoupons.id),
  couponCode: text("coupon_code"),
  
  // Payment
  paymentIntentId: text("payment_intent_id"),
  paymentStatus: text("payment_status").default("pending"), // "pending", "paid", "failed", "refunded"
  paymentMethod: text("payment_method"), // "stripe", "paypal", etc.
  
  // Fulfillment
  isRedeemed: boolean("is_redeemed").default(false),
  redeemedAt: timestamp("redeemed_at"),
  redeemedBy: uuid("redeemed_by").references(() => crmClients.id),
  sessionId: uuid("session_id"), // links to photography session when redeemed
  
  // Validity
  validFrom: timestamp("valid_from").defaultNow(),
  validUntil: timestamp("valid_until"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Abandoned checkouts — one row per Stripe Checkout session that was started
// (email entered) so we can email a reminder if it isn't completed. Marked
// "converted" by the Stripe webhook on payment. Populate this table with
// `npm run db:push`; all reads/writes are guarded so the feature is simply
// inert until the table exists.
export const abandonedCheckouts = pgTable("abandoned_checkouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: text("session_id").notNull().unique(), // Stripe Checkout session id
  email: text("email").notNull(),
  amountCents: integer("amount_cents"),
  currency: text("currency").default("EUR"),
  status: text("status").default("pending"), // "pending" | "converted"
  reminded: boolean("reminded").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  remindedAt: timestamp("reminded_at"),
});

// Coupon usage tracking
export const couponUsage = pgTable("coupon_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  couponId: uuid("coupon_id").references(() => discountCoupons.id),
  customerEmail: text("customer_email").notNull(),
  orderAmount: decimal("order_amount", { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).notNull(),
  voucherSaleId: uuid("voucher_sale_id").references(() => voucherSales.id),
  usedAt: timestamp("used_at").defaultNow(),
});

// CRM Messages (Enhanced with Email/SMS tracking)
export const crmMessages = pgTable("crm_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  senderName: text("sender_name").notNull(),
  senderEmail: text("sender_email").notNull(),
  recipientEmail: text("recipient_email"), // for outbound emails - who we sent to
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  messageType: text("message_type").notNull().default("email"), // "email", "sms", "note"
  status: text("status").default("unread"), // "unread", "read", "replied", "sent", "delivered", "failed"
  direction: text("direction").default("inbound"), // "inbound", "outbound"
  clientId: uuid("client_id").references(() => crmClients.id),
  assignedTo: uuid("assigned_to").references(() => users.id),
  
  // Email specific fields
  emailMessageId: text("email_message_id"), // for tracking email threads
  emailHeaders: jsonb("email_headers"),
  attachments: jsonb("attachments"), // array of attachment info
  
  // SMS specific fields
  smsMessageId: text("sms_message_id"),
  phoneNumber: text("phone_number"),
  smsProvider: text("sms_provider"), // "twilio", "vonage", etc.
  smsStatus: text("sms_status"), // "queued", "sent", "delivered", "failed"
  
  // Bulk messaging
  campaignId: uuid("campaign_id"), // links to bulk campaigns
  
  // Timestamps
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
  repliedAt: timestamp("replied_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Bulk Message Campaigns
export const messageCampaigns = pgTable("message_campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  messageType: text("message_type").notNull(), // "email", "sms"
  subject: text("subject"), // for email campaigns
  content: text("content").notNull(),
  
  // Targeting criteria
  targetType: text("target_type").notNull(), // "all", "leads", "clients", "custom", "segment"
  targetCriteria: jsonb("target_criteria"), // filters like status, spend amount, etc.
  targetClientIds: text("target_client_ids").array(), // for custom targeting
  
  // Campaign settings
  scheduledAt: timestamp("scheduled_at"),
  status: text("status").default("draft"), // "draft", "scheduled", "sending", "sent", "completed", "failed"
  
  // Results
  totalRecipients: integer("total_recipients").default(0),
  sentCount: integer("sent_count").default(0),
  deliveredCount: integer("delivered_count").default(0),
  failedCount: integer("failed_count").default(0),
  
  // Metadata
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Studio Calendar & Appointments
export const studioAppointments = pgTable("studio_appointments", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").references(() => crmClients.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  appointmentType: text("appointment_type").notNull(), // "consultation", "photoshoot", "delivery", "meeting"
  status: text("status").notNull().default("scheduled"), // "scheduled", "confirmed", "completed", "cancelled", "no_show"
  startDateTime: timestamp("start_date_time").notNull(),
  endDateTime: timestamp("end_date_time").notNull(),
  location: text("location").default("Studio"),
  googleCalendarEventId: text("google_calendar_event_id"), // For Google Calendar sync
  notes: text("notes"),
  reminderSent: boolean("reminder_sent").default(false),
  reminderDateTime: timestamp("reminder_date_time"),
  createdBy: text("created_by").notNull().default("system"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Google Calendar Integration Settings
export const googleCalendarConfig = pgTable("google_calendar_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  calendarId: text("calendar_id").notNull(), // Google Calendar ID
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  clientId: text("client_id"),
  clientSecret: text("client_secret"),
  isActive: boolean("is_active").default(false),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// SMS Configuration
export const smsConfig = pgTable("sms_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  provider: text("provider").notNull().default("twilio"), // "twilio", "vonage", "messagebird"
  accountSid: text("account_sid"),
  authToken: text("auth_token"),
  fromNumber: text("from_number"),
  webhookUrl: text("webhook_url"),
  apiKey: text("api_key"), // For Vonage
  apiSecret: text("api_secret"), // For Vonage
  isActive: boolean("is_active").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Gallery Systems
export const galleries = pgTable("galleries", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  slug: text("slug").unique().notNull(),
  description: text("description"),
  coverImage: text("cover_image"),
  coverPosition: jsonb("cover_position").$type<{ x: number; y: number }>().default({ x: 50, y: 50 }),
  coverScale: integer("cover_scale").default(100),
  coverTemplate: jsonb("cover_template").$type<{
    templateId: string;
    textPosition: string;
    textAlignment: string;
    overlay: string;
    titleSize: string;
    showSubtitle: boolean;
    showButton: boolean;
    buttonStyle: string;
    fontStyle: string;
    imageStyle: string;
    subtitle?: string;
  }>().default({
    templateId: 'classic-center',
    textPosition: 'center',
    textAlignment: 'center',
    overlay: 'dark',
    titleSize: 'large',
    showSubtitle: true,
    showButton: true,
    buttonStyle: 'outline',
    fontStyle: 'elegant',
    imageStyle: 'full'
  }),
  isPublic: boolean("is_public").default(true),
  isPasswordProtected: boolean("is_password_protected").default(false),
  password: text("password"),
  // Delivery / protection settings (previously present in the wizard UI but not
  // persisted — the toggles were silently dropped). expiresAt drives reliable
  // expiry; status ARCHIVED hides a gallery immediately.
  downloadEnabled: boolean("download_enabled").default(true),
  visibleWatermark: boolean("visible_watermark").default(false),
  invisibleWatermark: boolean("invisible_watermark").default(false),
  expiresAt: timestamp("expires_at"),
  status: text("status").default("ACTIVE"), // ACTIVE | SHARED | ARCHIVED
  clientId: uuid("client_id").references(() => crmClients.id),
  createdBy: uuid("created_by").references(() => users.id),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const galleryImages = pgTable("gallery_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  galleryId: uuid("gallery_id").references(() => galleries.id, { onDelete: "cascade" }).notNull(),
  filename: text("filename").notNull(),
  url: text("url").notNull(),
  title: text("title"),
  description: text("description"),
  sortOrder: integer("sort_order").default(0),
  sizeBytes: integer("size_bytes").default(0),
  contentType: text("content_type"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Gallery Analytics and Email Captures
export const galleryAnalytics = pgTable("gallery_analytics", {
  id: uuid("id").primaryKey().defaultRandom(),
  galleryId: uuid("gallery_id").references(() => galleries.id, { onDelete: "cascade" }).notNull().unique(),
  viewCount: integer("view_count").default(0).notNull(),
  downloadCount: integer("download_count").default(0).notNull(),
  emailCaptureCount: integer("email_capture_count").default(0).notNull(),
  lastViewedAt: timestamp("last_viewed_at"),
  lastDownloadedAt: timestamp("last_downloaded_at"),
  lastEmailCapturedAt: timestamp("last_email_captured_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const galleryEmailCaptures = pgTable("gallery_email_captures", {
  id: uuid("id").primaryKey().defaultRandom(),
  galleryId: uuid("gallery_id").references(() => galleries.id, { onDelete: "cascade" }).notNull(),
  email: text("email").notNull(),
  name: text("name"),
  phone: text("phone"),
  source: text("source").default("gallery_view"), // gallery_view, download, share
  metadata: jsonb("metadata"), // IP address, user agent, etc.
  capturedAt: timestamp("captured_at").defaultNow(),
});

export const galleryActivityLog = pgTable("gallery_activity_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  galleryId: uuid("gallery_id").references(() => galleries.id, { onDelete: "cascade" }).notNull(),
  activityType: text("activity_type").notNull(), // view, download, email_capture, share
  visitorEmail: text("visitor_email"),
  visitorName: text("visitor_name"),
  imageId: uuid("image_id").references(() => galleryImages.id, { onDelete: "set null" }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertGalleryAnalyticsSchema = createInsertSchema(galleryAnalytics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGalleryEmailCaptureSchema = createInsertSchema(galleryEmailCaptures).omit({
  id: true,
  capturedAt: true,
});

export const insertGalleryActivityLogSchema = createInsertSchema(galleryActivityLog).omit({
  id: true,
  createdAt: true,
});

// Digital Files storage (for uploaded assets/documents)
export const digitalFiles = pgTable("digital_files", {
  id: text("id").primaryKey(),
  folderName: text("folder_name"),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").default(0),
  clientId: text("client_id"),
  sessionId: text("session_id"),
  description: text("description"),
  tags: text("tags"), // stored as JSON string for now for backward-compat
  isPublic: boolean("is_public").default(false),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Photo Folders for organizing digital files
export const photoFolders = pgTable("photo_folders", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  parentId: text("parent_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Photography Session Management System  
export const photographySessions = pgTable("photography_sessions", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  sessionType: text("session_type").notNull(),
  status: text("status").default("scheduled"),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  
  // Client Integration & Attendees
  clientId: text("client_id"), // Link to CRM clients
  clientName: text("client_name"),
  clientEmail: text("client_email"),
  clientPhone: text("client_phone"),
  attendees: jsonb("attendees"), // Array of attendee objects with RSVP status
  
  // Location & Weather
  locationName: text("location_name"),
  locationAddress: text("location_address"),
  locationCoordinates: text("location_coordinates"),
  weatherDependent: boolean("weather_dependent").default(false),
  goldenHourOptimized: boolean("golden_hour_optimized").default(false),
  backupPlan: text("backup_plan"),
  
  // Pricing & Payment Status
  basePrice: decimal("base_price", { precision: 10, scale: 2 }),
  depositAmount: decimal("deposit_amount", { precision: 10, scale: 2 }),
  depositPaid: boolean("deposit_paid").default(false),
  finalPayment: decimal("final_payment", { precision: 10, scale: 2 }),
  finalPaymentPaid: boolean("final_payment_paid").default(false),
  paymentStatus: text("payment_status").default("unpaid"), // unpaid, deposit_paid, fully_paid, refunded
  
  // Equipment & Workflow
  equipmentList: text("equipment_list").array(),
  crewMembers: text("crew_members").array(),
  conflictDetected: boolean("conflict_detected").default(false),
  notes: text("notes"),
  portfolioWorthy: boolean("portfolio_worthy").default(false),
  editingStatus: text("editing_status").default("not_started"),
  deliveryStatus: text("delivery_status").default("pending"),
  deliveryDate: timestamp("delivery_date", { withTimezone: true }),
  
  // Recurring Events Support
  isRecurring: boolean("is_recurring").default(false),
  recurrenceRule: text("recurrence_rule"), // RRULE format for recurring events
  parentEventId: text("parent_event_id"), // For recurring event instances
  
  // External Calendar Integration
  googleCalendarEventId: text("google_calendar_event_id"),
  icalUid: text("ical_uid"),
  externalCalendarSync: boolean("external_calendar_sync").default(false),
  
  // Automated Reminders & Notifications
  reminderSettings: jsonb("reminder_settings"), // Customizable reminder times
  reminderSent: boolean("reminder_sent").default(false),
  confirmationSent: boolean("confirmation_sent").default(false),
  followUpSent: boolean("follow_up_sent").default(false),
  
  // Booking & Availability
  isOnlineBookable: boolean("is_online_bookable").default(false),
  bookingRequirements: jsonb("booking_requirements"), // Custom fields for booking
  availabilityStatus: text("availability_status").default("available"), // available, blocked, tentative
  
  // Enhanced Display & Organization
  color: text("color"), // Custom color for calendar display
  priority: text("priority").default("medium"), // low, medium, high, urgent
  isPublic: boolean("is_public").default(false), // For client-facing calendar
  category: text("category"), // Additional categorization beyond session type
  
  // Metadata
  galleryId: text("gallery_id"),
  photographerId: text("photographer_id"),
  tags: text("tags").array(),
  customFields: jsonb("custom_fields"), // Flexible custom data storage
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const sessionEquipment = pgTable("session_equipment", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  equipmentName: text("equipment_name").notNull(),
  equipmentType: text("equipment_type"),
  rentalRequired: boolean("rental_required").default(false),
  rentalCost: decimal("rental_cost", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const sessionTasks = pgTable("session_tasks", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  taskType: text("task_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  assignedTo: text("assigned_to"),
  status: text("status").default("pending"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const sessionCommunications = pgTable("session_communications", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  communicationType: text("communication_type").notNull(),
  subject: text("subject"),
  content: text("content"),
  sentTo: text("sent_to"),
  sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow(),
  responseReceived: boolean("response_received").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const weatherData = pgTable("weather_data", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  forecastDate: timestamp("forecast_date", { withTimezone: true }).notNull(),
  temperature: decimal("temperature", { precision: 5, scale: 2 }),
  condition: text("condition"),
  precipitationChance: integer("precipitation_chance"),
  windSpeed: decimal("wind_speed", { precision: 5, scale: 2 }),
  goldenHourStart: timestamp("golden_hour_start", { withTimezone: true }),
  goldenHourEnd: timestamp("golden_hour_end", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const businessInsights = pgTable("business_insights", {
  id: text("id").primaryKey(),
  insightType: text("insight_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  dataPoint: decimal("data_point", { precision: 15, scale: 2 }),
  dataUnit: text("data_unit"),
  periodStart: timestamp("period_start", { withTimezone: true }),
  periodEnd: timestamp("period_end", { withTimezone: true }),
  category: text("category"),
  priority: text("priority").default("medium"),
  actionable: boolean("actionable").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Advanced Calendar Features - Availability Management
export const availabilityTemplates = pgTable("availability_templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  photographerId: text("photographer_id").notNull(),
  businessHours: jsonb("business_hours"),
  breakTime: jsonb("break_time"),
  bufferTime: integer("buffer_time").default(30),
  maxSessionsPerDay: integer("max_sessions_per_day").default(3),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const availabilityOverrides = pgTable("availability_overrides", {
  id: text("id").primaryKey(),
  photographerId: text("photographer_id").notNull(),
  date: timestamp("date", { withTimezone: true }).notNull(),
  overrideType: text("override_type").notNull(),
  title: text("title"),
  description: text("description"),
  customHours: jsonb("custom_hours"),
  isRecurring: boolean("is_recurring").default(false),
  recurrenceRule: text("recurrence_rule"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// External Calendar Integration
export const calendarSyncSettings = pgTable("calendar_sync_settings", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  provider: text("provider").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  calendarId: text("calendar_id"),
  syncEnabled: boolean("sync_enabled").default(true),
  syncDirection: text("sync_direction").default("bidirectional"),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  syncStatus: text("sync_status").default("active"),
  syncErrors: jsonb("sync_errors"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const calendarSyncLogs = pgTable("calendar_sync_logs", {
  id: text("id").primaryKey(),
  syncSettingId: text("sync_setting_id").notNull(),
  syncType: text("sync_type").notNull(),
  status: text("status").notNull(),
  eventsProcessed: integer("events_processed").default(0),
  eventsCreated: integer("events_created").default(0),
  eventsUpdated: integer("events_updated").default(0),
  eventsDeleted: integer("events_deleted").default(0),
  errors: jsonb("errors"),
  duration: integer("duration"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Online Booking System
export const bookingForms = pgTable("booking_forms", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  sessionTypes: text("session_types").array(),
  fields: jsonb("fields"),
  requirements: jsonb("requirements"),
  pricing: jsonb("pricing"),
  availability: jsonb("availability"),
  confirmationMessage: text("confirmation_message"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const onlineBookings = pgTable("online_bookings", {
  id: text("id").primaryKey(),
  formId: text("form_id").notNull(),
  sessionId: text("session_id"),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email").notNull(),
  clientPhone: text("client_phone"),
  formData: jsonb("form_data"),
  requestedDate: timestamp("requested_date", { withTimezone: true }),
  requestedTime: text("requested_time"),
  sessionType: text("session_type").notNull(),
  status: text("status").default("pending"),
  notes: text("notes"),
  adminNotes: text("admin_notes"),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  processedBy: text("processed_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ==================== SCHEDULER SYSTEM ====================
// Client Self-Booking Schedulers (like Sprout Studio)

// Scheduler templates - defines booking types available to clients
export const schedulers = pgTable("schedulers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(), // e.g., "Shooting", "Consultation", "Mini Session"
  slug: text("slug").notNull().unique(), // URL-friendly slug for public link
  description: text("description"),
  
  // Session configuration
  sessionType: text("session_type").notNull().default("portrait"), // portrait, wedding, event, etc.
  duration: integer("duration").notNull().default(60), // Duration in minutes
  location: text("location"), // Default location
  price: decimal("price", { precision: 10, scale: 2 }).default("0"), // Price for this session type
  
  // Availability configuration
  availabilityType: text("availability_type").default("ongoing"), // "ongoing", "date_range", "specific_dates"
  startDate: timestamp("start_date", { withTimezone: true }), // For date_range
  endDate: timestamp("end_date", { withTimezone: true }), // For date_range
  timezone: text("timezone").default("Europe/Vienna"),
  
  // Weekly availability (JSON: { monday: [{start: "09:00", end: "17:00"}], ... })
  weeklyAvailability: jsonb("weekly_availability"),
  
  // Specific available dates (for specific_dates type)
  specificDates: jsonb("specific_dates"),
  
  // Booking rules
  bufferBefore: integer("buffer_before").default(0), // Minutes buffer before appointment
  bufferAfter: integer("buffer_after").default(0), // Minutes buffer after appointment
  minNotice: integer("min_notice").default(24), // Minimum hours notice required
  maxAdvance: integer("max_advance").default(90), // Maximum days in advance to book
  maxPerDay: integer("max_per_day"), // Max appointments per day (null = unlimited)
  availabilityIncrements: integer("availability_increments").default(60), // 15, 30, 60 mins
  
  // Communication settings
  confirmationMessage: text("confirmation_message"),
  questionnaireId: integer("questionnaire_id").references(() => questionnaires.id),
  autoApprove: boolean("auto_approve").default(true), // Auto-confirm or require manual approval
  sendReminders: boolean("send_reminders").default(true),
  reminderHours: integer("reminder_hours").default(24),
  reminderTimings: jsonb("reminder_timings"), // Array of {value, unit} e.g. [{value:2,unit:'days'},{value:2,unit:'hours'}]
  reminderEmailSubject: text("reminder_email_subject"), // Custom reminder email subject
  reminderEmailBody: text("reminder_email_body"), // Custom reminder email body (HTML or plain text)
  
  // Branding
  brandName: text("brand_name"),
  brandColor: text("brand_color").default("#0d9488"), // Teal
  
  // Status
  isActive: boolean("is_active").default(true),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Scheduler bookings - when a client books through a scheduler
export const schedulerBookings = pgTable("scheduler_bookings", {
  id: text("id").primaryKey(),
  schedulerId: text("scheduler_id").notNull().references(() => schedulers.id),
  
  // Client info (may or may not link to existing CRM client)
  // uuid to match crm_clients.id (was text → broke FK creation on a clean push)
  clientId: uuid("client_id").references(() => crmClients.id),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email").notNull(),
  clientPhone: text("client_phone"),
  
  // Booking details
  scheduledDate: timestamp("scheduled_date", { withTimezone: true }).notNull(),
  scheduledEndDate: timestamp("scheduled_end_date", { withTimezone: true }).notNull(),
  timezone: text("timezone").default("Europe/Vienna"),
  
  // Status: pending, confirmed, cancelled, completed, no_show
  status: text("status").default("pending"),
  
  // Linked session (created when booking is confirmed)
  sessionId: text("session_id"),
  
  // Google Calendar sync
  googleCalendarEventId: text("google_calendar_event_id"),
  
  // Client notes & questionnaire responses
  clientNotes: text("client_notes"),
  questionnaireResponses: jsonb("questionnaire_responses"),
  
  // Confirmation & reminders
  confirmationSent: boolean("confirmation_sent").default(false),
  confirmationSentAt: timestamp("confirmation_sent_at", { withTimezone: true }),
  reminderSent: boolean("reminder_sent").default(false),
  reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
  
  // Cancellation
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  cancellationReason: text("cancellation_reason"),
  
  // Metadata
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  source: text("source").default("scheduler"), // scheduler, admin, import
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Blocked times - times when scheduler is unavailable (holidays, personal time)
export const schedulerBlockedTimes = pgTable("scheduler_blocked_times", {
  id: text("id").primaryKey(),
  schedulerId: text("scheduler_id").references(() => schedulers.id), // null = applies to all
  title: text("title"),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  isAllDay: boolean("is_all_day").default(false),
  isRecurring: boolean("is_recurring").default(false),
  recurrenceRule: text("recurrence_rule"), // iCal RRULE format
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Questionnaires table
export const questionnaires = pgTable("questionnaires", {
  id: serial("id").primaryKey(),
  slug: text("slug").unique().notNull(),
  title: text("title").notNull(),
  description: text("description").default(""),
  fields: jsonb("fields").notNull(), // Array of field definitions
  notifyEmail: text("notify_email"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Questionnaire responses table
export const questionnaireResponses = pgTable("questionnaire_responses", {
  id: serial("id").primaryKey(),
  questionnaireId: integer("questionnaire_id").notNull().references(() => questionnaires.id),
  slug: text("slug").notNull(), // The questionnaire slug
  responses: jsonb("responses").notNull(), // The actual responses data
  submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow(),
});

// Insert schemas
export const insertPhotographySessionSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  sessionType: z.string(),
  status: z.string().optional(),
  startTime: z.date(),
  endTime: z.date(),
  // Link to CRM client (optional)
  clientId: z.string().optional(),
  clientName: z.string().optional(),
  clientEmail: z.string().optional(),
  clientPhone: z.string().optional(),
  locationName: z.string().optional(),
  locationAddress: z.string().optional(),
  locationCoordinates: z.string().optional(),
  basePrice: z.number().optional(),
  depositAmount: z.number().optional(),
  depositPaid: z.boolean().optional(),
  finalPayment: z.number().optional(),
  finalPaymentPaid: z.boolean().optional(),
  equipmentList: z.array(z.string()).optional(),
  crewMembers: z.array(z.string()).optional(),
  weatherDependent: z.boolean().optional(),
  goldenHourOptimized: z.boolean().optional(),
  backupPlan: z.string().optional(),
  notes: z.string().optional(),
  portfolioWorthy: z.boolean().optional(),
  editingStatus: z.string().optional(),
  deliveryStatus: z.string().optional(),
  deliveryDate: z.date().optional(),
  galleryId: z.string().optional(),
  photographerId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  firstName: true,
  lastName: true,
  avatar: true,
});

export const insertBlogPostSchema = createInsertSchema(blogPosts).pick({
  title: true,
  content: true,
  contentHtml: true,
  slug: true,
  excerpt: true,
  published: true,
  imageUrl: true,
  imageUrl2: true,
  imageUrl3: true,
  videoUrl: true,
  tags: true,
  publishedAt: true,
  scheduledFor: true,
  status: true,
  seoTitle: true,
  metaDescription: true,
  authorId: true,
});

export const insertCrmClientSchema = createInsertSchema(crmClients).pick({
  firstName: true,
  lastName: true,
  clientId: true,
  email: true,
  phone: true,
  address: true,
  city: true,
  state: true,
  zip: true,
  country: true,
  company: true,
  leadSource: true,
  notes: true,
  status: true,
});

export const insertCrmLeadSchema = createInsertSchema(crmLeads).pick({
  name: true,
  email: true,
  phone: true,
  company: true,
  message: true,
  source: true,
  status: true,
  priority: true,
  tags: true,
  follow_up_date: true,
  value: true,
});

export const insertLeadSourceSchema = createInsertSchema(leadSources).pick({
  name: true,
  isActive: true,
  sortOrder: true,
});

export const insertGallerySchema = createInsertSchema(galleries).pick({
  title: true,
  description: true,
  slug: true,
  coverImage: true,
  isPublic: true,
  isPasswordProtected: true,
  password: true,
});

export const insertCrmInvoiceSchema = createInsertSchema(crmInvoices).pick({
  invoiceNumber: true,
  clientId: true,
  issueDate: true,
  dueDate: true,
  subtotal: true,
  taxAmount: true,
  discountAmount: true,
  total: true,
  currency: true,
  status: true,
  paymentTerms: true,
  notes: true,
  termsAndConditions: true,
  footerText: true,
  stripePaymentIntentId: true,
  stripePaymentUrl: true,
  paidAmount: true,
  createdBy: true,
}).partial({ invoiceNumber: true, createdBy: true, discountAmount: true, currency: true, paymentTerms: true, footerText: true, stripePaymentIntentId: true, stripePaymentUrl: true, paidAmount: true }); // Make optional fields

export const insertCrmInvoiceItemSchema = createInsertSchema(crmInvoiceItems).pick({
  invoiceId: true,
  description: true,
  quantity: true,
  unitPrice: true,
  taxRate: true,
  sortOrder: true,
});

export const insertCrmMessageSchema = createInsertSchema(crmMessages).pick({
  senderName: true,
  senderEmail: true,
  subject: true,
  content: true,
  messageType: true,
  status: true,
  // Note: Some deployments may not have 'direction' column.
  // Keep validation flexible by not requiring it at runtime.
  // direction: true,
  clientId: true,
  phoneNumber: true,
  campaignId: true,
});

export const insertMessageCampaignSchema = createInsertSchema(messageCampaigns).pick({
  name: true,
  messageType: true,
  subject: true,
  content: true,
  targetType: true,
  targetCriteria: true,
  targetClientIds: true,
  scheduledAt: true,
});

export const insertSMSConfigSchema = createInsertSchema(smsConfig).pick({
  provider: true,
  accountSid: true,
  authToken: true,
  fromNumber: true,
  isActive: true,
});

// Scheduler insert schemas
export const insertSchedulerSchema = createInsertSchema(schedulers, {
  name: z.string().min(1, "Scheduler name is required"),
  slug: z.string().min(1, "URL slug is required"),
  sessionType: z.string().min(1, "Session type is required"),
  duration: z.number().min(15, "Duration must be at least 15 minutes"),
}).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertSchedulerBookingSchema = createInsertSchema(schedulerBookings, {
  schedulerId: z.string().min(1, "Scheduler ID is required"),
  clientName: z.string().min(1, "Client name is required"),
  clientEmail: z.string().email("Valid email is required"),
}).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertSchedulerBlockedTimeSchema = createInsertSchema(schedulerBlockedTimes, {
  startDate: z.date(),
  endDate: z.date(),
}).omit({ 
  id: true, 
  createdAt: true 
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertPhotographySession = z.infer<typeof insertPhotographySessionSchema>;
export type PhotographySession = typeof photographySessions.$inferSelect;
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertCrmClient = z.infer<typeof insertCrmClientSchema>;
export type CrmClient = typeof crmClients.$inferSelect;
export type InsertLeadSource = z.infer<typeof insertLeadSourceSchema>;
export type LeadSource = typeof leadSources.$inferSelect;
export type InsertCrmLead = z.infer<typeof insertCrmLeadSchema>;
export type CrmLead = typeof crmLeads.$inferSelect;
export type InsertGallery = z.infer<typeof insertGallerySchema>;
// (Gallery type already exported above)
export type InsertCrmInvoice = z.infer<typeof insertCrmInvoiceSchema>;
export type CrmInvoice = typeof crmInvoices.$inferSelect;
export type InsertCrmInvoiceItem = z.infer<typeof insertCrmInvoiceItemSchema>;
export type CrmInvoiceItem = typeof crmInvoiceItems.$inferSelect;
export type CrmInvoicePayment = typeof crmInvoicePayments.$inferSelect;
export type InsertCrmInvoicePayment = typeof crmInvoicePayments.$inferInsert;
export type CrmMessage = typeof crmMessages.$inferSelect;
export type InsertCrmMessage = z.infer<typeof insertCrmMessageSchema>;
export type Gallery = typeof galleries.$inferSelect;
export type SessionEquipment = typeof sessionEquipment.$inferSelect;
export type SessionTask = typeof sessionTasks.$inferSelect;
export type SessionCommunication = typeof sessionCommunications.$inferSelect;
export type WeatherData = typeof weatherData.$inferSelect;
export type BusinessInsight = typeof businessInsights.$inferSelect;

// New types for template and studio management
export type StudioConfig = typeof studioConfigs.$inferSelect;
export type TemplateDefinition = typeof templateDefinitions.$inferSelect;

// Voucher Product schemas - Using manual schema instead of createInsertSchema to avoid field name conflicts
export const insertVoucherProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  price: z.union([z.string(), z.number()]).transform(val => String(val)),
  originalPrice: z.union([z.string(), z.number()]).optional().transform(val => val ? String(val) : undefined),
  category: z.string().optional(),
  sessionDuration: z.number().optional(),
  sessionType: z.string().optional(),
  validityPeriod: z.number().optional(),
  redemptionInstructions: z.string().optional(),
  termsAndConditions: z.string().optional(),
  imageUrl: z.string().optional(),
  displayOrder: z.number().optional(),
  featured: z.boolean().optional(),
  badge: z.string().optional(),
  isActive: z.boolean().optional(),
  stockLimit: z.number().optional(),
  maxPerCustomer: z.number().optional(),
  slug: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});

export type InsertVoucherProduct = z.infer<typeof insertVoucherProductSchema>;
export type VoucherProduct = typeof voucherProducts.$inferSelect;

// Voucher Template schemas
export const insertVoucherTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  category: z.string().min(1, "Category is required"),
  imageUrl: z.string().min(1, "Image URL is required"),
  occasion: z.string().min(1, "Occasion is required"),
  isActive: z.boolean().optional(),
  displayOrder: z.number().optional(),
});

export type InsertVoucherTemplate = z.infer<typeof insertVoucherTemplateSchema>;
export type VoucherTemplate = typeof voucherTemplates.$inferSelect;

// Discount Coupon schemas
export const insertDiscountCouponSchema = createInsertSchema(discountCoupons, {
  code: z.string().min(1, "Coupon code is required"),
  name: z.string().min(1, "Coupon name is required"),
  discountType: z.enum(["percentage", "fixed_amount"]),
  discountValue: z.string().min(1, "Discount value is required"),
}).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export type InsertDiscountCoupon = z.infer<typeof insertDiscountCouponSchema>;
export type DiscountCoupon = typeof discountCoupons.$inferSelect;

// Voucher Sale schemas
export const insertVoucherSaleSchema = createInsertSchema(voucherSales, {
  purchaserName: z.string().min(1, "Purchaser name is required"),
  purchaserEmail: z.string().email("Valid email is required"),
  voucherCode: z.string().min(1, "Voucher code is required"),
  originalAmount: z.string().min(1, "Original amount is required"),
  finalAmount: z.string().min(1, "Final amount is required"),
}).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export type InsertVoucherSale = z.infer<typeof insertVoucherSaleSchema>;
export type VoucherSale = typeof voucherSales.$inferSelect;

// Coupon Usage schemas
export const insertCouponUsageSchema = createInsertSchema(couponUsage, {
  customerEmail: z.string().email("Valid email is required"),
  orderAmount: z.string().min(1, "Order amount is required"),
  discountAmount: z.string().min(1, "Discount amount is required"),
}).omit({ 
  id: true, 
  usedAt: true 
});

export type InsertCouponUsage = z.infer<typeof insertCouponUsageSchema>;
export type CouponUsage = typeof couponUsage.$inferSelect;

// Knowledge Base table
export const knowledgeBase = pgTable("knowledge_base", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(),
  tags: text("tags").array(),
  isActive: boolean("is_active").default(true),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// OpenAI Assistants table
export const openaiAssistants = pgTable("openai_assistants", {
  id: uuid("id").primaryKey().defaultRandom(), // Database ID
  openaiAssistantId: text("openai_assistant_id"), // OpenAI assistant ID from API
  name: text("name").notNull(),
  description: text("description"),
  model: text("model").default("gpt-4o"),
  instructions: text("instructions").notNull(),
  isActive: boolean("is_active").default(true),
  knowledgeBaseIds: text("knowledge_base_ids").array(),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Knowledge Base schemas
export const insertKnowledgeBaseSchema = createInsertSchema(knowledgeBase, {
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  category: z.string().min(1, "Category is required"),
}).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export type InsertKnowledgeBase = z.infer<typeof insertKnowledgeBaseSchema>;
export type KnowledgeBase = typeof knowledgeBase.$inferSelect;

// OpenAI Assistant schemas
export const insertOpenaiAssistantSchema = createInsertSchema(openaiAssistants, {
  name: z.string().min(1, "Assistant name is required"),
  instructions: z.string().min(1, "Instructions are required"),
}).omit({ 
  id: true, // Let the database generate the OpenAI assistant ID
  createdAt: true, 
  updatedAt: true 
});

export type InsertOpenaiAssistant = z.infer<typeof insertOpenaiAssistantSchema>;
export type OpenaiAssistant = typeof openaiAssistants.$inferSelect;

// Admin User schemas
export const insertAdminUserSchema = createInsertSchema(adminUsers, {
  email: z.string().email("Valid email is required"),
  passwordHash: z.string().min(1, "Password hash is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
}).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  lastLoginAt: true
});

export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;

export type ManualPageContent = typeof manualPageContent.$inferSelect;
export type InsertManualPageContent = typeof manualPageContent.$inferInsert;

// ========== MULTI-STUDIO AI OPERATOR TABLES ==========

// Studios table (main studio/tenant table)
export const studios = pgTable("studios", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  default_currency: text("default_currency").default("EUR"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Studio Integrations (credentials and settings per studio)
export const studioIntegrations = pgTable("studio_integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  studioId: uuid("studio_id").references(() => studios.id, { onDelete: "cascade" }).notNull(),
  
  // SMTP Configuration
  smtp_host: text("smtp_host"),
  smtp_port: integer("smtp_port").default(587),
  smtp_user: text("smtp_user"),
  smtp_pass_encrypted: text("smtp_pass_encrypted"),
  smtp_secure: boolean("smtp_secure").default(false),
  inbound_email_address: text("inbound_email_address"),
  default_from_email: text("default_from_email"),
  email_from_name: text("email_from_name"),
  
  // IMAP Configuration (for inbox feature)
  imap_host: text("imap_host"),
  imap_port: integer("imap_port").default(993),
  imap_user: text("imap_user"),
  imap_pass_encrypted: text("imap_pass_encrypted"),
  imap_tls: boolean("imap_tls").default(true),
  
  // Stripe Configuration
  stripe_account_id: text("stripe_account_id"),
  stripe_publishable_key: text("stripe_publishable_key"),
  stripe_secret_key_encrypted: text("stripe_secret_key_encrypted"),
  stripe_webhook_secret_encrypted: text("stripe_webhook_secret_encrypted"),
  // Whether this studio sells online at all. Not every photographer wants a voucher
  // shop, and forcing one through Stripe to finish onboarding is worse than the problem
  // the gate solves. NULL means "not answered yet" — treated as enabled, which is the
  // behaviour every existing studio already has.
  ecommerce_enabled: boolean("ecommerce_enabled"),

  // OpenAI Configuration
  openai_api_key_encrypted: text("openai_api_key_encrypted"),
  openai_assistant_id: text("openai_assistant_id"),
  
  // Anthropic Configuration
  anthropic_api_key_encrypted: text("anthropic_api_key_encrypted"),
  
  // File Storage (Backblaze B2 / S3 / R2)
  storage_provider: text("storage_provider").default("backblaze"), // backblaze, s3, r2
  storage_access_key_id: text("storage_access_key_id"),
  storage_secret_key_encrypted: text("storage_secret_key_encrypted"),
  storage_bucket: text("storage_bucket"),
  storage_endpoint: text("storage_endpoint"),
  storage_region: text("storage_region"),
  
  // Google OAuth & Calendar
  google_client_id: text("google_client_id"),
  google_client_secret_encrypted: text("google_client_secret_encrypted"),
  google_calendar_id: text("google_calendar_id"),
  
  // Brevo (email marketing)
  brevo_api_key_encrypted: text("brevo_api_key_encrypted"),
  
  // SMS / WhatsApp
  sms_provider: text("sms_provider"),            // vonage, twilio, none
  sms_account_sid: text("sms_account_sid"),
  sms_auth_token_encrypted: text("sms_auth_token_encrypted"),
  sms_from_number: text("sms_from_number"),
  
  // Google Places — powers LIVE Google reviews on the public site.
  google_places_api_key_encrypted: text("google_places_api_key_encrypted"),
  google_places_place_id: text("google_places_place_id"),

  // Pulse / AxixOS social distribution. pulse_profiles pins WHICH account is
  // used per platform, e.g. {"instagram":"1784…","facebook":"4719…"} — without
  // it Pulse falls back to the workspace default account.
  pulse_api_key_encrypted: text("pulse_api_key_encrypted"),
  pulse_profiles: jsonb("pulse_profiles"),
  pulse_mode: text("pulse_mode").default("draft"), // draft | schedule | now

  // Prodigi print fulfilment (per-tenant). Key is encrypted; environment picks
  // the sandbox vs live Prodigi host. Studios bring their own Prodigi account.
  prodigi_api_key_encrypted: text("prodigi_api_key_encrypted"),
  prodigi_environment: text("prodigi_environment").default("sandbox"), // sandbox | production

  // Currency and Regional Settings
  default_currency: text("default_currency").default("EUR"),
  timezone: text("timezone").default("Europe/Vienna"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// AI Policies (what the AI agent can do per studio)
export const aiPolicies = pgTable("ai_policies", {
  id: uuid("id").primaryKey().defaultRandom(),
  studioId: uuid("studio_id").references(() => studios.id, { onDelete: "cascade" }).notNull(),
  
  // Agent behavior mode
  mode: text("mode").notNull().default("read_only"), // "read_only", "propose", "auto_safe", "auto_all"
  
  // Specific authorities/permissions
  authorities: text("authorities").array(), // ["READ_CLIENTS", "READ_LEADS", "DRAFT_EMAIL", etc.]
  
  // Limits and restrictions
  invoice_auto_limit: decimal("invoice_auto_limit", { precision: 10, scale: 2 }).default("0"),
  email_send_mode: text("email_send_mode").default("draft"), // "draft", "trusted", "auto"
  
  // Additional constraints
  max_daily_actions: integer("max_daily_actions").default(100),
  require_approval_above: decimal("require_approval_above", { precision: 10, scale: 2 }).default("500"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Agent Action Log (audit trail) - V1 Legacy
export const agentActionLog = pgTable("agent_action_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  studioId: uuid("studio_id").references(() => studios.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id),
  
  // Action details
  action_type: text("action_type").notNull(), // "READ_CLIENTS", "DRAFT_EMAIL", "SEND_INVOICE", etc.
  action_details: jsonb("action_details"), // Full details of what was done
  
  // Context
  assistant_id: text("assistant_id"), // OpenAI assistant ID that performed the action
  conversation_id: text("conversation_id"), // Link to conversation thread
  
  // Result
  success: boolean("success").default(true),
  error_message: text("error_message"),
  
  // Metadata
  ip_address: text("ip_address"),
  user_agent: text("user_agent"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Agent V2 Tables (ToolBus Architecture)

// Agent Session - tracks conversation sessions
export const agentSession = pgTable("agent_session", {
  id: text("id").primaryKey(), // sess_xxx
  studioId: text("studio_id").notNull(),
  userId: text("user_id").notNull(),
  mode: text("mode").notNull(), // read_only | auto_safe | auto_full
  scopes: text("scopes").array(), // User's permission scopes
  metadata: jsonb("metadata"), // Additional context (e.g., client_id if in context)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Agent Message - conversation history
export const agentMessage = pgTable("agent_message", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => agentSession.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // user | assistant | system
  content: text("content").notNull(),
  metadata: jsonb("metadata"), // Tool calls, token usage, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// Agent Audit - tool execution log
export const agentAudit = pgTable("agent_audit", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => agentSession.id, { onDelete: "cascade" }),
  tool: text("tool").notNull(),
  argsJson: text("args_json").notNull(),
  resultJson: text("result_json"),
  ok: boolean("ok").notNull(),
  error: text("error"),
  duration: integer("duration"), // milliseconds
  simulated: boolean("simulated").default(false), // true for shadow mode
  createdAt: timestamp("created_at").defaultNow(),
});

// Agent Audit Diff - shadow mode comparison (v1 vs v2)
export const agentAuditDiff = pgTable("agent_audit_diff", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => agentSession.id, { onDelete: "cascade" }),
  v1Text: text("v1_text"), // V1 response
  v2PlanJson: text("v2_plan_json"), // V2 plan
  v2ResultsJson: text("v2_results_json"), // V2 execution results
  match: boolean("match"), // Did v1 and v2 produce same outcome?
  notes: text("notes"), // Analysis notes
  createdAt: timestamp("created_at").defaultNow(),
});

// Add studio_id to existing tables for multi-tenancy
// Note: This should be added to existing tables in migrations

// Schema types for new tables
export const insertStudioSchema = createInsertSchema(studios, {
  name: z.string().min(1, "Studio name is required"),
  slug: z.string().min(1, "Studio slug is required"),
}).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertStudioIntegrationSchema = createInsertSchema(studioIntegrations, {
  studioId: z.string().uuid("Valid studio ID is required"),
}).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertAiPolicySchema = createInsertSchema(aiPolicies, {
  studioId: z.string().uuid("Valid studio ID is required"),
  mode: z.enum(["read_only", "propose", "auto_safe", "auto_all"]),
}).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertAgentActionLogSchema = createInsertSchema(agentActionLog, {
  studioId: z.string().uuid("Valid studio ID is required"),
  action_type: z.string().min(1, "Action type is required"),
}).omit({ 
  id: true, 
  createdAt: true 
});

// Agent V2 schemas
export const insertAgentSessionSchema = createInsertSchema(agentSession, {
  id: z.string().min(1, "Session ID is required"),
  studioId: z.string().min(1, "Studio ID is required"),
  userId: z.string().min(1, "User ID is required"),
  mode: z.enum(["read_only", "auto_safe", "auto_full"]),
}).omit({ 
  createdAt: true, 
  updatedAt: true 
});

export const insertAgentMessageSchema = createInsertSchema(agentMessage, {
  sessionId: z.string().min(1, "Session ID is required"),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1, "Message content is required"),
}).omit({ 
  id: true, 
  createdAt: true 
});

export const insertAgentAuditSchema = createInsertSchema(agentAudit, {
  sessionId: z.string().min(1, "Session ID is required"),
  tool: z.string().min(1, "Tool name is required"),
  argsJson: z.string().min(1),
  ok: z.boolean(),
}).omit({ 
  id: true, 
  createdAt: true 
});

export const insertAgentAuditDiffSchema = createInsertSchema(agentAuditDiff, {
  sessionId: z.string().min(1, "Session ID is required"),
}).omit({ 
  id: true, 
  createdAt: true 
});

export const insertPriceListItemSchema = createInsertSchema(priceListItems, {
  name: z.string().min(1, "Item name is required"),
  category: z.string().min(1, "Category is required"),
  price: z.string().min(1, "Price is required"),
}).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

// Digital Storage Subscription System
export const storageSubscriptionTier = pgEnum("storage_subscription_tier", [
  "starter",
  "professional", 
  "enterprise"
]);

export const storageSubscriptionStatus = pgEnum("storage_subscription_status", [
  "active",
  "canceled",
  "past_due",
  "trialing",
  "incomplete"
]);

// Storage Subscriptions (linked to Stripe)
export const storageSubscriptions = pgTable("storage_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").references(() => crmClients.id, { onDelete: "cascade" }),
  
  // Stripe integration
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  stripeCustomerId: text("stripe_customer_id"),
  stripePriceId: text("stripe_price_id"),
  
  // Subscription details
  tier: storageSubscriptionTier("tier").notNull(),
  status: storageSubscriptionStatus("status").notNull().default("trialing"),
  
  // Storage limits (in bytes)
  storageLimit: integer("storage_limit").notNull(), // 50GB, 200GB, 1TB
  
  // Billing
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  
  // Metadata
  metadata: jsonb("metadata"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Storage Usage Tracking
export const storageUsage = pgTable("storage_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  subscriptionId: uuid("subscription_id").references(() => storageSubscriptions.id, { onDelete: "cascade" }).notNull(),
  
  // Usage metrics (in bytes)
  currentStorageBytes: integer("current_storage_bytes").default(0).notNull(),
  fileCount: integer("file_count").default(0),
  
  // Calculated fields
  lastCalculatedAt: timestamp("last_calculated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Archived Folders (for organizing files)
export const archivedFolders = pgTable("archived_folders", {
  id: uuid("id").primaryKey().defaultRandom(),
  subscriptionId: uuid("subscription_id").references(() => storageSubscriptions.id, { onDelete: "cascade" }).notNull(),
  parentFolderId: uuid("parent_folder_id"),
  
  name: text("name").notNull(),
  description: text("description"),
  color: text("color"), // for UI organization
  icon: text("icon"), // icon name for UI
  
  // Metadata
  filesCount: integer("files_count").default(0),
  totalSize: integer("total_size").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Archived Files (user's personal cloud storage)
export const archivedFiles = pgTable("archived_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  subscriptionId: uuid("subscription_id").references(() => storageSubscriptions.id, { onDelete: "cascade" }).notNull(),
  folderId: uuid("folder_id").references(() => archivedFolders.id),
  
  // File metadata
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  fileType: text("file_type").notNull(), // image/jpeg, video/mp4, etc.
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(), // in bytes
  
  // Storage location
  storageKey: text("storage_key").notNull().unique(), // Neon blob storage key
  storageUrl: text("storage_url"), // CDN URL if applicable
  
  // File organization
  tags: text("tags").array(),
  description: text("description"),
  
  // Source tracking
  sourceType: text("source_type"), // 'upload', 'gallery_transfer', 'admin_send'
  sourceId: text("source_id"), // gallery_id or session_id if transferred
  
  // Thumbnails for images/videos
  thumbnailKey: text("thumbnail_key"),
  thumbnailUrl: text("thumbnail_url"),
  
  // Metadata
  metadata: jsonb("metadata"), // EXIF data, video duration, etc.
  
  // Status
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at"),
  
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Gallery Transfer Log (track when admin sends galleries to client archive)
export const galleryTransferLog = pgTable("gallery_transfer_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  galleryId: uuid("gallery_id").references(() => galleries.id),
  subscriptionId: uuid("subscription_id").references(() => storageSubscriptions.id, { onDelete: "cascade" }).notNull(),
  adminUserId: uuid("admin_user_id").references(() => adminUsers.id),
  
  filesTransferred: integer("files_transferred").default(0),
  totalSize: integer("total_size").default(0),
  status: text("status").default("pending"), // pending, completed, failed
  errorMessage: text("error_message"),
  
  transferredAt: timestamp("transferred_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Insert schemas
export const insertStorageSubscriptionSchema = createInsertSchema(storageSubscriptions, {
  tier: z.enum(["starter", "professional", "enterprise"]),
  status: z.enum(["active", "canceled", "past_due", "trialing", "incomplete"]).optional(),
  storageLimit: z.number().positive(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStorageUsageSchema = createInsertSchema(storageUsage, {
  subscriptionId: z.string().uuid(),
  totalUsed: z.number().nonnegative().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertArchivedFileSchema = createInsertSchema(archivedFiles, {
  subscriptionId: z.string().uuid(),
  fileName: z.string().min(1),
  originalName: z.string().min(1),
  fileType: z.string().min(1),
  mimeType: z.string().min(1),
  fileSize: z.number().positive(),
  storageKey: z.string().min(1),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  uploadedAt: true,
});

export const insertArchivedFolderSchema = createInsertSchema(archivedFolders, {
  subscriptionId: z.string().uuid(),
  name: z.string().min(1, "Folder name is required"),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGalleryTransferLogSchema = createInsertSchema(galleryTransferLog, {
  galleryId: z.string().uuid(),
  subscriptionId: z.string().uuid(),
}).omit({
  id: true,
  transferredAt: true,
});

// ==================== EMAIL CAMPAIGNS ====================
export const emailCampaigns = pgTable("email_campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  
  name: text("name").notNull(),
  type: text("type").notNull().default("broadcast"), // broadcast, drip, transactional
  status: text("status").notNull().default("draft"), // draft, scheduled, sending, sent, paused, archived
  
  subject: text("subject").notNull(),
  previewText: text("preview_text"),
  content: text("content").notNull(),
  
  senderName: text("sender_name").default("My Studio"),
  senderEmail: text("sender_email").default("noreply@example.com"),
  replyTo: text("reply_to").default("noreply@example.com"),
  
  // Scheduling
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  
  // Targeting
  segments: text("segments").array(),
  tagsInclude: text("tags_include").array(),
  tagsExclude: text("tags_exclude").array(),
  
  // Stats
  recipientCount: integer("recipient_count").default(0),
  sentCount: integer("sent_count").default(0),
  deliveredCount: integer("delivered_count").default(0),
  openedCount: integer("opened_count").default(0),
  clickedCount: integer("clicked_count").default(0),
  bouncedCount: integer("bounced_count").default(0),
  unsubscribedCount: integer("unsubscribed_count").default(0),
  
  // Settings (stored as JSON)
  settings: jsonb("settings"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEmailCampaignSchema = createInsertSchema(emailCampaigns, {
  userId: z.string().uuid().optional(),
  name: z.string().min(1, "Campaign name is required"),
  subject: z.string().min(1, "Subject is required"),
  content: z.string().min(1, "Content is required"),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Email Templates
export const emailTemplates = pgTable("email_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  
  name: text("name").notNull(),
  category: text("category").notNull().default("general"), // general, welcome, booking, payment, gallery
  description: text("description"),
  
  subject: text("subject").notNull(),
  previewText: text("preview_text"),
  htmlContent: text("html_content").notNull(),
  textContent: text("text_content"),
  
  thumbnail: text("thumbnail"),
  variables: jsonb("variables"), // Array of available variables
  
  isPublic: boolean("is_public").default(false),
  usageCount: integer("usage_count").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates, {
  name: z.string().min(1, "Template name is required"),
  subject: z.string().min(1, "Subject is required"),
  htmlContent: z.string().min(1, "HTML content is required"),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Email Subscribers
export const emailSubscribers = pgTable("email_subscribers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  
  status: text("status").notNull().default("active"), // active, unsubscribed, bounced, complained
  source: text("source").default("manual"), // manual, import, form, booking
  
  tags: text("tags").array(),
  customFields: jsonb("custom_fields"),
  
  subscribedAt: timestamp("subscribed_at").defaultNow(),
  unsubscribedAt: timestamp("unsubscribed_at"),
  
  // Engagement
  lastOpenedAt: timestamp("last_opened_at"),
  lastClickedAt: timestamp("last_clicked_at"),
  emailsSentCount: integer("emails_sent_count").default(0),
  emailsOpenedCount: integer("emails_opened_count").default(0),
  emailsClickedCount: integer("emails_clicked_count").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEmailSubscriberSchema = createInsertSchema(emailSubscribers, {
  email: z.string().email("Invalid email address"),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Email Segments
export const emailSegments = pgTable("email_segments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  
  name: text("name").notNull(),
  description: text("description"),
  
  conditions: jsonb("conditions").notNull(), // Filter conditions
  subscriberCount: integer("subscriber_count").default(0),
  
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEmailSegmentSchema = createInsertSchema(emailSegments, {
  name: z.string().min(1, "Segment name is required"),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Email Events for tracking opens, clicks, etc.
export const emailEvents = pgTable("email_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id").references(() => emailCampaigns.id, { onDelete: "cascade" }),
  subscriberEmail: text("subscriber_email").notNull(),
  eventType: text("event_type").notNull(), // sent, delivered, opened, clicked, bounced, unsubscribed, complained
  linkUrl: text("link_url"),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  country: text("country"),
  city: text("city"),
  deviceType: text("device_type"), // desktop, mobile, tablet, unknown
  browser: text("browser"),
  os: text("os"),
  createdAt: timestamp("created_at").defaultNow(),
  metadata: jsonb("metadata"),
});

export const emailLinks = pgTable("email_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id").references(() => emailCampaigns.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  label: text("label"),
  clickCount: integer("click_count").default(0),
  uniqueClicks: integer("unique_clicks").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Type exports for new tables
export type EmailCampaign = typeof emailCampaigns.$inferSelect;
export type InsertEmailCampaign = z.infer<typeof insertEmailCampaignSchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type EmailSubscriber = typeof emailSubscribers.$inferSelect;
export type InsertEmailSubscriber = z.infer<typeof insertEmailSubscriberSchema>;
export type EmailSegment = typeof emailSegments.$inferSelect;
export type InsertEmailSegment = z.infer<typeof insertEmailSegmentSchema>;
export type EmailEvent = typeof emailEvents.$inferSelect;
export type EmailLink = typeof emailLinks.$inferSelect;

// Type exports for new tables
export type Studio = typeof studios.$inferSelect;
export type InsertStudio = z.infer<typeof insertStudioSchema>;
export type StudioIntegration = typeof studioIntegrations.$inferSelect;
export type InsertStudioIntegration = z.infer<typeof insertStudioIntegrationSchema>;
export type AiPolicy = typeof aiPolicies.$inferSelect;
export type InsertAiPolicy = z.infer<typeof insertAiPolicySchema>;
export type AgentActionLog = typeof agentActionLog.$inferSelect;
export type InsertAgentActionLog = z.infer<typeof insertAgentActionLogSchema>;
export type PriceListItem = typeof priceListItems.$inferSelect;
export type InsertPriceListItem = z.infer<typeof insertPriceListItemSchema>;

// Storage subscription types
export type StorageSubscription = typeof storageSubscriptions.$inferSelect;
export type InsertStorageSubscription = z.infer<typeof insertStorageSubscriptionSchema>;
export type StorageUsage = typeof storageUsage.$inferSelect;
export type InsertStorageUsage = z.infer<typeof insertStorageUsageSchema>;
export type ArchivedFile = typeof archivedFiles.$inferSelect;
export type InsertArchivedFile = z.infer<typeof insertArchivedFileSchema>;
export type ArchivedFolder = typeof archivedFolders.$inferSelect;
export type InsertArchivedFolder = z.infer<typeof insertArchivedFolderSchema>;
export type GalleryTransferLog = typeof galleryTransferLog.$inferSelect;
export type InsertGalleryTransferLog = z.infer<typeof insertGalleryTransferLogSchema>;

// Agent V2 types
export type AgentSession = typeof agentSession.$inferSelect;
export type InsertAgentSession = z.infer<typeof insertAgentSessionSchema>;
export type AgentMessage = typeof agentMessage.$inferSelect;
export type InsertAgentMessage = z.infer<typeof insertAgentMessageSchema>;
export type AgentAudit = typeof agentAudit.$inferSelect;
export type InsertAgentAudit = z.infer<typeof insertAgentAuditSchema>;
export type AgentAuditDiff = typeof agentAuditDiff.$inferSelect;
export type InsertAgentAuditDiff = z.infer<typeof insertAgentAuditDiffSchema>;

// Communication types
export type MessageCampaign = typeof messageCampaigns.$inferSelect;
export type InsertMessageCampaign = z.infer<typeof insertMessageCampaignSchema>;
export type SMSConfig = typeof smsConfig.$inferSelect;
export type InsertSMSConfig = z.infer<typeof insertSMSConfigSchema>;

// Scheduler types
export type Scheduler = typeof schedulers.$inferSelect;
export type InsertScheduler = z.infer<typeof insertSchedulerSchema>;
export type SchedulerBooking = typeof schedulerBookings.$inferSelect;
export type InsertSchedulerBooking = z.infer<typeof insertSchedulerBookingSchema>;
export type SchedulerBlockedTime = typeof schedulerBlockedTimes.$inferSelect;
export type InsertSchedulerBlockedTime = z.infer<typeof insertSchedulerBlockedTimeSchema>;

// Gallery Analytics types
export type GalleryAnalytics = typeof galleryAnalytics.$inferSelect;
export type InsertGalleryAnalytics = z.infer<typeof insertGalleryAnalyticsSchema>;
export type GalleryEmailCapture = typeof galleryEmailCaptures.$inferSelect;
export type InsertGalleryEmailCapture = z.infer<typeof insertGalleryEmailCaptureSchema>;
export type GalleryActivityLog = typeof galleryActivityLog.$inferSelect;
export type InsertGalleryActivityLog = z.infer<typeof insertGalleryActivityLogSchema>;

// Backwards-compatible snake_case aliases for legacy imports
export const photography_sessions = photographySessions as typeof photographySessions;
export const gallery_images = galleryImages as typeof galleryImages;

// ==================== EMAIL AUTOMATIONS ====================
export const emailAutomations = pgTable("email_automations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  
  // Trigger: "before_booking" or "after_booking"
  triggerType: text("trigger_type").notNull().default("before_booking"),
  
  // Offset in hours from the booking date (negative = before, positive = after)
  // e.g. -168 = 7 days before, -48 = 2 days before, 1 = 1 hour after
  offsetHours: integer("offset_hours").notNull().default(-48),
  
  // Email content
  emailSubject: text("email_subject").notNull(),
  emailBodyHtml: text("email_body_html").notNull(),
  
  // Optional: link to a questionnaire slug to include
  questionnaireSlug: text("questionnaire_slug"),
  
  // Enable/disable
  enabled: boolean("enabled").default(true),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const emailAutomationLogs = pgTable("email_automation_logs", {
  id: serial("id").primaryKey(),
  automationId: integer("automation_id").notNull().references(() => emailAutomations.id, { onDelete: "cascade" }),
  bookingId: text("booking_id").notNull(),
  clientEmail: text("client_email").notNull(),
  clientName: text("client_name"),
  status: text("status").notNull().default("sent"), // sent, failed, skipped
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow(),
});

export const insertEmailAutomationSchema = createInsertSchema(emailAutomations, {
  name: z.string().min(1, "Name is required"),
  emailSubject: z.string().min(1, "Subject is required"),
  emailBodyHtml: z.string().min(1, "Email body is required"),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type EmailAutomation = typeof emailAutomations.$inferSelect;
export type InsertEmailAutomation = z.infer<typeof insertEmailAutomationSchema>;

// Spam Rules - user-defined rules for blocking senders, domains, and keywords
export const spamRules = pgTable("spam_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  ruleType: text("rule_type").notNull(), // "sender", "domain", "keyword"
  value: text("value").notNull(), // email address, domain, or keyword
  reason: text("reason"), // optional user note
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export type SpamRule = typeof spamRules.$inferSelect;
export type InsertSpamRule = Omit<SpamRule, 'id' | 'createdAt'>;
export type EmailAutomationLog = typeof emailAutomationLogs.$inferSelect;

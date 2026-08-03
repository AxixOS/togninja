"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.questionnaireResponses = exports.questionnaires = exports.schedulerBlockedTimes = exports.schedulerBookings = exports.schedulers = exports.onlineBookings = exports.bookingForms = exports.calendarSyncLogs = exports.calendarSyncSettings = exports.availabilityOverrides = exports.availabilityTemplates = exports.businessInsights = exports.weatherData = exports.sessionCommunications = exports.sessionTasks = exports.sessionEquipment = exports.photographySessions = exports.photoFolders = exports.digitalFiles = exports.insertGalleryActivityLogSchema = exports.insertGalleryEmailCaptureSchema = exports.insertGalleryAnalyticsSchema = exports.galleryActivityLog = exports.galleryEmailCaptures = exports.galleryAnalytics = exports.galleryImages = exports.galleries = exports.smsConfig = exports.googleCalendarConfig = exports.studioAppointments = exports.messageCampaigns = exports.crmMessages = exports.couponUsage = exports.voucherSales = exports.priceListItems = exports.discountCoupons = exports.voucherProducts = exports.manualPageContent = exports.studioAvailableSlots = exports.crmInvoicePayments = exports.crmInvoiceItems = exports.crmInvoices = exports.crmLeads = exports.crmClients = exports.leadSources = exports.blogPosts = exports.adminUsers = exports.templateDefinitions = exports.studioConfigs = exports.users = void 0;
exports.insertStorageUsageSchema = exports.insertStorageSubscriptionSchema = exports.galleryTransferLog = exports.archivedFiles = exports.archivedFolders = exports.storageUsage = exports.storageSubscriptions = exports.storageSubscriptionStatus = exports.storageSubscriptionTier = exports.insertPriceListItemSchema = exports.insertAgentAuditDiffSchema = exports.insertAgentAuditSchema = exports.insertAgentMessageSchema = exports.insertAgentSessionSchema = exports.insertAgentActionLogSchema = exports.insertAiPolicySchema = exports.insertStudioIntegrationSchema = exports.insertStudioSchema = exports.agentAuditDiff = exports.agentAudit = exports.agentMessage = exports.agentSession = exports.agentActionLog = exports.aiPolicies = exports.studioIntegrations = exports.studios = exports.insertAdminUserSchema = exports.insertOpenaiAssistantSchema = exports.insertKnowledgeBaseSchema = exports.openaiAssistants = exports.knowledgeBase = exports.insertCouponUsageSchema = exports.insertVoucherSaleSchema = exports.insertDiscountCouponSchema = exports.insertVoucherProductSchema = exports.insertSchedulerBlockedTimeSchema = exports.insertSchedulerBookingSchema = exports.insertSchedulerSchema = exports.insertSMSConfigSchema = exports.insertMessageCampaignSchema = exports.insertCrmMessageSchema = exports.insertCrmInvoiceItemSchema = exports.insertCrmInvoiceSchema = exports.insertGallerySchema = exports.insertLeadSourceSchema = exports.insertCrmLeadSchema = exports.insertCrmClientSchema = exports.insertBlogPostSchema = exports.insertUserSchema = exports.insertPhotographySessionSchema = void 0;
exports.gallery_images = exports.photography_sessions = exports.emailLinks = exports.emailEvents = exports.insertEmailSegmentSchema = exports.emailSegments = exports.insertEmailSubscriberSchema = exports.emailSubscribers = exports.insertEmailTemplateSchema = exports.emailTemplates = exports.insertEmailCampaignSchema = exports.emailCampaigns = exports.insertGalleryTransferLogSchema = exports.insertArchivedFolderSchema = exports.insertArchivedFileSchema = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_zod_1 = require("drizzle-zod");
const zod_1 = require("zod");
// Legacy Users table (for existing CRM clients)
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    email: (0, pg_core_1.text)("email").unique().notNull(),
    password: (0, pg_core_1.text)("password"),
    firstName: (0, pg_core_1.text)("first_name"),
    lastName: (0, pg_core_1.text)("last_name"),
    avatar: (0, pg_core_1.text)("avatar"),
    isAdmin: (0, pg_core_1.boolean)("is_admin").default(false),
    studioId: (0, pg_core_1.uuid)("studio_id"), // Links user to their studio
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
// Studio Configuration table (multi-tenant support)
exports.studioConfigs = (0, pg_core_1.pgTable)("studio_configs", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    studioName: (0, pg_core_1.text)("studio_name").notNull(),
    ownerEmail: (0, pg_core_1.text)("owner_email").notNull(),
    domain: (0, pg_core_1.text)("domain"), // custom domain if any
    subdomain: (0, pg_core_1.text)("subdomain").unique(), // photographer1.yoursaas.com
    activeTemplate: (0, pg_core_1.text)("active_template").default("template-01-modern-minimal"),
    // Branding
    logoUrl: (0, pg_core_1.text)("logo_url"),
    primaryColor: (0, pg_core_1.text)("primary_color").default("#7C3AED"),
    secondaryColor: (0, pg_core_1.text)("secondary_color").default("#F59E0B"),
    fontFamily: (0, pg_core_1.text)("font_family").default("Inter"),
    // Business Info
    businessName: (0, pg_core_1.text)("business_name"),
    address: (0, pg_core_1.text)("address"),
    city: (0, pg_core_1.text)("city"),
    state: (0, pg_core_1.text)("state"),
    zip: (0, pg_core_1.text)("zip"),
    country: (0, pg_core_1.text)("country").default("Austria"),
    phone: (0, pg_core_1.text)("phone"),
    email: (0, pg_core_1.text)("email"),
    website: (0, pg_core_1.text)("website"),
    // Location Coordinates (for Golden Hour, Weather, etc.)
    latitude: (0, pg_core_1.decimal)("latitude", { precision: 10, scale: 7 }), // e.g., 48.2082000 (Vienna)
    longitude: (0, pg_core_1.decimal)("longitude", { precision: 10, scale: 7 }), // e.g., 16.3738000 (Vienna)
    timezone: (0, pg_core_1.text)("timezone").default("Europe/Vienna"),
    // Social Media
    facebookUrl: (0, pg_core_1.text)("facebook_url"),
    instagramUrl: (0, pg_core_1.text)("instagram_url"),
    twitterUrl: (0, pg_core_1.text)("twitter_url"),
    // Operating Hours
    openingHours: (0, pg_core_1.jsonb)("opening_hours"),
    // Features
    enabledFeatures: (0, pg_core_1.text)("enabled_features").array(),
    // SEO
    metaTitle: (0, pg_core_1.text)("meta_title"),
    metaDescription: (0, pg_core_1.text)("meta_description"),
    // Status
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    subscriptionStatus: (0, pg_core_1.text)("subscription_status").default("trial"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
// Template Definitions table
exports.templateDefinitions = (0, pg_core_1.pgTable)("template_definitions", {
    id: (0, pg_core_1.text)("id").primaryKey(), // template-01-modern-minimal
    name: (0, pg_core_1.text)("name").notNull(), // "Modern Minimal"
    description: (0, pg_core_1.text)("description"),
    category: (0, pg_core_1.text)("category"), // "minimal", "artistic", "classic", etc.
    previewImage: (0, pg_core_1.text)("preview_image"),
    demoUrl: (0, pg_core_1.text)("demo_url"),
    features: (0, pg_core_1.text)("features").array(),
    colorScheme: (0, pg_core_1.jsonb)("color_scheme"),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    isPremium: (0, pg_core_1.boolean)("is_premium").default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
// Admin Users table (authentication for backend access)  
exports.adminUsers = (0, pg_core_1.pgTable)("admin_users", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    email: (0, pg_core_1.text)("email").unique().notNull(),
    passwordHash: (0, pg_core_1.text)("password_hash").notNull(),
    firstName: (0, pg_core_1.text)("first_name"),
    lastName: (0, pg_core_1.text)("last_name"),
    role: (0, pg_core_1.text)("role").default("admin"), // admin, user
    status: (0, pg_core_1.text)("status").default("active"), // active, inactive
    lastLoginAt: (0, pg_core_1.timestamp)("last_login_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
// Blog Posts
exports.blogPosts = (0, pg_core_1.pgTable)("blog_posts", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    title: (0, pg_core_1.text)("title").notNull(),
    slug: (0, pg_core_1.text)("slug").unique().notNull(),
    content: (0, pg_core_1.text)("content"),
    contentHtml: (0, pg_core_1.text)("content_html"),
    excerpt: (0, pg_core_1.text)("excerpt"),
    imageUrl: (0, pg_core_1.text)("image_url"),
    imageUrl2: (0, pg_core_1.text)("image_url_2"),
    imageUrl3: (0, pg_core_1.text)("image_url_3"),
    published: (0, pg_core_1.boolean)("published").default(false),
    publishedAt: (0, pg_core_1.timestamp)("published_at"),
    scheduledFor: (0, pg_core_1.timestamp)("scheduled_for"),
    status: (0, pg_core_1.text)("status").default("DRAFT"), // DRAFT, PUBLISHED, SCHEDULED
    authorId: (0, pg_core_1.uuid)("author_id").references(() => exports.users.id),
    tags: (0, pg_core_1.text)("tags").array(),
    metaDescription: (0, pg_core_1.text)("meta_description"),
    seoTitle: (0, pg_core_1.text)("seo_title"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
// Lead Sources
exports.leadSources = (0, pg_core_1.pgTable)("lead_sources", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    name: (0, pg_core_1.text)("name").notNull().unique(),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    sortOrder: (0, pg_core_1.integer)("sort_order").default(0),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
// CRM Clients
exports.crmClients = (0, pg_core_1.pgTable)("crm_clients", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    firstName: (0, pg_core_1.text)("first_name").notNull(),
    lastName: (0, pg_core_1.text)("last_name").notNull(),
    clientId: (0, pg_core_1.text)("client_id").unique(),
    email: (0, pg_core_1.text)("email").notNull(),
    phone: (0, pg_core_1.text)("phone"),
    address: (0, pg_core_1.text)("address"),
    city: (0, pg_core_1.text)("city"),
    state: (0, pg_core_1.text)("state"),
    zip: (0, pg_core_1.text)("zip"),
    country: (0, pg_core_1.text)("country"),
    company: (0, pg_core_1.text)("company"),
    leadSource: (0, pg_core_1.text)("lead_source"),
    notes: (0, pg_core_1.text)("notes"),
    status: (0, pg_core_1.text)("status").default("active"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
// CRM Leads
exports.crmLeads = (0, pg_core_1.pgTable)("crm_leads", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    name: (0, pg_core_1.text)("name").notNull(),
    email: (0, pg_core_1.text)("email").notNull(),
    phone: (0, pg_core_1.text)("phone"),
    company: (0, pg_core_1.text)("company"),
    message: (0, pg_core_1.text)("message"),
    source: (0, pg_core_1.text)("source"),
    status: (0, pg_core_1.text)("status").default("new"),
    assigned_to: (0, pg_core_1.uuid)("assigned_to").references(() => exports.users.id),
    priority: (0, pg_core_1.text)("priority").default("medium"),
    tags: (0, pg_core_1.text)("tags").array(),
    follow_up_date: (0, pg_core_1.date)("follow_up_date"),
    value: (0, pg_core_1.decimal)("value", { precision: 10, scale: 2 }),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
// CRM Invoices
exports.crmInvoices = (0, pg_core_1.pgTable)("crm_invoices", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    invoiceNumber: (0, pg_core_1.text)("invoice_number").unique().notNull(),
    clientId: (0, pg_core_1.uuid)("client_id").references(() => exports.crmClients.id).notNull(),
    issueDate: (0, pg_core_1.date)("issue_date").notNull(),
    dueDate: (0, pg_core_1.date)("due_date").notNull(),
    subtotal: (0, pg_core_1.decimal)("subtotal", { precision: 10, scale: 2 }).notNull(),
    taxAmount: (0, pg_core_1.decimal)("tax_amount", { precision: 10, scale: 2 }).default("0"),
    discountType: (0, pg_core_1.text)("discount_type").default("fixed"), // "fixed" or "percentage"
    discountValue: (0, pg_core_1.decimal)("discount_value", { precision: 10, scale: 2 }).default("0"), // The input value (amount or percent)
    discountAmount: (0, pg_core_1.decimal)("discount_amount", { precision: 10, scale: 2 }).default("0"), // The calculated discount amount
    total: (0, pg_core_1.decimal)("total", { precision: 10, scale: 2 }).notNull(),
    currency: (0, pg_core_1.text)("currency").default("EUR"),
    status: (0, pg_core_1.text)("status").default("draft"),
    paymentTerms: (0, pg_core_1.text)("payment_terms").default("Net 30"),
    notes: (0, pg_core_1.text)("notes"),
    termsAndConditions: (0, pg_core_1.text)("terms_and_conditions"),
    footerText: (0, pg_core_1.text)("footer_text"),
    stripePaymentIntentId: (0, pg_core_1.text)("stripe_payment_intent_id"),
    stripePaymentUrl: (0, pg_core_1.text)("stripe_payment_url"),
    paidAmount: (0, pg_core_1.decimal)("paid_amount", { precision: 10, scale: 2 }).default("0"),
    createdBy: (0, pg_core_1.uuid)("created_by").references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
// CRM Invoice Items
exports.crmInvoiceItems = (0, pg_core_1.pgTable)("crm_invoice_items", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    invoiceId: (0, pg_core_1.uuid)("invoice_id").references(() => exports.crmInvoices.id, { onDelete: "cascade" }).notNull(),
    description: (0, pg_core_1.text)("description").notNull(),
    quantity: (0, pg_core_1.decimal)("quantity", { precision: 10, scale: 2 }).default("1"),
    unitPrice: (0, pg_core_1.decimal)("unit_price", { precision: 10, scale: 2 }).notNull(),
    taxRate: (0, pg_core_1.decimal)("tax_rate", { precision: 5, scale: 2 }).default("0"),
    sortOrder: (0, pg_core_1.integer)("sort_order").default(0),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
// CRM Invoice Payments
exports.crmInvoicePayments = (0, pg_core_1.pgTable)("crm_invoice_payments", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    invoiceId: (0, pg_core_1.uuid)("invoice_id").references(() => exports.crmInvoices.id, { onDelete: "cascade" }).notNull(),
    amount: (0, pg_core_1.decimal)("amount", { precision: 10, scale: 2 }).notNull(),
    paymentMethod: (0, pg_core_1.text)("payment_method").default("bank_transfer"),
    paymentReference: (0, pg_core_1.text)("payment_reference"),
    paymentDate: (0, pg_core_1.date)("payment_date").notNull(),
    notes: (0, pg_core_1.text)("notes"),
    createdBy: (0, pg_core_1.uuid)("created_by").references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
// Admin-defined available slots (for embed booking widget)
exports.studioAvailableSlots = (0, pg_core_1.pgTable)("studio_available_slots", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    studioId: (0, pg_core_1.uuid)("studio_id").references(() => exports.studioConfigs.id).notNull(),
    startTime: (0, pg_core_1.timestamp)("start_time").notNull(),
    durationMinutes: (0, pg_core_1.integer)("duration_minutes").default(120),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
exports.manualPageContent = (0, pg_core_1.pgTable)("manual_page_content", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    studioId: (0, pg_core_1.uuid)("studio_id").references(() => exports.studioConfigs.id, { onDelete: "cascade" }).notNull(),
    pageId: (0, pg_core_1.text)("page_id").notNull(),
    language: (0, pg_core_1.text)("language").notNull().default("de"),
    draftContent: (0, pg_core_1.jsonb)("draft_content").$type().default({}),
    publishedContent: (0, pg_core_1.jsonb)("published_content").$type().default({}),
    status: (0, pg_core_1.text)("status").default("draft"),
    publishedAt: (0, pg_core_1.timestamp)("published_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => ({
    pageLanguageStudioUnique: (0, pg_core_1.uniqueIndex)("manual_page_content_unique").on(table.studioId, table.pageId, table.language)
}));
// Voucher Products (what customers can buy)
exports.voucherProducts = (0, pg_core_1.pgTable)("voucher_products", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    name: (0, pg_core_1.text)("name").notNull(), // "Familie Fotoshooting", "Neugeborenen Fotoshooting"
    description: (0, pg_core_1.text)("description"),
    price: (0, pg_core_1.decimal)("price", { precision: 10, scale: 2 }).notNull(),
    originalPrice: (0, pg_core_1.decimal)("original_price", { precision: 10, scale: 2 }), // for showing discounts
    category: (0, pg_core_1.text)("category"), // "familie", "baby", "hochzeit", "business", "event"
    sessionDuration: (0, pg_core_1.integer)("session_duration").default(60), // minutes
    sessionType: (0, pg_core_1.text)("session_type"), // links to photography session types
    // Voucher details
    validityPeriod: (0, pg_core_1.integer)("validity_period").default(1460), // 48 months in days
    redemptionInstructions: (0, pg_core_1.text)("redemption_instructions"),
    termsAndConditions: (0, pg_core_1.text)("terms_and_conditions"),
    // Display settings
    imageUrl: (0, pg_core_1.text)("image_url"), // Main hero image
    thumbnailUrl: (0, pg_core_1.text)("thumbnail_url"), // Small thumbnail for cards/listings
    promoImageUrl: (0, pg_core_1.text)("promo_image_url"), // Promotional graphic for upsell/conversion
    detailedDescription: (0, pg_core_1.text)("detailed_description"), // Extensive product description
    displayOrder: (0, pg_core_1.integer)("display_order").default(0),
    featured: (0, pg_core_1.boolean)("featured").default(false),
    badge: (0, pg_core_1.text)("badge"), // "30% OFF", "BESTSELLER", etc.
    // Availability
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    stockLimit: (0, pg_core_1.integer)("stock_limit"), // null = unlimited
    maxPerCustomer: (0, pg_core_1.integer)("max_per_customer").default(5),
    // SEO
    slug: (0, pg_core_1.text)("slug").unique(),
    metaTitle: (0, pg_core_1.text)("meta_title"),
    metaDescription: (0, pg_core_1.text)("meta_description"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
// Discount Coupons
exports.discountCoupons = (0, pg_core_1.pgTable)("discount_coupons", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    code: (0, pg_core_1.text)("code").unique().notNull(), // "WELCOME10", "SUMMER2024"
    name: (0, pg_core_1.text)("name").notNull(), // "Welcome Discount", "Summer Sale"
    description: (0, pg_core_1.text)("description"),
    // Discount settings
    discountType: (0, pg_core_1.text)("discount_type").notNull(), // "percentage", "fixed_amount"
    discountValue: (0, pg_core_1.decimal)("discount_value", { precision: 10, scale: 2 }).notNull(),
    minOrderAmount: (0, pg_core_1.decimal)("min_order_amount", { precision: 10, scale: 2 }),
    maxDiscountAmount: (0, pg_core_1.decimal)("max_discount_amount", { precision: 10, scale: 2 }),
    // Usage limits
    usageLimit: (0, pg_core_1.integer)("usage_limit"), // null = unlimited
    usageCount: (0, pg_core_1.integer)("usage_count").default(0),
    usageLimitPerCustomer: (0, pg_core_1.integer)("usage_limit_per_customer").default(1),
    // Validity
    startDate: (0, pg_core_1.timestamp)("start_date"),
    endDate: (0, pg_core_1.timestamp)("end_date"),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    // Restrictions
    applicableProducts: (0, pg_core_1.text)("applicable_products").array(), // product IDs or "all"
    excludedProducts: (0, pg_core_1.text)("excluded_products").array(),
    firstTimeCustomersOnly: (0, pg_core_1.boolean)("first_time_customers_only").default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
// Price List Items (for invoice creation)
exports.priceListItems = (0, pg_core_1.pgTable)("price_list_items", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    studioId: (0, pg_core_1.uuid)("studio_id").references(() => exports.studioConfigs.id, { onDelete: "cascade" }),
    // Item details
    name: (0, pg_core_1.text)("name").notNull(),
    description: (0, pg_core_1.text)("description"),
    category: (0, pg_core_1.text)("category").notNull(), // "PRINTS", "LEINWAND", "DIGITAL", etc.
    // Pricing
    price: (0, pg_core_1.decimal)("price", { precision: 10, scale: 2 }).notNull(),
    currency: (0, pg_core_1.text)("currency").default("EUR"),
    taxRate: (0, pg_core_1.decimal)("tax_rate", { precision: 5, scale: 2 }).default("19.00"), // percentage
    // SKU and codes
    sku: (0, pg_core_1.text)("sku"),
    productCode: (0, pg_core_1.text)("product_code"),
    // Additional details
    unit: (0, pg_core_1.text)("unit"), // "piece", "hour", "session", etc.
    notes: (0, pg_core_1.text)("notes"),
    // Status
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
// Voucher Sales (purchases)
exports.voucherSales = (0, pg_core_1.pgTable)("voucher_sales", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    productId: (0, pg_core_1.uuid)("product_id").references(() => exports.voucherProducts.id),
    // Customer info
    purchaserName: (0, pg_core_1.text)("purchaser_name").notNull(),
    purchaserEmail: (0, pg_core_1.text)("purchaser_email").notNull(),
    purchaserPhone: (0, pg_core_1.text)("purchaser_phone"),
    // Gift recipient (if different)
    recipientName: (0, pg_core_1.text)("recipient_name"),
    recipientEmail: (0, pg_core_1.text)("recipient_email"),
    giftMessage: (0, pg_core_1.text)("gift_message"),
    // Personalization - customer selected/uploaded images
    customImage: (0, pg_core_1.text)("custom_image"), // Customer uploaded image URL
    designImage: (0, pg_core_1.text)("design_image"), // Selected from library template image URL
    personalizationData: (0, pg_core_1.jsonb)("personalization_data"), // Additional customization options
    // Voucher details
    voucherCode: (0, pg_core_1.text)("voucher_code").unique().notNull(),
    originalAmount: (0, pg_core_1.decimal)("original_amount", { precision: 10, scale: 2 }).notNull(),
    discountAmount: (0, pg_core_1.decimal)("discount_amount", { precision: 10, scale: 2 }).default('0'),
    finalAmount: (0, pg_core_1.decimal)("final_amount", { precision: 10, scale: 2 }).notNull(),
    currency: (0, pg_core_1.text)("currency").default("EUR"),
    // Coupon applied
    couponId: (0, pg_core_1.uuid)("coupon_id").references(() => exports.discountCoupons.id),
    couponCode: (0, pg_core_1.text)("coupon_code"),
    // Payment
    paymentIntentId: (0, pg_core_1.text)("payment_intent_id"),
    paymentStatus: (0, pg_core_1.text)("payment_status").default("pending"), // "pending", "paid", "failed", "refunded"
    paymentMethod: (0, pg_core_1.text)("payment_method"), // "stripe", "paypal", etc.
    // Fulfillment
    isRedeemed: (0, pg_core_1.boolean)("is_redeemed").default(false),
    redeemedAt: (0, pg_core_1.timestamp)("redeemed_at"),
    redeemedBy: (0, pg_core_1.uuid)("redeemed_by").references(() => exports.crmClients.id),
    sessionId: (0, pg_core_1.uuid)("session_id"), // links to photography session when redeemed
    // Validity
    validFrom: (0, pg_core_1.timestamp)("valid_from").defaultNow(),
    validUntil: (0, pg_core_1.timestamp)("valid_until"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
// Coupon usage tracking
exports.couponUsage = (0, pg_core_1.pgTable)("coupon_usage", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    couponId: (0, pg_core_1.uuid)("coupon_id").references(() => exports.discountCoupons.id),
    customerEmail: (0, pg_core_1.text)("customer_email").notNull(),
    orderAmount: (0, pg_core_1.decimal)("order_amount", { precision: 10, scale: 2 }).notNull(),
    discountAmount: (0, pg_core_1.decimal)("discount_amount", { precision: 10, scale: 2 }).notNull(),
    voucherSaleId: (0, pg_core_1.uuid)("voucher_sale_id").references(() => exports.voucherSales.id),
    usedAt: (0, pg_core_1.timestamp)("used_at").defaultNow(),
});
// CRM Messages (Enhanced with Email/SMS tracking)
exports.crmMessages = (0, pg_core_1.pgTable)("crm_messages", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    senderName: (0, pg_core_1.text)("sender_name").notNull(),
    senderEmail: (0, pg_core_1.text)("sender_email").notNull(),
    recipientEmail: (0, pg_core_1.text)("recipient_email"), // for outbound emails - who we sent to
    subject: (0, pg_core_1.text)("subject").notNull(),
    content: (0, pg_core_1.text)("content").notNull(),
    messageType: (0, pg_core_1.text)("message_type").notNull().default("email"), // "email", "sms", "note"
    status: (0, pg_core_1.text)("status").default("unread"), // "unread", "read", "replied", "sent", "delivered", "failed"
    direction: (0, pg_core_1.text)("direction").default("inbound"), // "inbound", "outbound"
    clientId: (0, pg_core_1.uuid)("client_id").references(() => exports.crmClients.id),
    assignedTo: (0, pg_core_1.uuid)("assigned_to").references(() => exports.users.id),
    // Email specific fields
    emailMessageId: (0, pg_core_1.text)("email_message_id"), // for tracking email threads
    emailHeaders: (0, pg_core_1.jsonb)("email_headers"),
    attachments: (0, pg_core_1.jsonb)("attachments"), // array of attachment info
    // SMS specific fields
    smsMessageId: (0, pg_core_1.text)("sms_message_id"),
    phoneNumber: (0, pg_core_1.text)("phone_number"),
    smsProvider: (0, pg_core_1.text)("sms_provider"), // "twilio", "vonage", etc.
    smsStatus: (0, pg_core_1.text)("sms_status"), // "queued", "sent", "delivered", "failed"
    // Bulk messaging
    campaignId: (0, pg_core_1.uuid)("campaign_id"), // links to bulk campaigns
    // Timestamps
    sentAt: (0, pg_core_1.timestamp)("sent_at"),
    deliveredAt: (0, pg_core_1.timestamp)("delivered_at"),
    readAt: (0, pg_core_1.timestamp)("read_at"),
    repliedAt: (0, pg_core_1.timestamp)("replied_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
// Bulk Message Campaigns
exports.messageCampaigns = (0, pg_core_1.pgTable)("message_campaigns", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    name: (0, pg_core_1.text)("name").notNull(),
    messageType: (0, pg_core_1.text)("message_type").notNull(), // "email", "sms"
    subject: (0, pg_core_1.text)("subject"), // for email campaigns
    content: (0, pg_core_1.text)("content").notNull(),
    // Targeting criteria
    targetType: (0, pg_core_1.text)("target_type").notNull(), // "all", "leads", "clients", "custom", "segment"
    targetCriteria: (0, pg_core_1.jsonb)("target_criteria"), // filters like status, spend amount, etc.
    targetClientIds: (0, pg_core_1.text)("target_client_ids").array(), // for custom targeting
    // Campaign settings
    scheduledAt: (0, pg_core_1.timestamp)("scheduled_at"),
    status: (0, pg_core_1.text)("status").default("draft"), // "draft", "scheduled", "sending", "sent", "completed", "failed"
    // Results
    totalRecipients: (0, pg_core_1.integer)("total_recipients").default(0),
    sentCount: (0, pg_core_1.integer)("sent_count").default(0),
    deliveredCount: (0, pg_core_1.integer)("delivered_count").default(0),
    failedCount: (0, pg_core_1.integer)("failed_count").default(0),
    // Metadata
    createdBy: (0, pg_core_1.uuid)("created_by").references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
// Studio Calendar & Appointments
exports.studioAppointments = (0, pg_core_1.pgTable)("studio_appointments", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    clientId: (0, pg_core_1.uuid)("client_id").references(() => exports.crmClients.id).notNull(),
    title: (0, pg_core_1.text)("title").notNull(),
    description: (0, pg_core_1.text)("description"),
    appointmentType: (0, pg_core_1.text)("appointment_type").notNull(), // "consultation", "photoshoot", "delivery", "meeting"
    status: (0, pg_core_1.text)("status").notNull().default("scheduled"), // "scheduled", "confirmed", "completed", "cancelled", "no_show"
    startDateTime: (0, pg_core_1.timestamp)("start_date_time").notNull(),
    endDateTime: (0, pg_core_1.timestamp)("end_date_time").notNull(),
    location: (0, pg_core_1.text)("location").default("Studio"),
    googleCalendarEventId: (0, pg_core_1.text)("google_calendar_event_id"), // For Google Calendar sync
    notes: (0, pg_core_1.text)("notes"),
    reminderSent: (0, pg_core_1.boolean)("reminder_sent").default(false),
    reminderDateTime: (0, pg_core_1.timestamp)("reminder_date_time"),
    createdBy: (0, pg_core_1.text)("created_by").notNull().default("system"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
// Google Calendar Integration Settings
exports.googleCalendarConfig = (0, pg_core_1.pgTable)("google_calendar_config", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    calendarId: (0, pg_core_1.text)("calendar_id").notNull(), // Google Calendar ID
    accessToken: (0, pg_core_1.text)("access_token"),
    refreshToken: (0, pg_core_1.text)("refresh_token"),
    clientId: (0, pg_core_1.text)("client_id"),
    clientSecret: (0, pg_core_1.text)("client_secret"),
    isActive: (0, pg_core_1.boolean)("is_active").default(false),
    lastSyncAt: (0, pg_core_1.timestamp)("last_sync_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
// SMS Configuration
exports.smsConfig = (0, pg_core_1.pgTable)("sms_config", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    provider: (0, pg_core_1.text)("provider").notNull().default("twilio"), // "twilio", "vonage", "messagebird"
    accountSid: (0, pg_core_1.text)("account_sid"),
    authToken: (0, pg_core_1.text)("auth_token"),
    fromNumber: (0, pg_core_1.text)("from_number"),
    webhookUrl: (0, pg_core_1.text)("webhook_url"),
    apiKey: (0, pg_core_1.text)("api_key"), // For Vonage
    apiSecret: (0, pg_core_1.text)("api_secret"), // For Vonage
    isActive: (0, pg_core_1.boolean)("is_active").default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
// Gallery Systems
exports.galleries = (0, pg_core_1.pgTable)("galleries", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    title: (0, pg_core_1.text)("title").notNull(),
    slug: (0, pg_core_1.text)("slug").unique().notNull(),
    description: (0, pg_core_1.text)("description"),
    coverImage: (0, pg_core_1.text)("cover_image"),
    coverPosition: (0, pg_core_1.jsonb)("cover_position").$type().default({ x: 50, y: 50 }),
    coverScale: (0, pg_core_1.integer)("cover_scale").default(100),
    coverTemplate: (0, pg_core_1.jsonb)("cover_template").$type().default({
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
    isPublic: (0, pg_core_1.boolean)("is_public").default(true),
    isPasswordProtected: (0, pg_core_1.boolean)("is_password_protected").default(false),
    password: (0, pg_core_1.text)("password"),
    clientId: (0, pg_core_1.uuid)("client_id").references(() => exports.crmClients.id),
    createdBy: (0, pg_core_1.uuid)("created_by").references(() => exports.users.id),
    sortOrder: (0, pg_core_1.integer)("sort_order").default(0),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
exports.galleryImages = (0, pg_core_1.pgTable)("gallery_images", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    galleryId: (0, pg_core_1.uuid)("gallery_id").references(() => exports.galleries.id, { onDelete: "cascade" }).notNull(),
    filename: (0, pg_core_1.text)("filename").notNull(),
    url: (0, pg_core_1.text)("url").notNull(),
    title: (0, pg_core_1.text)("title"),
    description: (0, pg_core_1.text)("description"),
    sortOrder: (0, pg_core_1.integer)("sort_order").default(0),
    sizeBytes: (0, pg_core_1.integer)("size_bytes").default(0),
    contentType: (0, pg_core_1.text)("content_type"),
    metadata: (0, pg_core_1.jsonb)("metadata"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
// Gallery Analytics and Email Captures
exports.galleryAnalytics = (0, pg_core_1.pgTable)("gallery_analytics", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    galleryId: (0, pg_core_1.uuid)("gallery_id").references(() => exports.galleries.id, { onDelete: "cascade" }).notNull().unique(),
    viewCount: (0, pg_core_1.integer)("view_count").default(0).notNull(),
    downloadCount: (0, pg_core_1.integer)("download_count").default(0).notNull(),
    emailCaptureCount: (0, pg_core_1.integer)("email_capture_count").default(0).notNull(),
    lastViewedAt: (0, pg_core_1.timestamp)("last_viewed_at"),
    lastDownloadedAt: (0, pg_core_1.timestamp)("last_downloaded_at"),
    lastEmailCapturedAt: (0, pg_core_1.timestamp)("last_email_captured_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
exports.galleryEmailCaptures = (0, pg_core_1.pgTable)("gallery_email_captures", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    galleryId: (0, pg_core_1.uuid)("gallery_id").references(() => exports.galleries.id, { onDelete: "cascade" }).notNull(),
    email: (0, pg_core_1.text)("email").notNull(),
    name: (0, pg_core_1.text)("name"),
    phone: (0, pg_core_1.text)("phone"),
    source: (0, pg_core_1.text)("source").default("gallery_view"), // gallery_view, download, share
    metadata: (0, pg_core_1.jsonb)("metadata"), // IP address, user agent, etc.
    capturedAt: (0, pg_core_1.timestamp)("captured_at").defaultNow(),
});
exports.galleryActivityLog = (0, pg_core_1.pgTable)("gallery_activity_log", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    galleryId: (0, pg_core_1.uuid)("gallery_id").references(() => exports.galleries.id, { onDelete: "cascade" }).notNull(),
    activityType: (0, pg_core_1.text)("activity_type").notNull(), // view, download, email_capture, share
    visitorEmail: (0, pg_core_1.text)("visitor_email"),
    visitorName: (0, pg_core_1.text)("visitor_name"),
    imageId: (0, pg_core_1.uuid)("image_id").references(() => exports.galleryImages.id, { onDelete: "set null" }),
    metadata: (0, pg_core_1.jsonb)("metadata"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.insertGalleryAnalyticsSchema = (0, drizzle_zod_1.createInsertSchema)(exports.galleryAnalytics).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
exports.insertGalleryEmailCaptureSchema = (0, drizzle_zod_1.createInsertSchema)(exports.galleryEmailCaptures).omit({
    id: true,
    capturedAt: true,
});
exports.insertGalleryActivityLogSchema = (0, drizzle_zod_1.createInsertSchema)(exports.galleryActivityLog).omit({
    id: true,
    createdAt: true,
});
// Digital Files storage (for uploaded assets/documents)
exports.digitalFiles = (0, pg_core_1.pgTable)("digital_files", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    folderName: (0, pg_core_1.text)("folder_name"),
    fileName: (0, pg_core_1.text)("file_name").notNull(),
    fileType: (0, pg_core_1.text)("file_type").notNull(),
    fileSize: (0, pg_core_1.integer)("file_size").default(0),
    clientId: (0, pg_core_1.text)("client_id"),
    sessionId: (0, pg_core_1.text)("session_id"),
    description: (0, pg_core_1.text)("description"),
    tags: (0, pg_core_1.text)("tags"), // stored as JSON string for now for backward-compat
    isPublic: (0, pg_core_1.boolean)("is_public").default(false),
    uploadedAt: (0, pg_core_1.timestamp)("uploaded_at", { withTimezone: true }).defaultNow(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow(),
});
// Photo Folders for organizing digital files
exports.photoFolders = (0, pg_core_1.pgTable)("photo_folders", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    name: (0, pg_core_1.text)("name").notNull().unique(),
    parentId: (0, pg_core_1.text)("parent_id"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow(),
});
// Photography Session Management System  
exports.photographySessions = (0, pg_core_1.pgTable)("photography_sessions", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    title: (0, pg_core_1.text)("title").notNull(),
    description: (0, pg_core_1.text)("description"),
    sessionType: (0, pg_core_1.text)("session_type").notNull(),
    status: (0, pg_core_1.text)("status").default("scheduled"),
    startTime: (0, pg_core_1.timestamp)("start_time", { withTimezone: true }).notNull(),
    endTime: (0, pg_core_1.timestamp)("end_time", { withTimezone: true }).notNull(),
    // Client Integration & Attendees
    clientId: (0, pg_core_1.text)("client_id"), // Link to CRM clients
    clientName: (0, pg_core_1.text)("client_name"),
    clientEmail: (0, pg_core_1.text)("client_email"),
    clientPhone: (0, pg_core_1.text)("client_phone"),
    attendees: (0, pg_core_1.jsonb)("attendees"), // Array of attendee objects with RSVP status
    // Location & Weather
    locationName: (0, pg_core_1.text)("location_name"),
    locationAddress: (0, pg_core_1.text)("location_address"),
    locationCoordinates: (0, pg_core_1.text)("location_coordinates"),
    weatherDependent: (0, pg_core_1.boolean)("weather_dependent").default(false),
    goldenHourOptimized: (0, pg_core_1.boolean)("golden_hour_optimized").default(false),
    backupPlan: (0, pg_core_1.text)("backup_plan"),
    // Pricing & Payment Status
    basePrice: (0, pg_core_1.decimal)("base_price", { precision: 10, scale: 2 }),
    depositAmount: (0, pg_core_1.decimal)("deposit_amount", { precision: 10, scale: 2 }),
    depositPaid: (0, pg_core_1.boolean)("deposit_paid").default(false),
    finalPayment: (0, pg_core_1.decimal)("final_payment", { precision: 10, scale: 2 }),
    finalPaymentPaid: (0, pg_core_1.boolean)("final_payment_paid").default(false),
    paymentStatus: (0, pg_core_1.text)("payment_status").default("unpaid"), // unpaid, deposit_paid, fully_paid, refunded
    // Equipment & Workflow
    equipmentList: (0, pg_core_1.text)("equipment_list").array(),
    crewMembers: (0, pg_core_1.text)("crew_members").array(),
    conflictDetected: (0, pg_core_1.boolean)("conflict_detected").default(false),
    notes: (0, pg_core_1.text)("notes"),
    portfolioWorthy: (0, pg_core_1.boolean)("portfolio_worthy").default(false),
    editingStatus: (0, pg_core_1.text)("editing_status").default("not_started"),
    deliveryStatus: (0, pg_core_1.text)("delivery_status").default("pending"),
    deliveryDate: (0, pg_core_1.timestamp)("delivery_date", { withTimezone: true }),
    // Recurring Events Support
    isRecurring: (0, pg_core_1.boolean)("is_recurring").default(false),
    recurrenceRule: (0, pg_core_1.text)("recurrence_rule"), // RRULE format for recurring events
    parentEventId: (0, pg_core_1.text)("parent_event_id"), // For recurring event instances
    // External Calendar Integration
    googleCalendarEventId: (0, pg_core_1.text)("google_calendar_event_id"),
    icalUid: (0, pg_core_1.text)("ical_uid"),
    externalCalendarSync: (0, pg_core_1.boolean)("external_calendar_sync").default(false),
    // Automated Reminders & Notifications
    reminderSettings: (0, pg_core_1.jsonb)("reminder_settings"), // Customizable reminder times
    reminderSent: (0, pg_core_1.boolean)("reminder_sent").default(false),
    confirmationSent: (0, pg_core_1.boolean)("confirmation_sent").default(false),
    followUpSent: (0, pg_core_1.boolean)("follow_up_sent").default(false),
    // Booking & Availability
    isOnlineBookable: (0, pg_core_1.boolean)("is_online_bookable").default(false),
    bookingRequirements: (0, pg_core_1.jsonb)("booking_requirements"), // Custom fields for booking
    availabilityStatus: (0, pg_core_1.text)("availability_status").default("available"), // available, blocked, tentative
    // Enhanced Display & Organization
    color: (0, pg_core_1.text)("color"), // Custom color for calendar display
    priority: (0, pg_core_1.text)("priority").default("medium"), // low, medium, high, urgent
    isPublic: (0, pg_core_1.boolean)("is_public").default(false), // For client-facing calendar
    category: (0, pg_core_1.text)("category"), // Additional categorization beyond session type
    // Metadata
    galleryId: (0, pg_core_1.text)("gallery_id"),
    photographerId: (0, pg_core_1.text)("photographer_id"),
    tags: (0, pg_core_1.text)("tags").array(),
    customFields: (0, pg_core_1.jsonb)("custom_fields"), // Flexible custom data storage
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow(),
});
exports.sessionEquipment = (0, pg_core_1.pgTable)("session_equipment", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    sessionId: (0, pg_core_1.text)("session_id").notNull(),
    equipmentName: (0, pg_core_1.text)("equipment_name").notNull(),
    equipmentType: (0, pg_core_1.text)("equipment_type"),
    rentalRequired: (0, pg_core_1.boolean)("rental_required").default(false),
    rentalCost: (0, pg_core_1.decimal)("rental_cost", { precision: 10, scale: 2 }),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow(),
});
exports.sessionTasks = (0, pg_core_1.pgTable)("session_tasks", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    sessionId: (0, pg_core_1.text)("session_id").notNull(),
    taskType: (0, pg_core_1.text)("task_type").notNull(),
    title: (0, pg_core_1.text)("title").notNull(),
    description: (0, pg_core_1.text)("description"),
    assignedTo: (0, pg_core_1.text)("assigned_to"),
    status: (0, pg_core_1.text)("status").default("pending"),
    dueDate: (0, pg_core_1.timestamp)("due_date", { withTimezone: true }),
    completedAt: (0, pg_core_1.timestamp)("completed_at", { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow(),
});
exports.sessionCommunications = (0, pg_core_1.pgTable)("session_communications", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    sessionId: (0, pg_core_1.text)("session_id").notNull(),
    communicationType: (0, pg_core_1.text)("communication_type").notNull(),
    subject: (0, pg_core_1.text)("subject"),
    content: (0, pg_core_1.text)("content"),
    sentTo: (0, pg_core_1.text)("sent_to"),
    sentAt: (0, pg_core_1.timestamp)("sent_at", { withTimezone: true }).defaultNow(),
    responseReceived: (0, pg_core_1.boolean)("response_received").default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow(),
});
exports.weatherData = (0, pg_core_1.pgTable)("weather_data", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    sessionId: (0, pg_core_1.text)("session_id").notNull(),
    forecastDate: (0, pg_core_1.timestamp)("forecast_date", { withTimezone: true }).notNull(),
    temperature: (0, pg_core_1.decimal)("temperature", { precision: 5, scale: 2 }),
    condition: (0, pg_core_1.text)("condition"),
    precipitationChance: (0, pg_core_1.integer)("precipitation_chance"),
    windSpeed: (0, pg_core_1.decimal)("wind_speed", { precision: 5, scale: 2 }),
    goldenHourStart: (0, pg_core_1.timestamp)("golden_hour_start", { withTimezone: true }),
    goldenHourEnd: (0, pg_core_1.timestamp)("golden_hour_end", { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow(),
});
exports.businessInsights = (0, pg_core_1.pgTable)("business_insights", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    insightType: (0, pg_core_1.text)("insight_type").notNull(),
    title: (0, pg_core_1.text)("title").notNull(),
    description: (0, pg_core_1.text)("description"),
    dataPoint: (0, pg_core_1.decimal)("data_point", { precision: 15, scale: 2 }),
    dataUnit: (0, pg_core_1.text)("data_unit"),
    periodStart: (0, pg_core_1.timestamp)("period_start", { withTimezone: true }),
    periodEnd: (0, pg_core_1.timestamp)("period_end", { withTimezone: true }),
    category: (0, pg_core_1.text)("category"),
    priority: (0, pg_core_1.text)("priority").default("medium"),
    actionable: (0, pg_core_1.boolean)("actionable").default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow(),
});
// Advanced Calendar Features - Availability Management
exports.availabilityTemplates = (0, pg_core_1.pgTable)("availability_templates", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    name: (0, pg_core_1.text)("name").notNull(),
    description: (0, pg_core_1.text)("description"),
    photographerId: (0, pg_core_1.text)("photographer_id").notNull(),
    businessHours: (0, pg_core_1.jsonb)("business_hours"),
    breakTime: (0, pg_core_1.jsonb)("break_time"),
    bufferTime: (0, pg_core_1.integer)("buffer_time").default(30),
    maxSessionsPerDay: (0, pg_core_1.integer)("max_sessions_per_day").default(3),
    isDefault: (0, pg_core_1.boolean)("is_default").default(false),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow(),
});
exports.availabilityOverrides = (0, pg_core_1.pgTable)("availability_overrides", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    photographerId: (0, pg_core_1.text)("photographer_id").notNull(),
    date: (0, pg_core_1.timestamp)("date", { withTimezone: true }).notNull(),
    overrideType: (0, pg_core_1.text)("override_type").notNull(),
    title: (0, pg_core_1.text)("title"),
    description: (0, pg_core_1.text)("description"),
    customHours: (0, pg_core_1.jsonb)("custom_hours"),
    isRecurring: (0, pg_core_1.boolean)("is_recurring").default(false),
    recurrenceRule: (0, pg_core_1.text)("recurrence_rule"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow(),
});
// External Calendar Integration
exports.calendarSyncSettings = (0, pg_core_1.pgTable)("calendar_sync_settings", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    userId: (0, pg_core_1.text)("user_id").notNull(),
    provider: (0, pg_core_1.text)("provider").notNull(),
    accessToken: (0, pg_core_1.text)("access_token"),
    refreshToken: (0, pg_core_1.text)("refresh_token"),
    calendarId: (0, pg_core_1.text)("calendar_id"),
    syncEnabled: (0, pg_core_1.boolean)("sync_enabled").default(true),
    syncDirection: (0, pg_core_1.text)("sync_direction").default("bidirectional"),
    lastSyncAt: (0, pg_core_1.timestamp)("last_sync_at", { withTimezone: true }),
    syncStatus: (0, pg_core_1.text)("sync_status").default("active"),
    syncErrors: (0, pg_core_1.jsonb)("sync_errors"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow(),
});
exports.calendarSyncLogs = (0, pg_core_1.pgTable)("calendar_sync_logs", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    syncSettingId: (0, pg_core_1.text)("sync_setting_id").notNull(),
    syncType: (0, pg_core_1.text)("sync_type").notNull(),
    status: (0, pg_core_1.text)("status").notNull(),
    eventsProcessed: (0, pg_core_1.integer)("events_processed").default(0),
    eventsCreated: (0, pg_core_1.integer)("events_created").default(0),
    eventsUpdated: (0, pg_core_1.integer)("events_updated").default(0),
    eventsDeleted: (0, pg_core_1.integer)("events_deleted").default(0),
    errors: (0, pg_core_1.jsonb)("errors"),
    duration: (0, pg_core_1.integer)("duration"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow(),
});
// Online Booking System
exports.bookingForms = (0, pg_core_1.pgTable)("booking_forms", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    name: (0, pg_core_1.text)("name").notNull(),
    description: (0, pg_core_1.text)("description"),
    sessionTypes: (0, pg_core_1.text)("session_types").array(),
    fields: (0, pg_core_1.jsonb)("fields"),
    requirements: (0, pg_core_1.jsonb)("requirements"),
    pricing: (0, pg_core_1.jsonb)("pricing"),
    availability: (0, pg_core_1.jsonb)("availability"),
    confirmationMessage: (0, pg_core_1.text)("confirmation_message"),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow(),
});
exports.onlineBookings = (0, pg_core_1.pgTable)("online_bookings", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    formId: (0, pg_core_1.text)("form_id").notNull(),
    sessionId: (0, pg_core_1.text)("session_id"),
    clientName: (0, pg_core_1.text)("client_name").notNull(),
    clientEmail: (0, pg_core_1.text)("client_email").notNull(),
    clientPhone: (0, pg_core_1.text)("client_phone"),
    formData: (0, pg_core_1.jsonb)("form_data"),
    requestedDate: (0, pg_core_1.timestamp)("requested_date", { withTimezone: true }),
    requestedTime: (0, pg_core_1.text)("requested_time"),
    sessionType: (0, pg_core_1.text)("session_type").notNull(),
    status: (0, pg_core_1.text)("status").default("pending"),
    notes: (0, pg_core_1.text)("notes"),
    adminNotes: (0, pg_core_1.text)("admin_notes"),
    processedAt: (0, pg_core_1.timestamp)("processed_at", { withTimezone: true }),
    processedBy: (0, pg_core_1.text)("processed_by"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow(),
});
// ==================== SCHEDULER SYSTEM ====================
// Client Self-Booking Schedulers (like Sprout Studio)
// Scheduler templates - defines booking types available to clients
exports.schedulers = (0, pg_core_1.pgTable)("schedulers", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    name: (0, pg_core_1.text)("name").notNull(), // e.g., "Shooting", "Consultation", "Mini Session"
    slug: (0, pg_core_1.text)("slug").notNull().unique(), // URL-friendly slug for public link
    description: (0, pg_core_1.text)("description"),
    // Session configuration
    sessionType: (0, pg_core_1.text)("session_type").notNull().default("portrait"), // portrait, wedding, event, etc.
    duration: (0, pg_core_1.integer)("duration").notNull().default(60), // Duration in minutes
    location: (0, pg_core_1.text)("location"), // Default location
    price: (0, pg_core_1.decimal)("price", { precision: 10, scale: 2 }).default("0"), // Price for this session type
    // Availability configuration
    availabilityType: (0, pg_core_1.text)("availability_type").default("ongoing"), // "ongoing", "date_range", "specific_dates"
    startDate: (0, pg_core_1.timestamp)("start_date", { withTimezone: true }), // For date_range
    endDate: (0, pg_core_1.timestamp)("end_date", { withTimezone: true }), // For date_range
    timezone: (0, pg_core_1.text)("timezone").default("Europe/Vienna"),
    // Weekly availability (JSON: { monday: [{start: "09:00", end: "17:00"}], ... })
    weeklyAvailability: (0, pg_core_1.jsonb)("weekly_availability"),
    // Specific available dates (for specific_dates type)
    specificDates: (0, pg_core_1.jsonb)("specific_dates"),
    // Booking rules
    bufferBefore: (0, pg_core_1.integer)("buffer_before").default(0), // Minutes buffer before appointment
    bufferAfter: (0, pg_core_1.integer)("buffer_after").default(0), // Minutes buffer after appointment
    minNotice: (0, pg_core_1.integer)("min_notice").default(24), // Minimum hours notice required
    maxAdvance: (0, pg_core_1.integer)("max_advance").default(90), // Maximum days in advance to book
    maxPerDay: (0, pg_core_1.integer)("max_per_day"), // Max appointments per day (null = unlimited)
    availabilityIncrements: (0, pg_core_1.integer)("availability_increments").default(60), // 15, 30, 60 mins
    // Communication settings
    confirmationMessage: (0, pg_core_1.text)("confirmation_message"),
    questionnaireId: (0, pg_core_1.integer)("questionnaire_id").references(() => exports.questionnaires.id),
    autoApprove: (0, pg_core_1.boolean)("auto_approve").default(true), // Auto-confirm or require manual approval
    sendReminders: (0, pg_core_1.boolean)("send_reminders").default(true),
    reminderHours: (0, pg_core_1.integer)("reminder_hours").default(24),
    // Branding
    brandName: (0, pg_core_1.text)("brand_name"),
    brandColor: (0, pg_core_1.text)("brand_color").default("#0d9488"), // Teal
    // Status
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdBy: (0, pg_core_1.text)("created_by"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow(),
});
// Scheduler bookings - when a client books through a scheduler
exports.schedulerBookings = (0, pg_core_1.pgTable)("scheduler_bookings", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    schedulerId: (0, pg_core_1.text)("scheduler_id").notNull().references(() => exports.schedulers.id),
    // Client info (may or may not link to existing CRM client)
    clientId: (0, pg_core_1.text)("client_id").references(() => exports.crmClients.id),
    clientName: (0, pg_core_1.text)("client_name").notNull(),
    clientEmail: (0, pg_core_1.text)("client_email").notNull(),
    clientPhone: (0, pg_core_1.text)("client_phone"),
    // Booking details
    scheduledDate: (0, pg_core_1.timestamp)("scheduled_date", { withTimezone: true }).notNull(),
    scheduledEndDate: (0, pg_core_1.timestamp)("scheduled_end_date", { withTimezone: true }).notNull(),
    timezone: (0, pg_core_1.text)("timezone").default("Europe/Vienna"),
    // Status: pending, confirmed, cancelled, completed, no_show
    status: (0, pg_core_1.text)("status").default("pending"),
    // Linked session (created when booking is confirmed)
    sessionId: (0, pg_core_1.text)("session_id"),
    // Client notes & questionnaire responses
    clientNotes: (0, pg_core_1.text)("client_notes"),
    questionnaireResponses: (0, pg_core_1.jsonb)("questionnaire_responses"),
    // Confirmation & reminders
    confirmationSent: (0, pg_core_1.boolean)("confirmation_sent").default(false),
    confirmationSentAt: (0, pg_core_1.timestamp)("confirmation_sent_at", { withTimezone: true }),
    reminderSent: (0, pg_core_1.boolean)("reminder_sent").default(false),
    reminderSentAt: (0, pg_core_1.timestamp)("reminder_sent_at", { withTimezone: true }),
    // Cancellation
    cancelledAt: (0, pg_core_1.timestamp)("cancelled_at", { withTimezone: true }),
    cancellationReason: (0, pg_core_1.text)("cancellation_reason"),
    // Metadata
    ipAddress: (0, pg_core_1.text)("ip_address"),
    userAgent: (0, pg_core_1.text)("user_agent"),
    source: (0, pg_core_1.text)("source").default("scheduler"), // scheduler, admin, import
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow(),
});
// Blocked times - times when scheduler is unavailable (holidays, personal time)
exports.schedulerBlockedTimes = (0, pg_core_1.pgTable)("scheduler_blocked_times", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    schedulerId: (0, pg_core_1.text)("scheduler_id").references(() => exports.schedulers.id), // null = applies to all
    title: (0, pg_core_1.text)("title"),
    startDate: (0, pg_core_1.timestamp)("start_date", { withTimezone: true }).notNull(),
    endDate: (0, pg_core_1.timestamp)("end_date", { withTimezone: true }).notNull(),
    isAllDay: (0, pg_core_1.boolean)("is_all_day").default(false),
    isRecurring: (0, pg_core_1.boolean)("is_recurring").default(false),
    recurrenceRule: (0, pg_core_1.text)("recurrence_rule"), // iCal RRULE format
    reason: (0, pg_core_1.text)("reason"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow(),
});
// Questionnaires table
exports.questionnaires = (0, pg_core_1.pgTable)("questionnaires", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    slug: (0, pg_core_1.text)("slug").unique().notNull(),
    title: (0, pg_core_1.text)("title").notNull(),
    description: (0, pg_core_1.text)("description").default(""),
    fields: (0, pg_core_1.jsonb)("fields").notNull(), // Array of field definitions
    notifyEmail: (0, pg_core_1.text)("notify_email"),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow(),
});
// Questionnaire responses table
exports.questionnaireResponses = (0, pg_core_1.pgTable)("questionnaire_responses", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    questionnaireId: (0, pg_core_1.integer)("questionnaire_id").notNull().references(() => exports.questionnaires.id),
    slug: (0, pg_core_1.text)("slug").notNull(), // The questionnaire slug
    responses: (0, pg_core_1.jsonb)("responses").notNull(), // The actual responses data
    submittedAt: (0, pg_core_1.timestamp)("submitted_at", { withTimezone: true }).defaultNow(),
});
// Insert schemas
exports.insertPhotographySessionSchema = zod_1.z.object({
    title: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    sessionType: zod_1.z.string(),
    status: zod_1.z.string().optional(),
    startTime: zod_1.z.date(),
    endTime: zod_1.z.date(),
    // Link to CRM client (optional)
    clientId: zod_1.z.string().optional(),
    clientName: zod_1.z.string().optional(),
    clientEmail: zod_1.z.string().optional(),
    clientPhone: zod_1.z.string().optional(),
    locationName: zod_1.z.string().optional(),
    locationAddress: zod_1.z.string().optional(),
    locationCoordinates: zod_1.z.string().optional(),
    basePrice: zod_1.z.number().optional(),
    depositAmount: zod_1.z.number().optional(),
    depositPaid: zod_1.z.boolean().optional(),
    finalPayment: zod_1.z.number().optional(),
    finalPaymentPaid: zod_1.z.boolean().optional(),
    equipmentList: zod_1.z.array(zod_1.z.string()).optional(),
    crewMembers: zod_1.z.array(zod_1.z.string()).optional(),
    weatherDependent: zod_1.z.boolean().optional(),
    goldenHourOptimized: zod_1.z.boolean().optional(),
    backupPlan: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
    portfolioWorthy: zod_1.z.boolean().optional(),
    editingStatus: zod_1.z.string().optional(),
    deliveryStatus: zod_1.z.string().optional(),
    deliveryDate: zod_1.z.date().optional(),
    galleryId: zod_1.z.string().optional(),
    photographerId: zod_1.z.string().optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.insertUserSchema = (0, drizzle_zod_1.createInsertSchema)(exports.users).pick({
    email: true,
    firstName: true,
    lastName: true,
    avatar: true,
});
exports.insertBlogPostSchema = (0, drizzle_zod_1.createInsertSchema)(exports.blogPosts).pick({
    title: true,
    content: true,
    contentHtml: true,
    slug: true,
    excerpt: true,
    published: true,
    imageUrl: true,
    tags: true,
    publishedAt: true,
    scheduledFor: true,
    status: true,
    seoTitle: true,
    metaDescription: true,
    authorId: true,
});
exports.insertCrmClientSchema = (0, drizzle_zod_1.createInsertSchema)(exports.crmClients).pick({
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
exports.insertCrmLeadSchema = (0, drizzle_zod_1.createInsertSchema)(exports.crmLeads).pick({
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
exports.insertLeadSourceSchema = (0, drizzle_zod_1.createInsertSchema)(exports.leadSources).pick({
    name: true,
    isActive: true,
    sortOrder: true,
});
exports.insertGallerySchema = (0, drizzle_zod_1.createInsertSchema)(exports.galleries).pick({
    title: true,
    description: true,
    slug: true,
    coverImage: true,
    isPublic: true,
    isPasswordProtected: true,
    password: true,
});
exports.insertCrmInvoiceSchema = (0, drizzle_zod_1.createInsertSchema)(exports.crmInvoices).pick({
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
exports.insertCrmInvoiceItemSchema = (0, drizzle_zod_1.createInsertSchema)(exports.crmInvoiceItems).pick({
    invoiceId: true,
    description: true,
    quantity: true,
    unitPrice: true,
    taxRate: true,
    sortOrder: true,
});
exports.insertCrmMessageSchema = (0, drizzle_zod_1.createInsertSchema)(exports.crmMessages).pick({
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
exports.insertMessageCampaignSchema = (0, drizzle_zod_1.createInsertSchema)(exports.messageCampaigns).pick({
    name: true,
    messageType: true,
    subject: true,
    content: true,
    targetType: true,
    targetCriteria: true,
    targetClientIds: true,
    scheduledAt: true,
});
exports.insertSMSConfigSchema = (0, drizzle_zod_1.createInsertSchema)(exports.smsConfig).pick({
    provider: true,
    accountSid: true,
    authToken: true,
    fromNumber: true,
    isActive: true,
});
// Scheduler insert schemas
exports.insertSchedulerSchema = (0, drizzle_zod_1.createInsertSchema)(exports.schedulers, {
    name: zod_1.z.string().min(1, "Scheduler name is required"),
    slug: zod_1.z.string().min(1, "URL slug is required"),
    sessionType: zod_1.z.string().min(1, "Session type is required"),
    duration: zod_1.z.number().min(15, "Duration must be at least 15 minutes"),
}).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertSchedulerBookingSchema = (0, drizzle_zod_1.createInsertSchema)(exports.schedulerBookings, {
    schedulerId: zod_1.z.string().min(1, "Scheduler ID is required"),
    clientName: zod_1.z.string().min(1, "Client name is required"),
    clientEmail: zod_1.z.string().email("Valid email is required"),
}).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertSchedulerBlockedTimeSchema = (0, drizzle_zod_1.createInsertSchema)(exports.schedulerBlockedTimes, {
    startDate: zod_1.z.date(),
    endDate: zod_1.z.date(),
}).omit({
    id: true,
    createdAt: true
});
// Voucher Product schemas - Using manual schema instead of createInsertSchema to avoid field name conflicts
exports.insertVoucherProductSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Product name is required"),
    description: zod_1.z.string().optional(),
    price: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).transform(val => String(val)),
    originalPrice: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional().transform(val => val ? String(val) : undefined),
    category: zod_1.z.string().optional(),
    sessionDuration: zod_1.z.number().optional(),
    sessionType: zod_1.z.string().optional(),
    validityPeriod: zod_1.z.number().optional(),
    redemptionInstructions: zod_1.z.string().optional(),
    termsAndConditions: zod_1.z.string().optional(),
    imageUrl: zod_1.z.string().optional(),
    displayOrder: zod_1.z.number().optional(),
    featured: zod_1.z.boolean().optional(),
    badge: zod_1.z.string().optional(),
    isActive: zod_1.z.boolean().optional(),
    stockLimit: zod_1.z.number().optional(),
    maxPerCustomer: zod_1.z.number().optional(),
    slug: zod_1.z.string().optional(),
    metaTitle: zod_1.z.string().optional(),
    metaDescription: zod_1.z.string().optional(),
});
// Discount Coupon schemas
exports.insertDiscountCouponSchema = (0, drizzle_zod_1.createInsertSchema)(exports.discountCoupons, {
    code: zod_1.z.string().min(1, "Coupon code is required"),
    name: zod_1.z.string().min(1, "Coupon name is required"),
    discountType: zod_1.z.enum(["percentage", "fixed_amount"]),
    discountValue: zod_1.z.string().min(1, "Discount value is required"),
}).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// Voucher Sale schemas
exports.insertVoucherSaleSchema = (0, drizzle_zod_1.createInsertSchema)(exports.voucherSales, {
    purchaserName: zod_1.z.string().min(1, "Purchaser name is required"),
    purchaserEmail: zod_1.z.string().email("Valid email is required"),
    voucherCode: zod_1.z.string().min(1, "Voucher code is required"),
    originalAmount: zod_1.z.string().min(1, "Original amount is required"),
    finalAmount: zod_1.z.string().min(1, "Final amount is required"),
}).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// Coupon Usage schemas
exports.insertCouponUsageSchema = (0, drizzle_zod_1.createInsertSchema)(exports.couponUsage, {
    customerEmail: zod_1.z.string().email("Valid email is required"),
    orderAmount: zod_1.z.string().min(1, "Order amount is required"),
    discountAmount: zod_1.z.string().min(1, "Discount amount is required"),
}).omit({
    id: true,
    usedAt: true
});
// Knowledge Base table
exports.knowledgeBase = (0, pg_core_1.pgTable)("knowledge_base", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    title: (0, pg_core_1.text)("title").notNull(),
    content: (0, pg_core_1.text)("content").notNull(),
    category: (0, pg_core_1.text)("category").notNull(),
    tags: (0, pg_core_1.text)("tags").array(),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdBy: (0, pg_core_1.uuid)("created_by").references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
// OpenAI Assistants table
exports.openaiAssistants = (0, pg_core_1.pgTable)("openai_assistants", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(), // Database ID
    openaiAssistantId: (0, pg_core_1.text)("openai_assistant_id"), // OpenAI assistant ID from API
    name: (0, pg_core_1.text)("name").notNull(),
    description: (0, pg_core_1.text)("description"),
    model: (0, pg_core_1.text)("model").default("gpt-4o"),
    instructions: (0, pg_core_1.text)("instructions").notNull(),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    knowledgeBaseIds: (0, pg_core_1.text)("knowledge_base_ids").array(),
    createdBy: (0, pg_core_1.uuid)("created_by").references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
// Knowledge Base schemas
exports.insertKnowledgeBaseSchema = (0, drizzle_zod_1.createInsertSchema)(exports.knowledgeBase, {
    title: zod_1.z.string().min(1, "Title is required"),
    content: zod_1.z.string().min(1, "Content is required"),
    category: zod_1.z.string().min(1, "Category is required"),
}).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// OpenAI Assistant schemas
exports.insertOpenaiAssistantSchema = (0, drizzle_zod_1.createInsertSchema)(exports.openaiAssistants, {
    name: zod_1.z.string().min(1, "Assistant name is required"),
    instructions: zod_1.z.string().min(1, "Instructions are required"),
}).omit({
    id: true, // Let the database generate the OpenAI assistant ID
    createdAt: true,
    updatedAt: true
});
// Admin User schemas
exports.insertAdminUserSchema = (0, drizzle_zod_1.createInsertSchema)(exports.adminUsers, {
    email: zod_1.z.string().email("Valid email is required"),
    passwordHash: zod_1.z.string().min(1, "Password hash is required"),
    firstName: zod_1.z.string().min(1, "First name is required"),
    lastName: zod_1.z.string().min(1, "Last name is required"),
}).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    lastLoginAt: true
});
// ========== MULTI-STUDIO AI OPERATOR TABLES ==========
// Studios table (main studio/tenant table)
exports.studios = (0, pg_core_1.pgTable)("studios", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    name: (0, pg_core_1.text)("name").notNull(),
    slug: (0, pg_core_1.text)("slug").unique().notNull(),
    default_currency: (0, pg_core_1.text)("default_currency").default("EUR"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
// Studio Integrations (credentials and settings per studio)
exports.studioIntegrations = (0, pg_core_1.pgTable)("studio_integrations", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    studioId: (0, pg_core_1.uuid)("studio_id").references(() => exports.studios.id, { onDelete: "cascade" }).notNull(),
    // SMTP Configuration
    smtp_host: (0, pg_core_1.text)("smtp_host"),
    smtp_port: (0, pg_core_1.integer)("smtp_port").default(587),
    smtp_user: (0, pg_core_1.text)("smtp_user"),
    smtp_pass_encrypted: (0, pg_core_1.text)("smtp_pass_encrypted"),
    inbound_email_address: (0, pg_core_1.text)("inbound_email_address"),
    default_from_email: (0, pg_core_1.text)("default_from_email"),
    // Stripe Configuration
    stripe_account_id: (0, pg_core_1.text)("stripe_account_id"),
    stripe_publishable_key: (0, pg_core_1.text)("stripe_publishable_key"),
    stripe_secret_key_encrypted: (0, pg_core_1.text)("stripe_secret_key_encrypted"),
    // OpenAI Configuration
    openai_api_key_encrypted: (0, pg_core_1.text)("openai_api_key_encrypted"),
    // Currency and Regional Settings
    default_currency: (0, pg_core_1.text)("default_currency").default("EUR"),
    timezone: (0, pg_core_1.text)("timezone").default("Europe/Vienna"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
// AI Policies (what the AI agent can do per studio)
exports.aiPolicies = (0, pg_core_1.pgTable)("ai_policies", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    studioId: (0, pg_core_1.uuid)("studio_id").references(() => exports.studios.id, { onDelete: "cascade" }).notNull(),
    // Agent behavior mode
    mode: (0, pg_core_1.text)("mode").notNull().default("read_only"), // "read_only", "propose", "auto_safe", "auto_all"
    // Specific authorities/permissions
    authorities: (0, pg_core_1.text)("authorities").array(), // ["READ_CLIENTS", "READ_LEADS", "DRAFT_EMAIL", etc.]
    // Limits and restrictions
    invoice_auto_limit: (0, pg_core_1.decimal)("invoice_auto_limit", { precision: 10, scale: 2 }).default("0"),
    email_send_mode: (0, pg_core_1.text)("email_send_mode").default("draft"), // "draft", "trusted", "auto"
    // Additional constraints
    max_daily_actions: (0, pg_core_1.integer)("max_daily_actions").default(100),
    require_approval_above: (0, pg_core_1.decimal)("require_approval_above", { precision: 10, scale: 2 }).default("500"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
// Agent Action Log (audit trail) - V1 Legacy
exports.agentActionLog = (0, pg_core_1.pgTable)("agent_action_log", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    studioId: (0, pg_core_1.uuid)("studio_id").references(() => exports.studios.id, { onDelete: "cascade" }).notNull(),
    userId: (0, pg_core_1.uuid)("user_id").references(() => exports.users.id),
    // Action details
    action_type: (0, pg_core_1.text)("action_type").notNull(), // "READ_CLIENTS", "DRAFT_EMAIL", "SEND_INVOICE", etc.
    action_details: (0, pg_core_1.jsonb)("action_details"), // Full details of what was done
    // Context
    assistant_id: (0, pg_core_1.text)("assistant_id"), // OpenAI assistant ID that performed the action
    conversation_id: (0, pg_core_1.text)("conversation_id"), // Link to conversation thread
    // Result
    success: (0, pg_core_1.boolean)("success").default(true),
    error_message: (0, pg_core_1.text)("error_message"),
    // Metadata
    ip_address: (0, pg_core_1.text)("ip_address"),
    user_agent: (0, pg_core_1.text)("user_agent"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
// Agent V2 Tables (ToolBus Architecture)
// Agent Session - tracks conversation sessions
exports.agentSession = (0, pg_core_1.pgTable)("agent_session", {
    id: (0, pg_core_1.text)("id").primaryKey(), // sess_xxx
    studioId: (0, pg_core_1.text)("studio_id").notNull(),
    userId: (0, pg_core_1.text)("user_id").notNull(),
    mode: (0, pg_core_1.text)("mode").notNull(), // read_only | auto_safe | auto_full
    scopes: (0, pg_core_1.text)("scopes").array(), // User's permission scopes
    metadata: (0, pg_core_1.jsonb)("metadata"), // Additional context (e.g., client_id if in context)
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
// Agent Message - conversation history
exports.agentMessage = (0, pg_core_1.pgTable)("agent_message", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    sessionId: (0, pg_core_1.text)("session_id").notNull().references(() => exports.agentSession.id, { onDelete: "cascade" }),
    role: (0, pg_core_1.text)("role").notNull(), // user | assistant | system
    content: (0, pg_core_1.text)("content").notNull(),
    metadata: (0, pg_core_1.jsonb)("metadata"), // Tool calls, token usage, etc.
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
// Agent Audit - tool execution log
exports.agentAudit = (0, pg_core_1.pgTable)("agent_audit", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    sessionId: (0, pg_core_1.text)("session_id").notNull().references(() => exports.agentSession.id, { onDelete: "cascade" }),
    tool: (0, pg_core_1.text)("tool").notNull(),
    argsJson: (0, pg_core_1.text)("args_json").notNull(),
    resultJson: (0, pg_core_1.text)("result_json"),
    ok: (0, pg_core_1.boolean)("ok").notNull(),
    error: (0, pg_core_1.text)("error"),
    duration: (0, pg_core_1.integer)("duration"), // milliseconds
    simulated: (0, pg_core_1.boolean)("simulated").default(false), // true for shadow mode
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
// Agent Audit Diff - shadow mode comparison (v1 vs v2)
exports.agentAuditDiff = (0, pg_core_1.pgTable)("agent_audit_diff", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    sessionId: (0, pg_core_1.text)("session_id").notNull().references(() => exports.agentSession.id, { onDelete: "cascade" }),
    v1Text: (0, pg_core_1.text)("v1_text"), // V1 response
    v2PlanJson: (0, pg_core_1.text)("v2_plan_json"), // V2 plan
    v2ResultsJson: (0, pg_core_1.text)("v2_results_json"), // V2 execution results
    match: (0, pg_core_1.boolean)("match"), // Did v1 and v2 produce same outcome?
    notes: (0, pg_core_1.text)("notes"), // Analysis notes
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
// Add studio_id to existing tables for multi-tenancy
// Note: This should be added to existing tables in migrations
// Schema types for new tables
exports.insertStudioSchema = (0, drizzle_zod_1.createInsertSchema)(exports.studios, {
    name: zod_1.z.string().min(1, "Studio name is required"),
    slug: zod_1.z.string().min(1, "Studio slug is required"),
}).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertStudioIntegrationSchema = (0, drizzle_zod_1.createInsertSchema)(exports.studioIntegrations, {
    studioId: zod_1.z.string().uuid("Valid studio ID is required"),
}).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertAiPolicySchema = (0, drizzle_zod_1.createInsertSchema)(exports.aiPolicies, {
    studioId: zod_1.z.string().uuid("Valid studio ID is required"),
    mode: zod_1.z.enum(["read_only", "propose", "auto_safe", "auto_all"]),
}).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertAgentActionLogSchema = (0, drizzle_zod_1.createInsertSchema)(exports.agentActionLog, {
    studioId: zod_1.z.string().uuid("Valid studio ID is required"),
    action_type: zod_1.z.string().min(1, "Action type is required"),
}).omit({
    id: true,
    createdAt: true
});
// Agent V2 schemas
exports.insertAgentSessionSchema = (0, drizzle_zod_1.createInsertSchema)(exports.agentSession, {
    id: zod_1.z.string().min(1, "Session ID is required"),
    studioId: zod_1.z.string().min(1, "Studio ID is required"),
    userId: zod_1.z.string().min(1, "User ID is required"),
    mode: zod_1.z.enum(["read_only", "auto_safe", "auto_full"]),
}).omit({
    createdAt: true,
    updatedAt: true
});
exports.insertAgentMessageSchema = (0, drizzle_zod_1.createInsertSchema)(exports.agentMessage, {
    sessionId: zod_1.z.string().min(1, "Session ID is required"),
    role: zod_1.z.enum(["user", "assistant", "system"]),
    content: zod_1.z.string().min(1, "Message content is required"),
}).omit({
    id: true,
    createdAt: true
});
exports.insertAgentAuditSchema = (0, drizzle_zod_1.createInsertSchema)(exports.agentAudit, {
    sessionId: zod_1.z.string().min(1, "Session ID is required"),
    tool: zod_1.z.string().min(1, "Tool name is required"),
    argsJson: zod_1.z.string().min(1),
    ok: zod_1.z.boolean(),
}).omit({
    id: true,
    createdAt: true
});
exports.insertAgentAuditDiffSchema = (0, drizzle_zod_1.createInsertSchema)(exports.agentAuditDiff, {
    sessionId: zod_1.z.string().min(1, "Session ID is required"),
}).omit({
    id: true,
    createdAt: true
});
exports.insertPriceListItemSchema = (0, drizzle_zod_1.createInsertSchema)(exports.priceListItems, {
    name: zod_1.z.string().min(1, "Item name is required"),
    category: zod_1.z.string().min(1, "Category is required"),
    price: zod_1.z.string().min(1, "Price is required"),
}).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// Digital Storage Subscription System
exports.storageSubscriptionTier = (0, pg_core_1.pgEnum)("storage_subscription_tier", [
    "starter",
    "professional",
    "enterprise"
]);
exports.storageSubscriptionStatus = (0, pg_core_1.pgEnum)("storage_subscription_status", [
    "active",
    "canceled",
    "past_due",
    "trialing",
    "incomplete"
]);
// Storage Subscriptions (linked to Stripe)
exports.storageSubscriptions = (0, pg_core_1.pgTable)("storage_subscriptions", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").references(() => exports.users.id, { onDelete: "cascade" }),
    clientId: (0, pg_core_1.uuid)("client_id").references(() => exports.crmClients.id, { onDelete: "cascade" }),
    // Stripe integration
    stripeSubscriptionId: (0, pg_core_1.text)("stripe_subscription_id").unique(),
    stripeCustomerId: (0, pg_core_1.text)("stripe_customer_id"),
    stripePriceId: (0, pg_core_1.text)("stripe_price_id"),
    // Subscription details
    tier: (0, exports.storageSubscriptionTier)("tier").notNull(),
    status: (0, exports.storageSubscriptionStatus)("status").notNull().default("trialing"),
    // Storage limits (in bytes)
    storageLimit: (0, pg_core_1.integer)("storage_limit").notNull(), // 50GB, 200GB, 1TB
    // Billing
    currentPeriodStart: (0, pg_core_1.timestamp)("current_period_start"),
    currentPeriodEnd: (0, pg_core_1.timestamp)("current_period_end"),
    cancelAtPeriodEnd: (0, pg_core_1.boolean)("cancel_at_period_end").default(false),
    // Metadata
    metadata: (0, pg_core_1.jsonb)("metadata"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
// Storage Usage Tracking
exports.storageUsage = (0, pg_core_1.pgTable)("storage_usage", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    subscriptionId: (0, pg_core_1.uuid)("subscription_id").references(() => exports.storageSubscriptions.id, { onDelete: "cascade" }).notNull(),
    // Usage metrics (in bytes)
    currentStorageBytes: (0, pg_core_1.integer)("current_storage_bytes").default(0).notNull(),
    fileCount: (0, pg_core_1.integer)("file_count").default(0),
    // Calculated fields
    lastCalculatedAt: (0, pg_core_1.timestamp)("last_calculated_at").defaultNow(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
// Archived Folders (for organizing files)
exports.archivedFolders = (0, pg_core_1.pgTable)("archived_folders", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    subscriptionId: (0, pg_core_1.uuid)("subscription_id").references(() => exports.storageSubscriptions.id, { onDelete: "cascade" }).notNull(),
    parentFolderId: (0, pg_core_1.uuid)("parent_folder_id"),
    name: (0, pg_core_1.text)("name").notNull(),
    description: (0, pg_core_1.text)("description"),
    color: (0, pg_core_1.text)("color"), // for UI organization
    icon: (0, pg_core_1.text)("icon"), // icon name for UI
    // Metadata
    filesCount: (0, pg_core_1.integer)("files_count").default(0),
    totalSize: (0, pg_core_1.integer)("total_size").default(0),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
// Archived Files (user's personal cloud storage)
exports.archivedFiles = (0, pg_core_1.pgTable)("archived_files", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    subscriptionId: (0, pg_core_1.uuid)("subscription_id").references(() => exports.storageSubscriptions.id, { onDelete: "cascade" }).notNull(),
    folderId: (0, pg_core_1.uuid)("folder_id").references(() => exports.archivedFolders.id),
    // File metadata
    fileName: (0, pg_core_1.text)("file_name").notNull(),
    originalName: (0, pg_core_1.text)("original_name").notNull(),
    fileType: (0, pg_core_1.text)("file_type").notNull(), // image/jpeg, video/mp4, etc.
    mimeType: (0, pg_core_1.text)("mime_type").notNull(),
    fileSize: (0, pg_core_1.integer)("file_size").notNull(), // in bytes
    // Storage location
    storageKey: (0, pg_core_1.text)("storage_key").notNull().unique(), // Neon blob storage key
    storageUrl: (0, pg_core_1.text)("storage_url"), // CDN URL if applicable
    // File organization
    tags: (0, pg_core_1.text)("tags").array(),
    description: (0, pg_core_1.text)("description"),
    // Source tracking
    sourceType: (0, pg_core_1.text)("source_type"), // 'upload', 'gallery_transfer', 'admin_send'
    sourceId: (0, pg_core_1.text)("source_id"), // gallery_id or session_id if transferred
    // Thumbnails for images/videos
    thumbnailKey: (0, pg_core_1.text)("thumbnail_key"),
    thumbnailUrl: (0, pg_core_1.text)("thumbnail_url"),
    // Metadata
    metadata: (0, pg_core_1.jsonb)("metadata"), // EXIF data, video duration, etc.
    // Status
    isDeleted: (0, pg_core_1.boolean)("is_deleted").default(false),
    deletedAt: (0, pg_core_1.timestamp)("deleted_at"),
    uploadedAt: (0, pg_core_1.timestamp)("uploaded_at").defaultNow(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
// Gallery Transfer Log (track when admin sends galleries to client archive)
exports.galleryTransferLog = (0, pg_core_1.pgTable)("gallery_transfer_log", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    galleryId: (0, pg_core_1.uuid)("gallery_id").references(() => exports.galleries.id),
    subscriptionId: (0, pg_core_1.uuid)("subscription_id").references(() => exports.storageSubscriptions.id, { onDelete: "cascade" }).notNull(),
    adminUserId: (0, pg_core_1.uuid)("admin_user_id").references(() => exports.adminUsers.id),
    filesTransferred: (0, pg_core_1.integer)("files_transferred").default(0),
    totalSize: (0, pg_core_1.integer)("total_size").default(0),
    status: (0, pg_core_1.text)("status").default("pending"), // pending, completed, failed
    errorMessage: (0, pg_core_1.text)("error_message"),
    transferredAt: (0, pg_core_1.timestamp)("transferred_at").defaultNow(),
    completedAt: (0, pg_core_1.timestamp)("completed_at"),
});
// Insert schemas
exports.insertStorageSubscriptionSchema = (0, drizzle_zod_1.createInsertSchema)(exports.storageSubscriptions, {
    tier: zod_1.z.enum(["starter", "professional", "enterprise"]),
    status: zod_1.z.enum(["active", "canceled", "past_due", "trialing", "incomplete"]).optional(),
    storageLimit: zod_1.z.number().positive(),
}).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
exports.insertStorageUsageSchema = (0, drizzle_zod_1.createInsertSchema)(exports.storageUsage, {
    subscriptionId: zod_1.z.string().uuid(),
    totalUsed: zod_1.z.number().nonnegative().optional(),
}).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
exports.insertArchivedFileSchema = (0, drizzle_zod_1.createInsertSchema)(exports.archivedFiles, {
    subscriptionId: zod_1.z.string().uuid(),
    fileName: zod_1.z.string().min(1),
    originalName: zod_1.z.string().min(1),
    fileType: zod_1.z.string().min(1),
    mimeType: zod_1.z.string().min(1),
    fileSize: zod_1.z.number().positive(),
    storageKey: zod_1.z.string().min(1),
}).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    uploadedAt: true,
});
exports.insertArchivedFolderSchema = (0, drizzle_zod_1.createInsertSchema)(exports.archivedFolders, {
    subscriptionId: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1, "Folder name is required"),
}).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
exports.insertGalleryTransferLogSchema = (0, drizzle_zod_1.createInsertSchema)(exports.galleryTransferLog, {
    galleryId: zod_1.z.string().uuid(),
    subscriptionId: zod_1.z.string().uuid(),
}).omit({
    id: true,
    transferredAt: true,
});
// ==================== EMAIL CAMPAIGNS ====================
exports.emailCampaigns = (0, pg_core_1.pgTable)("email_campaigns", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").references(() => exports.users.id, { onDelete: "cascade" }),
    name: (0, pg_core_1.text)("name").notNull(),
    type: (0, pg_core_1.text)("type").notNull().default("broadcast"), // broadcast, drip, transactional
    status: (0, pg_core_1.text)("status").notNull().default("draft"), // draft, scheduled, sending, sent, paused, archived
    subject: (0, pg_core_1.text)("subject").notNull(),
    previewText: (0, pg_core_1.text)("preview_text"),
    content: (0, pg_core_1.text)("content").notNull(),
    senderName: (0, pg_core_1.text)("sender_name").default("New Age Fotografie"),
    senderEmail: (0, pg_core_1.text)("sender_email").default("info@newagefotografie.com"),
    replyTo: (0, pg_core_1.text)("reply_to").default("info@newagefotografie.com"),
    // Scheduling
    scheduledAt: (0, pg_core_1.timestamp)("scheduled_at"),
    sentAt: (0, pg_core_1.timestamp)("sent_at"),
    // Targeting
    segments: (0, pg_core_1.text)("segments").array(),
    tagsInclude: (0, pg_core_1.text)("tags_include").array(),
    tagsExclude: (0, pg_core_1.text)("tags_exclude").array(),
    // Stats
    recipientCount: (0, pg_core_1.integer)("recipient_count").default(0),
    sentCount: (0, pg_core_1.integer)("sent_count").default(0),
    deliveredCount: (0, pg_core_1.integer)("delivered_count").default(0),
    openedCount: (0, pg_core_1.integer)("opened_count").default(0),
    clickedCount: (0, pg_core_1.integer)("clicked_count").default(0),
    bouncedCount: (0, pg_core_1.integer)("bounced_count").default(0),
    unsubscribedCount: (0, pg_core_1.integer)("unsubscribed_count").default(0),
    // Settings (stored as JSON)
    settings: (0, pg_core_1.jsonb)("settings"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
exports.insertEmailCampaignSchema = (0, drizzle_zod_1.createInsertSchema)(exports.emailCampaigns, {
    userId: zod_1.z.string().uuid().optional(),
    name: zod_1.z.string().min(1, "Campaign name is required"),
    subject: zod_1.z.string().min(1, "Subject is required"),
    content: zod_1.z.string().min(1, "Content is required"),
}).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
// Email Templates
exports.emailTemplates = (0, pg_core_1.pgTable)("email_templates", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").references(() => exports.users.id, { onDelete: "cascade" }),
    name: (0, pg_core_1.text)("name").notNull(),
    category: (0, pg_core_1.text)("category").notNull().default("general"), // general, welcome, booking, payment, gallery
    description: (0, pg_core_1.text)("description"),
    subject: (0, pg_core_1.text)("subject").notNull(),
    previewText: (0, pg_core_1.text)("preview_text"),
    htmlContent: (0, pg_core_1.text)("html_content").notNull(),
    textContent: (0, pg_core_1.text)("text_content"),
    thumbnail: (0, pg_core_1.text)("thumbnail"),
    variables: (0, pg_core_1.jsonb)("variables"), // Array of available variables
    isPublic: (0, pg_core_1.boolean)("is_public").default(false),
    usageCount: (0, pg_core_1.integer)("usage_count").default(0),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
exports.insertEmailTemplateSchema = (0, drizzle_zod_1.createInsertSchema)(exports.emailTemplates, {
    name: zod_1.z.string().min(1, "Template name is required"),
    subject: zod_1.z.string().min(1, "Subject is required"),
    htmlContent: zod_1.z.string().min(1, "HTML content is required"),
}).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
// Email Subscribers
exports.emailSubscribers = (0, pg_core_1.pgTable)("email_subscribers", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").references(() => exports.users.id, { onDelete: "cascade" }),
    email: (0, pg_core_1.text)("email").notNull(),
    firstName: (0, pg_core_1.text)("first_name"),
    lastName: (0, pg_core_1.text)("last_name"),
    phone: (0, pg_core_1.text)("phone"),
    status: (0, pg_core_1.text)("status").notNull().default("active"), // active, unsubscribed, bounced, complained
    source: (0, pg_core_1.text)("source").default("manual"), // manual, import, form, booking
    tags: (0, pg_core_1.text)("tags").array(),
    customFields: (0, pg_core_1.jsonb)("custom_fields"),
    subscribedAt: (0, pg_core_1.timestamp)("subscribed_at").defaultNow(),
    unsubscribedAt: (0, pg_core_1.timestamp)("unsubscribed_at"),
    // Engagement
    lastOpenedAt: (0, pg_core_1.timestamp)("last_opened_at"),
    lastClickedAt: (0, pg_core_1.timestamp)("last_clicked_at"),
    emailsSentCount: (0, pg_core_1.integer)("emails_sent_count").default(0),
    emailsOpenedCount: (0, pg_core_1.integer)("emails_opened_count").default(0),
    emailsClickedCount: (0, pg_core_1.integer)("emails_clicked_count").default(0),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
exports.insertEmailSubscriberSchema = (0, drizzle_zod_1.createInsertSchema)(exports.emailSubscribers, {
    email: zod_1.z.string().email("Invalid email address"),
}).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
// Email Segments
exports.emailSegments = (0, pg_core_1.pgTable)("email_segments", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").references(() => exports.users.id, { onDelete: "cascade" }),
    name: (0, pg_core_1.text)("name").notNull(),
    description: (0, pg_core_1.text)("description"),
    conditions: (0, pg_core_1.jsonb)("conditions").notNull(), // Filter conditions
    subscriberCount: (0, pg_core_1.integer)("subscriber_count").default(0),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
exports.insertEmailSegmentSchema = (0, drizzle_zod_1.createInsertSchema)(exports.emailSegments, {
    name: zod_1.z.string().min(1, "Segment name is required"),
}).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
// Email Events for tracking opens, clicks, etc.
exports.emailEvents = (0, pg_core_1.pgTable)("email_events", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    campaignId: (0, pg_core_1.uuid)("campaign_id").references(() => exports.emailCampaigns.id, { onDelete: "cascade" }),
    subscriberEmail: (0, pg_core_1.text)("subscriber_email").notNull(),
    eventType: (0, pg_core_1.text)("event_type").notNull(), // sent, delivered, opened, clicked, bounced, unsubscribed, complained
    linkUrl: (0, pg_core_1.text)("link_url"),
    userAgent: (0, pg_core_1.text)("user_agent"),
    ipAddress: (0, pg_core_1.text)("ip_address"),
    country: (0, pg_core_1.text)("country"),
    city: (0, pg_core_1.text)("city"),
    deviceType: (0, pg_core_1.text)("device_type"), // desktop, mobile, tablet, unknown
    browser: (0, pg_core_1.text)("browser"),
    os: (0, pg_core_1.text)("os"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    metadata: (0, pg_core_1.jsonb)("metadata"),
});
exports.emailLinks = (0, pg_core_1.pgTable)("email_links", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    campaignId: (0, pg_core_1.uuid)("campaign_id").references(() => exports.emailCampaigns.id, { onDelete: "cascade" }),
    url: (0, pg_core_1.text)("url").notNull(),
    label: (0, pg_core_1.text)("label"),
    clickCount: (0, pg_core_1.integer)("click_count").default(0),
    uniqueClicks: (0, pg_core_1.integer)("unique_clicks").default(0),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
// Backwards-compatible snake_case aliases for legacy imports
exports.photography_sessions = exports.photographySessions;
exports.gallery_images = exports.galleryImages;

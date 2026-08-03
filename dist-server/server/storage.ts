import { 
  users,
  adminUsers,
  blogPosts,
  crmClients,
  crmLeads,
  leadSources,
  crmInvoices,
  crmInvoiceItems,
  crmInvoicePayments,
  crmMessages,
  galleries,
  galleryImages,
  photographySessions,
  voucherProducts,
  discountCoupons,
  voucherSales,
  couponUsage,
  type User, 
  type InsertUser,
  type AdminUser,
  type InsertAdminUser,
  type BlogPost,
  type InsertBlogPost,
  type CrmClient,
  type InsertCrmClient,
  type LeadSource,
  type InsertLeadSource,
  type CrmLead,
  type InsertCrmLead,
  type CrmInvoice,
  type InsertCrmInvoice,
  type CrmInvoiceItem,
  type InsertCrmInvoiceItem,
  type CrmInvoicePayment,
  type InsertCrmInvoicePayment,
  type CrmMessage,
  type InsertCrmMessage,
  type PhotographySession,
  type InsertPhotographySession,
  type Gallery,
  type InsertGallery,
  type VoucherProduct,
  type InsertVoucherProduct,
  type DiscountCoupon,
  type InsertDiscountCoupon,
  type VoucherSale,
  type InsertVoucherSale,
  type CouponUsage,
  type InsertCouponUsage
} from "../shared/schema.js";
import { db } from "./db";
import { eq, and, desc, asc, sql, isNotNull } from "drizzle-orm";
import validator from "validator";
import path from 'path';
import os from 'os';
import fs from 'fs';

export interface IStorage {
  // Admin User management (authentication)
  getAdminUser(id: string): Promise<AdminUser | undefined>;
  getAdminUserByEmail(email: string): Promise<AdminUser | undefined>;
  createAdminUser(user: InsertAdminUser): Promise<AdminUser>;
  updateAdminUser(id: string, updates: Partial<AdminUser>): Promise<AdminUser>;
  deleteAdminUser(id: string): Promise<void>;

  // Legacy User management (CRM clients)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<void>;

  // Blog management
  getBlogPosts(published?: boolean): Promise<BlogPost[]>;
  getBlogPost(id: string): Promise<BlogPost | undefined>;
  getBlogPostBySlug(slug: string): Promise<BlogPost | undefined>;
  createBlogPost(post: InsertBlogPost): Promise<BlogPost>;
  updateBlogPost(id: string, updates: Partial<BlogPost>): Promise<BlogPost>;
  deleteBlogPost(id: string): Promise<void>;
  getAllBlogSlugs(): Promise<string[]>;
  savePublicAsset(bucket: string, filename: string, buffer: Buffer): Promise<string>;

  // CRM Client management
  getCrmClients(): Promise<CrmClient[]>;
  getCrmClient(id: string): Promise<CrmClient | undefined>;
  createCrmClient(client: InsertCrmClient): Promise<CrmClient>;
  updateCrmClient(id: string, updates: Partial<CrmClient>): Promise<CrmClient>;
  deleteCrmClient(id: string): Promise<void>;

  // Lead Sources management
  getLeadSources(): Promise<LeadSource[]>;
  getLeadSource(id: string): Promise<LeadSource | undefined>;
  createLeadSource(source: InsertLeadSource): Promise<LeadSource>;
  updateLeadSource(id: string, updates: Partial<LeadSource>): Promise<LeadSource>;
  deleteLeadSource(id: string): Promise<void>;

  // CRM Lead management
  getCrmLeads(status?: string): Promise<CrmLead[]>;
  getCrmLead(id: string): Promise<CrmLead | undefined>;
  createCrmLead(lead: InsertCrmLead): Promise<CrmLead>;
  updateCrmLead(id: string, updates: Partial<CrmLead>): Promise<CrmLead>;
  deleteCrmLead(id: string): Promise<void>;

  // Photography Session management
  getPhotographySessions(photographerId?: string): Promise<PhotographySession[]>;
  getPhotographySession(id: string): Promise<PhotographySession | undefined>;
  createPhotographySession(session: InsertPhotographySession): Promise<PhotographySession>;
  updatePhotographySession(id: string, updates: Partial<PhotographySession>): Promise<PhotographySession>;
  deletePhotographySession(id: string): Promise<void>;

  // Gallery management
  getGalleries(): Promise<Gallery[]>;
  getGallery(id: string): Promise<Gallery | undefined>;
  getGalleryImages(galleryId: string): Promise<any[]>;
  getGalleryBySlug(slug: string): Promise<Gallery | undefined>;
  getClientGalleryWithCover(clientId: string): Promise<Gallery | undefined>;
  createGallery(gallery: InsertGallery): Promise<Gallery>;
  updateGallery(id: string, updates: Partial<Gallery>): Promise<Gallery>;
  deleteGallery(id: string): Promise<void>;

  // CRM Message management
  getCrmMessages(): Promise<CrmMessage[]>;
  getCrmMessage(id: string): Promise<CrmMessage | undefined>;
  createCrmMessage(message: InsertCrmMessage): Promise<CrmMessage>;
  updateCrmMessage(id: string, updates: Partial<CrmMessage>): Promise<CrmMessage>;
  deleteCrmMessage(id: string): Promise<void>;

  // Invoice management
  getCrmInvoices(): Promise<CrmInvoice[]>;
  getCrmInvoice(id: string): Promise<CrmInvoice | undefined>;
  createCrmInvoice(invoice: InsertCrmInvoice): Promise<CrmInvoice>;
  updateCrmInvoice(id: string, updates: Partial<CrmInvoice>): Promise<CrmInvoice>;
  deleteCrmInvoice(id: string): Promise<void>;
  
  // Invoice Items management
  getCrmInvoiceItems(invoiceId: string): Promise<CrmInvoiceItem[]>;
  createCrmInvoiceItems(items: InsertCrmInvoiceItem[]): Promise<CrmInvoiceItem[]>;
  
  // Invoice Payments management
  getCrmInvoicePayments(invoiceId: string): Promise<CrmInvoicePayment[]>;
  createCrmInvoicePayment(payment: InsertCrmInvoicePayment): Promise<CrmInvoicePayment>;
  deleteCrmInvoicePayment(paymentId: string): Promise<void>;

  // Voucher Products management
  getVoucherProducts(): Promise<VoucherProduct[]>;
  getVoucherProduct(id: string): Promise<VoucherProduct | undefined>;
  createVoucherProduct(product: InsertVoucherProduct): Promise<VoucherProduct>;
  updateVoucherProduct(id: string, updates: Partial<VoucherProduct>): Promise<VoucherProduct>;
  deleteVoucherProduct(id: string): Promise<void>;

  // Discount Coupons management
  getDiscountCoupons(): Promise<DiscountCoupon[]>;
  getDiscountCoupon(id: string): Promise<DiscountCoupon | undefined>;
  getDiscountCouponByCode(code: string): Promise<DiscountCoupon | undefined>;
  createDiscountCoupon(coupon: InsertDiscountCoupon): Promise<DiscountCoupon>;
  updateDiscountCoupon(id: string, updates: Partial<DiscountCoupon>): Promise<DiscountCoupon>;
  deleteDiscountCoupon(id: string): Promise<void>;

  // Voucher Sales management
  getVoucherSales(): Promise<VoucherSale[]>;
  getVoucherSale(id: string): Promise<VoucherSale | undefined>;
  getVoucherSaleByCode(code: string): Promise<VoucherSale | undefined>;
  createVoucherSale(sale: InsertVoucherSale): Promise<VoucherSale>;
  updateVoucherSale(id: string, updates: Partial<VoucherSale>): Promise<VoucherSale>;
  deleteVoucherSale(id: string): Promise<void>;

  // Coupon Usage management
  getCouponUsage(couponId: string): Promise<CouponUsage[]>;
  createCouponUsage(usage: InsertCouponUsage): Promise<CouponUsage>;

  // Email Settings management
  saveEmailSettings(settings: any): Promise<any>;
  getEmailSettings(): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // Admin User management (authentication)
  async getAdminUser(id: string): Promise<AdminUser | undefined> {
    const result = await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
    return result[0];
  }

  async getAdminUserByEmail(email: string): Promise<AdminUser | undefined> {
    const result = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
    return result[0];
  }

  async createAdminUser(user: InsertAdminUser): Promise<AdminUser> {
  const result = await db.insert(adminUsers).values(user as any).returning();
    return result[0];
  }

  async updateAdminUser(id: string, updates: Partial<AdminUser>): Promise<AdminUser> {
    const result = await db.update(adminUsers).set(updates).where(eq(adminUsers.id, id)).returning();
    return result[0];
  }

  async deleteAdminUser(id: string): Promise<void> {
    await db.delete(adminUsers).where(eq(adminUsers.id, id));
  }

  // Legacy User management (CRM clients)
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
  const result = await db.insert(users).values(user as any).returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const result = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return result[0];
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Blog management
  async getBlogPosts(published?: boolean): Promise<BlogPost[]> {
    const baseQuery = db.select().from(blogPosts);
    
    let filtered = baseQuery;
    
    // If filtering for published posts, also check that publishedAt <= now
    if (published === true) {
      filtered = filtered.where(
        and(
          eq(blogPosts.published, true),
          sql`${blogPosts.publishedAt} <= NOW()`
        )
      );
    } else if (published === false) {
      filtered = filtered.where(eq(blogPosts.published, false));
    }
    // If published is undefined, return all posts regardless of date (for admin)
    
    return await filtered.orderBy(desc(blogPosts.createdAt));
  }

  async getBlogPost(id: string): Promise<BlogPost | undefined> {
    const result = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1);
    return result[0];
  }

  async getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
    const result = await db.select().from(blogPosts).where(eq(blogPosts.slug, slug)).limit(1);
    return result[0];
  }

  async createBlogPost(post: InsertBlogPost): Promise<BlogPost> {
  const result = await db.insert(blogPosts).values(post as any).returning();
    return result[0];
  }

  async updateBlogPost(id: string, updates: Partial<BlogPost>): Promise<BlogPost> {
    const result = await db.update(blogPosts).set(updates).where(eq(blogPosts.id, id)).returning();
    return result[0];
  }

  async deleteBlogPost(id: string): Promise<void> {
    await db.delete(blogPosts).where(eq(blogPosts.id, id));
  }

  // CRM Client management
  async getCrmClients(): Promise<CrmClient[]> {
    return await db.select().from(crmClients).orderBy(desc(crmClients.createdAt));
  }

  async getCrmClient(id: string): Promise<CrmClient | undefined> {
    const result = await db.select().from(crmClients).where(eq(crmClients.id, id)).limit(1);
    return result[0];
  }

  async createCrmClient(client: InsertCrmClient): Promise<CrmClient> {
    // Email validation - Fix #1 from triage playbook
    if (client.email && !validator.isEmail(client.email)) {
      throw new Error(`Invalid email address: ${client.email}. Please provide a valid email format.`);
    }
    
  const result = await db.insert(crmClients).values(client as any).returning();
    return result[0];
  }

  async updateCrmClient(id: string, updates: Partial<CrmClient>): Promise<CrmClient> {
    const result = await db.update(crmClients).set(updates).where(eq(crmClients.id, id)).returning();
    return result[0];
  }

  async deleteCrmClient(id: string): Promise<void> {
    await db.delete(crmClients).where(eq(crmClients.id, id));
  }

  // Lead Sources management
  async getLeadSources(): Promise<LeadSource[]> {
    return await db.select().from(leadSources).orderBy(leadSources.sortOrder, leadSources.name);
  }

  async getLeadSource(id: string): Promise<LeadSource | undefined> {
    const result = await db.select().from(leadSources).where(eq(leadSources.id, id)).limit(1);
    return result[0];
  }

  async createLeadSource(source: InsertLeadSource): Promise<LeadSource> {
    const result = await db.insert(leadSources).values(source as any).returning();
    return result[0];
  }

  async updateLeadSource(id: string, updates: Partial<LeadSource>): Promise<LeadSource> {
    const result = await db.update(leadSources).set(updates).where(eq(leadSources.id, id)).returning();
    return result[0];
  }

  async deleteLeadSource(id: string): Promise<void> {
    await db.delete(leadSources).where(eq(leadSources.id, id));
  }

  // CRM Lead management
  async getCrmLeads(status?: string): Promise<CrmLead[]> {
    const baseLeads = db.select().from(crmLeads);
    const filteredLeads = (status && status !== 'all')
      ? baseLeads.where(eq(crmLeads.status, status))
      : baseLeads;
    return await filteredLeads.orderBy(desc(crmLeads.createdAt));
  }

  async getCrmLead(id: string): Promise<CrmLead | undefined> {
    const result = await db.select().from(crmLeads).where(eq(crmLeads.id, id)).limit(1);
    return result[0];
  }

  async createCrmLead(lead: InsertCrmLead): Promise<CrmLead> {
    // Email validation - Fix #1 from triage playbook
    if (lead.email && !validator.isEmail(lead.email)) {
      throw new Error(`Invalid email address: ${lead.email}. Please provide a valid email format.`);
    }
    
  const result = await db.insert(crmLeads).values(lead as any).returning();
    return result[0];
  }

  async updateCrmLead(id: string, updates: Partial<CrmLead>): Promise<CrmLead> {
    const result = await db.update(crmLeads).set(updates).where(eq(crmLeads.id, id)).returning();
    return result[0];
  }

  async deleteCrmLead(id: string): Promise<void> {
    await db.delete(crmLeads).where(eq(crmLeads.id, id));
  }

  // Photography Session management
  async getPhotographySessions(photographerId?: string): Promise<PhotographySession[]> {
    const baseSessions = db.select().from(photographySessions);
    const filteredSessions = photographerId
      ? baseSessions.where(eq(photographySessions.photographerId, photographerId))
      : baseSessions;
    return await filteredSessions.orderBy(asc(photographySessions.startTime));
  }

  async getPhotographySession(id: string): Promise<PhotographySession | undefined> {
    const result = await db.select().from(photographySessions).where(eq(photographySessions.id, id)).limit(1);
    return result[0];
  }

  async createPhotographySession(session: InsertPhotographySession): Promise<PhotographySession> {
    try {
      // Debug snapshot (best-effort)
      try {
        const inspectFields = ['startTime', 'endTime', 'deliveryDate', 'createdAt', 'updatedAt'];
        const parts: string[] = [];
        for (const f of inspectFields) {
          const v = (session as any)[f];
          const t = v === undefined ? 'undefined' : (v && (v as any).constructor ? (v as any).constructor.name : typeof v);
          const val = v instanceof Date ? (isNaN(v.getTime()) ? 'InvalidDate' : v.toISOString()) : (v === undefined ? 'null' : String(v));
          parts.push(`${f}=${t}:${val}`);
        }
        const line = `DEBUG_LOG | sessionId=${(session as any).id || ''} | ${parts.join(' | ')}\n`;
        const tmpDir = os.tmpdir();
        const debugPath = path.join(tmpDir, 'clean-crm-debug_import.log');
        fs.appendFileSync(debugPath, line, { encoding: 'utf8' });
      } catch {}

      // Normalize timestamp-like fields into Date objects
      const coerceToDate = (v: any): Date | null => {
        if (v === undefined || v === null) return null;
        if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
        if (typeof v === 'number') { const d = new Date(v); return isNaN(d.getTime()) ? null : d; }
        if (typeof v === 'string') { const d = new Date(v); return isNaN(d.getTime()) ? null : d; }
        try {
          if (typeof v?.toDate === 'function') { const d = v.toDate(); return d instanceof Date && !isNaN(d.getTime()) ? d : null; }
          if (typeof v?.toISOString === 'function') { const d = new Date(v.toISOString()); return !isNaN(d.getTime()) ? d : null; }
          if (typeof v?.seconds === 'number') { const d = new Date(v.seconds * 1000); return !isNaN(d.getTime()) ? d : null; }
        } catch {}
        try { const d = new Date(String(v)); return isNaN(d.getTime()) ? null : d; } catch { return null; }
      };
      for (const f of ['startTime','endTime','deliveryDate','createdAt','updatedAt']) {
        const coerced = coerceToDate((session as any)[f]);
        if (coerced) (session as any)[f] = coerced;
      }

      // If we have an iCal UID, reconcile by that first to prevent duplicates across imports
      if ((session as any).icalUid) {
        const byUid = await db
          .select()
          .from(photographySessions)
          .where(eq(photographySessions.icalUid, (session as any).icalUid as any))
          .limit(1);
        if (byUid && byUid[0]) {
          const [updated] = await db
            .update(photographySessions)
            .set({
              title: (session as any).title,
              description: (session as any).description,
              startTime: (session as any).startTime,
              endTime: (session as any).endTime,
              locationName: (session as any).locationName,
              locationAddress: (session as any).locationAddress,
              clientName: (session as any).clientName,
              icalUid: (session as any).icalUid,
              updatedAt: new Date(),
            })
            .where(eq(photographySessions.id, (byUid[0] as any).id))
            .returning();
          return updated as unknown as PhotographySession;
        }
      }

      // For imported sessions (with minimal fields), use raw SQL to avoid Drizzle array serialization bugs
      // For regular sessions, use upsert to enable updates
      const isImportedSession = (session as any).sessionType === 'imported' && 
                                 !(session as any).description && 
                                 !(session as any).clientEmail;
      
      console.error(`STORAGE_DEBUG | isImportedSession=${isImportedSession} | sessionType=${(session as any).sessionType} | id=${(session as any).id}`);
      
      let row: PhotographySession | undefined;
      
      if (isImportedSession) {
        console.error(`STORAGE_DEBUG | Using raw SQL for imported session`);
        // Use raw SQL INSERT to completely bypass Drizzle's array handling
        const s = session as any;
        await db.execute(sql`
          INSERT INTO photography_sessions (id, title, session_type, start_time, end_time, ical_uid)
          VALUES (${s.id}, ${s.title}, ${s.sessionType}, ${s.startTime}, ${s.endTime}, ${s.icalUid})
          ON CONFLICT (id) DO NOTHING
        `);
        console.error(`STORAGE_DEBUG | Raw SQL executed successfully`);
        // Fetch the inserted row
        const result = await db
          .select()
          .from(photographySessions)
          .where(eq(photographySessions.id, s.id))
          .limit(1);
        row = result[0] as unknown as PhotographySession | undefined;
      } else {
        // Regular upsert for non-imported sessions
        const upserted = await db
          .insert(photographySessions)
          .values(session as any)
          // @ts-ignore drizzle typing for onConflictDoUpdate target inference
          .onConflictDoUpdate({
            target: photographySessions.id,
            set: {
              title: (session as any).title,
              description: (session as any).description,
              startTime: (session as any).startTime,
              endTime: (session as any).endTime,
              locationName: (session as any).locationName,
              locationAddress: (session as any).locationAddress,
              clientName: (session as any).clientName,
              icalUid: (session as any).icalUid,
              updatedAt: new Date(),
            },
          })
          .returning();
        row = upserted[0] as unknown as PhotographySession | undefined;
      }

  // Secondary reconciliation: if we somehow didn't get a row back, try by icalUid
      if (!row && (session as any).icalUid) {
        const existingByUid = await db
          .select()
          .from(photographySessions)
          .where(eq(photographySessions.icalUid, (session as any).icalUid as any))
          .limit(1);
        if (existingByUid && existingByUid[0]) {
          const updated = await db
            .update(photographySessions)
            .set({
              title: (session as any).title,
              description: (session as any).description,
              startTime: (session as any).startTime,
              endTime: (session as any).endTime,
              locationName: (session as any).locationName,
              locationAddress: (session as any).locationAddress,
              clientName: (session as any).clientName,
              updatedAt: new Date(),
            })
            .where(eq(photographySessions.id, (existingByUid[0] as any).id))
            .returning();
          return updated[0] as unknown as PhotographySession;
        }
      }

      return row as PhotographySession;
    } catch (err) {
      console.error('createPhotographySession insert error:', err);
      throw err;
    }
  }

  async updatePhotographySession(id: string, updates: Partial<PhotographySession>): Promise<PhotographySession> {
    const result = await db.update(photographySessions).set(updates).where(eq(photographySessions.id, id)).returning();
    return result[0];
  }

  async deletePhotographySession(id: string): Promise<void> {
    await db.delete(photographySessions).where(eq(photographySessions.id, id));
  }

  // Gallery management
  async getGalleries(): Promise<Gallery[]> {
    return await db.select().from(galleries).orderBy(desc(galleries.createdAt));
  }

  async getGallery(id: string): Promise<Gallery | undefined> {
    const result = await db.select().from(galleries).where(eq(galleries.id, id)).limit(1);
    return result[0];
  }

  async getGalleryBySlug(slug: string): Promise<Gallery | undefined> {
    // First try to find by slug
    let result = await db.select().from(galleries).where(eq(galleries.slug, slug)).limit(1);
    if (result.length > 0) {
      return result[0];
    }
    // If not found by slug, try by ID (for UUID-based URLs)
    result = await db.select().from(galleries).where(eq(galleries.id, slug)).limit(1);
    return result[0];
  }

  async getClientGalleryWithCover(clientId: string): Promise<Gallery | undefined> {
    const result = await db.select()
      .from(galleries)
      .where(and(
        eq(galleries.clientId, clientId),
        isNotNull(galleries.coverImage)
      ))
      .orderBy(desc(galleries.createdAt))
      .limit(1);
    return result[0];
  }

  async createGallery(gallery: InsertGallery): Promise<Gallery> {
  const result = await db.insert(galleries).values(gallery as any).returning();
    return result[0];
  }

  async updateGallery(id: string, updates: Partial<Gallery>): Promise<Gallery> {
    const result = await db.update(galleries).set(updates).where(eq(galleries.id, id)).returning();
    return result[0];
  }

  async deleteGallery(id: string): Promise<void> {
    await db.delete(galleries).where(eq(galleries.id, id));
  }

  async getGalleryImages(galleryId: string): Promise<any[]> {
    const result = await db.select().from(galleryImages).where(eq(galleryImages.galleryId, galleryId)).orderBy(desc(galleryImages.createdAt));
    return result;
  }

  // Invoice management
  async getCrmInvoices(): Promise<any[]> {
    const result = await db.select({
      id: crmInvoices.id,
      invoice_number: crmInvoices.invoiceNumber,
      client_id: crmInvoices.clientId,
      issue_date: crmInvoices.issueDate,
      due_date: crmInvoices.dueDate,
      subtotal: crmInvoices.subtotal,
      tax_amount: crmInvoices.taxAmount,
      total: crmInvoices.total,
      status: crmInvoices.status,
      notes: crmInvoices.notes,
      created_at: crmInvoices.createdAt,
      client_name: sql`CONCAT(${crmClients.firstName}, ' ', ${crmClients.lastName})`,
      client_email: crmClients.email
    })
    .from(crmInvoices)
    .leftJoin(crmClients, eq(crmInvoices.clientId, crmClients.id))
    .orderBy(desc(crmInvoices.createdAt));
    return result;
  }

  async getCrmInvoice(id: string): Promise<CrmInvoice | undefined> {
    const result = await db.select().from(crmInvoices).where(eq(crmInvoices.id, id)).limit(1);
    return result[0];
  }

  async createCrmInvoice(invoice: InsertCrmInvoice): Promise<CrmInvoice> {
    // Generate invoice number if not provided
    if (!invoice.invoiceNumber) {
      const currentYear = new Date().getFullYear();
      const existingInvoices = await db.select().from(crmInvoices);
      const nextNumber = existingInvoices.length + 1;
      invoice.invoiceNumber = `${currentYear}-${String(nextNumber).padStart(4, '0')}`;
    }
    
  const result = await db.insert(crmInvoices).values(invoice as any).returning();
    return result[0];
  }

  async updateCrmInvoice(id: string, updates: Partial<CrmInvoice>): Promise<CrmInvoice> {
    const result = await db.update(crmInvoices).set(updates).where(eq(crmInvoices.id, id)).returning();
    return result[0];
  }

  async deleteCrmInvoice(id: string): Promise<void> {
    await db.delete(crmInvoices).where(eq(crmInvoices.id, id));
  }

  // Invoice Items management
  async getCrmInvoiceItems(invoiceId: string): Promise<CrmInvoiceItem[]> {
    const result = await db.select().from(crmInvoiceItems).where(eq(crmInvoiceItems.invoiceId, invoiceId)).orderBy(asc(crmInvoiceItems.sortOrder));
    return result;
  }

  async createCrmInvoiceItems(items: InsertCrmInvoiceItem[]): Promise<CrmInvoiceItem[]> {
  const result = await db.insert(crmInvoiceItems).values(items as any).returning();
    return result;
  }

  async getCrmInvoicePayments(invoiceId: string): Promise<CrmInvoicePayment[]> {
    const result = await db.select().from(crmInvoicePayments)
      .where(eq(crmInvoicePayments.invoiceId, invoiceId))
      .orderBy(desc(crmInvoicePayments.paymentDate));
    return result;
  }

  async createCrmInvoicePayment(payment: InsertCrmInvoicePayment): Promise<CrmInvoicePayment> {
  const result = await db.insert(crmInvoicePayments).values(payment as any).returning();
    return result[0];
  }

  async deleteCrmInvoicePayment(paymentId: string): Promise<void> {
    await db.delete(crmInvoicePayments).where(eq(crmInvoicePayments.id, paymentId));
  }

  // CRM Message methods
  async getCrmMessages(): Promise<CrmMessage[]> {
    try {
      // Select a safe subset of columns that excludes optional 'direction'
      const rows = await db
        .select({
          id: crmMessages.id,
          senderName: crmMessages.senderName,
          senderEmail: crmMessages.senderEmail,
          recipientEmail: crmMessages.recipientEmail,
          subject: crmMessages.subject,
          content: crmMessages.content,
          messageType: crmMessages.messageType,
          status: crmMessages.status,
          direction: crmMessages.direction,
          clientId: crmMessages.clientId,
          emailMessageId: crmMessages.emailMessageId,
          emailHeaders: crmMessages.emailHeaders,
          attachments: crmMessages.attachments,
          smsMessageId: crmMessages.smsMessageId,
          phoneNumber: crmMessages.phoneNumber,
          smsProvider: crmMessages.smsProvider,
          smsStatus: crmMessages.smsStatus,
          campaignId: crmMessages.campaignId,
          sentAt: crmMessages.sentAt,
          deliveredAt: crmMessages.deliveredAt,
          readAt: crmMessages.readAt,
          repliedAt: crmMessages.repliedAt,
          createdAt: crmMessages.createdAt,
          updatedAt: crmMessages.updatedAt,
        })
        .from(crmMessages)
        .orderBy(desc(crmMessages.createdAt));
      return rows as unknown as CrmMessage[];
    } catch (err) {
      // Fallback to raw SQL if schema mismatch occurs
      // @ts-ignore
      const result: any = await db.execute(sql`SELECT * FROM crm_messages ORDER BY created_at DESC`);
      return result as CrmMessage[];
    }
  }

  async getCrmMessage(id: string): Promise<CrmMessage | undefined> {
    try {
      const results = await db
        .select({
          id: crmMessages.id,
          senderName: crmMessages.senderName,
          senderEmail: crmMessages.senderEmail,
          recipientEmail: crmMessages.recipientEmail,
          subject: crmMessages.subject,
          content: crmMessages.content,
          messageType: crmMessages.messageType,
          status: crmMessages.status,
          direction: crmMessages.direction,
          clientId: crmMessages.clientId,
          emailMessageId: crmMessages.emailMessageId,
          emailHeaders: crmMessages.emailHeaders,
          attachments: crmMessages.attachments,
          smsMessageId: crmMessages.smsMessageId,
          phoneNumber: crmMessages.phoneNumber,
          smsProvider: crmMessages.smsProvider,
          smsStatus: crmMessages.smsStatus,
          campaignId: crmMessages.campaignId,
          sentAt: crmMessages.sentAt,
          deliveredAt: crmMessages.deliveredAt,
          readAt: crmMessages.readAt,
          repliedAt: crmMessages.repliedAt,
          createdAt: crmMessages.createdAt,
          updatedAt: crmMessages.updatedAt,
        })
        .from(crmMessages)
        .where(eq(crmMessages.id, id));
      return results[0] as unknown as CrmMessage;
    } catch {
      // @ts-ignore
      const result: any = await db.execute(sql`SELECT * FROM crm_messages WHERE id = ${id} LIMIT 1`);
      return (Array.isArray(result) ? result[0] : result?.rows?.[0]) as CrmMessage | undefined;
    }
  }

  async createCrmMessage(message: InsertCrmMessage): Promise<CrmMessage> {
    // Some databases might not have certain optional columns like 'direction'.
    // To avoid runtime errors (e.g., "column \"direction\" does not exist"),
    // filter out fields that commonly cause issues and let defaults apply.
  const safeMessage: any = { ...message };
    // Do not force 'direction' on insert; schema default will apply on DBs that have it
    delete safeMessage.direction;
    // Normalize attachments JSON: if provided as stringified JSON elsewhere, keep as-is; otherwise pass object
    if (safeMessage.attachments && typeof safeMessage.attachments !== 'string') {
      safeMessage.attachments = JSON.stringify(safeMessage.attachments);
    }
    const results = await db
      .insert(crmMessages)
      .values(safeMessage as any)
      .returning({ id: crmMessages.id, createdAt: crmMessages.createdAt });
    return results[0] as unknown as CrmMessage;
  }

  async updateCrmMessage(id: string, updates: Partial<CrmMessage>): Promise<CrmMessage> {
    const results = await db.update(crmMessages)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(crmMessages.id, id))
      .returning({ id: crmMessages.id, updatedAt: crmMessages.updatedAt });
    return results[0] as unknown as CrmMessage;
  }

  async deleteCrmMessage(id: string): Promise<void> {
    await db.delete(crmMessages).where(eq(crmMessages.id, id));
  }

  // Voucher Products management
  async getVoucherProducts(): Promise<VoucherProduct[]> {
    return await db.select().from(voucherProducts).orderBy(asc(voucherProducts.displayOrder), desc(voucherProducts.createdAt));
  }

  async getVoucherProduct(id: string): Promise<VoucherProduct | undefined> {
    const results = await db.select().from(voucherProducts).where(eq(voucherProducts.id, id));
    return results[0];
  }

  async createVoucherProduct(product: InsertVoucherProduct): Promise<VoucherProduct> {
  console.log('[STORAGE] Creating voucher product with data:', product);
  console.log('[STORAGE] Product keys:', Object.keys(product));
  
  // Remove any undefined or null values
  const cleanProduct = Object.fromEntries(
    Object.entries(product).filter(([_, value]) => value !== undefined && value !== null)
  );
  console.log('[STORAGE] Clean product data:', cleanProduct);
  console.log('[STORAGE] Clean product keys:', Object.keys(cleanProduct));
  
  try {
    const results = await db.insert(voucherProducts).values(cleanProduct as any).returning();
    console.log('[STORAGE] Insert successful:', results[0]);
    return results[0];
  } catch (error) {
    console.error('[STORAGE] Insert error:', error);
    throw error;
  }
}

  async updateVoucherProduct(id: string, updates: Partial<VoucherProduct>): Promise<VoucherProduct> {
    const results = await db.update(voucherProducts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(voucherProducts.id, id))
      .returning();
    return results[0];
  }

  async deleteVoucherProduct(id: string): Promise<void> {
    await db.delete(voucherProducts).where(eq(voucherProducts.id, id));
  }

  // Discount Coupons management
  async getDiscountCoupons(): Promise<DiscountCoupon[]> {
    return await db.select().from(discountCoupons).orderBy(desc(discountCoupons.createdAt));
  }

  async getDiscountCoupon(id: string): Promise<DiscountCoupon | undefined> {
    const results = await db.select().from(discountCoupons).where(eq(discountCoupons.id, id));
    return results[0];
  }

  async getDiscountCouponByCode(code: string): Promise<DiscountCoupon | undefined> {
    const results = await db.select().from(discountCoupons).where(eq(discountCoupons.code, code));
    return results[0];
  }

  async createDiscountCoupon(coupon: InsertDiscountCoupon): Promise<DiscountCoupon> {
  const results = await db.insert(discountCoupons).values(coupon as any).returning();
    return results[0];
  }

  async updateDiscountCoupon(id: string, updates: Partial<DiscountCoupon>): Promise<DiscountCoupon> {
    const results = await db.update(discountCoupons)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(discountCoupons.id, id))
      .returning();
    return results[0];
  }

  async deleteDiscountCoupon(id: string): Promise<void> {
    await db.delete(discountCoupons).where(eq(discountCoupons.id, id));
  }

  // Voucher Sales management
  async getVoucherSales(): Promise<VoucherSale[]> {
    return await db.select().from(voucherSales).orderBy(desc(voucherSales.createdAt));
  }

  async getVoucherSale(id: string): Promise<VoucherSale | undefined> {
    const results = await db.select().from(voucherSales).where(eq(voucherSales.id, id));
    return results[0];
  }

  async getVoucherSaleByCode(code: string): Promise<VoucherSale | undefined> {
    const results = await db.select().from(voucherSales).where(eq(voucherSales.voucherCode, code));
    return results[0];
  }

  async createVoucherSale(sale: InsertVoucherSale): Promise<VoucherSale> {
  const results = await db.insert(voucherSales).values(sale as any).returning();
    return results[0];
  }

  async updateVoucherSale(id: string, updates: Partial<VoucherSale>): Promise<VoucherSale> {
    const results = await db.update(voucherSales)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(voucherSales.id, id))
      .returning();
    return results[0];
  }

  async deleteVoucherSale(id: string): Promise<void> {
    await db.delete(voucherSales).where(eq(voucherSales.id, id));
  }

  // Coupon Usage management
  async getCouponUsage(couponId: string): Promise<CouponUsage[]> {
    return await db.select().from(couponUsage).where(eq(couponUsage.couponId, couponId)).orderBy(desc(couponUsage.usedAt));
  }

  async createCouponUsage(usage: InsertCouponUsage): Promise<CouponUsage> {
  const results = await db.insert(couponUsage).values(usage as any).returning();
    return results[0];
  }

  // AutoBlog helper methods
  async getAllBlogSlugs(): Promise<string[]> {
    const results = await db.select({ slug: blogPosts.slug }).from(blogPosts);
    return results.map(r => r.slug);
  }

  async savePublicAsset(bucket: string, filename: string, buffer: Buffer): Promise<string> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    // Create directory structure if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'server', 'public', bucket);
    
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
    
    // Save file
    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, buffer);
    
    // Return absolute public URL that OpenAI can access
    const baseUrl = process.env.PUBLIC_SITE_BASE_URL || process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
      : 'http://localhost:5000';
    
    return `${baseUrl}/${bucket}/${filename}`;
  }

  // Email Settings management
  async saveEmailSettings(settings: any): Promise<any> {
    // Create email_settings table if it doesn't exist using raw query
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS email_settings (
        id SERIAL PRIMARY KEY,
        smtp_host VARCHAR(255),
        smtp_port INTEGER DEFAULT 587,
        smtp_user VARCHAR(255),
        smtp_pass VARCHAR(255),
        from_email VARCHAR(255),
        from_name VARCHAR(255),
        email_signature TEXT,
        signature_enabled BOOLEAN DEFAULT FALSE,
        out_of_office_enabled BOOLEAN DEFAULT FALSE,
        out_of_office_message TEXT,
        out_of_office_start_date DATE,
        out_of_office_end_date DATE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Add new columns if they don't exist (for existing tables)
    try {
      await db.execute(sql`ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS email_signature TEXT`);
      await db.execute(sql`ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS signature_enabled BOOLEAN DEFAULT FALSE`);
      await db.execute(sql`ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS out_of_office_enabled BOOLEAN DEFAULT FALSE`);
      await db.execute(sql`ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS out_of_office_message TEXT`);
      await db.execute(sql`ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS out_of_office_start_date DATE`);
      await db.execute(sql`ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS out_of_office_end_date DATE`);
    } catch (err) {
      // Columns might already exist, ignore error
    }

    // Check if settings exist
    const existing = await db.execute(sql`SELECT id FROM email_settings LIMIT 1` as any);
    const existingRows: any[] | undefined = (existing as any)?.rows ?? (Array.isArray(existing) ? existing : undefined);

    if (existingRows && existingRows.length > 0) {
      // Update existing settings
      const result = await db.execute(sql`
        UPDATE email_settings 
        SET smtp_host = ${settings.smtp_host}, 
            smtp_port = ${settings.smtp_port}, 
            smtp_user = ${settings.smtp_user}, 
            smtp_pass = ${settings.smtp_pass}, 
            from_email = ${settings.from_email}, 
            from_name = ${settings.from_name},
            email_signature = ${settings.email_signature || null},
            signature_enabled = ${settings.signature_enabled || false},
            out_of_office_enabled = ${settings.out_of_office_enabled || false},
            out_of_office_message = ${settings.out_of_office_message || null},
            out_of_office_start_date = ${settings.out_of_office_start_date || null},
            out_of_office_end_date = ${settings.out_of_office_end_date || null},
            updated_at = NOW()
        WHERE id = ${existingRows[0].id}
        RETURNING *
      ` as any);
      const updateRows: any[] | undefined = (result as any)?.rows ?? (Array.isArray(result) ? result : undefined);
      return updateRows ? updateRows[0] : (result as any);
    } else {
      // Insert new settings
      const result = await db.execute(sql`
        INSERT INTO email_settings (
          smtp_host, smtp_port, smtp_user, smtp_pass, from_email, from_name,
          email_signature, signature_enabled,
          out_of_office_enabled, out_of_office_message, out_of_office_start_date, out_of_office_end_date
        )
        VALUES (
          ${settings.smtp_host}, ${settings.smtp_port}, ${settings.smtp_user}, ${settings.smtp_pass}, ${settings.from_email}, ${settings.from_name},
          ${settings.email_signature || null}, ${settings.signature_enabled || false},
          ${settings.out_of_office_enabled || false}, ${settings.out_of_office_message || null}, ${settings.out_of_office_start_date || null}, ${settings.out_of_office_end_date || null}
        )
        RETURNING *
      ` as any);
      const insertRows: any[] | undefined = (result as any)?.rows ?? (Array.isArray(result) ? result : undefined);
      return insertRows ? insertRows[0] : (result as any);
    }
  }

  async getEmailSettings(): Promise<any> {
    try {
      const result = await db.execute(sql`SELECT * FROM email_settings ORDER BY updated_at DESC LIMIT 1` as any);
      const rows: any[] | undefined = (result as any)?.rows ?? (Array.isArray(result) ? result : undefined);
      
      if (rows && rows.length > 0) {
        return rows[0];
      } else {
        // Return environment-driven defaults if no custom settings exist
        const envFrom = process.env.STUDIO_NOTIFY_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER || '';
        return {
          smtp_host: process.env.SMTP_HOST || 'smtp.easyname.com',
          smtp_port: Number(process.env.SMTP_PORT || 587),
          smtp_user: process.env.SMTP_USER || '',
          smtp_pass: process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || '',
          from_email: envFrom,
          from_name: process.env.EMAIL_FROM_NAME || 'New Age Fotografie',
          // Signature defaults
          email_signature: '',
          signature_enabled: false,
          // Out of office defaults
          out_of_office_enabled: false,
          out_of_office_message: '',
          out_of_office_start_date: null,
          out_of_office_end_date: null
        };
      }
    } catch (error) {
      console.error('Error getting email settings:', error);
      // Return environment-driven defaults on error (avoid hardcoded email)
      const envFrom = process.env.STUDIO_NOTIFY_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER || '';
      return {
        smtp_host: process.env.SMTP_HOST || 'smtp.easyname.com',
        smtp_port: Number(process.env.SMTP_PORT || 587),
        smtp_user: process.env.SMTP_USER || '',
        smtp_pass: process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || '',
        from_email: envFrom,
        from_name: process.env.EMAIL_FROM_NAME || 'New Age Fotografie',
        // Signature defaults
        email_signature: '',
        signature_enabled: false,
        // Out of office defaults
        out_of_office_enabled: false,
        out_of_office_message: '',
        out_of_office_start_date: null,
        out_of_office_end_date: null
      };
    }
  }
}

export const storage = new DatabaseStorage();

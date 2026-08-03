"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storage = exports.DatabaseStorage = void 0;
const schema_js_1 = require("../shared/schema.js");
const db_1 = require("./db");
const drizzle_orm_1 = require("drizzle-orm");
const validator_1 = __importDefault(require("validator"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const fs_1 = __importDefault(require("fs"));
class DatabaseStorage {
    // Admin User management (authentication)
    async getAdminUser(id) {
        const result = await db_1.db.select().from(schema_js_1.adminUsers).where((0, drizzle_orm_1.eq)(schema_js_1.adminUsers.id, id)).limit(1);
        return result[0];
    }
    async getAdminUserByEmail(email) {
        const result = await db_1.db.select().from(schema_js_1.adminUsers).where((0, drizzle_orm_1.eq)(schema_js_1.adminUsers.email, email)).limit(1);
        return result[0];
    }
    async createAdminUser(user) {
        const result = await db_1.db.insert(schema_js_1.adminUsers).values(user).returning();
        return result[0];
    }
    async updateAdminUser(id, updates) {
        const result = await db_1.db.update(schema_js_1.adminUsers).set(updates).where((0, drizzle_orm_1.eq)(schema_js_1.adminUsers.id, id)).returning();
        return result[0];
    }
    async deleteAdminUser(id) {
        await db_1.db.delete(schema_js_1.adminUsers).where((0, drizzle_orm_1.eq)(schema_js_1.adminUsers.id, id));
    }
    // Legacy User management (CRM clients)
    async getUser(id) {
        const result = await db_1.db.select().from(schema_js_1.users).where((0, drizzle_orm_1.eq)(schema_js_1.users.id, id)).limit(1);
        return result[0];
    }
    async getUserByEmail(email) {
        const result = await db_1.db.select().from(schema_js_1.users).where((0, drizzle_orm_1.eq)(schema_js_1.users.email, email)).limit(1);
        return result[0];
    }
    async createUser(user) {
        const result = await db_1.db.insert(schema_js_1.users).values(user).returning();
        return result[0];
    }
    async updateUser(id, updates) {
        const result = await db_1.db.update(schema_js_1.users).set(updates).where((0, drizzle_orm_1.eq)(schema_js_1.users.id, id)).returning();
        return result[0];
    }
    async deleteUser(id) {
        await db_1.db.delete(schema_js_1.users).where((0, drizzle_orm_1.eq)(schema_js_1.users.id, id));
    }
    // Blog management
    async getBlogPosts(published) {
        const baseQuery = db_1.db.select().from(schema_js_1.blogPosts);
        let filtered = baseQuery;
        // If filtering for published posts, also check that publishedAt <= now
        if (published === true) {
            filtered = filtered.where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.blogPosts.published, true), (0, drizzle_orm_1.sql) `${schema_js_1.blogPosts.publishedAt} <= NOW()`));
        }
        else if (published === false) {
            filtered = filtered.where((0, drizzle_orm_1.eq)(schema_js_1.blogPosts.published, false));
        }
        // If published is undefined, return all posts regardless of date (for admin)
        return await filtered.orderBy((0, drizzle_orm_1.desc)(schema_js_1.blogPosts.createdAt));
    }
    async getBlogPost(id) {
        const result = await db_1.db.select().from(schema_js_1.blogPosts).where((0, drizzle_orm_1.eq)(schema_js_1.blogPosts.id, id)).limit(1);
        return result[0];
    }
    async getBlogPostBySlug(slug) {
        const result = await db_1.db.select().from(schema_js_1.blogPosts).where((0, drizzle_orm_1.eq)(schema_js_1.blogPosts.slug, slug)).limit(1);
        return result[0];
    }
    async createBlogPost(post) {
        const result = await db_1.db.insert(schema_js_1.blogPosts).values(post).returning();
        return result[0];
    }
    async updateBlogPost(id, updates) {
        const result = await db_1.db.update(schema_js_1.blogPosts).set(updates).where((0, drizzle_orm_1.eq)(schema_js_1.blogPosts.id, id)).returning();
        return result[0];
    }
    async deleteBlogPost(id) {
        await db_1.db.delete(schema_js_1.blogPosts).where((0, drizzle_orm_1.eq)(schema_js_1.blogPosts.id, id));
    }
    // CRM Client management
    async getCrmClients() {
        return await db_1.db.select().from(schema_js_1.crmClients).orderBy((0, drizzle_orm_1.desc)(schema_js_1.crmClients.createdAt));
    }
    async getCrmClient(id) {
        const result = await db_1.db.select().from(schema_js_1.crmClients).where((0, drizzle_orm_1.eq)(schema_js_1.crmClients.id, id)).limit(1);
        return result[0];
    }
    async createCrmClient(client) {
        // Email validation - Fix #1 from triage playbook
        if (client.email && !validator_1.default.isEmail(client.email)) {
            throw new Error(`Invalid email address: ${client.email}. Please provide a valid email format.`);
        }
        const result = await db_1.db.insert(schema_js_1.crmClients).values(client).returning();
        return result[0];
    }
    async updateCrmClient(id, updates) {
        const result = await db_1.db.update(schema_js_1.crmClients).set(updates).where((0, drizzle_orm_1.eq)(schema_js_1.crmClients.id, id)).returning();
        return result[0];
    }
    async deleteCrmClient(id) {
        await db_1.db.delete(schema_js_1.crmClients).where((0, drizzle_orm_1.eq)(schema_js_1.crmClients.id, id));
    }
    // Lead Sources management
    async getLeadSources() {
        return await db_1.db.select().from(schema_js_1.leadSources).orderBy(schema_js_1.leadSources.sortOrder, schema_js_1.leadSources.name);
    }
    async getLeadSource(id) {
        const result = await db_1.db.select().from(schema_js_1.leadSources).where((0, drizzle_orm_1.eq)(schema_js_1.leadSources.id, id)).limit(1);
        return result[0];
    }
    async createLeadSource(source) {
        const result = await db_1.db.insert(schema_js_1.leadSources).values(source).returning();
        return result[0];
    }
    async updateLeadSource(id, updates) {
        const result = await db_1.db.update(schema_js_1.leadSources).set(updates).where((0, drizzle_orm_1.eq)(schema_js_1.leadSources.id, id)).returning();
        return result[0];
    }
    async deleteLeadSource(id) {
        await db_1.db.delete(schema_js_1.leadSources).where((0, drizzle_orm_1.eq)(schema_js_1.leadSources.id, id));
    }
    // CRM Lead management
    async getCrmLeads(status) {
        const baseLeads = db_1.db.select().from(schema_js_1.crmLeads);
        const filteredLeads = (status && status !== 'all')
            ? baseLeads.where((0, drizzle_orm_1.eq)(schema_js_1.crmLeads.status, status))
            : baseLeads;
        return await filteredLeads.orderBy((0, drizzle_orm_1.desc)(schema_js_1.crmLeads.createdAt));
    }
    async getCrmLead(id) {
        const result = await db_1.db.select().from(schema_js_1.crmLeads).where((0, drizzle_orm_1.eq)(schema_js_1.crmLeads.id, id)).limit(1);
        return result[0];
    }
    async createCrmLead(lead) {
        // Email validation - Fix #1 from triage playbook
        if (lead.email && !validator_1.default.isEmail(lead.email)) {
            throw new Error(`Invalid email address: ${lead.email}. Please provide a valid email format.`);
        }
        const result = await db_1.db.insert(schema_js_1.crmLeads).values(lead).returning();
        return result[0];
    }
    async updateCrmLead(id, updates) {
        const result = await db_1.db.update(schema_js_1.crmLeads).set(updates).where((0, drizzle_orm_1.eq)(schema_js_1.crmLeads.id, id)).returning();
        return result[0];
    }
    async deleteCrmLead(id) {
        await db_1.db.delete(schema_js_1.crmLeads).where((0, drizzle_orm_1.eq)(schema_js_1.crmLeads.id, id));
    }
    // Photography Session management
    async getPhotographySessions(photographerId) {
        const baseSessions = db_1.db.select().from(schema_js_1.photographySessions);
        const filteredSessions = photographerId
            ? baseSessions.where((0, drizzle_orm_1.eq)(schema_js_1.photographySessions.photographerId, photographerId))
            : baseSessions;
        return await filteredSessions.orderBy((0, drizzle_orm_1.asc)(schema_js_1.photographySessions.startTime));
    }
    async getPhotographySession(id) {
        const result = await db_1.db.select().from(schema_js_1.photographySessions).where((0, drizzle_orm_1.eq)(schema_js_1.photographySessions.id, id)).limit(1);
        return result[0];
    }
    async createPhotographySession(session) {
        try {
            // Debug snapshot (best-effort)
            try {
                const inspectFields = ['startTime', 'endTime', 'deliveryDate', 'createdAt', 'updatedAt'];
                const parts = [];
                for (const f of inspectFields) {
                    const v = session[f];
                    const t = v === undefined ? 'undefined' : (v && v.constructor ? v.constructor.name : typeof v);
                    const val = v instanceof Date ? (isNaN(v.getTime()) ? 'InvalidDate' : v.toISOString()) : (v === undefined ? 'null' : String(v));
                    parts.push(`${f}=${t}:${val}`);
                }
                const line = `DEBUG_LOG | sessionId=${session.id || ''} | ${parts.join(' | ')}\n`;
                const tmpDir = os_1.default.tmpdir();
                const debugPath = path_1.default.join(tmpDir, 'clean-crm-debug_import.log');
                fs_1.default.appendFileSync(debugPath, line, { encoding: 'utf8' });
            }
            catch { }
            // Normalize timestamp-like fields into Date objects
            const coerceToDate = (v) => {
                if (v === undefined || v === null)
                    return null;
                if (v instanceof Date)
                    return isNaN(v.getTime()) ? null : v;
                if (typeof v === 'number') {
                    const d = new Date(v);
                    return isNaN(d.getTime()) ? null : d;
                }
                if (typeof v === 'string') {
                    const d = new Date(v);
                    return isNaN(d.getTime()) ? null : d;
                }
                try {
                    if (typeof v?.toDate === 'function') {
                        const d = v.toDate();
                        return d instanceof Date && !isNaN(d.getTime()) ? d : null;
                    }
                    if (typeof v?.toISOString === 'function') {
                        const d = new Date(v.toISOString());
                        return !isNaN(d.getTime()) ? d : null;
                    }
                    if (typeof v?.seconds === 'number') {
                        const d = new Date(v.seconds * 1000);
                        return !isNaN(d.getTime()) ? d : null;
                    }
                }
                catch { }
                try {
                    const d = new Date(String(v));
                    return isNaN(d.getTime()) ? null : d;
                }
                catch {
                    return null;
                }
            };
            for (const f of ['startTime', 'endTime', 'deliveryDate', 'createdAt', 'updatedAt']) {
                const coerced = coerceToDate(session[f]);
                if (coerced)
                    session[f] = coerced;
            }
            // If we have an iCal UID, reconcile by that first to prevent duplicates across imports
            if (session.icalUid) {
                const byUid = await db_1.db
                    .select()
                    .from(schema_js_1.photographySessions)
                    .where((0, drizzle_orm_1.eq)(schema_js_1.photographySessions.icalUid, session.icalUid))
                    .limit(1);
                if (byUid && byUid[0]) {
                    const [updated] = await db_1.db
                        .update(schema_js_1.photographySessions)
                        .set({
                        title: session.title,
                        description: session.description,
                        startTime: session.startTime,
                        endTime: session.endTime,
                        locationName: session.locationName,
                        locationAddress: session.locationAddress,
                        clientName: session.clientName,
                        icalUid: session.icalUid,
                        updatedAt: new Date(),
                    })
                        .where((0, drizzle_orm_1.eq)(schema_js_1.photographySessions.id, byUid[0].id))
                        .returning();
                    return updated;
                }
            }
            // For imported sessions (with minimal fields), use raw SQL to avoid Drizzle array serialization bugs
            // For regular sessions, use upsert to enable updates
            const isImportedSession = session.sessionType === 'imported' &&
                !session.description &&
                !session.clientEmail;
            console.error(`STORAGE_DEBUG | isImportedSession=${isImportedSession} | sessionType=${session.sessionType} | id=${session.id}`);
            let row;
            if (isImportedSession) {
                console.error(`STORAGE_DEBUG | Using raw SQL for imported session`);
                // Use raw SQL INSERT to completely bypass Drizzle's array handling
                const s = session;
                await db_1.db.execute((0, drizzle_orm_1.sql) `
          INSERT INTO photography_sessions (id, title, session_type, start_time, end_time, ical_uid)
          VALUES (${s.id}, ${s.title}, ${s.sessionType}, ${s.startTime}, ${s.endTime}, ${s.icalUid})
          ON CONFLICT (id) DO NOTHING
        `);
                console.error(`STORAGE_DEBUG | Raw SQL executed successfully`);
                // Fetch the inserted row
                const result = await db_1.db
                    .select()
                    .from(schema_js_1.photographySessions)
                    .where((0, drizzle_orm_1.eq)(schema_js_1.photographySessions.id, s.id))
                    .limit(1);
                row = result[0];
            }
            else {
                // Regular upsert for non-imported sessions
                const upserted = await db_1.db
                    .insert(schema_js_1.photographySessions)
                    .values(session)
                    // @ts-ignore drizzle typing for onConflictDoUpdate target inference
                    .onConflictDoUpdate({
                    target: schema_js_1.photographySessions.id,
                    set: {
                        title: session.title,
                        description: session.description,
                        startTime: session.startTime,
                        endTime: session.endTime,
                        locationName: session.locationName,
                        locationAddress: session.locationAddress,
                        clientName: session.clientName,
                        icalUid: session.icalUid,
                        updatedAt: new Date(),
                    },
                })
                    .returning();
                row = upserted[0];
            }
            // Secondary reconciliation: if we somehow didn't get a row back, try by icalUid
            if (!row && session.icalUid) {
                const existingByUid = await db_1.db
                    .select()
                    .from(schema_js_1.photographySessions)
                    .where((0, drizzle_orm_1.eq)(schema_js_1.photographySessions.icalUid, session.icalUid))
                    .limit(1);
                if (existingByUid && existingByUid[0]) {
                    const updated = await db_1.db
                        .update(schema_js_1.photographySessions)
                        .set({
                        title: session.title,
                        description: session.description,
                        startTime: session.startTime,
                        endTime: session.endTime,
                        locationName: session.locationName,
                        locationAddress: session.locationAddress,
                        clientName: session.clientName,
                        updatedAt: new Date(),
                    })
                        .where((0, drizzle_orm_1.eq)(schema_js_1.photographySessions.id, existingByUid[0].id))
                        .returning();
                    return updated[0];
                }
            }
            return row;
        }
        catch (err) {
            console.error('createPhotographySession insert error:', err);
            throw err;
        }
    }
    async updatePhotographySession(id, updates) {
        const result = await db_1.db.update(schema_js_1.photographySessions).set(updates).where((0, drizzle_orm_1.eq)(schema_js_1.photographySessions.id, id)).returning();
        return result[0];
    }
    async deletePhotographySession(id) {
        await db_1.db.delete(schema_js_1.photographySessions).where((0, drizzle_orm_1.eq)(schema_js_1.photographySessions.id, id));
    }
    // Gallery management
    async getGalleries() {
        return await db_1.db.select().from(schema_js_1.galleries).orderBy((0, drizzle_orm_1.desc)(schema_js_1.galleries.createdAt));
    }
    async getGallery(id) {
        const result = await db_1.db.select().from(schema_js_1.galleries).where((0, drizzle_orm_1.eq)(schema_js_1.galleries.id, id)).limit(1);
        return result[0];
    }
    async getGalleryBySlug(slug) {
        // First try to find by slug
        let result = await db_1.db.select().from(schema_js_1.galleries).where((0, drizzle_orm_1.eq)(schema_js_1.galleries.slug, slug)).limit(1);
        if (result.length > 0) {
            return result[0];
        }
        // If not found by slug, try by ID (for UUID-based URLs)
        result = await db_1.db.select().from(schema_js_1.galleries).where((0, drizzle_orm_1.eq)(schema_js_1.galleries.id, slug)).limit(1);
        return result[0];
    }
    async getClientGalleryWithCover(clientId) {
        const result = await db_1.db.select()
            .from(schema_js_1.galleries)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.galleries.clientId, clientId), (0, drizzle_orm_1.isNotNull)(schema_js_1.galleries.coverImage)))
            .orderBy((0, drizzle_orm_1.desc)(schema_js_1.galleries.createdAt))
            .limit(1);
        return result[0];
    }
    async createGallery(gallery) {
        const result = await db_1.db.insert(schema_js_1.galleries).values(gallery).returning();
        return result[0];
    }
    async updateGallery(id, updates) {
        const result = await db_1.db.update(schema_js_1.galleries).set(updates).where((0, drizzle_orm_1.eq)(schema_js_1.galleries.id, id)).returning();
        return result[0];
    }
    async deleteGallery(id) {
        await db_1.db.delete(schema_js_1.galleries).where((0, drizzle_orm_1.eq)(schema_js_1.galleries.id, id));
    }
    async getGalleryImages(galleryId) {
        const result = await db_1.db.select().from(schema_js_1.galleryImages).where((0, drizzle_orm_1.eq)(schema_js_1.galleryImages.galleryId, galleryId)).orderBy((0, drizzle_orm_1.desc)(schema_js_1.galleryImages.createdAt));
        return result;
    }
    // Invoice management
    async getCrmInvoices() {
        const result = await db_1.db.select({
            id: schema_js_1.crmInvoices.id,
            invoice_number: schema_js_1.crmInvoices.invoiceNumber,
            client_id: schema_js_1.crmInvoices.clientId,
            issue_date: schema_js_1.crmInvoices.issueDate,
            due_date: schema_js_1.crmInvoices.dueDate,
            subtotal: schema_js_1.crmInvoices.subtotal,
            tax_amount: schema_js_1.crmInvoices.taxAmount,
            total: schema_js_1.crmInvoices.total,
            status: schema_js_1.crmInvoices.status,
            notes: schema_js_1.crmInvoices.notes,
            created_at: schema_js_1.crmInvoices.createdAt,
            client_name: (0, drizzle_orm_1.sql) `CONCAT(${schema_js_1.crmClients.firstName}, ' ', ${schema_js_1.crmClients.lastName})`,
            client_email: schema_js_1.crmClients.email
        })
            .from(schema_js_1.crmInvoices)
            .leftJoin(schema_js_1.crmClients, (0, drizzle_orm_1.eq)(schema_js_1.crmInvoices.clientId, schema_js_1.crmClients.id))
            .orderBy((0, drizzle_orm_1.desc)(schema_js_1.crmInvoices.createdAt));
        return result;
    }
    async getCrmInvoice(id) {
        const result = await db_1.db.select().from(schema_js_1.crmInvoices).where((0, drizzle_orm_1.eq)(schema_js_1.crmInvoices.id, id)).limit(1);
        return result[0];
    }
    async createCrmInvoice(invoice) {
        // Generate invoice number if not provided
        if (!invoice.invoiceNumber) {
            const currentYear = new Date().getFullYear();
            const existingInvoices = await db_1.db.select().from(schema_js_1.crmInvoices);
            const nextNumber = existingInvoices.length + 1;
            invoice.invoiceNumber = `${currentYear}-${String(nextNumber).padStart(4, '0')}`;
        }
        const result = await db_1.db.insert(schema_js_1.crmInvoices).values(invoice).returning();
        return result[0];
    }
    async updateCrmInvoice(id, updates) {
        const result = await db_1.db.update(schema_js_1.crmInvoices).set(updates).where((0, drizzle_orm_1.eq)(schema_js_1.crmInvoices.id, id)).returning();
        return result[0];
    }
    async deleteCrmInvoice(id) {
        await db_1.db.delete(schema_js_1.crmInvoices).where((0, drizzle_orm_1.eq)(schema_js_1.crmInvoices.id, id));
    }
    // Invoice Items management
    async getCrmInvoiceItems(invoiceId) {
        const result = await db_1.db.select().from(schema_js_1.crmInvoiceItems).where((0, drizzle_orm_1.eq)(schema_js_1.crmInvoiceItems.invoiceId, invoiceId)).orderBy((0, drizzle_orm_1.asc)(schema_js_1.crmInvoiceItems.sortOrder));
        return result;
    }
    async createCrmInvoiceItems(items) {
        const result = await db_1.db.insert(schema_js_1.crmInvoiceItems).values(items).returning();
        return result;
    }
    async getCrmInvoicePayments(invoiceId) {
        const result = await db_1.db.select().from(schema_js_1.crmInvoicePayments)
            .where((0, drizzle_orm_1.eq)(schema_js_1.crmInvoicePayments.invoiceId, invoiceId))
            .orderBy((0, drizzle_orm_1.desc)(schema_js_1.crmInvoicePayments.paymentDate));
        return result;
    }
    async createCrmInvoicePayment(payment) {
        const result = await db_1.db.insert(schema_js_1.crmInvoicePayments).values(payment).returning();
        return result[0];
    }
    async deleteCrmInvoicePayment(paymentId) {
        await db_1.db.delete(schema_js_1.crmInvoicePayments).where((0, drizzle_orm_1.eq)(schema_js_1.crmInvoicePayments.id, paymentId));
    }
    // CRM Message methods
    async getCrmMessages() {
        try {
            // Select a safe subset of columns that excludes optional 'direction'
            const rows = await db_1.db
                .select({
                id: schema_js_1.crmMessages.id,
                senderName: schema_js_1.crmMessages.senderName,
                senderEmail: schema_js_1.crmMessages.senderEmail,
                subject: schema_js_1.crmMessages.subject,
                content: schema_js_1.crmMessages.content,
                messageType: schema_js_1.crmMessages.messageType,
                status: schema_js_1.crmMessages.status,
                clientId: schema_js_1.crmMessages.clientId,
                emailMessageId: schema_js_1.crmMessages.emailMessageId,
                emailHeaders: schema_js_1.crmMessages.emailHeaders,
                attachments: schema_js_1.crmMessages.attachments,
                smsMessageId: schema_js_1.crmMessages.smsMessageId,
                phoneNumber: schema_js_1.crmMessages.phoneNumber,
                smsProvider: schema_js_1.crmMessages.smsProvider,
                smsStatus: schema_js_1.crmMessages.smsStatus,
                campaignId: schema_js_1.crmMessages.campaignId,
                sentAt: schema_js_1.crmMessages.sentAt,
                deliveredAt: schema_js_1.crmMessages.deliveredAt,
                readAt: schema_js_1.crmMessages.readAt,
                repliedAt: schema_js_1.crmMessages.repliedAt,
                createdAt: schema_js_1.crmMessages.createdAt,
                updatedAt: schema_js_1.crmMessages.updatedAt,
            })
                .from(schema_js_1.crmMessages)
                .orderBy((0, drizzle_orm_1.desc)(schema_js_1.crmMessages.createdAt));
            return rows;
        }
        catch (err) {
            // Fallback to raw SQL if schema mismatch occurs
            // @ts-ignore
            const result = await db_1.db.execute((0, drizzle_orm_1.sql) `SELECT * FROM crm_messages ORDER BY created_at DESC`);
            return result;
        }
    }
    async getCrmMessage(id) {
        try {
            const results = await db_1.db
                .select({
                id: schema_js_1.crmMessages.id,
                senderName: schema_js_1.crmMessages.senderName,
                senderEmail: schema_js_1.crmMessages.senderEmail,
                subject: schema_js_1.crmMessages.subject,
                content: schema_js_1.crmMessages.content,
                messageType: schema_js_1.crmMessages.messageType,
                status: schema_js_1.crmMessages.status,
                clientId: schema_js_1.crmMessages.clientId,
                emailMessageId: schema_js_1.crmMessages.emailMessageId,
                emailHeaders: schema_js_1.crmMessages.emailHeaders,
                attachments: schema_js_1.crmMessages.attachments,
                smsMessageId: schema_js_1.crmMessages.smsMessageId,
                phoneNumber: schema_js_1.crmMessages.phoneNumber,
                smsProvider: schema_js_1.crmMessages.smsProvider,
                smsStatus: schema_js_1.crmMessages.smsStatus,
                campaignId: schema_js_1.crmMessages.campaignId,
                sentAt: schema_js_1.crmMessages.sentAt,
                deliveredAt: schema_js_1.crmMessages.deliveredAt,
                readAt: schema_js_1.crmMessages.readAt,
                repliedAt: schema_js_1.crmMessages.repliedAt,
                createdAt: schema_js_1.crmMessages.createdAt,
                updatedAt: schema_js_1.crmMessages.updatedAt,
            })
                .from(schema_js_1.crmMessages)
                .where((0, drizzle_orm_1.eq)(schema_js_1.crmMessages.id, id));
            return results[0];
        }
        catch {
            // @ts-ignore
            const result = await db_1.db.execute((0, drizzle_orm_1.sql) `SELECT * FROM crm_messages WHERE id = ${id} LIMIT 1`);
            return (Array.isArray(result) ? result[0] : result?.rows?.[0]);
        }
    }
    async createCrmMessage(message) {
        // Some databases might not have certain optional columns like 'direction'.
        // To avoid runtime errors (e.g., "column \"direction\" does not exist"),
        // filter out fields that commonly cause issues and let defaults apply.
        const safeMessage = { ...message };
        // Do not force 'direction' on insert; schema default will apply on DBs that have it
        delete safeMessage.direction;
        // Normalize attachments JSON: if provided as stringified JSON elsewhere, keep as-is; otherwise pass object
        if (safeMessage.attachments && typeof safeMessage.attachments !== 'string') {
            safeMessage.attachments = JSON.stringify(safeMessage.attachments);
        }
        const results = await db_1.db
            .insert(schema_js_1.crmMessages)
            .values(safeMessage)
            .returning({ id: schema_js_1.crmMessages.id, createdAt: schema_js_1.crmMessages.createdAt });
        return results[0];
    }
    async updateCrmMessage(id, updates) {
        const results = await db_1.db.update(schema_js_1.crmMessages)
            .set({ ...updates, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_js_1.crmMessages.id, id))
            .returning({ id: schema_js_1.crmMessages.id, updatedAt: schema_js_1.crmMessages.updatedAt });
        return results[0];
    }
    async deleteCrmMessage(id) {
        await db_1.db.delete(schema_js_1.crmMessages).where((0, drizzle_orm_1.eq)(schema_js_1.crmMessages.id, id));
    }
    // Voucher Products management
    async getVoucherProducts() {
        return await db_1.db.select().from(schema_js_1.voucherProducts).orderBy((0, drizzle_orm_1.asc)(schema_js_1.voucherProducts.displayOrder), (0, drizzle_orm_1.desc)(schema_js_1.voucherProducts.createdAt));
    }
    async getVoucherProduct(id) {
        const results = await db_1.db.select().from(schema_js_1.voucherProducts).where((0, drizzle_orm_1.eq)(schema_js_1.voucherProducts.id, id));
        return results[0];
    }
    async createVoucherProduct(product) {
        console.log('[STORAGE] Creating voucher product with data:', product);
        console.log('[STORAGE] Product keys:', Object.keys(product));
        // Remove any undefined or null values
        const cleanProduct = Object.fromEntries(Object.entries(product).filter(([_, value]) => value !== undefined && value !== null));
        console.log('[STORAGE] Clean product data:', cleanProduct);
        console.log('[STORAGE] Clean product keys:', Object.keys(cleanProduct));
        try {
            const results = await db_1.db.insert(schema_js_1.voucherProducts).values(cleanProduct).returning();
            console.log('[STORAGE] Insert successful:', results[0]);
            return results[0];
        }
        catch (error) {
            console.error('[STORAGE] Insert error:', error);
            throw error;
        }
    }
    async updateVoucherProduct(id, updates) {
        const results = await db_1.db.update(schema_js_1.voucherProducts)
            .set({ ...updates, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_js_1.voucherProducts.id, id))
            .returning();
        return results[0];
    }
    async deleteVoucherProduct(id) {
        await db_1.db.delete(schema_js_1.voucherProducts).where((0, drizzle_orm_1.eq)(schema_js_1.voucherProducts.id, id));
    }
    // Discount Coupons management
    async getDiscountCoupons() {
        return await db_1.db.select().from(schema_js_1.discountCoupons).orderBy((0, drizzle_orm_1.desc)(schema_js_1.discountCoupons.createdAt));
    }
    async getDiscountCoupon(id) {
        const results = await db_1.db.select().from(schema_js_1.discountCoupons).where((0, drizzle_orm_1.eq)(schema_js_1.discountCoupons.id, id));
        return results[0];
    }
    async getDiscountCouponByCode(code) {
        const results = await db_1.db.select().from(schema_js_1.discountCoupons).where((0, drizzle_orm_1.eq)(schema_js_1.discountCoupons.code, code));
        return results[0];
    }
    async createDiscountCoupon(coupon) {
        const results = await db_1.db.insert(schema_js_1.discountCoupons).values(coupon).returning();
        return results[0];
    }
    async updateDiscountCoupon(id, updates) {
        const results = await db_1.db.update(schema_js_1.discountCoupons)
            .set({ ...updates, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_js_1.discountCoupons.id, id))
            .returning();
        return results[0];
    }
    async deleteDiscountCoupon(id) {
        await db_1.db.delete(schema_js_1.discountCoupons).where((0, drizzle_orm_1.eq)(schema_js_1.discountCoupons.id, id));
    }
    // Voucher Sales management
    async getVoucherSales() {
        return await db_1.db.select().from(schema_js_1.voucherSales).orderBy((0, drizzle_orm_1.desc)(schema_js_1.voucherSales.createdAt));
    }
    async getVoucherSale(id) {
        const results = await db_1.db.select().from(schema_js_1.voucherSales).where((0, drizzle_orm_1.eq)(schema_js_1.voucherSales.id, id));
        return results[0];
    }
    async getVoucherSaleByCode(code) {
        const results = await db_1.db.select().from(schema_js_1.voucherSales).where((0, drizzle_orm_1.eq)(schema_js_1.voucherSales.voucherCode, code));
        return results[0];
    }
    async createVoucherSale(sale) {
        const results = await db_1.db.insert(schema_js_1.voucherSales).values(sale).returning();
        return results[0];
    }
    async updateVoucherSale(id, updates) {
        const results = await db_1.db.update(schema_js_1.voucherSales)
            .set({ ...updates, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_js_1.voucherSales.id, id))
            .returning();
        return results[0];
    }
    async deleteVoucherSale(id) {
        await db_1.db.delete(schema_js_1.voucherSales).where((0, drizzle_orm_1.eq)(schema_js_1.voucherSales.id, id));
    }
    // Coupon Usage management
    async getCouponUsage(couponId) {
        return await db_1.db.select().from(schema_js_1.couponUsage).where((0, drizzle_orm_1.eq)(schema_js_1.couponUsage.couponId, couponId)).orderBy((0, drizzle_orm_1.desc)(schema_js_1.couponUsage.usedAt));
    }
    async createCouponUsage(usage) {
        const results = await db_1.db.insert(schema_js_1.couponUsage).values(usage).returning();
        return results[0];
    }
    // AutoBlog helper methods
    async getAllBlogSlugs() {
        const results = await db_1.db.select({ slug: schema_js_1.blogPosts.slug }).from(schema_js_1.blogPosts);
        return results.map(r => r.slug);
    }
    async savePublicAsset(bucket, filename, buffer) {
        const fs = await import('fs/promises');
        const path = await import('path');
        // Create directory structure if it doesn't exist
        const uploadDir = path.join(process.cwd(), 'server', 'public', bucket);
        try {
            await fs.mkdir(uploadDir, { recursive: true });
        }
        catch (error) {
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
    async saveEmailSettings(settings) {
        // Create email_settings table if it doesn't exist using raw query
        await db_1.db.execute((0, drizzle_orm_1.sql) `
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
            await db_1.db.execute((0, drizzle_orm_1.sql) `ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS email_signature TEXT`);
            await db_1.db.execute((0, drizzle_orm_1.sql) `ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS signature_enabled BOOLEAN DEFAULT FALSE`);
            await db_1.db.execute((0, drizzle_orm_1.sql) `ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS out_of_office_enabled BOOLEAN DEFAULT FALSE`);
            await db_1.db.execute((0, drizzle_orm_1.sql) `ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS out_of_office_message TEXT`);
            await db_1.db.execute((0, drizzle_orm_1.sql) `ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS out_of_office_start_date DATE`);
            await db_1.db.execute((0, drizzle_orm_1.sql) `ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS out_of_office_end_date DATE`);
        }
        catch (err) {
            // Columns might already exist, ignore error
        }
        // Check if settings exist
        const existing = await db_1.db.execute((0, drizzle_orm_1.sql) `SELECT id FROM email_settings LIMIT 1`);
        const existingRows = existing?.rows ?? (Array.isArray(existing) ? existing : undefined);
        if (existingRows && existingRows.length > 0) {
            // Update existing settings
            const result = await db_1.db.execute((0, drizzle_orm_1.sql) `
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
      `);
            const updateRows = result?.rows ?? (Array.isArray(result) ? result : undefined);
            return updateRows ? updateRows[0] : result;
        }
        else {
            // Insert new settings
            const result = await db_1.db.execute((0, drizzle_orm_1.sql) `
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
      `);
            const insertRows = result?.rows ?? (Array.isArray(result) ? result : undefined);
            return insertRows ? insertRows[0] : result;
        }
    }
    async getEmailSettings() {
        try {
            const result = await db_1.db.execute((0, drizzle_orm_1.sql) `SELECT * FROM email_settings ORDER BY updated_at DESC LIMIT 1`);
            const rows = result?.rows ?? (Array.isArray(result) ? result : undefined);
            if (rows && rows.length > 0) {
                return rows[0];
            }
            else {
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
        }
        catch (error) {
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
exports.DatabaseStorage = DatabaseStorage;
exports.storage = new DatabaseStorage();

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = require("../db");
const schema_1 = require("../../shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("../auth");
const router = express_1.default.Router();
// Helper to get current studio ID (for now use demo studio, later from user session)
const getStudioId = (req) => {
    return req.user?.studioId || '550e8400-e29b-41d4-a716-446655440000';
};
// GET /api/manual-pages - List all manual page content records for this studio
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const studioId = getStudioId(req);
        const { language = 'de' } = req.query;
        const records = await db_1.db
            .select()
            .from(schema_1.manualPageContent)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.manualPageContent.studioId, studioId), (0, drizzle_orm_1.eq)(schema_1.manualPageContent.language, language)));
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.json(records);
    }
    catch (error) {
        console.error('Failed to fetch manual page content:', error);
        res.status(500).json({ error: 'Failed to fetch manual page content' });
    }
});
// GET /api/manual-pages/:pageId - Get content for a specific page
router.get('/:pageId', async (req, res) => {
    try {
        const { pageId } = req.params;
        const { language = 'de', studioId: queryStudioId } = req.query;
        // Allow public access for frontend rendering
        const studioId = queryStudioId || getStudioId(req);
        const [record] = await db_1.db
            .select()
            .from(schema_1.manualPageContent)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.manualPageContent.studioId, studioId), (0, drizzle_orm_1.eq)(schema_1.manualPageContent.pageId, pageId), (0, drizzle_orm_1.eq)(schema_1.manualPageContent.language, language)))
            .limit(1);
        if (!record) {
            // Return empty published content if no record exists (fallback to translation keys)
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
            return res.json({
                pageId,
                language,
                publishedContent: {},
                status: 'none'
            });
        }
        // For public requests, only return published content
        const isAuthenticated = req.user || req.session?.userId;
        if (!isAuthenticated) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
            return res.json({
                pageId: record.pageId,
                language: record.language,
                publishedContent: record.publishedContent || {},
                status: record.status,
                publishedAt: record.publishedAt
            });
        }
        // For authenticated admin users, return full record including drafts
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.json(record);
    }
    catch (error) {
        // If the table doesn't exist yet or any DB error occurs, return a safe fallback
        console.warn('Manual page fetch fallback:', error?.message || error);
        const { pageId } = req.params;
        const { language = 'de' } = req.query;
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        return res.json({
            pageId,
            language,
            publishedContent: {},
            status: 'none'
        });
    }
});
// POST /api/manual-pages/:pageId - Create or update page content
router.post('/:pageId', auth_1.requireAuth, async (req, res) => {
    try {
        const { pageId } = req.params;
        const studioId = getStudioId(req);
        const { language = 'de', draftContent, action = 'save_draft' } = req.body;
        if (!draftContent || typeof draftContent !== 'object') {
            return res.status(400).json({ error: 'draftContent is required and must be an object' });
        }
        // Check if record exists
        const [existing] = await db_1.db
            .select()
            .from(schema_1.manualPageContent)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.manualPageContent.studioId, studioId), (0, drizzle_orm_1.eq)(schema_1.manualPageContent.pageId, pageId), (0, drizzle_orm_1.eq)(schema_1.manualPageContent.language, language)))
            .limit(1);
        let result;
        if (existing) {
            // Update existing record
            const updates = {
                draftContent,
                updatedAt: new Date()
            };
            // If action is 'publish', also update published content
            if (action === 'publish') {
                updates.publishedContent = draftContent;
                updates.publishedAt = new Date();
                updates.status = 'published';
            }
            [result] = await db_1.db
                .update(schema_1.manualPageContent)
                .set(updates)
                .where((0, drizzle_orm_1.eq)(schema_1.manualPageContent.id, existing.id))
                .returning();
        }
        else {
            // Create new record
            const newRecord = {
                studioId,
                pageId,
                language,
                draftContent,
                publishedContent: action === 'publish' ? draftContent : {},
                status: action === 'publish' ? 'published' : 'draft',
                publishedAt: action === 'publish' ? new Date() : null,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            [result] = await db_1.db
                .insert(schema_1.manualPageContent)
                .values(newRecord)
                .returning();
        }
        res.json(result);
    }
    catch (error) {
        console.error('Failed to save page content:', error);
        res.status(500).json({ error: 'Failed to save page content' });
    }
});
// POST /api/manual-pages/:pageId/publish - Publish draft content
router.post('/:pageId/publish', auth_1.requireAuth, async (req, res) => {
    try {
        const { pageId } = req.params;
        const studioId = getStudioId(req);
        const { language = 'de' } = req.body;
        const [existing] = await db_1.db
            .select()
            .from(schema_1.manualPageContent)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.manualPageContent.studioId, studioId), (0, drizzle_orm_1.eq)(schema_1.manualPageContent.pageId, pageId), (0, drizzle_orm_1.eq)(schema_1.manualPageContent.language, language)))
            .limit(1);
        if (!existing) {
            return res.status(404).json({ error: 'Page content not found' });
        }
        const [result] = await db_1.db
            .update(schema_1.manualPageContent)
            .set({
            publishedContent: existing.draftContent,
            publishedAt: new Date(),
            status: 'published',
            updatedAt: new Date()
        })
            .where((0, drizzle_orm_1.eq)(schema_1.manualPageContent.id, existing.id))
            .returning();
        res.json(result);
    }
    catch (error) {
        console.error('Failed to publish page content:', error);
        res.status(500).json({ error: 'Failed to publish page content' });
    }
});
// DELETE /api/manual-pages/:pageId - Delete page content (reset to defaults)
router.delete('/:pageId', auth_1.requireAuth, async (req, res) => {
    try {
        const { pageId } = req.params;
        const studioId = getStudioId(req);
        const { language = 'de' } = req.query;
        await db_1.db
            .delete(schema_1.manualPageContent)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.manualPageContent.studioId, studioId), (0, drizzle_orm_1.eq)(schema_1.manualPageContent.pageId, pageId), (0, drizzle_orm_1.eq)(schema_1.manualPageContent.language, language)));
        res.json({ success: true, message: 'Page content reset to defaults' });
    }
    catch (error) {
        console.error('Failed to delete page content:', error);
        res.status(500).json({ error: 'Failed to delete page content' });
    }
});
exports.default = router;

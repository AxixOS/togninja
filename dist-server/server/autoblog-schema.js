"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoBlogInputSchema = exports.autoBlogSchema = void 0;
const zod_1 = require("zod");
exports.autoBlogSchema = zod_1.z.object({
    title: zod_1.z.string().max(140),
    keyphrase: zod_1.z.string().max(60),
    slug: zod_1.z.string().regex(/^[a-z0-9\-]+$/),
    excerpt: zod_1.z.string().max(180),
    content_html: zod_1.z.string(),
    seo_title: zod_1.z.string().max(70),
    meta_description: zod_1.z.string().max(160),
    cover_image: zod_1.z.string().url().optional().nullable(),
    image_alts: zod_1.z.array(zod_1.z.string()).max(3).optional(),
    tags: zod_1.z.array(zod_1.z.string()).max(10).optional(),
    status: zod_1.z.enum(["DRAFT", "PUBLISHED", "SCHEDULED"]).default("DRAFT"),
    publish_now: zod_1.z.boolean().default(false),
    language: zod_1.z.string().default("de")
});
// Input validation schema for the API endpoint
exports.autoBlogInputSchema = zod_1.z.object({
    userPrompt: zod_1.z.string().optional(),
    contentGuidance: zod_1.z.string().optional(),
    language: zod_1.z.enum(["de", "en"]).default("de"),
    siteUrl: zod_1.z.string().url().optional(),
    publishOption: zod_1.z.enum(["draft", "publish", "schedule"]).default("draft"),
    scheduledFor: zod_1.z.string().optional(), // ISO string for scheduled publishing
    customSlug: zod_1.z.string().optional() // Custom URL slug override
});

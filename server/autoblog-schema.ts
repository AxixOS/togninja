import { z } from "zod";

export const autoBlogSchema = z.object({
  title: z.string().max(140),
  keyphrase: z.string().max(60),
  slug: z.string().regex(/^[a-z0-9\-]+$/),
  excerpt: z.string().max(180),
  content_html: z.string(),
  seo_title: z.string().max(70),
  meta_description: z.string().max(160),
  cover_image: z.string().url().optional().nullable(),
  image_alts: z.array(z.string()).max(3).optional(),
  tags: z.array(z.string()).max(10).optional(),
  status: z.enum(["DRAFT","PUBLISHED","SCHEDULED"]).default("DRAFT"),
  publish_now: z.boolean().default(false),
  language: z.string().default("de")
});

export type AutoBlogParsed = z.infer<typeof autoBlogSchema>;

// Input validation schema for the API endpoint
export const autoBlogInputSchema = z.object({
  userPrompt: z.string().optional(),
  contentGuidance: z.string().optional(),
  language: z.enum(["de", "en"]).default("de"),
  siteUrl: z.string().url().optional(),
  publishOption: z.enum(["draft", "publish", "schedule"]).default("draft"),
  scheduledFor: z.string().optional(), // ISO string for scheduled publishing
  customSlug: z.string().optional() // Custom URL slug override
});

export type AutoBlogInput = z.infer<typeof autoBlogInputSchema>;
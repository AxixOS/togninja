"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.websiteScraperTool = void 0;
const zod_1 = require("zod");
// Minimal stub for website scraper to unblock agent startup
// Provides a no-op implementation that returns an informative message.
exports.websiteScraperTool = {
    name: "website_scraper",
    description: "Scrape basic content from a public URL (stubbed in dev).",
    parameters: zod_1.z.object({
        url: zod_1.z.string().min(1, "url is required").describe("The URL to fetch and analyze")
    }),
    execute: async (params) => {
        return {
            ok: true,
            mode: "stub",
            url: params.url,
            message: "Website scraper is stubbed in this environment; no network fetch performed.",
            title: null,
            meta: {},
            excerpt: null
        };
    }
};
exports.default = exports.websiteScraperTool;

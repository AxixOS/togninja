import { z } from "zod";

// Minimal stub for website scraper to unblock agent startup
// Provides a no-op implementation that returns an informative message.

export const websiteScraperTool = {
  name: "website_scraper",
  description: "Scrape basic content from a public URL (stubbed in dev).",
  parameters: z.object({
    url: z.string().min(1, "url is required").describe("The URL to fetch and analyze")
  }),
  execute: async (params: { url: string }) => {
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

export default websiteScraperTool;

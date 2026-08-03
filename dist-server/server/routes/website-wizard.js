"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const webscrape_1 = require("../../agent/integrations/webscrape");
const website_profile_1 = require("../../agent/integrations/website-profile");
const router = express_1.default.Router();
// Analyze website endpoint
router.post("/analyze", async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ error: "URL is required" });
        }
        console.log(`Analyzing website: ${url}`);
        // Run comprehensive website analysis
        const results = {
            url: url,
            timestamp: new Date().toISOString(),
            lighthouse: null,
            content: null,
            profile: null,
            status: "success"
        };
        try {
            // Run Lighthouse performance analysis (lazy-load to avoid startup crashes)
            console.log('Running Lighthouse analysis...');
            const { runLighthouse } = await import("../../agent/integrations/lighthouse");
            results.lighthouse = await runLighthouse(url);
        }
        catch (error) {
            console.error('Lighthouse analysis failed:', error);
            results.lighthouse = { error: error?.message || 'Unknown error' };
        }
        try {
            // Scrape website content
            console.log('Scraping website content...');
            results.content = await (0, webscrape_1.scrapeSite)(url);
        }
        catch (error) {
            console.error('Content scraping failed:', error);
            results.content = { error: error.message };
        }
        try {
            // Create website profile
            console.log('Creating website profile...');
            results.profile = await (0, website_profile_1.analyzeAndStoreWebsite)("550e8400-e29b-41d4-a716-446655440000", url);
        }
        catch (error) {
            console.error('Website profile creation failed:', error);
            results.profile = { error: error.message };
        }
        res.json(results);
    }
    catch (error) {
        console.error("Website analysis error:", error);
        res.status(500).json({
            error: "Website analysis failed",
            message: error instanceof Error ? error.message : "Unknown error"
        });
    }
});
// Get website profile by URL
router.get("/profile", async (req, res) => {
    try {
        const { url } = req.query;
        if (!url) {
            return res.status(400).json({ error: "URL is required" });
        }
        // This would typically query the database for existing profiles
        // For now, return a placeholder response
        const profile = {
            url: url,
            lastAnalyzed: new Date().toISOString(),
            status: "analyzed",
            analysisCount: 1
        };
        res.json(profile);
    }
    catch (error) {
        console.error("Profile retrieval error:", error);
        res.status(500).json({
            error: "Profile retrieval failed",
            message: error instanceof Error ? error.message : "Unknown error"
        });
    }
});
exports.default = router;

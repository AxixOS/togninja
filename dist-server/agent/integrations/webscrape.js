"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeSite = scrapeSite;
const node_fetch_1 = __importDefault(require("node-fetch"));
const article_extractor_1 = require("@extractus/article-extractor");
const cheerio = __importStar(require("cheerio"));
const crypto_1 = __importDefault(require("crypto"));
async function scrapeSite(url) {
    const res = await (0, node_fetch_1.default)(url, { headers: { "User-Agent": "TogNinjaBot/1.0" } });
    const html = await res.text();
    const hash = crypto_1.default.createHash("sha1").update(html).digest("hex").slice(0, 12);
    const $ = cheerio.load(html);
    const title = $("title").first().text();
    const description = $('meta[name="description"]').attr("content") || "";
    const keywordsMeta = $('meta[name="keywords"]').attr("content")?.split(",").map(k => k.trim()) || [];
    const imgs = $("img")
        .map((_, el) => $(el).attr("src") || "")
        .get()
        .filter(Boolean)
        .slice(0, 25);
    // Pull dominant hex colours from inline style/body CSS tokens (quick heuristic)
    const colors = (html.match(/#(?:[0-9a-fA-F]{3}){1,2}\b/g) || [])
        .map(c => c.toLowerCase())
        .filter((v, i, a) => a.indexOf(v) === i)
        .slice(0, 10);
    // Article Extractor grabs main readable text
    const article = await (0, article_extractor_1.extract)(html, { html });
    return {
        title,
        description,
        keywords: keywordsMeta,
        html_hash: hash,
        raw_html: html,
        main_text: article?.content || "",
        images: imgs,
        colors
    };
}

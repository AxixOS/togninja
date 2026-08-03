import fetch from "node-fetch";
import { extract } from "@extractus/article-extractor";
import * as cheerio from "cheerio";
import crypto from "crypto";

export interface ScrapeResult {
  title?: string;
  description?: string;
  keywords?: string[];
  html_hash: string;
  raw_html: string;
  main_text?: string;
  images: string[];
  colors: string[];          // dominant hex colours from inline CSS
}

export async function scrapeSite(url: string): Promise<ScrapeResult> {
  const res = await fetch(url, { headers: { "User-Agent": "TogNinjaBot/1.0" } });
  const html = await res.text();
  const hash = crypto.createHash("sha1").update(html).digest("hex").slice(0, 12);

  const $ = cheerio.load(html);

  const title = $("title").first().text();
  const description = $('meta[name="description"]').attr("content") || "";

  const keywordsMeta =
    $('meta[name="keywords"]').attr("content")?.split(",").map(k => k.trim()) || [];

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
  const article = await extract(html, { html });

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
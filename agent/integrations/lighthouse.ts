import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";

export async function runLighthouse(url: string) {
  try {
    const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless", "--no-sandbox", "--disable-gpu"] });
    const result = await lighthouse(url, {
      port: chrome.port,
      output: "json",
      onlyCategories: ["seo", "performance", "accessibility"]
    });
    await chrome.kill();
    return result?.lhr || {};
  } catch (error) {
    console.error("Lighthouse error:", error);
    return { error: "lighthouse-failed", message: error instanceof Error ? error.message : "Unknown error" };
  }
}
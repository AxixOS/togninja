// src/components/ConsentScripts.tsx
// Only loads Analytics/Marketing scripts AFTER user consent (GDPR-compliant)

import { useEffect, useState } from "react";
import { hasConsent } from "../lib/consent";

// Build-time fallbacks. The PRIMARY source is the setup wizard (studio_configs),
// fetched from /api/site/analytics below; these apply only when the wizard
// hasn't set an ID. GA4 keeps a working default so analytics doesn't go dark.
const GA4_ID_FALLBACK = (import.meta.env.VITE_GA4_ID as string) || "G-8W76BVNNW9";
const META_PIXEL_ID_FALLBACK = (import.meta.env.VITE_META_PIXEL_ID as string) || "";

export default function ConsentScripts() {
  // Wizard-configured IDs (null until fetched, so we don't load the fallback GA
  // property before we know whether the studio configured a different one).
  const [ids, setIds] = useState<{ ga4Id: string; metaPixelId: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/site/analytics")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        setIds({ ga4Id: d?.ga4Id || "", metaPixelId: d?.metaPixelId || "" });
      })
      .catch(() => { if (!cancelled) setIds({ ga4Id: "", metaPixelId: "" }); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!ids) return; // wait for the wizard config before loading anything

    // Wizard value wins; otherwise the build-time env / default.
    const ga4 = ids.ga4Id || GA4_ID_FALLBACK;
    const pixel = ids.metaPixelId || META_PIXEL_ID_FALLBACK;

    const load = () => {
      // Analytics - only load if user has consented
      if (hasConsent("analytics") && ga4) {
        loadGA4(ga4);
        console.log("[Consent] Analytics consent granted - loading GA");
      }
      // Marketing - only load if user has consented AND a Pixel ID exists
      if (hasConsent("marketing")) {
        if (pixel) {
          loadMetaPixel(pixel);
          console.log("[Consent] Marketing consent granted - loading Meta Pixel");
        } else {
          console.log("[Consent] Marketing consent granted - set the Meta Pixel ID in the setup wizard to enable it");
        }
      }
    };

    load();
    const onUpdate = () => load();
    window.addEventListener("consent:updated", onUpdate);
    return () => window.removeEventListener("consent:updated", onUpdate);
  }, [ids]);

  return null;
}

// Helper function to load Google Analytics 4
export function loadGA4(measurementId: string) {
  if (typeof window === "undefined") return;
  if ((window as any).gaLoaded) return; // Prevent double-loading

  // Load gtag script
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  // Initialize gtag
  (window as any).dataLayer = (window as any).dataLayer || [];
  function gtag(...args: any[]) {
    (window as any).dataLayer.push(args);
  }
  (window as any).gtag = gtag;
  gtag("js", new Date());
  gtag("config", measurementId, {
    anonymize_ip: true, // GDPR-friendly
  });

  (window as any).gaLoaded = true;
  console.log("[Analytics] Google Analytics loaded:", measurementId);
}

// Helper function to load Meta Pixel
export function loadMetaPixel(pixelId: string) {
  if (typeof window === "undefined") return;
  if ((window as any).fbqLoaded) return; // Prevent double-loading

  // Meta Pixel base code
  (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = "2.0";
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

  (window as any).fbq("init", pixelId);
  (window as any).fbq("track", "PageView");

  (window as any).fbqLoaded = true;
  console.log("[Marketing] Meta Pixel loaded:", pixelId);
}

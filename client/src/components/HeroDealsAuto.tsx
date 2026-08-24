import React from "react";
import { useNavigate } from "react-router-dom";
import "@/styles/naf-hero-deals.css";
import { useLanguage } from "@/context/LanguageContext";
import { useCart } from "@/context/CartContext";
import { useStudioCurrency } from "@/hooks/useStudioCurrency";

type AnyObj = Record<string, any>;

function pick<T = any>(o: AnyObj, keys: string[], fallback?: any): T {
  for (const k of keys) if (o && o[k] != null && o[k] !== "") return o[k];
  return fallback as T;
}

function normalize(item: AnyObj) {
  const imageUrl = pick<string>(item, ["imageUrl", "image_url", "image", "heroImageUrl", "cover", "photo"]);
  const thumbnailUrl = pick<string>(item, ["thumbnailUrl", "thumbnail_url", "thumb"], imageUrl); // fallback to main image
  const promoImageUrl = pick<string>(item, ["promoImageUrl", "promo_image_url", "promoImage", "banner"]);
  const title    = pick<string>(item, ["name", "title", "label"]);
  const url      = pick<string>(item, ["url", "href", "link", "path", "permalink", "detailsUrl", "route"]);
  const detailedDescription = pick<string>(item, ["detailedDescription", "detailed_description", "fullDescription"], "");
  const slug     = pick<string>(item, ["slug", "sku", "productSlug"], "");

  // Start with broad guesses
  let current = Number(pick<number>(item, ["salePrice", "discountPrice", "price", "currentPrice", "amount"], 0));
  let compare = Number(pick<number>(item, ["originalPrice", "compareAtPrice", "was", "rrp", "listPrice"], 0));

  // Heuristics: if both discountPrice/salePrice and price exist and discount < price, treat price as original
  const hasPrice = Object.prototype.hasOwnProperty.call(item, "price");
  const hasDiscount = Object.prototype.hasOwnProperty.call(item, "discountPrice");
  const hasSale = Object.prototype.hasOwnProperty.call(item, "salePrice");

  if ((!compare || compare <= 0) && hasPrice && (hasDiscount || hasSale)) {
    const p = Number(item.price);
    const dp = hasDiscount ? Number(item.discountPrice) : Number(item.salePrice);
    if (isFinite(p) && isFinite(dp) && p > 0 && dp > 0 && dp < p) {
      current = dp;
      compare = p;
    }
  }

  // Ensure numbers are sane
  const price = isFinite(current) ? current : 0;
  const compareAt = isFinite(compare) && compare > 0 ? compare : undefined;

  const ribbon   = pick<string>(item, ["ribbonText", "badge", "tag"], "");
  const id       = String(pick<string>(item, ["id", "uuid", "slug"], title || url || Math.random().toString(36).slice(2)));
  const dataId   = pick<string>(item, ["dataVoucherId", "voucherId", "id"], id);
  const subtitle = pick<string>(item, ["subtitle", "tagline", "shortDescription", "excerpt", "description"], "");
  
  return { id, imageUrl, thumbnailUrl, promoImageUrl, title, url, price, compareAt, ribbonText: ribbon, dataVoucherId: dataId, subtitle, detailedDescription, slug };
}

// Plain helper, not a component — it cannot call the t() hook, so the already
// translated suffix is passed in by the caller.
function pctSave(price: number, compareAt: number | undefined, offSuffix: string) {
  if (!compareAt || compareAt <= price) return null;
  const pct = Math.round(((compareAt - price) / compareAt) * 100);
  return `${pct}% ${offSuffix}`;
}

export default function HeroDealsAuto({ items }: { items: AnyObj[] }) {
  const { t, language } = useLanguage();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  
  const top3 = (items || []).slice(0, 3).map(normalize).filter(v => v.imageUrl && v.title && v.url);
  if (!top3.length) return null;

  // The studio's currency, not a literal, and not a hardcoded Austrian locale.
  //
  // This component is imported by VouchersPage and never rendered, so the defect is
  // latent — but it is exactly one `<HeroDealsAuto />` away from printing "€195,00"
  // directly above the same voucher priced in dollars by the grid below it.
  const { format: money } = useStudioCurrency();
  const formatter = { format: (v: number) => money(v) };

  const handleBuyNow = (voucher: ReturnType<typeof normalize>) => {
    // Add to cart with productSlug for coupon validation
    addToCart({
      title: voucher.title,
      name: voucher.title,
      productId: voucher.dataVoucherId,
      productSlug: voucher.slug,
      sku: voucher.slug,
      packageType: 'Fotoshooting Gutschein',
      price: voucher.price,
      quantity: 1,
      type: 'voucher'
    });
    
    // Show success feedback and navigate to cart
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => navigate('/cart'), 500);
  };

  return (
    <section className="naf-hero-wrap" aria-label="Top vouchers">
      <div className="naf-hero-grid">
        {top3.map(v => {
          const savingsText = pctSave(v.price, v.compareAt, t('heroDeals.off'));
          
          return (
            <article key={v.id} className="naf-card">
              <div className="naf-card-media">
                <img src={v.thumbnailUrl || v.imageUrl} alt={v.title} loading="lazy" />
                {v.ribbonText && <div className="naf-ribbon">{v.ribbonText}</div>}
                {!v.ribbonText && savingsText && <div className="naf-ribbon naf-ribbon-savings">{savingsText}</div>}
              </div>
              <div className="naf-card-body">
                <h3 className="naf-title">{v.title}</h3>
                {v.subtitle && <p className="naf-sub">{v.subtitle}</p>}
                
                {/* Extensive product description */}
                {v.detailedDescription && (
                  <div className="naf-details">
                    <p className="naf-description">{v.detailedDescription}</p>
                  </div>
                )}
                
                {/* Promotional banner if available */}
                {v.promoImageUrl && (
                  <div className="naf-promo-banner">
                    <img src={v.promoImageUrl} alt={`${v.title} - Special Offer`} loading="lazy" />
                  </div>
                )}
                
                <div className="naf-price-row">
                  <span className="naf-from">{t('heroDeals.from')}</span>
                  {v.compareAt && (
                    <span className="naf-old">{formatter.format(v.compareAt)}</span>
                  )}
                  <span className="naf-new">{formatter.format(v.price)}</span>
                </div>
                <div className="naf-cta-row">
                  <button 
                    onClick={() => handleBuyNow(v)} 
                    className="naf-btn book-button" 
                    data-voucher-id={v.dataVoucherId} 
                    aria-label={t('home.bookNowButton')}
                  >
                    {t('home.bookNowButton')}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

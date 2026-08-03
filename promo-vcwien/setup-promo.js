import "dotenv/config";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

function splitCsv(val) {
  return (val || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function resolveProductIds() {
  const ids = splitCsv(process.env.TARGET_PRODUCT_IDS);
  if (ids.length) return ids;

  const names = splitCsv(process.env.TARGET_PRODUCT_NAMES);
  if (!names.length) throw new Error("Provide TARGET_PRODUCT_IDS or TARGET_PRODUCT_NAMES in .env");

  const prods = await stripe.products.list({ limit: 100, active: true });
  const found = [];

  for (const want of names) {
    const p = prods.data.find((x) => (x.name || "").toLowerCase().includes(want.toLowerCase()));
    if (!p) throw new Error(`Could not find Stripe product matching name: "${want}"`);
    found.push(p.id);
  }
  return [...new Set(found)];
}

(async () => {
  try {
    const { PROMO_CODE, PERCENT_OFF, AMOUNT_OFF, CURRENCY } = process.env;
    if (!PROMO_CODE) throw new Error("PROMO_CODE missing");

    const productIds = await resolveProductIds();

    // Reuse compatible coupon if it already exists
    const existing = await stripe.coupons.list({ limit: 100 });
    let coupon = existing.data.find((c) => {
      const applies = c.applies_to?.products || [];
      const sameSet = applies.length === productIds.length && productIds.every((id) => applies.includes(id));
      const samePct = PERCENT_OFF ? c.percent_off === Number(PERCENT_OFF) : false;
      const sameAmt = AMOUNT_OFF ? c.amount_off === Number(AMOUNT_OFF) && c.currency === (CURRENCY || "eur") : false;
      return sameSet && (samePct || sameAmt) && c.valid;
    });

    if (!coupon) {
      const payload = {
        name: `Only-${productIds.join("_")}`,
        applies_to: { products: productIds },
        duration: "once",
      };
      if (PERCENT_OFF) payload.percent_off = Number(PERCENT_OFF);
      else {
        payload.amount_off = Number(AMOUNT_OFF);
        payload.currency = (CURRENCY || "eur").toLowerCase();
      }
      coupon = await stripe.coupons.create(payload);
      console.log("Created coupon:", coupon.id);
    } else {
      console.log("Reusing coupon:", coupon.id);
    }

    // Create/reuse the visible code
    const promos = await stripe.promotionCodes.list({ code: PROMO_CODE, limit: 1 });
    let promo = promos.data[0];
    if (!promo) {
      promo = await stripe.promotionCodes.create({
        code: PROMO_CODE,
        coupon: coupon.id,
        active: true,
      });
      console.log("Created promotion code:", promo.id);
    } else {
      console.log("Reusing promotion code:", promo.id);
    }

    console.log("OK. Scoped products:", productIds);
    console.log(`Promo code: ${PROMO_CODE}`);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();

import "dotenv/config";
import express from "express";
import cors from "cors";
import Stripe from "stripe";

const app = express();
app.use(cors());
app.use(express.json());

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

function splitCsv(val) {
  return (val || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function findPriceForNameOrId(hint) {
  if (hint.startsWith("price_")) return await stripe.prices.retrieve(hint);
  const prods = await stripe.products.list({ limit: 100, active: true });
  const prod = prods.data.find((p) => (p.name || "").toLowerCase().includes(hint.toLowerCase()));
  if (!prod) throw new Error(`Product not found for hint: ${hint}`);
  const prices = await stripe.prices.list({ product: prod.id, active: true, limit: 100 });
  if (!prices.data.length) throw new Error(`No active price for product ${prod.id}`);
  return prices.data[0];
}

app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.post("/create-checkout-session", async (req, res) => {
  try {
    const hint = (req.body?.item || "").trim();
    if (!hint) return res.status(400).json({ error: "Missing item" });

    const allowedNames = splitCsv(process.env.TARGET_PRODUCT_NAMES).map((s) => s.toLowerCase());
    const ok = allowedNames.some((n) => hint.toLowerCase().includes(n));
    if (!ok) return res.status(400).json({ error: "Item not allowed by this endpoint" });

    const price = await findPriceForNameOrId(hint);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: price.id, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: "https://www.newagefotografie.com/thanks?sid={CHECKOUT_SESSION_ID}",
      cancel_url: "https://www.newagefotografie.com/cart",
    });

    res.json({ url: session.url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not create session" });
  }
});

app.post("/validate-code", async (req, res) => {
  try {
    const code = (req.body?.code || "").trim();
    if (!code) return res.status(400).json({ valid: false, reason: "No code" });

    const promos = await stripe.promotionCodes.list({ code, active: true, limit: 1 });
    const promo = promos.data[0];
    if (!promo || !promo.active || !promo.coupon?.valid) {
      return res.json({ valid: false, reason: "Code not active" });
    }
    const allowed = promo.coupon?.applies_to?.products || [];
    return res.json({ valid: allowed.length > 0 });
  } catch (e) {
    console.error(e);
    res.status(500).json({ valid: false, reason: "Server error" });
  }
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => console.log(`http://localhost:${PORT}`));

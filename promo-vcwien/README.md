Promo VCWIEN (Stripe)

What this does
- Creates one coupon scoped only to your three voucher products using Stripe `applies_to.products`.
- Creates or reuses promotion code `VCWIEN` for that coupon.
- Exposes a tiny server endpoint to create Checkout Sessions for those items, letting customers enter VCWIEN.

Setup
1) Copy `.env.example` to `.env` and fill `STRIPE_SECRET_KEY`. Optionally tweak `TARGET_PRODUCT_NAMES`/`TARGET_PRODUCT_IDS` and discount.
2) Install deps:

   npm install

3) Create coupon + promotion code:

   npm run setup:promo

4) Start dev server:

   npm run dev

Endpoints
- POST `/create-checkout-session` body `{ item: "Family Basic" }` → returns `{ url }`.
- POST `/validate-code` body `{ code: "VCWIEN" }` → returns `{ valid }`.
- GET `/healthz` → `{ ok: true }`.

Example frontend hook
<script>
async function buyVoucher(name){
  const r = await fetch("http://localhost:4242/create-checkout-session",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ item: name })
  });
  const data = await r.json();
  if (data.url) location.href = data.url; else alert("Checkout error");
}
</script>

Security notes
- The restriction to the three products is enforced by Stripe (coupon applies_to.products). The endpoint also filters allowed names.
- Consider rate limiting and origin checks in production.

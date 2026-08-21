import Stripe from 'stripe';
import { findCoupon, allowsSku, isCouponActive } from './coupons';
import { v4 as uuidv4 } from 'uuid';
import { VoucherGenerationService, GeneratedVoucher } from './voucherGenerationService';
import { EnhancedEmailService } from './enhancedEmailService';
import { verifyOfferToken } from '../utils/offer-token';
import { getStudioCurrency } from '../lib/studio-currency';

// Check if Stripe key is properly configured
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
let stripe: Stripe | null = null;
let stripeConfigured = false;

// Validate Stripe configuration
if (!stripeSecretKey) {
  console.warn('⚠️  STRIPE_SECRET_KEY is missing from environment variables');
  console.warn('⚠️  Stripe payments will be disabled. Set STRIPE_SECRET_KEY to enable payments.');
} else if (stripeSecretKey.includes('dummy') || stripeSecretKey.includes('xxx') || stripeSecretKey.length < 20) {
  console.warn('⚠️  Invalid Stripe secret key detected. Please use a real test key from your Stripe dashboard.');
  console.warn('⚠️  Current key starts with:', stripeSecretKey.substring(0, 10) + '...');
  console.warn('⚠️  Stripe payments will be disabled.');
} else {
  try {
    stripe = new Stripe(stripeSecretKey, { 
      apiVersion: '2025-08-27.basil',
      typescript: true 
    });
    stripeConfigured = true;
    console.log('✅ Stripe configured successfully');
  } catch (error) {
    console.warn('⚠️  Failed to initialize Stripe:', error);
    console.warn('⚠️  Stripe payments will be disabled.');
  }
}

export interface CheckoutSessionData {
  items: Array<{
    productId?: string;
    sku?: string;
    name?: string;
    title?: string;
    price: number;
    quantity: number;
    description?: string;
  }>;
  appliedVoucher?: {
    code: string;
    discount: number;
    type: 'percentage' | 'fixed';
    stripePromotionCodeId?: string;
  };
  customerEmail?: string;
  voucherData?: any; // Voucher personalization data
  appliedVoucherCode?: string;
  discount?: number; // ignored in favor of server-side coupon calc
  mode?: string;
  paymentMethod?: string; // 'paypal', 'card', 'sofort'
  successUrl?: string;
  cancelUrl?: string;
}

export class StripeVoucherService {
  private static parseCustomCoupons(): Array<{
    code: string;
    type: 'percent' | 'amount';
    value: number; // percent value or amount in cents
    skus?: string[];
  }> {
    try {
      const raw = process.env.COUPONS_JSON;
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((c: any) => c && typeof c.code === 'string')
        .map((c: any) => ({
          code: String(c.code).toUpperCase(),
          type: (String(c.type).toLowerCase() === 'amount' ? 'amount' : 'percent') as 'percent' | 'amount',
          value: Number(c.value) || 0,
          skus: Array.isArray(c.skus) ? c.skus.map((s: any) => String(s).toLowerCase()) : undefined,
        }));
    } catch {
      return [];
    }
  }

  private static deriveSkuFromName(name?: string): string | undefined {
    if (!name) return undefined;
    // Generate a slug-style SKU from the product name, matching server slugify conventions.
    // e.g. "Family Classic" → "family-classic", "Bewerbungsfotos & LinkedIn" → "bewerbungsfotos-und-linkedin"
    return name
      .trim()
      .toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .replace(/&/g, 'und')
      .replace(/[^a-z0-9]+/g, '-')  // non-alphanumeric runs → single hyphen
      .replace(/^-|-$/g, '');        // trim leading/trailing hyphens
  }

  private static applyCustomCouponToAmount(
    baseCents: number,
    coupon: { type: 'percent' | 'amount'; value: number }
  ): number {
    if (coupon.type === 'percent') {
      const pct = Math.max(0, Math.min(100, coupon.value));
      return Math.max(0, Math.round((baseCents * (100 - pct)) / 100));
    }
    return Math.max(0, baseCents - Math.max(0, Math.round(coupon.value)));
  }
  
  /**
   * Create a Stripe coupon for a voucher code
   */
  static async createCoupon(voucherCode: {
    id: string;
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
    maxRedemptions?: number;
    expiresAt?: Date;
  }): Promise<Stripe.Coupon> {
    const couponData: Stripe.CouponCreateParams = {
      id: voucherCode.code,
      name: `Voucher: ${voucherCode.code}`,
      duration: 'once',
    };

    if (voucherCode.type === 'percentage') {
      couponData.percent_off = voucherCode.value;
    } else {
      couponData.amount_off = voucherCode.value;
      couponData.currency = 'eur';
    }

    if (voucherCode.maxRedemptions) {
      couponData.max_redemptions = voucherCode.maxRedemptions;
    }

    if (voucherCode.expiresAt) {
      couponData.redeem_by = Math.floor(voucherCode.expiresAt.getTime() / 1000);
    }

    return await stripe.coupons.create(couponData);
  }

  /**
   * Create a promotion code for customer-facing use
   */
  static async createPromotionCode(couponId: string, code: string): Promise<Stripe.PromotionCode> {
    return await stripe.promotionCodes.create({
      coupon: couponId,
      code: code,
      active: true,
    });
  }

  /**
   * Create checkout session with voucher support
   */
  static async createCheckoutSession(data: CheckoutSessionData): Promise<Stripe.Checkout.Session> {
    if (!stripe || !stripeConfigured) {
      // Instead of throwing an error, return a mock success for demo purposes
      console.warn('⚠️  Stripe not configured, returning demo response');
      console.log('📦 Demo checkout data:', JSON.stringify(data, null, 2));
      
      // Get the proper base URL for demo mode
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      const demoSessionId = `demo_session_${Date.now()}`;
      
      // Store the voucher data for demo session retrieval
      const voucherDataStr = JSON.stringify(data.voucherData || {});
      
      // Create a mock session object that mimics Stripe's response
      const mockSession = {
        id: demoSessionId,
        url: `${baseUrl}/checkout/mock-success?session_id=${demoSessionId}`,
        object: 'checkout.session',
        payment_status: 'paid',
        success_url: data.successUrl,
        cancel_url: data.cancelUrl,
        customer_email: data.customerEmail || 'demo@example.com',
        amount_total: data.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        metadata: {
          source: 'photography_website',
          voucher_used: data.appliedVoucherCode || 'none',
          mode: data.mode || 'voucher',
          voucher_data: voucherDataStr,
          payment_method_preference: data.paymentMethod || 'card'
        }
      } as unknown as Stripe.Checkout.Session;

      console.log('✅ Demo checkout session created:', mockSession.url);
      return mockSession;
    }

    try {
  // Build URLs with robust fallbacks. Prefer controller-provided URLs when present.
  const siteBase = process.env.SITE_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
  const voucherSuccess = `${siteBase}/voucher/thank-you?session_id={CHECKOUT_SESSION_ID}`;
  const defaultSuccess = `${siteBase}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
  const successUrl = data.successUrl || (data.mode === 'voucher' ? voucherSuccess : defaultSuccess);
  const cancelUrl = data.cancelUrl || `${siteBase}/cart`;

  // Use live-reloading coupons service to find a matching custom coupon
  const appliedCode = data.appliedVoucherCode?.toUpperCase();
  let matchedCoupon = appliedCode ? findCoupon(appliedCode) : null;

      // If the frontend already computed an exact discount (in cents), we will honor it verbatim
      // to guarantee Stripe total matches the cart. This avoids edge cases where SKU mapping or
      // timing would otherwise produce a slightly different amount in Stripe.
      let clientDiscountCents = Math.max(0, Math.round(Number((data as any).discount) || 0));
      if (clientDiscountCents > 0) {
        // Keep coupon code only for metadata/analytics but skip re-applying a percentage/amount rule
        matchedCoupon = null;
      }

      // Server-authoritative price for landing-page voucher offers: verify the
      // signed token and FORCE the primary item's price/name to the signed values,
      // so an edited ?offer= / item.price can never change what is charged. A
      // present-but-invalid token is a tamper attempt → reject.
      const signedOffer = (data as any).offerToken ? verifyOfferToken((data as any).offerToken) : null;
      if ((data as any).offerToken && !signedOffer) {
        throw new Error('Invalid or tampered offer token');
      }
      if (signedOffer && data.items && data.items[0]) {
        data.items[0].price = Math.round(signedOffer.amount * 100); // cents
        data.items[0].name = signedOffer.title;
      }

      // Server-authoritative DISCOUNT (defense in depth). Where the price is signed
      // (offer token), the coupon discount must be signed-derived too — otherwise a
      // crafted request could pair a product-restricted code with the wrong product,
      // or over-state the discount, and we'd honour the client cents verbatim. So we
      // re-derive the MAXIMUM allowed discount from the DB coupon against the SIGNED
      // amount + SIGNED product slug, and clamp the client discount to it. (This only
      // gates DB coupons on signed-offer purchases; the normal /vouchers flow, whose
      // price is not signed, keeps its existing client-trusted behaviour and is
      // enforced at the /validate step.)
      const appliedCodeForCheck = String(data.appliedVoucherCode || (data as any).appliedVoucher?.code || '').trim();
      if (signedOffer && clientDiscountCents > 0 && appliedCodeForCheck) {
        try {
          const { storage } = await import('../storage');
          const dbCoupon: any = await storage.getDiscountCouponByCode(appliedCodeForCheck);
          if (dbCoupon) {
            const nowD = new Date();
            const signedCents = Math.round(signedOffer.amount * 100);
            const active =
              dbCoupon.isActive &&
              (!dbCoupon.startDate || new Date(dbCoupon.startDate) <= nowD) &&
              (!dbCoupon.endDate || new Date(dbCoupon.endDate) >= nowD) &&
              (!dbCoupon.usageLimit || (dbCoupon.usageCount || 0) < dbCoupon.usageLimit) &&
              (!dbCoupon.minOrderAmount || signedOffer.amount >= parseFloat(String(dbCoupon.minOrderAmount)));
            const allProducts =
              !dbCoupon.applicableProducts ||
              dbCoupon.applicableProducts.length === 0 ||
              dbCoupon.applicableProducts.includes('all');
            const slug = String(signedOffer.slug || '').toLowerCase();
            const productAllowed =
              allProducts ||
              (!!slug &&
                (dbCoupon.applicableProducts || []).some((p: string) => {
                  const pl = String(p || '').toLowerCase();
                  return pl === slug || (pl && (pl.includes(slug) || slug.includes(pl)));
                }));
            let allowedCents = 0;
            if (active && productAllowed) {
              if (dbCoupon.discountType === 'percentage') {
                allowedCents = Math.round((signedCents * parseFloat(dbCoupon.discountValue)) / 100);
                if (dbCoupon.maxDiscountAmount) {
                  allowedCents = Math.min(allowedCents, Math.round(parseFloat(dbCoupon.maxDiscountAmount) * 100));
                }
              } else {
                allowedCents = Math.min(signedCents, Math.round(parseFloat(dbCoupon.discountValue) * 100));
              }
            }
            if (clientDiscountCents > allowedCents) {
              console.warn(
                `[CHECKOUT] Discount clamped for code "${appliedCodeForCheck}": client=${clientDiscountCents}c allowed=${allowedCents}c (product="${slug || 'n/a'}", active=${active}, productAllowed=${productAllowed})`
              );
              clientDiscountCents = allowedCents;
            }
          }
        } catch (e) {
          // Fail safe: if re-validation errors, drop the discount rather than
          // honouring an unverified client amount on a signed-price purchase.
          console.error('[CHECKOUT] Discount re-validation failed — dropping discount:', e);
          clientDiscountCents = 0;
        }
      }

      // If a custom coupon applies, compute discounted unit amounts per applicable SKU and always use dynamic price_data
      // Precompute SKU and discount delta for first item (voucher flow is single-item)
      const primary = data.items[0];
      const primaryName = primary?.name || primary?.title || 'Fotoshooting Gutschein';
      const primarySku = primary?.sku || this.deriveSkuFromName(primaryName);
      // Recomputed below from voucher_products once the price map is loaded — this is the
      // figure the PDF and the discount metadata are derived from, so it must be the
      // charged price, not the submitted one.
      let basePrimaryCents = Math.max(0, Math.round(Number(primary?.price || 0)));
      let discountedPrimaryCents = basePrimaryCents;

      let remainingClientDiscount = clientDiscountCents;
      const appliedCodeUpper = String(data.appliedVoucherCode || data.appliedVoucher?.code || '').toUpperCase();

      // Resolved ONCE, here, because the map below is synchronous — and because every line
      // item on a session must share a currency anyway. Was hardcoded 'eur', so a GBP
      // studio's customer saw £ on the page and was charged euros.
      const currency = await getStudioCurrency();

      // THE SERVER OWNS THE PRICE.
      //
      // unit_amount was taken from item.price — a number the browser sends. Only the
      // DISCOUNT was ever re-derived server-side, and only when a signed offer token was
      // present. So anyone could post a checkout for a 295 session at 1 cent and Stripe
      // would charge exactly that: the studio ships the shoot and receives a penny, and
      // nothing in the system flags it, because the amount the customer "agreed" is the
      // amount they submitted.
      //
      // Prices now come from voucher_products, keyed on the sku or id the client sends.
      // The submitted figure is kept only to log a mismatch — it is never charged. An item
      // that matches no product keeps its submitted price, because bespoke line items
      // (delivery, a manual quote) legitimately have none; those are logged too.
      const priceBySku = new Map<string, number>();
      try {
        const neonMod: any = await import('../../database.js');
        const neonDb = neonMod.default || neonMod;
        if (typeof neonDb.getVoucherProducts === 'function') {
          for (const p of (await neonDb.getVoucherProducts()) || []) {
            const cents = Math.round((Number(p.price) || 0) * 100);
            if (cents <= 0) continue; // unpriced starter product: not purchasable
            for (const key of [p.id, p.slug, p.sku].filter(Boolean)) {
              priceBySku.set(String(key).toLowerCase(), cents);
            }
          }
        }
      } catch (e: any) {
        console.warn('[CHECKOUT] could not load product prices, falling back to submitted values:', e?.message || e);
      }

      const authoritativePrice = (item: any): number => {
        const submitted = Math.max(0, Math.round(Number(item?.price) || 0));
        for (const key of [item?.sku, item?.id, item?.productId, item?.slug].filter(Boolean)) {
          const known = priceBySku.get(String(key).toLowerCase());
          if (known !== undefined) {
            if (known !== submitted) {
              console.warn(
                `[CHECKOUT] price mismatch for "${key}": browser sent ${submitted}, charging ${known} from voucher_products`,
              );
            }
            return known;
          }
        }
        if (priceBySku.size) {
          console.warn(`[CHECKOUT] no product matched "${item?.sku || item?.name}" — using submitted ${submitted}`);
        }
        return submitted;
      };

      // The primary item's base price, from the same authoritative source.
      basePrimaryCents = authoritativePrice(primary);
      discountedPrimaryCents = basePrimaryCents;

      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = data.items.map(item => {
        const name = item.name || item.title || 'Fotoshooting Gutschein';
        const qty = Math.max(1, Number(item.quantity) || 1);
        const baseCents = authoritativePrice(item);
        let unitCents = baseCents;

        if (matchedCoupon && isCouponActive(matchedCoupon)) {
          const sku = item.sku || this.deriveSkuFromName(name);
          if (allowsSku(matchedCoupon as any, sku)) {
            unitCents = this.applyCustomCouponToAmount(baseCents, {
              type: matchedCoupon.type === 'amount' ? 'amount' : 'percent',
              value: matchedCoupon.value,
            });
          }
        } else if (remainingClientDiscount > 0) {
          // Apply the explicit client-side discount to the main voucher item(s) only.
          // We avoid discounting delivery or non-voucher items by checking description/sku.
          const looksLikeDelivery = (item.sku || '').toString().toLowerCase().startsWith('delivery-')
            || (item.description || '').toLowerCase().includes('liefer');
          if (!looksLikeDelivery) {
            // Apply discount to all eligible voucher products regardless of price
            // SKU-based validation is handled by the coupon system
            const maxReducible = unitCents; // per unit
            const reduceBy = Math.min(maxReducible, remainingClientDiscount);
            unitCents = Math.max(0, unitCents - reduceBy);
            remainingClientDiscount = Math.max(0, remainingClientDiscount - reduceBy);
          }
        }

        if (item === primary) {
          discountedPrimaryCents = unitCents;
        }

        return {
          price_data: {
            currency,
            product_data: {
              name,
              description: item.description,
            },
            unit_amount: unitCents,
          },
          quantity: qty,
        } as Stripe.Checkout.SessionCreateParams.LineItem;
      });

      // Configure payment methods based on user selection
      let paymentMethodTypes: string[] = ['card']; // Default to card
      
      if (data.paymentMethod) {
        switch (data.paymentMethod) {
          case 'card':
            paymentMethodTypes = ['card', 'klarna'];
            break;
          default:
            paymentMethodTypes = ['card', 'klarna'];
        }
      } else {
        // If no specific method selected, offer all available options
        paymentMethodTypes = ['card', 'klarna'];
      }

      const needsShipping = Array.isArray(data.items) && data.items.some(i => (i.sku || '').toString().toLowerCase().startsWith('delivery-') || (i.description || '').toLowerCase().includes('liefer'));

      // The studio's own delivery catchment and checkout language, rather than the origin
      // studio's. Both fail open: an unknown or unset country yields no restriction at
      // all, which is the safe direction — a customer who can buy is better than a
      // customer blocked by a list that predates them.
      let checkoutCountries: string[] = [];
      let checkoutLocale: Stripe.Checkout.SessionCreateParams.Locale = 'auto';
      try {
        const { pool } = await import('../db');
        const { rows } = await pool.query(
          'SELECT country, site_language FROM studio_configs ORDER BY created_at LIMIT 1',
        );
        const iso = String(rows[0]?.country || '').trim().toUpperCase();
        if (/^[A-Z]{2}$/.test(iso)) checkoutCountries = [iso];
        const lang = String(rows[0]?.site_language || '').trim().toLowerCase().slice(0, 2);
        if (['de', 'en', 'fr', 'es', 'it', 'nl'].includes(lang)) {
          checkoutLocale = lang as Stripe.Checkout.SessionCreateParams.Locale;
        }
      } catch { /* leave unrestricted and on auto */ }
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: paymentMethodTypes as Stripe.Checkout.SessionCreateParams.PaymentMethodType[],
        line_items: lineItems,
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: data.customerEmail,
        // Was hardcoded ['DE','AT','CH'] — the origin studio's delivery catchment. A UK
        // studio's customer reached checkout and found their own country missing from the
        // shipping list, which does not degrade the sale, it prevents it. Read from the
        // studio, and fall back to "anywhere Stripe allows" rather than to three
        // countries somebody else chose.
        shipping_address_collection: needsShipping
          ? (checkoutCountries.length ? { allowed_countries: checkoutCountries as any } : undefined)
          : undefined,
        billing_address_collection: 'required',
  // Never allow Stripe promo codes; prices are pre-discounted server-side
  allow_promotion_codes: false,
        // Was hardcoded 'de', so every customer of every studio met a German checkout.
        // 'auto' lets Stripe follow the buyer's own browser, which is better than either
        // a fixed German page or a fixed English one.
        locale: checkoutLocale,
      };

      // Never attach Stripe discounts when using custom coupons

      // Add metadata for tracking
      const voucherId = (`V-` + uuidv4().slice(0, 8)).toUpperCase();
      const personalization = data.voucherData || {};
      const recipientName = String(personalization.recipientName || personalization.name || '').trim();
      const fromName = String(personalization.fromName || personalization.sender || personalization.senderName || '').trim();
      const message = String(personalization.message || personalization.personalMessage || '').trim();
      const expiryDate = String(personalization.expiryDate || '').trim();
      const designImage = String(personalization.selectedDesign?.image || '').trim();
      const designTemplateId = String(personalization.selectedDesign?.id || '').trim();
      const customImage = String(personalization.customImageUrl || '').trim();
      // Gift purchase: hide the price ("Wert") on the generated voucher PDF.
      const hideValue = personalization.hideValue === true || ['1', 'true', 'yes'].includes(String(personalization.hideValue || (data as any).hideValue || '').toLowerCase());
      const productHeroImage = String(personalization.productHeroImage || '').trim(); // Product default image fallback
      const productDescription = String(personalization.productDescription || '').trim();

      // Store the actual product name from line items for PDF generation
      const productName = String(primaryName || '').trim();

      sessionParams.metadata = {
        source: 'photography_website',
        voucher_used: data.appliedVoucherCode || data.appliedVoucher?.code || 'none',
        mode: data.mode || 'standard',
        payment_method_preference: data.paymentMethod || 'card',
        voucher_data: data.voucherData ? JSON.stringify(data.voucherData).substring(0, 500) : '',
        // Voucher-specific metadata for PDF generation
        sku: String(primarySku || ''),
        product_name: productName, // Actual product name for PDF title
        voucher_id: voucherId,
        recipient_name: recipientName,
        from_name: fromName,
        message,
        expiry_date: expiryDate,
        base_unit: String(basePrimaryCents),
        // If client sent discount, reflect it here; otherwise use computed delta
        discount_cents: String(Math.max(0, (Number((data as any).discount) || 0) || (basePrimaryCents - discountedPrimaryCents))),
        shipping_address: data.voucherData?.shippingAddress ? JSON.stringify(data.voucherData.shippingAddress).substring(0, 500) : '',
        // Optional art for PDF rendering (priority: custom > design > product default)
        design_image: designImage,
        design_template_id: designTemplateId,
        custom_image: customImage,
        product_hero_image: productHeroImage, // Fallback to product's default hero image
        product_description: productDescription.substring(0, 1200),
        // Gift: suppress the "Wert" line on the PDF (read back in /voucher/pdf/:id).
        hide_value: hideValue ? 'true' : '',
        // Email→order attribution: campaign that drove this purchase (if any).
        campaign_id: String((data as any).campaignId || (data as any).campaign_id || '').substring(0, 64),
      };

      sessionParams.payment_intent_data = {
        metadata: {
          sku: String(primarySku || ''),
          voucher_id: voucherId,
        }
      };

      console.log('Creating Stripe checkout session with params:', {
        lineItems: lineItems.length,
        discounts: sessionParams.discounts?.length || 0,
        paymentMethods: paymentMethodTypes,
        successUrl,
        cancelUrl
      });

      const session = await stripe.checkout.sessions.create(sessionParams);

      console.log('Stripe checkout session created successfully:', session.id);

      // Best-effort: record this started-but-unpaid checkout for abandoned-cart
      // recovery. Fully guarded — must never affect the checkout response.
      try {
        const { recordAbandonedCheckout } = await import('./abandonedCheckout.js');
        void recordAbandonedCheckout({
          sessionId: session.id,
          email: data.customerEmail,
          amountCents: typeof session.amount_total === 'number' ? session.amount_total : null,
          currency: session.currency || 'EUR',
        });
      } catch { /* never block checkout */ }

      return session;

    } catch (error) {
      console.error('Stripe checkout session creation failed:', error);
      throw new Error(`Failed to create checkout session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieve checkout session
   */
  static async retrieveSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    if (!stripe || !stripeConfigured) {
      throw new Error('Stripe is not properly configured. Please check your STRIPE_SECRET_KEY.');
    }
    
    return await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'total_details'],
    });
  }

  /**
   * Handle successful payment and voucher usage tracking
   */
  static async handleSuccessfulPayment(sessionId: string): Promise<{
    session: Stripe.Checkout.Session;
    voucherUsed?: string;
    generatedVoucher?: GeneratedVoucher;
  }> {
    // Handle demo session case
    if (sessionId.startsWith('demo_session_')) {
      console.log('Handling demo payment session:', sessionId);
      
      // Create a mock session response for demo
      const mockSession = {
        id: sessionId,
        object: 'checkout.session',
        payment_status: 'paid',
        customer_email: 'demo@example.com',
        metadata: {},
        total_details: {
          amount_total: 19500, // €195.00 in cents
        }
      } as unknown as Stripe.Checkout.Session;

      // Generate a demo voucher
      const generatedVoucher = await VoucherGenerationService.createGiftVoucher({
        recipientEmail: 'demo@example.com',
        recipientName: 'Demo User',
        amount: 195.00,
        type: 'Fotoshooting Gutschein',
        message: 'This is a demo voucher - payment system is being configured',
        deliveryMethod: 'email'
      });

      // Send email in demo mode (no real Stripe session PDF will be attached)
      try {
        await this.sendVoucherEmail(generatedVoucher, sessionId);
      } catch (e) {
        console.warn('Demo: failed to send voucher email:', e);
      }

      return {
        session: mockSession,
        generatedVoucher
      };
    }

    if (!stripe || !stripeConfigured) {
      throw new Error('Stripe is not properly configured. Please check your STRIPE_SECRET_KEY.');
    }

    const session = await this.retrieveSession(sessionId);
    
    console.log('📧 Processing successful payment for session:', sessionId);
    console.log('💳 Session metadata:', session.metadata);
    
    // Track voucher usage if applicable
    const voucherUsed = session.metadata?.voucher_used;
    if (voucherUsed && voucherUsed !== 'none') {
      await this.trackVoucherUsage(voucherUsed, session.customer_email as string);
    }

    // Generate new voucher if this was a voucher purchase
    let generatedVoucher: GeneratedVoucher | undefined;
    
    if (session.metadata?.voucher_data) {
      try {
        console.log('🎁 Parsing voucher data from metadata...');
        const voucherData = JSON.parse(session.metadata.voucher_data);
        
        console.log('✅ Voucher data parsed:', voucherData);
        
        // Extract amount from session total (in cents, convert to euros)
        const amountInCents = session.amount_total || 0;
        const amount = amountInCents / 100;
        
        // Create the voucher with sequential security code
        generatedVoucher = await VoucherGenerationService.createGiftVoucher({
          recipientEmail: voucherData.recipientEmail || session.customer_email || '',
          recipientName: voucherData.recipientName || 'Valued Customer',
          amount: amount,
          type: voucherData.type || voucherData.selectedDesign?.occasion || 'Fotoshooting Gutschein',
          message: voucherData.message || voucherData.personalMessage || '',
          deliveryMethod: voucherData.deliveryOption?.name?.toLowerCase().includes('pdf') ? 'email' : 'postal',
          deliveryDate: voucherData.deliveryDate ? new Date(voucherData.deliveryDate) : undefined,
          senderName: voucherData.fromName || voucherData.senderName,
          senderEmail: session.customer_email || undefined
        });

        console.log('✅ Generated voucher with security code:', generatedVoucher.securityCode);
        
        // Send voucher email or schedule delivery
        if (generatedVoucher.deliveryMethod === 'email') {
          await this.sendVoucherEmail(generatedVoucher, session.id);
        }
        
      } catch (error) {
        console.error('❌ Error generating voucher:', error);
        console.error('❌ Metadata content:', session.metadata?.voucher_data);
      }
    } else {
      console.warn('⚠️  No voucher_data found in session metadata');
    }

    return {
      session,
      voucherUsed: voucherUsed !== 'none' ? voucherUsed : undefined,
      generatedVoucher
    };
  }

  /**
   * Send voucher email to recipient
   */
  private static async sendVoucherEmail(voucher: GeneratedVoucher, sessionId?: string): Promise<void> {
    try {
      const voucherDocument = await VoucherGenerationService.generateVoucherDocument(voucher);

      // Try to fetch the generated PDF from the internal PDF endpoint (if sessionId provided)
      const attachments: Array<{ filename: string; content: Buffer; contentType?: string }> = [];
      if (sessionId) {
        try {
          const internalBase = process.env.SITE_URL || process.env.FRONTEND_URL || `http://localhost:${process.env.PORT || 3001}`;
          const resp = await fetch(`${internalBase}/voucher/pdf?session_id=${encodeURIComponent(sessionId)}`);
          if (resp && resp.ok) {
            const buf = Buffer.from(await resp.arrayBuffer());
            attachments.push({ filename: `Gutschein_${voucher.securityCode}.pdf`, content: buf, contentType: 'application/pdf' });
          } else {
            console.warn('[EMAIL] Could not fetch voucher PDF for attachment, status=', resp?.status);
          }
        } catch (e) {
          console.warn('[EMAIL] Error fetching voucher PDF for attachment:', e);
        }
      }

      // Subject was German regardless of the studio's language, and fell back to naming
      // the origin studio — so an English studio's customer received "Ihr Geschenkgutschein
      // von New Age Fotografie" in their inbox after paying. Follows the site language, and
      // omits the sender rather than inventing one.
      const studioName = (process.env.BUSINESS_NAME || '').trim();
      let isDe = false;
      try {
        const { getSiteLanguage } = await import('../lib/site-language');
        isDe = String((await getSiteLanguage()) || '').toLowerCase().startsWith('de');
      } catch { /* default to English */ }
      const subject = isDe
        ? `Ihr Geschenkgutschein${studioName ? ` von ${studioName}` : ''}`
        : `Your gift voucher${studioName ? ` from ${studioName}` : ''}`;

      await EnhancedEmailService.sendEmail({
        to: voucher.recipientEmail,
        subject,
        content: voucherDocument.htmlContent.replace(/<[^>]+>/g, '\n'),
        html: voucherDocument.htmlContent,
        attachments: attachments.map(a => ({ filename: a.filename, content: a.content, contentType: a.contentType })),
        autoLinkClient: true
      });
      
    } catch (error) {
      console.error('Error sending voucher email:', error);
    }
  }

  /**
   * Track voucher usage in your database
   */
  private static async trackVoucherUsage(voucherCode: string, customerEmail: string): Promise<void> {
    // Implementation depends on your database
    // This could update a voucher usage table, increment counters, etc.
    console.log(`Voucher ${voucherCode} used by ${customerEmail}`);
    
    // Example database update:
    // await db.voucherUsage.create({
    //   voucherCode,
    //   customerEmail,
    //   usedAt: new Date(),
    // });
    
    // await db.voucherCodes.update({
    //   where: { code: voucherCode },
    //   data: { usedCount: { increment: 1 } }
    // });
  }
}

// Example usage in your API endpoint:
export async function createPhotographyCheckout(req: any, res: any) {
  try {
    const checkoutData: CheckoutSessionData = req.body;
    
    const session = await StripeVoucherService.createCheckoutSession({
      ...checkoutData,
      successUrl: `${process.env.FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${process.env.FRONTEND_URL}/cart`,
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Checkout creation failed:', error);
    res.status(500).json({ error: 'Checkout creation failed' });
  }
}

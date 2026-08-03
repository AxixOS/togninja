"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeVoucherService = void 0;
exports.createPhotographyCheckout = createPhotographyCheckout;
const stripe_1 = __importDefault(require("stripe"));
const coupons_1 = require("./coupons");
const uuid_1 = require("uuid");
const voucherGenerationService_1 = require("./voucherGenerationService");
// Check if Stripe key is properly configured
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
let stripe = null;
let stripeConfigured = false;
// Validate Stripe configuration
if (!stripeSecretKey) {
    console.warn('⚠️  STRIPE_SECRET_KEY is missing from environment variables');
    console.warn('⚠️  Stripe payments will be disabled. Set STRIPE_SECRET_KEY to enable payments.');
}
else if (stripeSecretKey.includes('dummy') || stripeSecretKey.includes('xxx') || stripeSecretKey.length < 20) {
    console.warn('⚠️  Invalid Stripe secret key detected. Please use a real test key from your Stripe dashboard.');
    console.warn('⚠️  Current key starts with:', stripeSecretKey.substring(0, 10) + '...');
    console.warn('⚠️  Stripe payments will be disabled.');
}
else {
    try {
        stripe = new stripe_1.default(stripeSecretKey, {
            apiVersion: '2025-08-27.basil',
            typescript: true
        });
        stripeConfigured = true;
        console.log('✅ Stripe configured successfully');
    }
    catch (error) {
        console.warn('⚠️  Failed to initialize Stripe:', error);
        console.warn('⚠️  Stripe payments will be disabled.');
    }
}
class StripeVoucherService {
    static parseCustomCoupons() {
        try {
            const raw = process.env.COUPONS_JSON;
            if (!raw)
                return [];
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed))
                return [];
            return parsed
                .filter((c) => c && typeof c.code === 'string')
                .map((c) => ({
                code: String(c.code).toUpperCase(),
                type: (String(c.type).toLowerCase() === 'amount' ? 'amount' : 'percent'),
                value: Number(c.value) || 0,
                skus: Array.isArray(c.skus) ? c.skus.map((s) => String(s).toLowerCase()) : undefined,
            }));
        }
        catch {
            return [];
        }
    }
    static deriveSkuFromName(name) {
        if (!name)
            return undefined;
        const n = name.toLowerCase();
        if (n.includes('schwangerschaft') && n.includes('basic'))
            return 'Maternity-Basic';
        if (n.includes('family') && n.includes('basic'))
            return 'Family-Basic';
        if (n.includes('newborn') && n.includes('basic'))
            return 'Newborn-Basic';
        if (n.includes('schwangerschaft') && n.includes('premium'))
            return 'Maternity-Premium';
        if (n.includes('family') && n.includes('premium'))
            return 'Family-Premium';
        if (n.includes('newborn') && n.includes('premium'))
            return 'Newborn-Premium';
        if (n.includes('schwangerschaft') && n.includes('deluxe'))
            return 'Maternity-Deluxe';
        if (n.includes('family') && n.includes('deluxe'))
            return 'Family-Deluxe';
        if (n.includes('newborn') && n.includes('deluxe'))
            return 'Newborn-Deluxe';
        return undefined;
    }
    static applyCustomCouponToAmount(baseCents, coupon) {
        if (coupon.type === 'percent') {
            const pct = Math.max(0, Math.min(100, coupon.value));
            return Math.max(0, Math.round((baseCents * (100 - pct)) / 100));
        }
        return Math.max(0, baseCents - Math.max(0, Math.round(coupon.value)));
    }
    /**
     * Create a Stripe coupon for a voucher code
     */
    static async createCoupon(voucherCode) {
        const couponData = {
            id: voucherCode.code,
            name: `Voucher: ${voucherCode.code}`,
            duration: 'once',
        };
        if (voucherCode.type === 'percentage') {
            couponData.percent_off = voucherCode.value;
        }
        else {
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
    static async createPromotionCode(couponId, code) {
        return await stripe.promotionCodes.create({
            coupon: couponId,
            code: code,
            active: true,
        });
    }
    /**
     * Create checkout session with voucher support
     */
    static async createCheckoutSession(data) {
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
            };
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
            let matchedCoupon = appliedCode ? (0, coupons_1.findCoupon)(appliedCode) : null;
            // If the frontend already computed an exact discount (in cents), we will honor it verbatim
            // to guarantee Stripe total matches the cart. This avoids edge cases where SKU mapping or
            // timing would otherwise produce a slightly different amount in Stripe.
            const clientDiscountCents = Math.max(0, Math.round(Number(data.discount) || 0));
            if (clientDiscountCents > 0) {
                // Keep coupon code only for metadata/analytics but skip re-applying a percentage/amount rule
                matchedCoupon = null;
            }
            // If a custom coupon applies, compute discounted unit amounts per applicable SKU and always use dynamic price_data
            // Precompute SKU and discount delta for first item (voucher flow is single-item)
            const primary = data.items[0];
            const primaryName = primary?.name || primary?.title || 'Fotoshooting Gutschein';
            const primarySku = primary?.sku || this.deriveSkuFromName(primaryName);
            const basePrimaryCents = Math.max(0, Math.round(Number(primary?.price || 0)));
            let discountedPrimaryCents = basePrimaryCents;
            let remainingClientDiscount = clientDiscountCents;
            const strict95Codes = new Set((process.env.COUPONS_95_ONLY || 'VCWIEN')
                .split(',')
                .map(s => s.trim().toUpperCase())
                .filter(Boolean));
            const appliedCodeUpper = String(data.appliedVoucherCode || data.appliedVoucher?.code || '').toUpperCase();
            const lineItems = data.items.map(item => {
                const name = item.name || item.title || 'Fotoshooting Gutschein';
                const qty = Math.max(1, Number(item.quantity) || 1);
                const baseCents = Math.max(0, Math.round(Number(item.price) || 0));
                let unitCents = baseCents;
                if (matchedCoupon && (0, coupons_1.isCouponActive)(matchedCoupon)) {
                    const sku = item.sku || this.deriveSkuFromName(name);
                    if ((0, coupons_1.allowsSku)(matchedCoupon, sku)) {
                        unitCents = this.applyCustomCouponToAmount(baseCents, {
                            type: matchedCoupon.type === 'amount' ? 'amount' : 'percent',
                            value: matchedCoupon.value,
                        });
                    }
                }
                else if (remainingClientDiscount > 0) {
                    // Apply the explicit client-side discount to the main voucher item(s) only.
                    // We avoid discounting delivery or non-voucher items by checking description/sku.
                    const looksLikeDelivery = (item.sku || '').toString().toLowerCase().startsWith('delivery-')
                        || (item.description || '').toLowerCase().includes('liefer');
                    if (!looksLikeDelivery) {
                        // If code is in strict €95-only list, require baseCents == 9500
                        if (strict95Codes.has(appliedCodeUpper) && baseCents !== 9500) {
                            // skip applying discount for this line
                        }
                        else {
                            const maxReducible = unitCents; // per unit
                            const reduceBy = Math.min(maxReducible, remainingClientDiscount);
                            unitCents = Math.max(0, unitCents - reduceBy);
                            remainingClientDiscount = Math.max(0, remainingClientDiscount - reduceBy);
                        }
                    }
                }
                if (item === primary) {
                    discountedPrimaryCents = unitCents;
                }
                return {
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name,
                            description: item.description,
                        },
                        unit_amount: unitCents,
                    },
                    quantity: qty,
                };
            });
            // Configure payment methods based on user selection
            let paymentMethodTypes = ['card']; // Default to card
            if (data.paymentMethod) {
                switch (data.paymentMethod) {
                    case 'card':
                        paymentMethodTypes = ['card', 'klarna'];
                        break;
                    default:
                        paymentMethodTypes = ['card', 'klarna'];
                }
            }
            else {
                // If no specific method selected, offer all available options
                paymentMethodTypes = ['card', 'klarna'];
            }
            const needsShipping = Array.isArray(data.items) && data.items.some(i => (i.sku || '').toString().toLowerCase().startsWith('delivery-') || (i.description || '').toLowerCase().includes('liefer'));
            const sessionParams = {
                payment_method_types: paymentMethodTypes,
                line_items: lineItems,
                mode: 'payment',
                success_url: successUrl,
                cancel_url: cancelUrl,
                customer_email: data.customerEmail,
                shipping_address_collection: needsShipping ? { allowed_countries: ['DE', 'AT', 'CH'] } : undefined,
                billing_address_collection: 'required',
                // Never allow Stripe promo codes; prices are pre-discounted server-side
                allow_promotion_codes: false,
                locale: 'de',
            };
            // Never attach Stripe discounts when using custom coupons
            // Add metadata for tracking
            const voucherId = (`V-` + (0, uuid_1.v4)().slice(0, 8)).toUpperCase();
            const personalization = data.voucherData || {};
            const recipientName = String(personalization.recipientName || personalization.name || '').trim();
            const fromName = String(personalization.fromName || personalization.sender || personalization.senderName || '').trim();
            const message = String(personalization.message || personalization.personalMessage || '').trim();
            const expiryDate = String(personalization.expiryDate || '').trim();
            const designImage = String(personalization.selectedDesign?.image || '').trim();
            const customImage = String(personalization.customImageUrl || '').trim();
            const productHeroImage = String(personalization.productHeroImage || '').trim(); // Product default image fallback
            const productDescription = String(personalization.productDescription || '').trim();
            sessionParams.metadata = {
                source: 'photography_website',
                voucher_used: data.appliedVoucherCode || data.appliedVoucher?.code || 'none',
                mode: data.mode || 'standard',
                payment_method_preference: data.paymentMethod || 'card',
                voucher_data: data.voucherData ? JSON.stringify(data.voucherData).substring(0, 500) : '',
                // Voucher-specific metadata for PDF generation
                sku: String(primarySku || ''),
                voucher_id: voucherId,
                recipient_name: recipientName,
                from_name: fromName,
                message,
                expiry_date: expiryDate,
                base_unit: String(basePrimaryCents),
                // If client sent discount, reflect it here; otherwise use computed delta
                discount_cents: String(Math.max(0, (Number(data.discount) || 0) || (basePrimaryCents - discountedPrimaryCents))),
                discount_strict_95: String(strict95Codes.has(appliedCodeUpper)),
                shipping_address: data.voucherData?.shippingAddress ? JSON.stringify(data.voucherData.shippingAddress).substring(0, 500) : '',
                // Optional art for PDF rendering (priority: custom > design > product default)
                design_image: designImage,
                custom_image: customImage,
                product_hero_image: productHeroImage, // Fallback to product's default hero image
                product_description: productDescription.substring(0, 1200),
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
            return session;
        }
        catch (error) {
            console.error('Stripe checkout session creation failed:', error);
            throw new Error(`Failed to create checkout session: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Retrieve checkout session
     */
    static async retrieveSession(sessionId) {
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
    static async handleSuccessfulPayment(sessionId) {
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
            };
            // Generate a demo voucher
            const generatedVoucher = await voucherGenerationService_1.VoucherGenerationService.createGiftVoucher({
                recipientEmail: 'demo@example.com',
                recipientName: 'Demo User',
                amount: 195.00,
                type: 'Fotoshooting Gutschein',
                message: 'This is a demo voucher - payment system is being configured',
                deliveryMethod: 'email'
            });
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
            await this.trackVoucherUsage(voucherUsed, session.customer_email);
        }
        // Generate new voucher if this was a voucher purchase
        let generatedVoucher;
        if (session.metadata?.voucher_data) {
            try {
                console.log('🎁 Parsing voucher data from metadata...');
                const voucherData = JSON.parse(session.metadata.voucher_data);
                console.log('✅ Voucher data parsed:', voucherData);
                // Extract amount from session total (in cents, convert to euros)
                const amountInCents = session.amount_total || 0;
                const amount = amountInCents / 100;
                // Create the voucher with sequential security code
                generatedVoucher = await voucherGenerationService_1.VoucherGenerationService.createGiftVoucher({
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
                    await this.sendVoucherEmail(generatedVoucher);
                }
            }
            catch (error) {
                console.error('❌ Error generating voucher:', error);
                console.error('❌ Metadata content:', session.metadata?.voucher_data);
            }
        }
        else {
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
    static async sendVoucherEmail(voucher) {
        try {
            const voucherDocument = voucherGenerationService_1.VoucherGenerationService.generateVoucherDocument(voucher);
            // Here you would integrate with your email service (SendGrid, etc.)
            console.log('Voucher email would be sent to:', voucher.recipientEmail);
            console.log('Security code:', voucher.securityCode);
            // Example email service integration:
            // await emailService.send({
            //   to: voucher.recipientEmail,
            //   subject: 'Ihr Geschenkgutschein von New Age Fotografie',
            //   html: voucherDocument.htmlContent,
            //   attachments: voucherDocument.pdfBuffer ? [{
            //     filename: `Gutschein_${voucher.securityCode}.pdf`,
            //     content: voucherDocument.pdfBuffer
            //   }] : []
            // });
        }
        catch (error) {
            console.error('Error sending voucher email:', error);
        }
    }
    /**
     * Track voucher usage in your database
     */
    static async trackVoucherUsage(voucherCode, customerEmail) {
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
exports.StripeVoucherService = StripeVoucherService;
// Example usage in your API endpoint:
async function createPhotographyCheckout(req, res) {
    try {
        const checkoutData = req.body;
        const session = await StripeVoucherService.createCheckoutSession({
            ...checkoutData,
            successUrl: `${process.env.FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: `${process.env.FRONTEND_URL}/cart`,
        });
        res.json({ sessionId: session.id, url: session.url });
    }
    catch (error) {
        console.error('Checkout creation failed:', error);
        res.status(500).json({ error: 'Checkout creation failed' });
    }
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateVoucherCode = exports.handleCheckoutSuccess = exports.createCheckoutSession = void 0;
const stripeVoucherService_1 = require("../services/stripeVoucherService");
const createCheckoutSession = async (req, res) => {
    try {
        const checkoutData = req.body;
        console.log('✅ Creating checkout session with data:', JSON.stringify(checkoutData, null, 2));
        // Validate required fields
        if (!checkoutData.items || checkoutData.items.length === 0) {
            console.error('❌ No items provided in checkout data');
            return res.status(400).json({ error: 'No items provided' });
        }
        // If a delivery (non-PDF) line is present, require shipping address in voucherData
        const hasDelivery = Array.isArray(checkoutData.items) && checkoutData.items.some(i => {
            const sku = (i.sku || '').toString().toLowerCase();
            const desc = (i.description || '').toLowerCase();
            return sku.startsWith('delivery-') || desc.includes('liefer');
        });
        console.log('📦 Delivery check:', { hasDelivery, items: checkoutData.items.length });
        if (hasDelivery) {
            const addr = checkoutData?.voucherData?.shippingAddress || {};
            const missing = !addr.address1 || !addr.city || !addr.zip || !addr.country;
            if (missing) {
                console.error('❌ Shipping address required but not provided:', addr);
                return res.status(400).json({ error: 'Shipping address required for postal delivery' });
            }
        }
        // Add base URLs - prefer explicit env, fallback to request origin/host
        const envBase = process.env.SITE_URL || process.env.FRONTEND_URL;
        const inferredBase = req.headers.origin
            || `${req.headers['x-forwarded-proto'] || req.protocol}://${req.get('host')}`;
        const baseUrl = (envBase || inferredBase || 'http://localhost:3001').replace(/\/+$/, '');
        // Use voucher thank-you for voucher mode, generic success otherwise
        const successPath = (checkoutData.mode === 'voucher')
            ? '/voucher/thank-you'
            : '/checkout/success';
        checkoutData.successUrl = `${baseUrl}${successPath}?session_id={CHECKOUT_SESSION_ID}`;
        checkoutData.cancelUrl = `${baseUrl}/cart`;
        console.log('🔗 Using URLs:', {
            successUrl: checkoutData.successUrl,
            cancelUrl: checkoutData.cancelUrl,
            mode: checkoutData.mode
        });
        const session = await stripeVoucherService_1.StripeVoucherService.createCheckoutSession(checkoutData);
        console.log('✅ Checkout session created successfully:', {
            sessionId: session.id,
            url: session.url
        });
        res.json({
            sessionId: session.id,
            url: session.url,
            success: true
        });
    }
    catch (error) {
        console.error('❌ Checkout creation failed with error:', error);
        res.status(500).json({
            error: 'Checkout creation failed',
            message: error instanceof Error ? error.message : 'Unknown error',
            details: error instanceof Error ? error.stack : undefined
        });
    }
};
exports.createCheckoutSession = createCheckoutSession;
const handleCheckoutSuccess = async (req, res) => {
    try {
        const { session_id } = req.query;
        if (!session_id || typeof session_id !== 'string') {
            return res.status(400).json({ error: 'Session ID required' });
        }
        const result = await stripeVoucherService_1.StripeVoucherService.handleSuccessfulPayment(session_id);
        res.json({
            success: true,
            session: result.session,
            voucherUsed: result.voucherUsed,
        });
    }
    catch (error) {
        console.error('Checkout success handling failed:', error);
        res.status(500).json({
            error: 'Failed to process successful payment',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.handleCheckoutSuccess = handleCheckoutSuccess;
const validateVoucherCode = async (req, res) => {
    try {
        const { code, cartTotal } = req.body;
        if (!code || typeof cartTotal !== 'number') {
            return res.status(400).json({ error: 'Voucher code and cart total required' });
        }
        // This would typically query your database
        // For now, we'll use the VoucherService validation
        const { VoucherService } = await import('../../client/src/services/voucherService');
        const result = await VoucherService.validateVoucherCode(code, cartTotal);
        res.json(result);
    }
    catch (error) {
        console.error('Voucher validation failed:', error);
        res.status(500).json({
            error: 'Voucher validation failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.validateVoucherCode = validateVoucherCode;

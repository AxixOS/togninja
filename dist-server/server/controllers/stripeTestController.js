"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStripePublishableKey = exports.testStripeConnection = void 0;
const stripeVoucherService_1 = require("../services/stripeVoucherService");
const testStripeConnection = async (req, res) => {
    try {
        // Test if Stripe is properly configured by creating a simple test product
        const testSession = await stripeVoucherService_1.StripeVoucherService.createCheckoutSession({
            items: [{
                    name: 'Test Voucher',
                    price: 100, // €1.00 in cents
                    quantity: 1,
                    description: 'Test voucher for Stripe connection'
                }],
            customerEmail: 'test@example.com',
            mode: 'payment'
        });
        res.json({
            success: true,
            message: 'Stripe connection is working correctly',
            testSessionId: testSession.id,
            stripeConfigured: true
        });
    }
    catch (error) {
        console.error('Stripe connection test failed:', error);
        res.status(500).json({
            success: false,
            error: 'Stripe connection failed',
            message: error instanceof Error ? error.message : 'Unknown error',
            stripeConfigured: false,
            hint: 'Please check your STRIPE_SECRET_KEY in the .env file'
        });
    }
};
exports.testStripeConnection = testStripeConnection;
const getStripePublishableKey = async (req, res) => {
    try {
        const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
        if (!publishableKey || publishableKey.includes('xxx')) {
            return res.status(500).json({
                error: 'Stripe publishable key not configured properly'
            });
        }
        res.json({
            publishableKey: publishableKey
        });
    }
    catch (error) {
        res.status(500).json({
            error: 'Failed to get Stripe configuration'
        });
    }
};
exports.getStripePublishableKey = getStripePublishableKey;

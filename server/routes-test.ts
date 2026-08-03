// Test endpoint to verify Stripe payment intent creation without actual charges
import type { Express } from "express";
import Stripe from "stripe";

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
}) : null;

export function registerTestRoutes(app: Express) {
  // Test Stripe payment intent creation (without charging)
  app.post("/api/test/stripe-payment-intent", async (req, res) => {
    try {
      if (!stripe) {
        return res.status(400).json({ 
          success: false,
          error: 'Stripe not configured - STRIPE_SECRET_KEY environment variable missing'
        });
      }

      const { amount = 1000, currency = 'eur' } = req.body; // Default €10.00
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount), // Ensure amount is integer (cents)
        currency,
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          test: 'true',
          description: 'Test payment intent - no actual charge'
        }
      });

      res.json({ 
        success: true,
        clientSecret: paymentIntent.client_secret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        paymentIntentId: paymentIntent.id,
        message: 'Test payment intent created successfully. This is a test - no money will be charged.'
      });
    } catch (error: any) {
      console.error('Stripe test error:', error);
      res.status(400).json({ 
        success: false,
        error: error.message || 'Failed to create test payment intent'
      });
    }
  });

  // Test voucher purchase flow (without actual Stripe charge)
  app.post("/api/test/voucher-purchase", async (req, res) => {
    try {
      if (!stripe) {
        return res.status(400).json({ 
          success: false,
          error: 'Stripe not configured - STRIPE_SECRET_KEY environment variable missing'
        });
      }

      const { voucherId, quantity = 1, customerDetails, personalization } = req.body;

      // Validate input
      if (!voucherId || !customerDetails?.email) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: voucherId and customerDetails.email'
        });
      }

      // Mock voucher data
      const mockVoucher = {
        id: voucherId,
        name: 'Test Fotoshooting Gutschein',
        price: 149.00,
        description: 'Professional photography session'
      };

      const totalAmount = mockVoucher.price * quantity;

      // Create test payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(totalAmount * 100), // Convert to cents
        currency: 'eur',
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          test: 'true',
          voucherId,
          quantity: quantity.toString(),
          customerEmail: customerDetails.email,
          personalizationType: personalization?.designType || 'none',
          recipientName: personalization?.recipientName || '',
          message: personalization?.message || ''
        }
      });

      res.json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        voucher: mockVoucher,
        quantity,
        totalAmount,
        customerDetails,
        personalization,
        paymentIntentId: paymentIntent.id,
        message: 'Test voucher purchase flow completed. No actual charge made.',
        testMode: true
      });

    } catch (error: any) {
      console.error('Test voucher purchase error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Test voucher purchase failed'
      });
    }
  });

  // Get Stripe account info (for testing connection)
  app.get("/api/test/stripe-account", async (req, res) => {
    try {
      if (!stripe) {
        return res.status(400).json({ 
          success: false,
          error: 'Stripe not configured - STRIPE_SECRET_KEY environment variable missing'
        });
      }

      const account = await stripe.accounts.retrieve();
      
      res.json({
        success: true,
        account: {
          id: account.id,
          country: account.country,
          defaultCurrency: account.default_currency,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted
        },
        message: 'Stripe account connection successful'
      });
    } catch (error: any) {
      console.error('Stripe account test error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to retrieve Stripe account info'
      });
    }
  });
}
import { Request, Response } from 'express';
import { StripeVoucherService } from '../services/stripeVoucherService';

export const testStripeConnection = async (req: Request, res: Response) => {
  try {
    // Test if Stripe is properly configured by creating a simple test product
    const testSession = await StripeVoucherService.createCheckoutSession({
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

  } catch (error) {
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

export const getStripePublishableKey = async (req: Request, res: Response) => {
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

  } catch (error) {
    res.status(500).json({
      error: 'Failed to get Stripe configuration'
    });
  }
};

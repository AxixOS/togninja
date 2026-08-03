import Stripe from 'stripe';
import { licenseService } from './license.service';
import { deploymentService } from './deployment.service';
import { db, auditLog } from '../db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16'
});

export class StripeWebhookService {
  
  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(event: Stripe.Event): Promise<{
    handled: boolean;
    result?: any;
    error?: string;
  }> {
    console.log(`📥 Stripe webhook: ${event.type}`);
    
    switch (event.type) {
      case 'checkout.session.completed':
        return this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        return this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
      
      case 'customer.subscription.deleted':
        return this.handleSubscriptionCancelled(event.data.object as Stripe.Subscription);
      
      case 'invoice.paid':
        return this.handleInvoicePaid(event.data.object as Stripe.Invoice);
      
      case 'invoice.payment_failed':
        return this.handlePaymentFailed(event.data.object as Stripe.Invoice);
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
        return { handled: false };
    }
  }
  
  /**
   * Handle successful checkout
   * This is the main entry point for new customers
   */
  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<{
    handled: boolean;
    result?: any;
    error?: string;
  }> {
    try {
      const customerId = session.customer as string;
      const email = session.customer_email || session.customer_details?.email;
      const name = session.customer_details?.name;
      
      if (!email) {
        return { handled: false, error: 'No customer email in session' };
      }
      
      // Determine plan from metadata or line items
      const plan = (session.metadata?.plan || 'starter') as 'starter' | 'professional' | 'enterprise';
      const carePlanActive = session.metadata?.carePlan === 'true';
      
      console.log(`✅ Processing checkout for ${email} - Plan: ${plan}`);
      
      // Create customer, license, workspace, deployment
      const result = await licenseService.processCheckoutSuccess({
        stripeCustomerId: customerId,
        email,
        name: name || undefined,
        plan,
        carePlanActive,
        metadata: {
          checkoutSessionId: session.id,
          paymentIntentId: session.payment_intent,
          amountTotal: session.amount_total
        }
      });
      
      console.log(`🏗️ Created workspace: ${result.workspace.slug}`);
      
      // Immediately start deployment (async)
      deploymentService.deployWorkspace(result.workspace.id).catch(err => {
        console.error('Background deployment failed:', err);
      });
      
      return {
        handled: true,
        result: {
          workspaceId: result.workspace.id,
          workspaceSlug: result.workspace.slug,
          licenseKey: result.license.licenseKey
        }
      };
      
    } catch (error) {
      console.error('Checkout processing error:', error);
      return {
        handled: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Handle subscription updates (upgrades, renewals)
   */
  private async handleSubscriptionUpdate(subscription: Stripe.Subscription): Promise<{
    handled: boolean;
    result?: any;
  }> {
    // Log subscription update for future processing
    await db.insert(auditLog).values({
      action: 'subscription_updated',
      details: {
        subscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end
      }
    });
    
    return { handled: true };
  }
  
  /**
   * Handle subscription cancellation
   */
  private async handleSubscriptionCancelled(subscription: Stripe.Subscription): Promise<{
    handled: boolean;
    result?: any;
  }> {
    // Log cancellation
    await db.insert(auditLog).values({
      action: 'subscription_cancelled',
      details: {
        subscriptionId: subscription.id,
        cancelledAt: subscription.canceled_at
      }
    });
    
    // TODO: Update license status to 'cancelled' or 'expired'
    
    return { handled: true };
  }
  
  /**
   * Handle successful invoice payment
   */
  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<{
    handled: boolean;
  }> {
    await db.insert(auditLog).values({
      action: 'invoice_paid',
      details: {
        invoiceId: invoice.id,
        amountPaid: invoice.amount_paid,
        customerId: invoice.customer
      }
    });
    
    return { handled: true };
  }
  
  /**
   * Handle failed payment
   */
  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<{
    handled: boolean;
  }> {
    await db.insert(auditLog).values({
      action: 'payment_failed',
      details: {
        invoiceId: invoice.id,
        customerId: invoice.customer,
        attemptCount: invoice.attempt_count
      }
    });
    
    // TODO: Send payment failed email, potentially suspend license
    
    return { handled: true };
  }
  
  /**
   * Verify webhook signature
   */
  verifySignature(payload: string | Buffer, signature: string): Stripe.Event {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET not configured');
    }
    
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }
}

export const stripeWebhookService = new StripeWebhookService();

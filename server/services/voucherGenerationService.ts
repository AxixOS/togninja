import { db } from '../db';
import { eq, desc } from 'drizzle-orm';

export interface GeneratedVoucher {
  id: string;
  securityCode: string;
  purchaseDate: Date;
  recipientEmail: string;
  recipientName?: string;
  amount: number;
  type: string;
  message?: string;
  deliveryMethod: 'email' | 'postal';
  deliveryDate?: Date;
  isRedeemed: boolean;
  redeemedAt?: Date;
  createdAt: Date;
}

export class VoucherGenerationService {
  
  /**
   * Generate sequential security code with NAF prefix and date
   * Format: NAF-DDMMYY-XXXX (e.g., NAF-030925-0001)
   */
  private static async generateSecurityCode(): Promise<string> {
    const today = new Date();
    const day = today.getDate().toString().padStart(2, '0');
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const year = today.getFullYear().toString().slice(-2);
    const dateCode = `${day}${month}${year}`;
    
    // Get the last voucher for today to determine next sequence number
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    
    try {
      // This would query your actual vouchers table
      // For now, we'll use a simple counter based on today's date
      const existingVouchersToday = await this.getVoucherCountForDate(todayStart);
      const sequenceNumber = (existingVouchersToday + 1).toString().padStart(4, '0');
      
      return `NAF-${dateCode}-${sequenceNumber}`;
    } catch (error) {
      console.error('Error generating security code:', error);
      // Fallback to timestamp-based code
      const timestamp = Date.now().toString().slice(-4);
      return `NAF-${dateCode}-${timestamp}`;
    }
  }

  /**
   * Get count of vouchers created on a specific date
   */
  private static async getVoucherCountForDate(date: Date): Promise<number> {
    // This would query your actual database
    // For demo purposes, we'll use localStorage or a simple counter
    const dateKey = date.toISOString().split('T')[0];
    
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`voucher_count_${dateKey}`);
      return stored ? parseInt(stored, 10) : 0;
    }
    
    // Server-side: you'd query your actual database here
    // return await db.select({ count: count() }).from(vouchers).where(eq(vouchers.createdAt, date));
    return 0;
  }

  /**
   * Increment voucher count for today
   */
  private static async incrementVoucherCount(): Promise<void> {
    const today = new Date();
    const dateKey = today.toISOString().split('T')[0];
    
    if (typeof window !== 'undefined') {
      const current = localStorage.getItem(`voucher_count_${dateKey}`);
      const newCount = (current ? parseInt(current, 10) : 0) + 1;
      localStorage.setItem(`voucher_count_${dateKey}`, newCount.toString());
    }
    
    // Server-side: you'd update your database here
  }

  /**
   * Create a new gift voucher with sequential security code
   */
  static async createGiftVoucher(voucherData: {
    recipientEmail: string;
    recipientName?: string;
    amount: number;
    type: string;
    message?: string;
    deliveryMethod: 'email' | 'postal';
    deliveryDate?: Date;
    senderName?: string;
    senderEmail?: string;
  }): Promise<GeneratedVoucher> {
    
    const securityCode = await this.generateSecurityCode();
    await this.incrementVoucherCount();
    
    const voucher: GeneratedVoucher = {
      id: `voucher_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      securityCode,
      purchaseDate: new Date(),
      recipientEmail: voucherData.recipientEmail,
      recipientName: voucherData.recipientName,
      amount: voucherData.amount,
      type: voucherData.type,
      message: voucherData.message,
      deliveryMethod: voucherData.deliveryMethod,
      deliveryDate: voucherData.deliveryDate,
      isRedeemed: false,
      createdAt: new Date()
    };

    // In a real app, you'd save this to your database
    // await db.insert(vouchers).values(voucher);
    
    console.log('Generated voucher:', voucher);
    
    return voucher;
  }

  /**
   * Validate and redeem a voucher by security code
   */
  static async redeemVoucher(securityCode: string, redeemAmount?: number): Promise<{
    success: boolean;
    voucher?: GeneratedVoucher;
    message: string;
  }> {
    // In a real app, you'd query your database
    // const voucher = await db.select().from(vouchers).where(eq(vouchers.securityCode, securityCode));
    
    // For demo, we'll simulate this
    // This is where you'd implement the actual database lookup
    
    return {
      success: false,
      message: 'Voucher validation would be implemented here with database lookup'
    };
  }

  /**
   * Get voucher details by security code (for display/verification)
   */
  static async getVoucherBySecurityCode(securityCode: string): Promise<GeneratedVoucher | null> {
    // In a real app, you'd query your database
    // return await db.select().from(vouchers).where(eq(vouchers.securityCode, securityCode));
    
    return null;
  }

  /**
   * Generate voucher PDF or email content
   */
  /**
   * The document a paying customer keeps.
   *
   * Every studio-specific value on it was a literal: the title, the logo line, the euro
   * sign, the German labels, a two-year expiry, and a redemption footer naming New Age
   * Fotografie and www.newage-fotografie.de — a third spelling of that domain, and one
   * that appears nowhere else in the codebase. A customer buying from a Brighton studio
   * received a gift certificate redeemable at a business in Vienna.
   *
   * Now async so it can read the studio it is being issued by. The single caller
   * (stripeVoucherService.sendVoucherEmail) is already async.
   */
  static async generateVoucherDocument(voucher: GeneratedVoucher): Promise<{
    htmlContent: string;
    pdfBuffer?: Buffer;
  }> {
    const [{ getStudioCurrency }, { getSiteLanguage }] = await Promise.all([
      import('../lib/studio-currency'),
      import('../lib/site-language'),
    ]);
    const currency = (await getStudioCurrency()).toUpperCase();
    let lang = 'en';
    try { lang = (await getSiteLanguage()) || 'en'; } catch { /* default */ }
    const de = String(lang).toLowerCase().startsWith('de');
    const locale = de ? 'de-DE' : 'en-GB';

    const studioName = (process.env.BUSINESS_NAME || '').trim();
    const studioSite = (process.env.PUBLIC_SITE_URL || process.env.APP_URL || '').replace(/\/+$/, '');

    const money = (cents: number) => {
      try {
        return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100);
      } catch {
        return `${(cents / 100).toFixed(2)} ${currency}`;
      }
    };

    const T = de
      ? { doc: 'Geschenkgutschein', code: 'Gutscheincode', forWhom: 'Für', validFor: 'Gültig für',
          issued: 'Ausgestellt am', id: 'Gutschein-ID', delivery: 'Lieferung am',
          redeem: 'Einlösbar bei', online: 'Online oder in unserem Studio' }
      : { doc: 'Gift Voucher', code: 'Voucher code', forWhom: 'For', validFor: 'Valid for',
          issued: 'Issued on', id: 'Voucher ID', delivery: 'Delivery on',
          redeem: 'Redeemable at', online: 'Online or in our studio' };

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="${de ? 'de' : 'en'}">
      <head>
        <meta charset="utf-8">
        <title>${T.doc}${studioName ? ` - ${studioName}` : ''}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
          .voucher { border: 2px solid #4F46E5; border-radius: 12px; padding: 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
          .logo { font-size: 24px; font-weight: bold; margin-bottom: 20px; }
          .amount { font-size: 36px; font-weight: bold; margin: 20px 0; }
          .security-code { background: rgba(255,255,255,0.2); padding: 10px; border-radius: 8px; font-family: monospace; font-size: 18px; margin: 20px 0; }
          .details { text-align: left; margin-top: 30px; background: rgba(255,255,255,0.1); padding: 20px; border-radius: 8px; }
          .footer { margin-top: 30px; font-size: 12px; color: rgba(255,255,255,0.8); }
        </style>
      </head>
      <body>
        <div class="voucher">
          ${studioName ? `<div class="logo">🎁 ${studioName}</div>` : ''}
          <h1>${T.doc}</h1>
          <div class="amount">${money(voucher.amount)}</div>

          <div class="security-code">
            <strong>${T.code}:</strong><br>
            ${voucher.securityCode}
          </div>

          ${voucher.recipientName ? `<p><strong>${T.forWhom}:</strong> ${voucher.recipientName}</p>` : ''}
          ${voucher.message ? `<p><em>"${voucher.message}"</em></p>` : ''}

          <div class="details">
            <p><strong>${T.validFor}:</strong> ${voucher.type}</p>
            <p><strong>${T.issued}:</strong> ${voucher.purchaseDate.toLocaleDateString(locale)}</p>
            <p><strong>${T.id}:</strong> ${voucher.securityCode}</p>
            ${voucher.deliveryDate ? `<p><strong>${T.delivery}:</strong> ${voucher.deliveryDate.toLocaleDateString(locale)}</p>` : ''}
          </div>

          <div class="footer">
            ${studioName ? `<p>${T.redeem} ${studioName}<br>${studioSite ? `${studioSite}<br>` : ''}${T.online}</p>` : ''}
            <!-- The "valid for 2 years" line is deliberately gone. Voucher validity is a
                 contractual term and varies by jurisdiction — in several EU states a
                 shorter expiry on a gift voucher is unenforceable. Printing a term the
                 studio never agreed to, on a document their customer holds, is a promise
                 made on their behalf. It belongs in a studio-configurable field, not here. -->
          </div>
        </div>
      </body>
      </html>
    `;

    return { htmlContent };
  }
}

// Type exported via interface above; no separate re-export needed

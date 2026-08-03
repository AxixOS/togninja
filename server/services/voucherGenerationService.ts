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
  static generateVoucherDocument(voucher: GeneratedVoucher): {
    htmlContent: string;
    pdfBuffer?: Buffer;
  } {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Geschenkgutschein - New Age Fotografie</title>
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
          <div class="logo">🎁 New Age Fotografie</div>
          <h1>Geschenkgutschein</h1>
          <div class="amount">€${(voucher.amount / 100).toFixed(2)}</div>
          
          <div class="security-code">
            <strong>Gutscheincode:</strong><br>
            ${voucher.securityCode}
          </div>
          
          ${voucher.recipientName ? `<p><strong>Für:</strong> ${voucher.recipientName}</p>` : ''}
          ${voucher.message ? `<p><em>"${voucher.message}"</em></p>` : ''}
          
          <div class="details">
            <p><strong>Gültig für:</strong> ${voucher.type}</p>
            <p><strong>Ausgestellt am:</strong> ${voucher.purchaseDate.toLocaleDateString('de-DE')}</p>
            <p><strong>Gutschein-ID:</strong> ${voucher.securityCode}</p>
            ${voucher.deliveryDate ? `<p><strong>Lieferung am:</strong> ${voucher.deliveryDate.toLocaleDateString('de-DE')}</p>` : ''}
          </div>
          
          <div class="footer">
            <p>Einlösbar bei New Age Fotografie<br>
            Online unter www.newage-fotografie.de oder in unserem Studio<br>
            Gültig bis 2 Jahre nach Ausstellungsdatum</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return { htmlContent };
  }
}

// Type exported via interface above; no separate re-export needed

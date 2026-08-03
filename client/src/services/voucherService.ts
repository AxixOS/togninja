// Voucher code validation and management
export interface VoucherCode {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number; // percentage (0-100) or fixed amount in cents
  isActive: boolean;
  usageLimit?: number;
  usedCount: number;
  expiresAt?: Date;
  minAmount?: number; // minimum cart amount required
  maxDiscount?: number; // max discount for percentage vouchers
  description: string;
  createdAt: Date;
}

export interface AppliedVoucher {
  code: string;
  discount: number;
  type: 'percentage' | 'fixed';
  stripePromotionCodeId?: string;
}

export class VoucherService {
  private static voucherCodes: VoucherCode[] = [
    {
      id: '1',
      code: 'WELCOME20',
      type: 'percentage',
      value: 20,
      isActive: true,
      usageLimit: 100,
      usedCount: 0,
      minAmount: 5000, // €50 minimum
      maxDiscount: 5000, // €50 max discount
      description: '20% Rabatt für Neukunden',
      createdAt: new Date()
    },
    {
      id: '2',
      code: 'PHOTO50',
      type: 'fixed',
      value: 5000, // €50 in cents
      isActive: true,
      usageLimit: 50,
      usedCount: 0,
      minAmount: 10000, // €100 minimum
      description: '€50 Rabatt ab €100 Bestellwert',
      createdAt: new Date()
    },
    {
      id: '3',
      code: 'EARLYBIRD',
      type: 'percentage',
      value: 15,
      isActive: true,
      usageLimit: 200,
      usedCount: 0,
      expiresAt: new Date('2025-12-31'),
      description: '15% Frühbucherrabatt',
      createdAt: new Date()
    }
  ];

  static async validateVoucherCode(code: string, cartTotal: number): Promise<{
    success: boolean;
    voucher?: VoucherCode;
    discount?: number;
    message: string;
  }> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const voucher = this.voucherCodes.find(v => 
      v.code.toLowerCase() === code.toLowerCase() && v.isActive
    );

    if (!voucher) {
      return {
        success: false,
        message: 'Ungültiger Gutscheincode'
      };
    }

    // Check expiration
    if (voucher.expiresAt && voucher.expiresAt < new Date()) {
      return {
        success: false,
        message: 'Dieser Gutscheincode ist abgelaufen'
      };
    }

    // Check usage limit
    if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) {
      return {
        success: false,
        message: 'Dieser Gutscheincode wurde bereits zu oft verwendet'
      };
    }

    // Check minimum amount
    if (voucher.minAmount && cartTotal < voucher.minAmount) {
      const minAmountFormatted = (voucher.minAmount / 100).toFixed(2);
      return {
        success: false,
        message: `Mindestbestellwert von €${minAmountFormatted} erforderlich`
      };
    }

    // Calculate discount
    let discount = 0;
    if (voucher.type === 'percentage') {
      discount = Math.round(cartTotal * (voucher.value / 100));
      if (voucher.maxDiscount && discount > voucher.maxDiscount) {
        discount = voucher.maxDiscount;
      }
    } else {
      discount = Math.min(voucher.value, cartTotal);
    }

    return {
      success: true,
      voucher,
      discount,
      message: `Gutscheincode erfolgreich angewendet! ${
        voucher.type === 'percentage' 
          ? `${voucher.value}% Rabatt` 
          : `€${(discount / 100).toFixed(2)} Rabatt`
      }`
    };
  }

  static async createStripePromotionCode(voucherId: string): Promise<string | null> {
    // This would integrate with your Stripe backend
    // For now, return a mock promotion code ID
    return `promo_${voucherId}_${Date.now()}`;
  }

  static calculateDiscountedTotal(total: number, appliedVoucher?: AppliedVoucher): number {
    if (!appliedVoucher) return total;
    return Math.max(0, total - appliedVoucher.discount);
  }

  static formatDiscount(voucher: AppliedVoucher): string {
    if (voucher.type === 'percentage') {
      return `${voucher.discount}% Rabatt`;
    }
    return `€${(voucher.discount / 100).toFixed(2)} Rabatt`;
  }
}

// Sample voucher codes for testing
export const SAMPLE_VOUCHER_CODES = [
  'WELCOME20', // 20% off
  'PHOTO50',   // €50 off
  'EARLYBIRD'  // 15% off
];

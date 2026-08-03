export interface Voucher {
  id: string;
  title: string;
  category: Category;
  partner: Partner;
  description: string;
  price: number;
  discountPrice: number;
  validFrom: string;
  validUntil: string;
  image: string;
  terms: string;
  stock: number;
  slug: string;
}

export type Category = 'Familie' | 'Baby' | 'Schwangerschaft' | 'Hochzeit' | 'Business' | 'Event' | 'Immobilien';

export interface Partner {
  id: string;
  title: string;
  logo: string;
  description: string;
}

export interface Order {
  id: string;
  voucher: Voucher;
  quantity: number;
  totalPrice: number;
  purchaserName: string;
  purchaserEmail: string;
  status: 'pending' | 'paid' | 'cancelled';
  voucherCode: string;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
}
import { supabase } from './supabase';

interface VoucherPurchaseData {
  purchaserName: string;
  purchaserEmail: string;
  amount: number;
  paymentIntentId: string;
  voucherType?: string;
}

export async function purchaseVoucher(data: VoucherPurchaseData) {
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public/voucher/purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to process voucher purchase');
    }

    return await response.json();
  } catch (error) {
    // console.error removed
    throw error;
  }
}

export async function getVoucherSales() {
  try {
    const { data, error } = await supabase
      .from('voucher_sales')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    // console.error removed
    throw error;
  }
}

export async function toggleVoucherFulfillment(id: string, fulfilled: boolean) {
  try {
    const { data, error } = await supabase
      .from('voucher_sales')
      .update({ fulfilled })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    // console.error removed
    throw error;
  }
}
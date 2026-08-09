// The currency this studio sells in, and a formatter that uses it.
//
// Prices were rendered as `€{price}` with the symbol written into the JSX, so a Brighton
// studio that chose GBP in the wizard advertised its sessions in euros. voucher_products
// has no currency column — the amount is a bare number — so the currency can only come
// from the studio's own configuration, and every price on the public site has to read it
// from one place or they will disagree with each other.
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '../utils/currency';

export function useStudioCurrency(): { currency: string; format: (amount: number | string | null | undefined) => string } {
  const { data } = useQuery<any>({
    queryKey: ['/api/studio-config'],
    queryFn: async () => (await fetch('/api/studio-config')).json(),
    staleTime: 5 * 60 * 1000,
  });

  // EUR only until the studio's own value arrives — the same default the column carries,
  // so nothing changes for a studio that never picked one.
  const currency = String(data?.currency || 'EUR').toUpperCase();

  const format = (amount: number | string | null | undefined) => {
    const n = typeof amount === 'string' ? parseFloat(amount) : amount;
    return formatCurrency(Number.isFinite(n as number) ? (n as number) : 0, currency);
  };

  return { currency, format };
}

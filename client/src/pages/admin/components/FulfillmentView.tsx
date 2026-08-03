import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type VoucherItem = {
  session_id: string;
  created_at?: string;
  email?: string;
  delivery?: 'pdf' | 'post';
  personalization?: any;
  preview_url?: string;
  pdf_url?: string | null;
  status?: string;
  shipping?: any; // raw JSON (string or object) from Stripe shipping_details
};

export default function FulfillmentView({ adminToken }: { adminToken: string }) {
  const qc = useQueryClient();
  const [sessionIdForLink, setSessionIdForLink] = React.useState('');
  const [generatedLink, setGeneratedLink] = React.useState<string | null>(null);
  const [expiresMins, setExpiresMins] = React.useState<number>(30);

  const { data: queue, isLoading, error } = useQuery<VoucherItem[]>({
    queryKey: ['print-queue', adminToken],
    queryFn: async () => {
      const res = await fetch('/api/admin/vouchers/print-queue', { headers: { 'x-admin-token': adminToken } });
      if (!res.ok) throw new Error('Failed to load print queue');
      const json = await res.json();
      return json.vouchers || [];
    },
    enabled: !!adminToken,
  });

  const markFulfilled = useMutation({
    mutationFn: async (session_id: string) => {
      const res = await fetch(`/api/admin/vouchers/${encodeURIComponent(session_id)}/mark-fulfilled`, {
        method: 'POST',
        headers: { 'x-admin-token': adminToken },
      });
      if (!res.ok) throw new Error('Failed to mark fulfilled');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['print-queue', adminToken] }),
  });

  const regeneratePdf = useMutation({
    mutationFn: async (session_id: string) => {
      const res = await fetch(`/api/admin/vouchers/${encodeURIComponent(session_id)}/regenerate-pdf`, {
        method: 'POST',
        headers: { 'x-admin-token': adminToken },
      });
      if (!res.ok) throw new Error('Failed to regenerate PDF');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['print-queue', adminToken] }),
  });

  const generateSecureLink = async () => {
    setGeneratedLink(null);
    if (!sessionIdForLink) return;
    const ttlSeconds = Math.max(60, Math.floor(expiresMins * 60));
    const res = await fetch(`/api/admin/vouchers/secure-link?session_id=${encodeURIComponent(sessionIdForLink)}&ttl=${ttlSeconds}`, {
      headers: { 'x-admin-token': adminToken }
    });
    if (res.ok) {
      const json = await res.json();
      setGeneratedLink(json.url);
    } else {
      setGeneratedLink(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Print Queue</h2>
        <p className="text-gray-600">Vouchers requiring hard-copy printing</p>
      </div>

      {isLoading ? (
        <p>Loading…</p>
      ) : error ? (
        <p className="text-red-600">{String(error)}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {queue && queue.length === 0 && (
            <p className="text-gray-600">No items in print queue.</p>
          )}
          {queue?.map((v) => (
            <Card key={v.session_id} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">Session: {v.session_id}</div>
                  <div className="text-sm text-gray-600">{v.email}</div>
                </div>
                <div className="text-sm text-gray-500">{new Date(v.created_at || '').toLocaleString()}</div>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <div className="text-sm font-medium">Personalization</div>
                  <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-40">{JSON.stringify(v.personalization, null, 2)}</pre>
                </div>
                <div>
                  <div className="text-sm font-medium">Design Preview</div>
                  {v.preview_url ? (
                    <img src={v.preview_url} alt="Voucher Preview" className="border rounded max-h-40 object-contain" />
                  ) : (
                    <div className="text-xs text-gray-500">No preview available</div>
                  )}
                </div>
              </div>
              {/* Shipping (for postal delivery) */}
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <div className="text-sm font-medium">Delivery</div>
                  <div className="text-sm text-gray-700 capitalize">{v.delivery || 'pdf'}</div>
                </div>
                {(() => {
                  // Accept string or object input for shipping field
                  let ship: any = null;
                  try {
                    ship = typeof v.shipping === 'string' ? JSON.parse(v.shipping) : v.shipping;
                  } catch (e) {
                    ship = null;
                  }
                  const addr = ship?.address || ship?.shipping?.address || null;
                  const name = ship?.name || ship?.recipient || v.personalization?.recipient_name || '';
                  if (!addr && v.delivery !== 'post') return null;
                  return (
                    <div>
                      <div className="text-sm font-medium">Shipping Address</div>
                      {addr ? (
                        <div className="text-sm text-gray-700 leading-5">
                          {name && <div className="font-medium">{name}</div>}
                          {addr.line1 && <div>{addr.line1}</div>}
                          {addr.line2 && <div>{addr.line2}</div>}
                          <div>
                            {(addr.postal_code || addr.zip) && <span>{addr.postal_code || addr.zip}</span>} {addr.city || addr.town}
                          </div>
                          <div>{addr.state || ''}</div>
                          <div>{addr.country || ''}</div>
                          {ship?.phone && <div className="mt-1 text-gray-600">Phone: {ship.phone}</div>}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">No shipping details</div>
                      )}
                    </div>
                  );
                })()}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => regeneratePdf.mutate(v.session_id)} disabled={regeneratePdf.isPending}>
                  {regeneratePdf.isPending ? 'Regenerating…' : 'Regenerate PDF'}
                </Button>
                <Button onClick={() => markFulfilled.mutate(v.session_id)} disabled={markFulfilled.isPending}>
                  {markFulfilled.isPending ? 'Marking…' : 'Mark Fulfilled'}
                </Button>
                {v.pdf_url && (
                  <a href={v.pdf_url} target="_blank" rel="noreferrer">
                    <Button variant="outline">Open PDF</Button>
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-xl font-semibold">Secure Download Link</h3>
        <p className="text-gray-600">Generate a short-lived, signed download URL for a customer.</p>
        <div className="flex gap-2 max-w-xl">
          <Input placeholder="Stripe session_id" value={sessionIdForLink} onChange={(e) => setSessionIdForLink(e.target.value)} />
          <Input type="number" min={1} max={1440} value={expiresMins} onChange={(e) => setExpiresMins(parseInt(e.target.value || '30', 10))} className="w-28" />
          <Button onClick={generateSecureLink}>Generate</Button>
        </div>
        {generatedLink && (
          <div className="p-3 bg-green-50 border border-green-200 rounded">
            <div className="text-sm font-medium">Link</div>
            <a className="text-green-700 break-all" href={generatedLink} target="_blank" rel="noreferrer">{generatedLink}</a>
          </div>
        )}
      </div>
    </div>
  );
}

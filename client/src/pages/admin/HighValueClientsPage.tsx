import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Crown, TrendingUp, Users, MapPin, Calendar, Euro } from 'lucide-react';

interface TopClient {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  city: string;
  total_revenue: number;
  invoice_count: number;
  session_count: number;
  lifetime_value: number;
  average_invoice: number;
  last_invoice_date: string;
  last_session_date: string;
}

interface ClientSegment {
  segment: string;
  client_count: number;
  segment_revenue?: number;
  total_sessions?: number;
  avg_revenue_per_client?: number;
  avg_sessions_per_client?: number;
}

const HighValueClientsPage: React.FC = () => {
  const [topClients, setTopClients] = useState<TopClient[]>([]);
  const [segments, setSegments] = useState<ClientSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderBy, setOrderBy] = useState<'lifetime_value' | 'total_revenue' | 'session_count' | 'recent_activity'>('lifetime_value');
  const [segmentBy, setSegmentBy] = useState<'revenue' | 'frequency' | 'recency' | 'geography'>('revenue');

  useEffect(() => {
    fetchTopClients();
    fetchSegments();
  }, [orderBy, segmentBy]);

  const fetchTopClients = async () => {
    try {
      const response = await fetch(`/api/crm/top-clients?orderBy=${orderBy}&limit=20`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Top clients data:', data);
        setTopClients(data || []);
      } else {
        console.error('Failed to fetch top clients:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch top clients:', error);
    }
  };

  const fetchSegments = async () => {
    try {
      const response = await fetch(`/api/crm/client-segments?segmentBy=${segmentBy}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setSegments(data.segments || []);
      }
    } catch (error) {
      console.error('Failed to fetch client segments:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-AT', {
      style: 'currency',
      currency: 'EUR'
    }).format(isFinite(amount as any) ? amount || 0 : 0);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('de-AT');
  };

  const getClientTier = (revenue: number) => {
    if (revenue >= 1000) return { tier: 'VIP', color: 'bg-gold-500 text-white', icon: Crown };
    if (revenue >= 500) return { tier: 'Premium', color: 'bg-purple-500 text-white', icon: TrendingUp };
    if (revenue >= 200) return { tier: 'Standard', color: 'bg-blue-500 text-white', icon: Users };
    return { tier: 'Basic', color: 'bg-gray-500 text-white', icon: Users };
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div>Loading client data...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Crown className="h-8 w-8 text-yellow-500" />
            High-Value Clients
          </h1>
        </div>

        <Tabs defaultValue="top-clients" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="top-clients">Top Clients</TabsTrigger>
            <TabsTrigger value="segments">Client Segments</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="top-clients" className="space-y-4">
            <div className="flex gap-2 mb-4">
              <select
                value={orderBy}
                onChange={(e) => setOrderBy(e.target.value as any)}
                className="p-2 border rounded"
              >
                <option value="lifetime_value">By Lifetime Value</option>
                <option value="session_count">By Session Count</option>
                <option value="recent_activity">By Recent Activity</option>
              </select>
            </div>

            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading top clients...</div>
            ) : topClients.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No clients found</h3>
                  <p className="text-gray-600">
                    No clients with invoices found in the system. Clients will appear here once they have paid invoices.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {topClients.map((client, index) => {
                // "Lifetime Value" = collected (paid) revenue, matching the client
                // detail page. total_revenue (all invoices billed) drives the
                // "By Total Revenue" sort but is not shown as the headline number.
                const safeRevenue = Number((client as any).lifetime_value ?? client.total_revenue ?? 0);
                const safeInvoiceCount = Number(client.invoice_count || 0);
                const safeSessionCount = Number(client.session_count || 0);
                const avgInvoice = Number((client as any).average_invoice || (safeInvoiceCount ? safeRevenue / safeInvoiceCount : 0));
                const tier = getClientTier(safeRevenue);
                const TierIcon = tier.icon;
                
                return (
                  <Card key={client.id}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-gray-400">#{index + 1}</span>
                            <div className={`px-2 py-1 rounded-full text-xs ${tier.color} flex items-center gap-1`}>
                              <TierIcon className="h-3 w-3" />
                              {tier.tier}
                            </div>
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold">
                              {client.first_name} {client.last_name}
                            </h3>
                            <p className="text-gray-600">{client.email}</p>
                            {client.city && (
                              <p className="text-sm text-gray-500 flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {client.city}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(safeRevenue)}
                          </div>
                          <div className="text-sm text-gray-500">Lifetime Value</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t">
                        <div className="text-center">
                          <div className="text-lg font-semibold">{safeInvoiceCount}</div>
                          <div className="text-xs text-gray-500">Invoices</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold">{safeSessionCount}</div>
                          <div className="text-xs text-gray-500">Sessions</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold">{formatCurrency(avgInvoice)}</div>
                          <div className="text-xs text-gray-500">Avg Invoice</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold">{formatDate(client.last_invoice_date)}</div>
                          <div className="text-xs text-gray-500">Last Invoice</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="segments" className="space-y-4">
            <div className="flex gap-2 mb-4">
              <select
                value={segmentBy}
                onChange={(e) => setSegmentBy(e.target.value as any)}
                className="p-2 border rounded"
              >
                <option value="revenue">By Revenue</option>
                <option value="frequency">By Session Frequency</option>
                <option value="geography">By Location</option>
              </select>
            </div>

            <div className="grid gap-4">
              {segments.map((segment, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-semibold">{segment.segment}</h3>
                        <p className="text-sm text-gray-600">{segment.client_count} clients</p>
                      </div>
                      <div className="text-right">
                        {segment.segment_revenue && (
                          <div className="text-xl font-bold text-green-600">
                            {formatCurrency(segment.segment_revenue)}
                          </div>
                        )}
                        {segment.total_sessions && (
                          <div className="text-xl font-bold text-blue-600">
                            {segment.total_sessions} sessions
                          </div>
                        )}
                        {segment.avg_revenue_per_client && (
                          <div className="text-sm text-gray-500">
                            Avg: {formatCurrency(segment.avg_revenue_per_client)}/client
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Euro className="h-5 w-5" />
                    Revenue Concentration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {(() => {
                        if (topClients.length === 0) return '0%';
                        const top5 = topClients.slice(0, 5).reduce((sum, c) => sum + Number(c.total_revenue || 0), 0);
                        const total = topClients.reduce((sum, c) => sum + Number(c.total_revenue || 0), 0);
                        const pct = total > 0 ? Math.round((top5 / total) * 100) : 0;
                        return `${pct}%`;
                      })()}
                    </div>
                    <p className="text-sm text-gray-600">Top 5 clients revenue share</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Client Retention
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {topClients.filter(client => client.session_count > 1).length}
                    </div>
                    <p className="text-sm text-gray-600">Repeat clients</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Average Value
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {topClients.length > 0 && formatCurrency(
                        topClients.reduce((sum, client) => sum + client.total_revenue, 0) / topClients.length
                      )}
                    </div>
                    <p className="text-sm text-gray-600">Per top client</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default HighValueClientsPage;
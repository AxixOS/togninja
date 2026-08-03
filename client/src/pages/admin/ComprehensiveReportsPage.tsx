import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
// Supabase removed - using Neon database APIs
import { 
  Download, 
  Calendar, 
  RefreshCw,
  Loader2,
  AlertCircle,
  Users,
  DollarSign,
  Star
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';

interface ComprehensiveReportData {
  // Financial Reports
  revenueByMonth: { month: string; revenue: number; invoices: number; }[];
  revenueByService: { service: string; revenue: number; percentage: number; }[];
  profitability: { month: string; revenue: number; expenses: number; profit: number; }[];
  
  // Client Analytics
  clientsBySource: { source: string; count: number; percentage: number; }[];
  clientRetention: { month: string; new: number; returning: number; churn: number; }[];
  topClients: { name: string; revenue: number; bookings: number; lastBooking: string; }[];
  
  // Lead Analytics
  leadConversion: { month: string; leads: number; converted: number; rate: number; }[];
  leadsBySource: { source: string; leads: number; converted: number; rate: number; }[];
  
  // Booking Analytics
  bookingsByType: { type: string; count: number; revenue: number; }[];
  bookingsByMonth: { month: string; bookings: number; revenue: number; }[];
  seasonalTrends: { month: string; bookings: number; avgValue: number; }[];
  
  // Marketing Analytics
  emailCampaigns: { name: string; sent: number; opened: number; clicked: number; revenue: number; }[];
  blogMetrics: { title: string; views: number; engagement: number; leads: number; }[];
  
  // Operational Metrics
  averageOrderValue: number;
  customerLifetimeValue: number;
  totalRevenue: number;
  totalClients: number;
  
  // Gallery & Portfolio
  galleryViews: { gallery: string; views: number; inquiries: number; }[];
  portfolioMetrics: { category: string; views: number; downloads: number; }[];
  
  // Voucher Sales
  voucherSales: { month: string; sales: number; revenue: number; redeemed: number; }[];
  voucherTypes: { type: string; sold: number; revenue: number; redemptionRate: number; }[];
}

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5a2b', '#6366f1'];

const ComprehensiveReportsPage: React.FC = () => {
  const [reportData, setReportData] = useState<ComprehensiveReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('12months');
  const [selectedCategory, setSelectedCategory] = useState<string>('overview');

  useEffect(() => {
    fetchComprehensiveReports();
  }, [selectedTimeRange]);

  const fetchComprehensiveReports = async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      switch (selectedTimeRange) {
        case '3months':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case '6months':
          startDate.setMonth(endDate.getMonth() - 6);
          break;
        case '12months':
          startDate.setMonth(endDate.getMonth() - 12);
          break;
        case '24months':
          startDate.setMonth(endDate.getMonth() - 24);
          break;
      }

      // Fetch all data from APIs in parallel (credentials required for authenticated endpoints)
      const fetchOptions = { credentials: 'include' as RequestCredentials };
      const [
        invoicesResponse,
        clientsResponse,
        leadsResponse,
        vouchersResponse,
        blogResponse,
        campaignsResponse,
        galleriesResponse,
        revenueByServiceResponse,
        campaignRevenueResponse
      ] = await Promise.allSettled([
        fetch(`/api/crm/invoices?from=${startDate.toISOString()}`, fetchOptions),
        fetch('/api/crm/clients', fetchOptions),
        // Pull a window of leads server-side for efficiency
        fetch(`/api/leads/list?status=any&limit=500&offset=0`, fetchOptions),
        fetch(`/api/vouchers/sales?from=${startDate.toISOString()}`, fetchOptions),
        fetch('/api/blog/posts', fetchOptions),
        fetch('/api/admin/email/campaigns', fetchOptions),
        fetch('/api/reports/gallery-analytics', fetchOptions),
        fetch(`/api/reports/revenue-by-service?from=${startDate.toISOString()}`, fetchOptions),
        fetch('/api/reports/email-campaign-revenue', fetchOptions)
      ]);

      // Process API responses
      const invoices = invoicesResponse.status === 'fulfilled' && invoicesResponse.value.ok 
        ? await invoicesResponse.value.json() : [];
      const clients = clientsResponse.status === 'fulfilled' && clientsResponse.value.ok 
        ? await clientsResponse.value.json() : [];
      const leadsPayload = leadsResponse.status === 'fulfilled' && leadsResponse.value.ok 
        ? await leadsResponse.value.json() : { rows: [], count: 0 };
      const leads = Array.isArray(leadsPayload) ? leadsPayload : (leadsPayload.rows || []);
      const vouchers = vouchersResponse.status === 'fulfilled' && vouchersResponse.value.ok 
        ? await vouchersResponse.value.json() : [];
      const blogPostsRaw = blogResponse.status === 'fulfilled' && blogResponse.value.ok 
        ? await blogResponse.value.json() : [];
      // Handle both array and { posts: [] } formats
      const blogPosts = Array.isArray(blogPostsRaw) ? blogPostsRaw : (blogPostsRaw?.posts || []);
      
      const campaignsRaw = campaignsResponse.status === 'fulfilled' && campaignsResponse.value.ok
        ? await campaignsResponse.value.json() : [];
      const campaigns = Array.isArray(campaignsRaw) ? campaignsRaw : (campaignsRaw?.campaigns || []);
      const galleryStatsRaw = galleriesResponse.status === 'fulfilled' && galleriesResponse.value.ok
        ? await galleriesResponse.value.json() : [];
      const galleryStats = Array.isArray(galleryStatsRaw) ? galleryStatsRaw : (galleryStatsRaw?.galleries || []);

      // Ensure all arrays are valid
      const safeInvoices = Array.isArray(invoices) ? invoices : [];
      const safeClients = Array.isArray(clients) ? clients : [];
      const safeLeads = Array.isArray(leads) ? leads : [];
      const safeVouchers = Array.isArray(vouchers) ? vouchers : [];
      const safeBlogPosts = Array.isArray(blogPosts) ? blogPosts : [];
      const safeCampaigns = Array.isArray(campaigns) ? campaigns : [];
      const safeGalleryStats = Array.isArray(galleryStats) ? galleryStats : [];
      const revenueByServiceRaw = revenueByServiceResponse.status === 'fulfilled' && revenueByServiceResponse.value.ok
        ? await revenueByServiceResponse.value.json() : [];
      const safeRevenueByService = Array.isArray(revenueByServiceRaw) ? revenueByServiceRaw : [];
      const campaignRevenueRaw = campaignRevenueResponse.status === 'fulfilled' && campaignRevenueResponse.value.ok
        ? await campaignRevenueResponse.value.json() : [];
      const campaignRevenueById = new Map<string, number>(
        (Array.isArray(campaignRevenueRaw) ? campaignRevenueRaw : []).map((r: any) => [String(r.campaignId), Number(r.revenue) || 0])
      );

      // Note: bookings API not yet implemented
      const bookings = [];

      // Create comprehensive report data
      const comprehensiveData: ComprehensiveReportData = {
        revenueByMonth: processRevenueByMonth(safeInvoices),
        // Real breakdown from invoice line items (paid invoices) via the backend.
        revenueByService: safeRevenueByService.map((r: any) => ({
          service: r.service || 'Other',
          revenue: Number(r.revenue) || 0,
          percentage: Number(r.percentage) || 0,
        })),
        profitability: processProfitability(safeInvoices),
        clientsBySource: processClientsBySource(safeClients),
        clientRetention: processClientRetention(safeClients, safeInvoices),
        topClients: processTopClients(safeClients, safeInvoices),
        leadConversion: processLeadConversion(safeLeads),
        leadsBySource: processLeadsBySource(safeLeads),
        bookingsByType: processBookingsByType(bookings),
        bookingsByMonth: processBookingsByMonth(bookings),
        seasonalTrends: processSeasonalTrends(bookings),
        // Real email campaigns (email_campaigns table). No revenue column exists,
        // so revenue is reported as 0 (the table doesn't track it).
        emailCampaigns: safeCampaigns.map((c: any) => ({
          name: c.name || 'Untitled campaign',
          sent: Number(c.sentCount ?? c.recipientCount ?? 0),
          opened: Number(c.openedCount ?? 0),
          clicked: Number(c.clickedCount ?? 0),
          // Real attributed revenue from voucher purchases tagged to this campaign.
          revenue: campaignRevenueById.get(String(c.id)) || 0,
        })),
        blogMetrics: safeBlogPosts.map(p => ({
          title: p.title || 'Untitled',
          views: p.view_count || 0,
          engagement: p.engagement_score || 0,
          leads: p.leads_generated || 0
        })),
        averageOrderValue: calculateAverageOrderValue(safeInvoices),
        customerLifetimeValue: calculateCustomerLifetimeValue(safeClients, safeInvoices),
        totalRevenue: safeInvoices.reduce((s: number, inv: any) => s + invoiceTotal(inv), 0),
        totalClients: safeClients.length,
        // Real gallery analytics (gallery_analytics table): views + email captures
        // as an "inquiries" proxy. Only galleries with any views are shown.
        galleryViews: safeGalleryStats
          .map((g: any) => ({ gallery: g.title || 'Untitled gallery', views: Number(g.viewCount) || 0, inquiries: Number(g.emailCaptures) || 0 }))
          .filter((g: any) => g.views > 0 || g.inquiries > 0)
          .slice(0, 8),
        portfolioMetrics: [],
        voucherSales: processVoucherSales(safeVouchers),
        voucherTypes: processVoucherTypes(safeVouchers)
      };

      setReportData(comprehensiveData);
    } catch (err: any) {
      console.error('Reports fetch error:', err);
      setError(err?.message || 'Failed to load reports. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Data processing functions
  // Invoices come back with dual-case keys; totals are already numeric but guard anyway.
  const invoiceTotal = (inv: any) => Number(inv.total_amount ?? inv.total ?? inv.totalAmount ?? 0) || 0;
  const invoiceDate = (inv: any) => new Date(inv.issue_date ?? inv.created_at ?? inv.createdAt ?? inv.issueDate);
  const monthKeyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

  const processRevenueByMonth = (invoices: any[]) => {
    const monthlyData = new Map();
    invoices.forEach(invoice => {
      const date = invoiceDate(invoice);
      if (isNaN(date.getTime())) return;
      const monthKey = monthKeyOf(date);
      const existing = monthlyData.get(monthKey) || { month: monthKey, revenue: 0, invoices: 0 };
      existing.revenue += invoiceTotal(invoice);
      existing.invoices += 1;
      monthlyData.set(monthKey, existing);
    });
    return Array.from(monthlyData.values()).sort((a, b) => a.month.localeCompare(b.month));
  };

  const processRevenueByService = (invoices: any[]) => {
    const serviceData = new Map();
    let totalRevenue = 0;
    
    invoices.forEach(invoice => {
      const service = invoice.service_type || 'Other';
      const revenue = invoice.total_amount || 0;
      totalRevenue += revenue;
      serviceData.set(service, (serviceData.get(service) || 0) + revenue);
    });

    return Array.from(serviceData.entries()).map(([service, revenue]) => ({
      service,
      revenue,
      percentage: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0
    }));
  };

  const processProfitability = (invoices: any[]) => {
    const monthlyData = new Map();
    invoices.forEach(invoice => {
      const date = new Date(invoice.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthlyData.get(monthKey) || { month: monthKey, revenue: 0, expenses: 0, profit: 0 };
      const revenue = invoice.total_amount || 0;
      const expenses = revenue * 0.3; // Estimate 30% expenses
      existing.revenue += revenue;
      existing.expenses += expenses;
      existing.profit = existing.revenue - existing.expenses;
      monthlyData.set(monthKey, existing);
    });
    return Array.from(monthlyData.values()).sort((a, b) => a.month.localeCompare(b.month));
  };

  const processClientsBySource = (clients: any[]) => {
    const sourceData = new Map();
    let total = clients.length;
    
    clients.forEach(client => {
      const source = client.leadSource || client.lead_source || 'Direct';
      sourceData.set(source, (sourceData.get(source) || 0) + 1);
    });

    return Array.from(sourceData.entries()).map(([source, count]) => ({
      source,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0
    }));
  };

  const processTopClients = (clients: any[], invoices: any[]) => {
    const clientRevenue = new Map();
    const clientBookings = new Map();
    const clientLastBooking = new Map();

    const clientName = (c: any) => `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.email || 'Unknown';
    invoices.forEach(invoice => {
      const clientId = invoice.client_id ?? invoice.clientId;
      const client = clients.find(c => c.id === clientId);
      if (client) {
        const name = clientName(client);
        clientRevenue.set(name, (clientRevenue.get(name) || 0) + invoiceTotal(invoice));
        clientBookings.set(name, (clientBookings.get(name) || 0) + 1);
        clientLastBooking.set(name, invoice.issue_date ?? invoice.created_at ?? invoice.createdAt);
      }
    });

    return Array.from(clientRevenue.entries())
      .map(([name, revenue]) => ({
        name,
        revenue,
        bookings: clientBookings.get(name) || 0,
        lastBooking: clientLastBooking.get(name) || ''
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  };

  // Real retention: "new" = clients created that month; "returning" = clients
  // who were invoiced that month but existed before it. (Churn isn't reliably
  // derivable without a defined activity window, so it's reported as 0.)
  const processClientRetention = (clients: any[], invoices: any[]) => {
    const clientCreated = new Map<string, Date>();
    clients.forEach(c => {
      const d = new Date(c.createdAt ?? c.created_at);
      if (!isNaN(d.getTime())) clientCreated.set(c.id, d);
    });

    const monthlyData = [];
    for (let i = 11; i >= 0; i--) {
      const ref = new Date();
      ref.setMonth(ref.getMonth() - i);
      const monthKey = monthKeyOf(ref);

      const newCount = clients.filter(c => {
        const d = clientCreated.get(c.id);
        return d && monthKeyOf(d) === monthKey;
      }).length;

      const returningIds = new Set<string>();
      invoices.forEach(inv => {
        const d = invoiceDate(inv);
        if (isNaN(d.getTime()) || monthKeyOf(d) !== monthKey) return;
        const cid = inv.client_id ?? inv.clientId;
        const created = clientCreated.get(cid);
        // returning = invoiced this month but joined in an earlier month
        if (cid && created && monthKeyOf(created) !== monthKey) returningIds.add(cid);
      });

      monthlyData.push({ month: monthKey, new: newCount, returning: returningIds.size, churn: 0 });
    }
    return monthlyData;
  };

  // Leads: /api/leads/list returns created_at, form_type, and status set to
  // lowercase 'converted' on conversion (was matched against 'CONVERTED').
  const leadIsConverted = (lead: any) => String(lead.status || '').toLowerCase() === 'converted';

  const processLeadConversion = (leads: any[]) => {
    const monthlyData = new Map();
    leads.forEach(lead => {
      const date = new Date(lead.created_at ?? lead.createdAt);
      if (isNaN(date.getTime())) return;
      const monthKey = monthKeyOf(date);
      const existing = monthlyData.get(monthKey) || { month: monthKey, leads: 0, converted: 0, rate: 0 };
      existing.leads += 1;
      if (leadIsConverted(lead)) existing.converted += 1;
      existing.rate = existing.leads > 0 ? (existing.converted / existing.leads) * 100 : 0;
      monthlyData.set(monthKey, existing);
    });
    return Array.from(monthlyData.values()).sort((a, b) => a.month.localeCompare(b.month));
  };

  const processLeadsBySource = (leads: any[]) => {
    const sourceData = new Map();
    leads.forEach(lead => {
      const source = lead.form_type || lead.source || 'Unknown';
      const existing = sourceData.get(source) || { source, leads: 0, converted: 0, rate: 0 };
      existing.leads += 1;
      if (leadIsConverted(lead)) existing.converted += 1;
      existing.rate = existing.leads > 0 ? (existing.converted / existing.leads) * 100 : 0;
      sourceData.set(source, existing);
    });
    return Array.from(sourceData.values());
  };

  const processBookingsByType = (bookings: any[]) => {
    const typeData = new Map();
    bookings.forEach(booking => {
      const type = booking.service_type || 'Other';
      const existing = typeData.get(type) || { type, count: 0, revenue: 0 };
      existing.count += 1;
      existing.revenue += booking.total_amount || 0;
      typeData.set(type, existing);
    });
    return Array.from(typeData.values());
  };

  const processBookingsByMonth = (bookings: any[]) => {
    const monthlyData = new Map();
    bookings.forEach(booking => {
      const date = new Date(booking.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthlyData.get(monthKey) || { month: monthKey, bookings: 0, revenue: 0 };
      existing.bookings += 1;
      existing.revenue += booking.total_amount || 0;
      monthlyData.set(monthKey, existing);
    });
    return Array.from(monthlyData.values()).sort((a, b) => a.month.localeCompare(b.month));
  };

  const processSeasonalTrends = (bookings: any[]) => {
    return processBookingsByMonth(bookings).map(month => ({
      ...month,
      avgValue: month.bookings > 0 ? month.revenue / month.bookings : 0
    }));
  };

  // voucher_sales is a Drizzle table → camelCase keys (createdAt, finalAmount,
  // isRedeemed, paymentStatus). The old code read created_at/amount/redeemed,
  // which don't exist → NaN dates + €0 revenue. Revenue counts PAID sales only.
  const voucherAmount = (v: any) => parseFloat(v.finalAmount ?? v.final_amount ?? v.originalAmount ?? 0) || 0;
  const voucherIsPaid = (v: any) => (v.paymentStatus ?? v.payment_status) === 'paid';
  const voucherDate = (v: any) => new Date(v.createdAt ?? v.created_at ?? v.purchaseDate);
  const voucherLabel = (v: any) => v.product_name || v.productName || 'Gutschein';

  const processVoucherSales = (vouchers: any[]) => {
    const monthlyData = new Map();
    vouchers.forEach(voucher => {
      const date = voucherDate(voucher);
      if (isNaN(date.getTime())) return; // skip rows with no valid date
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthlyData.get(monthKey) || { month: monthKey, sales: 0, revenue: 0, redeemed: 0 };
      existing.sales += 1;
      if (voucherIsPaid(voucher)) existing.revenue += voucherAmount(voucher);
      if (voucher.isRedeemed ?? voucher.is_redeemed) existing.redeemed += 1;
      monthlyData.set(monthKey, existing);
    });
    return Array.from(monthlyData.values()).sort((a, b) => a.month.localeCompare(b.month));
  };

  const processVoucherTypes = (vouchers: any[]) => {
    const typeData = new Map();
    vouchers.forEach(voucher => {
      const type = voucherLabel(voucher);
      const existing = typeData.get(type) || { type, sold: 0, revenue: 0, redeemed: 0, redemptionRate: 0 };
      existing.sold += 1;
      if (voucherIsPaid(voucher)) existing.revenue += voucherAmount(voucher);
      if (voucher.isRedeemed ?? voucher.is_redeemed) existing.redeemed += 1;
      existing.redemptionRate = existing.sold > 0 ? (existing.redeemed / existing.sold) * 100 : 0;
      typeData.set(type, existing);
    });
    return Array.from(typeData.values()).sort((a, b) => b.revenue - a.revenue);
  };

  const calculateAverageOrderValue = (invoices: any[]) => {
    if (invoices.length === 0) return 0;
    const total = invoices.reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0);
    return total / invoices.length;
  };

  const calculateCustomerLifetimeValue = (clients: any[], invoices: any[]) => {
    if (clients.length === 0) return 0;
    const totalRevenue = invoices.reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0);
    return totalRevenue / clients.length;
  };

  const calculateAverageProjectDuration = (bookings: any[]) => {
    return 14; // Mock value - would need actual project completion data
  };

  const handleExportCSV = () => {
    if (!reportData) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Export comprehensive report data
    csvContent += "Photography Business Comprehensive Report\\n\\n";
    
    // Revenue by Month
    csvContent += "Revenue by Month\\n";
    csvContent += "Month,Revenue,Invoice Count\\n";
    reportData.revenueByMonth.forEach(item => {
      csvContent += `${item.month},${item.revenue},${item.invoices}\\n`;
    });
    
    csvContent += "\\nRevenue by Service\\n";
    csvContent += "Service,Revenue,Percentage\\n";
    reportData.revenueByService.forEach(item => {
      csvContent += `${item.service},${item.revenue},${item.percentage.toFixed(2)}%\\n`;
    });
    
    csvContent += "\\nTop Clients\\n";
    csvContent += "Name,Revenue,Bookings,Last Booking\\n";
    reportData.topClients.forEach(item => {
      csvContent += `${item.name},${item.revenue},${item.bookings},${item.lastBooking}\\n`;
    });

    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `comprehensive-photography-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderOverviewSection = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center">
          <div className="p-2 bg-purple-100 rounded-lg">
            <DollarSign className="h-6 w-6 text-purple-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
            <p className="text-2xl font-semibold text-gray-900">€{reportData?.averageOrderValue.toFixed(0)}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Customer LTV</p>
            <p className="text-2xl font-semibold text-gray-900">€{reportData?.customerLifetimeValue.toFixed(0)}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center">
          <div className="p-2 bg-green-100 rounded-lg">
            <DollarSign className="h-6 w-6 text-green-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Total Revenue</p>
            <p className="text-2xl font-semibold text-gray-900">€{(reportData?.totalRevenue || 0).toLocaleString('de-DE', { maximumFractionDigits: 0 })}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center">
          <div className="p-2 bg-yellow-100 rounded-lg">
            <Users className="h-6 w-6 text-yellow-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Total Clients</p>
            <p className="text-2xl font-semibold text-gray-900">{reportData?.totalClients ?? 0}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFinancialSection = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Month</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={reportData?.revenueByMonth || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => [`€${value}`, 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Service</h3>
          {(() => {
            // Service names are long — inline pie labels overlap badly. Show the
            // top 8 slices (+ "Other") with a readable side legend instead.
            const sorted = [...(reportData?.revenueByService || [])].sort((a, b) => b.revenue - a.revenue);
            const top = sorted.slice(0, 8);
            const rest = sorted.slice(8);
            const restRev = rest.reduce((s, r) => s + (r.revenue || 0), 0);
            const restPct = rest.reduce((s, r) => s + (r.percentage || 0), 0);
            const data = restRev > 0 ? [...top, { service: 'Other', revenue: restRev, percentage: restPct }] : top;
            return (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-full sm:w-1/2" style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie data={data} cx="50%" cy="50%" outerRadius={92} dataKey="revenue" nameKey="service">
                        {data.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => [`€${Number(value).toLocaleString('de-DE')}`, 'Revenue']} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="w-full sm:w-1/2 space-y-1.5 max-h-[240px] overflow-y-auto pr-1 text-sm">
                  {data.map((s, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-sm flex-none" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="flex-1 truncate text-gray-700" title={s.service}>{s.service}</span>
                      <span className="text-gray-500 tabular-nums whitespace-nowrap">{(s.percentage || 0).toFixed(1)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Profitability Analysis</h3>
        <ResponsiveContainer width="100%" height={300}>
          <RechartsLineChart data={reportData?.profitability || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => [`€${value}`]} />
            <Legend />
            <Line type="monotone" dataKey="revenue" stroke="#10b981" name="Revenue" />
            <Line type="monotone" dataKey="expenses" stroke="#ef4444" name="Expenses" />
            <Line type="monotone" dataKey="profit" stroke="#8b5cf6" name="Profit" strokeWidth={3} />
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderClientSection = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Clients by Source</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData?.clientsBySource || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="source" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#06b6d4" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Retention</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={reportData?.clientRetention || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="new" stackId="1" stroke="#10b981" fill="#10b981" />
              <Area type="monotone" dataKey="returning" stackId="1" stroke="#06b6d4" fill="#06b6d4" />
              <Area type="monotone" dataKey="churn" stackId="1" stroke="#ef4444" fill="#ef4444" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Clients</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bookings</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Booking</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(reportData?.topClients || []).map((client, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{client.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">€{client.revenue.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{client.bookings}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {client.lastBooking ? new Date(client.lastBooking).toLocaleDateString() : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
  const renderMarketingSection = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Conversion</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData?.leadConversion || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="leads" fill="#94a3b8" name="Total Leads" />
              <Bar dataKey="converted" fill="#8b5cf6" name="Converted" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Gallery Performance</h3>
          <div className="space-y-4">
            {(reportData?.galleryViews || []).length === 0 && (
              <p className="text-sm text-gray-500 py-6 text-center">No gallery views tracked yet.</p>
            )}
            {(reportData?.galleryViews || []).map((gallery, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium text-gray-900">{gallery.gallery}</p>
                  <p className="text-sm text-gray-600">{gallery.views} views</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-purple-600">{gallery.inquiries} email captures</p>
                  <p className="text-xs text-gray-500">{gallery.views > 0 ? ((gallery.inquiries / gallery.views) * 100).toFixed(1) : '0'}% capture rate</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Campaign Performance</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opened</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clicked</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(reportData?.emailCampaigns || []).length === 0 && (
                <tr><td colSpan={5} className="px-6 py-6 text-center text-sm text-gray-500">No email campaigns yet.</td></tr>
              )}
              {(reportData?.emailCampaigns || []).map((campaign, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{campaign.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{campaign.sent}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {campaign.opened} ({campaign.sent > 0 ? ((campaign.opened / campaign.sent) * 100).toFixed(1) : 0}%)
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {campaign.clicked} ({campaign.opened > 0 ? ((campaign.clicked / campaign.opened) * 100).toFixed(1) : 0}%)
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">€{campaign.revenue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderVoucherSection = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Voucher Sales Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={reportData?.voucherSales || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="revenue" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Voucher Types Performance</h3>
          <div className="space-y-4">
            {(reportData?.voucherTypes || []).map((voucher, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium text-gray-900">{voucher.type}</p>
                  <p className="text-sm text-gray-600">{voucher.sold} sold</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-green-600">€{voucher.revenue.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">{voucher.redemptionRate.toFixed(1)}% redeemed</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        </div>
      );
    }

    if (!reportData) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500">No report data available.</p>
        </div>
      );
    }

    switch (selectedCategory) {
      case 'financial':
        return renderFinancialSection();
      case 'clients':
        return renderClientSection();
      case 'marketing':
        return renderMarketingSection();
      case 'vouchers':
        return renderVoucherSection();
      default:
        return (
          <div className="space-y-8">
            {renderOverviewSection()}
            {renderFinancialSection()}
          </div>
        );
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Comprehensive Business Reports</h1>
            <p className="text-gray-600">Complete analytics and insights for your photography business</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={fetchComprehensiveReports}
              className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg flex items-center"
            >
              <RefreshCw size={18} className="mr-2" />
              Refresh
            </button>
            <button
              onClick={handleExportCSV}
              disabled={!reportData}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center disabled:opacity-50"
            >
              <Download size={18} className="mr-2" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="3months">Last 3 Months</option>
                <option value="6months">Last 6 Months</option>
                <option value="12months">Last 12 Months</option>
                <option value="24months">Last 24 Months</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Report Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="overview">Overview</option>
                <option value="financial">Financial</option>
                <option value="clients">Clients</option>
                <option value="marketing">Marketing</option>
                <option value="vouchers">Vouchers</option>
              </select>
            </div>

            <div className="flex items-end">
              <div className="flex space-x-2 w-full">
                <button
                  onClick={() => setSelectedCategory('overview')}
                  className={`flex-1 px-3 py-2 rounded-md text-sm ${
                    selectedCategory === 'overview' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setSelectedCategory('financial')}
                  className={`flex-1 px-3 py-2 rounded-md text-sm ${
                    selectedCategory === 'financial' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Financial
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Report Content */}
        {renderContent()}
      </div>
    </AdminLayout>
  );
};

export default ComprehensiveReportsPage;

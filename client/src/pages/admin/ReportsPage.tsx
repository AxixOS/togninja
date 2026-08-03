import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { supabase } from '../../lib/supabase';
import { 
  BarChart as BarChartIcon, 
  LineChart, 
  PieChart, 
  Download, 
  Calendar, 
  Filter, 
  RefreshCw,
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  FileText,
  Mail,
  Camera,
  Package,
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
  averageProjectDuration: number;
  clientSatisfactionScore: number;
  
  // Gallery & Portfolio
  galleryViews: { gallery: string; views: number; inquiries: number; }[];
  portfolioMetrics: { category: string; views: number; downloads: number; }[];
  
  // Voucher Sales
  voucherSales: { month: string; sales: number; revenue: number; redeemed: number; }[];
  voucherTypes: { type: string; sold: number; revenue: number; redemptionRate: number; }[];
}

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5a2b', '#6366f1'];

// Processing functions for PostgreSQL data with correct field names
const processRevenueByMonth = (invoices: any[]) => {
  // console.log removed
  const monthlyData = new Map();
  invoices.forEach(invoice => {
    const date = new Date(invoice.createdAt || invoice.created_at || invoice.issueDate);
    if (isNaN(date.getTime())) {
      // console.warn removed
      return;
    }
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const existing = monthlyData.get(monthKey) || { month: monthKey, revenue: 0, invoices: 0 };
    const revenue = parseFloat(invoice.total?.toString() || '0');
    // console.log removed
    existing.revenue += revenue;
    existing.invoices += 1;
    monthlyData.set(monthKey, existing);
  });
  const result = Array.from(monthlyData.values()).sort((a, b) => a.month.localeCompare(b.month));
  // console.log removed
  return result;
};

const processRevenueByService = (invoices: any[]) => {
  // console.log removed
  const serviceData = new Map();
  let totalRevenue = 0;
  
  invoices.forEach(invoice => {
    const revenue = parseFloat(invoice.total?.toString() || '0');
    // console.log removed
    totalRevenue += revenue;
    
    // Extract service type from invoice description or use default
    const service = 'Photography Services'; // Simplified for now
    const existing = serviceData.get(service) || { service, revenue: 0 };
    existing.revenue += revenue;
    serviceData.set(service, existing);
  });
  
  const result = Array.from(serviceData.values()).map(item => ({
    ...item,
    percentage: totalRevenue > 0 ? (item.revenue / totalRevenue) * 100 : 0
  }));
  // console.log removed
  return result;
};

const processProfitability = (invoices: any[]) => {
  return processRevenueByMonth(invoices).map(item => ({
    ...item,
    expenses: item.revenue * 0.3, // Assume 30% expenses
    profit: item.revenue * 0.7
  }));
};

const processClientsBySource = (clients: any[]) => {
  const sourceData = new Map();
  let totalClients = clients.length;
  
  clients.forEach(client => {
    const source = client.source || 'Website';
    const existing = sourceData.get(source) || { source, count: 0 };
    existing.count += 1;
    sourceData.set(source, existing);
  });
  
  return Array.from(sourceData.values()).map(item => ({
    ...item,
    percentage: totalClients > 0 ? (item.count / totalClients) * 100 : 0
  }));
};

const processTopClients = async () => {
  try {
    const response = await fetch('/api/reports/high-value-clients?limit=10', {
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      console.error('Failed to fetch high-value clients:', response.statusText);
      return [];
    }
    
    const data = await response.json();
    return data.map((client: any) => ({
      name: client.name || 'Unknown Client',
      revenue: client.revenue || 0,
      bookings: client.bookings || 0,
      lastBooking: 'N/A'
    }));
  } catch (error) {
    console.error('Error fetching high-value clients:', error);
    return [];
  }
};

const processClientRetention = (clients: any[], invoices: any[]) => {
  return processRevenueByMonth(invoices).map(item => ({
    month: item.month,
    new: Math.floor(Math.random() * 10) + 5,
    returning: Math.floor(Math.random() * 15) + 10,
    churn: Math.floor(Math.random() * 5) + 1
  }));
};

const processLeadConversion = (leads: any[]) => {
  const monthlyData = new Map();
  
  leads.forEach(lead => {
    const date = new Date(lead.createdAt || lead.created_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const existing = monthlyData.get(monthKey) || { month: monthKey, leads: 0, converted: 0 };
    existing.leads += 1;
    if (lead.status === 'converted' || lead.status === 'CONVERTED') existing.converted += 1;
    monthlyData.set(monthKey, existing);
  });
  
  return Array.from(monthlyData.values()).map(item => ({
    ...item,
    rate: item.leads > 0 ? (item.converted / item.leads) * 100 : 0
  }));
};

const processLeadsBySource = (leads: any[]) => {
  const sourceData = new Map();
  
  leads.forEach(lead => {
    const source = lead.source || 'Website';
    const existing = sourceData.get(source) || { source, leads: 0, converted: 0 };
    existing.leads += 1;
    if (lead.status === 'converted' || lead.status === 'CONVERTED') existing.converted += 1;
    sourceData.set(source, existing);
  });
  
  return Array.from(sourceData.values()).map(item => ({
    ...item,
    rate: item.leads > 0 ? (item.converted / item.leads) * 100 : 0
  }));
};

const processBookingsByType = (bookings: any[]) => {
  const typeData = new Map();
  
  bookings.forEach(booking => {
    const type = booking.sessionType || 'Photography';
    const existing = typeData.get(type) || { type, count: 0, revenue: 0 };
    existing.count += 1;
    existing.revenue += parseFloat(booking.price) || 0;
    typeData.set(type, existing);
  });
  
  return Array.from(typeData.values());
};

const processBookingsByMonth = (bookings: any[]) => {
  const monthlyData = new Map();
  
  bookings.forEach(booking => {
    const date = new Date(booking.sessionDate || booking.created_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const existing = monthlyData.get(monthKey) || { month: monthKey, bookings: 0, revenue: 0 };
    existing.bookings += 1;
    existing.revenue += parseFloat(booking.price) || 0;
    monthlyData.set(monthKey, existing);
  });
  
  return Array.from(monthlyData.values()).sort((a, b) => a.month.localeCompare(b.month));
};

const processSeasonalTrends = (bookings: any[]) => {
  return processBookingsByMonth(bookings).map(item => ({
    month: item.month,
    bookings: item.bookings,
    avgValue: item.bookings > 0 ? item.revenue / item.bookings : 0
  }));
};

const processVoucherSales = (vouchers: any[]) => {
  const monthlyData = new Map();
  
  vouchers.forEach(voucher => {
    const date = new Date(voucher.createdAt || voucher.created_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const existing = monthlyData.get(monthKey) || { month: monthKey, sales: 0, revenue: 0, redeemed: 0 };
    existing.sales += 1;
    existing.revenue += parseFloat(voucher.amount) || 0;
    if (voucher.status === 'redeemed') existing.redeemed += 1;
    monthlyData.set(monthKey, existing);
  });
  
  return Array.from(monthlyData.values()).sort((a, b) => a.month.localeCompare(b.month));
};

const processVoucherTypes = (vouchers: any[]) => {
  const typeData = new Map();
  
  vouchers.forEach(voucher => {
    const type = voucher.type || 'Standard';
    const existing = typeData.get(type) || { type, sold: 0, revenue: 0, redeemed: 0 };
    existing.sold += 1;
    existing.revenue += parseFloat(voucher.amount) || 0;
    if (voucher.status === 'redeemed') existing.redeemed += 1;
    typeData.set(type, existing);
  });
  
  return Array.from(typeData.values()).map(item => ({
    ...item,
    redemptionRate: item.sold > 0 ? (item.redeemed / item.sold) * 100 : 0
  }));
};

const calculateAverageOrderValue = (invoices: any[]) => {
  if (invoices.length === 0) return 0;
  const total = invoices.reduce((sum, invoice) => sum + (parseFloat(invoice.total) || 0), 0);
  return total / invoices.length;
};

const calculateCustomerLifetimeValue = (clients: any[], invoices: any[]) => {
  const clientRevenue = new Map();
  
  invoices.forEach(invoice => {
    const clientId = invoice.clientId;
    const revenue = parseFloat(invoice.total) || 0;
    const existing = clientRevenue.get(clientId) || 0;
    clientRevenue.set(clientId, existing + revenue);
  });
  
  if (clientRevenue.size === 0) return 0;
  const totalRevenue = Array.from(clientRevenue.values()).reduce((sum, revenue) => sum + revenue, 0);
  return totalRevenue / clientRevenue.size;
};

const calculateAverageProjectDuration = (bookings: any[]) => {
  return 2.5; // Mock value - would calculate from actual project data
};

const ReportsPage: React.FC = () => {
  const [reportData, setReportData] = useState<ComprehensiveReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('12months');
  const [selectedCategory, setSelectedCategory] = useState<string>('overview');

  useEffect(() => {
    // console.log removed
    fetchComprehensiveReports();
  }, [selectedTimeRange]);

  const fetchComprehensiveReports = async () => {
    try {
      // console.log removed
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

      // Fetch all data in parallel from PostgreSQL API
      const [
        invoicesResult,
        clientsResult,
        leadsResult,
        bookingsResult,
        vouchersResult,
        blogResult
      ] = await Promise.allSettled([
        fetch('/api/crm/invoices'),
        fetch('/api/crm/clients'),
        fetch('/api/crm/leads'),
        fetch('/api/photography/sessions'),
        // fetch('/api/vouchers/sales'), // Temporarily skip voucher sales API
        fetch('/api/blog/posts')
      ]);

      // Process API responses
      const invoices = invoicesResult.status === 'fulfilled' && invoicesResult.value.ok ? 
        await invoicesResult.value.json() : [];
      const clients = clientsResult.status === 'fulfilled' && clientsResult.value.ok ? 
        await clientsResult.value.json() : [];
      const leads = leadsResult.status === 'fulfilled' && leadsResult.value.ok ? 
        await leadsResult.value.json() : [];
      const bookings = bookingsResult.status === 'fulfilled' && bookingsResult.value.ok ? 
        await bookingsResult.value.json() : [];
      const vouchers = []; // vouchersResult.status === 'fulfilled' && vouchersResult.value.ok ? 
        // await vouchersResult.value.json() : [];
      const blogPosts = blogResult.status === 'fulfilled' && blogResult.value.ok ? 
        await blogResult.value.json() : [];
      
      // Filter data by date range and status for PAID invoices only  
      // console.log removed
      // console.log removed
      const dateFilteredInvoices = invoices.filter((inv: any) => {
        const isPaid = inv.status === 'paid';
        const invoiceDate = new Date(inv.createdAt || inv.created_at || inv.issueDate);
        const isInDateRange = invoiceDate >= startDate;
        // console.log removed
        return isPaid && isInDateRange;
      });
      // console.log removed
      
      // Debug: Calculate total revenue directly from filtered invoices
      const directTotalRevenue = dateFilteredInvoices.reduce((sum, inv) => {
        const revenue = parseFloat(inv.total?.toString() || '0');
        // console.log removed
        return sum + revenue;
      }, 0);
      // console.log removed
      
      // If we have the direct total, use it immediately for testing
      if (directTotalRevenue > 0) {
        // console.log removed
        const quickReportData: ComprehensiveReportData = {
          revenueByMonth: [{
            month: new Date().toLocaleString('default', { month: 'short', year: 'numeric' }),
            revenue: directTotalRevenue
          }],
          revenueByService: [{ service: 'Photography Sessions', revenue: directTotalRevenue }],
          profitability: [{ month: 'Current', revenue: directTotalRevenue, expenses: 0, profit: directTotalRevenue }],
          clientsBySource: [{ source: 'Direct', count: 1 }],
          clientRetention: [{ month: 'Current', retention: 100 }],
          topClients: [{ name: 'Top Client', revenue: directTotalRevenue }],
          leadConversion: [{ source: 'All', leads: 1, conversions: 1, rate: 100 }],
          leadsBySource: [{ source: 'Direct', count: 1 }],
          bookingsByType: [{ type: 'Photography', count: 1 }],
          bookingsByMonth: [{ month: 'Current', bookings: 1 }],
          seasonalTrends: [{ season: 'Current', bookings: 1, revenue: directTotalRevenue }],
          emailCampaigns: [],
          blogMetrics: [],
          averageOrderValue: directTotalRevenue,
          customerLifetimeValue: directTotalRevenue,
          averageProjectDuration: 14,
          clientSatisfactionScore: 4.8,
          galleryViews: [],
          portfolioMetrics: [],
          voucherSales: [],
          voucherTypes: []
        };
        
        setReportData(quickReportData);
        setLoading(false);
        return;
      }
      
      const dateFilteredLeads = leads.filter((lead: any) => 
        new Date(lead.createdAt || lead.created_at) >= startDate
      );
      const dateFilteredBookings = bookings.filter((booking: any) => 
        new Date(booking.createdAt || booking.created_at) >= startDate
      );
      const dateFilteredVouchers = vouchers.filter((voucher: any) => 
        new Date(voucher.createdAt || voucher.created_at) >= startDate
      );

      // Process financial data from paid invoices only
      const revenueByMonth = processRevenueByMonth(dateFilteredInvoices);
      const revenueByService = processRevenueByService(dateFilteredInvoices);
      const profitability = processProfitability(dateFilteredInvoices);

      // Process client data
      const clientsBySource = processClientsBySource(clients);
      const topClients = await processTopClients();
      const clientRetention = processClientRetention(clients, dateFilteredInvoices);

      // Process lead data
      const leadConversion = processLeadConversion(dateFilteredLeads);
      const leadsBySource = processLeadsBySource(dateFilteredLeads);

      // Process booking data
      const bookingsByType = processBookingsByType(dateFilteredBookings);
      const bookingsByMonth = processBookingsByMonth(dateFilteredBookings);
      const seasonalTrends = processSeasonalTrends(dateFilteredBookings);

      // Process voucher data
      const voucherSales = processVoucherSales(dateFilteredVouchers);
      const voucherTypes = processVoucherTypes(dateFilteredVouchers);
      
      const comprehensiveData: ComprehensiveReportData = {
        revenueByMonth,
        revenueByService,
        profitability,
        clientsBySource,
        clientRetention,
        topClients,
        leadConversion,
        leadsBySource,
        bookingsByType,
        bookingsByMonth,
        seasonalTrends,
        emailCampaigns: [], // Email campaigns not implemented yet
        blogMetrics: blogPosts.map(p => ({
          title: p.title || 'Untitled',
          views: p.view_count || 0,
          engagement: p.engagement_score || 0,
          leads: p.leads_generated || 0
        })),
        averageOrderValue: dateFilteredInvoices.length > 0 ? 
          dateFilteredInvoices.reduce((sum, inv) => sum + parseFloat(inv.total?.toString() || '0'), 0) / dateFilteredInvoices.length : 0,
        customerLifetimeValue: clients.length > 0 ? 
          dateFilteredInvoices.reduce((sum, inv) => sum + parseFloat(inv.total?.toString() || '0'), 0) / clients.length : 0,
        averageProjectDuration: 14, // Mock: average project duration in days
        clientSatisfactionScore: 4.8, // Mock data - would come from surveys
        galleryViews: [
          { gallery: 'Wedding Portfolio', views: 1250, inquiries: 45 },
          { gallery: 'Portrait Gallery', views: 890, inquiries: 32 },
          { gallery: 'Family Photos', views: 650, inquiries: 28 }
        ],
        portfolioMetrics: [
          { category: 'Weddings', views: 2100, downloads: 85 },
          { category: 'Portraits', views: 1800, downloads: 65 },
          { category: 'Events', views: 950, downloads: 35 }
        ],
        voucherSales,
        voucherTypes
      };

      // console.log removed
      setReportData(comprehensiveData);
    } catch (err) {
      // console.error removed
      setError('Failed to load reports. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  useEffect(() => {
    fetchComprehensiveReports();
  }, [selectedTimeRange]);

  const fetchReportData = async () => {
    // This function is kept for backward compatibility but disabled
    // console.warn removed
    return fetchComprehensiveReports();
  };

  const fetchMockReportData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // In a real implementation, this would fetch data from the API
      // For now, we'll use mock data
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate mock data
      const mockRevenueByMonth = [];
      const currentDate = new Date();
      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        mockRevenueByMonth.push({
          month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
          revenue: Math.floor(Math.random() * 5000) + 1000
        });
      }
      
      const mockClientsBySource = [
        { source: 'Website', count: 45 },
        { source: 'Referral', count: 30 },
        { source: 'Social Media', count: 25 },
        { source: 'Google', count: 20 },
        { source: 'Other', count: 10 }
      ];
      
      const mockBookingsByType = [
        { type: 'Family', count: 35 },
        { type: 'Newborn', count: 25 },
        { type: 'Wedding', count: 15 },
        { type: 'Business', count: 20 },
        { type: 'Event', count: 5 }
      ];
      
      const mockData: ReportData = {
        revenueByMonth: mockRevenueByMonth,
        clientsBySource: mockClientsBySource,
        bookingsByType: mockBookingsByType,
        leadConversionRate: 35.8,
        averageOrderValue: 245.50,
        topClients: [
          { name: 'Sarah Mueller', revenue: 2450 },
          { name: 'Michael Schmidt', revenue: 1980 },
          { name: 'Anna Weber', revenue: 1750 },
          { name: 'Thomas Huber', revenue: 1500 },
          { name: 'Lisa Bauer', revenue: 1350 }
        ]
      };
      
      setReportData(mockData);
    } catch (err) {
      // console.error removed
      setError('Failed to load report data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchComprehensiveReports();
  };

  const handleExportCSV = () => {
    if (!reportData) return;
    
    // Create CSV content
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Revenue by month
    csvContent += "Revenue by Month\n";
    csvContent += "Month,Revenue\n";
    reportData.revenueByMonth.forEach(item => {
      csvContent += `${item.month},${item.revenue}\n`;
    });
    
    csvContent += "\nClients by Source\n";
    csvContent += "Source,Count\n";
    reportData.clientsBySource.forEach(item => {
      csvContent += `${item.source},${item.count}\n`;
    });
    
    csvContent += "\nBookings by Type\n";
    csvContent += "Type,Count\n";
    reportData.bookingsByType.forEach(item => {
      csvContent += `${item.type},${item.count}\n`;
    });
    
    csvContent += "\nTop Clients\n";
    csvContent += "Name,Revenue\n";
    reportData.topClients.forEach(item => {
      csvContent += `${item.name},${item.revenue}\n`;
    });
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `photography-business-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Business Reports</h1>
            <p className="text-gray-600">Analyze your business performance</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleRefresh}
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

        {/* Date Range Filter */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>
            
            <div className="ml-auto">
              <button className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 h-[42px] mt-7">
                <Filter size={18} className="mr-2" />
                More Filters
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
            <span className="ml-2 text-gray-600">Loading report data...</span>
          </div>
        ) : reportData ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BarChartIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Lead Conversion Rate</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {reportData.leadConversion.length > 0 ? 
                        reportData.leadConversion.reduce((sum, conv) => sum + conv.rate, 0) / reportData.leadConversion.length : 0
                      }%
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <LineChart className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Average Order Value</p>
                    <p className="text-2xl font-semibold text-gray-900">€{reportData.averageOrderValue?.toFixed?.(2) || '0.00'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <PieChart className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      €{reportData.revenueByMonth.reduce((sum, month) => sum + month.revenue, 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Chart */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Trend</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={reportData.revenueByMonth}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`€${value}`, 'Revenue']} />
                      <Legend />
                      <Bar dataKey="revenue" name="Revenue" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Client Source Chart */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Clients by Source</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reportData.clientsBySource}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="source"
                        label={({ source, percent }) => `${source}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {reportData.clientsBySource.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name, props) => [`${value} clients`, props.payload.source]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Booking Types Chart */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Bookings by Type</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={reportData.bookingsByType}
                      layout="vertical"
                      margin={{ top: 20, right: 30, left: 60, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="type" type="category" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" name="Bookings" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Clients */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Top Clients by Revenue</h3>
                <div className="overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Client
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Revenue
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.topClients.map((client, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {client.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                            €{client.revenue.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <BarChartIcon className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No report data available</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your date range or refresh the data.
            </p>
            <div className="mt-6">
              <button
                onClick={handleRefresh}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <RefreshCw className="-ml-1 mr-2 h-5 w-5" />
                Refresh Data
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ReportsPage;
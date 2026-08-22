import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { supabase } from '../../lib/supabase';
import { 
  BarChart as BarChartIcon, 
  Calendar as CalendarIcon, 
  Users,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Camera,
  Clock
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useStudioCurrency } from '../../hooks/useStudioCurrency';

interface DashboardData {
  // Key Metrics
  totalRevenue: number;
  monthlyRevenue: number;
  totalClients: number;
  newLeads: number;
  pendingInvoices: number;
  awaitingPaymentInvoices: number;
  upcomingBookings: number;
  
  // Charts Data
  revenueChart: { month: string; revenue: number; bookings: number; }[];
  leadConversionChart: { month: string; leads: number; converted: number; }[];
  serviceDistribution: { service: string; count: number; revenue: number; }[];
  
  // Recent Activity
  recentLeads: any[];
  recentBookings: any[];
  recentInvoices: any[];
  
  // Performance Indicators
  monthlyGrowth: number;
  conversionRate: number;
  averageOrderValue: number;
  clientSatisfaction: number;
}

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { format: formatPrice } = useStudioCurrency();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('30days');

  useEffect(() => {
    fetchDashboardData();
  }, [selectedTimeframe]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Calculate date ranges
      const now = new Date();
      const startDate = new Date();
      const previousPeriodStart = new Date();
      
      switch (selectedTimeframe) {
        case '7days':
          startDate.setDate(now.getDate() - 7);
          previousPeriodStart.setDate(now.getDate() - 14);
          break;
        case '30days':
          startDate.setDate(now.getDate() - 30);
          previousPeriodStart.setDate(now.getDate() - 60);
          break;
        case '90days':
          startDate.setDate(now.getDate() - 90);
          previousPeriodStart.setDate(now.getDate() - 180);
          break;
      }

      // Fetch all data in parallel
      // Fetch data from CRM API endpoints instead of Supabase
      const [
        invoicesResult,
        clientsResult,
        leadsResult,
        bookingsResult,
        previousInvoicesResult
      ] = await Promise.allSettled([
        fetch('/api/crm/invoices', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
        fetch('/api/crm/clients', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
        fetch('/api/crm/leads', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
        fetch('/api/crm/bookings', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
        fetch('/api/crm/invoices', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
      ]);

      // Process data
      const invoices = invoicesResult.status === 'fulfilled' && invoicesResult.value.ok ? await invoicesResult.value.json() : [];
      const clientsData = clientsResult.status === 'fulfilled' && clientsResult.value.ok ? await clientsResult.value.json() : { clients: [] };
      const clients = clientsData.clients || [];
      const leadsData = leadsResult.status === 'fulfilled' && leadsResult.value.ok ? await leadsResult.value.json() : { leads: [] };
      const leads = leadsData.leads || [];
      const bookingsData = bookingsResult.status === 'fulfilled' && bookingsResult.value.ok ? await bookingsResult.value.json() : { bookings: [] };
      const bookings = bookingsData.bookings || [];
      const previousInvoices = previousInvoicesResult.status === 'fulfilled' && previousInvoicesResult.value.ok ? await previousInvoicesResult.value.json() : [];

      // Filter invoices by date on client side since API doesn't support date filtering yet
      const currentPeriodInvoices = invoices.filter((inv: any) => new Date(inv.created_at) >= startDate);
      const previousPeriodInvoices = previousInvoices.filter((inv: any) => {
        const invoiceDate = new Date(inv.created_at);
        return invoiceDate >= previousPeriodStart && invoiceDate < startDate;
      });

      // Calculate metrics using filtered data
      const totalRevenue = currentPeriodInvoices.reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0);
      const previousRevenue = previousPeriodInvoices.reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0);
      const monthlyGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;
      
      const convertedLeads = leads.filter((lead: any) => lead.status === 'CONVERTED').length;
      const conversionRate = leads.length > 0 ? (convertedLeads / leads.length) * 100 : 0;
      
      const averageOrderValue = currentPeriodInvoices.length > 0 ? totalRevenue / currentPeriodInvoices.length : 0;

      // Process chart data using current period invoices
      const revenueChart = processRevenueChart(currentPeriodInvoices);
      const leadConversionChart = processLeadChart(leads);
      const serviceDistribution = processServiceDistribution(currentPeriodInvoices);

      const dashboardData: DashboardData = {
        totalRevenue,
        monthlyRevenue: totalRevenue,
        totalClients: clients.length,
        newLeads: leads.length,
        pendingInvoices: currentPeriodInvoices.filter((inv: any) => inv.status === 'PENDING').length,
        awaitingPaymentInvoices: invoices.filter((inv: any) => inv.status === 'awaiting_payment').length,
        upcomingBookings: bookings.length,
        revenueChart,
        leadConversionChart,
        serviceDistribution,
        recentLeads: leads.slice(0, 5),
        recentBookings: bookings.slice(0, 5),
        recentInvoices: invoices.slice(0, 5),
        monthlyGrowth,
        conversionRate,
        averageOrderValue,
        clientSatisfaction: 4.8 // Mock data
      };

      setDashboardData(dashboardData);
    } catch (error) {
      // console.error removed
    } finally {
      setLoading(false);
    }
  };

  const processRevenueChart = (invoices: any[]) => {
    const monthlyData = new Map();
    invoices.forEach(invoice => {
      const date = new Date(invoice.created_at);
      const monthKey = format(date, 'MMM yyyy');
      const existing = monthlyData.get(monthKey) || { month: monthKey, revenue: 0, bookings: 0 };
      existing.revenue += invoice.total_amount || 0;
      existing.bookings += 1;
      monthlyData.set(monthKey, existing);
    });
    return Array.from(monthlyData.values()).sort((a, b) => a.month.localeCompare(b.month));
  };

  const processLeadChart = (leads: any[]) => {
    const monthlyData = new Map();
    leads.forEach(lead => {
      const date = new Date(lead.created_at);
      const monthKey = format(date, 'MMM yyyy');
      const existing = monthlyData.get(monthKey) || { month: monthKey, leads: 0, converted: 0 };
      existing.leads += 1;
      if (lead.status === 'CONVERTED') existing.converted += 1;
      monthlyData.set(monthKey, existing);
    });
    return Array.from(monthlyData.values()).sort((a, b) => a.month.localeCompare(b.month));
  };

  const processServiceDistribution = (invoices: any[]) => {
    const serviceData = new Map();
    invoices.forEach(invoice => {
      const service = invoice.service_type || 'Other';
      const existing = serviceData.get(service) || { service, count: 0, revenue: 0 };
      existing.count += 1;
      existing.revenue += invoice.total_amount || 0;
      serviceData.set(service, existing);
    });
    return Array.from(serviceData.values());
  };

  const MetricCard = ({ title, value, change, icon: Icon, color }: any) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          {change !== undefined && (
            <div className="flex items-center mt-1">
              {change >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
              )}
              <span className={`text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(change).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderKeyMetrics = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
      <MetricCard
        title="Total Revenue"
        value={formatPrice(dashboardData?.totalRevenue)}
        change={dashboardData?.monthlyGrowth}
        icon={DollarSign}
        color="bg-purple-500"
      />
      <MetricCard
        title="New Leads"
        value={dashboardData?.newLeads}
        icon={Users}
        color="bg-blue-500"
      />
      <MetricCard
        title="Upcoming Bookings"
        value={dashboardData?.upcomingBookings}
        icon={CalendarIcon}
        color="bg-green-500"
      />
      <MetricCard
        title="Awaiting Payment"
        value={dashboardData?.awaitingPaymentInvoices || 0}
        icon={Clock}
        color="bg-orange-500"
      />
      <MetricCard
        title="Conversion Rate"
        value={`${dashboardData?.conversionRate.toFixed(1)}%`}
        icon={TrendingUp}
        color="bg-orange-500"
      />
    </div>
  );

  const renderCharts = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={dashboardData?.revenueChart || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={dashboardData?.serviceDistribution || []}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({service, count}) => `${service} (${count})`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="revenue"
            >
              {(dashboardData?.serviceDistribution || []).map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [formatPrice(value as number), 'Revenue']} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderRecentActivity = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Recent Leads */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Recent Leads</h3>
            <button
              onClick={() => navigate('/admin/leads')}
              className="text-purple-600 hover:text-purple-700 text-sm font-medium"
            >
              View All
            </button>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {(dashboardData?.recentLeads || []).slice(0, 5).map((lead, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {lead.first_name} {lead.last_name}
                  </p>
                  <p className="text-sm text-gray-600">{lead.email}</p>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                    lead.status === 'NEW' ? 'bg-blue-100 text-blue-800' :
                    lead.status === 'CONTACTED' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {lead.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {format(new Date(lead.created_at), 'MMM dd')}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Bookings</h3>
            <button
              onClick={() => navigate('/admin/calendar')}
              className="text-purple-600 hover:text-purple-700 text-sm font-medium"
            >
              View Calendar
            </button>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {(dashboardData?.recentBookings || []).slice(0, 5).map((booking, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{booking.client_name || 'Client'}</p>
                  <p className="text-sm text-gray-600">{booking.service_type}</p>
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <Clock className="h-3 w-3 mr-1" />
                    {format(new Date(booking.booking_date), 'MMM dd, HH:mm')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Recent Invoices</h3>
            <button
              onClick={() => navigate('/admin/invoices')}
              className="text-purple-600 hover:text-purple-700 text-sm font-medium"
            >
              View All
            </button>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {(dashboardData?.recentInvoices || []).slice(0, 5).map((invoice, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Invoice #{invoice.id?.substring(0, 8)}</p>
                  <p className="text-sm text-gray-600">{formatPrice(invoice.total_amount)}</p>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                    invoice.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                    invoice.status === 'PAID' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {invoice.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {format(new Date(invoice.created_at), 'MMM dd')}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderQuickActions = () => (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => navigate('/admin/leads')}
          className="flex items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Users className="h-5 w-5 text-purple-600 mr-2" />
          <span className="text-sm font-medium">Add Lead</span>
        </button>
        <button
          onClick={() => navigate('/admin/calendar')}
          className="flex items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <CalendarIcon className="h-5 w-5 text-blue-600 mr-2" />
          <span className="text-sm font-medium">Schedule</span>
        </button>
        <button
          onClick={() => navigate('/admin/invoices')}
          className="flex items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <FileText className="h-5 w-5 text-green-600 mr-2" />
          <span className="text-sm font-medium">Create Invoice</span>
        </button>
        <button
          onClick={() => navigate('/admin/galleries')}
          className="flex items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Camera className="h-5 w-5 text-orange-600 mr-2" />
          <span className="text-sm font-medium">Upload Photos</span>
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          {/* Animated Logo/Icon */}
          <div className="relative mb-8">
            <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center">
              <Camera className="w-10 h-10 text-purple-600 animate-pulse" />
            </div>
            <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin"></div>
          </div>
          
          {/* Loading Text */}
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Dashboard</h2>
          <p className="text-gray-500 mb-6">Gathering your business insights...</p>
          
          {/* Progress Bar */}
          <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full animate-loading-bar"></div>
          </div>
          
          {/* Loading Steps */}
          <div className="mt-8 space-y-2 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
              <span>Fetching revenue data</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <span>Loading client information</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-300 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              <span>Preparing charts</span>
            </div>
          </div>
        </div>
        
        {/* Add the animation keyframes as inline style */}
        <style>{`
          @keyframes loading-bar {
            0% { width: 0%; }
            50% { width: 70%; }
            100% { width: 100%; }
          }
          .animate-loading-bar {
            animation: loading-bar 2s ease-in-out infinite;
          }
        `}</style>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Overview of your photography business</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
            </select>
            <button
              onClick={() => navigate('/admin/reports')}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <BarChartIcon size={16} className="mr-2" />
              View Reports
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        {renderKeyMetrics()}

        {/* Quick Actions */}
        {renderQuickActions()}

        {/* Charts */}
        {renderCharts()}

        {/* Recent Activity */}
        {renderRecentActivity()}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboardPage;

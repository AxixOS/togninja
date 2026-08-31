import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import EmbeddedCRMChat from '../../components/chat/EmbeddedCRMChat';
import GCalStatusBanner from '../../components/admin/GCalStatusBanner';
import SetupNeededCard from '@/components/admin/SetupNeededCard';
import HomepageDraftBanner from '../../components/admin/HomepageDraftBanner';
import DemoResetButton from '../../components/admin/DemoResetButton';
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
  Clock,
  ArrowRightCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
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
  upcomingBookings: number;
  
  // Charts Data
  revenueChart: { label: string; revenue: number; bookings: number; }[];
  leadConversionChart: { label: string; leads: number; converted: number; }[];
  serviceDistribution: { service: string; count: number; revenue: number; }[];
  
  // Recent Activity
  recentLeads: any[];
  recentBookings: any[];
  recentInvoices: any[];
  recentQuotes: any[];
  unpaidInvoices: any[];
  
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

  // CRM Operations Assistant configuration
  const CRM_ASSISTANT_ID = 'asst_crm_operations_v1'; // Replace with your actual assistant ID

  const handleCRMAction = (action: any) => {
    // console.log removed
    
    // Handle different types of CRM actions
    switch (action.type) {
      case 'email':
        // Handle email actions (booking confirmations, replies, etc.)
        handleEmailAction(action);
        break;
      case 'booking':
        // Handle booking actions (create, update, cancel appointments)
        handleBookingAction(action);
        break;
      case 'client':
        // Handle client actions (add, update client records)
        handleClientAction(action);
        break;
      case 'invoice':
        // Handle invoice actions (generate, send invoices)
        handleInvoiceAction(action);
        break;
      case 'data':
        // Handle data actions (reports, exports)
        handleDataAction(action);
        break;
      case 'calendar':
        // Handle calendar actions (schedule, send invites)
        handleCalendarAction(action);
        break;
      default:
        // console.log removed
    }
    
    // Refresh dashboard data after action
    fetchDashboardData();
  };

  const handleEmailAction = (action: any) => {
    // Implement email-specific actions
    // console.log removed
    // This would integrate with your email system
  };

  const handleBookingAction = (action: any) => {
    // Implement booking-specific actions
    // console.log removed
    // This would integrate with your booking system
  };

  const handleClientAction = (action: any) => {
    // Implement client-specific actions
    // console.log removed
    // This would navigate to clients page or refresh client data
    if (action.action === 'view_clients') {
      navigate('/admin/clients');
    }
  };

  const handleInvoiceAction = (action: any) => {
    // Implement invoice-specific actions
    // console.log removed
    // This would integrate with your invoicing system
    if (action.action === 'view_invoices') {
      navigate('/admin/invoices');
    }
  };

  const handleDataAction = (action: any) => {
    // Implement data-specific actions
    // console.log removed
    // This would generate reports or export data
  };

  const handleCalendarAction = (action: any) => {
    // Implement calendar-specific actions
    // console.log removed
    // This would integrate with your calendar system
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedTimeframe]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Use the dedicated dashboard metrics endpoint that correctly calculates paid revenue
      const [
        metricsResponse,
        leadsResponse,
        bookingsResponse,
        invoicesResponse
      ] = await Promise.allSettled([
        fetch('/api/crm/dashboard/metrics'),
        // Pull a small recent window of leads server-side for efficiency
        fetch('/api/leads/list?status=any&limit=50&offset=0'),
        // Only fetch future sessions (upcoming bookings) to avoid loading 24k+ historical records
        fetch(`/api/photography/sessions?from=${new Date().toISOString()}`),
        fetch('/api/crm/invoices?limit=20')
      ]);

      // Process API responses
      const metrics = metricsResponse.status === 'fulfilled' && metricsResponse.value.ok ? 
        await metricsResponse.value.json() : {};
      const leadsPayload = leadsResponse.status === 'fulfilled' && leadsResponse.value.ok ? 
        await leadsResponse.value.json() : { rows: [], count: 0 };
      const allLeads = Array.isArray(leadsPayload) ? leadsPayload : (leadsPayload.rows || []);
      const bookings = bookingsResponse.status === 'fulfilled' && bookingsResponse.value.ok ? 
        await bookingsResponse.value.json() : [];
      const invoices = invoicesResponse.status === 'fulfilled' && invoicesResponse.value.ok ? 
        await invoicesResponse.value.json() : [];
      
      // Filter for new leads (last 30 days) - simplified to avoid date errors
      const newLeads = allLeads.filter((lead: any) => {
        try {
          const createdDate = new Date(lead.createdAt || lead.created_at);
          if (isNaN(createdDate.getTime())) return false;
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return createdDate >= thirtyDaysAgo;
        } catch (error) {
          return false;
        }
      });
      
      // Filter for quotes (document_type === 'quote')
      const isQuote = (inv: any) => inv.document_type === 'quote' || inv.documentType === 'quote' || (inv.invoice_number || inv.invoiceNumber || '').startsWith('QUO-');
      const quotes = invoices.filter(isQuote);

      // Filter for paid invoices (excluding quotes) to create charts
      const paidInvoices = invoices.filter((inv: any) => inv.status === 'paid' && !isQuote(inv));

      // Filter for unpaid invoices (sent / awaiting payment)
      const unpaidInvoices = invoices.filter((inv: any) => (inv.status === 'sent' || inv.status === 'pending' || inv.status === 'awaiting_payment') && !isQuote(inv));

      // Create simplified chart data
      // Build revenue chart from server trendData (last 7 days)
      const revenueChart = Array.isArray(metrics.trendData)
        ? metrics.trendData.map((d: any) => ({
            label: (() => { try { return format(new Date(d.date), 'MMM dd'); } catch { return String(d.date); } })(),
            revenue: Number(d.value || 0),
            bookings: 0
          }))
        : [];

      // Build a simple lead conversion summary for the last 30 days
      const convertedCount = newLeads.filter((l: any) => (l.status === 'CONVERTED' || l.status === 'converted')).length;
      const leadConversionChart = [{ label: 'Last 30 days', leads: newLeads.length, converted: convertedCount }];

      const dashboardData: DashboardData = {
        totalRevenue: metrics.totalRevenue || 0,
        monthlyRevenue: metrics.totalRevenue || 0,
        totalClients: metrics.totalClients || 0,
        newLeads: newLeads.length,
        pendingInvoices: unpaidInvoices.length,
        upcomingBookings: metrics.upcomingSessions || 0,
  revenueChart,
  leadConversionChart,
  serviceDistribution: (() => {
          // Group bookings by session type to build real service distribution
          const typeMap: Record<string, { count: number; revenue: number }> = {};
          bookings.forEach((b: any) => {
            const sType = b.sessionType || b.session_type || 'Other';
            if (!typeMap[sType]) typeMap[sType] = { count: 0, revenue: 0 };
            typeMap[sType].count += 1;
            typeMap[sType].revenue += parseFloat(b.price || b.totalPrice || 0);
          });
          return Object.entries(typeMap).map(([service, data]) => ({
            service,
            count: data.count,
            revenue: data.revenue
          }));
        })(),
        recentLeads: newLeads.slice(0, 5),
        recentBookings: bookings
          .filter((b: any) => {
            try {
              const d = new Date(b.startTime || b.start_time || b.sessionDate);
              return !isNaN(d.getTime()) && d >= new Date();
            } catch { return false; }
          })
          .sort((a: any, b: any) => new Date(a.startTime || a.start_time).getTime() - new Date(b.startTime || b.start_time).getTime())
          .slice(0, 5),
        recentInvoices: paidInvoices.slice(0, 5),
        recentQuotes: quotes.slice(0, 5),
        unpaidInvoices: unpaidInvoices,
        monthlyGrowth: 0, // Would need historical data
        conversionRate: allLeads.length > 0 ? (allLeads.filter(l => l.status === 'CONVERTED').length / allLeads.length) * 100 : 0,
        averageOrderValue: metrics.avgOrderValue || 0,
        clientSatisfaction: 0 // Computed from real data when reviews are available
      };

      setDashboardData(dashboardData);
    } catch (error) {
      // console.error removed
    } finally {
      setLoading(false);
    }
  };

  // No mock chart data; we rely on real metrics. If empty, UI shows an empty state message.

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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <MetricCard
        title="Total Revenue"
        value={formatPrice(dashboardData?.totalRevenue ?? 0)}
        change={dashboardData?.monthlyGrowth}
        icon={DollarSign}
        color="bg-purple-500"
      />
      <MetricCard
        title="New Leads"
        value={dashboardData?.newLeads ?? 0}
        icon={Users}
        color="bg-blue-500"
      />
      <MetricCard
        title="Upcoming Bookings"
        value={dashboardData?.upcomingBookings ?? 0}
        icon={CalendarIcon}
        color="bg-green-500"
      />
      <MetricCard
        title="Conversion Rate"
        value={`${(dashboardData?.conversionRate ?? 0).toFixed(1)}%`}
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
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Distribution</h3>
        {dashboardData?.serviceDistribution && dashboardData.serviceDistribution.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={dashboardData.serviceDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({service, count}) => `${service} (${count})`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="revenue"
              >
                {dashboardData.serviceDistribution.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [formatPrice(value as number), 'Revenue']} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-sm text-gray-500">No service distribution data yet.</div>
        )}
      </div>
    </div>
  );

  const handleConvertToInvoice = async (quoteId: string) => {
    if (!window.confirm('Convert this quote to an invoice? This will change the document type from Quote to Invoice.')) return;
    try {
      const response = await fetch(`/api/crm/invoices/${quoteId}/convert-to-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to convert');
      const data = await response.json();
      alert(`Quote converted to Invoice #${data.invoice_number}`);
      fetchDashboardData();
    } catch (error) {
      alert('Failed to convert quote to invoice. Please try again.');
    }
  };

  const renderRecentActivity = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Awaiting Payment */}
      {(dashboardData?.unpaidInvoices || []).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg shadow lg:col-span-2">
          <div className="p-6 border-b border-red-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-red-600" />
                <h3 className="text-lg font-semibold text-red-900">Awaiting Payment</h3>
                <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {dashboardData?.unpaidInvoices.length}
                </span>
              </div>
              <button
                onClick={() => navigate('/admin/invoices')}
                className="text-red-600 hover:text-red-700 text-sm font-medium"
              >
                View All Invoices
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {(dashboardData?.unpaidInvoices || []).map((invoice, index) => (
                <div key={index} className="flex items-center justify-between bg-white rounded-lg p-3 border border-red-100">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {invoice.client?.name || invoice.clientName || invoice.client_name || 'Unknown Client'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {invoice.invoiceNumber || invoice.invoice_number}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-red-700">{formatPrice(parseFloat(invoice.total) || 0)}</p>
                    <p className="text-xs text-gray-500">
                      Due {(() => {
                        try {
                          const date = new Date(invoice.dueDate || invoice.due_date);
                          return isNaN(date.getTime()) ? '—' : format(date, 'MMM dd, yyyy');
                        } catch { return '—'; }
                      })()}
                    </p>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-red-100 flex justify-between items-center">
                <p className="text-sm font-medium text-red-900">Total Outstanding</p>
                <p className="text-lg font-bold text-red-700">
                  {formatPrice((dashboardData?.unpaidInvoices || []).reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0))}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

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
                    {lead.full_name || lead.name || lead.email}
                  </p>
                  <p className="text-sm text-gray-600">{lead.email}</p>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                    lead.status === 'new' ? 'bg-blue-100 text-blue-800' :
                    lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {lead.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {(() => {
                    try {
                      const date = new Date(lead.createdAt || lead.created_at);
                      return isNaN(date.getTime()) ? 'Recent' : format(date, 'MMM dd');
                    } catch (error) {
                      return 'Recent';
                    }
                  })()}
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
                  <p className="font-medium text-gray-900">{booking.clientName || booking.client_name || booking.title || 'Client'}</p>
                  <p className="text-sm text-gray-600">{booking.sessionType || booking.session_type || ''}</p>
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <Clock className="h-3 w-3 mr-1" />
                    {(() => {
                      try {
                        const date = new Date(booking.startTime || booking.start_time || booking.sessionDate || booking.created_at);
                        return isNaN(date.getTime()) ? 'No date' : format(date, 'MMM dd, HH:mm');
                      } catch (error) {
                        return 'No date';
                      }
                    })()}
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
                  <p className="font-medium text-gray-900">Invoice #{invoice.invoiceNumber || invoice.invoice_number || invoice.id?.substring(0, 8)}</p>
                  {(invoice.client?.name || invoice.clientName || invoice.client_name) && (
                    <p className="text-xs text-gray-500">{invoice.client?.name || invoice.clientName || invoice.client_name}</p>
                  )}
                  <p className="text-sm text-gray-600">{formatPrice(parseFloat(invoice.total) || 0)}</p>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                    invoice.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                    invoice.status === 'PAID' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {invoice.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {(() => {
                    try {
                      const date = new Date(invoice.createdAt || invoice.created_at);
                      return isNaN(date.getTime()) ? 'Recent' : format(date, 'MMM dd');
                    } catch (error) {
                      return 'Recent';
                    }
                  })()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Quotes */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Recent Quotes</h3>
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
            {(dashboardData?.recentQuotes || []).length === 0 ? (
              <p className="text-sm text-gray-500">No quotes yet.</p>
            ) : (
              (dashboardData?.recentQuotes || []).slice(0, 5).map((quote, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Quote #{quote.invoiceNumber || quote.invoice_number || quote.id?.substring(0, 8)}</p>
                    {(quote.client?.name || quote.clientName || quote.client_name) && (
                      <p className="text-xs text-gray-500">{quote.client?.name || quote.clientName || quote.client_name}</p>
                    )}
                    <p className="text-sm text-gray-600">{formatPrice(parseFloat(quote.total) || 0)}</p>
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                      quote.status === 'accepted' || quote.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                      quote.status === 'sent' || quote.status === 'SENT' || quote.status === 'pending' || quote.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      quote.status === 'draft' || quote.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {quote.status || 'draft'}
                    </span>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <p className="text-xs text-gray-500">
                      {(() => {
                        try {
                          const date = new Date(quote.createdAt || quote.created_at);
                          return isNaN(date.getTime()) ? 'Recent' : format(date, 'MMM dd');
                        } catch (error) {
                          return 'Recent';
                        }
                      })()}
                    </p>
                    <button
                      onClick={() => handleConvertToInvoice(quote.id)}
                      className="flex items-center text-xs text-green-600 hover:text-green-800 font-medium"
                      title="Convert to Invoice"
                    >
                      <ArrowRightCircle className="h-3 w-3 mr-1" />
                      Convert to Invoice
                    </button>
                  </div>
                </div>
              ))
            )}
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
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* DEBUG: AI Chat moved to bottom - June 26, 2025 */}
      <div className="space-y-6">
        {/* What still needs connecting before this CRM can invoice anyone. FIRST, above the
            headline figures: those four zeros are the consequence of the list below, and a
            studio reading them in the other order concludes the product does not work. */}
        <SetupNeededCard />
        {/* Google Calendar health alert — shown only when sync is configured but failing */}
        <GCalStatusBanner />
        {/* Demo-only: wipe + restart onboarding for A–Z testing (hidden on real studios) */}
        <DemoResetButton />
        {/* AI homepage draft handoff — shown only when an unpublished/unset draft exists */}
        <HomepageDraftBanner />
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

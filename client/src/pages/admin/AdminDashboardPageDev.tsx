import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Calendar,
  Plus,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface DashboardMetrics {
  avgOrderValue: number;
  activeUsers: number;
  bookedRevenue: number;
  trendData: Array<{ date: string; value: number }>;
}

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  service: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted';
  createdAt: string;
}

interface PopularImage {
  id: string;
  url: string;
  title: string;
  views: number;
}

const AdminDashboardPageDev: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    avgOrderValue: 0,
    activeUsers: 0,
    bookedRevenue: 0,
    trendData: []
  });
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [popularImages, setPopularImages] = useState<PopularImage[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Mock data for development
      setMetrics({
        avgOrderValue: 245.50,
        activeUsers: 1247,
        bookedRevenue: 15420.00,
        trendData: [
          { date: '2025-01-01', value: 1200 },
          { date: '2025-01-02', value: 1350 },
          { date: '2025-01-03', value: 1180 },
          { date: '2025-01-04', value: 1420 },
          { date: '2025-01-05', value: 1380 },
        ]
      });

      setRecentLeads([
        {
          id: '1',
          name: 'Sarah Mueller',
          email: 'sarah@example.com',
          phone: '+43 123 456 789',
          service: 'Family Photoshoot',
          status: 'new',
          createdAt: '2025-01-25T10:30:00Z'
        },
        {
          id: '2',
          name: 'Michael Schmidt',
          email: 'michael@example.com',
          phone: '+43 987 654 321',
          service: 'Wedding Photography',
          status: 'contacted',
          createdAt: '2025-01-25T09:15:00Z'
        },
        {
          id: '3',
          name: 'Anna Weber',
          email: 'anna@example.com',
          phone: '+43 555 123 456',
          service: 'Newborn Photoshoot',
          status: 'new',
          createdAt: '2025-01-24T16:45:00Z'
        }
      ]);

      setPopularImages([
        {
          id: '1',
          url: 'https://images.pexels.com/photos/1668928/pexels-photo-1668928.jpeg',
          title: 'Family Portrait Session',
          views: 1250
        },
        {
          id: '2',
          url: 'https://images.pexels.com/photos/3875080/pexels-photo-3875080.jpeg',
          title: 'Newborn Photography',
          views: 980
        },
        {
          id: '3',
          url: 'https://images.pexels.com/photos/3662850/pexels-photo-3662850.jpeg',
          title: 'Maternity Shoot',
          views: 875
        }
      ]);
    } catch (error) {
      // console.error removed
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: Lead['status']) => {
    const statusConfig = {
      new: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'New' },
      contacted: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Contacted' },
      qualified: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Qualified' },
      converted: { bg: 'bg-green-100', text: 'text-green-800', label: 'Converted' }
    };

    const config = statusConfig[status];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % popularImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + popularImages.length) % popularImages.length);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">
            CRM Dashboard (Development Mode)
          </h1>
          <div className="flex items-center space-x-4">
            <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
              Auth Bypassed
            </div>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
                <p className="text-2xl font-semibold text-gray-900">€{metrics.avgOrderValue}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-semibold text-gray-900">{metrics.activeUsers.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Booked Revenue</p>
                <p className="text-2xl font-semibold text-gray-900">€{metrics.bookedRevenue.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Calendar className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-2xl font-semibold text-gray-900">24</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* New Leads Table */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">New Leads</h3>
                <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm flex items-center">
                  <Plus size={16} className="mr-2" />
                  Add Lead
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Service
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentLeads.map((lead) => (
                    <tr key={lead.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{lead.name}</div>
                          <div className="text-sm text-gray-500">{lead.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lead.service}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(lead.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button className="text-blue-600 hover:text-blue-900">
                            <Eye size={16} />
                          </button>
                          <button className="text-green-600 hover:text-green-900">
                            <Edit size={16} />
                          </button>
                          <button className="text-red-600 hover:text-red-900">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Popular Images Carousel */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Popular Images</h3>
            </div>
            <div className="p-6">
              {popularImages.length > 0 && (
                <div className="relative">
                  <div className="aspect-w-16 aspect-h-9 mb-4">
                    <img
                      src={popularImages[currentImageIndex].url}
                      alt={popularImages[currentImageIndex].title}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {popularImages[currentImageIndex].title}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {popularImages[currentImageIndex].views} views
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={prevImage}
                        className="p-2 rounded-full bg-gray-100 hover:bg-gray-200"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        onClick={nextImage}
                        className="p-2 rounded-full bg-gray-100 hover:bg-gray-200"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors">
              <Plus size={20} className="mr-2 text-gray-500" />
              <span className="text-gray-700">Add New Lead</span>
            </button>
            <button className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors">
              <Calendar size={20} className="mr-2 text-gray-500" />
              <span className="text-gray-700">Schedule Shoot</span>
            </button>
            <button className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors">
              <Users size={20} className="mr-2 text-gray-500" />
              <span className="text-gray-700">Add Client</span>
            </button>
            <button className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors">
              <TrendingUp size={20} className="mr-2 text-gray-500" />
              <span className="text-gray-700">View Reports</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPageDev;
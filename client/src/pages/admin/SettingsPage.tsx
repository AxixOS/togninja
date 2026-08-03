import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { useLanguage } from '../../context/LanguageContext';
import {
  BookOpen,
  Settings,
  Database,
  Mail,
  Globe,
  Shield,
  Palette,
  Bell,
  Users,
  Key,
  DollarSign,
  Camera,
  Sparkles,
  HardDrive,
  MessageSquare,
  CreditCard
} from 'lucide-react';

const SettingsPage: React.FC = () => {
  const { t } = useLanguage();
  const location = useLocation();

  const settingsCategories = [
    {
      title: 'Studio Profile & Branding',
      description: 'Your business details, logo and website appearance — the information collected during onboarding, editable any time',
      items: [
        {
          icon: Camera,
          title: 'Studio Customization',
          description: 'Logo, studio name, contact details, brand colours and website template',
          path: '/admin/studio-templates',
          color: 'bg-purple-500'
        },
        {
          icon: Palette,
          title: 'Website Wizard',
          description: 'Guided website content setup',
          path: '/admin/website-wizard',
          color: 'bg-fuchsia-500'
        },
        {
          icon: Globe,
          title: 'Website Analyzer',
          description: 'Analyze your public website content',
          path: '/admin/website-analyzer',
          color: 'bg-cyan-600'
        },
        {
          icon: Settings,
          title: 'Manual Website Update',
          description: 'Edit public page content directly (CMS)',
          path: '/admin/manual-website-update',
          color: 'bg-slate-500'
        }
      ]
    },
    {
      title: 'AI Assistant & Knowledge',
      description: 'Manage your AI assistant and its knowledge base',
      items: [
        {
          icon: BookOpen,
          title: t('nav.knowledgeBase'),
          description: 'Support articles + FAQ the chat assistant answers from',
          path: '/admin/knowledge-base',
          color: 'bg-blue-500'
        },
        {
          icon: Sparkles,
          title: 'AI Agent Console',
          description: 'Monitor the CRM AI agent: usage, performance and full audit trail',
          path: '/admin/agent-console',
          color: 'bg-violet-500'
        }
      ]
    },
    {
      title: 'Connections & Integrations',
      description: 'Email, storage, SMS and payments — the services configured during onboarding, editable any time',
      items: [
        {
          icon: Mail,
          title: 'Email & SMTP',
          description: 'Outgoing mail server for leads, invoices and campaigns (with test send)',
          path: '/admin/settings/email',
          color: 'bg-red-500'
        },
        {
          icon: HardDrive,
          title: 'Cloud Storage',
          description: 'Backblaze B2 / S3 credentials used for all uploads (with connection test)',
          path: '/admin/settings/storage',
          color: 'bg-green-500'
        },
        {
          icon: MessageSquare,
          title: 'SMS',
          description: 'Twilio / Vonage text-message provider for reminders',
          path: '/admin/settings/sms',
          color: 'bg-teal-500'
        },
        {
          icon: CreditCard,
          title: 'Payments (Stripe)',
          description: 'Stripe keys for voucher sales and online payments (with test)',
          path: '/admin/settings/payments',
          color: 'bg-indigo-500'
        }
      ]
    },
    {
      title: 'System',
      description: 'Core system configuration',
      items: [
        {
          icon: DollarSign,
          title: 'Price List Management',
          description: 'Manage price list items and import CSV files',
          path: '/admin/settings/price-list',
          color: 'bg-emerald-500'
        }
      ]
    }
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Settings className="h-8 w-8 text-gray-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600">
                Configure your CRM system settings and preferences
              </p>
            </div>
          </div>
        </div>

        {/* Settings Categories */}
        <div className="space-y-8">
          {settingsCategories.map((category, categoryIndex) => (
            <div key={categoryIndex} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {category.title}
                </h2>
                <p className="text-gray-600">
                  {category.description}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.items.map((item, itemIndex) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;

                  return (
                    <Link
                      key={itemIndex}
                      to={item.path}
                      className={`group p-4 rounded-lg border-2 transition-all duration-200 ${
                        isActive
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`${item.color} p-2 rounded-lg`}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 group-hover:text-purple-600">
                            {item.title}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default SettingsPage;

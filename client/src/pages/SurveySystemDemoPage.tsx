import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ClipboardList, 
  Users, 
  BarChart3, 
  Settings,
  Zap,
  Shield,
  Globe,
  Smartphone,
  ArrowRight,
  CheckCircle
} from 'lucide-react';

const SurveySystemDemoPage: React.FC = () => {
  const features = [
    {
      icon: <ClipboardList className="h-8 w-8 text-blue-600" />,
      title: "Advanced Survey Builder",
      description: "Drag-and-drop interface with 20+ question types, real-time preview, and multi-page support."
    },
    {
      icon: <Users className="h-8 w-8 text-green-600" />,
      title: "Response Management",
      description: "Collect, analyze, and export responses with advanced filtering and real-time tracking."
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-purple-600" />,
      title: "Analytics & Insights",
      description: "Comprehensive analytics with completion rates, drop-off points, and visual reporting."
    },
    {
      icon: <Settings className="h-8 w-8 text-orange-600" />,
      title: "Flexible Configuration",
      description: "Custom settings, access controls, time limits, and branded survey experiences."
    },
    {
      icon: <Zap className="h-8 w-8 text-yellow-600" />,
      title: "Smart Logic",
      description: "Skip logic, branching, and conditional questions for dynamic survey flows."
    },
    {
      icon: <Shield className="h-8 w-8 text-red-600" />,
      title: "Security & Privacy",
      description: "Anonymous responses, data encryption, and GDPR-compliant data handling."
    }
  ];

  const questionTypes = [
    "Text Input", "Multiple Choice", "Checkboxes", "Dropdown", "Email", "Phone",
    "Date & Time", "Rating", "Scale", "Ranking", "Matrix", "Slider", "Image Choice",
    "File Upload", "NPS", "Contact Info", "Address", "Net Promoter Score"
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Survey Monkey-Style
              <br />
              <span className="text-blue-200">Questionnaire System</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto">
              Create powerful surveys with advanced question types, real-time analytics, 
              and enterprise-grade features built right into your admin panel.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/admin/questionnaires"
                className="inline-flex items-center px-8 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
              >
                <ClipboardList className="mr-2 h-5 w-5" />
                Start Building Surveys
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <button className="inline-flex items-center px-8 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-blue-600 transition-colors">
                <Globe className="mr-2 h-5 w-5" />
                View Demo Survey
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Everything You Need for Professional Surveys
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            From simple feedback forms to complex research studies, our system provides 
            all the tools you need to create, distribute, and analyze surveys effectively.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Question Types Section */}
      <div className="bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              20+ Question Types
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From basic text inputs to advanced matrix questions, we support all the 
              question types you need for comprehensive data collection.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {questionTypes.map((type, index) => (
              <div key={index} className="bg-white rounded-lg p-4 text-center shadow-sm hover:shadow-md transition-shadow">
                <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-2" />
                <span className="text-sm font-medium text-gray-900">{type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Screenshots Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Powerful Builder Interface
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Intuitive drag-and-drop survey builder with real-time preview and 
            advanced customization options.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Survey Builder Features
            </h3>
            <ul className="space-y-3">
              <li className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                <span>Drag-and-drop question reordering</span>
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                <span>Real-time preview as you build</span>
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                <span>Question categorization and search</span>
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                <span>Conditional logic and branching</span>
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                <span>Custom styling and branding</span>
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                <span>Mobile-responsive design</span>
              </li>
            </ul>
          </div>
          <div className="bg-gray-200 rounded-lg p-8 text-center">
            <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
              <div className="h-4 bg-blue-200 rounded mb-3"></div>
              <div className="h-3 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded mb-4"></div>
              <div className="space-y-2">
                <div className="h-8 bg-gray-100 rounded"></div>
                <div className="h-8 bg-gray-100 rounded"></div>
                <div className="h-8 bg-gray-100 rounded"></div>
              </div>
            </div>
            <p className="text-sm text-gray-600">Survey Builder Interface Preview</p>
          </div>
        </div>
      </div>

      {/* Analytics Section */}
      <div className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Advanced Analytics & Reporting
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Get deep insights into your survey performance with comprehensive 
              analytics, real-time reporting, and data export capabilities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Real-Time Analytics</h3>
              <p className="text-gray-300">
                Monitor responses as they come in with live dashboards and instant notifications.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Response Tracking</h3>
              <p className="text-gray-300">
                Track completion rates, drop-off points, and user behavior patterns.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-purple-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Smartphone className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Device Analytics</h3>
              <p className="text-gray-300">
                Understand how users interact with your surveys across different devices.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Start Creating Surveys?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Join thousands of organizations using our survey system to collect 
              valuable feedback and insights from their audience.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/admin/questionnaires"
                className="inline-flex items-center px-8 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
              >
                <ClipboardList className="mr-2 h-5 w-5" />
                Access Survey Builder
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                to="/survey/demo"
                className="inline-flex items-center px-8 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-blue-600 transition-colors"
              >
                <Globe className="mr-2 h-5 w-5" />
                Try Demo Survey
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-800 text-gray-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p>&copy; 2024 NEWAGEFrntEUI Survey System. Built with React, TypeScript, and Supabase.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SurveySystemDemoPage;

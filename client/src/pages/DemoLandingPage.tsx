import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Play, 
  Users, 
  Camera, 
  Calendar, 
  CreditCard, 
  BarChart3,
  Palette,
  Wand2,
  ArrowRight,
  CheckCircle,
  Star
} from 'lucide-react';
import DemoModeIndicator from '../components/demo/DemoModeIndicator';
import DemoConversionBanner from '../components/demo/DemoConversionBanner';
import { SITE } from '../config/site';

const DemoLandingPage: React.FC = () => {
  const features = [
    {
      icon: Camera,
      title: 'Client Management',
      description: 'Manage clients, sessions, and communications',
      demoPath: '/admin/clients'
    },
    {
      icon: Calendar,
      title: 'Session Scheduling',
      description: 'Advanced booking system with weather integration',
      demoPath: '/admin/calendar'
    },
    {
      icon: CreditCard,
      title: 'Invoicing & Payments',
      description: 'Professional invoicing with Stripe integration',
      demoPath: '/admin/invoices'
    },
    {
      icon: Palette,
      title: '25 Website Templates',
      description: 'Professional templates for every photography style',
      demoPath: '/admin/studio-templates'
    },
    {
      icon: Wand2,
      title: 'Website Import Wizard',
      description: 'AI-powered website migration and optimization',
      demoPath: '/admin/website-wizard'
    },
    {
      icon: BarChart3,
      title: 'Business Analytics',
      description: 'Track revenue, bookings, and client insights',
      demoPath: '/admin/reports'
    }
  ];

  const testimonials = [
    {
      name: 'Maria Schmidt',
      business: 'Schmidt Photography Vienna',
      quote: 'This platform transformed how I manage my photography business. The client portal and gallery system are game-changers.',
      rating: 5
    },
    {
      name: 'David Weber',
      business: 'Weber Wedding Photography',
      quote: 'The template system is incredible. I had a professional website up in 30 minutes using their wizard.',
      rating: 5
    },
    {
      name: 'Anna Müller',
      business: 'Newborn Dreams Studio',
      quote: 'Finally, a CRM built specifically for photographers. The session management features are exactly what I needed.',
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <DemoModeIndicator />
      <DemoConversionBanner />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-center">
            <div className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <Play className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">LIVE INTERACTIVE DEMO</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              The Complete Photography
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">
                Business Platform
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto text-gray-200">
              CRM, Website Builder, Client Galleries, Invoicing, and Analytics - 
              all in one platform designed specifically for photographers.
            </p>

            <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-12">
              <Link
                to="/admin/dashboard"
                className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-8 py-4 rounded-full font-bold text-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-2"
              >
                <span>Explore Full Demo</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
              
              <button
                onClick={() => window.open(`${SITE.url}/pricing`, '_blank')}
                className="border border-white text-white px-8 py-4 rounded-full font-semibold hover:bg-white hover:text-gray-900 transition-all duration-200"
              >
                View Pricing
              </button>
            </div>

            {/* Quick Demo Login */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 max-w-md mx-auto">
              <h3 className="font-semibold mb-4">Quick Demo Access</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Admin Demo:</span>
                  <span className="font-mono">demo@newagefotografie.com / demo2024</span>
                </div>
                <div className="flex justify-between">
                  <span>Client Portal:</span>
                  <span className="font-mono">client@demo.com / client2024</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Everything You Need to Run Your Photography Business
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Click any feature below to explore it in the live demo
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Link
              key={index}
              to={feature.demoPath}
              className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-100 hover:border-blue-200 group"
            >
              <div className="flex items-start space-x-4">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-3 rounded-lg group-hover:scale-110 transition-transform duration-200">
                  <feature.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {feature.description}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Social Proof */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Trusted by Photography Studios Worldwide
            </h2>
            <div className="flex justify-center items-center space-x-8 text-gray-600">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>500+ Studios</span>
              </div>
              <div className="flex items-center space-x-2">
                <Camera className="h-5 w-5" />
                <span>50,000+ Sessions</span>
              </div>
              <div className="flex items-center space-x-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <span>4.9/5 Rating</span>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-yellow-500 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 italic mb-4">"{testimonial.quote}"</p>
                <div>
                  <p className="font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-600">{testimonial.business}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Transform Your Photography Business?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join hundreds of photographers who have already streamlined their workflow
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <button
              onClick={() => window.open(`${SITE.url}/get-started`, '_blank')}
              className="bg-white text-purple-600 px-8 py-4 rounded-full font-bold text-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-2"
            >
              <span>Start Free Trial</span>
              <ArrowRight className="h-5 w-5" />
            </button>
            
            <Link
              to="/admin/website-wizard"
              className="border border-white text-white px-8 py-4 rounded-full font-semibold hover:bg-white hover:text-purple-600 transition-all duration-200"
            >
              Try Website Wizard
            </Link>
          </div>

          <div className="mt-8 flex justify-center items-center space-x-6 text-sm opacity-75">
            <div className="flex items-center space-x-1">
              <CheckCircle className="h-4 w-4" />
              <span>30-Day Free Trial</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircle className="h-4 w-4" />
              <span>No Credit Card Required</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircle className="h-4 w-4" />
              <span>Cancel Anytime</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoLandingPage;
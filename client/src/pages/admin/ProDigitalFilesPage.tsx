import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '../../components/admin/AdminLayout';
import { Cloud, CreditCard, HardDrive, Users, Zap, PlayCircle, ArrowRight, CheckCircle } from 'lucide-react';

interface StorageSubscription {
  hasSubscription: boolean;
  tier?: string;
  status?: string;
  currentUsage?: number;
  storageLimit?: number;
  usageGB?: string;
  limitGB?: string;
  billingEnabled?: boolean;
}

const ProDigitalFilesPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [creatingDemo, setCreatingDemo] = useState(false);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  // Check if user already has a subscription
  const { data: subscription, isLoading } = useQuery<StorageSubscription>({
    queryKey: ['storage-subscription'],
    queryFn: async () => {
      const res = await fetch('/api/files/usage', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch subscription');
      return res.json();
    },
  });

  // Note: Removed auto-redirect so users can view pricing page even with free plan to upgrade

  const handleDemoMode = async () => {
    setCreatingDemo(true);
    try {
      // Create a demo subscription (bypasses Stripe)
      const response = await fetch('/api/storage/demo-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (response.ok) {
        alert('✅ Demo subscription created! You can now test uploads.');
        // Use full page reload to ensure fresh subscription data
        window.location.href = '/my-archive';
      } else {
        alert('❌ Failed to create demo subscription. Check console for details.');
      }
    } catch (error) {
      console.error('Demo subscription error:', error);
      alert('❌ Error creating demo subscription.');
    } finally {
      setCreatingDemo(false);
    }
  };

  const handleSubscribe = async (tier: string) => {
    // Handle free tier without Stripe
    if (tier === 'free') {
      setSubscribing('free');
      try {
        const response = await fetch('/api/storage/activate-free-tier', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (response.status === 401) {
          alert('⚠️ Please log in first to activate free storage');
          navigate('/login');
          return;
        }

        if (response.ok) {
          alert('✅ Free tier activated! You now have 5GB of storage.');
          // Use full page reload to ensure fresh subscription data
          window.location.href = '/my-archive';
        } else {
          const error = await response.json();
          alert(`❌ ${error.error || 'Failed to activate free tier'}`);
        }
      } catch (error) {
        console.error('Free tier activation error:', error);
        alert('❌ Error activating free tier.');
      } finally {
        setSubscribing(null);
      }
      return;
    }

    // Handle paid tiers with Stripe
    setSubscribing(tier);
    try {
      const response = await fetch('/api/storage/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
        credentials: 'include',
      });

      if (response.status === 401) {
        alert('⚠️ Please log in first to subscribe');
        navigate('/login');
        return;
      }

      if (response.ok) {
        const { url } = await response.json();
        if (url) {
          window.location.href = url; // Redirect to Stripe checkout
        }
      } else {
        const error = await response.json();
        alert(`❌ ${error.error || 'Failed to create checkout session'}`);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('❌ Error creating checkout session.');
    } finally {
      setSubscribing(null);
    }
  };

  // Show loading state while checking subscription
  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Checking your subscription...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // If user has active subscription, show subscription info with upgrade option
  if (subscription?.hasSubscription && subscription.status === 'active') {
    const usagePercent = subscription.storageLimit 
      ? ((subscription.currentUsage || 0) / subscription.storageLimit) * 100 
      : 0;
    
    const tierInfo = {
      free: { name: 'Free', color: 'green', nextTier: 'Starter' },
      starter: { name: 'Starter', color: 'blue', nextTier: 'Professional' },
      professional: { name: 'Professional', color: 'purple', nextTier: 'Enterprise' },
      enterprise: { name: 'Enterprise', color: 'indigo', nextTier: null }
    };
    
    const currentTier = tierInfo[subscription.tier as keyof typeof tierInfo] || tierInfo.free;
    // Paid tiers are a reseller feature — hidden on self-hosted installs where
    // Stripe subscription prices aren't configured.
    const billingEnabled = !!subscription.billingEnabled;

    return (
      <AdminLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Current Plan Card */}
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg shadow-lg p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                  <h2 className="text-2xl font-bold text-gray-900">
                    {currentTier.name} Plan Active
                  </h2>
                </div>
                <p className="text-gray-600">
                  Your cloud storage is ready to use
                </p>
              </div>
              <div className={`px-4 py-2 bg-${currentTier.color}-100 text-${currentTier.color}-700 rounded-full text-sm font-semibold`}>
                {subscription.tier?.toUpperCase()}
              </div>
            </div>

            {/* Storage Usage Bar */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Storage Used</span>
                <span className="text-sm text-gray-600">
                  {subscription.usageGB} GB / {subscription.limitGB} GB
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r from-${currentTier.color}-500 to-${currentTier.color}-600 transition-all duration-300`}
                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {usagePercent.toFixed(1)}% of your storage is being used
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => navigate('/my-archive')}
                className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <HardDrive className="mr-2 w-5 h-5" />
                Go to My Archive
              </button>
              
              {currentTier.nextTier && billingEnabled && (
                <button
                  onClick={() => {
                    // Scroll to pricing section
                    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                  }}
                  className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-medium"
                >
                  <Zap className="mr-2 w-5 h-5" />
                  Upgrade to {currentTier.nextTier}
                </button>
              )}
            </div>

            {/* Upgrade Hint */}
            {currentTier.nextTier && billingEnabled && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  💡 <strong>Need more space?</strong> Upgrade to {currentTier.nextTier} for more storage and advanced features.
                </p>
              </div>
            )}
          </div>

          {/* Show upgrade options below if not on highest tier */}
          {currentTier.nextTier && billingEnabled && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Upgrade Your Storage
                </h3>
                <p className="text-gray-600">
                  Get more storage and unlock premium features
                </p>
              </div>

              {/* Show only higher tier options */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Starter - show if on free */}
                {subscription.tier === 'free' && (
                  <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-blue-200">
                    <div className="text-center">
                      <HardDrive size={48} className="mx-auto text-blue-500 mb-4" />
                      <h3 className="text-xl font-semibold mb-2">Starter</h3>
                      <p className="text-3xl font-bold text-gray-900 mb-2">€9.99<span className="text-sm font-normal">/month</span></p>
                      <p className="text-gray-600 mb-4">Perfect for small studios</p>
                    </div>
                    <ul className="space-y-2 mb-6 text-sm">
                      <li className="flex items-center"><Zap size={16} className="text-green-500 mr-2" />50 GB Storage</li>
                      <li className="flex items-center"><Users size={16} className="text-green-500 mr-2" />Up to 100 clients</li>
                      <li className="flex items-center"><Cloud size={16} className="text-green-500 mr-2" />Secure backup</li>
                    </ul>
                    <button 
                      onClick={() => handleSubscribe('starter')}
                      disabled={subscribing === 'starter'}
                      className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {subscribing === 'starter' ? 'Upgrading...' : 'Upgrade to Starter'}
                    </button>
                  </div>
                )}

                {/* Professional - show if on free or starter */}
                {(subscription.tier === 'free' || subscription.tier === 'starter') && (
                  <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-purple-500 relative">
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm">Recommended</span>
                    </div>
                    <div className="text-center">
                      <HardDrive size={48} className="mx-auto text-purple-500 mb-4" />
                      <h3 className="text-xl font-semibold mb-2">Professional</h3>
                      <p className="text-3xl font-bold text-gray-900 mb-2">€19.99<span className="text-sm font-normal">/month</span></p>
                      <p className="text-gray-600 mb-4">For growing businesses</p>
                    </div>
                    <ul className="space-y-2 mb-6 text-sm">
                      <li className="flex items-center"><Zap size={16} className="text-green-500 mr-2" />200 GB Storage</li>
                      <li className="flex items-center"><Users size={16} className="text-green-500 mr-2" />Up to 500 clients</li>
                      <li className="flex items-center"><Cloud size={16} className="text-green-500 mr-2" />Secure backup</li>
                      <li className="flex items-center"><CreditCard size={16} className="text-green-500 mr-2" />Client galleries</li>
                    </ul>
                    <button 
                      onClick={() => handleSubscribe('professional')}
                      disabled={subscribing === 'professional'}
                      className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      {subscribing === 'professional' ? 'Upgrading...' : 'Upgrade to Professional'}
                    </button>
                  </div>
                )}

                {/* Enterprise - show for all non-enterprise users */}
                <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-gray-200">
                  <div className="text-center">
                    <HardDrive size={48} className="mx-auto text-gray-700 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Enterprise</h3>
                    <p className="text-3xl font-bold text-gray-900 mb-2">€39.99<span className="text-sm font-normal">/month</span></p>
                    <p className="text-gray-600 mb-4">For large studios</p>
                  </div>
                  <ul className="space-y-2 mb-6 text-sm">
                    <li className="flex items-center"><Zap size={16} className="text-green-500 mr-2" />1 TB Storage</li>
                    <li className="flex items-center"><Users size={16} className="text-green-500 mr-2" />Unlimited clients</li>
                    <li className="flex items-center"><Cloud size={16} className="text-green-500 mr-2" />Priority backup</li>
                    <li className="flex items-center"><CreditCard size={16} className="text-green-500 mr-2" />Advanced features</li>
                  </ul>
                  <button 
                    onClick={() => handleSubscribe('enterprise')}
                    disabled={subscribing === 'enterprise'}
                    className="w-full bg-gray-900 text-white py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50"
                  >
                    {subscribing === 'enterprise' ? 'Upgrading...' : 'Upgrade to Enterprise'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Cloud Storage</h1>
            <p className="text-gray-600">Cloud storage for photographers - subscription based service</p>
          </div>
          {/* Demo Mode Button */}
          <button
            onClick={handleDemoMode}
            disabled={creatingDemo}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
          >
            <PlayCircle size={20} className="mr-2" />
            {creatingDemo ? 'Creating...' : '🎬 Demo Mode - Test Uploads'}
          </button>
        </div>

        {/* Subscription Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Free Plan */}
          <div className="bg-white rounded-lg shadow p-6 border-2 border-green-200">
            <div className="text-center">
              <HardDrive size={48} className="mx-auto text-green-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Free</h3>
              <p className="text-3xl font-bold text-gray-900 mb-2">€0<span className="text-sm font-normal">/month</span></p>
              <p className="text-gray-600 mb-4">Perfect for testing</p>
            </div>
            <ul className="space-y-2 mb-6">
              <li className="flex items-center"><Zap size={16} className="text-green-500 mr-2" />5 GB Storage</li>
              <li className="flex items-center"><Users size={16} className="text-green-500 mr-2" />Up to 10 clients</li>
              <li className="flex items-center"><Cloud size={16} className="text-green-500 mr-2" />Basic backup</li>
            </ul>
            <button 
              onClick={() => handleSubscribe('free')}
              disabled={subscribing === 'free'}
              className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {subscribing === 'free' ? 'Activating...' : 'Get Started Free'}
            </button>
          </div>

          {subscription?.billingEnabled && (<>
          {/* Starter Plan */}
          <div className="bg-white rounded-lg shadow p-6 border-2 border-gray-200">
            <div className="text-center">
              <HardDrive size={48} className="mx-auto text-blue-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Starter</h3>
              <p className="text-3xl font-bold text-gray-900 mb-2">€9.99<span className="text-sm font-normal">/month</span></p>
              <p className="text-gray-600 mb-4">Perfect for small studios</p>
            </div>
            <ul className="space-y-2 mb-6">
              <li className="flex items-center"><Zap size={16} className="text-green-500 mr-2" />50 GB Storage</li>
              <li className="flex items-center"><Users size={16} className="text-green-500 mr-2" />Up to 100 clients</li>
              <li className="flex items-center"><Cloud size={16} className="text-green-500 mr-2" />Secure backup</li>
            </ul>
            <button 
              onClick={() => handleSubscribe('starter')}
              disabled={subscribing === 'starter'}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {subscribing === 'starter' ? 'Loading...' : 'Get Started'}
            </button>
          </div>

          {/* Professional Plan */}
          <div className="bg-white rounded-lg shadow p-6 border-2 border-blue-500 relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm">Most Popular</span>
            </div>
            <div className="text-center">
              <HardDrive size={48} className="mx-auto text-blue-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Professional</h3>
              <p className="text-3xl font-bold text-gray-900 mb-2">€19.99<span className="text-sm font-normal">/month</span></p>
              <p className="text-gray-600 mb-4">For growing businesses</p>
            </div>
            <ul className="space-y-2 mb-6">
              <li className="flex items-center"><Zap size={16} className="text-green-500 mr-2" />200 GB Storage</li>
              <li className="flex items-center"><Users size={16} className="text-green-500 mr-2" />Up to 500 clients</li>
              <li className="flex items-center"><Cloud size={16} className="text-green-500 mr-2" />Secure backup</li>
              <li className="flex items-center"><CreditCard size={16} className="text-green-500 mr-2" />Client galleries</li>
            </ul>
            <button 
              onClick={() => handleSubscribe('professional')}
              disabled={subscribing === 'professional'}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {subscribing === 'professional' ? 'Loading...' : 'Get Started'}
            </button>
          </div>

          {/* Enterprise Plan */}
          <div className="bg-white rounded-lg shadow p-6 border-2 border-gray-200">
            <div className="text-center">
              <HardDrive size={48} className="mx-auto text-blue-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Enterprise</h3>
              <p className="text-3xl font-bold text-gray-900 mb-2">€39.99<span className="text-sm font-normal">/month</span></p>
              <p className="text-gray-600 mb-4">For large studios</p>
            </div>
            <ul className="space-y-2 mb-6">
              <li className="flex items-center"><Zap size={16} className="text-green-500 mr-2" />1 TB Storage</li>
              <li className="flex items-center"><Users size={16} className="text-green-500 mr-2" />Unlimited clients</li>
              <li className="flex items-center"><Cloud size={16} className="text-green-500 mr-2" />Priority backup</li>
              <li className="flex items-center"><CreditCard size={16} className="text-green-500 mr-2" />Advanced features</li>
            </ul>
            <button 
              onClick={() => handleSubscribe('enterprise')}
              disabled={subscribing === 'enterprise'}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {subscribing === 'enterprise' ? 'Loading...' : 'Get Started'}
            </button>
          </div>
          </>)}
        </div>

        {/* Features */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4">
              <Cloud size={32} className="mx-auto text-blue-500 mb-2" />
              <h3 className="font-semibold">Secure Storage</h3>
              <p className="text-sm text-gray-600">Your images stored safely in Neon cloud</p>
            </div>
            <div className="text-center p-4">
              <Users size={32} className="mx-auto text-green-500 mb-2" />
              <h3 className="font-semibold">Client Access</h3>
              <p className="text-sm text-gray-600">Clients can view and download their photos</p>
            </div>
            <div className="text-center p-4">
              <HardDrive size={32} className="mx-auto text-purple-500 mb-2" />
              <h3 className="font-semibold">Automatic Backup</h3>
              <p className="text-sm text-gray-600">Never lose your precious work</p>
            </div>
            <div className="text-center p-4">
              <CreditCard size={32} className="mx-auto text-orange-500 mb-2" />
              <h3 className="font-semibold">Pay per GB</h3>
              <p className="text-sm text-gray-600">Only pay for what you use</p>
            </div>
          </div>
        </div>

        {/* Coming Soon */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Coming Soon!</h3>
          <p className="text-blue-800">
            This subscription-based digital storage service is currently in development. 
            Your photography business will soon have access to secure, scalable cloud storage 
            with client gallery features, all powered by Neon database technology.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ProDigitalFilesPage;
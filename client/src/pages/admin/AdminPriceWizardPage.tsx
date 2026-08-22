import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Search, TrendingUp, DollarSign, Eye, CheckCircle, XCircle, RefreshCw, ExternalLink, Filter, X, Loader2, MapPin, Plus } from 'lucide-react';
import { useStudioCurrency } from '../../hooks/useStudioCurrency';

// Available services for price research
const AVAILABLE_SERVICES = [
  { id: 'family', label: 'Family Photography' },
  { id: 'wedding', label: 'Wedding Photography' },
  { id: 'newborn', label: 'Newborn Photography' },
  { id: 'portrait', label: 'Portrait Photography' },
  { id: 'corporate', label: 'Corporate / Business' },
  { id: 'event', label: 'Event Photography' },
];

interface PriceSession {
  id: string;
  location: string;
  services: string[];
  status: 'discovering' | 'scraping' | 'analyzing' | 'completed' | 'failed';
  competitors_found: number;
  prices_extracted: number;
  suggestions_generated: number;
  created_at: string;
  updated_at: string;
}

interface Competitor {
  id: string;
  competitor_name: string;
  website_url: string;
  location: string;
  status: 'pending' | 'scraped' | 'failed';
  price_count: number;
  scraped_at?: string;
  scrape_error?: string;
}

interface Price {
  id: string;
  competitor_name: string;
  service_type: string;
  price_amount: number;
  currency: string;
  confidence_score: number;
  package_name?: string;
  deliverables?: string;
  website_url: string;
}

interface Suggestion {
  id: string;
  service_type: string;
  tier: 'basic' | 'standard' | 'premium';
  suggested_price: number;
  market_min: number;
  market_median: number;
  market_max: number;
  reasoning: string;
  status: 'pending_review' | 'activated' | 'rejected';
  activated_product_id?: string;
}

const AdminPriceWizardPage: React.FC = () => {
  // Prices in the STUDIO'S currency, not a hardcoded euro sign.
  const { currency, format: formatPrice } = useStudioCurrency();
  const [sessions, setSessions] = useState<PriceSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [prices, setPrices] = useState<Price[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [myPrices, setMyPrices] = useState<{ name: string; category: string; price: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // New Research Modal State
  const [showNewResearchModal, setShowNewResearchModal] = useState(false);
  const [newResearchLocation, setNewResearchLocation] = useState('Wien');
  const [newResearchServices, setNewResearchServices] = useState<string[]>(['family', 'portrait']);
  const [isResearching, setIsResearching] = useState(false);
  const [researchProgress, setResearchProgress] = useState<string>('');

  // Manual Price Entry Modal State
  const [showManualPriceModal, setShowManualPriceModal] = useState(false);
  const [manualPriceCompetitor, setManualPriceCompetitor] = useState<Competitor | null>(null);
  const [manualPriceService, setManualPriceService] = useState('');
  const [manualPriceAmount, setManualPriceAmount] = useState('');
  const [manualPriceNotes, setManualPriceNotes] = useState('');
  const [isAddingPrice, setIsAddingPrice] = useState(false);

  // Activation Modal State (for adding marketing description)
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [activationSuggestion, setActivationSuggestion] = useState<Suggestion | null>(null);
  const [activationPrice, setActivationPrice] = useState('');
  const [activationDescription, setActivationDescription] = useState('');
  const [isActivating, setIsActivating] = useState(false);

  useEffect(() => {
    fetchSessions();
    // Load the studio's own price guide so suggestions can be compared to it.
    fetch('/api/crm/price-list', { credentials: 'include' })
      .then(r => (r.ok ? r.json() : []))
      .then((rows: any[]) => setMyPrices((rows || []).map(r => ({
        name: r.name || '', category: r.category || '', price: Number(r.price) || 0,
      }))))
      .catch(() => {});
  }, []);

  // Find the studio's own price closest to a competitor service (fuzzy by name/category).
  const myPriceFor = (serviceType: string): { name: string; price: number } | null => {
    const s = (serviceType || '').toLowerCase().replace(/_/g, ' ');
    const tokens = s.split(/\s+/).filter(Boolean);
    let best: { name: string; price: number } | null = null;
    for (const item of myPrices) {
      const hay = `${item.name} ${item.category}`.toLowerCase();
      if (tokens.some(t => t.length > 2 && hay.includes(t))) {
        if (!best || item.price < best.price) best = { name: item.name, price: item.price };
      }
    }
    return best;
  };

  useEffect(() => {
    if (selectedSession) {
      fetchSessionDetails(selectedSession);
    }
  }, [selectedSession]);

  // Auto-refresh for active sessions
  useEffect(() => {
    const selectedSessionData = sessions.find(s => s.id === selectedSession);
    if (selectedSessionData && ['discovering', 'scraping', 'analyzing'].includes(selectedSessionData.status)) {
      const interval = setInterval(() => {
        fetchSessions();
        if (selectedSession) {
          fetchSessionDetails(selectedSession);
        }
      }, 3000); // Refresh every 3 seconds
      return () => clearInterval(interval);
    }
  }, [selectedSession, sessions]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/price-wizard/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionDetails = async (sessionId: string) => {
    try {
      const [competitorsRes, pricesRes, suggestionsRes] = await Promise.all([
        fetch(`/api/price-wizard/competitors/${sessionId}`),
        fetch(`/api/price-wizard/prices/${sessionId}`),
        fetch(`/api/price-wizard/suggestions/${sessionId}`)
      ]);

      if (competitorsRes.ok) setCompetitors(await competitorsRes.json());
      if (pricesRes.ok) setPrices(await pricesRes.json());
      if (suggestionsRes.ok) setSuggestions(await suggestionsRes.json());
    } catch (err) {
      console.error('Failed to fetch session details:', err);
    }
  };

  /**
   * Start a new competitive pricing research session
   * This uses the new Tavily + OpenAI integration for REAL competitor research
   * Flow: /quick-start → background processing → poll /status for updates
   */
  const startNewResearch = async () => {
    if (newResearchServices.length === 0) {
      alert('Please select at least one service type');
      return;
    }

    setIsResearching(true);
    let sessionId: string | null = null;

    try {
      // Use the new quick-start endpoint that does everything in background
      setResearchProgress('Starting AI-powered competitor research...');
      const startRes = await fetch('/api/price-wizard/quick-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: newResearchLocation,
          services: newResearchServices.map(s => {
            // Map service IDs to full names for better search results
            const serviceMap: Record<string, string> = {
              'family': 'Family Portrait',
              'portrait': 'Portrait Photography',
              'newborn': 'Newborn Photography',
              'wedding': 'Wedding Photography',
              'corporate': 'Corporate Photography',
              'event': 'Event Photography',
            };
            return serviceMap[s] || s;
          })
        })
      });

      if (!startRes.ok) {
        const errorData = await startRes.json();
        throw new Error(errorData.error || 'Failed to start research');
      }
      
      const startData = await startRes.json();
      sessionId = startData.sessionId;
      console.log('✅ Research started:', sessionId);

      // Close modal and select the session - the auto-refresh will show progress
      setShowNewResearchModal(false);
      setNewResearchLocation('Wien');
      setNewResearchServices(['family', 'portrait']);
      await fetchSessions();
      setSelectedSession(sessionId);

      // No alert - the progress bar in the session details panel will show live progress

    } catch (error: any) {
      console.error('Research failed:', error);
      alert(`Research failed: ${error.message}`);
      
      // Refresh to show partial results if any
      if (sessionId) {
        await fetchSessions();
        setSelectedSession(sessionId);
      }
    } finally {
      setIsResearching(false);
      setResearchProgress('');
    }
  };

  const toggleService = (serviceId: string) => {
    setNewResearchServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(s => s !== serviceId)
        : [...prev, serviceId]
    );
  };

  /**
   * Open the manual price entry modal for a competitor
   */
  const openManualPriceModal = (competitor: Competitor) => {
    setManualPriceCompetitor(competitor);
    setManualPriceService('family');
    setManualPriceAmount('');
    setManualPriceNotes('');
    setShowManualPriceModal(true);
  };

  /**
   * Add a manual price entry for a competitor
   */
  const addManualPrice = async () => {
    if (!manualPriceCompetitor || !manualPriceService || !manualPriceAmount) {
      alert('Please fill in all required fields');
      return;
    }

    const amount = parseFloat(manualPriceAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid price amount');
      return;
    }

    setIsAddingPrice(true);
    try {
      const response = await fetch('/api/price-wizard/add-manual-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competitorId: manualPriceCompetitor.id,
          serviceType: manualPriceService,
          priceAmount: amount,
          currency,
          notes: manualPriceNotes || null
        })
      });

      if (response.ok) {
        alert('Price added successfully!');
        setShowManualPriceModal(false);
        if (selectedSession) {
          fetchSessionDetails(selectedSession);
        }
      } else {
        const data = await response.json();
        alert(`Failed to add price: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error adding manual price:', err);
      alert('Failed to add price');
    } finally {
      setIsAddingPrice(false);
    }
  };

  /**
   * Re-run research with AI (Tavily + OpenAI)
   * This will clear existing data and perform fresh competitor research
   */
  const retryWithAI = async (sessionId: string) => {
    if (!confirm('This will clear existing competitor data and run fresh AI research.\n\nThis uses Tavily for competitor search and OpenAI for price extraction.\n\nContinue?')) {
      return;
    }

    try {
      const response = await fetch('/api/price-wizard/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });

      if (response.ok) {
        alert('🚀 AI research started!\n\nThe page will auto-refresh to show progress.\nThis takes 1-2 minutes.');
        fetchSessionDetails(sessionId);
        fetchSessions();
      } else {
        const data = await response.json();
        alert(`Research failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error starting AI research:', err);
      alert('Failed to start AI research');
    }
  };

  /**
   * Re-read the existing competitors' websites and extract prices again.
   * Runs in the background; the page auto-refreshes as it progresses.
   */
  const retryScrape = async (sessionId: string) => {
    try {
      const response = await fetch('/api/price-wizard/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      const data = await response.json();
      if (response.ok) {
        alert('🔄 Re-reading competitor sites…\n\nThe page will refresh as prices come in (about 1–2 minutes).');
        fetchSessionDetails(sessionId);
        fetchSessions();
      } else {
        alert(`Could not start re-read: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error retrying scrape:', err);
      alert('Failed to re-read competitor sites');
    }
  };

  /**
   * Generate the 3-tier price suggestions from whatever prices have been
   * collected so far (scraped or entered manually).
   */
  const generateSuggestions = async (sessionId: string) => {
    try {
      const response = await fetch('/api/price-wizard/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      const data = await response.json();
      if (response.ok) {
        alert(data.suggestionsCount > 0
          ? `✅ Generated ${data.suggestionsCount} price suggestion${data.suggestionsCount === 1 ? '' : 's'}.`
          : (data.message || 'No prices to analyze yet. Add competitor prices with the + button, then try again.'));
        fetchSessionDetails(sessionId);
        fetchSessions();
      } else {
        alert(`Could not generate suggestions: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error generating suggestions:', err);
      alert('Failed to generate suggestions');
    }
  };

  /**
   * Manually add a competitor (for the manual path / when automated discovery
   * isn't available). Prices are then added with the + button.
   */
  const addCompetitor = async (sessionId: string) => {
    const name = window.prompt('Competitor name (e.g. their studio name):');
    if (!name || !name.trim()) return;
    const website = window.prompt('Competitor website URL (optional — used by AI Research / Retry Scrape):') || '';
    try {
      const response = await fetch('/api/price-wizard/add-competitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, name: name.trim(), website: website.trim() || null })
      });
      const data = await response.json();
      if (response.ok) {
        fetchSessionDetails(sessionId);
        fetchSessions();
      } else {
        alert(`Could not add competitor: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error adding competitor:', err);
      alert('Failed to add competitor');
    }
  };

  const activateSuggestion = async (suggestionId: string, adjustedPrice?: number, description?: string) => {
    try {
      setIsActivating(true);
      const response = await fetch('/api/price-wizard/activate-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestionId,
          adjustedPrice,
          description
        })
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Price activated and added to your Price List!\n\nService: ${data.service_name}\nPrice: ${formatPrice(data.activated_price)}\n\nYou can now use this price when creating invoices.`);
        if (selectedSession) fetchSessionDetails(selectedSession);
        setShowActivationModal(false);
        setActivationSuggestion(null);
        setActivationPrice('');
        setActivationDescription('');
      }
    } catch (err) {
      alert('Failed to activate price');
    } finally {
      setIsActivating(false);
    }
  };

  // Open activation modal with pre-filled data
  const openActivationModal = (suggestion: Suggestion, withAdjust?: boolean) => {
    setActivationSuggestion(suggestion);
    setActivationPrice(suggestion.suggested_price.toString());
    // Generate a simple marketing description based on tier
    const tierDescriptions: Record<string, string> = {
      basic: `Professional ${suggestion.service_type.replace(/_/g, ' ')} session - perfect for those seeking quality photography at an accessible price point.`,
      standard: `Our most popular ${suggestion.service_type.replace(/_/g, ' ')} package - ideal balance of quality, service, and value.`,
      premium: `Luxury ${suggestion.service_type.replace(/_/g, ' ')} experience - comprehensive service with premium features and dedicated attention.`
    };
    setActivationDescription(tierDescriptions[suggestion.tier] || `Professional ${suggestion.service_type.replace(/_/g, ' ')} service`);
    setShowActivationModal(true);
  };

  const rejectSuggestion = async (suggestionId: string) => {
    try {
      const response = await fetch('/api/price-wizard/reject-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionId })
      });

      if (response.ok) {
        if (selectedSession) fetchSessionDetails(selectedSession);
      }
    } catch (err) {
      alert('Failed to reject suggestion');
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string }> = {
      discovering: { bg: 'bg-blue-100', text: 'text-blue-800' },
      scraping: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      analyzing: { bg: 'bg-purple-100', text: 'text-purple-800' },
      completed: { bg: 'bg-green-100', text: 'text-green-800' },
      failed: { bg: 'bg-red-100', text: 'text-red-800' }
    };

    const c = config[status] || config.completed;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
        {status}
      </span>
    );
  };

  const getTierBadge = (tier: string) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      basic: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Budget-Friendly' },
      standard: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Mid-Range' },
      premium: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'High-End' }
    };

    const c = config[tier];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
        {c.label}
      </span>
    );
  };

  const filteredSessions = sessions.filter(s => 
    statusFilter === 'all' || s.status === statusFilter
  );

  const selectedSessionData = sessions.find(s => s.id === selectedSession);

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Price Wizard</h1>
            <p className="text-gray-600">See what other photographers in your area charge, and get suggested prices for your services</p>
          </div>
          <button
            onClick={() => setShowNewResearchModal(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg flex items-center gap-2 hover:bg-purple-700 transition-colors"
          >
            <TrendingUp className="w-4 h-4" />
            New Research
          </button>
        </div>

        {/* How it works explanation */}
        <div className="mb-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-purple-900 mb-1">How does this work?</h3>
          <p className="text-sm text-purple-800">
            The Price Wizard searches for photographers near you, collects their published prices, and then suggests
            what you could charge for each service. It shows you the <strong>lowest</strong>, <strong>middle (average)</strong>, and <strong>highest</strong> prices
            in your market so you can decide where to position yourself.
          </p>
        </div>

        {/* New Research Modal */}
        {showNewResearchModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-white">New Price Research</h2>
                  <button
                    onClick={() => setShowNewResearchModal(false)}
                    disabled={isResearching}
                    className="text-white hover:bg-white/20 rounded-full p-1 transition-colors disabled:opacity-50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-purple-100 text-sm mt-1">
                  Discover competitors and analyze market prices
                </p>
              </div>

              <div className="p-6 space-y-5">
                {/* Location Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Location / City
                  </label>
                  <input
                    type="text"
                    value={newResearchLocation}
                    onChange={(e) => setNewResearchLocation(e.target.value)}
                    disabled={isResearching}
                    placeholder="e.g., Wien, Graz, Salzburg"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:bg-gray-100"
                  />
                </div>

                {/* Services Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Services to Research
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {AVAILABLE_SERVICES.map(service => (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => toggleService(service.id)}
                        disabled={isResearching}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          newResearchServices.includes(service.id)
                            ? 'bg-purple-100 text-purple-700 border-2 border-purple-400'
                            : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                        } disabled:opacity-50`}
                      >
                        {service.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Progress Indicator */}
                {isResearching && researchProgress && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                      <span className="text-sm text-blue-700">{researchProgress}</span>
                    </div>
                  </div>
                )}

                {/* Info Note */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600">
                  <strong>How it works:</strong> The wizard will search for photographers in your area, 
                  scrape their pricing pages, and generate 3-tier pricing recommendations (basic, standard, premium) 
                  based on market analysis.
                </div>
              </div>

              {/* Footer Actions */}
              <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                <button
                  onClick={() => setShowNewResearchModal(false)}
                  disabled={isResearching}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={startNewResearch}
                  disabled={isResearching || newResearchServices.length === 0 || !newResearchLocation.trim()}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isResearching ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Researching...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Start Research
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manual Price Entry Modal */}
        {showManualPriceModal && manualPriceCompetitor && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-white">Add Price Manually</h2>
                  <button
                    onClick={() => setShowManualPriceModal(false)}
                    disabled={isAddingPrice}
                    className="text-white hover:bg-white/20 rounded-full p-1 transition-colors disabled:opacity-50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-green-100 text-sm mt-1">
                  {manualPriceCompetitor.competitor_name}
                </p>
              </div>

              <div className="p-6 space-y-5">
                {/* Service Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Type
                  </label>
                  <select
                    value={manualPriceService}
                    onChange={(e) => setManualPriceService(e.target.value)}
                    disabled={isAddingPrice}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all disabled:bg-gray-100"
                  >
                    {AVAILABLE_SERVICES.map(service => (
                      <option key={service.id} value={service.id}>{service.label}</option>
                    ))}
                  </select>
                </div>

                {/* Price Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price ({currency})
                  </label>
                  <input
                    type="number"
                    value={manualPriceAmount}
                    onChange={(e) => setManualPriceAmount(e.target.value)}
                    disabled={isAddingPrice}
                    placeholder="e.g., 350"
                    min="0"
                    step="10"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all disabled:bg-gray-100"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (optional)
                  </label>
                  <textarea
                    value={manualPriceNotes}
                    onChange={(e) => setManualPriceNotes(e.target.value)}
                    disabled={isAddingPrice}
                    placeholder="e.g., Includes 10 edited photos, 1 hour session"
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all disabled:bg-gray-100 resize-none"
                  />
                </div>

                {/* Info Note */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-gray-600">
                  <strong>Tip:</strong> Visit the competitor's website to find their pricing. 
                  Look for "Preise", "Pakete", or "Investment" pages.
                </div>
              </div>

              {/* Footer Actions */}
              <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                <button
                  onClick={() => setShowManualPriceModal(false)}
                  disabled={isAddingPrice}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={addManualPrice}
                  disabled={isAddingPrice || !manualPriceAmount}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isAddingPrice ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Add Price
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sessions List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Research Sessions</h2>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="all">All Sessions</option>
                  <option value="completed">Completed</option>
                  <option value="analyzing">Analyzing</option>
                  <option value="scraping">Scraping</option>
                  <option value="discovering">Discovering</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-center text-gray-500">Loading...</div>
                ) : filteredSessions.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No sessions found</div>
                ) : (
                  filteredSessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => setSelectedSession(session.id)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 ${
                        selectedSession === session.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium text-gray-900">{session.location}</div>
                        {getStatusBadge(session.status)}
                      </div>
                      <div className="text-sm text-gray-600 mb-1">
                        {session.services.join(', ')}
                      </div>
                      <div className="flex gap-3 text-xs text-gray-500">
                        <span>{session.competitors_found} competitors</span>
                        <span>{session.prices_extracted} prices</span>
                        <span>{session.suggestions_generated} suggestions</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(session.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Session Details */}
          <div className="lg:col-span-2">
            {!selectedSession ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Select a research session to view details</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Session Summary */}
                {selectedSessionData && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{selectedSessionData.location}</h3>
                        <p className="text-sm text-gray-600">{selectedSessionData.services.join(', ')}</p>
                      </div>
                      {getStatusBadge(selectedSessionData.status)}
                    </div>

                    {/* Progress Indicator for active sessions */}
                    {['discovering', 'scraping', 'analyzing'].includes(selectedSessionData.status) && (
                      <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                          <span className="font-medium text-blue-800">
                            {selectedSessionData.status === 'discovering' && 'Searching for competitor photographers...'}
                            {selectedSessionData.status === 'scraping' && `Extracting prices from ${selectedSessionData.competitors_found} competitor websites...`}
                            {selectedSessionData.status === 'analyzing' && 'Analyzing market data and generating price recommendations...'}
                          </span>
                        </div>
                        {/* Step indicators */}
                        <div className="flex gap-1 mb-2">
                          {[
                            { key: 'discovering', label: 'Discover' },
                            { key: 'scraping', label: 'Extract Prices' },
                            { key: 'analyzing', label: 'Analyze' },
                            { key: 'completed', label: 'Done' },
                          ].map((step, idx) => {
                            const stages = ['discovering', 'scraping', 'analyzing', 'completed'];
                            const currentIdx = stages.indexOf(selectedSessionData.status);
                            const stepIdx = stages.indexOf(step.key);
                            const isActive = stepIdx === currentIdx;
                            const isDone = stepIdx < currentIdx;
                            return (
                              <div key={step.key} className="flex-1">
                                <div className={`h-2 rounded-full transition-all duration-500 ${
                                  isDone ? 'bg-blue-600' :
                                  isActive ? 'bg-blue-400 animate-pulse' :
                                  'bg-gray-300'
                                }`} />
                                <div className={`text-xs mt-1 text-center ${
                                  isActive ? 'text-blue-700 font-semibold' :
                                  isDone ? 'text-blue-600' :
                                  'text-gray-400'
                                }`}>{step.label}</div>
                              </div>
                            );
                          })}
                        </div>
                        {/* Live counters */}
                        <div className="flex gap-4 mt-3 text-xs text-blue-700">
                          <span>🔍 {selectedSessionData.competitors_found} competitors found</span>
                          <span>💰 {selectedSessionData.prices_extracted} prices extracted</span>
                          <span>📊 {selectedSessionData.suggestions_generated} suggestions</span>
                        </div>
                        {selectedSessionData.status === 'scraping' && (
                          <p className="text-xs text-blue-600 mt-2">
                            Some competitor websites may be slow to respond. You can add prices manually later using the + button.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Failed session banner */}
                    {selectedSessionData.status === 'failed' && (
                      <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <XCircle className="w-5 h-5 text-red-600" />
                          <div>
                            <span className="font-medium text-red-800">Research failed</span>
                            <p className="text-xs text-red-600 mt-1">
                              The automated research could not complete. You can retry with the "AI Research" button, 
                              or add competitor prices manually.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{selectedSessionData.competitors_found}</div>
                        <div className="text-xs text-gray-600">Photographers Found</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{selectedSessionData.prices_extracted}</div>
                        <div className="text-xs text-gray-600">Prices Collected</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">{selectedSessionData.suggestions_generated}</div>
                        <div className="text-xs text-gray-600">Price Suggestions</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Price Suggestions */}
                {suggestions.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-900">Suggested Prices for Your Services</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Based on what {competitors.length || 'local'} competitor{competitors.length !== 1 ? 's' : ''} charge, here are our recommended prices for each service and price level.
                        You can <strong>accept</strong> a suggestion to add it to your invoice price list, <strong>adjust</strong> it first, or <strong>reject</strong> it.
                      </p>
                    </div>

                    {/* At-a-glance: your price vs the market, per service */}
                    {(() => {
                      const byService = new Map<string, { min: number; median: number; max: number }>();
                      for (const s of suggestions) {
                        if (!byService.has(s.service_type)) {
                          byService.set(s.service_type, { min: Number(s.market_min) || 0, median: Number(s.market_median) || 0, max: Number(s.market_max) || 0 });
                        }
                      }
                      if (byService.size === 0) return null;
                      return (
                        <div className="px-4 py-4 border-b border-gray-200 bg-gray-50/60 overflow-x-auto">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">Your prices vs the market</h4>
                          <table className="w-full text-sm min-w-[600px]">
                            <thead>
                              <tr className="text-[11px] text-gray-500 uppercase tracking-wide text-left">
                                <th className="py-1 pr-4 font-medium">Service</th>
                                <th className="py-1 px-2 font-medium text-right">Your price</th>
                                <th className="py-1 px-2 font-medium text-right">Market low</th>
                                <th className="py-1 px-2 font-medium text-right">Median</th>
                                <th className="py-1 px-2 font-medium text-right">Market high</th>
                                <th className="py-1 pl-4 font-medium">Where you sit</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {[...byService.entries()].map(([svc, st]) => {
                                const mine = myPriceFor(svc);
                                const pos = mine && st.max > st.min ? Math.max(0, Math.min(100, ((mine.price - st.min) / (st.max - st.min)) * 100)) : null;
                                return (
                                  <tr key={svc}>
                                    <td className="py-2 pr-4 font-medium text-gray-900 capitalize">{svc.replace(/_/g, ' ')}</td>
                                    <td className="py-2 px-2 text-right font-semibold text-indigo-700">{mine ? formatPrice(mine.price) : '—'}</td>
                                    <td className="py-2 px-2 text-right text-gray-600">{formatPrice(st.min)}</td>
                                    <td className="py-2 px-2 text-right text-gray-900 font-medium">{formatPrice(st.median)}</td>
                                    <td className="py-2 px-2 text-right text-gray-600">{formatPrice(st.max)}</td>
                                    <td className="py-2 pl-4">
                                      {pos === null ? (
                                        <span className="text-gray-400 text-xs">set your price</span>
                                      ) : (
                                        <div className="relative h-2 rounded w-32 bg-gradient-to-r from-green-300 via-yellow-300 to-red-300" title={`Your ${formatPrice(mine!.price)} vs ${formatPrice(st.min)}–${formatPrice(st.max)}`}>
                                          <div className="absolute -top-1 w-1.5 h-4 bg-indigo-700 rounded" style={{ left: `calc(${pos}% - 3px)` }} />
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          <p className="text-[11px] text-gray-400 mt-2">Market low / median / high are drawn from the {competitors.length || 'local'} competitors analysed for each service.</p>
                        </div>
                      );
                    })()}

                    <div className="divide-y divide-gray-200">
                      {suggestions.map((suggestion) => {
                        // Parse reasoning into structured parts
                        const parseReasoning = (reasoning: string) => {
                          const parts = {
                            positioning: '',
                            whatsIncluded: '',
                            competitiveAdvantage: '',
                            marketInsight: ''
                          };

                          // Extract sections from the reasoning
                          const posMatch = reasoning.match(/^(.*?)(?:What's included:|Competitive advantage:|Market insight:|$)/is);
                          const incMatch = reasoning.match(/What's included:\s*(.*?)(?:Competitive advantage:|Market insight:|$)/is);
                          const advMatch = reasoning.match(/Competitive advantage:\s*(.*?)(?:Market insight:|$)/is);
                          const insMatch = reasoning.match(/Market insight:\s*(.*?)$/is);

                          if (posMatch) parts.positioning = posMatch[1].trim();
                          if (incMatch) parts.whatsIncluded = incMatch[1].trim();
                          if (advMatch) parts.competitiveAdvantage = advMatch[1].trim();
                          if (insMatch) parts.marketInsight = insMatch[1].trim();

                          // If no structured format, just use the whole thing as positioning
                          if (!parts.positioning && !parts.whatsIncluded && !parts.competitiveAdvantage && !parts.marketInsight) {
                            parts.positioning = reasoning;
                          }

                          return parts;
                        };
                        
                        const reasoningParts = parseReasoning(suggestion.reasoning || '');
                        const percentilePosition = suggestion.market_median > 0 
                          ? Math.round(((suggestion.suggested_price - suggestion.market_min) / (suggestion.market_max - suggestion.market_min)) * 100)
                          : 50;
                        
                        return (
                          <div key={suggestion.id} className="p-5">
                            {/* Header with service type, tier, and price */}
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center gap-3">
                                <span className="text-lg font-semibold text-gray-900 capitalize">
                                  {suggestion.service_type.replace(/_/g, ' ')}
                                </span>
                                {getTierBadge(suggestion.tier)}
                              </div>
                              <div className="text-right">
                                <div className="text-3xl font-bold text-purple-600">
                                  {formatPrice(Number(suggestion.suggested_price))}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  Suggested price
                                </div>
                              </div>
                            </div>

                            {/* Market Position Bar — Where your suggested price sits */}
                            <div className="mb-4 bg-gray-50 rounded-lg p-4">
                              <div className="text-xs font-semibold text-gray-700 mb-3">
                                Where this price sits compared to competitors in your area:
                              </div>
                              <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>Cheapest: {formatPrice(suggestion.market_min)}</span>
                                <span className="font-medium text-gray-700">Average: {formatPrice(suggestion.market_median)}</span>
                                <span>Most Expensive: {formatPrice(suggestion.market_max)}</span>
                              </div>
                              <div className="relative h-3 bg-gray-200 rounded-full">
                                <div 
                                  className="absolute h-3 bg-gradient-to-r from-green-400 via-yellow-400 to-red-400 rounded-full"
                                  style={{ width: '100%' }}
                                />
                                <div 
                                  className="absolute w-4 h-4 bg-purple-600 rounded-full border-2 border-white shadow-md transform -translate-y-0.5"
                                  style={{ left: `${Math.min(Math.max(percentilePosition, 0), 100)}%`, marginLeft: '-8px' }}
                                  title={`Suggested price: ${formatPrice(suggestion.suggested_price)}`}
                                />
                              </div>
                              <div className="flex justify-between text-xs mt-1">
                                <span className="text-green-700">Lower prices</span>
                                <span className="text-red-700">Higher prices</span>
                              </div>
                              <div className="mt-3 bg-purple-50 border border-purple-200 rounded-md px-3 py-2">
                                <p className="text-sm text-purple-900">
                                  {percentilePosition <= 25 ? (
                                    <>
                                      <strong>Below average</strong> — This price is lower than what most competitors charge.
                                      You would be one of the more affordable options in your area.
                                    </>
                                  ) : percentilePosition <= 50 ? (
                                    <>
                                      <strong>Around average</strong> — This price is close to what most competitors charge.
                                      A solid middle-ground that balances value and earnings.
                                    </>
                                  ) : percentilePosition <= 75 ? (
                                    <>
                                      <strong>Above average</strong> — This price is higher than what most competitors charge.
                                      Your price is higher than {percentilePosition}% of competitors — good if your work quality and experience justify it.
                                    </>
                                  ) : (
                                    <>
                                      <strong>Premium range</strong> — This price is among the highest in your area.
                                      Your price is higher than {percentilePosition}% of competitors — suited for photographers with a strong reputation and portfolio.
                                    </>
                                  )}
                                </p>
                              </div>
                            </div>

                            {/* What this recommendation means */}
                            <div className="space-y-3 text-sm">
                              {reasoningParts.positioning && (
                                <div className="flex gap-2">
                                  <div className="flex-shrink-0 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                                    <span className="text-blue-600 text-xs">📍</span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-700">Why this price: </span>
                                    <span className="text-gray-600">{reasoningParts.positioning}</span>
                                  </div>
                                </div>
                              )}

                              {reasoningParts.whatsIncluded && (
                                <div className="flex gap-2">
                                  <div className="flex-shrink-0 w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center mt-0.5">
                                    <span className="text-amber-600 text-xs">📦</span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-700">What competitors include at this price: </span>
                                    <span className="text-gray-600">{reasoningParts.whatsIncluded}</span>
                                  </div>
                                </div>
                              )}

                              {reasoningParts.competitiveAdvantage && (
                                <div className="flex gap-2">
                                  <div className="flex-shrink-0 w-5 h-5 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                                    <span className="text-green-600 text-xs">✨</span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-700">Your advantage: </span>
                                    <span className="text-gray-600">{reasoningParts.competitiveAdvantage}</span>
                                  </div>
                                </div>
                              )}
                              
                              {reasoningParts.marketInsight && (
                                <div className="flex gap-2">
                                  <div className="flex-shrink-0 w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center mt-0.5">
                                    <span className="text-purple-600 text-xs">📊</span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-700">Market trend: </span>
                                    <span className="text-gray-600">{reasoningParts.marketInsight}</span>
                                  </div>
                                </div>
                              )}

                              {(() => {
                                const mine = myPriceFor(suggestion.service_type);
                                if (!mine) return null;
                                const diff = Number(suggestion.suggested_price) - mine.price;
                                return (
                                  <>
                                  <div className="flex gap-2 bg-indigo-50 rounded-lg p-2 -mx-1">
                                    <div className="flex-shrink-0 w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center mt-0.5">
                                      <span className="text-indigo-600 text-xs">🏷️</span>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-700">Your price ({mine.name}): </span>
                                      <span className="text-gray-800 font-semibold">{formatPrice(mine.price)}</span>
                                      <span className="text-gray-600"> — {diff > 0
                                        ? `${formatPrice(diff)} below this suggestion (room to raise)`
                                        : diff < 0
                                          ? `${formatPrice(Math.abs(diff))} above this suggestion`
                                          : 'in line with this suggestion'}</span>
                                    </div>
                                  </div>
                                  {diff > 0 && (
                                    <div className="flex gap-2">
                                      <div className="flex-shrink-0 w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center mt-0.5">
                                        <span className="text-orange-600 text-xs">⚖️</span>
                                      </div>
                                      <div className="text-gray-600">
                                        <span className="font-medium text-gray-700">Adjust to match: </span>
                                        To command {formatPrice(Number(suggestion.suggested_price))}, match the inclusions competitors offer at this price{reasoningParts.whatsIncluded ? ` (${reasoningParts.whatsIncluded})` : ''} — or keep {formatPrice(mine.price)} positioned as a lighter "mini" package.
                                      </div>
                                    </div>
                                  )}
                                  </>
                                );
                              })()}
                            </div>

                            {/* Sources / Provenance */}
                            {(() => {
                              const serviceKey = suggestion.service_type.toLowerCase();
                              const relevantPrices = prices.filter(p => {
                                const pService = (p.service_type || '').toLowerCase();
                                return pService === serviceKey || pService.includes(serviceKey) || serviceKey.includes(pService);
                              });
                              // Deduplicate by competitor
                              const sourceMap = new Map<string, { name: string; url: string; includes: string; prices: { amount: number; currency: string; confidence: number }[] }>();
                              for (const p of relevantPrices) {
                                const key = p.competitor_name || p.website_url;
                                if (!sourceMap.has(key)) {
                                  sourceMap.set(key, { name: p.competitor_name, url: p.website_url, includes: '', prices: [] });
                                }
                                const entry = sourceMap.get(key)!;
                                entry.prices.push({ amount: Number(p.price_amount), currency: p.currency || 'EUR', confidence: Number(p.confidence_score) || 0 });
                                // Keep the richest "what's included" text seen for this competitor.
                                const inc = [p.package_name, p.deliverables].filter(Boolean).join(' — ');
                                if (inc.length > entry.includes.length) entry.includes = inc;
                              }
                              const sources = Array.from(sourceMap.values());
                              if (sources.length === 0) return null;
                              return (
                                <div className="mt-4 pt-3 border-t border-gray-100">
                                  <div className="flex items-center gap-1 mb-2">
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sources ({sources.length} competitors)</span>
                                  </div>
                                  <div className="space-y-1.5">
                                    {sources.map((src, idx) => (
                                      <div key={idx} className="flex items-start justify-between text-xs bg-gray-50 rounded px-3 py-1.5">
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-2 min-w-0">
                                          <span className="text-gray-400 font-mono">{idx + 1}.</span>
                                          {src.url ? (
                                            <a
                                              href={src.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-blue-600 hover:text-blue-800 hover:underline truncate"
                                              title={src.url}
                                            >
                                              {src.name || new URL(src.url).hostname}
                                            </a>
                                          ) : (
                                            <span className="text-gray-700 truncate">{src.name}</span>
                                          )}
                                          </div>
                                          {src.includes && (
                                            <div className="text-gray-500 mt-0.5 ml-5 truncate max-w-[320px]" title={src.includes}>{src.includes}</div>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                          {src.prices.map((sp, spIdx) => (
                                            <span key={spIdx} className="font-medium text-gray-700">
                                              {formatPrice(sp.amount)}
                                            </span>
                                          ))}
                                          {src.prices[0]?.confidence > 0 && (
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                              src.prices[0].confidence >= 0.7 ? 'bg-green-100 text-green-700' :
                                              src.prices[0].confidence >= 0.4 ? 'bg-yellow-100 text-yellow-700' :
                                              'bg-red-100 text-red-700'
                                            }`}>
                                              {Math.round(src.prices[0].confidence * 100)}%
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Action Buttons */}
                            {suggestion.status === 'pending_review' && (
                              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                                <button
                                  onClick={() => openActivationModal(suggestion)}
                                  className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  Accept & Add to Price List
                                </button>
                                <button
                                  onClick={() => openActivationModal(suggestion, true)}
                                  className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
                                >
                                  Adjust Price First
                                </button>
                                <button
                                  onClick={() => rejectSuggestion(suggestion.id)}
                                  className="px-3 py-2.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-red-100 hover:text-red-600 flex items-center gap-2 text-sm transition-colors"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </div>
                            )}

                            {suggestion.status === 'activated' && (
                              <div className="flex items-center gap-2 text-sm text-green-600 mt-4 pt-4 border-t border-gray-100 bg-green-50 -mx-5 -mb-5 px-5 py-3 rounded-b-lg">
                                <CheckCircle className="w-4 h-4" />
                                <span className="font-medium">Added to your price list</span>
                              </div>
                            )}

                            {suggestion.status === 'rejected' && (
                              <div className="text-sm text-red-600 mt-4 pt-4 border-t border-gray-100 bg-red-50 -mx-5 -mb-5 px-5 py-3 rounded-b-lg font-medium">
                                Rejected
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Competitors */}
                {selectedSessionData && competitors.length === 0 && !['discovering', 'scraping', 'analyzing'].includes(selectedSessionData.status) && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
                    <p className="text-sm text-gray-600 mb-3">
                      No competitors yet. Use <b>AI Research</b> to find them automatically (needs a Tavily key), or add them by hand and enter their prices, then generate suggestions.
                    </p>
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => addCompetitor(selectedSession!)}
                        className="text-xs px-3 py-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add Competitor
                      </button>
                      <button
                        onClick={() => generateSuggestions(selectedSession!)}
                        className="text-xs px-3 py-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 flex items-center gap-1"
                      >
                        <DollarSign className="w-3 h-3" /> Generate Suggestions
                      </button>
                    </div>
                  </div>
                )}

                {competitors.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                      <h3 className="font-semibold text-gray-900">Competitor Photographers</h3>
                      <div className="flex gap-2 items-center flex-wrap justify-end">
                        {competitors.filter(c => c.status === 'pending').length > 0 && (
                          <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                            {competitors.filter(c => c.status === 'pending').length} pending
                          </span>
                        )}
                        {competitors.filter(c => c.status === 'failed').length > 0 && (
                          <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                            {competitors.filter(c => c.status === 'failed').length} failed - add prices manually
                          </span>
                        )}
                        <button
                          onClick={() => retryWithAI(selectedSession!)}
                          className="text-xs px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 flex items-center gap-1"
                          title="Re-run with Tavily + OpenAI"
                        >
                          <TrendingUp className="w-3 h-3" />
                          AI Research
                        </button>
                        <button
                          onClick={() => retryScrape(selectedSession!)}
                          className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center gap-1"
                          title="Re-read the competitor websites and extract prices again"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Retry Scrape
                        </button>
                        <button
                          onClick={() => addCompetitor(selectedSession!)}
                          className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-1"
                          title="Add a competitor by hand"
                        >
                          <Plus className="w-3 h-3" />
                          Add Competitor
                        </button>
                        <button
                          onClick={() => generateSuggestions(selectedSession!)}
                          className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 flex items-center gap-1"
                          title="Build 3-tier price suggestions from the prices collected so far"
                        >
                          <DollarSign className="w-3 h-3" />
                          Generate Suggestions
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              const r = await fetch('/api/price-wizard/diagnostics', { credentials: 'include' });
                              const d = await r.json();
                              alert(
                                `Price Wizard diagnostics\n\n` +
                                `OpenAI (price extraction): ${d.openai?.ok ? 'OK ✅ (' + d.openai.model + ')' : 'FAILED ❌ — ' + (d.openai?.reason || 'unknown')}\n` +
                                `AxixOS (discovery/crawl): ${d.axixos?.ok ? 'OK ✅ (' + (d.axixos.searchResults ?? 0) + ' search results)' : 'FAILED ❌ — ' + (d.axixos?.reason || 'status ' + d.axixos?.searchStatus)}\n\n` +
                                `${d.summary || ''}`
                              );
                            } catch (e: any) {
                              alert('Diagnostics failed: ' + (e?.message || 'unknown'));
                            }
                          }}
                          className="text-xs px-3 py-1 bg-amber-100 text-amber-700 rounded hover:bg-amber-200 flex items-center gap-1"
                          title="Test whether OpenAI and AxixOS are working"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Diagnostics
                        </button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prices</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {competitors.map((comp) => (
                            <tr key={comp.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">{comp.competitor_name}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{comp.location}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  comp.status === 'scraped' ? 'bg-green-100 text-green-800' :
                                  comp.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {comp.status}
                                </span>
                                {comp.status === 'failed' && comp.scrape_error && (
                                  <div className="mt-1 text-[11px] text-red-500 max-w-[240px]" title={comp.scrape_error}>
                                    {comp.scrape_error}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">{comp.price_count}</td>
                              <td className="px-4 py-3 flex items-center gap-2">
                                <a
                                  href={comp.website_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-purple-600 hover:text-purple-700"
                                  title="Visit website"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                                <button
                                  onClick={() => openManualPriceModal(comp)}
                                  className="text-green-600 hover:text-green-700"
                                  title="Add price manually"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Extracted Prices */}
                {prices.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-900">Collected Prices ({prices.length})</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Competitor</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Package</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Accuracy</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {prices.slice(0, 20).map((price) => (
                            <tr key={price.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {price.website_url ? (
                                  <a
                                    href={price.website_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-purple-600 hover:text-purple-700 hover:underline"
                                    title={`View source: ${price.website_url}`}
                                  >
                                    {price.competitor_name}
                                  </a>
                                ) : (
                                  price.competitor_name
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 capitalize">{price.service_type}</td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                {price.currency} {price.price_amount}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">{price.package_name || '—'}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-16 bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-green-600 h-2 rounded-full"
                                      style={{ width: `${price.confidence_score * 100}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-gray-600">
                                    {Math.round(price.confidence_score * 100)}%
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {price.website_url ? (
                                  <a
                                    href={price.website_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-purple-600 hover:text-purple-700 flex items-center gap-1 text-xs"
                                    title={price.website_url}
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    Verify
                                  </a>
                                ) : (
                                  <span className="text-gray-400 text-xs">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {prices.length > 20 && (
                      <div className="p-4 text-center text-sm text-gray-500">
                        Showing 20 of {prices.length} prices
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Activation Modal - Add Marketing Description */}
      {showActivationModal && activationSuggestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
            <div className="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-4 rounded-t-xl">
              <h2 className="text-xl font-bold text-white">Activate Price</h2>
              <p className="text-green-100 text-sm mt-1">
                Add this suggested price to your price list so you can use it in invoices
              </p>
            </div>

            <div className="p-6 space-y-5">
              {/* Service Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-gray-900 capitalize">
                      {activationSuggestion.service_type.replace(/_/g, ' ')}
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      activationSuggestion.tier === 'basic' ? 'bg-gray-200 text-gray-700' :
                      activationSuggestion.tier === 'standard' ? 'bg-blue-100 text-blue-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {activationSuggestion.tier === 'basic' ? 'Budget-Friendly' : 
                       activationSuggestion.tier === 'standard' ? 'Mid-Range' : 'High-End'}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Recommended</p>
                    <p className="text-xl font-bold text-green-600">{formatPrice(Number(activationSuggestion.suggested_price))}</p>
                  </div>
                </div>
              </div>

              {/* Price Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Final Price ({currency})
                </label>
                <input
                  type="number"
                  value={activationPrice}
                  onChange={(e) => setActivationPrice(e.target.value)}
                  disabled={isActivating}
                  min="0"
                  step="10"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all disabled:bg-gray-100"
                />
              </div>

              {/* Marketing Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client-Facing Description
                </label>
                <textarea
                  value={activationDescription}
                  onChange={(e) => setActivationDescription(e.target.value)}
                  disabled={isActivating}
                  rows={3}
                  placeholder="Enter a short marketing description for your clients..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all disabled:bg-gray-100 resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This description will be shown to clients in invoices. The market research data stays private.
                </p>
              </div>

              {/* Info Note */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                <strong>Note:</strong> The competitive analysis and market insights will remain private in the Price Wizard. Only the description above will be visible to clients.
              </div>
            </div>

            {/* Footer Actions */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 rounded-b-xl">
              <button
                onClick={() => {
                  setShowActivationModal(false);
                  setActivationSuggestion(null);
                }}
                disabled={isActivating}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const price = parseFloat(activationPrice);
                  if (isNaN(price) || price <= 0) {
                    alert('Please enter a valid price');
                    return;
                  }
                  activateSuggestion(activationSuggestion.id, price, activationDescription);
                }}
                disabled={isActivating || !activationPrice || !activationDescription.trim()}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isActivating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Activating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Activate & Add to Price List
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminPriceWizardPage;

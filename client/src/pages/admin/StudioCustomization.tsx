import React, { useState, useEffect, useRef } from 'react';
import Layout from '../../components/layout/Layout';
import TemplateSelector from '../../components/admin/TemplateSelector';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Palette, 
  Settings, 
  Globe, 
  Camera, 
  Phone, 
  Mail, 
  MapPin,
  Save,
  Eye,
  RefreshCw
} from 'lucide-react';
import { SITE } from '../../config/site';

interface StudioConfig {
  id?: string;
  studioName: string;
  ownerEmail: string;
  activeTemplate: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  businessName: string;
  address: string;
  city: string;
  phone: string;
  email: string;
}

const StudioCustomization: React.FC = () => {
  const [config, setConfig] = useState<StudioConfig>({
    studioName: SITE.name,
    ownerEmail: SITE.email,
    activeTemplate: 'template-01-modern-minimal',
    primaryColor: '#7C3AED',
    secondaryColor: '#F59E0B',
    businessName: SITE.name,
    address: 'Schönbrunner Str. 25',
    city: 'Wien',
    phone: SITE.phone,
    email: SITE.email
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [activeTab, setActiveTab] = useState('template');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // SEO Meta Tags
    document.title = 'Studio Customization - Template & Design Management';

    // Update meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', 'Customize your photography studio website with professional templates, branding, and business settings.');

    return () => {
      document.title = `${SITE.name} - Familienfotograf Wien`;
    };
  }, []);

  // Load the studio's saved branding on mount (falls back to defaults on error).
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/studio/branding');
        if (res.ok) {
          const data = await res.json();
          setConfig(prev => ({
            ...prev,
            studioName: data.studioName || prev.studioName,
            ownerEmail: data.ownerEmail || prev.ownerEmail,
            businessName: data.businessName || prev.businessName,
            address: data.address || prev.address,
            city: data.city || prev.city,
            phone: data.phone || prev.phone,
            email: data.email || prev.email,
            logoUrl: data.logoUrl || prev.logoUrl,
            primaryColor: data.primaryColor || prev.primaryColor,
            secondaryColor: data.secondaryColor || prev.secondaryColor,
            activeTemplate: data.activeTemplate || prev.activeTemplate,
          }));
        }
      } catch {
        // Keep defaults; the form still works offline.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persistBranding = async (payload: Partial<StudioConfig>) => {
    const res = await fetch('/api/studio/branding', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Save failed (HTTP ${res.status})`);
    }
    return res.json();
  };

  const handleTemplateSelect = async (templateId: string) => {
    // Selecting a template updates the active choice; it is persisted on Save.
    setConfig(prev => ({ ...prev, activeTemplate: templateId }));
    setStatusMsg({ type: 'success', text: 'Template selected — click "Save Configuration" to apply.' });
  };

  const handlePreview = (templateId: string) => {
    // Open preview in new window
    const previewUrl = `/preview/${templateId}`;
    window.open(previewUrl, '_blank', 'width=1200,height=800');
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    setStatusMsg(null);
    try {
      await persistBranding(config);
      setStatusMsg({ type: 'success', text: 'Saved. Your logo and business details are now live on the website and invoices.' });
    } catch (error: any) {
      setStatusMsg({ type: 'error', text: error?.message || 'Could not save. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    setStatusMsg(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload/image', { method: 'POST', body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Upload failed (HTTP ${res.status})`);
      }
      const data = await res.json();
      const url = data.url || data.imageUrl;
      if (!url) throw new Error('Upload succeeded but no URL was returned.');
      setConfig(prev => ({ ...prev, logoUrl: url }));
      // Persist the logo immediately so it appears on the site without a
      // separate Save click (this is the action the user just took).
      await persistBranding({ logoUrl: url });
      setStatusMsg({ type: 'success', text: 'Logo uploaded and applied to your website header and invoices.' });
    } catch (error: any) {
      setStatusMsg({ type: 'error', text: error?.message || 'Logo upload failed.' });
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleInputChange = (field: keyof StudioConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Studio Customization
            </h1>
            <p className="text-gray-600">
              Customize your photography studio website template, branding, and business information.
            </p>
          </div>

          {/* Current Template Status */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5 text-purple-600" />
                    Current Template
                  </CardTitle>
                  <CardDescription>
                    Your active website design
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open('/', '_blank', 'noopener')}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview Live Site
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.reload()}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg flex items-center justify-center">
                  <Camera className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Modern Minimal</h3>
                  <p className="text-gray-600">Clean, minimalist design focusing on your photography</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary">Active</Badge>
                    <Badge variant="outline">Free Template</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: config.primaryColor }}></div>
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: config.secondaryColor }}></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Tabs */}
          <div className="w-full">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('template')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'template'
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Palette className="h-4 w-4 inline mr-2" />
                  Templates
                </button>
                <button
                  onClick={() => setActiveTab('branding')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'branding'
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Settings className="h-4 w-4 inline mr-2" />
                  Branding
                </button>
                <button
                  onClick={() => setActiveTab('business')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'business'
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Globe className="h-4 w-4 inline mr-2" />
                  Business Info
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'settings'
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Settings className="h-4 w-4 inline mr-2" />
                  Settings
                </button>
              </nav>
            </div>

            {/* Template Selection */}
            {activeTab === 'template' && (
              <div className="mt-6">
                <TemplateSelector
                  currentTemplate={config.activeTemplate}
                  onTemplateSelect={handleTemplateSelect}
                  onPreview={handlePreview}
                />
              </div>
            )}

            {/* Branding Settings */}
            {activeTab === 'branding' && (
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Brand Colors</CardTitle>
                    <CardDescription>
                      Customize your brand colors to match your style
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={config.primaryColor}
                          onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                          className="w-20 h-10 border border-gray-300 rounded-md"
                        />
                        <input
                          type="text"
                          value={config.primaryColor}
                          onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                          placeholder="#7C3AED"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={config.secondaryColor}
                          onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                          className="w-20 h-10 border border-gray-300 rounded-md"
                        />
                        <input
                          type="text"
                          value={config.secondaryColor}
                          onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                          placeholder="#F59E0B"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 pt-1">
                      Brand colours are saved with your studio profile and used by
                      selected website templates. The current live theme uses a fixed
                      palette, so changing these will not restyle every page yet.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Logo & Assets</CardTitle>
                    <CardDescription>
                      Upload your studio logo and brand assets
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Studio Logo</label>
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoFile}
                        />
                        <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                          {config.logoUrl ? (
                            <img
                              src={config.logoUrl}
                              alt="Studio logo"
                              className="mx-auto mb-4 max-h-24 w-auto object-contain"
                            />
                          ) : (
                            <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          )}
                          <p className="text-sm text-gray-600 mb-2">
                            {config.logoUrl ? 'Your current logo' : 'Upload your logo'}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={uploadingLogo}
                            onClick={() => logoInputRef.current?.click()}
                          >
                            {uploadingLogo ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              config.logoUrl ? 'Replace Logo' : 'Choose File'
                            )}
                          </Button>
                          <p className="text-xs text-gray-400 mt-3">
                            Appears on your public website header and on invoices. PNG or JPG.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Business Information */}
            {activeTab === 'business' && (
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Studio Information
                    </CardTitle>
                    <CardDescription>
                      Basic information about your photography studio
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Studio Name</label>
                      <input
                        type="text"
                        value={config.studioName}
                        onChange={(e) => handleInputChange('studioName', e.target.value)}
                        placeholder="Your Studio Name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
                      <input
                        type="text"
                        value={config.businessName}
                        onChange={(e) => handleInputChange('businessName', e.target.value)}
                        placeholder="Legal Business Name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="h-5 w-5" />
                      Contact Details
                    </CardTitle>
                    <CardDescription>
                      How clients can reach you
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                      <input
                        type="email"
                        value={config.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="studio@example.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                      <input
                        type="tel"
                        value={config.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="+43 123 456 789"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                      <input
                        type="text"
                        value={config.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        placeholder="Street Address"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                      <input
                        type="text"
                        value={config.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        placeholder="City, Country"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Settings */}
            {activeTab === 'settings' && (
              <div className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Advanced Settings</CardTitle>
                    <CardDescription>
                      Additional configuration options for your studio website
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">Advanced settings coming soon...</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-end gap-4 mt-8">
            {statusMsg && (
              <span
                className={`text-sm ${statusMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}
              >
                {statusMsg.text}
              </span>
            )}
            <Button
              onClick={handleSaveConfig}
              disabled={saving}
              size="lg"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Configuration
                </>
              )}
            </Button>
          </div>

        </div>
      </div>
    </Layout>
  );
};

export default StudioCustomization;
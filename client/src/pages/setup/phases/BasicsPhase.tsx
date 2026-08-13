/**
 * Setup Wizard - Phase 1: Basics
 * 
 * Collects essential business information:
 * - Business name
 * - Business type (photographer, videographer, etc.)
 * - Timezone
 * - Currency
 * - Logo upload
 * - Primary brand color
 * - Tagline
 */

import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowRight, Upload, Building2, MapPin, Phone, Globe, ChevronDown, ChevronUp } from 'lucide-react';
import { DATE_FORMAT_OPTIONS, DateFormatPreset, getDateFormatPreset, setDateFormatPreset } from '@/lib/dateFormat';

interface BasicsPhaseProps {
  initialData?: {
    businessName?: string;
    businessType?: string;
    timezone?: string;
    siteLanguage?: string;
    currency?: string;
    dateFormat?: string;
    tagline?: string;
    primaryColor?: string;
    address?: string;
    city?: string;
    phone?: string;
    website?: string;
    latitude?: string;
    longitude?: string;
    facebookUrl?: string;
    instagramUrl?: string;
    twitterUrl?: string;
    logoUrl?: string;
    vatNumber?: string;
  };
  onComplete: () => void;
}

const BUSINESS_TYPES = [
  { value: 'portrait', label: 'Portrait Photographer' },
  { value: 'wedding', label: 'Wedding Photographer' },
  { value: 'newborn', label: 'Newborn Photographer' },
  { value: 'family', label: 'Family Photographer' },
  { value: 'maternity', label: 'Maternity Photographer' },
  { value: 'boudoir', label: 'Boudoir Photographer' },
  { value: 'headshots', label: 'Headshot / Personal Branding Photographer' },
  { value: 'commercial', label: 'Commercial Photographer' },
  { value: 'event', label: 'Event Photographer' },
  { value: 'pet', label: 'Pet Photographer' },
  { value: 'real_estate', label: 'Real Estate / Property Photographer' },
  { value: 'videographer', label: 'Videographer' },
  { value: 'studio', label: 'Photo Studio' },
  { value: 'other', label: 'Other (tell us below)' }
];

const TIMEZONES = [
  { value: 'Europe/Vienna', label: 'Vienna (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Zurich', label: 'Zurich (CET)' },
  { value: 'America/New_York', label: 'New York (EST)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST)' },
  { value: 'America/Chicago', label: 'Chicago (CST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' }
];

const CURRENCIES = [
  { value: 'EUR', label: '€ Euro (EUR)' },
  { value: 'USD', label: '$ US Dollar (USD)' },
  { value: 'GBP', label: '£ British Pound (GBP)' },
  { value: 'CHF', label: 'Fr Swiss Franc (CHF)' },
  { value: 'AUD', label: '$ Australian Dollar (AUD)' }
];

// Must stay in step with SUPPORTED_SITE_LANGUAGES in server/lib/site-language.ts —
// the server normalises to these codes and rejects anything else.
const SITE_LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch (German)' },
  { value: 'fr', label: 'Français (French)' },
  { value: 'es', label: 'Español (Spanish)' }
];


export default function BasicsPhase({ initialData, onComplete }: BasicsPhaseProps) {
  const [formData, setFormData] = useState({
    businessName: initialData?.businessName || '',
    businessType: initialData?.businessType || '',
    timezone: initialData?.timezone || 'Europe/Vienna',
    // Deliberately UNSET, not defaulted. Browser detection was tried and was worse —
    // the buyer's OS locale is not their WEBSITE's language. But defaulting to English
    // was worse still in a way that was invisible: the field is required and the studio
    // picks a language, yet a stored value only had to be missing from the form for one
    // save to write 'en' back over it. It also made "site_language is set" mean "this
    // form was submitted" rather than "the studio chose", which is the distinction the
    // URL localisation is gated on — an instance that never answered must keep the URLs
    // it has. Empty means unanswered, the select shows its placeholder, and validate()
    // makes the studio answer.
    siteLanguage: initialData?.siteLanguage || '',
    currency: initialData?.currency || 'EUR',
    vatNumber: initialData?.vatNumber || '',
    dateFormat: (initialData?.dateFormat as DateFormatPreset) || getDateFormatPreset(),
    tagline: initialData?.tagline || '',
    primaryColor: initialData?.primaryColor || '#3B82F6',
    address: initialData?.address || '',
    city: initialData?.city || '',
    phone: initialData?.phone || '',
    website: initialData?.website || '',
    latitude: initialData?.latitude || '',
    longitude: initialData?.longitude || '',
    facebookUrl: initialData?.facebookUrl || '',
    instagramUrl: initialData?.instagramUrl || '',
    twitterUrl: initialData?.twitterUrl || '',
  });

  const [showLocation, setShowLocation] = useState(!!(initialData?.latitude || initialData?.address));
  const [showSocial, setShowSocial] = useState(!!(initialData?.facebookUrl || initialData?.instagramUrl));

  // Free-text specialism when "Other" is chosen (submitted AS businessType).
  const [businessTypeOther, setBusinessTypeOther] = useState('');

  // Google Maps link → coordinates, so the owner never has to know what
  // "latitude" means.
  const [mapLink, setMapLink] = useState('');
  const [mapStatus, setMapStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [mapError, setMapError] = useState('');

  const resolveMapLink = async () => {
    const url = mapLink.trim();
    if (!url) return;
    setMapStatus('loading');
    setMapError('');
    try {
      const res = await fetch('/api/geo/resolve-map-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok || !data?.latitude) throw new Error(data?.error || 'Could not read that link.');
      setFormData(prev => ({ ...prev, latitude: String(data.latitude), longitude: String(data.longitude) }));
      setMapStatus('ok');
    } catch (e: any) {
      setMapError(e?.message || 'Could not read that link.');
      setMapStatus('error');
    }
  };

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Logo upload (was a dead placeholder before — no file input was wired).
  const [logoUrl, setLogoUrl] = useState(initialData?.logoUrl || '');
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp|svg\+xml)$/.test(file.type)) {
      setErrors(prev => ({ ...prev, logo: 'Please choose a PNG, JPG, or SVG image.' }));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, logo: 'Logo must be under 2 MB.' }));
      return;
    }
    setLogoUploading(true);
    setErrors(prev => ({ ...prev, logo: '' }));
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folderName', 'Studio Logos');
      // Setup-phase endpoint (works before an admin exists, unlike /api/files/upload).
      const res = await fetch('/api/setup/upload-logo', { method: 'POST', credentials: 'include', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Upload failed');
      const url = data.url || data.thumbnailUrl || data.publicUrl;
      if (!url) throw new Error('No URL returned from upload');
      setLogoUrl(url);
    } catch (err: any) {
      setErrors(prev => ({ ...prev, logo: err?.message || 'Could not upload the logo. Please try again.' }));
    } finally {
      setLogoUploading(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/setup/basics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || 'Failed to save. Please check the required fields and try again.');
      return body;
    },
    onSuccess: () => {
      // Persist date format preference to localStorage so it takes effect immediately
      setDateFormatPreset(formData.dateFormat as DateFormatPreset);
      onComplete();
    },
    onError: (err: any) => {
      setErrors(prev => ({ ...prev, submit: err?.message || 'Could not save. Please try again.' }));
    }
  });
  
  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };
  
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.businessName.trim()) {
      newErrors.businessName = 'Business name is required';
    }
    if (!formData.businessType) {
      newErrors.businessType = 'Please select a business type';
    }
    if (formData.businessType === 'other' && !businessTypeOther.trim()) {
      newErrors.businessTypeOther = 'Please tell us what kind of photography you do';
    }
    if (!formData.timezone) {
      newErrors.timezone = 'Please select a timezone';
    }
    // The label has always been marked required; nothing enforced it, because the field
    // was pre-filled and so could never be empty.
    if (!formData.siteLanguage) {
      newErrors.siteLanguage = 'Please choose the language your website is written in';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      // The required fields sit near the top; make the reason visible next to
      // the (bottom) Continue button so it never looks like the button is dead.
      setErrors(prev => ({ ...prev, submit: 'Please complete the required fields marked * above (Business name, Business type, Timezone, Website language).' }));
      return;
    }
    setErrors(prev => ({ ...prev, submit: '' }));
    // Save the specific specialism as the business type ("Boudoir
    // Photographer" is useful downstream; "other" is not).
    const base = formData.businessType === 'other' && businessTypeOther.trim()
      ? { ...formData, businessType: businessTypeOther.trim() }
      : formData;
    saveMutation.mutate({ ...base, logo: logoUrl || null });
  };
  
  return (
    <>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-2xl">Tell us about your business</CardTitle>
            <CardDescription>
              This information will be used throughout your studio management system
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Business Name */}
        <div className="space-y-2">
          <Label htmlFor="businessName">Business Name *</Label>
          <Input
            id="businessName"
            placeholder="e.g., New Age Fotografie"
            value={formData.businessName}
            onChange={(e) => handleChange('businessName', e.target.value)}
            className={errors.businessName ? 'border-red-500' : ''}
          />
          {errors.businessName && (
            <p className="text-sm text-red-500">{errors.businessName}</p>
          )}
        </div>
        
        {/* Business Type */}
        <div className="space-y-2">
          <Label htmlFor="businessType">Business Type *</Label>
          <Select 
            value={formData.businessType} 
            onValueChange={(value) => handleChange('businessType', value)}
          >
            <SelectTrigger className={errors.businessType ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select your business type" />
            </SelectTrigger>
            <SelectContent>
              {BUSINESS_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.businessType && (
            <p className="text-sm text-red-500">{errors.businessType}</p>
          )}

          {/* "Other" is useless on its own — capture the actual specialism. It's
              saved AS the business type, so the AI writes copy for a boudoir
              photographer rather than for "other". */}
          {formData.businessType === 'other' && (
            <div className="space-y-2 pt-2">
              <Label htmlFor="businessTypeOther">What kind of photography do you do? *</Label>
              <Input
                id="businessTypeOther"
                placeholder="e.g., Equine Photographer"
                value={businessTypeOther}
                onChange={(e) => {
                  setBusinessTypeOther(e.target.value);
                  if (errors.businessTypeOther) setErrors(prev => ({ ...prev, businessTypeOther: '' }));
                }}
                className={errors.businessTypeOther ? 'border-red-500' : ''}
              />
              <p className="text-xs text-gray-500">
                We use this to write your website copy, so be specific — e.g. &ldquo;Equine
                Photographer&rdquo; or &ldquo;Pet Photographer&rdquo;.
              </p>
              {errors.businessTypeOther && (
                <p className="text-sm text-red-500">{errors.businessTypeOther}</p>
              )}
            </div>
          )}
        </div>
        
        {/* Timezone & Currency Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone *</Label>
            <Select 
              value={formData.timezone} 
              onValueChange={(value) => handleChange('timezone', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map(tz => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select 
              value={formData.currency} 
              onValueChange={(value) => handleChange('currency', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(curr => (
                  <SelectItem key={curr.value} value={curr.value}>
                    {curr.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Website language. The image shipped a German/English site because that was
            the studio it was built for; every buyer needs its own choice. This drives
            which set of public pages is switched on and what language the AI writes the
            site in. */}
        <div className="space-y-2">
          <Label htmlFor="siteLanguage">Website language *</Label>
          <Select
            value={formData.siteLanguage}
            onValueChange={(value) => handleChange('siteLanguage', value)}
          >
            <SelectTrigger className={errors.siteLanguage ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select the language your website is written in" />
            </SelectTrigger>
            <SelectContent>
              {SITE_LANGUAGES.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.siteLanguage && (
            <p className="text-sm text-red-500">{errors.siteLanguage}</p>
          )}
          <p className="text-xs text-gray-500">
            The language your public website is written in. We'll write your pages in it and
            switch on the matching set of pages.
          </p>
        </div>

        {/* City. Deliberately here and not in the collapsed "Address & Location" panel
            below: that panel is closed by default, which is exactly why most studios
            have no address stored. This is the single most important local-search
            signal — without it the site's structured data asserts a business with no
            location at all — so it has to be visible without opening anything.
            Optional: a mobile or travelling photographer has no premises to name. */}
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            placeholder="Brighton"
            value={formData.city}
            onChange={(e) => handleChange('city', e.target.value)}
          />
          <p className="text-xs text-gray-500">
            The town or city you work in. We use it in your website's search listing so
            people nearby can find you. Just the city — leave it blank if you travel to
            your clients rather than working from one place.
          </p>
        </div>

        {/* Date Format */}
        <div className="space-y-2">
          <Label htmlFor="dateFormat">Date Format</Label>
          <Select
            value={formData.dateFormat}
            onValueChange={(value) => handleChange('dateFormat', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select date format" />
            </SelectTrigger>
            <SelectContent>
              {DATE_FORMAT_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">
            Choose "Auto-detect" to use your browser/PC regional settings, or pick a specific format.
          </p>
        </div>
        
        {/* VAT / Tax ID */}
        <div className="space-y-2">
          <Label htmlFor="vatNumber">VAT / Tax ID (optional)</Label>
          <Input
            id="vatNumber"
            placeholder="e.g., ATU12345678"
            value={formData.vatNumber}
            onChange={(e) => handleChange('vatNumber', e.target.value)}
          />
          <p className="text-xs text-gray-500">
            Appears on invoices and is shared with connected apps (e.g. ShootCleaner).
          </p>
        </div>

        {/* Tagline */}
        <div className="space-y-2">
          <Label htmlFor="tagline">Tagline (optional)</Label>
          <Textarea
            id="tagline"
            placeholder="e.g., Capturing life's precious moments"
            value={formData.tagline}
            onChange={(e) => handleChange('tagline', e.target.value)}
            rows={2}
          />
          <p className="text-xs text-gray-500">
            A short phrase that describes your business
          </p>
        </div>
        
        {/* Brand Color */}
        <div className="space-y-2">
          <Label htmlFor="primaryColor">Primary Brand Color</Label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              id="primaryColor"
              value={formData.primaryColor}
              onChange={(e) => handleChange('primaryColor', e.target.value)}
              className="w-12 h-12 rounded-lg border cursor-pointer"
            />
            <Input
              value={formData.primaryColor}
              onChange={(e) => handleChange('primaryColor', e.target.value)}
              className="w-32 font-mono"
              placeholder="#3B82F6"
            />
            <div 
              className="flex-1 h-12 rounded-lg"
              style={{ backgroundColor: formData.primaryColor }}
            />
          </div>
        </div>

        {/* Phone & Website Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone">
              <Phone className="w-3.5 h-3.5 inline mr-1" />
              Phone Number
            </Label>
            <Input
              id="phone"
              placeholder="+43 1 234 5678"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">
              <Globe className="w-3.5 h-3.5 inline mr-1" />
              Website
            </Label>
            <Input
              id="website"
              placeholder="https://www.yourstudio.com"
              value={formData.website}
              onChange={(e) => handleChange('website', e.target.value)}
            />
          </div>
        </div>

        {/* Location Section (collapsible) */}
        <div className="border rounded-lg">
          <button
            type="button"
            className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            onClick={() => setShowLocation(!showLocation)}
          >
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Address & Location
            </span>
            {showLocation ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showLocation && (
            <div className="p-4 pt-0 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Business Address</Label>
                <Textarea
                  id="address"
                  placeholder="123 Main Street&#10;Vienna, 1010&#10;Austria"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-gray-500">
                  Used on invoices, emails, and your public website.
                </p>
              </div>
              {/* Plain-English replacement for raw Latitude/Longitude: paste the
                  Google Maps link and we work the coordinates out. */}
              <div className="space-y-2">
                <Label htmlFor="mapLink">Your Google Maps / Business Profile (GMB) link</Label>
                <div className="flex gap-2">
                  <Input
                    id="mapLink"
                    placeholder="https://maps.app.goo.gl/…"
                    value={mapLink}
                    onChange={(e) => { setMapLink(e.target.value); setMapStatus('idle'); }}
                    onBlur={() => { if (mapLink.trim()) resolveMapLink(); }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resolveMapLink}
                    disabled={!mapLink.trim() || mapStatus === 'loading'}
                    className="whitespace-nowrap"
                  >
                    {mapStatus === 'loading' ? 'Finding…' : 'Find location'}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Open your studio's Google Business Profile / Google Maps listing, tap
                  <strong> Share</strong> → <strong>Copy link</strong>, and paste it here — we read the
                  coordinates from it automatically. Only used to show a map of your studio on your website.
                </p>
                {mapStatus === 'ok' && (
                  <p className="text-xs text-green-700">
                    ✓ Location found — we&apos;ll show your studio on the map.
                  </p>
                )}
                {mapStatus === 'error' && (
                  <p className="text-xs text-red-600">{mapError}</p>
                )}
              </div>

              {/* Advanced: the raw coordinates, for anyone who prefers them */}
              <details className="text-xs">
                <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
                  Advanced — enter map coordinates manually
                </summary>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div className="space-y-2">
                    <Label htmlFor="latitude">Latitude</Label>
                    <Input
                      id="latitude"
                      placeholder="48.2082"
                      value={formData.latitude}
                      onChange={(e) => handleChange('latitude', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="longitude">Longitude</Label>
                    <Input
                      id="longitude"
                      placeholder="16.3738"
                      value={formData.longitude}
                      onChange={(e) => handleChange('longitude', e.target.value)}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Most people can ignore this — pasting the Google Maps link above fills it in.
                </p>
              </details>
            </div>
          )}
        </div>

        {/* Social Media Section (collapsible) */}
        <div className="border rounded-lg">
          <button
            type="button"
            className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            onClick={() => setShowSocial(!showSocial)}
          >
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Social Media Links <span className="font-normal text-slate-400">(optional)</span>
            </span>
            {showSocial ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showSocial && (
            <div className="p-4 pt-0 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="instagramUrl">Instagram</Label>
                <Input
                  id="instagramUrl"
                  placeholder="https://instagram.com/yourstudio"
                  value={formData.instagramUrl}
                  onChange={(e) => handleChange('instagramUrl', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facebookUrl">Facebook</Label>
                <Input
                  id="facebookUrl"
                  placeholder="https://facebook.com/yourstudio"
                  value={formData.facebookUrl}
                  onChange={(e) => handleChange('facebookUrl', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twitterUrl">X (Twitter)</Label>
                <Input
                  id="twitterUrl"
                  placeholder="https://x.com/yourstudio"
                  value={formData.twitterUrl}
                  onChange={(e) => handleChange('twitterUrl', e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Logo Upload */}
        <div className="space-y-2">
          <Label>Logo (optional)</Label>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={handleLogoUpload}
          />
          {logoUrl ? (
            <div className="flex items-center gap-4 border rounded-xl p-4">
              <img src={logoUrl} alt="Studio logo" className="h-16 w-auto max-w-[160px] object-contain" />
              <div className="flex gap-3">
                <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={logoUploading}>
                  Replace
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setLogoUrl('')} disabled={logoUploading}>
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              disabled={logoUploading}
              className="w-full border-2 border-dashed rounded-xl p-6 text-center hover:border-blue-400 transition-colors cursor-pointer disabled:opacity-60"
            >
              {logoUploading ? (
                <Loader2 className="w-8 h-8 mx-auto text-blue-500 mb-2 animate-spin" />
              ) : (
                <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
              )}
              <p className="text-sm text-gray-600">
                {logoUploading ? 'Uploading…' : 'Click to upload'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                PNG, JPG, or SVG up to 2MB
              </p>
            </button>
          )}
          {errors.logo && <p className="text-sm text-red-500">{errors.logo}</p>}
        </div>
      </CardContent>
      
      <CardFooter className="flex flex-col items-stretch gap-3 pt-6 border-t sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-gray-500">* Required fields</p>
          {errors.submit && (
            <p className="text-sm text-red-500 mt-1">{errors.submit}</p>
          )}
        </div>
        <Button
          onClick={handleSubmit}
          disabled={saveMutation.isPending}
          className="gap-2"
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </CardFooter>
    </>
  );
}

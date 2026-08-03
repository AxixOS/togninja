import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Sparkles, Lightbulb } from 'lucide-react';
import { useCreateLandingPage } from '../../features/landing-pages/hooks/useCreateLandingPage';
import { LANDING_PAGE_TYPES } from '../../features/landing-pages/utils/landingPage.constants';
import { slugifyLandingPageTitle } from '../../features/landing-pages/utils/landingPage.helpers';
import { toast } from '@/hooks/use-toast';

export default function AdminLandingPageNewPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [primaryService, setPrimaryService] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [pageType, setPageType] = useState('custom');
  const [city, setCity] = useState('');
  const [offerSummary, setOfferSummary] = useState('');

  const { create, isCreating, error } = useCreateLandingPage({
    onSuccess: () => {
      toast({ title: 'Landing page created', description: 'Your draft has been saved.' });
      navigate('/admin/landing-pages');
    },
    onError: (err) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const [generating, setGenerating] = useState(false);

  const handleSave = () => {
    const slug = slugifyLandingPageTitle(title || 'untitled-landing-page');
    create({
      title: title || 'Untitled Landing Page',
      slug,
      status: 'draft',
      page_type: pageType,
      primary_service: primaryService || undefined,
      target_audience: targetAudience || undefined,
      city: city || undefined,
      offer_summary: offerSummary || undefined,
      content_json: {},
    });
  };

  // Generate the full page copy with AI from the details entered here, then open
  // the editor. (Same flow as the wizard — kept on this page so it isn't a
  // dead-end that only saves an empty draft.)
  const handleGenerateWithAI = async () => {
    setGenerating(true);
    try {
      const ctaAction = pageType === 'voucher_sales' ? 'buy_voucher' : pageType === 'booking' ? 'book_now' : 'enquire';
      const genRes = await fetch('/api/admin/landing-pages/generate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageType, primaryService, targetAudience, city, offerSummary, tone: 'warm', ctaAction }),
      });
      if (!genRes.ok) throw new Error((await genRes.json().catch(() => ({})))?.error || 'AI generation failed');
      const genData = await genRes.json();
      const slug = slugifyLandingPageTitle(title || primaryService || 'landing-page');
      const createRes = await fetch('/api/admin/landing-pages', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || genData.content?.seo?.title || `${primaryService || 'New'} Landing Page`,
          slug,
          status: 'draft',
          page_type: pageType,
          primary_service: primaryService || undefined,
          target_audience: targetAudience || undefined,
          offer_summary: offerSummary || undefined,
          city: city || undefined,
          tone: 'warm',
          seo_title: genData.content?.seo?.title || '',
          meta_description: genData.content?.seo?.metaDescription || '',
          hero_headline: genData.content?.hero?.headline || '',
          hero_subheadline: genData.content?.hero?.subheadline || '',
          cta_text: genData.content?.hero?.ctaText || 'Jetzt buchen',
          cta_action: ctaAction,
          content_json: genData.content,
          generation_context_json: { model: genData.model, usage: genData.usage, generatedAt: new Date().toISOString() },
        }),
      });
      if (!createRes.ok) throw new Error((await createRes.json().catch(() => ({})))?.error || 'Failed to save generated page');
      const page = await createRes.json();
      toast({ title: 'Landing page generated', description: 'AI content created — opening the editor.' });
      navigate(`/admin/landing-pages/${page.id}`);
    } catch (err: any) {
      toast({ title: 'Generation failed', description: err?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" onClick={() => navigate('/admin/landing-pages')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create New Landing Page</h1>
            <p className="text-sm text-gray-500">
              Set up the basics first. You'll be able to generate copy, refine sections, and publish a live URL in the next stages.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Main form */}
          <div className="col-span-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Page Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Family Photoshoot Vouchers Vienna"
                  />
                  {title && (
                    <p className="text-xs text-gray-400 font-mono">
                      /lp/{slugifyLandingPageTitle(title)}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pageType">Page Type</Label>
                  <Select value={pageType} onValueChange={setPageType}>
                    <SelectTrigger id="pageType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANDING_PAGE_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.icon} {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primaryService">Primary Service</Label>
                    <Input
                      id="primaryService"
                      value={primaryService}
                      onChange={(e) => setPrimaryService(e.target.value)}
                      placeholder="e.g., Family Photography"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City / Service Area</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g., Wien, Vienna"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetAudience">Target Audience</Label>
                  <Input
                    id="targetAudience"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="e.g., Parents looking for family photoshoots"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="offerSummary">Offer Summary</Label>
                  <Textarea
                    id="offerSummary"
                    value={offerSummary}
                    onChange={(e) => setOfferSummary(e.target.value)}
                    placeholder="e.g., 60-minute session, 10 retouched images, private online gallery..."
                    rows={3}
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
                    {error.message}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right info panel */}
          <div className="col-span-4 space-y-4">
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  <h3 className="font-semibold text-purple-900">AI Generation</h3>
                </div>
                <p className="text-sm text-purple-800 mb-3">
                  Generate compelling copy, headlines, and full page sections with AI — based on the
                  details you enter here — then fine-tune each section in the editor.
                </p>
                <Button
                  onClick={handleGenerateWithAI}
                  disabled={generating || !primaryService}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  {generating ? 'Generating…' : 'Generate with AI'}
                </Button>
                {!primaryService && <p className="text-xs text-purple-500 mt-2">Choose a Primary Service first.</p>}
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-900">What's Next</h3>
                </div>
                <ul className="text-sm text-blue-800 space-y-2">
                  <li>• Save as a draft now</li>
                  <li>• AI-generated copy (Phase 2)</li>
                  <li>• Visual section editor (Phase 3)</li>
                  <li>• Publish to a live URL (Phase 4)</li>
                </ul>
                {/* TODO: Phase 3 — link to editor */}
                {/* TODO: Phase 4 — link to publish flow */}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex justify-between mt-8">
          <Button variant="outline" onClick={() => navigate('/admin/landing-pages')}>
            Cancel
          </Button>
          <div className="flex gap-3">
            <Button
              onClick={handleSave}
              disabled={isCreating || generating}
              variant="outline"
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {isCreating ? 'Saving...' : 'Save as Draft'}
            </Button>
            <Button
              onClick={handleGenerateWithAI}
              disabled={generating || isCreating || !primaryService}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {generating ? 'Generating…' : 'Generate with AI'}
            </Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

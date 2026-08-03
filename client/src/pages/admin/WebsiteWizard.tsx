import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
// Custom Progress component - inline for simplicity
const Progress = ({ value, className }: { value: number; className?: string }) => (
  <div className={`w-full bg-gray-200 rounded-full h-2.5 ${className}`}>
    <div 
      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
      style={{ width: `${value}%` }}
    />
  </div>
);
import { 
  Globe, 
  Search, 
  Palette, 
  Image, 
  FileText, 
  BarChart3, 
  CheckCircle, 
  AlertTriangle, 
  Loader2,
  ExternalLink 
} from "lucide-react";

interface WebsiteProfile {
  title?: string;
  description?: string;
  keywords?: string[];
  colors?: string[];
  images?: string[];
  main_text?: string;
}

interface AnalysisResult {
  status: string;
  profile?: WebsiteProfile;
  url?: string;
  message?: string;
  error?: string;
}

export default function WebsiteWizard() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pages, setPages] = useState<Array<{ id: string; url: string; title?: string; http_status?: number }>>([]);
  const [theme, setTheme] = useState<{ detected_stack?: string; primary_color?: string; secondary_color?: string; font_family?: string; palette?: string[] } | null>(null);
  const [sitemapUrls, setSitemapUrls] = useState<string[]>([]);
  const pollingRef = useRef<number | null>(null);

  const handleAnalyze = async () => {
    if (!url) return;
    setLoading(true);
    setProgress(0);
    setResult(null);
    setPages([]);
    setTheme(null);
    try {
      // Create onboarding session
      const startRes = await fetch('/api/onboarding/start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_url: url })
      });
      const startJson = await startRes.json();
      if (!startJson?.ok) throw new Error(startJson?.error || 'failed to start onboarding');
      const sid = startJson.session_id as string;
      setSessionId(sid);

      // Kick off crawl (lightweight)
      void fetch('/api/onboarding/run-crawl', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: sid, max_pages: 15 }) });

      // Poll status
      const startTs = Date.now();
      await new Promise<void>((resolve, reject) => {
        const tick = async () => {
          try {
            const sRes = await fetch(`/api/onboarding/status?session_id=${sid}`);
            const s = await sRes.json();
            const job = s?.job;
            const crawled = Number(job?.pages_crawled || 0);
            const discovered = Number(job?.pages_discovered || 0) || Math.max(1, crawled);
            const pct = discovered ? Math.min(95, Math.round((crawled / discovered) * 100)) : 10;
            setProgress(pct);
            if (job?.status === 'completed') {
              resolve();
              return;
            }
            if (Date.now() - startTs > 45000) { // 45s timeout
              resolve();
              return;
            }
          } catch (e) {
            // keep trying a bit
          }
          pollingRef.current = window.setTimeout(tick, 1000);
        };
        tick();
      });

      // Load pages
      const pRes = await fetch(`/api/onboarding/pages?session_id=${sid}&limit=200`);
      const pJson = await pRes.json();
      const list = Array.isArray(pJson?.pages) ? pJson.pages : [];
      setPages(list);

      // Analyze theme
      const tRes = await fetch(`/api/onboarding/analyze-theme?session_id=${sid}`);
      const tJson = await tRes.json();
      if (tJson?.ok) {
        setTheme({
          detected_stack: tJson?.theme?.detected_stack,
          primary_color: tJson?.theme?.primary_color,
          secondary_color: tJson?.theme?.secondary_color,
          font_family: tJson?.theme?.font_family,
          palette: tJson?.palette || []
        });
      }

      setProgress(100);
      setResult({ status: 'success', url, profile: {
        title: list?.[0]?.title,
        description: undefined,
        keywords: [],
        colors: tJson?.palette || [],
        images: [],
        main_text: undefined
      }, message: 'Website analyzed successfully' });
    } catch (error) {
      setResult({ status: 'error', error: 'Analyze failed', message: error instanceof Error ? error.message : String(error) });
    } finally {
      setLoading(false);
    }
  };

  const handleDiscoverSitemap = async () => {
    try {
      if (!url) return;
      const r = await fetch(`/api/onboarding/discover-sitemap?url=${encodeURIComponent(url)}`);
      const j = await r.json();
      if (j?.ok) setSitemapUrls(j.urls || []);
    } catch {}
  };

  const renderColorPalette = (colors?: string[]) => {
    if (!colors || colors.length === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-2">
        {colors.slice(0, 8).map((color, index) => (
          <div
            key={index}
            className="w-8 h-8 rounded border-2 border-gray-300 flex items-center justify-center text-xs font-mono"
            style={{ backgroundColor: color }}
            title={color}
          >
            {color.length <= 4 && <span className="text-white mix-blend-difference">{color}</span>}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Website Wizard</h1>
        <p className="text-gray-600">
          Analyze any website to extract content, images, and SEO data for optimized photography website creation
        </p>
      </div>

      <Tabs defaultValue="analyze" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="analyze" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Website URL
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Data Analysis
          </TabsTrigger>
          <TabsTrigger value="template" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Template Selection
          </TabsTrigger>
          <TabsTrigger value="optimization" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Content Optimization
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analyze" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Enter Your Current Website URL
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Website URL</label>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://your-photography-website.com"
                  type="url"
                />
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-950/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">What we'll analyze:</h4>
                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <li>• Content and copy for SEO optimization</li>
                  <li>• Portfolio images and galleries</li>
                  <li>• Contact information and services</li>
                  <li>• Current SEO performance</li>
                  <li>• Brand colors and styling</li>
                </ul>
              </div>

              {loading && (
                <div className="space-y-2">
                  <Progress value={progress} className="w-full" />
                  <p className="text-sm text-center text-gray-600">
                    Analyzing website... {progress}%
                  </p>
                </div>
              )}

              <Button 
                onClick={handleAnalyze}
                disabled={!url || loading}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyze Website
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Analyze Website
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {result && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {result.status === "success" ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  )}
                  Analysis Result
                </CardTitle>
              </CardHeader>
              <CardContent>
                {result.status === "success" ? (
                  <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-green-800 dark:text-green-200">{result.message}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-red-800 dark:text-red-200">{result.error}: {result.message}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          {result?.profile ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Content Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Page Title</label>
                    <p className="text-sm text-gray-600 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                      {result.profile.title || "No title found"}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <p className="text-sm text-gray-600 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                      {result.profile.description || "No description found"}
                    </p>
                  </div>

                  {result.profile.keywords && result.profile.keywords.length > 0 && (
                    <div>
                      <label className="text-sm font-medium">Keywords</label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {result.profile.keywords.map((keyword, index) => (
                          <Badge key={index} variant="secondary">{keyword}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium">Crawled Pages</label>
                    <p className="text-sm text-gray-600 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                      {pages.length} pages
                    </p>
                    {pages.slice(0, 5).map((p) => (
                      <div key={p.id} className="text-xs text-gray-500 truncate">{p.title || p.url}</div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="w-5 h-5" />
                    Brand Colors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {renderColorPalette(theme?.palette || result.profile.colors)}
                  {(!result.profile.colors || result.profile.colors.length === 0) && (
                    <p className="text-sm text-gray-500">No brand colors detected</p>
                  )}
                  {theme && (
                    <div className="mt-3 text-sm text-gray-600 space-y-1">
                      <div><span className="font-medium">Primary:</span> {theme.primary_color || '-'}</div>
                      <div><span className="font-medium">Secondary:</span> {theme.secondary_color || '-'}</div>
                      <div><span className="font-medium">Fonts:</span> {theme.font_family || '-'}</div>
                      <div><span className="font-medium">Detected Stack:</span> {theme.detected_stack || '-'}</div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {result.profile.images && result.profile.images.length > 0 && (
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Image className="w-5 h-5" />
                      Images Found ({result.profile.images.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {result.profile.images.slice(0, 8).map((img, index) => (
                        <div key={index} className="aspect-square bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                          <Image className="w-8 h-8 text-gray-400" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    Sitemap Discovery
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 mb-3">
                    <Button variant="secondary" onClick={handleDiscoverSitemap} disabled={!url}>Discover Sitemaps</Button>
                    <span className="text-sm text-gray-500">Shows up to 20 URLs</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {(sitemapUrls || []).slice(0, 20).map((u, idx) => (
                      <div key={idx} className="text-xs text-blue-700 truncate">
                        <a href={u} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" />
                          {u}
                        </a>
                      </div>
                    ))}
                    {sitemapUrls.length === 0 && (
                      <p className="text-sm text-gray-500">No sitemap URLs discovered yet.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Analyze a website first to see the data analysis</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="template" className="space-y-6">
          <Card>
            <CardContent className="text-center py-12">
              <Palette className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Template selection will be available after analysis</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-6">
          <Card>
            <CardContent className="text-center py-12">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Content optimization will be available after analysis</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
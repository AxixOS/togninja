import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
// import { Progress } from '@/components/ui/progress'; // TODO: Add progress component
import { SITE } from '../../config/site';
import { Badge } from '@/components/ui/badge';
// import { Alert, AlertDescription } from '@/components/ui/alert'; // TODO: Add alert component
import { Upload, Image, Wand2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AutoBlogChatInterface } from '@/components/AutoBlogChatInterface';


interface AutoBlogResult {
  success: boolean;
  post?: any;
  ai?: any;
  error?: string;
}

interface AutoBlogStatus {
  available: boolean;
  maxImages: number;
  supportedLanguages: string[];
  features: string[];
}



export default function AdminAutoBlogPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState('chat');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [userPrompt, setUserPrompt] = useState('');
  const [language, setLanguage] = useState('de');
  const [publishOption, setPublishOption] = useState<'draft' | 'publish' | 'schedule'>('draft');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [siteUrl, setSiteUrl] = useState(SITE.url);
  const [customSlug, setCustomSlug] = useState('');
  const [result, setResult] = useState<AutoBlogResult | null>(null);
  const [status, setStatus] = useState<AutoBlogStatus | null>(null);

  // Load AutoBlog status on component mount
  React.useEffect(() => {
    loadAutoBlogStatus();
  }, []);

  const loadAutoBlogStatus = async () => {
    try {
      const response = await fetch('/api/autoblog/status', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const statusData = await response.json();
        setStatus(statusData);
      }
    } catch (error) {
      console.error('Failed to load AutoBlog status:', error);
    }
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length > (status?.maxImages || 3)) {
      toast({
        title: "Too many images",
        description: `Maximum ${status?.maxImages || 3} images allowed`,
        variant: "destructive"
      });
      return;
    }

    // Validate image files
    const invalidFiles = files.filter(file => !file.type.startsWith('image/'));
    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid file type",
        description: "Only image files are allowed",
        variant: "destructive"
      });
      return;
    }

    // Check file sizes (10MB limit)
    const oversizedFiles = files.filter(file => file.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast({
        title: "File too large",
        description: "Images must be under 10MB",
        variant: "destructive"
      });
      return;
    }

    setSelectedImages(files);
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const generateBlogPost = async () => {
    console.log('🎯 AI AutoBlog system - generating with TOGNINJA Assistant...');
    if (selectedImages.length === 0) {
      toast({
        title: "No images selected",
        description: "Please select at least one image to generate content",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setResult(null);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 15;
        });
      }, 500);

      const formData = new FormData();
      selectedImages.forEach(file => {
        formData.append('images', file);
      });
      
      formData.append('userPrompt', userPrompt);
      formData.append('language', language);
      formData.append('publishOption', publishOption);
      formData.append('siteUrl', siteUrl);
      if (customSlug) {
        formData.append('customSlug', customSlug);
      }
      
      // Add scheduling info if needed
      if (publishOption === 'schedule' && scheduleDate && scheduleTime) {
        const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
        formData.append('scheduledFor', scheduledDateTime.toISOString());
      }

      const response = await fetch('/api/autoblog/generate', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      clearInterval(progressInterval);
      setProgress(100);

      const resultData: AutoBlogResult = await response.json();
      setResult(resultData);

      if (resultData.success) {
        toast({
          title: "Blog post generated!",
          description: `Successfully created "${resultData.ai?.title || 'new blog post'}"`,
        });
        
        // Clear form
        setSelectedImages([]);
        setUserPrompt('');
        setCustomSlug('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        toast({
          title: "Generation failed",
          description: resultData.error || "Failed to generate blog post",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('AutoBlog generation error:', error);
      toast({
        title: "Network error",
        description: "Failed to connect to the server",
        variant: "destructive"
      });
      setResult({
        success: false,
        error: "Network error occurred"
      });
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  if (!status) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading AutoBlog...</span>
        </div>
      </div>
    );
  }

  if (!status.available) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              AutoBlog Not Available
            </CardTitle>
            <CardDescription>
              AutoBlog requires OpenAI integration to be configured.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <p className="text-orange-800">
                Please configure your OpenAI API key to enable AutoBlog functionality.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI AutoBlog Assistant</h1>
          <p className="text-muted-foreground">
            Chat with OpenAI Assistant to generate authentic blog content from your photography session images
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Wand2 className="h-4 w-4" />
          OpenAI Assistant Chat
        </Badge>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b">
        <Button 
          variant={activeTab === 'chat' ? 'default' : 'ghost'} 
          onClick={() => setActiveTab('chat')}
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
        >
          Direct Chat Interface
        </Button>
        <Button 
          variant={activeTab === 'automated' ? 'default' : 'ghost'} 
          onClick={() => setActiveTab('automated')}
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
        >
          Automated Generation
        </Button>
      </div>

      {/* Chat Interface Tab */}
      {activeTab === 'chat' && (
        <AutoBlogChatInterface assistantId="asst_nlyO3yRav2oWtyTvkq0cHZaU" />
      )}

      {/* Automated Generation Tab (existing functionality) */}
      {activeTab === 'automated' && (
        <div className="space-y-6">
          {/* Features Overview */}
          <Card>
        <CardHeader>
          <CardTitle className="text-lg">AutoBlog Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {status.features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle>Generate Blog Post</CardTitle>
            <CardDescription>
              Upload up to {status.maxImages} images from your photography session
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Image Upload */}
            <div>
              <Label htmlFor="images">Session Images *</Label>
              <div className="mt-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  id="images"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-24 border-dashed"
                  disabled={isGenerating}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-6 w-6" />
                    <span>Click to select images</span>
                    <span className="text-xs text-muted-foreground">
                      Max {status.maxImages} images, 10MB each
                    </span>
                  </div>
                </Button>
              </div>

              {/* Selected Images Preview */}
              {selectedImages.length > 0 && (
                <div className="mt-4">
                  <div className="grid grid-cols-3 gap-2">
                    {selectedImages.map((file, index) => {
                      const imageUrl = URL.createObjectURL(file);
                      return (
                        <div key={index} className="relative group">
                          <div className="aspect-square bg-muted rounded-lg overflow-hidden border">
                            <img 
                              src={imageUrl}
                              alt={`Upload preview ${index + 1}`}
                              className="w-full h-full object-cover transition-opacity duration-200"
                              onLoad={() => URL.revokeObjectURL(imageUrl)}
                              onError={() => {
                                console.error(`Failed to load image preview: ${file.name}`);
                                URL.revokeObjectURL(imageUrl);
                              }}
                            />
                          </div>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeImage(index)}
                          >
                            ×
                          </Button>
                          <p className="text-xs text-center mt-1 truncate">{file.name}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* User Prompt */}
            <div>
              <Label htmlFor="prompt">Content Guidance (Optional)</Label>
              <Textarea
                id="prompt"
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="Tell the AI about the session... e.g., 'This was a family portrait session in Schönbrunn Park during golden hour...'"
                disabled={isGenerating}
                rows={3}
              />
            </div>

            {/* Language Selection */}
            <div>
              <Label htmlFor="language">Content Language</Label>
              <Select value={language} onValueChange={setLanguage} disabled={isGenerating}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="de">Deutsch (German)</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Site URL */}
            <div>
              <Label htmlFor="siteUrl">Website URL (for brand voice)</Label>
              <Input
                id="siteUrl"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                placeholder="https://www.newagefotografie.com"
                disabled={isGenerating}
              />
            </div>

            {/* Custom URL Slug */}
            <div>
              <Label htmlFor="customSlug">Custom URL Slug (Optional)</Label>
              <Input
                id="customSlug"
                value={customSlug}
                onChange={(e) => setCustomSlug(e.target.value)}
                placeholder="e.g., my-custom-blog-post-url"
                disabled={isGenerating}
              />
              <p className="text-xs text-muted-foreground mt-1">
                If specified, this exact URL slug will be used instead of auto-generating one from the title
              </p>
            </div>

            {/* Publishing Options */}
            <div className="space-y-4">
              <Label>Publishing Options</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="draft"
                    name="publishOption"
                    value="draft"
                    checked={publishOption === 'draft'}
                    onChange={(e) => setPublishOption(e.target.value as 'draft' | 'publish' | 'schedule')}
                    disabled={isGenerating}
                    className="text-purple-600"
                  />
                  <Label htmlFor="draft" className="font-normal">
                    Save as Draft
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="publish"
                    name="publishOption"
                    value="publish"
                    checked={publishOption === 'publish'}
                    onChange={(e) => setPublishOption(e.target.value as 'draft' | 'publish' | 'schedule')}
                    disabled={isGenerating}
                    className="text-purple-600"
                  />
                  <Label htmlFor="publish" className="font-normal">
                    Publish Immediately
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="schedule"
                    name="publishOption"
                    value="schedule"
                    checked={publishOption === 'schedule'}
                    onChange={(e) => setPublishOption(e.target.value as 'draft' | 'publish' | 'schedule')}
                    disabled={isGenerating}
                    className="text-purple-600"
                  />
                  <Label htmlFor="schedule" className="font-normal">
                    Schedule for Later
                  </Label>
                </div>
              </div>
              
              {/* Schedule Date/Time Inputs */}
              {publishOption === 'schedule' && (
                <div className="grid grid-cols-2 gap-4 mt-4 p-4 bg-muted rounded-lg">
                  <div>
                    <Label htmlFor="scheduleDate">Date</Label>
                    <Input
                      id="scheduleDate"
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      disabled={isGenerating}
                      min={new Date().toISOString().split('T')[0]}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="scheduleTime">Time</Label>
                    <Input
                      id="scheduleTime"
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      disabled={isGenerating}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Generate Button */}
            <Button
              onClick={generateBlogPost}
              disabled={isGenerating || selectedImages.length === 0}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Content...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generate Blog Post
                </>
              )}
            </Button>

            {/* Progress Bar */}
            {isGenerating && (
              <div className="space-y-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-center text-muted-foreground">
                  {progress < 30 && "Processing images..."}
                  {progress >= 30 && progress < 60 && "Analyzing brand voice..."}
                  {progress >= 60 && progress < 90 && "Generating content with AI..."}
                  {progress >= 90 && "Finalizing blog post..."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Generated Content</CardTitle>
            <CardDescription>
              Preview and review your AI-generated blog post
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!result && (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Wand2 className="h-12 w-12 mb-4" />
                <p>Your generated content will appear here</p>
              </div>
            )}

            {result && !result.success && (
              <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <p className="text-red-800">
                  {result.error || "Failed to generate blog post"}
                </p>
              </div>
            )}

            {result && result.success && result.ai && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-green-800 font-medium">Blog post generated successfully!</span>
                </div>

                {/* Blog Post Preview */}
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Title</Label>
                    <p className="text-lg font-semibold">{result.ai.title}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">SEO Title</Label>
                    <p className="text-sm text-muted-foreground">{result.ai.seo_title}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Meta Description</Label>
                    <p className="text-sm text-muted-foreground">{result.ai.meta_description}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Excerpt</Label>
                    <p className="text-sm">{result.ai.excerpt}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Tags</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {result.ai.tags?.map((tag: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <Badge variant={result.ai.status === 'PUBLISHED' ? 'default' : 'secondary'}>
                      {result.ai.status}
                    </Badge>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(`/admin/blog/edit/${result.post?.id}`, '_blank')}
                  >
                    Edit Post
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(`/blog/${result.ai?.slug}`, '_blank')}
                  >
                    Preview
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
        </div>
      )}
    </div>
  );
}
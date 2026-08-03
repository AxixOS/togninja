import { useState, useRef } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
// Removed tabs import - streamlined to single form
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Upload, Check, Wand2, FileText, ExternalLink, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SITE } from '../../config/site';

interface UploadedImage {
  file: File;
  preview: string;
  name: string;
}

// Removed: GeneratedContent interface for streamlined workflow

export default function AutoBlogGenerator() {
  console.log('🟢 AutoBlogGenerator component loaded - CACHE REFRESH VERSION 3.0');
  
  // Removed activeTab state - streamlined interface
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [contentGuidance, setContentGuidance] = useState("");
  const [contentLanguage, setContentLanguage] = useState("deutsch");
  const [websiteUrl, setWebsiteUrl] = useState(SITE.url);
  const [customSlug, setCustomSlug] = useState("");
  const [publishingOption, setPublishingOption] = useState("draft");
  // Progress and completion tracking
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [completedPost, setCompletedPost] = useState<{id: string, title: string, slug: string, status: string} | null>(null);
  
  // Add viewPost function for viewing completed blog
  const viewPost = () => {
    if (completedPost) {
      // Open blog post in new tab
      const blogUrl = completedPost.status === 'published' 
        ? `/blog/${completedPost.slug}` 
        : `/admin/blog/edit/${completedPost.id}`;
      window.open(blogUrl, '_blank');
    }
  };
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Fix existing blog post formatting
  const handleFixBlogFormatting = async () => {
    try {
      const response = await fetch('/api/blog/posts/fix-formatting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fix blog formatting');
      }

      const result = await response.json();
      
      toast({
        title: "Blog Formatting Fixed!",
        description: `Successfully updated ${result.fixed} blog posts with structured formatting`,
      });
    } catch (error) {
      console.error('Error fixing blog formatting:', error);
      toast({
        title: "Error",
        description: "Failed to fix blog formatting. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (uploadedImages.length + files.length > 3) {
      toast({
        title: "Too many images",
        description: "Maximum 3 images allowed",
        variant: "destructive",
      });
      return;
    }

    files.forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} is larger than 10MB`,
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const newImage: UploadedImage = {
          file,
          preview: e.target?.result as string,
          name: file.name
        };
        setUploadedImages(prev => [...prev, newImage]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const createAnotherPost = () => {
    // Reset form for new post - clear all previous blog data as requested
    setUploadedImages([]);
    setContentGuidance('');
    setCustomSlug('');
    setPublishingOption('draft');
    setCompletedPost(null);
    setGenerationProgress(0);
    setProgressMessage('');
  };

  const generateBlogPost = async () => {
    console.log('🔵 FIXED Generate button clicked - version 2.0 starting process...');
    console.log('📊 Current state:', {
      uploadedImages: uploadedImages.length,
      contentGuidance: contentGuidance?.length || 0,
      publishingOption,
      contentLanguage,
      websiteUrl
    });

    if (uploadedImages.length === 0) {
      console.log('❌ No images found - showing error toast');
      toast({
        title: "No images selected",
        description: "Please upload at least one image to generate content",
        variant: "destructive",
      });
      return;
    }

    console.log('✅ Images validated - proceeding with generation');
    setIsGenerating(true);
    setGenerationProgress(0);
    setProgressMessage("Starting content generation...");
    setCompletedPost(null);
    
    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev < 90) return prev + 10;
        return prev;
      });
    }, 3000);
    
    const updateProgress = (progress: number, message: string) => {
      setGenerationProgress(progress);
      setProgressMessage(message);
    };
    
    try {
      updateProgress(10, "Processing images...");
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Brief delay for UX
      // Create FormData for file upload
      const formData = new FormData();
      
      // Add images to FormData
      uploadedImages.forEach((img, index) => {
        console.log(`📎 Adding image ${index + 1}: ${img.name} (${img.file.size} bytes)`);
        formData.append('images', img.file);
      });
      
      // Add other form data - FIXED: Use server configuration instead of hardcoded assistant ID
      const userPrompt = contentGuidance || 'Professional photography session in Vienna studio';
      formData.append('userPrompt', userPrompt);
      // REMOVED: hardcoded assistant ID - server will use centralized config
      formData.append('publishOption', publishingOption);
      formData.append('language', contentLanguage === 'deutsch' ? 'de' : 'en');
      formData.append('websiteUrl', websiteUrl);
      if (customSlug) {
        formData.append('customSlug', customSlug);
      }

      console.log('🚀 Sending request to AutoBlog API with FormData:');
      console.log('  - Images:', uploadedImages.length);
      console.log('  - Prompt:', userPrompt);
      console.log('  - Assistant ID: Server will use centralized TOGNINJA config');
      console.log('  - Language:', contentLanguage === 'deutsch' ? 'de' : 'en');

      const startTime = Date.now();
      console.log('⏰ Request started at:', new Date().toISOString());

      // Force localhost URL for development
      const apiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:5000/api/autoblog/generate'
        : '/api/autoblog/generate';
      
      console.log('🌐 Using API URL:', apiUrl);

      updateProgress(30, "Analyzing images with TOGNINJA Assistant...");
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData, // No Content-Type header - browser sets it automatically with boundary
      });
      
      updateProgress(60, "Generating sophisticated content structure...");
      clearInterval(progressInterval);

      const requestDuration = Date.now() - startTime;
      console.log(`⏱️ Request completed in ${requestDuration}ms`);
      console.log('📡 Response status:', response.status, response.statusText);

      if (!response.ok) {
        console.log('❌ Response not OK - reading error data...');
        const errorText = await response.text();
        console.log('🔴 Error response:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('✅ Response OK - parsing JSON...');
      const data = await response.json();
      console.log('📄 AutoBlog response received:', {
        success: data.success,
        postId: data.post?.id,
        aiMethod: data.ai?.method,
        dataKeys: Object.keys(data)
      });

      if (data.success && data.post) {
        console.log('🎉 Success! Blog post created directly by AutoBlog system');
        console.log('📝 Blog post created:', {
          id: data.post.id,
          title: data.post.title,
          publishStatus: publishingOption
        });

        updateProgress(100, "Blog post generated successfully!");
        
        // Set completion data
        setCompletedPost({
          id: data.post.id,
          title: data.post.title,
          slug: data.post.slug || data.post.id,
          status: publishingOption === 'publish' ? 'published' : 'draft'
        });
        
        console.log('🎊 Generation completed successfully!');
      } else {
        console.log('❌ Response missing success/post data:', data);
        throw new Error(data.error || 'Failed to generate structured content - invalid response format');
      }

    } catch (error: any) {
      console.error('💥 Generation error caught:', error);
      console.error('🔍 Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate content. Please try again.",
        variant: "destructive",
      });
    } finally {
      console.log('🏁 Finally block - resetting isGenerating to false');
      clearInterval(progressInterval);
      setIsGenerating(false);
    }
  };

  // Removed chat functionality - streamlined to Advanced Generation only

  // Removed publishContent function since we're using direct workflow

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">AutoBlog Generator</h1>
          <p className="text-gray-600 dark:text-gray-400">Generate professional blog content using TOGNINJA assistant</p>
          <div className="text-xs text-green-600 mt-1">✅ Using correct /api/autoblog/generate endpoint</div>
        </div>

        <div className="space-y-6">
          {/* AutoBlog Features */}
          <Card>
            <CardHeader>
              <CardTitle>AutoBlog Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">AI Content Generation</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">SEO + Competitive Intelligence</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Keyword Research & Review Mining</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Streamlined Blog Creation</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <Button 
                  onClick={handleFixBlogFormatting}
                  variant="outline" 
                  size="sm"
                  className="text-xs"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Fix Blog Formatting
                </Button>
                <p className="text-xs text-gray-500 mt-1">Convert existing blog posts from wall-of-text to structured format</p>
              </div>
            </CardContent>
          </Card>

          {/* Single Column Layout - Progress bar and completion buttons integrated */}
          <Card>
            <CardHeader>
              <CardTitle>Generate Blog Post</CardTitle>
              <CardDescription>Upload up to 3 images from your photography session</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Session Images */}
                <div>
                  <Label className="text-base font-medium">Session Images *</Label>
                  <div className="mt-2">
                    <div 
                      className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Click to select images</span>
                        <br />
                        Max 3 images, 10MB each
                      </div>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                      multiple
                      className="hidden"
                    />
                  </div>
                  
                  {uploadedImages.length > 0 && (
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {uploadedImages.map((img, idx) => (
                        <div key={idx} className="relative">
                          <img 
                            src={img.preview} 
                            alt={img.name}
                            className="w-full h-20 object-cover rounded border"
                          />
                          <button
                            onClick={() => removeImage(idx)}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Content Guidance */}
                <div>
                  <Label htmlFor="guidance" className="text-base font-medium">Content Guidance (Optional)</Label>
                  <Textarea
                    id="guidance"
                    placeholder="Tell the AI about the session... e.g., This was a family portrait session in Schönbrunn Park during golden hour..."
                    value={contentGuidance}
                    onChange={(e) => setContentGuidance(e.target.value)}
                    rows={3}
                    className="mt-2"
                  />
                </div>

                {/* Content Language */}
                <div>
                  <Label className="text-base font-medium">Content Language</Label>
                  <Select value={contentLanguage} onValueChange={setContentLanguage}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deutsch">Deutsch (German)</SelectItem>
                      <SelectItem value="english">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Website URL */}
                <div>
                  <Label htmlFor="website-url" className="text-base font-medium">Website URL (for brand voice)</Label>
                  <Input
                    id="website-url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className="mt-2"
                  />
                </div>

                {/* Custom URL Slug */}
                <div>
                  <Label htmlFor="custom-slug" className="text-base font-medium">Custom URL Slug (Optional)</Label>
                  <Input
                    id="custom-slug"
                    placeholder="e.g. my-custom-blog-post-url"
                    value={customSlug}
                    onChange={(e) => setCustomSlug(e.target.value)}
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">If specified, this exact URL slug will be used instead of auto-generating one from the title</p>
                </div>

                {/* Publishing Options */}
                <div>
                  <Label className="text-base font-medium">Publishing Options</Label>
                  <RadioGroup value={publishingOption} onValueChange={setPublishingOption} className="mt-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="draft" id="draft" />
                      <Label htmlFor="draft">Save as Draft</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="publish" id="publish" />
                      <Label htmlFor="publish">Publish Immediately</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="schedule" id="schedule" />
                      <Label htmlFor="schedule">Schedule for Later</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Progress Bar - Integrated into main form */}
                {isGenerating && (
                  <div className="space-y-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border">
                    <div className="text-center">
                      <Wand2 className="h-8 w-8 mx-auto text-purple-500 animate-spin mb-3" />
                      <p className="font-medium text-lg mb-2">{progressMessage}</p>
                      <Progress value={generationProgress} className="w-full mb-2" />
                      <p className="text-sm text-gray-500">{generationProgress}% complete</p>
                    </div>
                  </div>
                )}

                {/* Completion Status - Integrated into main form */}
                {completedPost && (
                  <div className="space-y-4 p-6 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200">
                    <div className="text-center">
                      <div className="flex justify-center mb-4">
                        <div className="bg-green-100 rounded-full p-3">
                          <Check className="h-8 w-8 text-green-600" />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="font-semibold text-lg">Blog Post Created Successfully!</h3>
                        <p className="text-sm font-medium">{completedPost.title}</p>
                        <Badge variant={completedPost.status === 'published' ? 'default' : 'secondary'}>
                          {completedPost.status === 'published' ? 'Published' : 'Draft'}
                        </Badge>
                      </div>

                      <div className="flex gap-3 justify-center pt-4">
                        <Button onClick={viewPost} variant="outline" className="flex-1">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View Completed Blog
                        </Button>
                        <Button onClick={createAnotherPost} className="flex-1">
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Create New Blog
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <Button 
                  onClick={generateBlogPost} 
                  disabled={isGenerating || uploadedImages.length === 0 || completedPost !== null}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Wand2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Content...
                    </>
                  ) : completedPost ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Blog Created Successfully
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Generate Blog Post
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
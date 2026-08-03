import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Upload, Wand2, FileText, Check, X, Sparkles } from 'lucide-react';
import { SITE } from '../../config/site';

interface GeneratedContent {
  title: string;
  content: string;
  excerpt: string;
  metaDescription: string;
  slug: string;
  tags: string[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function AutoBlogGeneratorFixed() {
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [contentGuidance, setContentGuidance] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [publishingOption, setPublishingOption] = useState('draft');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [activeTab, setActiveTab] = useState('advanced');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [threadId, setThreadId] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.slice(0, 3).filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} is larger than 10MB`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    setUploadedImages(prev => [...prev, ...validFiles].slice(0, 3));
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const generateBlogPost = async () => {
    if (uploadedImages.length === 0) {
      toast({
        title: "Images required",
        description: "Please upload at least one image to generate content.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    console.log('🚀 Starting blog generation with FIXED component...');

    try {
      const formData = new FormData();
      
      // Add images
      uploadedImages.forEach((file, index) => {
        formData.append(`images`, file);
      });

      // FIX #2: Add ALL form data properly
      formData.append('contentGuidance', contentGuidance);
      formData.append('language', 'de'); // German language
      formData.append('siteUrl', SITE.url);
      formData.append('customSlug', customSlug);
      formData.append('publishOption', publishingOption); // Note: using publishOption not publishingOption

      console.log('📤 Sending request to /api/autoblog/generate...');
      const startTime = Date.now();

      const response = await fetch('/api/autoblog/generate', {
        method: 'POST',
        body: formData,
      });

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
        console.log('🎉 Success! Parsing blog post data...');
        const generatedPost = data.post;
        const structuredContent: GeneratedContent = {
          title: generatedPost.title || "Professionelle Familienfotografie in Wien",
          content: generatedPost.content_html || generatedPost.content || "",
          excerpt: generatedPost.excerpt || "",
          metaDescription: generatedPost.meta_description || "",
          slug: generatedPost.slug || customSlug || "familienfotografie-wien",
          tags: generatedPost.tags || []
        };

        console.log('📝 Structured content created:', {
          title: structuredContent.title.substring(0, 50) + '...',
          contentLength: structuredContent.content.length,
          tagsCount: structuredContent.tags.length
        });

        setGeneratedContent(structuredContent);
        
        toast({
          title: "Content generated successfully! 🎉",
          description: `Blog post created using TOGNINJA BLOG WRITER Assistant (${data.ai?.method || 'Assistant API'})`,
        });
        
        console.log('🎊 Generation completed successfully!');
      } else {
        console.log('❌ Response missing success/post data:', data);
        throw new Error(data.error || 'Failed to generate structured content - invalid response format');
      }

    } catch (error) {
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
      setIsGenerating(false);
    }
  };

  const publishContent = async () => {
    if (!generatedContent) return;

    try {
      console.log('📝 Publishing blog post with status:', publishingOption);
      
      // Create new blog post with generated content
      const response = await fetch('/api/blog/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: generatedContent.title,
          slug: generatedContent.slug,
          content: generatedContent.content,
          content_html: generatedContent.content,
          excerpt: generatedContent.excerpt,
          meta_description: generatedContent.metaDescription,
          tags: generatedContent.tags,
          status: publishingOption === 'draft' ? 'DRAFT' : publishingOption === 'publish' ? 'PUBLISHED' : 'SCHEDULED',
          published_at: publishingOption === 'publish' ? new Date().toISOString() : null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create blog post');
      }

      const result = await response.json();
      console.log('✅ Blog post created:', result);

      toast({
        title: "Success!",
        description: `Blog post ${publishingOption === 'draft' ? 'saved as draft' : publishingOption === 'publish' ? 'published successfully' : 'scheduled for publication'}`,
      });

      // Reset the form
      setGeneratedContent(null);
      setUploadedImages([]);
      setContentGuidance('');
      setCustomSlug('');
      
      // Open blog management page
      setTimeout(() => {
        window.open('/admin/blog', '_blank');
      }, 1000);
      
    } catch (error) {
      console.error('❌ Publishing error:', error);
      toast({
        title: "Publishing failed",
        description: error.message || "Failed to publish content. Please try again.",
        variant: "destructive",
      });
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: userMessage }]);

    try {
      const response = await fetch('/api/autoblog/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          threadId,
          assistantId: 'asst_nlyO3yRav2oWtyTvkq0cHZaU'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      setThreadId(data.threadId);
      setChatMessages(prev => [...prev, { role: "assistant", content: data.response }]);

    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: "Chat failed",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          🚀 AutoBlog Generator FIXED v4.0
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Generate professional blog content using TOGNINJA assistant - COMPLETELY FIXED VERSION
        </p>
        <div className="text-xs text-green-600 mt-1">
          ✅ Using correct /api/autoblog/generate endpoint | ✅ Fixed HTML rendering | ✅ Working publish functionality
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-fit grid-cols-2 mb-6">
          <TabsTrigger value="chat">Direct Chat Interface</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Generation</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5" />
                TOGNINJA Assistant Chat
              </CardTitle>
              <CardDescription>
                Direct conversation with your trained content writing assistant
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border rounded-lg p-4 h-96 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                  {chatMessages.length === 0 ? (
                    <p className="text-gray-500 text-center">Start a conversation with TOGNINJA assistant...</p>
                  ) : (
                    <div className="space-y-3">
                      {chatMessages.map((msg, idx) => (
                        <div key={idx} className={`p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-100 dark:bg-blue-900 ml-12' : 'bg-white dark:bg-gray-800 mr-12'}`}>
                          <div className="font-semibold text-sm mb-1">
                            {msg.role === 'user' ? 'You' : 'TOGNINJA Assistant'}
                          </div>
                          <div className="text-sm">{msg.content}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your message to TOGNINJA assistant..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendChatMessage()}
                    rows={2}
                  />
                  <Button onClick={sendChatMessage} disabled={!chatInput.trim()}>
                    Send
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
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
                  <span className="text-sm">SEO Optimization</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Multi-language Support</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Direct Chat Interface</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Side - Generate Blog Post */}
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

                  {/* Uploaded Images Preview */}
                  {uploadedImages.length > 0 && (
                    <div className="mt-4 grid grid-cols-3 gap-4">
                      {uploadedImages.map((file, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Upload ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border"
                          />
                          <button
                            onClick={() => removeImage(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                          <div className="mt-1 text-xs text-gray-500 truncate">
                            {file.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Content Guidance */}
                <div>
                  <Label htmlFor="content-guidance" className="text-base font-medium">Content Guidance (Optional)</Label>
                  <Textarea
                    id="content-guidance"
                    placeholder="Tell the AI assistant about this session, e.g., 'This was a beautiful family portrait session in Schönbrunn Park during golden hour...'"
                    value={contentGuidance}
                    onChange={(e) => setContentGuidance(e.target.value)}
                    className="mt-2"
                    rows={4}
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

                <Button 
                  onClick={generateBlogPost} 
                  disabled={isGenerating || uploadedImages.length === 0}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Wand2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Content...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Blog Post
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Right Side - Generated Content */}
            <Card>
              <CardHeader>
                <CardTitle>Generated Content Preview</CardTitle>
                <CardDescription>Preview and review your AI-generated blog post</CardDescription>
              </CardHeader>
              <CardContent>
                {!generatedContent ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <FileText className="h-16 w-16 mb-4" />
                    <p className="text-center">Your generated content will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">{generatedContent.title}</h3>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {generatedContent.tags.map((tag, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-600 dark:text-gray-400 border-l-4 border-blue-500 pl-3">
                      <strong>Meta Description:</strong> {generatedContent.metaDescription}
                    </div>
                    
                    <div className="text-sm text-gray-600 dark:text-gray-400 border-l-4 border-green-500 pl-3">
                      <strong>Excerpt:</strong> {generatedContent.excerpt}
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg max-h-64 overflow-y-auto">
                      <div 
                        className="prose prose-sm max-w-none dark:prose-invert"
                        dangerouslySetInnerHTML={{ __html: generatedContent.content }}
                      />
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button onClick={publishContent} className="flex-1">
                        {publishingOption === 'draft' ? '📝 Save Draft' : publishingOption === 'publish' ? '🚀 Publish Now' : '⏰ Schedule Post'}
                      </Button>
                      <Button variant="outline" onClick={() => setGeneratedContent(null)}>
                        Clear
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
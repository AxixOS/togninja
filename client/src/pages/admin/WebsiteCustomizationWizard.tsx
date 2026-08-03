import React, { useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { 
  Globe, 
  Wand2, 
  FileText, 
  Image, 
  Settings, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  Upload,
  ExternalLink,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';

interface ScrapedData {
  url: string;
  title: string;
  metaDescription: string;
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
  };
  content: {
    aboutText: string;
    services: string[];
    contactInfo: {
      phone?: string;
      email?: string;
      address?: string;
    };
    testimonials: string[];
    socialLinks: string[];
  };
  images: {
    logo?: string;
    gallery: string[];
    hero: string[];
  };
  seoAnalysis: {
    issues: string[];
    recommendations: string[];
    score: number;
  };
}

const WebsiteCustomizationWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [scrapedData, setScrapedData] = useState<ScrapedData | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [customizations, setCustomizations] = useState<any>({});

  const steps = [
    { id: 1, title: 'Website URL', icon: Globe, description: 'Enter your current website URL' },
    { id: 2, title: 'Data Analysis', icon: Wand2, description: 'AI analyzes your content and SEO' },
    { id: 3, title: 'Template Selection', icon: FileText, description: 'Choose your new design template' },
    { id: 4, title: 'Content Optimization', icon: FileText, description: 'Review and approve SEO improvements' },
    { id: 5, title: 'Image Integration', icon: Image, description: 'Import and organize your photos' },
    { id: 6, title: 'Final Setup', icon: Settings, description: 'Configure forms and launch' }
  ];

  const handleScrapeWebsite = async () => {
    if (!websiteUrl) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/scrape-website', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: websiteUrl }),
      });
      
      const data = await response.json();
      setScrapedData(data);
      setCurrentStep(2);
    } catch (error) {
      // console.error removed
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    setCurrentStep(4);
  };

  const renderStep1 = () => (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Globe className="mr-2" />
            Enter Your Current Website URL
          </CardTitle>
          <CardDescription>
            Our AI will analyze your existing website content, images, and SEO to create an optimized photography website
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Website URL</label>
            <Input
              type="url"
              placeholder="https://your-photography-website.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className="w-full"
            />
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">What we'll analyze:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Content and copy for SEO optimization</li>
              <li>• Portfolio images and galleries</li>
              <li>• Contact information and services</li>
              <li>• Current SEO performance</li>
              <li>• Brand colors and styling</li>
            </ul>
          </div>

          <Button 
            onClick={handleScrapeWebsite} 
            disabled={!websiteUrl || isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Website...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                Analyze Website
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderStep2 = () => (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Wand2 className="mr-2" />
            Website Analysis Complete
          </CardTitle>
          <CardDescription>
            Here's what we found on your current website
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="content" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="images">Images</TabsTrigger>
              <TabsTrigger value="seo">SEO Analysis</TabsTrigger>
              <TabsTrigger value="contact">Contact Info</TabsTrigger>
            </TabsList>
            
            <TabsContent value="content" className="mt-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Current Title</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{scrapedData?.title}</p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">About Section</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{scrapedData?.content.aboutText}</p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Services Detected</h4>
                  <div className="flex flex-wrap gap-2">
                    {scrapedData?.content.services.map((service, index) => (
                      <Badge key={index} variant="secondary">{service}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="images" className="mt-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Logo</h4>
                  {scrapedData?.images.logo ? (
                    <img src={scrapedData.images.logo} alt="Logo" className="h-12 w-auto" />
                  ) : (
                    <p className="text-sm text-gray-500">No logo detected</p>
                  )}
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Gallery Images ({scrapedData?.images.gallery.length || 0})</h4>
                  <div className="grid grid-cols-6 gap-2">
                    {scrapedData?.images.gallery.slice(0, 12).map((img, index) => (
                      <img key={index} src={img} alt={`Gallery ${index + 1}`} className="w-full h-20 object-cover rounded" />
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="seo" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">SEO Score</h4>
                  <Badge variant={scrapedData?.seoAnalysis.score >= 80 ? "default" : "secondary"}>
                    {scrapedData?.seoAnalysis.score}/100
                  </Badge>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2 text-red-600">Issues Found</h4>
                  <ul className="space-y-1">
                    {scrapedData?.seoAnalysis.issues.map((issue, index) => (
                      <li key={index} className="text-sm text-red-600 flex items-center">
                        <AlertCircle className="mr-2 h-4 w-4" />
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2 text-green-600">Recommendations</h4>
                  <ul className="space-y-1">
                    {scrapedData?.seoAnalysis.recommendations.map((rec, index) => (
                      <li key={index} className="text-sm text-green-600 flex items-center">
                        <CheckCircle className="mr-2 h-4 w-4" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="contact" className="mt-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Contact Information</h4>
                  <div className="space-y-2">
                    <p className="text-sm"><strong>Phone:</strong> {scrapedData?.content.contactInfo.phone || 'Not found'}</p>
                    <p className="text-sm"><strong>Email:</strong> {scrapedData?.content.contactInfo.email || 'Not found'}</p>
                    <p className="text-sm"><strong>Address:</strong> {scrapedData?.content.contactInfo.address || 'Not found'}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Social Links</h4>
                  <div className="space-y-1">
                    {scrapedData?.content.socialLinks.map((link, index) => (
                      <a key={index} href={link} className="text-sm text-blue-600 hover:underline flex items-center">
                        <ExternalLink className="mr-1 h-3 w-3" />
                        {link}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="mt-6 flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={() => setCurrentStep(3)}>
              Choose Template
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderStep3 = () => (
    <div className="max-w-6xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Choose Your Template</CardTitle>
          <CardDescription>
            Select a template that matches your photography style
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Template selection would go here - use existing TemplateSelector component */}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      default:
        return renderStep1();
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                currentStep >= step.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {currentStep > step.id ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <step.icon className="h-5 w-5" />
                )}
              </div>
              <div className="ml-2 hidden sm:block">
                <p className={`text-sm font-medium ${
                  currentStep >= step.id ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {step.title}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-12 h-0.5 ml-4 ${
                  currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Current Step Content */}
        {renderCurrentStep()}
      </div>
    </AdminLayout>
  );
};

export default WebsiteCustomizationWizard;
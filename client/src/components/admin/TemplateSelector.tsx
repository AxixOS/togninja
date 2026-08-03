import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// Removed Tabs import - using custom tabs implementation
import { Eye, Check, Crown, Palette, Layout, Smartphone } from 'lucide-react';

interface TemplateConfig {
  id: string;
  name: string;
  description: string;
  category: 'minimal' | 'artistic' | 'classic' | 'modern' | 'bold';
  previewImage: string;
  demoUrl: string;
  features: string[];
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  isPremium: boolean;
}

interface TemplateSelectorProps {
  currentTemplate?: string;
  onTemplateSelect: (templateId: string) => void;
  onPreview: (templateId: string) => void;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  currentTemplate,
  onTemplateSelect,
  onPreview
}) => {
  const [templates, setTemplates] = useState<TemplateConfig[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      // For now, using mock data - replace with API call
      const mockTemplates: TemplateConfig[] = [
        {
          id: 'template-01-modern-minimal',
          name: 'Modern Minimal',
          description: 'Clean, minimalist design focusing on your photography',
          category: 'minimal',
          previewImage: '/templates/previews/modern-minimal.jpg',
          demoUrl: '/demo/modern-minimal',
          features: ['Clean Layout', 'Fast Loading', 'Mobile First', 'SEO Optimized'],
          colorScheme: {
            primary: '#1a1a1a',
            secondary: '#f5f5f5',
            accent: '#007acc',
            background: '#ffffff'
          },
          isPremium: false
        },
        {
          id: 'template-02-elegant-classic',
          name: 'Elegant Classic',
          description: 'Timeless elegance with sophisticated typography',
          category: 'classic',
          previewImage: '/templates/previews/elegant-classic.jpg',
          demoUrl: '/demo/elegant-classic',
          features: ['Elegant Typography', 'Sophisticated Layout', 'Gallery Focus', 'Contact Integration'],
          colorScheme: {
            primary: '#2c2c2c',
            secondary: '#d4af37',
            accent: '#8b4513',
            background: '#faf8f5'
          },
          isPremium: false
        },
        {
          id: 'template-03-bold-artistic',
          name: 'Bold Artistic',
          description: 'Creative layout for artistic photographers',
          category: 'artistic',
          previewImage: '/templates/previews/bold-artistic.jpg',
          demoUrl: '/demo/bold-artistic',
          features: ['Creative Layouts', 'Animation Effects', 'Artistic Focus', 'Portfolio Showcase'],
          colorScheme: {
            primary: '#ff6b35',
            secondary: '#2a2d34',
            accent: '#ffd23f',
            background: '#1a1a1a'
          },
          isPremium: true
        },
        {
          id: 'template-04-wedding-romance',
          name: 'Wedding Romance',
          description: 'Romantic design perfect for wedding photographers',
          category: 'classic',
          previewImage: '/templates/previews/wedding-romance.jpg',
          demoUrl: '/demo/wedding-romance',
          features: ['Romantic Elements', 'Couple Focus', 'Elegant Gallery', 'Booking System'],
          colorScheme: {
            primary: '#d4a574',
            secondary: '#f7f3f0',
            accent: '#9b5a42',
            background: '#fff'
          },
          isPremium: true
        },
        {
          id: 'template-05-family-warm',
          name: 'Family Warmth',
          description: 'Warm, inviting design for family photographers',
          category: 'modern',
          previewImage: '/templates/previews/family-warm.jpg',
          demoUrl: '/demo/family-warm',
          features: ['Family Focused', 'Warm Colors', 'Child Friendly', 'Session Booking'],
          colorScheme: {
            primary: '#7c3aed',
            secondary: '#fbbf24',
            accent: '#10b981',
            background: '#fefefe'
          },
          isPremium: false
        }
      ];
      
      setTemplates(mockTemplates);
      setLoading(false);
    } catch (error) {
      // console.error removed
      setLoading(false);
    }
  };

  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(template => template.category === selectedCategory);

  const categories = [
    { id: 'all', name: 'All Templates', icon: Layout },
    { id: 'minimal', name: 'Minimal', icon: Smartphone },
    { id: 'classic', name: 'Classic', icon: Palette },
    { id: 'modern', name: 'Modern', icon: Layout },
    { id: 'artistic', name: 'Artistic', icon: Palette },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Choose Your Template</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Select from 25 professionally designed templates to match your photography style. 
          Each template is fully customizable and optimized for performance.
        </p>
      </div>

      <div className="w-full">
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    selectedCategory === category.id
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon size={16} />
                  {category.name}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
              <Card 
                key={template.id} 
                className={`relative overflow-hidden transition-all hover:shadow-lg ${
                  currentTemplate === template.id 
                    ? 'ring-2 ring-purple-500 shadow-lg' 
                    : 'hover:shadow-md'
                }`}
              >
                {template.isPremium && (
                  <div className="absolute top-3 right-3 z-10">
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      <Crown size={12} className="mr-1" />
                      Premium
                    </Badge>
                  </div>
                )}

                {currentTemplate === template.id && (
                  <div className="absolute top-3 left-3 z-10">
                    <Badge className="bg-green-100 text-green-800">
                      <Check size={12} className="mr-1" />
                      Active
                    </Badge>
                  </div>
                )}

                <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200">
                  <img 
                    src={template.previewImage}
                    alt={template.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback for missing preview images
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.innerHTML = `
                        <div class="w-full h-full flex items-center justify-center bg-gradient-to-br" style="background: linear-gradient(135deg, ${template.colorScheme.primary}, ${template.colorScheme.secondary})">
                          <div class="text-center text-white">
                            <h3 class="text-lg font-bold">${template.name}</h3>
                            <p class="text-sm opacity-90">${template.category}</p>
                          </div>
                        </div>
                      `;
                    }}
                  />
                </div>

                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <div className="flex gap-1">
                      {Object.values(template.colorScheme).slice(0, 3).map((color, index) => (
                        <div 
                          key={index}
                          className="w-4 h-4 rounded-full border border-gray-200"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <CardDescription className="text-sm">
                    {template.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-1 mb-4">
                    {template.features.slice(0, 3).map((feature) => (
                      <Badge key={feature} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => onPreview(template.id)}
                      className="flex-1"
                    >
                      <Eye size={14} className="mr-1" />
                      Preview
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => onTemplateSelect(template.id)}
                      disabled={currentTemplate === template.id}
                      className="flex-1"
                    >
                      {currentTemplate === template.id ? 'Active' : 'Select'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No templates found in this category.</p>
        </div>
      )}
    </div>
  );
};

export default TemplateSelector;
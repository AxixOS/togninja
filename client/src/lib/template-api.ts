// Template API functions for studio customization
import { SITE } from '../config/site';

export interface TemplateConfig {
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

export interface StudioConfig {
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

// Get all available templates
export const getAvailableTemplates = async (): Promise<TemplateConfig[]> => {
  try {
    const response = await fetch('/api/templates');
    if (!response.ok) {
      throw new Error('Failed to fetch templates');
    }
    return response.json();
  } catch (error) {
    // console.error removed
    // Return mock data for development
    return getMockTemplates();
  }
};

// Get studio configuration
export const getStudioConfig = async (studioId?: string): Promise<StudioConfig> => {
  try {
    const url = studioId ? `/api/studio/${studioId}` : '/api/studio/current';
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch studio config');
    }
    return response.json();
  } catch (error) {
    // console.error removed
    // Return mock data for development
    return getMockStudioConfig();
  }
};

// Update studio configuration
export const updateStudioConfig = async (config: Partial<StudioConfig>): Promise<StudioConfig> => {
  try {
    const response = await fetch('/api/studio/config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update studio config');
    }
    
    return response.json();
  } catch (error) {
    // console.error removed
    throw error;
  }
};

// Apply template to studio
export const applyTemplate = async (templateId: string): Promise<void> => {
  try {
    const response = await fetch('/api/studio/template', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ templateId }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to apply template');
    }
  } catch (error) {
    // console.error removed
    throw error;
  }
};

// Generate template preview URL
export const getTemplatePreviewUrl = (templateId: string): string => {
  return `/api/templates/${templateId}/preview`;
};

// Mock data for development
const getMockTemplates = (): TemplateConfig[] => [
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

const getMockStudioConfig = (): StudioConfig => ({
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
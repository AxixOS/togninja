import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

/**
 * Template/Theme Configuration
 * 
 * IMPORTANT: The "naf-premium" template is the DEFAULT New Age Fotografie design.
 * When no template is selected (null), the site renders exactly as before.
 * The data-template attribute is ONLY added when a user explicitly chooses a theme.
 */

export interface Template {
  id: string;
  name: string;
  description: string;
  preview: string;
  category: 'modern' | 'classic' | 'minimal' | 'bold' | 'elegant' | 'premium';
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  isDefault?: boolean;
}

// Available templates - NAF Premium is marked as default but doesn't require data-template
export const templates: Template[] = [
  {
    id: 'naf-premium',
    name: 'Premium',
    description: 'The original premium design with gradient hero and elegant styling',
    preview: '/templates/naf-premium-preview.png',
    category: 'premium',
    colors: {
      primary: '#8B5CF6',
      secondary: '#EC4899',
      accent: '#F59E0B',
      background: '#FFFFFF',
      text: '#1F2937',
    },
    fonts: {
      heading: 'Poppins',
      body: 'Inter',
    },
    isDefault: true,
  },
  {
    id: 'modern-dark',
    name: 'Modern Dark',
    description: 'Sleek dark theme with vibrant accents for a contemporary feel',
    preview: '/templates/modern-dark-preview.png',
    category: 'modern',
    colors: {
      primary: '#6366F1',
      secondary: '#A855F7',
      accent: '#22D3EE',
      background: '#0F172A',
      text: '#F8FAFC',
    },
    fonts: {
      heading: 'Inter',
      body: 'Inter',
    },
  },
  {
    id: 'classic-elegant',
    name: 'Classic Elegant',
    description: 'Timeless design with serif fonts and warm gold accents',
    preview: '/templates/classic-elegant-preview.png',
    category: 'elegant',
    colors: {
      primary: '#B8860B',
      secondary: '#8B4513',
      accent: '#D4AF37',
      background: '#FFFEF7',
      text: '#2C1810',
    },
    fonts: {
      heading: 'Playfair Display',
      body: 'Lora',
    },
  },
  {
    id: 'minimal-clean',
    name: 'Minimal Clean',
    description: 'Ultra-clean design with lots of whitespace and subtle shadows',
    preview: '/templates/minimal-clean-preview.png',
    category: 'minimal',
    colors: {
      primary: '#18181B',
      secondary: '#52525B',
      accent: '#3B82F6',
      background: '#FAFAFA',
      text: '#18181B',
    },
    fonts: {
      heading: 'DM Sans',
      body: 'DM Sans',
    },
  },
  {
    id: 'bold-vibrant',
    name: 'Bold Vibrant',
    description: 'Eye-catching design with bold colors and strong typography',
    preview: '/templates/bold-vibrant-preview.png',
    category: 'bold',
    colors: {
      primary: '#DC2626',
      secondary: '#EA580C',
      accent: '#FACC15',
      background: '#FFFFFF',
      text: '#171717',
    },
    fonts: {
      heading: 'Montserrat',
      body: 'Open Sans',
    },
  },
  {
    id: 'soft-pastel',
    name: 'Soft Pastel',
    description: 'Gentle pastel colors perfect for baby and family photography',
    preview: '/templates/soft-pastel-preview.png',
    category: 'elegant',
    colors: {
      primary: '#F9A8D4',
      secondary: '#C4B5FD',
      accent: '#67E8F9',
      background: '#FDF4FF',
      text: '#4C1D95',
    },
    fonts: {
      heading: 'Quicksand',
      body: 'Nunito',
    },
  },
  {
    id: 'forest-nature',
    name: 'Forest Nature',
    description: 'Earthy greens and natural tones for outdoor photography',
    preview: '/templates/forest-nature-preview.png',
    category: 'classic',
    colors: {
      primary: '#166534',
      secondary: '#854D0E',
      accent: '#65A30D',
      background: '#F7FEE7',
      text: '#1A2E05',
    },
    fonts: {
      heading: 'Merriweather',
      body: 'Source Sans Pro',
    },
  },
  {
    id: 'ocean-breeze',
    name: 'Ocean Breeze',
    description: 'Cool blues and teals reminiscent of coastal photography',
    preview: '/templates/ocean-breeze-preview.png',
    category: 'modern',
    colors: {
      primary: '#0891B2',
      secondary: '#0284C7',
      accent: '#14B8A6',
      background: '#F0FDFA',
      text: '#134E4A',
    },
    fonts: {
      heading: 'Raleway',
      body: 'Lato',
    },
  },
  {
    id: 'luxury-noir',
    name: 'Luxury Noir',
    description: 'High-end black and gold theme for luxury portrait studios',
    preview: '/templates/luxury-noir-preview.png',
    category: 'elegant',
    colors: {
      primary: '#171717',
      secondary: '#404040',
      accent: '#D4AF37',
      background: '#FAFAFA',
      text: '#171717',
    },
    fonts: {
      heading: 'Cormorant Garamond',
      body: 'Libre Baskerville',
    },
  },
  {
    id: 'sunset-warm',
    name: 'Sunset Warm',
    description: 'Warm orange and coral tones for a cozy, inviting feel',
    preview: '/templates/sunset-warm-preview.png',
    category: 'bold',
    colors: {
      primary: '#EA580C',
      secondary: '#DC2626',
      accent: '#FBBF24',
      background: '#FFFBEB',
      text: '#451A03',
    },
    fonts: {
      heading: 'Josefin Sans',
      body: 'Cabin',
    },
  },
  {
    id: 'tech-modern',
    name: 'Tech Modern',
    description: 'Futuristic design for commercial and corporate photography',
    preview: '/templates/tech-modern-preview.png',
    category: 'modern',
    colors: {
      primary: '#7C3AED',
      secondary: '#2563EB',
      accent: '#10B981',
      background: '#F5F3FF',
      text: '#1E1B4B',
    },
    fonts: {
      heading: 'Space Grotesk',
      body: 'IBM Plex Sans',
    },
  },
  {
    id: 'vintage-film',
    name: 'Vintage Film',
    description: 'Nostalgic design inspired by analog film photography',
    preview: '/templates/vintage-film-preview.png',
    category: 'classic',
    colors: {
      primary: '#78716C',
      secondary: '#A8A29E',
      accent: '#C2410C',
      background: '#FAF5F0',
      text: '#292524',
    },
    fonts: {
      heading: 'Crimson Text',
      body: 'PT Serif',
    },
  },
];

interface TemplateContextType {
  currentTemplate: Template | null;
  setTemplate: (templateId: string | null) => void;
  templates: Template[];
  isThemeActive: boolean;
}

const TemplateContext = createContext<TemplateContextType | undefined>(undefined);

const STORAGE_KEY = 'naf-selected-template';

export function TemplateProvider({ children }: { children: ReactNode }) {
  // Start with null - no theme applied by default to preserve original design
  const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null);
  const [isThemeActive, setIsThemeActive] = useState(false);

  // Load saved template preference on mount
  useEffect(() => {
    const savedTemplateId = localStorage.getItem(STORAGE_KEY);
    
    if (savedTemplateId && savedTemplateId !== 'null' && savedTemplateId !== 'naf-premium') {
      // User has explicitly chosen a non-default template
      const template = templates.find(t => t.id === savedTemplateId);
      if (template) {
        setCurrentTemplate(template);
        setIsThemeActive(true);
      }
    }
    // If no saved template or it's the default, keep currentTemplate as null
    // This ensures the original design renders without any data-template attribute
  }, []);

  // Apply template to document
  useEffect(() => {
    if (currentTemplate && isThemeActive) {
      // Apply theme via data-template attribute
      document.documentElement.setAttribute('data-template', currentTemplate.id);
      
      // Apply CSS custom properties for the theme
      const root = document.documentElement;
      root.style.setProperty('--template-primary', currentTemplate.colors.primary);
      root.style.setProperty('--template-secondary', currentTemplate.colors.secondary);
      root.style.setProperty('--template-accent', currentTemplate.colors.accent);
      root.style.setProperty('--template-bg', currentTemplate.colors.background);
      root.style.setProperty('--template-text', currentTemplate.colors.text);
      root.style.setProperty('--template-font-heading', currentTemplate.fonts.heading);
      root.style.setProperty('--template-font-body', currentTemplate.fonts.body);
    } else {
      // Remove theme - restore original New Age Fotografie design
      document.documentElement.removeAttribute('data-template');
      
      // Clear custom properties
      const root = document.documentElement;
      root.style.removeProperty('--template-primary');
      root.style.removeProperty('--template-secondary');
      root.style.removeProperty('--template-accent');
      root.style.removeProperty('--template-bg');
      root.style.removeProperty('--template-text');
      root.style.removeProperty('--template-font-heading');
      root.style.removeProperty('--template-font-body');
    }
  }, [currentTemplate, isThemeActive]);

  const setTemplate = (templateId: string | null) => {
    if (!templateId || templateId === 'naf-premium') {
      // Reset to default - remove theme entirely
      setCurrentTemplate(null);
      setIsThemeActive(false);
      localStorage.removeItem(STORAGE_KEY);
    } else {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setCurrentTemplate(template);
        setIsThemeActive(true);
        localStorage.setItem(STORAGE_KEY, templateId);
      }
    }
  };

  return (
    <TemplateContext.Provider value={{ 
      currentTemplate, 
      setTemplate, 
      templates,
      isThemeActive 
    }}>
      {children}
    </TemplateContext.Provider>
  );
}

export function useTemplate() {
  const context = useContext(TemplateContext);
  if (context === undefined) {
    throw new Error('useTemplate must be used within a TemplateProvider');
  }
  return context;
}

export default TemplateContext;

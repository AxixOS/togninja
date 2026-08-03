import { StudioConfig, TemplateDefinition } from '../shared/schema';

// Template system for multi-photographer deployment
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
  layout: {
    headerStyle: 'minimal' | 'centered' | 'split' | 'overlay';
    navigationStyle: 'horizontal' | 'sidebar' | 'hamburger';
    footerStyle: 'minimal' | 'detailed' | 'newsletter';
  };
  components: {
    heroSection: string;
    galleryLayout: string;
    contactForm: string;
    aboutSection: string;
  };
  isPremium: boolean;
}

// 25 Pre-defined Templates (from your Bolt.new designs)
export const AVAILABLE_TEMPLATES: TemplateConfig[] = [
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
    layout: {
      headerStyle: 'minimal',
      navigationStyle: 'horizontal',
      footerStyle: 'minimal'
    },
    components: {
      heroSection: 'full-screen-slider',
      galleryLayout: 'masonry-grid',
      contactForm: 'inline-simple',
      aboutSection: 'split-image-text'
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
    layout: {
      headerStyle: 'centered',
      navigationStyle: 'horizontal',
      footerStyle: 'detailed'
    },
    components: {
      heroSection: 'video-background',
      galleryLayout: 'justified-grid',
      contactForm: 'modal-popup',
      aboutSection: 'centered-text'
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
    layout: {
      headerStyle: 'overlay',
      navigationStyle: 'hamburger',
      footerStyle: 'minimal'
    },
    components: {
      heroSection: 'parallax-scroll',
      galleryLayout: 'creative-grid',
      contactForm: 'side-panel',
      aboutSection: 'video-intro'
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
    layout: {
      headerStyle: 'centered',
      navigationStyle: 'horizontal',
      footerStyle: 'newsletter'
    },
    components: {
      heroSection: 'romantic-slider',
      galleryLayout: 'romantic-grid',
      contactForm: 'wedding-form',
      aboutSection: 'story-timeline'
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
    layout: {
      headerStyle: 'split',
      navigationStyle: 'horizontal',
      footerStyle: 'detailed'
    },
    components: {
      heroSection: 'family-hero',
      galleryLayout: 'family-grid',
      contactForm: 'family-booking',
      aboutSection: 'photographer-story'
    },
    isPremium: false
  }
  // TODO: Import remaining 20 templates from Bolt.new
  // Use the template-import-guide.md for step-by-step instructions
];

// Template Import Helper
export class TemplateImporter {
  /**
   * Import a template from Bolt.new export
   * @param templateData - JSON config from Bolt.new
   * @param components - React components extracted from Bolt
   * @param assets - Images, CSS, fonts from template
   */
  static async importTemplate(
    templateData: any,
    components: Record<string, React.ComponentType>,
    assets: Record<string, string>
  ): Promise<TemplateConfig> {
    
    // Process template metadata
    const templateConfig: TemplateConfig = {
      id: templateData.id || `template-${Date.now()}`,
      name: templateData.name,
      description: templateData.description,
      category: templateData.category || 'modern',
      previewImage: `/templates/previews/${templateData.id}.jpg`,
      demoUrl: `/demo/${templateData.id}`,
      features: templateData.features || [],
      colorScheme: templateData.colorScheme || {
        primary: '#000000',
        secondary: '#ffffff',
        accent: '#007acc',
        background: '#ffffff'
      },
      layout: templateData.layout || {
        headerStyle: 'minimal',
        navigationStyle: 'horizontal',
        footerStyle: 'minimal'
      },
      components: templateData.components || {
        heroSection: 'default-hero',
        galleryLayout: 'default-grid',
        contactForm: 'default-form',
        aboutSection: 'default-about'
      },
      isPremium: templateData.isPremium || false
    };

    // Store components and assets
    await this.storeTemplateFiles(templateConfig.id, components, assets);
    
    return templateConfig;
  }

  /**
   * Store template files in the correct directory structure
   */
  static async storeTemplateFiles(
    templateId: string,
    components: Record<string, React.ComponentType>,
    assets: Record<string, string>
  ): Promise<void> {
    // Implementation would store files in /templates/{templateId}/
    console.log(`Storing template ${templateId} files...`);
  }

  /**
   * Generate CSS variables for template
   */
  static generateTemplateCSS(templateConfig: TemplateConfig): string {
    const { colorScheme } = templateConfig;
    
    return `
      .template-${templateConfig.id} {
        --primary-color: ${colorScheme.primary};
        --secondary-color: ${colorScheme.secondary};
        --accent-color: ${colorScheme.accent};
        --background-color: ${colorScheme.background};
      }
    `;
  }
}

export class TemplateManager {
  
  static getTemplate(templateId: string): TemplateConfig | undefined {
    return AVAILABLE_TEMPLATES.find(template => template.id === templateId);
  }
  
  static getAllTemplates(): TemplateConfig[] {
    return AVAILABLE_TEMPLATES;
  }
  
  static getTemplatesByCategory(category: string): TemplateConfig[] {
    return AVAILABLE_TEMPLATES.filter(template => template.category === category);
  }
  
  static applyTemplate(studioConfig: StudioConfig, templateId: string): Partial<StudioConfig> {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }
    
    return {
      ...studioConfig,
      activeTemplate: templateId,
      primaryColor: template.colorScheme.primary,
      secondaryColor: template.colorScheme.secondary,
      // Apply template-specific configurations
    };
  }
  
  static generateTemplateCSS(template: TemplateConfig): string {
    return `
      :root {
        --primary-color: ${template.colorScheme.primary};
        --secondary-color: ${template.colorScheme.secondary};
        --accent-color: ${template.colorScheme.accent};
        --background-color: ${template.colorScheme.background};
      }
      
      .template-${template.id} {
        /* Template-specific styles */
      }
    `;
  }
}
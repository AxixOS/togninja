import React from 'react';
import { useTemplate, templates } from '../contexts/TemplateContext';
import { Check, Palette, RotateCcw } from 'lucide-react';

interface TemplateSelectorProps {
  onSelect?: (templateId: string | null) => void;
  showPreview?: boolean;
}

export function TemplateSelector({ onSelect, showPreview = true }: TemplateSelectorProps) {
  const { currentTemplate, setTemplate, isThemeActive } = useTemplate();

  const handleSelect = (templateId: string | null) => {
    setTemplate(templateId);
    onSelect?.(templateId);
  };

  const categories = ['premium', 'modern', 'classic', 'minimal', 'bold', 'elegant'] as const;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Palette className="w-6 h-6 text-purple-600" />
            Theme Gallery
          </h2>
          <p className="text-gray-600 mt-1">
            Choose a theme for your photography website. Changes apply immediately.
          </p>
        </div>
        
        {isThemeActive && (
          <button
            onClick={() => handleSelect(null)}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Default
          </button>
        )}
      </div>

      {/* Current Theme Banner */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
        <div className="flex items-center gap-3">
          <div 
            className="w-12 h-12 rounded-lg shadow-inner"
            style={{
              background: currentTemplate 
                ? `linear-gradient(135deg, ${currentTemplate.colors.primary}, ${currentTemplate.colors.secondary})`
                : 'linear-gradient(135deg, #8B5CF6, #EC4899)'
            }}
          />
          <div>
            <p className="text-sm text-gray-600">Active Theme</p>
            <p className="font-semibold text-gray-900">
              {currentTemplate?.name || 'New Age Premium (Default)'}
            </p>
          </div>
        </div>
      </div>

      {/* Theme Categories */}
      {categories.map(category => {
        const categoryTemplates = templates.filter(t => t.category === category);
        if (categoryTemplates.length === 0) return null;

        return (
          <div key={category} className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 capitalize">
              {category} Themes
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {categoryTemplates.map(template => {
                const isSelected = template.isDefault 
                  ? !isThemeActive 
                  : currentTemplate?.id === template.id;

                return (
                  <button
                    key={template.id}
                    onClick={() => handleSelect(template.isDefault ? null : template.id)}
                    className={`relative group rounded-xl border-2 overflow-hidden transition-all duration-200 ${
                      isSelected 
                        ? 'border-purple-500 ring-2 ring-purple-200' 
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    {/* Color Preview */}
                    <div 
                      className="h-24 w-full"
                      style={{
                        background: `linear-gradient(135deg, ${template.colors.primary}, ${template.colors.secondary})`
                      }}
                    />
                    
                    {/* Template Info */}
                    <div className="p-4 bg-white">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900 text-sm">
                            {template.name}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {template.description}
                          </p>
                        </div>
                        
                        {isSelected && (
                          <div className="flex-shrink-0 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      
                      {/* Color Swatches */}
                      <div className="flex gap-1 mt-3">
                        {Object.entries(template.colors).slice(0, 4).map(([name, color]) => (
                          <div
                            key={name}
                            className="w-5 h-5 rounded-full border border-gray-200"
                            style={{ backgroundColor: color }}
                            title={name}
                          />
                        ))}
                      </div>
                      
                      {template.isDefault && (
                        <span className="inline-block mt-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-purple-600/0 group-hover:bg-purple-600/5 transition-colors pointer-events-none" />
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default TemplateSelector;

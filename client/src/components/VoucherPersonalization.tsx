import React, { useState } from 'react';
import { Upload, Check, X, Gift, Heart, Sparkles, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PersonalizationData {
  designType: 'none' | 'birthday' | 'christmas' | 'mothers-day' | 'fathers-day' | 'custom';
  customPhoto?: File;
  message?: string;
  recipientName?: string;
}

interface VoucherPersonalizationProps {
  onPersonalizationChange: (data: PersonalizationData) => void;
  initialData?: PersonalizationData;
}

const presetDesigns = [
  {
    id: 'none',
    name: 'Ohne Personalisierung',
    description: 'Standard-Gutschein ohne besondere Gestaltung',
    icon: Gift,
    color: 'bg-gray-100 border-gray-200',
    preview: '/voucher-templates/default.jpg'
  },
  {
    id: 'birthday',
    name: 'Happy Birthday',
    description: 'Fröhliche Geburtstagsgestaltung',
    icon: Gift,
    color: 'bg-pink-100 border-pink-300',
    preview: '/voucher-templates/birthday.jpg'
  },
  {
    id: 'christmas',
    name: 'Merry Christmas', 
    description: 'Festliche Weihnachtsgestaltung',
    icon: Sparkles,
    color: 'bg-red-100 border-red-300',
    preview: '/voucher-templates/christmas.jpg'
  },
  {
    id: 'mothers-day',
    name: 'Happy Mothers Day',
    description: 'Liebevolle Muttertagsgestaltung',
    icon: Heart,
    color: 'bg-rose-100 border-rose-300',
    preview: '/voucher-templates/mothers-day.jpg'
  },
  {
    id: 'fathers-day',
    name: 'Happy Fathers Day',
    description: 'Besondere Vatertagsgestaltung',
    icon: Crown,
    color: 'bg-blue-100 border-blue-300',
    preview: '/voucher-templates/fathers-day.jpg'
  },
  {
    id: 'custom',
    name: 'Eigenes Foto',
    description: 'Laden Sie Ihr eigenes Foto hoch',
    icon: Upload,
    color: 'bg-purple-100 border-purple-300',
    preview: null
  }
];

const VoucherPersonalization: React.FC<VoucherPersonalizationProps> = ({
  onPersonalizationChange,
  initialData = { designType: 'none' }
}) => {
  const [selectedDesign, setSelectedDesign] = useState<PersonalizationData>(initialData);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleDesignSelect = (designId: string) => {
    const newData: PersonalizationData = {
      ...selectedDesign,
      designType: designId as PersonalizationData['designType'],
      // Clear custom photo if switching away from custom
      ...(designId !== 'custom' && { customPhoto: undefined })
    };
    setSelectedDesign(newData);
    onPersonalizationChange(newData);
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Bitte laden Sie nur Bilddateien hoch');
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Die Datei ist zu groß. Maximale Größe: 10MB');
      }

      const newData: PersonalizationData = {
        ...selectedDesign,
        designType: 'custom',
        customPhoto: file
      };
      
      setSelectedDesign(newData);
      onPersonalizationChange(newData);
    } catch (error: any) {
      console.error('Fehler beim Hochladen:', error);
      // You could add a toast notification here
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleInputChange = (field: keyof PersonalizationData, value: string) => {
    const newData = {
      ...selectedDesign,
      [field]: value
    };
    setSelectedDesign(newData);
    onPersonalizationChange(newData);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          Gutschein personalisieren
        </CardTitle>
        <p className="text-sm text-gray-600">
          Wählen Sie ein Design oder laden Sie Ihr eigenes Foto für eine persönliche Note hoch
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Design Selection */}
        <div>
          <Label className="text-base font-medium">Design auswählen</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
            {presetDesigns.map((design) => {
              const Icon = design.icon;
              const isSelected = selectedDesign.designType === design.id;
              
              return (
                <button
                  key={design.id}
                  onClick={() => handleDesignSelect(design.id)}
                  className={`relative p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                    isSelected 
                      ? 'ring-2 ring-purple-500 border-purple-500' 
                      : design.color
                  }`}
                >
                  {isSelected && (
                    <div className="absolute -top-2 -right-2 bg-purple-500 text-white rounded-full p-1">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                  
                  <div className="flex flex-col items-center text-center space-y-2">
                    <Icon className={`w-8 h-8 ${isSelected ? 'text-purple-600' : 'text-gray-600'}`} />
                    <div>
                      <div className="font-medium text-sm">{design.name}</div>
                      <div className="text-xs text-gray-500">{design.description}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Photo Upload */}
        {selectedDesign.designType === 'custom' && (
          <div className="space-y-4">
            <Label className="text-base font-medium">Eigenes Foto hochladen</Label>
            
            {!selectedDesign.customPhoto ? (
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive 
                    ? 'border-purple-500 bg-purple-50' 
                    : 'border-gray-300 hover:border-purple-400'
                }`}
                onDragEnter={() => setDragActive(true)}
                onDragLeave={() => setDragActive(false)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <div className="text-gray-600">
                  <p className="text-lg font-medium">Foto hier ablegen</p>
                  <p className="text-sm">oder klicken zum Auswählen</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileInput}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="mt-4 text-xs text-gray-500">
                  <p>JPG, PNG oder GIF • Max. 10MB</p>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800">{selectedDesign.customPhoto.name}</p>
                      <p className="text-sm text-green-600">
                        {(selectedDesign.customPhoto.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleInputChange('customPhoto', '')}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Additional Personalization Options */}
        {selectedDesign.designType !== 'none' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="recipientName">Name des Beschenkten (optional)</Label>
              <Input
                id="recipientName"
                placeholder="z.B. Liebe Sarah..."
                value={selectedDesign.recipientName || ''}
                onChange={(e) => handleInputChange('recipientName', e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="message">Persönliche Nachricht (optional)</Label>
              <Input
                id="message"
                placeholder="z.B. Alles Gute zum Geburtstag!"
                value={selectedDesign.message || ''}
                onChange={(e) => handleInputChange('message', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        )}

        {/* Preview Section */}
        {selectedDesign.designType !== 'none' && (
          <div className="pt-4 border-t">
            <Label className="text-base font-medium">Vorschau</Label>
            <div className="mt-3 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                  {presetDesigns.find(d => d.id === selectedDesign.designType)?.name}
                </Badge>
                {selectedDesign.recipientName && (
                  <Badge variant="outline">Für: {selectedDesign.recipientName}</Badge>
                )}
              </div>
              {selectedDesign.message && (
                <p className="mt-2 text-sm text-gray-600 italic">"{selectedDesign.message}"</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VoucherPersonalization;
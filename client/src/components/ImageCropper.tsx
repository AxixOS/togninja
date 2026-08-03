import React, { useCallback, useState } from 'react';
import Cropper from 'react-easy-crop';
import { useLanguage } from '../context/LanguageContext';

interface ImageCropperProps {
  file?: File | null;
  imageSrc?: string | null;
  onCancel: () => void;
  onCropped: (blob: Blob, previewUrl: string) => void | Promise<void>;
  aspect?: number;
  circular?: boolean;
  title?: string;
  helpText?: string;
  // When true, show Landscape / Portrait / Square buttons so portrait
  // ("Hochformat") photos aren't forced into a landscape frame.
  allowOrientation?: boolean;
}

const ORIENTATIONS = { landscape: 14 / 9, portrait: 4 / 5, square: 1 } as const;
type Orientation = keyof typeof ORIENTATIONS;

// Utility to create cropped image blob
async function getCroppedBlob(imageSrc: string, crop: { x: number; y: number }, zoom: number, area: { width: number; height: number, x: number, y: number }, outputWidth = 1400, outputHeight = 900): Promise<Blob> {
  const image: HTMLImageElement = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });
  const canvas = document.createElement('canvas');
  // Scale output to desired width preserving aspect ratio of crop area
  const scale = outputWidth / area.width;
  canvas.width = outputWidth;
  canvas.height = Math.round(area.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');
  ctx.drawImage(
    image,
    area.x, // source x
    area.y, // source y
    area.width,
    area.height,
    0,
    0,
    canvas.width,
    canvas.height
  );
  return await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b as Blob), 'image/jpeg', 0.9);
  });
}

const ImageCropper: React.FC<ImageCropperProps> = ({
  file,
  imageSrc,
  onCancel,
  onCropped,
  aspect,
  circular,
  title,
  helpText,
  allowOrientation,
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [orientation, setOrientation] = useState<Orientation>('landscape');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [naturalAspect, setNaturalAspect] = useState<number | null>(null);
  const { language } = useLanguage();
  const de = language === 'de';

  React.useEffect(() => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setImageUrl(e.target?.result as string);
      reader.readAsDataURL(file);
      return;
    }
    setImageUrl(imageSrc || null);
  }, [file, imageSrc]);

  React.useEffect(() => {
    if (!imageUrl) {
      setNaturalAspect(null);
      return;
    }
    const img = new Image();
    img.onload = () => {
      if (img.width > 0 && img.height > 0) {
        setNaturalAspect(img.width / img.height);
      }
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // With the orientation toggle the chosen orientation wins; otherwise use the
  // passed aspect, then the image's natural aspect, then a landscape default.
  const effectiveAspect = allowOrientation
    ? ORIENTATIONS[orientation]
    : (aspect || naturalAspect || 14 / 9);

  const onCropComplete = useCallback((_area: any, areaPixels: any) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleFinish = async () => {
    if (!imageUrl || !croppedAreaPixels) return;
    setProcessing(true);
    try {
      const blob = await getCroppedBlob(imageUrl, crop, zoom, croppedAreaPixels, 1400, 1400 / effectiveAspect);
      const previewUrl = URL.createObjectURL(blob);
      // Await so the button stays in its "processing" state through the actual upload
      // (prevents the brief flash and double-clicks).
      await onCropped(blob, previewUrl);
    } catch (e) {
      console.error('[CROPPER] Failed to crop image', e);
      alert(de ? 'Bild konnte nicht verarbeitet werden' : 'Image could not be processed');
    } finally {
      setProcessing(false);
    }
  };

  if (!imageUrl) return null;

  return (
    <div className="space-y-4">
      {(title || helpText) && (
        <div className="space-y-1">
          {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
          {helpText && <p className="text-sm text-gray-600">{helpText}</p>}
        </div>
      )}
      {allowOrientation && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-600">{de ? 'Format' : 'Format'}:</span>
          {([
            { key: 'landscape', label: de ? 'Querformat' : 'Landscape' },
            { key: 'portrait', label: de ? 'Hochformat' : 'Portrait' },
            { key: 'square', label: de ? 'Quadrat' : 'Square' },
          ] as const).map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => { setOrientation(o.key); setCrop({ x: 0, y: 0 }); setZoom(1); }}
              className={`px-3 py-1 rounded-md text-sm border transition-colors ${
                orientation === o.key
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
      <div>
        <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide text-gray-500">
          <span>{de ? 'Blog-Vorschau-Rahmen' : 'Blog preview frame'}</span>
          <span>{effectiveAspect.toFixed(2)}:1</span>
        </div>
        <div className="relative w-full overflow-hidden rounded-xl bg-black shadow-inner" style={{ aspectRatio: `${effectiveAspect}`, maxHeight: '60vh' }}>
        <Cropper
          image={imageUrl}
          crop={crop}
          zoom={zoom}
          aspect={effectiveAspect}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          cropShape={circular ? 'round' : 'rect'}
          showGrid={false}
          // Allow the image to be dragged freely in both axes (up/down and
          // left/right) instead of being locked to always cover the crop frame.
          restrictPosition={false}
        />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="flex-1"
        />
        <span className="text-sm text-gray-600 w-28">{de ? 'Skalierung' : 'Scale'} {zoom.toFixed(2)}x</span>
      </div>
      <div className="rounded-lg border border-purple-100 bg-purple-50 px-3 py-2 text-xs text-purple-900">
        {de
          ? 'Ziehe das Bild, um den Ausschnitt zu verschieben. Nutze den Regler, um hinein- oder herauszuzoomen. Der Rahmen entspricht den Proportionen im Blogartikel.'
          : 'Drag the image to reposition the crop. Use the slider to zoom in or out. The frame matches the proportions used in the blog article.'}
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800"
          disabled={processing}
        >
          {de ? 'Abbrechen' : 'Cancel'}
        </button>
        <button
          type="button"
          onClick={handleFinish}
          className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-60"
          disabled={processing}
        >
          {processing ? (de ? 'Verarbeite…' : 'Processing…') : (de ? 'Speichern & Hochladen' : 'Save & upload')}
        </button>
      </div>
    </div>
  );
};

export default ImageCropper;

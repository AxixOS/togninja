import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Loader2, AlertCircle, Image as ImageIcon, Folder, FolderPlus } from 'lucide-react';
import { uploadGalleryImages } from '../../lib/gallery-api';
import { v4 as uuidv4 } from 'uuid';

interface ImageUploaderProps {
  galleryId: string;
  onUploadComplete: () => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ galleryId, onUploadComplete }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [folderName, setFolderName] = useState<string>('');
  const [showFolderInput, setShowFolderInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Track files being processed for upload
  const [processingFiles, setProcessingFiles] = useState<{[key: string]: boolean}>({});

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const selectedFiles = Array.from(e.target.files);
    addFiles(selectedFiles);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    
    // Filter for image files only
    const imageFiles = droppedFiles.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      setError('Please upload image files only.');
      return;
    }
    
    addFiles(imageFiles);
  };

  const addFiles = (newFiles: File[]) => {
    // Add unique IDs to track files
    const filesWithIds = newFiles.map(file => {
      const id = uuidv4();
      return { file, id };
    });
    
    setFiles(prev => [...prev, ...filesWithIds.map(f => f.file)]);
    
    // Generate previews
    filesWithIds.forEach(({ file, id }) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => [...prev, reader.result as string]);
        
        // Mark file as processed
        setProcessingFiles(prev => ({
          ...prev,
          [id]: false
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    // Revoke object URL to prevent memory leaks
    if (previews[index] && previews[index].startsWith('blob:')) {
      URL.revokeObjectURL(previews[index]);
    }
    
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Please select at least one image to upload.');
      return;
    }
    
    if (!galleryId) {
      setError('Gallery ID is missing. Please save the gallery first.');
      return;
    }

    if (!folderName.trim()) {
      setError('Please enter a folder name for organizing your images.');
      return;
    }
    
    try {
      setUploading(true);
      setError(null);
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 5;
        });
      }, 500);
      
      // Upload files with folder name
      await uploadGalleryImages(galleryId, files, folderName.trim());
      
      // Clear progress interval
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Clean up
      previews.forEach(preview => {
        if (preview.startsWith('blob:')) {
          URL.revokeObjectURL(preview);
        }
      });
      setFiles([]);
      setPreviews([]);
      setFolderName('');
      setShowFolderInput(false);
      
      // Notify parent component
      onUploadComplete();
      
      // Reset progress after a short delay
      setTimeout(() => {
        setUploadProgress(0);
        setUploading(false);
      }, 1000);
    } catch (err) {
      // console.error removed
      setError(err instanceof Error ? err.message : 'Failed to upload images. Please try again.');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
          <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2" />
          <span>{error}</span>
        </div>
      )}
      
      {/* Drag & Drop Area */}
      <div 
        className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-purple-500 transition-colors"
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          disabled={uploading}
        />
        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">Upload Images</h3>
        <p className="text-gray-500 mb-4">
          Drag and drop image files here, or click to browse
        </p>
        <p className="text-sm text-gray-400">
          Supported formats: JPG, PNG, GIF, WEBP
        </p>
      </div>
      
      {/* Selected Files Preview */}
      {previews.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Selected Images ({previews.length})</h3>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {previews.map((preview, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square overflow-hidden rounded-lg">
                  <img 
                    src={preview} 
                    alt={`Preview ${index}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  disabled={uploading}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={14} />
                </button>
                <p className="text-xs text-gray-500 truncate mt-1">
                  {files[index]?.name || 'Image'}
                </p>
              </div>
            ))}
          </div>
          
          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium text-gray-700">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-purple-600 h-2.5 rounded-full" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}
          
          {/* Upload Button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading || previews.length === 0}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="-ml-1 mr-2 h-5 w-5" />
                  Upload {previews.length} {previews.length === 1 ? 'Image' : 'Images'}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ImageUploadProps {
  onUploadComplete?: (urls: string[]) => void;
  maxFiles?: number;
  accept?: string;
  className?: string;
}

interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  url?: string;
  error?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  onUploadComplete,
  maxFiles = 10,
  accept = 'image/*',
  className = ''
}) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: UploadedFile[] = [];
    
    for (let i = 0; i < selectedFiles.length && files.length + newFiles.length < maxFiles; i++) {
      const file = selectedFiles[i];
      if (file.type.startsWith('image/')) {
        const id = `file-${Date.now()}-${i}`;
        const preview = URL.createObjectURL(file);
        newFiles.push({
          id,
          file,
          preview,
          status: 'pending'
        });
      }
    }

    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const removeFile = (id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const uploadFile = async (uploadedFile: UploadedFile) => {
    try {
      setFiles(prev => prev.map(f => 
        f.id === uploadedFile.id ? { ...f, status: 'uploading' } : f
      ));

      // Generate unique filename
      const fileExt = uploadedFile.file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `gallery/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('gallery-images')
        .upload(filePath, uploadedFile.file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('gallery-images')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Save to database
      const { error: dbError } = await supabase
        .from('gallery_images')
        .insert([{
          filename: fileName,
          original_name: uploadedFile.file.name,
          file_path: filePath,
          public_url: publicUrl,
          file_size: uploadedFile.file.size,
          mime_type: uploadedFile.file.type,
          uploaded_at: new Date().toISOString()
        }]);

      if (dbError) throw dbError;

      setFiles(prev => prev.map(f => 
        f.id === uploadedFile.id ? { 
          ...f, 
          status: 'success', 
          url: publicUrl 
        } : f
      ));

      return publicUrl;
    } catch (error) {
      // console.error removed
      setFiles(prev => prev.map(f => 
        f.id === uploadedFile.id ? { 
          ...f, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Upload failed' 
        } : f
      ));
      return null;
    }
  };

  const uploadAllFiles = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    const urls: string[] = [];

    for (const file of pendingFiles) {
      const url = await uploadFile(file);
      if (url) urls.push(url);
    }

    if (onUploadComplete) {
      onUploadComplete(urls);
    }
  };

  const clearAll = () => {
    files.forEach(file => {
      URL.revokeObjectURL(file.preview);
    });
    setFiles([]);
  };

  const canUpload = files.some(f => f.status === 'pending');
  const hasUploading = files.some(f => f.status === 'uploading');

  return (
    <div className={className}>
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragging 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
        
        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-lg font-medium text-gray-700 mb-2">
          Drop images here or click to select
        </p>
        <p className="text-sm text-gray-500">
          Support for multiple files. Maximum {maxFiles} files.
        </p>
      </div>

      {/* File Previews */}
      {files.length > 0 && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-medium text-gray-900">
              Selected Files ({files.length}/{maxFiles})
            </h4>
            <div className="flex gap-2">
              {canUpload && (
                <button
                  onClick={uploadAllFiles}
                  disabled={hasUploading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {hasUploading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload All
                    </>
                  )}
                </button>
              )}
              <button
                onClick={clearAll}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {files.map((file) => (
              <div key={file.id} className="relative group">
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={file.preview}
                    alt={file.file.name}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Status Overlay */}
                  {file.status !== 'pending' && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      {file.status === 'uploading' && (
                        <Loader className="w-6 h-6 text-white animate-spin" />
                      )}
                      {file.status === 'success' && (
                        <Check className="w-6 h-6 text-green-400" />
                      )}
                      {file.status === 'error' && (
                        <X className="w-6 h-6 text-red-400" />
                      )}
                    </div>
                  )}

                  {/* Remove Button */}
                  <button
                    onClick={() => removeFile(file.id)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(file.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  {file.status === 'error' && file.error && (
                    <p className="text-xs text-red-600 mt-1">{file.error}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;

/**
 * My Archive - Digital Storage Page
 * Allows users to upload, organize, and manage their personal archive
 */

import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  Folder,
  File,
  Image,
  Video,
  FileText,
  Download,
  Trash2,
  FolderPlus,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  HardDrive,
  Zap,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import StorageUpgradePrompt from '@/components/StorageUpgradePrompt';

interface StorageUsage {
  hasSubscription: boolean;
  tier?: string;
  status?: string;
  currentUsage: number;
  storageLimit: number;
  fileCount: number;
  percentUsed: string;
  usageGB: string;
  limitGB: string;
}

interface FileItem {
  id: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  thumbnailUrl?: string;
  createdAt: string;
}

interface FolderItem {
  id: number;
  name: string;
  parentId?: number | null;
  createdAt: string;
}

export default function MyArchivePage() {
  const queryClient = useQueryClient();
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [folderPath, setFolderPath] = useState<FolderItem[]>([]);
  const [showNewFolderForm, setShowNewFolderForm] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [draggingFileId, setDraggingFileId] = useState<number | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<number | null>(null);

  // Fetch storage usage
  const { data: usage, isLoading: usageLoading } = useQuery<StorageUsage>({
    queryKey: ['storage-usage'],
    queryFn: async () => {
      const res = await fetch('/api/files/usage', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch storage usage');
      return res.json();
    },
  });

  // Fetch storage recommendations
  const { data: storageRecommendations } = useQuery({
    queryKey: ['storage-recommendations'],
    queryFn: async () => {
      const res = await fetch('/api/storage-stats/usage', {
        credentials: 'include',
      });
      if (!res.ok) {
        console.warn('Failed to fetch storage recommendations:', res.status);
        return null; // Return null on error
      }
      return res.json();
    },
    enabled: !!usage?.hasSubscription,
    retry: false, // Don't retry on failure
  });

  // Fetch folders
  const { data: folders = [] } = useQuery<FolderItem[]>({
    queryKey: ['folders'],
    queryFn: async () => {
      const res = await fetch('/api/files/folders', {
        credentials: 'include',
      });
      if (!res.ok) {
        console.warn('Failed to fetch folders:', res.status);
        return []; // Return empty array on error
      }
      const data = await res.json();
      // Ensure we always return an array
      return Array.isArray(data) ? data : (data.folders || []);
    },
    enabled: !!usage?.hasSubscription,
    retry: false, // Don't retry on failure
  });

  // Fetch files in current folder
  const { data: files = [], isLoading: filesLoading } = useQuery<FileItem[]>({
    // NOTE: a Date.now() in the key made every render a new query → the loader
    // never settled ("Loading files…" forever). Key on the folder only.
    queryKey: ['files', currentFolderId ?? 'root'],
    staleTime: 10_000,
    queryFn: async () => {
      const url = currentFolderId
        ? `/api/files?folderId=${currentFolderId}`
        : '/api/files';
      console.log('🔍 Fetching files for folder:', currentFolderId, 'URL:', url);
      const res = await fetch(url, {
        credentials: 'include',
      });
      if (!res.ok) {
        console.warn('Failed to fetch files:', res.status);
        return []; // Return empty array on error
      }
      const data = await res.json();
      console.log(`📂 Received ${data.length} files for folder ${currentFolderId}`);
      return data;
    },
    enabled: !!usage?.hasSubscription,
    retry: false, // Don't retry on failure
  });

  // Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/files/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name,
          parentId: currentFolderId,
        }),
      });
      if (!res.ok) throw new Error('Failed to create folder');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      setShowNewFolderForm(false);
      setNewFolderName('');
    },
  });

  // Upload file mutation
  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      if (currentFolderId) {
        formData.append('folderId', currentFolderId);
      }

      const res = await fetch('/api/files/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to upload file');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', currentFolderId] });
      queryClient.invalidateQueries({ queryKey: ['storage-usage'] });
    },
  });

  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: number) => {
      const res = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete file');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', currentFolderId] });
      queryClient.invalidateQueries({ queryKey: ['storage-usage'] });
    },
  });

  // Move file mutation
  const moveFileMutation = useMutation({
    mutationFn: async ({ fileId, folderId }: { fileId: number; folderId: string | null }) => {
      const res = await fetch(`/api/files/${fileId}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ folderId }),
      });
      if (!res.ok) throw new Error('Failed to move file');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      setDraggingFileId(null);
      setDragOverFolderId(null);
    },
  });

  // Download file
  const handleDownload = async (fileId: number, fileName: string) => {
    try {
      const res = await fetch(`/api/files/${fileId}/download`, {
        credentials: 'include',
      });
      const { downloadUrl } = await res.json();
      
      // Open download URL
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      link.click();
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file');
    }
  };

  // React Dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      uploadFileMutation.mutate(file);
    });
  }, [currentFolderId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 500 * 1024 * 1024, // 500MB
  });

  // Navigate to folder
  const navigateToFolder = (folder: FolderItem) => {
    setCurrentFolderId(folder.id);
    setFolderPath([...folderPath, folder]);
  };

  // Navigate back
  const navigateBack = () => {
    const newPath = [...folderPath];
    newPath.pop();
    setFolderPath(newPath);
    setCurrentFolderId(newPath.length > 0 ? newPath[newPath.length - 1].id : null);
  };

  // Get file icon
  const getFileIcon = (mimeType: string | undefined | null) => {
    if (!mimeType) return <File className="w-5 h-5" />;
    if (mimeType.startsWith('image/')) return <Image className="w-5 h-5" />;
    if (mimeType.startsWith('video/')) return <Video className="w-5 h-5" />;
    if (mimeType === 'application/pdf') return <FileText className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  // Get current folder's subfolders
  const currentFolders = Array.isArray(folders) 
    ? folders.filter((f) => f.parentId === currentFolderId)
    : [];

  if (!usage?.hasSubscription) {
    return (
      <AdminLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              No Active Storage Subscription
            </h2>
            <p className="text-gray-600 mb-4">
              Subscribe to a storage plan to start uploading and organizing your files.
            </p>
            <a
              href="https://www.backblaze.com/cloud-storage/pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              View Storage Plans
            </a>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">My Archive</h1>
          <p className="text-gray-600 mt-1">
            Upload and organize your personal files
          </p>
        </div>

        {/* Storage Upgrade Prompt (shown when >75% full) */}
        {storageRecommendations?.shouldShowUpgradePrompt && storageRecommendations?.usage && (
          <StorageUpgradePrompt
            currentUsageBytes={storageRecommendations.usage.currentStorageBytes}
            storageLimitBytes={storageRecommendations.usage.storageLimit}
            currentTier={storageRecommendations.usage.tier}
            percentUsed={storageRecommendations.usage.percentUsed}
          />
        )}

        {/* Storage Usage Widget - Enhanced */}
        <div className={`rounded-lg shadow-lg border-2 p-6 mb-6 ${
          parseFloat(usage.percentUsed) > 90 
            ? 'bg-red-50 border-red-300' 
            : parseFloat(usage.percentUsed) > 75 
            ? 'bg-yellow-50 border-yellow-300' 
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full ${
                parseFloat(usage.percentUsed) > 90 
                  ? 'bg-red-100' 
                  : parseFloat(usage.percentUsed) > 75 
                  ? 'bg-yellow-100' 
                  : 'bg-blue-100'
              }`}>
                <HardDrive className={`w-6 h-6 ${
                  parseFloat(usage.percentUsed) > 90 
                    ? 'text-red-600' 
                    : parseFloat(usage.percentUsed) > 75 
                    ? 'text-yellow-600' 
                    : 'text-blue-600'
                }`} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Storage Usage</h3>
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    usage.tier === 'free' ? 'bg-green-100 text-green-700' :
                    usage.tier === 'starter' ? 'bg-blue-100 text-blue-700' :
                    usage.tier === 'professional' ? 'bg-purple-100 text-purple-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {usage.tier?.toUpperCase()}
                  </span>
                  Plan
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-900">
                {usage.usageGB}<span className="text-lg text-gray-500">GB</span>
              </p>
              <p className="text-sm text-gray-600">of {usage.limitGB}GB used</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-4 mb-2 overflow-hidden">
            <div
              className={`h-4 rounded-full transition-all duration-500 ${
                parseFloat(usage.percentUsed) > 90
                  ? 'bg-gradient-to-r from-red-500 to-red-600'
                  : parseFloat(usage.percentUsed) > 75
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600'
              }`}
              style={{ width: `${Math.min(parseFloat(usage.percentUsed), 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-gray-600 mb-4">
            <span>{usage.fileCount} files stored</span>
            <span className="font-semibold">{usage.percentUsed}% used</span>
          </div>

          {/* Upgrade Prompts */}
          {parseFloat(usage.percentUsed) > 90 && (
            <div className="bg-red-100 border border-red-300 rounded-lg p-4 mt-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-900 mb-1">
                    ⚠️ Storage Almost Full!
                  </p>
                  <p className="text-sm text-red-800 mb-3">
                    You're using {usage.percentUsed}% of your storage. Upgrade now to avoid running out of space!
                  </p>
                  <a
                    href="https://www.backblaze.com/cloud-storage/pricing"
              target="_blank"
              rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Upgrade Storage Now
                  </a>
                </div>
              </div>
            </div>
          )}

          {parseFloat(usage.percentUsed) > 75 && parseFloat(usage.percentUsed) <= 90 && (
            <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4 mt-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-yellow-900 mb-1">
                    💡 Getting Close to Your Limit
                  </p>
                  <p className="text-sm text-yellow-800 mb-3">
                    You've used {usage.percentUsed}% of your storage. Consider upgrading for more space and features.
                  </p>
                  <a
                    href="https://www.backblaze.com/cloud-storage/pricing"
              target="_blank"
              rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm font-medium"
                  >
                    View Upgrade Options
                  </a>
                </div>
              </div>
            </div>
          )}

          {parseFloat(usage.percentUsed) <= 50 && usage.tier === 'free' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900 mb-1">
                    🚀 Ready to Upload More?
                  </p>
                  <p className="text-sm text-blue-800 mb-3">
                    Upgrade to get up to 1TB of storage and unlock premium features like client galleries!
                  </p>
                  <a
                    href="https://www.backblaze.com/cloud-storage/pricing"
              target="_blank"
              rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    See Plans & Pricing
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Breadcrumb Navigation */}
        <div 
          className={`bg-white rounded-lg shadow-sm border-2 p-4 mb-4 transition-colors ${
            dragOverFolderId === 'home' && currentFolderId
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            if (draggingFileId && currentFolderId) {
              setDragOverFolderId('home');
            }
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            if (dragOverFolderId === 'home') {
              setDragOverFolderId(null);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (draggingFileId && currentFolderId) {
              moveFileMutation.mutate({
                fileId: draggingFileId,
                folderId: null,
              });
            }
            setDragOverFolderId(null);
          }}
        >
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => {
                setCurrentFolderId(null);
                setFolderPath([]);
              }}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Home
            </button>
            {folderPath.map((folder, index) => (
              <React.Fragment key={folder.id}>
                <span className="text-gray-400">/</span>
                <button
                  onClick={() => {
                    const newPath = folderPath.slice(0, index + 1);
                    setFolderPath(newPath);
                    setCurrentFolderId(folder.id);
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  {folder.name}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Actions Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <div className="flex items-center gap-3">
            {folderPath.length > 0 && (
              <button
                onClick={navigateBack}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}
            <button
              onClick={() => setShowNewFolderForm(!showNewFolderForm)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <FolderPlus className="w-4 h-4" />
              New Folder
            </button>
          </div>

          {/* New Folder Form */}
          {showNewFolderForm && (
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && newFolderName.trim()) {
                    createFolderMutation.mutate(newFolderName.trim());
                  }
                }}
              />
              <button
                onClick={() => {
                  if (newFolderName.trim()) {
                    createFolderMutation.mutate(newFolderName.trim());
                  }
                }}
                disabled={!newFolderName.trim() || createFolderMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowNewFolderForm(false);
                  setNewFolderName('');
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* File Upload Dropzone */}
        <div
          {...getRootProps()}
          className={`bg-white rounded-lg shadow-sm border-2 border-dashed p-8 mb-6 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          {isDragActive ? (
            <p className="text-blue-600 font-medium">Drop files here...</p>
          ) : (
            <>
              <p className="text-gray-700 font-medium mb-1">
                Drag & drop files here, or click to select
              </p>
              <p className="text-sm text-gray-500">Maximum file size: 500MB</p>
              {currentFolderId && folderPath.length > 0 && (
                <p className="text-sm text-blue-600 font-medium mt-2">
                  📁 Uploading to: {folderPath[folderPath.length - 1]?.name || 'Home'}
                </p>
              )}
            </>
          )}
        </div>

        {/* Folders Grid */}
        {currentFolders.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Folders</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {currentFolders.map((folder) => (
                <div
                  key={folder.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (draggingFileId) {
                      console.log('📂 Drag over folder:', folder.name, folder.id);
                      setDragOverFolderId(folder.id);
                    }
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOverFolderId(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('💾 Dropping file', draggingFileId, 'into folder', folder.id, folder.name);
                    if (draggingFileId) {
                      moveFileMutation.mutate({
                        fileId: draggingFileId,
                        folderId: folder.id,
                      });
                    }
                    setDragOverFolderId(null);
                  }}
                  onClick={() => navigateToFolder(folder)}
                  className={`bg-white rounded-lg shadow-sm border-2 p-4 hover:shadow-md transition-all text-left cursor-pointer ${
                    dragOverFolderId === folder.id
                      ? 'border-blue-500 bg-blue-50 scale-105'
                      : 'border-gray-200'
                  }`}
                >
                  <Folder className={`w-10 h-10 mb-2 ${
                    dragOverFolderId === folder.id ? 'text-blue-600' : 'text-blue-500'
                  }`} />
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {folder.name}
                  </p>
                  {dragOverFolderId === folder.id && (
                    <p className="text-xs text-blue-600 mt-1">Drop to move here</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Files Grid */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Files</h3>
          {filesLoading ? (
            <p className="text-gray-500 text-center py-8">Loading files...</p>
          ) : files.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No files in this folder. Upload some files to get started!
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {files.map((file) => (
                <div
                  key={file.id}
                  draggable="true"
                  onDragStart={(e) => {
                    console.log('🚀 Drag started for file:', file.id, file.fileName);
                    setDraggingFileId(file.id);
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', file.id.toString());
                  }}
                  onDragEnd={() => {
                    console.log('✅ Drag ended');
                    setDraggingFileId(null);
                    setDragOverFolderId(null);
                  }}
                  className={`bg-white rounded-lg shadow-sm border-2 overflow-hidden hover:shadow-lg transition-all cursor-grab active:cursor-grabbing ${
                    draggingFileId === file.id ? 'opacity-50 border-blue-500' : 'border-gray-200 hover:border-blue-300'
                  }`}
                  title="Drag to move to folder"
                >
                  {/* Thumbnail or Icon */}
                  <div className="aspect-square bg-gray-100 flex items-center justify-center">
                    {file.thumbnailUrl ? (
                      <img
                        src={file.thumbnailUrl}
                        alt={file.fileName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-gray-400">
                        {getFileIcon(file.mimeType)}
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="p-3">
                    <p className="text-sm font-medium text-gray-900 truncate mb-1">
                      {file.fileName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.fileSize)}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleDownload(file.id, file.fileName)}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this file?')) {
                            deleteFileMutation.mutate(file.id);
                          }
                        }}
                        className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </AdminLayout>
  );
}

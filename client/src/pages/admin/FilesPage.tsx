import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { supabase } from '../../lib/supabase';
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Download, 
  Trash2, 
  File, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Music, 
  Archive,
  Loader2,
  AlertCircle,
  Upload
} from 'lucide-react';

interface FileItem {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  file_path: string;
  client_id?: string;
  client_name?: string;
  booking_id?: string;
  category: string;
  is_public: boolean;
  uploaded_by: string;
  created_at: string;
}

const FilesPage: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<FileItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);

  useEffect(() => {
    fetchFiles();
  }, []);

  useEffect(() => {
    filterFiles();
  }, [files, searchTerm, categoryFilter]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('crm_files')
        .select(`
          *,
          crm_clients(name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Format the data
      const formattedFiles = data?.map(file => ({
        id: file.id,
        filename: file.filename,
        original_filename: file.original_filename,
        file_size: file.file_size,
        mime_type: file.mime_type,
        file_path: file.file_path,
        client_id: file.client_id,
        client_name: file.crm_clients?.name || 'No Client',
        booking_id: file.booking_id,
        category: file.category,
        is_public: file.is_public,
        uploaded_by: file.uploaded_by,
        created_at: file.created_at
      }));
      
      setFiles(formattedFiles || []);
    } catch (err) {
      // console.error removed
      setError('Failed to load files. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterFiles = () => {
    let filtered = [...files];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(file => 
        file.original_filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        file.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        file.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(file => file.category === categoryFilter);
    }
    
    setFilteredFiles(filtered);
  };

  const handleDeleteFile = async (id: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('crm_files')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Remove from local state
      setFiles(prevFiles => prevFiles.filter(file => file.id !== id));
      setDeleteConfirmation(null);
    } catch (err) {
      // console.error removed
      setError('Failed to delete file. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon size={24} className="text-blue-500" />;
    if (mimeType.startsWith('video/')) return <Video size={24} className="text-purple-500" />;
    if (mimeType.startsWith('audio/')) return <Music size={24} className="text-green-500" />;
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) 
      return <Archive size={24} className="text-yellow-500" />;
    if (mimeType.includes('pdf')) return <FileText size={24} className="text-red-500" />;
    return <File size={24} className="text-gray-500" />;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Cloud Storage</h1>
            <p className="text-gray-600">Manage and share files with clients</p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center"
          >
            <Upload size={20} className="mr-2" />
            Upload Files
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="all">All Categories</option>
              <option value="general">General</option>
              <option value="contract">Contracts</option>
              <option value="invoice">Invoices</option>
              <option value="photo">Photos</option>
              <option value="video">Videos</option>
            </select>

            <button className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Filter size={20} className="mr-2" />
              More Filters
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2" />
            <span>{error}</span>
          </div>
        )}

        {/* Files Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
            <span className="ml-2 text-gray-600">Loading files...</span>
          </div>
        ) : filteredFiles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFiles.map((file) => (
              <div key={file.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      {getFileIcon(file.mime_type)}
                      <div className="ml-3">
                        <h3 className="text-lg font-medium text-gray-900 truncate max-w-xs" title={file.original_filename}>
                          {file.original_filename}
                        </h3>
                        <p className="text-sm text-gray-500">{formatFileSize(file.file_size)}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      file.is_public ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {file.is_public ? 'Public' : 'Private'}
                    </span>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Client:</span> {file.client_name}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Category:</span> {file.category}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Uploaded:</span> {new Date(file.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="flex justify-between">
                    <div className="flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-900" title="View">
                        <Eye size={18} />
                      </button>
                      <button className="text-green-600 hover:text-green-900" title="Download">
                        <Download size={18} />
                      </button>
                    </div>
                    <button 
                      onClick={() => setDeleteConfirmation(file.id)}
                      className="text-red-600 hover:text-red-900" 
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <File className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No files found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || categoryFilter !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by uploading your first file.'}
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <Upload className="-ml-1 mr-2 h-5 w-5" />
                Upload Files
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Deletion</h3>
            <p className="text-gray-500 mb-6">
              Are you sure you want to delete this file? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setDeleteConfirmation(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteConfirmation && handleDeleteFile(deleteConfirmation)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal would go here */}
    </AdminLayout>
  );
};

export default FilesPage;
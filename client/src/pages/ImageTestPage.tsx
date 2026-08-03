import { useEffect, useState } from 'react';
import Layout from '../components/layout/Layout';

interface DigitalFile {
  id: string;
  fileName: string;
  fileSize: number;
  thumbnailUrl?: string;
  createdAt: string;
}

export default function ImageTestPage() {
  const [files, setFiles] = useState<DigitalFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/files')
      .then(res => res.json())
      .then(data => {
        setFiles(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load files:', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <Layout><div className="p-8">Loading...</div></Layout>;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-6">Image URL Test Page</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {files.map(file => {
            // Construct actual file URL (UUID + extension)
            const ext = file.fileName.match(/\.(jpg|jpeg|png|JPG|JPEG|PNG)$/i)?.[0] || '.jpg';
            const actualURL = `/api/files/serve/${file.id}${ext}`;
            
            return (
              <div key={file.id} className="border rounded-lg p-4 bg-white shadow">
                <div className="mb-2">
                  <img 
                    src={actualURL}
                    alt={file.fileName}
                    className="w-full h-48 object-cover rounded"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder.jpg';
                      e.currentTarget.alt = 'Failed to load';
                    }}
                  />
                </div>
                
                <div className="space-y-1 text-sm">
                  <p className="font-semibold truncate" title={file.fileName}>
                    {file.fileName}
                  </p>
                  <p className="text-gray-600 text-xs font-mono truncate">
                    ID: {file.id}
                  </p>
                  <p className="text-blue-600 text-xs break-all">
                    {actualURL}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {(file.fileSize / 1024 / 1024).toFixed(2)} MB
                  </p>
                  
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(actualURL);
                      alert(`Copied: ${actualURL}`);
                    }}
                    className="mt-2 w-full bg-purple-600 text-white text-xs py-1 px-2 rounded hover:bg-purple-700"
                  >
                    Copy URL
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}

import React from 'react';
import { Download, Database, FileText, Users, Calendar, MessageSquare } from 'lucide-react';

const DownloadDataPage = () => {
  const csvFiles = [
    {
      name: 'crm_clients.csv',
      description: 'Complete Client Database (2,153 records)',
      size: '520KB',
      icon: <Users className="h-6 w-6" />,
      priority: 'high'
    },
    {
      name: 'blog_posts.csv', 
      description: 'Published Blog Posts (15 posts)',
      size: '185KB',
      icon: <FileText className="h-6 w-6" />,
      priority: 'medium'
    },
    {
      name: 'photography_sessions.csv',
      description: 'Photography Sessions (9 sessions)', 
      size: '6KB',
      icon: <Calendar className="h-6 w-6" />,
      priority: 'medium'
    },
    {
      name: 'knowledge_base.csv',
      description: 'CRM Agent Knowledge (5 entries)',
      size: '34KB', 
      icon: <Database className="h-6 w-6" />,
      priority: 'low'
    },
    {
      name: 'crm_leads.csv',
      description: 'Sales Leads (2 prospects)',
      size: '1KB',
      icon: <MessageSquare className="h-6 w-6" />,
      priority: 'medium'  
    },
    {
      name: 'users.csv',
      description: 'Admin Users (2 accounts)',
      size: '1KB',
      icon: <Users className="h-6 w-6" />,
      priority: 'low'
    }
  ];

  const handleDownload = (filename: string) => {
    const link = document.createElement('a');
    link.href = `/${filename}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Database Export - CSV Downloads</h1>
          <p className="text-gray-600">Download your complete database as CSV files</p>
          <p className="text-sm text-gray-500 mt-2">Total: 2,186 records across 6 main tables</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {csvFiles.map((file) => (
            <div 
              key={file.name}
              className={`bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow ${
                file.priority === 'high' ? 'ring-2 ring-purple-200 bg-purple-50' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2 rounded-lg ${
                  file.priority === 'high' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  {file.icon}
                </div>
                {file.priority === 'high' && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                    Priority
                  </span>
                )}
              </div>

              <h3 className="font-semibold text-gray-900 mb-1">{file.name}</h3>
              <p className="text-sm text-gray-600 mb-2">{file.description}</p>
              <p className="text-xs text-gray-500 mb-4">Size: {file.size}</p>

              <button
                onClick={() => handleDownload(file.name)}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
                  file.priority === 'high' 
                    ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                    : 'bg-gray-600 hover:bg-gray-700 text-white'
                }`}
              >
                <Download className="h-4 w-4" />
                Download
              </button>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">Download Instructions</h2>
          <div className="space-y-3 text-sm text-gray-600">
            <p><strong>Most Important:</strong> <code>crm_clients.csv</code> contains your 2,153 client records - your main business database.</p>
            <p><strong>Usage:</strong> Open CSV files in Excel, Google Sheets, or import into any database system.</p>
            <p><strong>Migration:</strong> Use these files to migrate your data to any new system that accepts CSV imports.</p>
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Alternative Download Methods:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Right-click any CSV file in the Replit Files panel and select "Download"</li>
            <li>• Files are also available in the <code>public/</code> folder</li>
            <li>• Complete archive available as <code>database-csv-export.tar.gz</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DownloadDataPage;
/**
 * Storage Demo Page
 * Mock interface to test storage subscription UI without backend integration
 */

import React, { useState } from 'react';
import { 
  Upload, 
  Folder, 
  File, 
  Image, 
  Download, 
  Trash2, 
  FolderPlus, 
  HardDrive,
  CheckCircle,
  Package,
  Calendar,
  CreditCard,
  TrendingUp,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import StorageUpgradePrompt from '@/components/StorageUpgradePrompt';

// Mock data
const mockSubscription = {
  tier: 'professional' as const,
  status: 'active',
  currentPeriodStart: '2025-09-16',
  currentPeriodEnd: '2025-10-16',
  cancelAtPeriodEnd: false,
};

const mockUsage = {
  currentStorageBytes: 180388626432, // ~168GB (84% of 200GB)
  storageLimit: 214748364800, // 200GB
  percentUsed: 84,
  fileCount: 1247,
  remainingBytes: 34359738368, // ~32GB
};

const mockFiles = [
  { id: 1, name: 'Wedding_Photos_2024.zip', size: 2.4, type: 'archive', date: '2025-10-15' },
  { id: 2, name: 'Family_Portrait_Session.jpg', size: 8.2, type: 'image', date: '2025-10-14' },
  { id: 3, name: 'Client_Contract_Smith.pdf', size: 0.5, type: 'document', date: '2025-10-13' },
  { id: 4, name: 'Product_Shoot_RAW_Files.zip', size: 12.8, type: 'archive', date: '2025-10-12' },
  { id: 5, name: 'Business_Headshots.jpg', size: 6.1, type: 'image', date: '2025-10-11' },
  { id: 6, name: 'Event_Coverage_Video.mp4', size: 450, type: 'video', date: '2025-10-10' },
  { id: 7, name: 'Maternity_Photoshoot.jpg', size: 7.3, type: 'image', date: '2025-10-09' },
  { id: 8, name: 'Invoice_October_2025.pdf', size: 0.3, type: 'document', date: '2025-10-08' },
];

const mockFolders = [
  { id: 1, name: 'Wedding Photography', fileCount: 156 },
  { id: 2, name: 'Family Portraits', fileCount: 89 },
  { id: 3, name: 'Product Shoots', fileCount: 234 },
  { id: 4, name: 'Business Headshots', fileCount: 67 },
];

const PLAN_DETAILS = {
  starter: { name: 'Starter', price: '€9.99', storage: '50GB', clients: 100, color: 'blue' },
  professional: { name: 'Professional', price: '€19.99', storage: '200GB', clients: 500, color: 'purple' },
  enterprise: { name: 'Enterprise', price: '€39.99', storage: '1TB', clients: 'Unlimited', color: 'orange' },
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function StorageDemoPage() {
  const [activeTab, setActiveTab] = useState<'archive' | 'subscription'>('archive');
  const [selectedFiles, setSelectedFiles] = useState<number[]>([]);
  const [uploadingDemo, setUploadingDemo] = useState(false);

  const handleDemoUpload = () => {
    setUploadingDemo(true);
    setTimeout(() => {
      setUploadingDemo(false);
      alert('✅ Demo Upload Complete! (No actual file was uploaded - this is a demo)');
    }, 2000);
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image': return <Image className="w-5 h-5 text-blue-500" />;
      case 'video': return <File className="w-5 h-5 text-purple-500" />;
      case 'document': return <File className="w-5 h-5 text-red-500" />;
      default: return <File className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Demo Banner */}
        <div className="mb-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-6 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <Package className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-2">🎬 Storage Subscription System - DEMO MODE</h1>
              <p className="text-blue-50 mb-3">
                This is a fully interactive demo of the storage subscription system. All features are shown with mock data.
              </p>
              <div className="flex gap-3">
                <Badge className="bg-white/20 text-white border-white/40">Professional Plan (€19.99/mo)</Badge>
                <Badge className="bg-white/20 text-white border-white/40">84% Storage Used</Badge>
                <Badge className="bg-white/20 text-white border-white/40">1,247 Files</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('archive')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'archive'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <HardDrive className="w-5 h-5 inline mr-2" />
            My Archive
          </button>
          <button
            onClick={() => setActiveTab('subscription')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'subscription'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <CreditCard className="w-5 h-5 inline mr-2" />
            My Subscription
          </button>
        </div>

        {/* Archive Tab */}
        {activeTab === 'archive' && (
          <div className="space-y-6">
            {/* Storage Upgrade Prompt */}
            <StorageUpgradePrompt
              currentUsageBytes={mockUsage.currentStorageBytes}
              storageLimitBytes={mockUsage.storageLimit}
              currentTier={mockSubscription.tier}
              percentUsed={mockUsage.percentUsed}
              onUpgradeClick={() => setActiveTab('subscription')}
            />

            {/* Storage Usage Widget */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <HardDrive className="w-6 h-6 text-blue-600" />
                    <div>
                      <CardTitle>Storage Usage</CardTitle>
                      <CardDescription>Professional Plan</CardDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">168GB</p>
                    <p className="text-sm text-gray-500">of 200GB</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Progress value={mockUsage.percentUsed} className="h-3 [&>div]:bg-yellow-500" />
                <div className="flex justify-between text-sm text-gray-600 mt-2">
                  <span>{mockUsage.fileCount} files</span>
                  <span>{mockUsage.percentUsed}% used</span>
                </div>
              </CardContent>
            </Card>

            {/* Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle>Upload Files</CardTitle>
                <CardDescription>Drag and drop files or click to browse</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 transition-colors cursor-pointer">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">Drop files here or click to upload</p>
                  <p className="text-sm text-gray-500">Supports: Images, Videos, PDFs (Max 500MB)</p>
                  <Button className="mt-4" onClick={handleDemoUpload} disabled={uploadingDemo}>
                    {uploadingDemo ? 'Uploading...' : 'Select Files'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Folders */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Folders</CardTitle>
                  <Button variant="outline" size="sm">
                    <FolderPlus className="w-4 h-4 mr-2" />
                    New Folder
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {mockFolders.map((folder) => (
                    <div
                      key={folder.id}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
                    >
                      <Folder className="w-10 h-10 text-yellow-500 mb-2" />
                      <p className="font-medium text-sm truncate">{folder.name}</p>
                      <p className="text-xs text-gray-500">{folder.fileCount} files</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Files List */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Recent Files</CardTitle>
                  {selectedFiles.length > 0 && (
                    <Badge variant="secondary">{selectedFiles.length} selected</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {mockFiles.map((file) => (
                    <div
                      key={file.id}
                      className={`flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors ${
                        selectedFiles.includes(file.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFiles.includes(file.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedFiles([...selectedFiles, file.id]);
                          } else {
                            setSelectedFiles(selectedFiles.filter((id) => id !== file.id));
                          }
                        }}
                        className="w-4 h-4"
                      />
                      {getFileIcon(file.type)}
                      <div className="flex-1">
                        <p className="font-medium text-sm">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {file.size > 10 ? `${file.size.toFixed(0)} MB` : `${file.size} MB`} • {file.date}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Subscription Tab */}
        {activeTab === 'subscription' && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Current Plan */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        Current Plan
                      </CardTitle>
                      <CardDescription>Your active subscription details</CardDescription>
                    </div>
                    <Badge className="bg-green-500">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                    <div>
                      <h3 className="text-2xl font-bold text-purple-900">Professional</h3>
                      <p className="text-sm text-purple-700">200GB storage • 500 clients</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-purple-600">€19.99</p>
                      <p className="text-sm text-purple-700">per month</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="font-medium">Current billing period</p>
                      <p className="text-gray-600">September 16, 2025 - October 16, 2025</p>
                    </div>
                  </div>

                  <div>
                    <p className="font-medium mb-3">Plan features</p>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        200GB of storage
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Up to 500 clients
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Advanced file management
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Gallery transfer feature
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Priority email support
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Storage Usage Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HardDrive className="w-5 h-5" />
                    Storage Usage
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-3xl font-bold">168GB</p>
                      <p className="text-sm text-gray-500">of 200GB used</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-400">84%</p>
                      <p className="text-sm text-gray-500">1,247 files</p>
                    </div>
                  </div>
                  <Progress value={84} className="h-3 [&>div]:bg-yellow-500" />
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>32GB remaining</span>
                    <span className="text-yellow-600 font-medium">Approaching limit</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" onClick={() => setActiveTab('archive')}>
                    <HardDrive className="w-4 h-4 mr-2" />
                    Manage Files
                  </Button>
                </CardFooter>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" variant="outline">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Manage Billing
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    View All Plans
                  </Button>
                  <Button className="w-full justify-start" variant="ghost" disabled>
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Cancel Subscription
                  </Button>
                </CardContent>
              </Card>

              {/* Upgrade Card */}
              <Card className="border-2 border-orange-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-700">
                    <TrendingUp className="w-5 h-5" />
                    Upgrade Available
                  </CardTitle>
                  <CardDescription>Get more storage and features</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <Badge className="mb-2 bg-orange-500">Recommended</Badge>
                    <h4 className="font-semibold mb-1">Enterprise Plan</h4>
                    <p className="text-2xl font-bold text-orange-600 mb-2">€39.99/mo</p>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>✓ 1TB storage (5x more)</li>
                      <li>✓ Unlimited clients</li>
                      <li>✓ Custom integrations</li>
                      <li>✓ Priority support</li>
                    </ul>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full bg-orange-500 hover:bg-orange-600">
                    Upgrade Now
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        )}

        {/* Demo Info Footer */}
        <Card className="mt-8 bg-gray-50">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-3">💡 Demo Features Showcased:</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">✅ Archive Interface:</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Storage usage widget with progress bar</li>
                  <li>• Upgrade prompt at 84% usage</li>
                  <li>• File upload interface</li>
                  <li>• Folder organization</li>
                  <li>• File list with selection</li>
                  <li>• Download and delete actions</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">✅ Subscription Management:</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Current plan details & status</li>
                  <li>• Billing period information</li>
                  <li>• Plan features list</li>
                  <li>• Storage usage breakdown</li>
                  <li>• Quick actions menu</li>
                  <li>• Upgrade recommendations</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Note:</strong> This is a frontend-only demo. To make it fully functional, we need to fix the backend schema mismatches
                (UUID vs integer IDs). All UI components are ready and working!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

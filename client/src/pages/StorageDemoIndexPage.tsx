/**
 * Storage System Demo Index
 * Quick navigation to all storage demo pages
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, 
  PlayCircle, 
  FileText, 
  ExternalLink,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function StorageDemoIndexPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 text-lg">
            <Package className="w-5 h-5 mr-2 inline" />
            Digital Storage Subscription System
          </Badge>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Welcome to the Demo
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Explore a complete storage subscription system with tiered plans, quota management, 
            file uploads, and smart upgrade prompts.
          </p>
        </div>

        {/* Status Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="border-2 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-900 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-green-700 font-semibold">✅ All Components Built</p>
              <p className="text-sm text-green-600 mt-2">8/8 tasks completed</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-900 flex items-center gap-2">
                <PlayCircle className="w-5 h-5" />
                Demo Mode
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-blue-700 font-semibold">🎬 Interactive UI Demo</p>
              <p className="text-sm text-blue-600 mt-2">Mock data, real interface</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-yellow-900 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Documentation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-yellow-700 font-semibold">📋 20 Enhancement Ideas</p>
              <p className="text-sm text-yellow-600 mt-2">Ready for future development</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Demo Card */}
        <Card className="border-4 border-purple-300 shadow-2xl mb-12">
          <CardHeader className="bg-gradient-to-r from-purple-100 to-blue-100">
            <CardTitle className="text-3xl flex items-center gap-3">
              <PlayCircle className="w-8 h-8 text-purple-600" />
              Interactive Demo
            </CardTitle>
            <CardDescription className="text-lg">
              Click through the complete storage subscription interface with realistic mock data
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 gap-8 mb-6">
              <div>
                <h3 className="font-semibold text-lg mb-3 text-gray-900">📦 My Archive Features:</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Storage usage widget with real-time progress</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Smart upgrade prompts at 75%, 90%, 100%</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>File upload interface with drag & drop</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Folder organization system</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>File listing with multi-select</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3 text-gray-900">💳 Subscription Management:</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Current plan overview with status badges</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Billing period and renewal information</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Storage usage breakdown with charts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Quick actions (billing, plans, cancel)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Upgrade recommendations with pricing</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6 mb-6">
              <h4 className="font-semibold text-purple-900 mb-2">🎭 Demo Scenario:</h4>
              <p className="text-purple-800">
                You're on a <strong>Professional Plan (€19.99/mo)</strong> with <strong>200GB storage</strong>. 
                Currently using <strong>168GB (84%)</strong> with <strong>1,247 files</strong>. 
                The system will show upgrade prompts since you're approaching the limit.
              </p>
            </div>

            <div className="flex gap-4">
              <Button 
                size="lg" 
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                onClick={() => navigate('/storage-demo')}
              >
                <PlayCircle className="w-5 h-5 mr-2" />
                Launch Interactive Demo
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Technical Info */}
        <Card>
          <CardHeader>
            <CardTitle>🔧 Technical Implementation</CardTitle>
            <CardDescription>What's been built (backend needs schema fixes to go live)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3">✅ Backend (API Routes):</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Stripe subscription checkout & webhooks</li>
                  <li>• File upload with S3 integration</li>
                  <li>• Storage quota validation</li>
                  <li>• Gallery image transfer to archives</li>
                  <li>• Usage statistics & recommendations</li>
                  <li>• Subscription cancellation</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-3">✅ Frontend (React Components):</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• MyArchivePage with drag-drop uploads</li>
                  <li>• MySubscriptionPage with plan details</li>
                  <li>• StorageUpgradePrompt component</li>
                  <li>• Progress bars & status indicators</li>
                  <li>• File & folder management UI</li>
                  <li>• Responsive design with Tailwind</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-900">
                <strong>⚠️ Known Issue:</strong> Schema mismatch (UUIDs vs integers). Backend needs type fixes before production.
                The demo uses mock data to showcase the complete UI/UX flow.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-600">
          <p className="text-sm">
            Built with React, TypeScript, Tailwind CSS, Drizzle ORM, Stripe, and AWS S3
          </p>
        </div>
      </div>
    </div>
  );
}

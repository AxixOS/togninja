import React, { useState } from 'react';
import { Bot, Zap, Mail, Calendar, UserPlus, FileText, BarChart3, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import EmbeddedCRMChat from '../../components/chat/EmbeddedCRMChat';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';

interface CRMAction {
  type: 'email' | 'booking' | 'client' | 'invoice' | 'data' | 'calendar';
  action: string;
  data?: any;
}

const CRMOperationsAssistant: React.FC = () => {
  const [recentActions, setRecentActions] = useState<CRMAction[]>([]);

  const handleCRMAction = (action: CRMAction) => {
    console.log('CRM Action performed:', action);
    setRecentActions(prev => [action, ...prev.slice(0, 4)]); // Keep last 5 actions
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'booking': 
      case 'calendar': return <Calendar className="h-4 w-4" />;
      case 'client': return <UserPlus className="h-4 w-4" />;
      case 'invoice': return <FileText className="h-4 w-4" />;
      case 'data': return <BarChart3 className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  const getActionColor = (type: string) => {
    switch (type) {
      case 'email': return 'bg-blue-100 text-blue-800';
      case 'booking': 
      case 'calendar': return 'bg-green-100 text-green-800';
      case 'client': return 'bg-purple-100 text-purple-800';
      case 'invoice': return 'bg-orange-100 text-orange-800';
      case 'data': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Link to="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Bot className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">CRM Operations Assistant</h1>
              <p className="text-gray-600">AI-powered automation for your photography business</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Mail className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Email Automations</p>
                  <p className="text-2xl font-bold">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Booking Management</p>
                  <p className="text-2xl font-bold">Ready</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <UserPlus className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Client Management</p>
                  <p className="text-2xl font-bold">Online</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Analytics</p>
                  <p className="text-2xl font-bold">Live</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Interface */}
        <div className="lg:col-span-2">
          <Card className="h-[700px]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-purple-600" />
                AI Assistant Chat
              </CardTitle>
              <CardDescription>
                Get help with CRM operations, automation, and business management
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[600px] p-0">
              <EmbeddedCRMChat
                assistantId="asst_CH4vIbZPs7gUD36Lxf7vlfIV"
                onCRMAction={handleCRMAction}
                height="100%"
                title="CRM Operations Assistant"
                className="border-0 rounded-none"
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Recent Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Actions</CardTitle>
              <CardDescription>
                Actions performed by the AI assistant
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentActions.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No actions performed yet
                </p>
              ) : (
                <div className="space-y-3">
                  {recentActions.map((action, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Badge className={getActionColor(action.type)}>
                        {getActionIcon(action.type)}
                        <span className="ml-1">{action.type}</span>
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {action.action}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Capabilities</CardTitle>
              <CardDescription>
                What the assistant can help you with
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Email Management</p>
                    <p className="text-xs text-gray-500">Send confirmations & replies</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <Calendar className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Schedule Management</p>
                    <p className="text-xs text-gray-500">Book & manage appointments</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <UserPlus className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium">Client Records</p>
                    <p className="text-xs text-gray-500">Create & update client data</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <FileText className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium">Invoice Generation</p>
                    <p className="text-xs text-gray-500">Create & send invoices</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <BarChart3 className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="text-sm font-medium">Analytics & Reports</p>
                    <p className="text-xs text-gray-500">Generate business insights</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assistant Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Assistant Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Model:</span>
                  <span>GPT-4</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Assistant ID:</span>
                  <span className="font-mono text-xs">asst_CH4v...f7vlfIV</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CRMOperationsAssistant;
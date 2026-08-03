import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import { Plus, Image, Users, Lock, Globe, Edit, Trash2, Eye, ExternalLink } from 'lucide-react';

interface Gallery {
  id: string;
  title: string;
  slug: string;
  description: string;
  cover_image: string;
  is_public: boolean;
  is_password_protected: boolean;
  client_id: string;
  client_name: string;
  client_email: string;
  image_count: number;
  created_at: string;
  updated_at: string;
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface GalleryAnalytics {
  totalGalleries: number;
  totalImages: number;
  publicGalleries: number;
  protectedGalleries: number;
}

const GalleriesPage: React.FC = () => {
  const navigate = useNavigate();
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [analytics, setAnalytics] = useState<GalleryAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>('');
  
  // Create gallery form state
  const [newGallery, setNewGallery] = useState({
    title: '',
    description: '',
    clientId: '',
    isPublic: true,
    isPasswordProtected: false,
    password: ''
  });

  useEffect(() => {
    fetchGalleries();
    fetchClients();
    fetchAnalytics();
  }, [selectedClientFilter]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/admin/galleries/analytics', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const fetchGalleries = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedClientFilter) {
        params.append('clientId', selectedClientFilter);
      }
      
      const response = await fetch(`/api/galleries?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setGalleries(data);
      }
    } catch (error) {
      console.error('Failed to fetch galleries:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/crm/clients');
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  const handleCreateGallery = async () => {
    try {
      const response = await fetch('/api/galleries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newGallery),
      });

      if (response.ok) {
        const data = await response.json();
        setGalleries([data, ...galleries]);
        setIsCreateModalOpen(false);
        setNewGallery({
          title: '',
          description: '',
          clientId: '',
          isPublic: true,
          isPasswordProtected: false,
          password: ''
        });
        // Navigate to the new gallery detail page
        if (data?.id) {
          navigate(`/admin/galleries/${data.id}`);
        }
      }
    } catch (error) {
      console.error('Failed to create gallery:', error);
    }
  };

  const handleDeleteGallery = async (galleryId: string, galleryTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${galleryTitle}"? This will also delete all images in this gallery.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/galleries/${galleryId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setGalleries(galleries.filter(g => g.id !== galleryId));
      }
    } catch (error) {
      console.error('Failed to delete gallery:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-AT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (gallery: Gallery) => {
    if (gallery.is_password_protected) {
      return <Badge variant="secondary"><Lock className="w-3 h-3 mr-1" />Protected</Badge>;
    } else if (gallery.is_public) {
      return <Badge variant="default"><Globe className="w-3 h-3 mr-1" />Public</Badge>;
    } else {
      return <Badge variant="outline"><Eye className="w-3 h-3 mr-1" />Private</Badge>;
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-600">Loading galleries...</div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Client Galleries</h1>
            <p className="text-gray-600 mt-1">Manage photo galleries for client delivery</p>
          </div>
          
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Gallery
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Gallery</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Gallery Title</label>
                  <Input
                    value={newGallery.title}
                    onChange={(e) => setNewGallery({ ...newGallery, title: e.target.value })}
                    placeholder="e.g., Smith Family Session - December 2024"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Client</label>
                  <select
                    value={newGallery.clientId}
                    onChange={(e) => setNewGallery({ ...newGallery, clientId: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select a client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.first_name} {client.last_name} ({client.email})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <Textarea
                    value={newGallery.description}
                    onChange={(e) => setNewGallery({ ...newGallery, description: e.target.value })}
                    placeholder="Optional description or notes about this gallery"
                    rows={3}
                  />
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Public Gallery</label>
                    <Switch
                      checked={newGallery.isPublic}
                      onCheckedChange={(checked) => setNewGallery({ ...newGallery, isPublic: checked })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Password Protected</label>
                    <Switch
                      checked={newGallery.isPasswordProtected}
                      onCheckedChange={(checked) => setNewGallery({ ...newGallery, isPasswordProtected: checked })}
                    />
                  </div>
                  
                  {newGallery.isPasswordProtected && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Password</label>
                      <Input
                        type="password"
                        value={newGallery.password}
                        onChange={(e) => setNewGallery({ ...newGallery, password: e.target.value })}
                        placeholder="Enter gallery password"
                      />
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleCreateGallery} className="flex-1">
                    Create Gallery
                  </Button>
                  <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Analytics Dashboard */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium mb-1">Galerien Gesamt</p>
                    <p className="text-4xl font-bold">{analytics.totalGalleries}</p>
                    <p className="text-purple-100 text-xs mt-1">Verfügbar zum Anschauen</p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-lg">
                    <Image className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-pink-100 text-sm font-medium mb-1">Fotos Gesamt</p>
                    <p className="text-4xl font-bold">{analytics.totalImages.toString().padStart(5, '0')}</p>
                    <p className="text-pink-100 text-xs mt-1">In allen Galerien</p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-lg">
                    <Image className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-cyan-100 text-sm font-medium mb-1">Öffentlich</p>
                    <p className="text-4xl font-bold">{analytics.publicGalleries}</p>
                    <p className="text-cyan-100 text-xs mt-1">Offene Galerien</p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-lg">
                    <Globe className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-100 text-sm font-medium mb-1">Geschützt</p>
                    <p className="text-4xl font-bold">{analytics.protectedGalleries}</p>
                    <p className="text-amber-100 text-xs mt-1">Zugangscode erforderlich</p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-lg">
                    <Lock className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6">
          <div className="flex gap-4 items-center">
            <div>
              <label className="block text-sm font-medium mb-1">Filter by Client</label>
              <select
                value={selectedClientFilter}
                onChange={(e) => setSelectedClientFilter(e.target.value)}
                className="p-2 border border-gray-300 rounded-md"
              >
                <option value="">All Clients</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.first_name} {client.last_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Galleries Grid */}
        {galleries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {galleries.map((gallery) => (
              <Card key={gallery.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2">{gallery.title}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        {gallery.client_name} • {formatDate(gallery.created_at)}
                      </p>
                    </div>
                    {getStatusBadge(gallery)}
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  {gallery.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {gallery.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <div className="flex items-center">
                      <Image className="w-4 h-4 mr-1" />
                      {gallery.image_count} images
                    </div>
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      {gallery.client_name}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate(`/admin/galleries/${gallery.id}/edit`)}>
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => window.open(`/gallery/${gallery.slug}`, '_blank')}>
                      <ExternalLink className="w-3 h-3 mr-1" />
                      View
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleDeleteGallery(gallery.id, gallery.title)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Image className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No galleries found</h3>
            <p className="text-gray-600 mb-4">
              {selectedClientFilter 
                ? "No galleries found for the selected client." 
                : "Create your first client gallery to organize and deliver photos."
              }
            </p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Gallery
            </Button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default GalleriesPage;
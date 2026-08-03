import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Save,
  X,
  BookOpen,
  MessageCircle,
  Settings,
  Eye,
  Bot,
  Brain,
  Database,
  FileText,
  Tag,
  Clock,
  User,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface KnowledgeBaseEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface OpenAIAssistant {
  id: string;
  name: string;
  description: string;
  model: string;
  instructions: string;
  isActive: boolean;
  knowledgeBaseIds: string[];
  createdAt: string;
}

const KnowledgeBasePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'knowledge' | 'assistants' | 'settings'>('knowledge');
  const [knowledgeEntries, setKnowledgeEntries] = useState<KnowledgeBaseEntry[]>([]);
  const [assistants, setAssistants] = useState<OpenAIAssistant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateAssistantModal, setShowCreateAssistantModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KnowledgeBaseEntry | null>(null);
  const [editingAssistant, setEditingAssistant] = useState<OpenAIAssistant | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    tags: '',
  });

  // Assistant form states
  const [assistantFormData, setAssistantFormData] = useState({
    name: '',
    description: '',
    model: 'gpt-4o',
    instructions: '',
    knowledgeBaseIds: [] as string[],
  });

  const categories = [
    'General FAQ',
    'Booking Process',
    'Pricing & Packages',
    'Photography Services',
    'Technical Support',
    'Policies & Terms',
    'Equipment & Setup',
    'Post-Processing',
    'Gallery Access',
    'Payment & Invoicing'
  ];

  useEffect(() => {
    fetchKnowledgeBase();
    fetchAssistants();
  }, []);

  const fetchKnowledgeBase = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/knowledge-base', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setKnowledgeEntries(data);
      }
    } catch (error) {
      // console.error removed
      // For now, use sample data
      setKnowledgeEntries([
        {
          id: '1',
          title: 'How to book a photo session?',
          content: 'To book a photo session, clients can visit our booking page, select their preferred package, choose available dates, and complete the booking form with their contact details.',
          category: 'Booking Process',
          tags: ['booking', 'session', 'calendar'],
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'admin'
        },
        {
          id: '2',
          title: 'What are your photography packages?',
          content: 'We offer several packages: Family Session (€299), Newborn Session (€399), Maternity Session (€349), and Business Headshots (€199). All packages include professional editing and digital gallery access.',
          category: 'Pricing & Packages',
          tags: ['pricing', 'packages', 'family', 'newborn'],
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'admin'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssistants = async () => {
    try {
      const response = await fetch('/api/openai/assistants', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setAssistants(data);
      }
    } catch (error) {
      // console.error removed
      // Sample data
      setAssistants([
        {
          id: 'asst_support_chat_v1',
          name: 'Support Chat Assistant',
          description: 'Handles customer support inquiries using knowledge base',
          model: 'gpt-4o',
          instructions: 'You are a helpful photography studio assistant. Use the knowledge base to answer questions about booking, pricing, and services.',
          isActive: true,
          knowledgeBaseIds: ['1', '2'],
          createdAt: new Date().toISOString()
        }
      ]);
    }
  };

  const handleCreateEntry = async () => {
    if (!formData.title || !formData.content) {
      setError('Title and content are required');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/knowledge-base', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          category: formData.category || 'General FAQ',
          tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
          isActive: true
        })
      });

      if (response.ok) {
        const newEntry = await response.json();
        setKnowledgeEntries([...knowledgeEntries, newEntry]);
        setShowCreateModal(false);
        resetForm();
      } else {
        setError('Failed to create knowledge base entry');
      }
    } catch (error) {
      setError('Failed to create knowledge base entry');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEntry = async () => {
    if (!editingEntry || !formData.title || !formData.content) {
      setError('Title and content are required');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/knowledge-base/${editingEntry.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          category: formData.category || editingEntry.category,
          tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
          isActive: true
        })
      });

      if (response.ok) {
        const updatedEntry = await response.json();
        const updatedEntries = knowledgeEntries.map(entry =>
          entry.id === editingEntry.id ? updatedEntry : entry
        );
        setKnowledgeEntries(updatedEntries);
        setEditingEntry(null);
        resetForm();
      } else {
        setError('Failed to update knowledge base entry');
      }
    } catch (error) {
      setError('Failed to update knowledge base entry');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (confirm('Are you sure you want to delete this knowledge base entry?')) {
      try {
        const response = await fetch(`/api/knowledge-base/${id}`, {
          method: 'DELETE',
          credentials: 'include'
        });

        if (response.ok) {
          setKnowledgeEntries(knowledgeEntries.filter(entry => entry.id !== id));
        } else {
          setError('Failed to delete knowledge base entry');
        }
      } catch (error) {
        setError('Failed to delete knowledge base entry');
      }
    }
  };

  const resetForm = () => {
    setFormData({ title: '', content: '', category: '', tags: '' });
    setError(null);
  };

  const resetAssistantForm = () => {
    setAssistantFormData({
      name: '',
      description: '',
      model: 'gpt-4o',
      instructions: '',
      knowledgeBaseIds: []
    });
    setError(null);
  };

  const handleCreateAssistant = async () => {
    if (!assistantFormData.name || !assistantFormData.instructions) {
      setError('Name and instructions are required');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/openai/assistants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: assistantFormData.name,
          description: assistantFormData.description,
          model: assistantFormData.model,
          instructions: assistantFormData.instructions,
          knowledgeBaseIds: assistantFormData.knowledgeBaseIds,
          isActive: true
        })
      });

      if (response.ok) {
        const newAssistant = await response.json();
        setAssistants([...assistants, newAssistant]);
        setShowCreateAssistantModal(false);
        resetAssistantForm();
      } else {
        setError('Failed to create assistant');
      }
    } catch (error) {
      setError('Failed to create assistant');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssistant = async (id: string) => {
    if (confirm('Are you sure you want to delete this assistant?')) {
      try {
        const response = await fetch(`/api/openai/assistants/${id}`, {
          method: 'DELETE',
          credentials: 'include'
        });

        if (response.ok) {
          setAssistants(assistants.filter(assistant => assistant.id !== id));
        } else {
          setError('Failed to delete assistant');
        }
      } catch (error) {
        setError('Failed to delete assistant');
      }
    }
  };

  const startEdit = (entry: KnowledgeBaseEntry) => {
    setEditingEntry(entry);
    setFormData({
      title: entry.title,
      content: entry.content,
      category: entry.category,
      tags: entry.tags.join(', ')
    });
    setShowCreateModal(true);
  };

  const filteredEntries = knowledgeEntries.filter(entry => {
    const matchesSearch = entry.title?.toLowerCase()?.includes(searchTerm?.toLowerCase() || '') ||
                         entry.content?.toLowerCase()?.includes(searchTerm?.toLowerCase() || '');

    const matchesCategory = selectedCategory === 'all' || entry.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const renderKnowledgeBaseTab = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
          <p className="text-gray-600 mt-1">Manage support articles and FAQ content for your chat assistant</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
        >
          <Plus size={20} />
          Add Article
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search articles..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="all">All Categories</option>
          {categories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Articles</p>
              <p className="text-2xl font-semibold text-gray-900">{knowledgeEntries.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Active Articles</p>
              <p className="text-2xl font-semibold text-gray-900">
                {knowledgeEntries.filter(e => e.isActive).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <Tag className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Categories</p>
              <p className="text-2xl font-semibold text-gray-900">
                {new Set(knowledgeEntries.map(e => e.category)).size}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <Bot className="h-8 w-8 text-indigo-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">AI Assistants</p>
              <p className="text-2xl font-semibold text-gray-900">{assistants.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Articles List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Knowledge Base Articles</h3>
        </div>

        {loading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No articles found. Create your first knowledge base article to get started.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredEntries.map((entry) => (
              <div key={entry.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-lg font-medium text-gray-900">{entry.title}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        entry.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {entry.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <p className="text-gray-600 mb-3 line-clamp-2">{entry.content}</p>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Tag size={14} />
                        {entry.category}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {new Date(entry.updatedAt).toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-1">
                        {entry.tags.map(tag => (
                          <span key={tag} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => startEdit(entry)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderAssistantsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Assistants</h1>
          <p className="text-gray-600 mt-1">Manage OpenAI assistants and their knowledge base connections</p>
        </div>
        <button
          onClick={() => setShowCreateAssistantModal(true)}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
        >
          <Plus size={20} />
          Create Assistant
        </button>
      </div>

      <div className="grid gap-6">
        {assistants.map((assistant) => (
          <div key={assistant.id} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <Bot className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{assistant.name}</h3>
                  <p className="text-gray-600">{assistant.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 text-sm rounded-full ${
                  assistant.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {assistant.isActive ? 'Active' : 'Inactive'}
                </span>
                <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                  <Settings size={16} />
                </button>
                <button
                  onClick={() => handleDeleteAssistant(assistant.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-500">Model:</span>
                <p className="text-gray-900">{assistant.model}</p>
              </div>
              <div>
                <span className="font-medium text-gray-500">Knowledge Articles:</span>
                <p className="text-gray-900">{assistant.knowledgeBaseIds.length} connected</p>
              </div>
              <div>
                <span className="font-medium text-gray-500">Created:</span>
                <p className="text-gray-900">{new Date(assistant.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
              <span className="font-medium text-gray-500">Instructions:</span>
              <p className="text-gray-700 mt-1">{assistant.instructions}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
              { id: 'assistants', label: 'AI Assistants', icon: Bot },
              { id: 'settings', label: 'Chat Settings', icon: Settings }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'knowledge' && renderKnowledgeBaseTab()}
        {activeTab === 'assistants' && renderAssistantsTab()}
        {activeTab === 'settings' && (
          <div className="text-center py-12 text-gray-500">
            Chat settings configuration coming soon...
          </div>
        )}

        {/* Create/Edit Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {editingEntry ? 'Edit Article' : 'Create New Article'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingEntry(null);
                      resetForm();
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={24} />
                  </button>
                </div>

                {error && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Enter article title..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option value="">Select category...</option>
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="booking, pricing, faq"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Content *
                    </label>
                    <textarea
                      rows={8}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Enter article content..."
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingEntry(null);
                      resetForm();
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editingEntry ? handleUpdateEntry : handleCreateEntry}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                  >
                    <Save size={16} />
                    {editingEntry ? 'Update' : 'Create'} Article
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Assistant Modal */}
        {showCreateAssistantModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Create AI Assistant</h2>
                  <button
                    onClick={() => {
                      setShowCreateAssistantModal(false);
                      resetAssistantForm();
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={24} />
                  </button>
                </div>

                {error && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assistant Name *
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      value={assistantFormData.name}
                      onChange={(e) => setAssistantFormData({ ...assistantFormData, name: e.target.value })}
                      placeholder="e.g., Support Chat Assistant"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      value={assistantFormData.description}
                      onChange={(e) => setAssistantFormData({ ...assistantFormData, description: e.target.value })}
                      placeholder="Brief description of the assistant's purpose"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      AI Model
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      value={assistantFormData.model}
                      onChange={(e) => setAssistantFormData({ ...assistantFormData, model: e.target.value })}
                    >
                      <option value="gpt-4o">GPT-4o (Latest, Recommended)</option>
                      <option value="gpt-4">GPT-4</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      System Instructions *
                    </label>
                    <textarea
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      value={assistantFormData.instructions}
                      onChange={(e) => setAssistantFormData({ ...assistantFormData, instructions: e.target.value })}
                      placeholder="Define how the assistant should behave and respond to users..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Knowledge Base Articles
                    </label>
                    <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-3 space-y-2">
                      {knowledgeEntries.map((entry) => (
                        <label key={entry.id} className="flex items-center">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            checked={assistantFormData.knowledgeBaseIds.includes(entry.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAssistantFormData({
                                  ...assistantFormData,
                                  knowledgeBaseIds: [...assistantFormData.knowledgeBaseIds, entry.id]
                                });
                              } else {
                                setAssistantFormData({
                                  ...assistantFormData,
                                  knowledgeBaseIds: assistantFormData.knowledgeBaseIds.filter(id => id !== entry.id)
                                });
                              }
                            }}
                          />
                          <span className="ml-2 text-sm text-gray-700">{entry.title}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Select which knowledge base articles this assistant can access
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleCreateAssistant}
                    disabled={loading}
                    className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? 'Creating...' : (
                      <>
                        <Save size={16} />
                        Create Assistant
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateAssistantModal(false);
                      resetAssistantForm();
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default KnowledgeBasePage;
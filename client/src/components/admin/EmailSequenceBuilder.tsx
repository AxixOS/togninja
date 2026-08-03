import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Pause, 
  Clock, 
  Mail, 
  Users, 
  TrendingUp,
  ArrowDown,
  ArrowRight,
  Copy,
  Settings,
  Brain,
  Target,
  Zap,
  BarChart3
} from 'lucide-react';
import { EmailSequence, SequenceEmail } from '../../types/email-marketing';
import { 
  getSequences, 
  createSequence, 
  updateSequence,
  getAIRecommendations 
} from '../../lib/email-marketing';

const EmailSequenceBuilder: React.FC = () => {
  const [sequences, setSequences] = useState<EmailSequence[]>([]);
  const [selectedSequence, setSelectedSequence] = useState<EmailSequence | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSequences();
  }, []);

  const loadSequences = async () => {
    try {
      const data = await getSequences();
      setSequences(data);
    } catch (error) {
      // console.error removed
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSequence = async (sequenceData: Partial<EmailSequence>) => {
    try {
      const newSequence = await createSequence(sequenceData);
      setSequences(prev => [newSequence, ...prev]);
      setShowCreateModal(false);
    } catch (error) {
      // console.error removed
    }
  };

  const SequenceCard: React.FC<{ sequence: EmailSequence }> = ({ sequence }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{sequence.name}</h3>
          <p className="text-sm text-gray-600">{sequence.description}</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            sequence.status === 'active' 
              ? 'bg-green-100 text-green-800' 
              : sequence.status === 'paused'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {sequence.status}
          </span>
          <button className="text-gray-400 hover:text-gray-600">
            <Settings size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <div className="text-2xl font-bold text-gray-900">{sequence.emails.length}</div>
          <div className="text-sm text-gray-500">Emails</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-purple-600">{sequence.subscribers_count}</div>
          <div className="text-sm text-gray-500">Subscribers</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-green-600">{(sequence.conversion_rate * 100).toFixed(1)}%</div>
          <div className="text-sm text-gray-500">Conversion</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center text-sm text-gray-500">
          <div className={`w-2 h-2 rounded-full mr-2 ${
            sequence.trigger_type === 'signup' ? 'bg-blue-500' :
            sequence.trigger_type === 'purchase' ? 'bg-green-500' :
            sequence.trigger_type === 'behavior' ? 'bg-purple-500' :
            'bg-gray-400'
          }`} />
          Trigger: {sequence.trigger_type}
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={() => setSelectedSequence(sequence)}
            className="text-blue-600 hover:text-blue-800"
          >
            <Edit size={16} />
          </button>
          <button className="text-gray-600 hover:text-gray-800">
            <Copy size={16} />
          </button>
          {sequence.status === 'active' ? (
            <button className="text-yellow-600 hover:text-yellow-800">
              <Pause size={16} />
            </button>
          ) : (
            <button className="text-green-600 hover:text-green-800">
              <Play size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const SequenceBuilder: React.FC<{ sequence: EmailSequence }> = ({ sequence }) => {
    const [emails, setEmails] = useState<SequenceEmail[]>(sequence.emails || []);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [editingEmail, setEditingEmail] = useState<SequenceEmail | null>(null);

    const addEmail = () => {
      const newEmail: Partial<SequenceEmail> = {
        sequence_id: sequence.id,
        order: emails.length + 1,
        name: `Email ${emails.length + 1}`,
        subject: '',
        content: '',
        delay_days: emails.length === 0 ? 0 : 1,
        delay_hours: 0,
        status: 'active',
        personalization: {
          dynamic_content: [],
          conditional_blocks: [],
          product_recommendations: false,
          behavioral_triggers: []
        },
        open_rate: 0,
        click_rate: 0,
        conversion_rate: 0
      };
      
      setEditingEmail(newEmail as SequenceEmail);
      setShowEmailModal(true);
    };

    const EmailCard: React.FC<{ email: SequenceEmail; index: number }> = ({ email, index }) => (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-medium text-gray-900">{email.name}</h4>
            <p className="text-sm text-gray-600">{email.subject}</p>
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={() => {
                setEditingEmail(email);
                setShowEmailModal(true);
              }}
              className="text-blue-600 hover:text-blue-800"
            >
              <Edit size={14} />
            </button>
            <button className="text-red-600 hover:text-red-800">
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center text-gray-500">
            <Clock size={14} className="mr-1" />
            {email.delay_days > 0 ? `${email.delay_days} days` : 'Immediate'}
            {email.delay_hours > 0 && ` ${email.delay_hours}h`}
          </div>
          <div className="flex space-x-4 text-xs">
            <span className="text-blue-600">{(email.open_rate * 100).toFixed(1)}% opens</span>
            <span className="text-green-600">{(email.click_rate * 100).toFixed(1)}% clicks</span>
          </div>
        </div>

        {index < emails.length - 1 && (
          <div className="flex justify-center mt-4">
            <ArrowDown size={20} className="text-gray-400" />
          </div>
        )}
      </div>
    );

    return (
      <div className="space-y-6">
        {/* Sequence Header */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{sequence.name}</h2>
              <p className="text-gray-600">{sequence.description}</p>
            </div>
            <div className="flex space-x-3">
              <button className="flex items-center px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                <BarChart3 size={16} className="mr-2" />
                Analytics
              </button>
              <button className="flex items-center px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                <Brain size={16} className="mr-2" />
                AI Optimize
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{emails.length}</div>
              <div className="text-sm text-gray-500">Total Emails</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{sequence.subscribers_count}</div>
              <div className="text-sm text-gray-500">Active Subscribers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{(sequence.completion_rate * 100).toFixed(1)}%</div>
              <div className="text-sm text-gray-500">Completion Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{(sequence.conversion_rate * 100).toFixed(1)}%</div>
              <div className="text-sm text-gray-500">Conversion Rate</div>
            </div>
          </div>
        </div>

        {/* Sequence Flow */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">Email Sequence Flow</h3>
            <button 
              onClick={addEmail}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <Plus size={16} className="mr-2" />
              Add Email
            </button>
          </div>

          {emails.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">No emails in sequence</h4>
              <p className="text-gray-600 mb-6">Start building your email sequence by adding your first email.</p>
              <button 
                onClick={addEmail}
                className="flex items-center mx-auto px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <Plus size={16} className="mr-2" />
                Add First Email
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {emails.map((email, index) => (
                <EmailCard key={email.id} email={email} index={index} />
              ))}
            </div>
          )}
        </div>

        {/* Trigger Settings */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Trigger Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trigger Type
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                <option value="signup">User Signup</option>
                <option value="purchase">Purchase Made</option>
                <option value="behavior">Behavioral Trigger</option>
                <option value="date">Date-based</option>
                <option value="manual">Manual Enrollment</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trigger Conditions
              </label>
              <button className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left text-gray-500 hover:bg-gray-50">
                Configure conditions...
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const CreateSequenceModal: React.FC = () => {
    const [formData, setFormData] = useState({
      name: '',
      description: '',
      trigger_type: 'signup' as const,
      status: 'draft' as const
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      handleCreateSequence({
        ...formData,
        emails: [],
        subscribers_count: 0,
        completion_rate: 0,
        conversion_rate: 0,
        tags: [],
        trigger_conditions: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Email Sequence</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sequence Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Welcome Series"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Describe the purpose of this sequence..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trigger Type
              </label>
              <select
                value={formData.trigger_type}
                onChange={(e) => setFormData({ ...formData, trigger_type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="signup">User Signup</option>
                <option value="purchase">Purchase Made</option>
                <option value="behavior">Behavioral Trigger</option>
                <option value="date">Date-based</option>
                <option value="manual">Manual Enrollment</option>
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Create Sequence
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (selectedSequence) {
    return (
      <div>
        <button
          onClick={() => setSelectedSequence(null)}
          className="flex items-center text-gray-600 hover:text-gray-800 mb-6"
        >
          <ArrowRight size={16} className="mr-2 rotate-180" />
          Back to Sequences
        </button>
        <SequenceBuilder sequence={selectedSequence} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Sequences</h1>
          <p className="text-gray-600">Create automated email sequences that nurture leads and drive conversions</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          <Plus size={16} className="mr-2" />
          Create Sequence
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">{sequences.length}</div>
              <div className="text-sm text-gray-500">Total Sequences</div>
            </div>
            <Zap className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {sequences.filter(s => s.status === 'active').length}
              </div>
              <div className="text-sm text-gray-500">Active Sequences</div>
            </div>
            <Play className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {sequences.reduce((sum, s) => sum + s.subscribers_count, 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">Total Subscribers</div>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {sequences.length > 0 
                  ? (sequences.reduce((sum, s) => sum + s.conversion_rate, 0) / sequences.length * 100).toFixed(1)
                  : 0}%
              </div>
              <div className="text-sm text-gray-500">Avg. Conversion</div>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Sequences Grid */}
      {sequences.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No email sequences yet</h3>
          <p className="text-gray-600 mb-6">
            Create your first automated email sequence to nurture leads and convert customers.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center mx-auto px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Plus size={16} className="mr-2" />
            Create Your First Sequence
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sequences.map((sequence) => (
            <SequenceCard key={sequence.id} sequence={sequence} />
          ))}
        </div>
      )}

      {showCreateModal && <CreateSequenceModal />}
    </div>
  );
};

export default EmailSequenceBuilder;

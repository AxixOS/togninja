import React, { useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { useLanguage } from '../../context/LanguageContext';

const QuestionnairesMain: React.FC = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateQuestionnaireLink = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/create-questionnaire-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: 'demo-client',
          template_id: 'photography-preferences'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create questionnaire link');
      }

      const data = await response.json();
      
      navigator.clipboard.writeText(data.link);
      alert(`✅ Questionnaire link created and copied to clipboard!\n\nLink: ${data.link}\n\nYou can now send this to your client via WhatsApp or email.`);
      
    } catch (err) {
      console.error('Error creating questionnaire link:', err);
      setError('Failed to create questionnaire link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewResponses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/client-questionnaires/demo-client');
      if (!response.ok) {
        throw new Error('Failed to fetch responses');
      }
      
      const data = await response.json();
      console.log('Questionnaire responses:', data);
      
      if (data.length > 0) {
        const responseDetails = data.map((resp: any, index: number) => 
          `Response ${index + 1}:\nSubmitted: ${new Date(resp.submitted_at).toLocaleString()}\nAnswers: ${JSON.stringify(resp.responses, null, 2)}`
        ).join('\n\n');
        
        alert(`Found ${data.length} questionnaire responses:\n\n${responseDetails}`);
      } else {
        alert('No responses found for this questionnaire yet.\n\nTo test:\n1. Click the "Create Link" button\n2. Share the link with a client\n3. Complete the questionnaire\n4. Return here to view responses');
      }
      
    } catch (err) {
      console.error('Error fetching responses:', err);
      setError('Failed to fetch questionnaire responses.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Questionnaires</h1>
          <p className="mt-2 text-gray-600">Create and manage client surveys and questionnaires</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        )}

        <div className="bg-white shadow-lg rounded-lg p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="text-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors">
              <div className="text-blue-600 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Create Questionnaire Link</h3>
              <p className="text-gray-500 mb-4">Generate a shareable link for clients to complete questionnaires</p>
              <button
                onClick={handleCreateQuestionnaireLink}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Link'}
              </button>
            </div>

            <div className="text-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 transition-colors">
              <div className="text-purple-600 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">View Responses</h3>
              <p className="text-gray-500 mb-4">Check submitted questionnaire responses from clients</p>
              <button
                onClick={handleViewResponses}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'View Responses'}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-3">How to use questionnaires:</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p><strong>1. Create Link:</strong> Click "Create Link" to generate a shareable questionnaire link</p>
            <p><strong>2. Share:</strong> Send the copied link to your client via WhatsApp, email, or SMS</p>
            <p><strong>3. Client Completes:</strong> Client clicks the link and fills out the questionnaire</p>
            <p><strong>4. View Responses:</strong> Click "View Responses" to see all submitted questionnaires</p>
            <p><strong>5. Email Notifications:</strong> You'll receive an email when a client submits a questionnaire</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Available Questionnaires:</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-white rounded border">
              <div>
                <p className="font-medium">Photography Session Preferences</p>
                <p className="text-sm text-gray-500">Photography session preferences and details</p>
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Active</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-white rounded border">
              <div>
                <p className="font-medium">Client Satisfaction Survey</p>
                <p className="text-sm text-gray-500">Post-session feedback and satisfaction measurement</p>
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Active</span>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default QuestionnairesMain;
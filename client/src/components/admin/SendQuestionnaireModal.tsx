import React, { useState, useEffect } from 'react';
import { X, Copy, Check } from 'lucide-react';

interface Survey {
  id: string;
  title: string;
  description?: string;
  status?: string;
}

interface SendQuestionnaireModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
}

const SendQuestionnaireModal: React.FC<SendQuestionnaireModalProps> = ({
  isOpen,
  onClose,
  client
}) => {
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>('');
  const [loadingSurveys, setLoadingSurveys] = useState(false);

  const fetchSurveys = async () => {
    try {
      setLoadingSurveys(true);
      const response = await fetch('/api/surveys');
      if (!response.ok) throw new Error('Failed to load questionnaires');
      const data = await response.json();
      const activeSurveys = (data.surveys || []).filter((s: Survey) => s.status === 'active');
      setSurveys(activeSurveys);
      if (activeSurveys.length === 1) {
        setSelectedSurveyId(activeSurveys[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load questionnaires');
    } finally {
      setLoadingSurveys(false);
    }
  };

  const generateLink = async () => {
    if (!selectedSurveyId) {
      setError('Please select a questionnaire');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/create-questionnaire-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: client.id,
          template_id: selectedSurveyId
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate questionnaire link');
      }
      
      const data = await response.json();
      setLink(data.link);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate link');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!link) return;
    
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setLink(null);
      setSelectedSurveyId('');
      setError(null);
      setCopied(false);
      fetchSurveys();
    }
  }, [isOpen]);

  // Auto-generate link when there's only one survey
  useEffect(() => {
    if (surveys.length === 1 && selectedSurveyId && !link && !loading) {
      generateLink();
    }
  }, [selectedSurveyId, surveys]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Send Questionnaire
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Send questionnaire link to:
            </p>
            <p className="font-medium text-gray-900">
              {client.firstName} {client.lastName}
            </p>
            <p className="text-sm text-gray-600">{client.email}</p>
          </div>

          {/* Questionnaire Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Questionnaire
            </label>
            {loadingSurveys ? (
              <p className="text-sm text-gray-500">Loading questionnaires...</p>
            ) : surveys.length === 0 ? (
              <p className="text-sm text-gray-500">No active questionnaires available.</p>
            ) : (
              <div className="space-y-2">
                <select
                  value={selectedSurveyId}
                  onChange={(e) => {
                    setSelectedSurveyId(e.target.value);
                    setLink(null);
                    setCopied(false);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Choose a questionnaire --</option>
                  {surveys.map((survey) => (
                    <option key={survey.id} value={survey.id}>
                      {survey.title}
                    </option>
                  ))}
                </select>
                {selectedSurveyId && !link && !loading && (
                  <button
                    onClick={generateLink}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Generate Link
                  </button>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {loading && (
            <div className="text-center py-4">
              <p className="text-gray-600">Generating questionnaire link...</p>
            </div>
          )}

          {link && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Questionnaire Link
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={link}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                  />
                  <button
                    onClick={copyLink}
                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                    title="Copy link"
                  >
                    {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              <button
                onClick={copyLink}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm font-medium"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? 'Link copied!' : 'Copy link'}</span>
              </button>

              <div className="text-xs text-gray-500 mt-2">
                <p>Copy this link and paste it into an email, WhatsApp or SMS message to your client.</p>
                <p>The link expires in 30 days.</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end space-x-3 p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SendQuestionnaireModal;

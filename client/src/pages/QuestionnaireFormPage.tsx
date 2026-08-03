import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface Question {
  id: string;
  type: 'text' | 'long_text' | 'single_choice' | 'multiple_choice' | 'rating';
  title: string;
  description?: string;
  required: boolean;
  options?: { id: string; text: string }[];
}

interface QuestionnaireData {
  token: string;
  clientName: string;
  clientEmail: string;
  isUsed: boolean;
  survey: {
    title: string;
    description: string;
    pages: Array<{
      id: string;
      title: string;
      questions: Question[];
    }>;
    settings: {
      thankYouMessage?: string;
    };
  };
}

const QuestionnaireFormPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    answers: {} as Record<string, string>
  });

  useEffect(() => {
    if (token) {
      fetchQuestionnaire();
    } else {
      setError('Invalid questionnaire link');
      setLoading(false);
    }
  }, [token]);

  const fetchQuestionnaire = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/questionnaire/${token}`);
      
      if (!response.ok) {
        throw new Error('Questionnaire not found or expired');
      }
      
      const data = await response.json();
      setQuestionnaire(data);
      
      // Pre-fill client info if available
      setFormData(prev => ({
        ...prev,
        clientName: data.clientName || '',
        clientEmail: data.clientEmail || ''
      }));
      
      if (data.isUsed) {
        setError('This questionnaire has already been completed.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load questionnaire');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (questionId: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      answers: {
        ...prev.answers,
        [questionId]: value
      }
    }));
    
    // Clear error if user starts filling the form
    if (error) {
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!questionnaire) return;
    
    // Validate name and email FIRST (mandatory contact info)
    if (!formData.clientName.trim()) {
      setError('Bitte geben Sie Ihren Namen ein. / Please provide your name.');
      const nameField = document.getElementById('client-name-field');
      if (nameField) nameField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    
    if (!formData.clientEmail.trim()) {
      setError('Bitte geben Sie Ihre E-Mail-Adresse ein. / Please provide your email.');
      const nameField = document.getElementById('client-name-field');
      if (nameField) nameField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    
    // Validate required questions
    const allQuestions = questionnaire.survey.pages.flatMap(page => page.questions);
    const requiredQuestions = allQuestions.filter(q => q.required);
    
    for (const question of requiredQuestions) {
      const answer = formData.answers[question.id];
      if (!answer || answer.trim() === '') {
        setError(`Please answer: ${question.title}`);
        const questionElement = document.getElementById(`question-${question.id}`);
        if (questionElement) {
          questionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }
    }
    
    try {
      setSubmitting(true);
      setError(null);
      
      const response = await fetch('/api/email-questionnaire', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token,
          clientName: formData.clientName.trim(),
          clientEmail: formData.clientEmail.trim(),
          answers: formData.answers
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to submit questionnaire' }));
        throw new Error(errorData.error || 'Failed to submit questionnaire');
      }
      
      const result = await response.json();
      console.log('✅ Questionnaire submitted successfully:', result);
      setSubmitted(true);
    } catch (err) {
      console.error('❌ Questionnaire submission error:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit questionnaire. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestion = (question: Question) => {
    const value = formData.answers[question.id] || '';
    const hasError = question.required && (!value || value.trim() === '') && error?.includes(question.title);
    
    switch (question.type) {
      case 'single_choice':
      case 'multiple_choice':
        return (
          <div className={`space-y-2 ${hasError ? 'p-3 border-2 border-red-300 rounded-lg bg-red-50' : ''}`}>
            {question.options?.map(option => (
              <label key={option.id} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name={question.id}
                  value={option.id}
                  checked={value === option.id}
                  onChange={(e) => handleInputChange(question.id, e.target.value)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">{option.text}</span>
              </label>
            ))}
          </div>
        );
      
      case 'long_text':
        return (
          <textarea
            value={value}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
            rows={4}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              hasError ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
            placeholder="Your answer..."
          />
        );
      
      case 'rating':
        return (
          <div className={`space-y-2 ${hasError ? 'p-3 border-2 border-red-300 rounded-lg bg-red-50' : ''}`}>
            <div className="flex space-x-4 items-center">
              {[1, 2, 3, 4, 5].map(rating => (
                <label key={rating} className="flex items-center space-x-1 cursor-pointer">
                  <input
                    type="radio"
                    name={question.id}
                    value={rating.toString()}
                    checked={value === rating.toString()}
                    onChange={(e) => handleInputChange(question.id, e.target.value)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium">{rating}</span>
                </label>
              ))}
            </div>
            {question.description && (
              <p className="text-xs text-gray-500">{question.description}</p>
            )}
          </div>
        );
      
      case 'text':
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              hasError ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
            placeholder="Your answer..."
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading questionnaire...</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Vielen Dank!</h2>
          <p className="text-gray-600 mb-6">
            {questionnaire?.survey.settings.thankYouMessage || 
             'Vielen Dank für das Ausfüllen unseres Fragebogens! Wir werden uns bald bei Ihnen melden.'}
          </p>
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              Ihre Antwort wurde gespeichert und wir werden uns in Kürze bei Ihnen melden.
            </p>
            <p className="text-xs text-gray-400">
              Sie können diese Seite jetzt schließen.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !questionnaire) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Error</h2>
          <p className="text-gray-600 mb-6">
            {error || 'Questionnaire not found or has expired'}
          </p>
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              Please contact us if you continue to experience issues.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <meta name="robots" content="noindex, nofollow" />
      
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {questionnaire.survey.title}
            </h1>
            {questionnaire.survey.description && (
              <p className="text-gray-600">
                {questionnaire.survey.description}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Client Information */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div id="client-name-field">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.clientName}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                    required
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      error?.includes('Namen') && !formData.clientName.trim() ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.clientEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientEmail: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="your@email.com"
                  />
                </div>
              </div>
            </div>

            {/* Questions */}
            {questionnaire.survey.pages.map(page => (
              <div key={page.id} className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-900 border-b pb-2">
                  {page.title}
                </h3>
                
                {page.questions.map(question => (
                  <div key={question.id} id={`question-${question.id}`} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {question.title}
                      {question.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {renderQuestion(question)}
                  </div>
                ))}
              </div>
            ))}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  'Submit Questionnaire'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default QuestionnaireFormPage;

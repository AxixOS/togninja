import React, { useState, useEffect } from 'react';
import { X, Eye, Calendar, FileText, Download } from 'lucide-react';
import { SITE } from '../../config/site';

interface QuestionnaireResponse {
  id: string;
  questionnaireName: string;
  sentDate: string;
  responseDate?: string;
  status: 'sent' | 'responded' | 'expired';
  responses?: Record<string, any>;
  link?: string;
}

interface ViewQuestionnairesModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
}

const ViewQuestionnairesModal: React.FC<ViewQuestionnairesModalProps> = ({
  isOpen,
  onClose,
  clientId,
  clientName
}) => {
  const [questionnaires, setQuestionnaires] = useState<QuestionnaireResponse[]>([]);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<QuestionnaireResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && clientId) {
      fetchQuestionnaires();
    }
  }, [isOpen, clientId]);

  const fetchQuestionnaires = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/client-questionnaires/${clientId}`);
      if (response.ok) {
        const data = await response.json();
        setQuestionnaires(data);
      } else {
        console.error('Failed to fetch questionnaires:', response.statusText);
        setQuestionnaires([]);
      }
    } catch (error) {
      console.error('Failed to fetch questionnaires:', error);
      setQuestionnaires([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'responded':
        return 'bg-green-100 text-green-700';
      case 'sent':
        return 'bg-yellow-100 text-yellow-700';
      case 'expired':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handlePrint = () => {
    if (!selectedQuestionnaire || !selectedQuestionnaire.responses) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>Questionnaire Response - ${selectedQuestionnaire.questionnaireName}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .question { margin-bottom: 15px; }
            .question-label { font-weight: bold; color: #333; }
            .answer { margin-top: 5px; padding: 8px; background-color: #f5f5f5; border-radius: 4px; }
            .meta-info { background-color: #f9f9f9; padding: 10px; border-radius: 4px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${SITE.name}</h1>
            <h2>Questionnaire Response</h2>
          </div>
          <div class="meta-info">
            <p><strong>Client:</strong> ${clientName}</p>
            <p><strong>Questionnaire:</strong> ${selectedQuestionnaire.questionnaireName}</p>
            <p><strong>Sent:</strong> ${formatDate(selectedQuestionnaire.sentDate)}</p>
            <p><strong>Responded:</strong> ${selectedQuestionnaire.responseDate ? formatDate(selectedQuestionnaire.responseDate) : 'Not yet responded'}</p>
          </div>
          <div class="responses">
            ${Object.entries(selectedQuestionnaire.responses).map(([question, answer], index) => `
              <div class="question">
                <div class="question-label">${index + 1}. ${question.replace('question', 'Question ')}</div>
                <div class="answer">${answer}</div>
              </div>
            `).join('')}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Questionnaires & Surveys
            </h2>
            <p className="text-gray-600">Questionnaires for {clientName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Questionnaire List */}
          <div className="w-1/2 border-r overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-gray-600">
                Loading questionnaires...
              </div>
            ) : questionnaires.length === 0 ? (
              <div className="p-6 text-center text-gray-600">
                <FileText size={48} className="mx-auto mb-4 text-gray-400" />
                <p>No questionnaires found for this client</p>
                <p className="text-sm text-gray-500 mt-2">
                  Send a questionnaire to get started
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {questionnaires.map((questionnaire) => (
                  <div
                    key={questionnaire.id}
                    onClick={() => setSelectedQuestionnaire(questionnaire)}
                    className={`p-4 rounded-lg cursor-pointer transition-colors ${
                      selectedQuestionnaire?.id === questionnaire.id
                        ? 'bg-blue-50 border-2 border-blue-200'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(questionnaire.status)}`}>
                        {questionnaire.status.charAt(0).toUpperCase() + questionnaire.status.slice(1)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(questionnaire.sentDate)}
                      </span>
                    </div>
                    <h3 className="font-medium text-gray-900 text-sm mb-1">
                      {questionnaire.questionnaireName}
                    </h3>
                    {questionnaire.responseDate && (
                      <p className="text-xs text-green-600">
                        Responded: {formatDate(questionnaire.responseDate)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Questionnaire Details */}
          <div className="w-1/2 overflow-y-auto">
            {selectedQuestionnaire ? (
              <div className="p-6">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {selectedQuestionnaire.questionnaireName}
                    </h3>
                    {selectedQuestionnaire.responses && (
                      <button
                        onClick={handlePrint}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg flex items-center text-sm"
                      >
                        <Download size={16} className="mr-1" />
                        Print
                      </button>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Sent:</strong> {formatDate(selectedQuestionnaire.sentDate)}</p>
                    {selectedQuestionnaire.responseDate && (
                      <p><strong>Responded:</strong> {formatDate(selectedQuestionnaire.responseDate)}</p>
                    )}
                    <p><strong>Status:</strong> 
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getStatusColor(selectedQuestionnaire.status)}`}>
                        {selectedQuestionnaire.status.charAt(0).toUpperCase() + selectedQuestionnaire.status.slice(1)}
                      </span>
                    </p>
                  </div>
                </div>

                {selectedQuestionnaire.responses ? (
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-900 mb-4">Responses:</h4>
                    <div className="space-y-4">
                      {Object.entries(selectedQuestionnaire.responses).map(([question, answer], index) => (
                        <div key={question} className="bg-gray-50 p-4 rounded-lg">
                          <div className="font-medium text-gray-700 mb-2">
                            {index + 1}. {question.replace('question', 'Question ')}
                          </div>
                          <div className="text-gray-800">
                            {answer}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : selectedQuestionnaire.status === 'sent' ? (
                  <div className="border-t pt-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-yellow-800">
                        This questionnaire has been sent but not yet responded to.
                      </p>
                      {selectedQuestionnaire.link && (
                        <div className="mt-3">
                          <p className="text-sm text-yellow-700 mb-2">Questionnaire Link:</p>
                          <code className="text-xs bg-white p-2 rounded border block break-all">
                            {selectedQuestionnaire.link}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="border-t pt-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-red-800">
                        This questionnaire has expired without a response.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <Eye size={48} className="mx-auto mb-4 text-gray-400" />
                  <p>Select a questionnaire to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewQuestionnairesModal;
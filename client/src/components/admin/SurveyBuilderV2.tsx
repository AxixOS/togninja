import React, { useState, useCallback } from 'react';
import { 
  Plus, 
  Settings, 
  Eye, 
  Save, 
  Trash2, 
  Copy, 
  ChevronUp, 
  ChevronDown,
  GripVertical,
  Type,
  CircleDot,
  CheckSquare,
  ChevronDown as DropdownIcon,
  Hash,
  Mail,
  Calendar,
  Clock,
  Star,
  Minus,
  TrendingUp,
  Scale,
  ListOrdered,
  Grid3x3,
  Upload,
  Sliders,
  Image,
  User,
  MapPin,
  X,
  ArrowRight,
  FileText,
  Phone
} from 'lucide-react';
import { 
  Survey, 
  SurveyQuestion, 
  QuestionType, 
  QuestionOption
} from '../../types/survey';

interface SurveyBuilderProps {
  survey?: Survey;
  onSave: (survey: Partial<Survey>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

interface QuestionTypeDefinition {
  type: QuestionType;
  label: string;
  icon: React.ReactNode;
  description: string;
  category: 'basic' | 'advanced' | 'specialized';
}

const QUESTION_TYPES: QuestionTypeDefinition[] = [
  // Basic Question Types
  {
    type: 'text',
    label: 'Text',
    icon: <Type size={16} />,
    description: 'Single line text input',
    category: 'basic'
  },
  {
    type: 'multiple_choice',
    label: 'Multiple Choice',
    icon: <CircleDot size={16} />,
    description: 'Choose one option',
    category: 'basic'
  },
  {
    type: 'checkboxes',
    label: 'Checkboxes',
    icon: <CheckSquare size={16} />,
    description: 'Choose multiple options',
    category: 'basic'
  },
  {
    type: 'dropdown',
    label: 'Dropdown',
    icon: <DropdownIcon size={16} />,
    description: 'Select from dropdown',
    category: 'basic'
  },
  {
    type: 'email',
    label: 'Email',
    icon: <Mail size={16} />,
    description: 'Email address input',
    category: 'basic'
  },
  {
    type: 'phone',
    label: 'Phone',
    icon: <Phone size={16} />,
    description: 'Phone number input',
    category: 'basic'
  },
  {
    type: 'number',
    label: 'Number',
    icon: <Hash size={16} />,
    description: 'Numeric input',
    category: 'basic'
  },
  {
    type: 'date',
    label: 'Date',
    icon: <Calendar size={16} />,
    description: 'Date picker',
    category: 'basic'
  },
  {
    type: 'time',
    label: 'Time',
    icon: <Clock size={16} />,
    description: 'Time picker',
    category: 'basic'
  },
  // Advanced Question Types
  {
    type: 'rating',
    label: 'Rating',
    icon: <Star size={16} />,
    description: 'Star rating',
    category: 'advanced'
  },
  {
    type: 'scale',
    label: 'Scale',
    icon: <Scale size={16} />,
    description: 'Numeric scale',
    category: 'advanced'
  },
  {
    type: 'ranking',
    label: 'Ranking',
    icon: <ListOrdered size={16} />,
    description: 'Rank items in order',
    category: 'advanced'
  },
  {
    type: 'matrix',
    label: 'Matrix',
    icon: <Grid3x3 size={16} />,
    description: 'Matrix of questions',
    category: 'advanced'
  },
  {
    type: 'slider',
    label: 'Slider',
    icon: <Sliders size={16} />,
    description: 'Slider input',
    category: 'advanced'
  },
  {
    type: 'image_choice',
    label: 'Image Choice',
    icon: <Image size={16} />,
    description: 'Choose from images',
    category: 'advanced'
  },
  {
    type: 'file_upload',
    label: 'File Upload',
    icon: <Upload size={16} />,
    description: 'Upload files',
    category: 'advanced'
  },
  // Specialized Question Types
  {
    type: 'net_promoter_score',
    label: 'NPS',
    icon: <TrendingUp size={16} />,
    description: 'Net Promoter Score',
    category: 'specialized'
  },
  {
    type: 'contact_info',
    label: 'Contact Info',
    icon: <User size={16} />,
    description: 'Contact information form',
    category: 'specialized'
  },
  {
    type: 'address',
    label: 'Address',
    icon: <MapPin size={16} />,
    description: 'Address input',
    category: 'specialized'
  }
];

const SurveyBuilder: React.FC<SurveyBuilderProps> = ({
  survey,
  onSave,
  onCancel,
  isLoading = false
}) => {
  const [currentSurvey, setCurrentSurvey] = useState<Partial<Survey>>({
    title: survey?.title || '',
    description: survey?.description || '',
    status: survey?.status || 'draft',
    settings: survey?.settings || {
      allowAnonymous: true,
      requireLogin: false,
      multipleSubmissions: false,
      showProgressBar: true,
      shuffleQuestions: false,
      timeLimit: null,
      customCss: '',
      thankYouMessage: 'Thank you for your response!',
      redirectUrl: null
    },
    questions: survey?.questions || []
  });

  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [showQuestionTypes, setShowQuestionTypes] = useState(false);
  const [activeTab, setActiveTab] = useState<'questions' | 'settings' | 'preview'>('questions');

  const addQuestion = useCallback((type: QuestionType) => {
    const newQuestion: SurveyQuestion = {
      id: `q_${Date.now()}`,
      type,
      title: `New ${QUESTION_TYPES.find(qt => qt.type === type)?.label || 'Question'}`,
      description: '',
      required: false,
      order: currentSurvey.questions?.length || 0,
      options: ['multiple_choice', 'checkboxes', 'dropdown', 'rating', 'scale'].includes(type) 
        ? [
            { id: 'opt_1', text: 'Option 1' },
            { id: 'opt_2', text: 'Option 2' }
          ]
        : undefined
    };

    setCurrentSurvey(prev => ({
      ...prev,
      questions: [...(prev.questions || []), newQuestion]
    }));
    
    setSelectedQuestionId(newQuestion.id);
    setShowQuestionTypes(false);
  }, [currentSurvey.questions]);

  const updateQuestion = useCallback((questionId: string, updates: Partial<SurveyQuestion>) => {
    setCurrentSurvey(prev => ({
      ...prev,
      questions: prev.questions?.map(q => 
        q.id === questionId ? { ...q, ...updates } : q
      ) || []
    }));
  }, []);

  const deleteQuestion = useCallback((questionId: string) => {
    setCurrentSurvey(prev => ({
      ...prev,
      questions: prev.questions?.filter(q => q.id !== questionId) || []
    }));
    setSelectedQuestionId(null);
  }, []);

  const duplicateQuestion = useCallback((questionId: string) => {
    const questionToDuplicate = currentSurvey.questions?.find(q => q.id === questionId);
    if (questionToDuplicate) {
      const newQuestion: SurveyQuestion = {
        ...questionToDuplicate,
        id: `q_${Date.now()}`,
        title: `${questionToDuplicate.title} (Copy)`,
        order: currentSurvey.questions?.length || 0
      };
      
      setCurrentSurvey(prev => ({
        ...prev,
        questions: [...(prev.questions || []), newQuestion]
      }));
    }
  }, [currentSurvey.questions]);

  const moveQuestion = useCallback((questionId: string, direction: 'up' | 'down') => {
    const questions = [...(currentSurvey.questions || [])];
    const currentIndex = questions.findIndex(q => q.id === questionId);
    
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex >= 0 && newIndex < questions.length) {
      [questions[currentIndex], questions[newIndex]] = [questions[newIndex], questions[currentIndex]];
      
      // Update order values
      questions.forEach((q, index) => {
        q.order = index;
      });
      
      setCurrentSurvey(prev => ({
        ...prev,
        questions
      }));
    }
  }, [currentSurvey.questions]);

  const addOption = useCallback((questionId: string) => {
    const question = currentSurvey.questions?.find(q => q.id === questionId);
    if (question && question.options) {
      const newOption: QuestionOption = {
        id: `opt_${Date.now()}`,
        text: `Option ${question.options.length + 1}`
      };
      
      updateQuestion(questionId, {
        options: [...question.options, newOption]
      });
    }
  }, [currentSurvey.questions, updateQuestion]);

  const updateOption = useCallback((questionId: string, optionId: string, text: string) => {
    const question = currentSurvey.questions?.find(q => q.id === questionId);
    if (question && question.options) {
      const updatedOptions = question.options.map(opt => 
        opt.id === optionId ? { ...opt, text } : opt
      );
      
      updateQuestion(questionId, { options: updatedOptions });
    }
  }, [currentSurvey.questions, updateQuestion]);

  const deleteOption = useCallback((questionId: string, optionId: string) => {
    const question = currentSurvey.questions?.find(q => q.id === questionId);
    if (question && question.options && question.options.length > 1) {
      const updatedOptions = question.options.filter(opt => opt.id !== optionId);
      updateQuestion(questionId, { options: updatedOptions });
    }
  }, [currentSurvey.questions, updateQuestion]);

  const handleSave = useCallback(() => {
    onSave(currentSurvey);
  }, [currentSurvey, onSave]);

  const selectedQuestion = selectedQuestionId 
    ? currentSurvey.questions?.find(q => q.id === selectedQuestionId)
    : null;

  const renderQuestionEditor = () => {
    if (!selectedQuestion) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <FileText size={48} className="mx-auto mb-4 text-gray-400" />
            <p>Select a question to edit</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Question Title *
          </label>
          <input
            type="text"
            value={selectedQuestion.title}
            onChange={(e) => updateQuestion(selectedQuestion.id, { title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your question..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description (Optional)
          </label>
          <textarea
            value={selectedQuestion.description || ''}
            onChange={(e) => updateQuestion(selectedQuestion.id, { description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Add additional context or instructions..."
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="required"
            checked={selectedQuestion.required}
            onChange={(e) => updateQuestion(selectedQuestion.id, { required: e.target.checked })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="required" className="ml-2 block text-sm text-gray-900">
            Required question
          </label>
        </div>

        {/* Question Type Specific Options */}
        {['multiple_choice', 'checkboxes', 'dropdown'].includes(selectedQuestion.type) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Options
            </label>
            <div className="space-y-2">
              {selectedQuestion.options?.map((option, index) => (
                <div key={option.id} className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500 w-8">{index + 1}.</span>
                  <input
                    type="text"
                    value={option.text}
                    onChange={(e) => updateOption(selectedQuestion.id, option.id, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`Option ${index + 1}`}
                  />
                  {selectedQuestion.options && selectedQuestion.options.length > 1 && (
                    <button
                      onClick={() => deleteOption(selectedQuestion.id, option.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => addOption(selectedQuestion.id)}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
              >
                <Plus size={16} />
                <span>Add Option</span>
              </button>
            </div>
          </div>
        )}

        {selectedQuestion.type === 'rating' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rating Scale
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Min Value</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  defaultValue="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Max Value</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  defaultValue="5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderQuestionPreview = (question: SurveyQuestion) => {
    const baseClasses = "p-4 border rounded-lg bg-white";
    const selectedClasses = selectedQuestionId === question.id 
      ? "border-blue-500 bg-blue-50" 
      : "border-gray-200 hover:border-gray-300";

    return (
      <div
        key={question.id}
        className={`${baseClasses} ${selectedClasses} cursor-pointer`}
        onClick={() => setSelectedQuestionId(question.id)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <div className="flex items-center space-x-2">
                {QUESTION_TYPES.find(qt => qt.type === question.type)?.icon}
                <span className="text-sm font-medium text-gray-700">
                  {QUESTION_TYPES.find(qt => qt.type === question.type)?.label}
                </span>
              </div>
              {question.required && (
                <span className="text-xs text-red-600 font-medium">Required</span>
              )}
            </div>
            
            <h3 className="font-medium text-gray-900 mb-1">{question.title}</h3>
            
            {question.description && (
              <p className="text-sm text-gray-600 mb-3">{question.description}</p>
            )}

            {/* Question Preview */}
            <div className="mt-3">
              {question.type === 'text' && (
                <input
                  type="text"
                  placeholder="Text input..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  disabled
                />
              )}
              
              {question.type === 'multiple_choice' && (
                <div className="space-y-2">
                  {question.options?.map((option) => (
                    <label key={option.id} className="flex items-center space-x-2">
                      <input type="radio" name={`preview_${question.id}`} disabled />
                      <span className="text-sm">{option.text}</span>
                    </label>
                  ))}
                </div>
              )}
              
              {question.type === 'checkboxes' && (
                <div className="space-y-2">
                  {question.options?.map((option) => (
                    <label key={option.id} className="flex items-center space-x-2">
                      <input type="checkbox" disabled />
                      <span className="text-sm">{option.text}</span>
                    </label>
                  ))}
                </div>
              )}
              
              {question.type === 'dropdown' && (
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50" disabled>
                  <option>Select an option...</option>
                  {question.options?.map((option) => (
                    <option key={option.id}>{option.text}</option>
                  ))}
                </select>
              )}
              
              {question.type === 'rating' && (
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} size={20} className="text-gray-300" />
                  ))}
                </div>
              )}
              
              {question.type === 'email' && (
                <input
                  type="email"
                  placeholder="email@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  disabled
                />
              )}
              
              {question.type === 'date' && (
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  disabled
                />
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                moveQuestion(question.id, 'up');
              }}
              disabled={question.order === 0}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <ChevronUp size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                moveQuestion(question.id, 'down');
              }}
              disabled={question.order === (currentSurvey.questions?.length || 1) - 1}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <ChevronDown size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                duplicateQuestion(question.id);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <Copy size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteQuestion(question.id);
              }}
              className="text-red-400 hover:text-red-600"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <input
              type="text"
              value={currentSurvey.title}
              onChange={(e) => setCurrentSurvey(prev => ({ ...prev, title: e.target.value }))}
              className="text-2xl font-bold text-gray-900 border-none focus:outline-none focus:ring-0 p-0"
              placeholder="Untitled Survey"
            />
            <textarea
              value={currentSurvey.description || ''}
              onChange={(e) => setCurrentSurvey(prev => ({ ...prev, description: e.target.value }))}
              className="mt-2 text-gray-600 border-none focus:outline-none focus:ring-0 p-0 resize-none"
              placeholder="Add a description..."
              rows={2}
            />
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading || !currentSurvey.title}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
            >
              {isLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <Save size={16} />
              <span>Save Survey</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-6 mt-6">
          <button
            onClick={() => setActiveTab('questions')}
            className={`pb-2 border-b-2 font-medium text-sm ${
              activeTab === 'questions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Questions ({currentSurvey.questions?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-2 border-b-2 font-medium text-sm ${
              activeTab === 'settings'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Settings
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`pb-2 border-b-2 font-medium text-sm ${
              activeTab === 'preview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Preview
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'questions' && (
          <>
            {/* Question List */}
            <div className="w-1/2 border-r border-gray-200 overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-medium text-gray-900">Questions</h2>
                  <button
                    onClick={() => setShowQuestionTypes(!showQuestionTypes)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <Plus size={16} />
                    <span>Add Question</span>
                  </button>
                </div>

                {showQuestionTypes && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-3">Choose Question Type</h3>
                    <div className="space-y-4">
                      {(['basic', 'advanced', 'specialized'] as const).map((category) => (
                        <div key={category}>
                          <h4 className="text-sm font-medium text-gray-700 mb-2 capitalize">
                            {category} Questions
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            {QUESTION_TYPES.filter(qt => qt.category === category).map((questionType) => (
                              <button
                                key={questionType.type}
                                onClick={() => addQuestion(questionType.type)}
                                className="flex items-center space-x-3 p-3 text-left bg-white border border-gray-200 rounded-md hover:border-blue-500 hover:bg-blue-50 transition-colors"
                              >
                                <div className="text-blue-600">{questionType.icon}</div>
                                <div>
                                  <div className="font-medium text-gray-900">{questionType.label}</div>
                                  <div className="text-xs text-gray-500">{questionType.description}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setShowQuestionTypes(false)}
                      className="mt-4 text-sm text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                <div className="space-y-4">
                  {currentSurvey.questions?.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText size={48} className="mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-500 mb-4">No questions yet</p>
                      <button
                        onClick={() => setShowQuestionTypes(true)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Add your first question
                      </button>
                    </div>
                  ) : (
                    currentSurvey.questions?.map((question) => renderQuestionPreview(question))
                  )}
                </div>
              </div>
            </div>

            {/* Question Editor */}
            <div className="w-1/2 overflow-y-auto">
              <div className="p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-6">Question Editor</h2>
                {renderQuestionEditor()}
              </div>
            </div>
          </>
        )}

        {activeTab === 'settings' && (
          <div className="w-full overflow-y-auto">
            <div className="p-6 max-w-2xl">
              <h2 className="text-lg font-medium text-gray-900 mb-6">Survey Settings</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-medium text-gray-900 mb-3">Access & Permissions</h3>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={currentSurvey.settings?.allowAnonymous}
                        onChange={(e) => setCurrentSurvey(prev => ({
                          ...prev,
                          settings: { ...prev.settings, allowAnonymous: e.target.checked }
                        }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-900">Allow anonymous responses</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={currentSurvey.settings?.requireLogin}
                        onChange={(e) => setCurrentSurvey(prev => ({
                          ...prev,
                          settings: { ...prev.settings, requireLogin: e.target.checked }
                        }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-900">Require login to respond</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={currentSurvey.settings?.multipleSubmissions}
                        onChange={(e) => setCurrentSurvey(prev => ({
                          ...prev,
                          settings: { ...prev.settings, multipleSubmissions: e.target.checked }
                        }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-900">Allow multiple submissions</span>
                    </label>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-medium text-gray-900 mb-3">Display Options</h3>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={currentSurvey.settings?.showProgressBar}
                        onChange={(e) => setCurrentSurvey(prev => ({
                          ...prev,
                          settings: { ...prev.settings, showProgressBar: e.target.checked }
                        }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-900">Show progress bar</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={currentSurvey.settings?.shuffleQuestions}
                        onChange={(e) => setCurrentSurvey(prev => ({
                          ...prev,
                          settings: { ...prev.settings, shuffleQuestions: e.target.checked }
                        }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-900">Randomize question order</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Thank You Message
                  </label>
                  <textarea
                    value={currentSurvey.settings?.thankYouMessage || ''}
                    onChange={(e) => setCurrentSurvey(prev => ({
                      ...prev,
                      settings: { ...prev.settings, thankYouMessage: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Thank you for your response!"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Redirect URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={currentSurvey.settings?.redirectUrl || ''}
                    onChange={(e) => setCurrentSurvey(prev => ({
                      ...prev,
                      settings: { ...prev.settings, redirectUrl: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com/thank-you"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="w-full overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">Survey Preview</h2>
              
              <div className="max-w-2xl mx-auto">
                <div className="bg-white border border-gray-200 rounded-lg p-8">
                  <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                      {currentSurvey.title || 'Untitled Survey'}
                    </h1>
                    {currentSurvey.description && (
                      <p className="text-gray-600">{currentSurvey.description}</p>
                    )}
                  </div>

                  {currentSurvey.settings?.showProgressBar && (
                    <div className="mb-8">
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Progress</span>
                        <span>1 of {currentSurvey.questions?.length || 0}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${currentSurvey.questions?.length ? (1 / currentSurvey.questions.length) * 100 : 0}%` 
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-8">
                    {currentSurvey.questions?.length === 0 ? (
                      <div className="text-center py-12">
                        <FileText size={48} className="mx-auto mb-4 text-gray-400" />
                        <p className="text-gray-500">No questions to preview</p>
                      </div>
                    ) : (
                      currentSurvey.questions?.slice(0, 1).map((question, index) => (
                        <div key={question.id} className="space-y-4">
                          <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                              {index + 1}. {question.title}
                              {question.required && <span className="text-red-500 ml-1">*</span>}
                            </h3>
                            {question.description && (
                              <p className="text-gray-600 mb-4">{question.description}</p>
                            )}
                          </div>

                          {/* Render question based on type */}
                          {question.type === 'text' && (
                            <input
                              type="text"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Your answer..."
                            />
                          )}
                          
                          {question.type === 'multiple_choice' && (
                            <div className="space-y-3">
                              {question.options?.map((option) => (
                                <label key={option.id} className="flex items-center space-x-3">
                                  <input
                                    type="radio"
                                    name={`question_${question.id}`}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                  />
                                  <span className="text-gray-900">{option.text}</span>
                                </label>
                              ))}
                            </div>
                          )}
                          
                          {question.type === 'checkboxes' && (
                            <div className="space-y-3">
                              {question.options?.map((option) => (
                                <label key={option.id} className="flex items-center space-x-3">
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                  />
                                  <span className="text-gray-900">{option.text}</span>
                                </label>
                              ))}
                            </div>
                          )}
                          
                          {question.type === 'dropdown' && (
                            <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                              <option value="">Select an option...</option>
                              {question.options?.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.text}
                                </option>
                              ))}
                            </select>
                          )}
                          
                          {question.type === 'rating' && (
                            <div className="flex space-x-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star 
                                  key={star} 
                                  size={24} 
                                  className="text-gray-300 hover:text-yellow-400 cursor-pointer"
                                />
                              ))}
                            </div>
                          )}
                          
                          {question.type === 'email' && (
                            <input
                              type="email"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="email@example.com"
                            />
                          )}
                          
                          {question.type === 'date' && (
                            <input
                              type="date"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {currentSurvey.questions && currentSurvey.questions.length > 0 && (
                    <div className="mt-8 flex justify-between">
                      <button
                        disabled
                        className="px-6 py-2 bg-gray-300 text-gray-500 rounded-md cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        {currentSurvey.questions.length === 1 ? 'Submit' : 'Next'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SurveyBuilder;

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
  X
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { 
  Survey, 
  SurveyQuestion, 
  SurveyPage, 
  QuestionType, 
  QuestionOption,
  QuestionSettings,
  QuestionValidation
} from '../../types/survey';
import { questionApi } from '../../lib/survey-api';

interface SurveyBuilderProps {
  survey?: Survey;
  onSave: (survey: Survey) => void;
  onCancel: () => void;
}

const SurveyBuilder: React.FC<SurveyBuilderProps> = ({ survey, onSave, onCancel }) => {
  const [currentSurvey, setCurrentSurvey] = useState<Survey>(survey || createDefaultSurvey());
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [showQuestionTypes, setShowQuestionTypes] = useState(false);
  const [activeTab, setActiveTab] = useState<'build' | 'design' | 'settings'>('build');
  const [previewMode, setPreviewMode] = useState(false);

  const questionTypes = questionApi.getQuestionTypes();

  function createDefaultSurvey(): Survey {
    return {
      id: crypto.randomUUID(),
      title: 'Untitled Survey',
      description: '',
      status: 'draft',
      pages: [{
        id: crypto.randomUUID(),
        title: 'Page 1',
        order: 0,
        questions: []
      }],
      settings: {
        collectEmail: false,
        requireEmail: false,
        allowAnonymous: true,
        progressBar: true,
        previousButton: true,
        autoSave: true
      },
      createdBy: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  const updateSurvey = useCallback((updates: Partial<Survey>) => {
    setCurrentSurvey(prev => ({
      ...prev,
      ...updates,
      updatedAt: new Date().toISOString()
    }));
  }, []);

  const updatePage = useCallback((pageId: string, updates: Partial<SurveyPage>) => {
    setCurrentSurvey(prev => ({
      ...prev,
      pages: prev.pages.map(page => 
        page.id === pageId ? { ...page, ...updates } : page
      ),
      updatedAt: new Date().toISOString()
    }));
  }, []);

  const addQuestion = useCallback((pageId: string, type: QuestionType) => {
    const page = currentSurvey.pages.find(p => p.id === pageId);
    if (!page) return;

    const newQuestion: SurveyQuestion = {
      id: crypto.randomUUID(),
      ...questionApi.createDefaultQuestion(type, page.questions.length),
      title: `Question ${page.questions.length + 1}`,
      type
    } as SurveyQuestion;

    updatePage(pageId, {
      questions: [...page.questions, newQuestion]
    });

    setSelectedQuestion(newQuestion.id);
    setShowQuestionTypes(false);
  }, [currentSurvey.pages, updatePage]);

  const updateQuestion = useCallback((pageId: string, questionId: string, updates: Partial<SurveyQuestion>) => {
    const page = currentSurvey.pages.find(p => p.id === pageId);
    if (!page) return;

    updatePage(pageId, {
      questions: page.questions.map(q => 
        q.id === questionId ? { ...q, ...updates } : q
      )
    });
  }, [currentSurvey.pages, updatePage]);

  const deleteQuestion = useCallback((pageId: string, questionId: string) => {
    const page = currentSurvey.pages.find(p => p.id === pageId);
    if (!page) return;

    updatePage(pageId, {
      questions: page.questions.filter(q => q.id !== questionId)
    });

    if (selectedQuestion === questionId) {
      setSelectedQuestion(null);
    }
  }, [currentSurvey.pages, updatePage, selectedQuestion]);

  const duplicateQuestion = useCallback((pageId: string, questionId: string) => {
    const page = currentSurvey.pages.find(p => p.id === pageId);
    const question = page?.questions.find(q => q.id === questionId);
    if (!page || !question) return;

    const duplicatedQuestion: SurveyQuestion = {
      ...question,
      id: crypto.randomUUID(),
      title: `${question.title} (Copy)`,
      order: question.order + 1
    };

    updatePage(pageId, {
      questions: [
        ...page.questions.slice(0, question.order + 1),
        duplicatedQuestion,
        ...page.questions.slice(question.order + 1).map(q => ({ ...q, order: q.order + 1 }))
      ]
    });
  }, [currentSurvey.pages, updatePage]);

  const moveQuestion = useCallback((pageId: string, questionId: string, direction: 'up' | 'down') => {
    const page = currentSurvey.pages.find(p => p.id === pageId);
    if (!page) return;

    const questionIndex = page.questions.findIndex(q => q.id === questionId);
    if (questionIndex === -1) return;

    const newIndex = direction === 'up' ? questionIndex - 1 : questionIndex + 1;
    if (newIndex < 0 || newIndex >= page.questions.length) return;

    const newQuestions = [...page.questions];
    [newQuestions[questionIndex], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[questionIndex]];

    // Update order properties
    newQuestions.forEach((q, index) => {
      q.order = index;
    });

    updatePage(pageId, { questions: newQuestions });
  }, [currentSurvey.pages, updatePage]);

  const addOption = useCallback((pageId: string, questionId: string) => {
    const page = currentSurvey.pages.find(p => p.id === pageId);
    const question = page?.questions.find(q => q.id === questionId);
    if (!page || !question) return;

    const newOption: QuestionOption = {
      id: crypto.randomUUID(),
      text: `Option ${(question.options?.length || 0) + 1}`
    };

    updateQuestion(pageId, questionId, {
      options: [...(question.options || []), newOption]
    });
  }, [currentSurvey.pages, updateQuestion]);

  const updateOption = useCallback((pageId: string, questionId: string, optionId: string, text: string) => {
    const page = currentSurvey.pages.find(p => p.id === pageId);
    const question = page?.questions.find(q => q.id === questionId);
    if (!page || !question || !question.options) return;

    updateQuestion(pageId, questionId, {
      options: question.options.map(opt => 
        opt.id === optionId ? { ...opt, text } : opt
      )
    });
  }, [currentSurvey.pages, updateQuestion]);

  const deleteOption = useCallback((pageId: string, questionId: string, optionId: string) => {
    const page = currentSurvey.pages.find(p => p.id === pageId);
    const question = page?.questions.find(q => q.id === questionId);
    if (!page || !question || !question.options) return;

    updateQuestion(pageId, questionId, {
      options: question.options.filter(opt => opt.id !== optionId)
    });
  }, [currentSurvey.pages, updateQuestion]);

  const handleSave = () => {
    onSave(currentSurvey);
  };

  const getQuestionIcon = (type: QuestionType) => {
    const iconMap: Record<QuestionType, React.ReactNode> = {
      multiple_choice: <CircleDot size={16} />,
      checkboxes: <SquareCheck size={16} />,
      dropdown: <DropdownIcon size={16} />,
      text: <Type size={16} />,
      email: <Mail size={16} />,
      number: <Hash size={16} />,
      date: <Calendar size={16} />,
      time: <Clock size={16} />,
      datetime: <Calendar size={16} />,
      rating: <Star size={16} />,
      scale: <Minus size={16} />,
      ranking: <ListOrdered size={16} />,
      matrix: <Grid3x3 size={16} />,
      file_upload: <Upload size={16} />,
      phone: <Hash size={16} />,
      website: <Type size={16} />,
      slider: <Sliders size={16} />,
      image_choice: <Image size={16} />,
      contact_info: <User size={16} />,
      address: <MapPin size={16} />,
      net_promoter_score: <TrendingUp size={16} />,
      likert_scale: <Scale size={16} />
    };
    return iconMap[type] || <Type size={16} />;
  };

  const renderQuestionEditor = (page: SurveyPage, question: SurveyQuestion) => {
    return (
      <div className="space-y-4">
        {/* Question Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Question Title *
          </label>
          <input
            type="text"
            value={question.title}
            onChange={(e) => updateQuestion(page.id, question.id, { title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
            placeholder="Enter your question..."
          />
        </div>

        {/* Question Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description (Optional)
          </label>
          <textarea
            value={question.description || ''}
            onChange={(e) => updateQuestion(page.id, question.id, { description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
            rows={2}
            placeholder="Add additional context or instructions..."
          />
        </div>

        {/* Question Options (for choice questions) */}
        {question.type && ['multiple_choice', 'checkboxes', 'dropdown', 'likert_scale'].includes(question.type) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Answer Choices
            </label>
            <div className="space-y-2">
              {question.options?.map((option, index) => (
                <div key={option.id} className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500 w-6">{index + 1}.</span>
                  <input
                    type="text"
                    value={option.text}
                    onChange={(e) => updateOption(page.id, question.id, option.id, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                    placeholder={`Option ${index + 1}`}
                  />
                  {question.options && question.options.length > 2 && (
                    <button
                      onClick={() => deleteOption(page.id, question.id, option.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => addOption(page.id, question.id)}
                className="flex items-center text-purple-600 hover:text-purple-800 text-sm"
              >
                <Plus size={16} className="mr-1" />
                Add Option
              </button>
            </div>
          </div>
        )}

        {/* Rating/Scale Settings */}
        {question.type && ['rating', 'scale', 'net_promoter_score'].includes(question.type) && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Value
              </label>
              <input
                type="number"
                value={question.settings?.startValue || 1}
                onChange={(e) => updateQuestion(page.id, question.id, {
                  settings: { ...question.settings, startValue: parseInt(e.target.value) }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Value
              </label>
              <input
                type="number"
                value={question.settings?.endValue || 5}
                onChange={(e) => updateQuestion(page.id, question.id, {
                  settings: { ...question.settings, endValue: parseInt(e.target.value) }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>
        )}

        {/* Required Toggle */}
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={question.required}
            onChange={(e) => updateQuestion(page.id, question.id, { required: e.target.checked })}
            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
          />
          <label className="ml-2 text-sm text-gray-700">
            Required question
          </label>
        </div>
      </div>
    );
  };

  const renderQuestion = (page: SurveyPage, question: SurveyQuestion, index: number) => {
    const isSelected = selectedQuestion === question.id;

    return (
      <Draggable draggableId={question.id} index={index} key={question.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={`bg-white border rounded-lg p-4 mb-4 ${
              isSelected ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-200'
            } ${snapshot.isDragging ? 'shadow-lg' : ''}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div {...provided.dragHandleProps} className="cursor-move text-gray-400">
                    <GripVertical size={16} />
                  </div>
                  {getQuestionIcon(question.type)}
                  <span className="text-sm font-medium text-gray-900">
                    {questionTypes.find(t => t.type === question.type)?.name}
                  </span>
                  {question.required && (
                    <span className="text-red-500 text-sm">*</span>
                  )}
                </div>
                
                <h4 className="font-medium text-gray-900 mb-1">
                  {question.title || 'Untitled Question'}
                </h4>
                
                {question.description && (
                  <p className="text-sm text-gray-600 mb-2">{question.description}</p>
                )}

                {/* Question Preview */}
                <div className="mt-3">
                  {question.type === 'multiple_choice' && question.options && (
                    <div className="space-y-2">
                      {question.options.map((option) => (
                        <div key={option.id} className="flex items-center">
                          <input type="radio" name={`preview-${question.id}`} className="mr-2" disabled />
                          <span className="text-sm text-gray-700">{option.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {question.type === 'checkboxes' && question.options && (
                    <div className="space-y-2">
                      {question.options.map((option) => (
                        <div key={option.id} className="flex items-center">
                          <input type="checkbox" className="mr-2" disabled />
                          <span className="text-sm text-gray-700">{option.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {question.type === 'text' && (
                    <input 
                      type="text" 
                      placeholder="Text input"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      disabled
                    />
                  )}
                  
                  {question.type === 'rating' && (
                    <div className="flex space-x-1">
                      {Array.from({ length: question.settings?.endValue || 5 }, (_, i) => (
                        <Star key={i} size={20} className="text-gray-300" />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => setSelectedQuestion(isSelected ? null : question.id)}
                  className="text-gray-400 hover:text-gray-600"
                  title="Edit"
                >
                  <Settings size={16} />
                </button>
                <button
                  onClick={() => duplicateQuestion(page.id, question.id)}
                  className="text-gray-400 hover:text-gray-600"
                  title="Duplicate"
                >
                  <Copy size={16} />
                </button>
                <button
                  onClick={() => moveQuestion(page.id, question.id, 'up')}
                  disabled={index === 0}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  title="Move Up"
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  onClick={() => moveQuestion(page.id, question.id, 'down')}
                  disabled={index === page.questions.length - 1}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  title="Move Down"
                >
                  <ChevronDown size={16} />
                </button>
                <button
                  onClick={() => deleteQuestion(page.id, question.id)}
                  className="text-red-400 hover:text-red-600"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </Draggable>
    );
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    const { source, destination } = result;
    const page = currentSurvey.pages[0]; // For now, assuming single page

    if (source.index === destination.index) return;

    const newQuestions = Array.from(page.questions);
    const [reorderedQuestion] = newQuestions.splice(source.index, 1);
    newQuestions.splice(destination.index, 0, reorderedQuestion);

    // Update order properties
    newQuestions.forEach((q, index) => {
      q.order = index;
    });

    updatePage(page.id, { questions: newQuestions });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <input
              type="text"
              value={currentSurvey.title}
              onChange={(e) => updateSurvey({ title: e.target.value })}
              className="text-xl font-semibold bg-transparent border-none focus:outline-none focus:ring-0 p-0"
              placeholder="Survey Title"
            />
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md"
            >
              <Eye size={16} className="mr-2" />
              Preview
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              <Save size={16} className="mr-2" />
              Save
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-8 mt-4">
          {[
            { id: 'build' as const, label: 'Build' },
            { id: 'design' as const, label: 'Design' },
            { id: 'settings' as const, label: 'Settings' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-2 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex">
        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          {activeTab === 'build' && (
            <div className="p-6">
              {/* Survey Description */}
              <div className="mb-6">
                <textarea
                  value={currentSurvey.description || ''}
                  onChange={(e) => updateSurvey({ description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  rows={2}
                  placeholder="Add a description for your survey..."
                />
              </div>

              {/* Questions */}
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="questions">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef}>
                      {currentSurvey.pages[0]?.questions.map((question, index) =>
                        renderQuestion(currentSurvey.pages[0], question, index)
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              {/* Add Question Button */}
              <div className="relative">
                <button
                  onClick={() => setShowQuestionTypes(!showQuestionTypes)}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-500 hover:bg-purple-50 transition-colors"
                >
                  <Plus size={24} className="mx-auto mb-2 text-gray-400" />
                  <span className="text-gray-600">Add Question</span>
                </button>

                {/* Question Types Dropdown */}
                {showQuestionTypes && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-96 overflow-y-auto">
                    <div className="p-4">
                      <h3 className="font-medium text-gray-900 mb-3">Choose Question Type</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {questionTypes.map((type) => (
                          <button
                            key={type.type}
                            onClick={() => addQuestion(currentSurvey.pages[0].id, type.type)}
                            className="flex items-center p-3 text-left border border-gray-200 rounded-md hover:border-purple-500 hover:bg-purple-50 transition-colors"
                          >
                            {getQuestionIcon(type.type)}
                            <div className="ml-3">
                              <div className="font-medium text-sm">{type.name}</div>
                              <div className="text-xs text-gray-500">{type.description}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'design' && (
            <div className="p-6">
              <h3 className="text-lg font-medium mb-4">Survey Design</h3>
              <p className="text-gray-600">Customize the look and feel of your survey.</p>
              {/* Design options would go here */}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="p-6">
              <h3 className="text-lg font-medium mb-4">Survey Settings</h3>
              {/* Settings options would go here */}
            </div>
          )}
        </div>

        {/* Right Sidebar - Question Editor */}
        {selectedQuestion && (
          <div className="w-80 bg-gray-50 border-l border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">Question Settings</h3>
              <button
                onClick={() => setSelectedQuestion(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>

            {(() => {
              const page = currentSurvey.pages[0];
              const question = page?.questions.find(q => q.id === selectedQuestion);
              return question ? renderQuestionEditor(page, question) : null;
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

export default SurveyBuilder;

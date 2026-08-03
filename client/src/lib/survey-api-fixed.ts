import { supabase } from './supabase';
import { 
  Survey, 
  SurveyQuestion, 
  SurveyResponse, 
  SurveyTemplate, 
  SurveyAnalytics,
  SurveyListResponse,
  SurveyAnalyticsResponse,
  QuestionType,
  QuestionTypeDefinition,
  SurveyExportOptions
} from '../types/survey';

// Helper function to convert between camelCase and snake_case for database operations
const toSnakeCase = (obj: any): any => {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(toSnakeCase);
  }
  
  const converted: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    converted[snakeKey] = toSnakeCase(value);
  }
  return converted;
};

const toCamelCase = (obj: any): any => {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  }
  
  const converted: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    converted[camelKey] = toCamelCase(value);
  }
  return converted;
};

// Survey Management
export const surveyApi = {
  // Get all surveys
  async getSurveys(page = 1, limit = 10, status?: string, search?: string): Promise<SurveyListResponse> {
    let query = supabase
      .from('surveys')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query.range(from, to);

    if (error) {
      // console.error removed
      throw error;
    }

    return {
      surveys: (data || []).map(toCamelCase),
      total: count || 0,
      page,
      limit
    };
  },

  // Get survey by ID
  async getSurvey(id: string): Promise<Survey> {
    const { data, error } = await supabase
      .from('surveys')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      // console.error removed
      throw error;
    }
    
    return toCamelCase(data);
  },

  // Create new survey
  async createSurvey(survey: Omit<Survey, 'id' | 'createdAt' | 'updatedAt'>): Promise<Survey> {
    // Convert to snake_case for database
    const surveyData = toSnakeCase(survey);
    
    // Ensure required defaults
    const surveyToInsert = {
      ...surveyData,
      pages: surveyData.pages || [],
      settings: surveyData.settings || { allowAnonymous: true, progressBar: true },
      branding: surveyData.branding || {},
      analytics: surveyData.analytics || { totalViews: 0, totalStarts: 0, totalCompletes: 0, completionRate: 0, averageTime: 0 },
      created_by: surveyData.created_by || null, // Will be set by RLS policy
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('surveys')
      .insert([surveyToInsert])
      .select()
      .single();

    if (error) {
      // console.error removed
      throw error;
    }
    
    return toCamelCase(data);
  },

  // Update survey
  async updateSurvey(id: string, updates: Partial<Survey>): Promise<Survey> {
    // Convert to snake_case for database
    const updateData = toSnakeCase(updates);
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('surveys')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      // console.error removed
      throw error;
    }
    
    return toCamelCase(data);
  },

  // Delete survey
  async deleteSurvey(id: string): Promise<void> {
    const { error } = await supabase
      .from('surveys')
      .delete()
      .eq('id', id);

    if (error) {
      // console.error removed
      throw error;
    }
  },

  // Duplicate survey
  async duplicateSurvey(id: string, title?: string): Promise<Survey> {
    try {
      const original = await this.getSurvey(id);
      
      const duplicate = {
        ...original,
        title: title || `${original.title} (Copy)`,
        status: 'draft' as const,
        analytics: {
          totalViews: 0,
          totalStarts: 0,
          totalCompletes: 0,
          completionRate: 0,
          averageTime: 0
        }
      };

      // Remove fields that should be auto-generated
      delete (duplicate as any).id;
      delete (duplicate as any).createdAt;
      delete (duplicate as any).updatedAt;
      delete (duplicate as any).publishedAt;
      delete (duplicate as any).closedAt;

      return await this.createSurvey(duplicate);
    } catch (error) {
      // console.error removed
      throw error;
    }
  },

  // Publish survey
  async publishSurvey(id: string): Promise<Survey> {
    return this.updateSurvey(id, {
      status: 'active',
      publishedAt: new Date().toISOString()
    });
  },

  // Pause survey
  async pauseSurvey(id: string): Promise<Survey> {
    return this.updateSurvey(id, { status: 'paused' });
  },

  // Close survey
  async closeSurvey(id: string): Promise<Survey> {
    return this.updateSurvey(id, {
      status: 'closed',
      closedAt: new Date().toISOString()
    });
  }
};

// Question Management
export const questionApi = {
  // Get question types
  getQuestionTypes(): QuestionTypeDefinition[] {
    return [
      {
        type: 'multiple_choice',
        name: 'Multiple Choice',
        description: 'Choose one option from a list',
        icon: 'circle-dot',
        category: 'choice',
        hasOptions: true,
        hasValidation: true,
        hasLogic: true
      },
      {
        type: 'checkboxes',
        name: 'Checkboxes',
        description: 'Choose multiple options from a list',
        icon: 'check-square',
        category: 'choice',
        hasOptions: true,
        hasValidation: true,
        hasLogic: true
      },
      {
        type: 'dropdown',
        name: 'Dropdown',
        description: 'Choose one option from a dropdown list',
        icon: 'chevron-down',
        category: 'choice',
        hasOptions: true,
        hasValidation: true,
        hasLogic: true
      },
      {
        type: 'text',
        name: 'Text',
        description: 'Single line text input',
        icon: 'type',
        category: 'text',
        hasOptions: false,
        hasValidation: true,
        hasLogic: true
      },
      {
        type: 'email',
        name: 'Email',
        description: 'Email address input with validation',
        icon: 'mail',
        category: 'text',
        hasOptions: false,
        hasValidation: true,
        hasLogic: true
      },
      {
        type: 'number',
        name: 'Number',
        description: 'Numeric input',
        icon: 'hash',
        category: 'text',
        hasOptions: false,
        hasValidation: true,
        hasLogic: true
      },
      {
        type: 'date',
        name: 'Date',
        description: 'Date picker',
        icon: 'calendar',
        category: 'date',
        hasOptions: false,
        hasValidation: true,
        hasLogic: true
      },
      {
        type: 'rating',
        name: 'Rating',
        description: 'Star rating or numeric scale',
        icon: 'star',
        category: 'scale',
        hasOptions: false,
        hasValidation: true,
        hasLogic: true
      }
    ];
  }
};

// Response Management
export const responseApi = {
  // Get survey responses
  async getResponses(surveyId: string, page = 1, limit = 50): Promise<{ responses: SurveyResponse[], total: number }> {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from('survey_responses')
      .select('*', { count: 'exact' })
      .eq('survey_id', surveyId)
      .order('started_at', { ascending: false })
      .range(from, to);

    if (error) {
      // console.error removed
      throw error;
    }

    return {
      responses: (data || []).map(toCamelCase),
      total: count || 0
    };
  },

  // Submit response
  async submitResponse(response: Omit<SurveyResponse, 'id' | 'startedAt'>): Promise<SurveyResponse> {
    const responseData = toSnakeCase(response);
    responseData.started_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('survey_responses')
      .insert([responseData])
      .select()
      .single();

    if (error) {
      // console.error removed
      throw error;
    }

    return toCamelCase(data);
  }
};

// Analytics API
export const analyticsApi = {
  // Get survey analytics
  async getSurveyAnalytics(surveyId: string): Promise<SurveyAnalytics> {
    // Get basic stats from responses
    const { data: responses, error: responsesError } = await supabase
      .from('survey_responses')
      .select('*')
      .eq('survey_id', surveyId);

    if (responsesError) {
      // console.error removed
      throw responsesError;
    }

    const totalStarts = responses?.length || 0;
    const totalCompletes = responses?.filter(r => r.is_complete).length || 0;
    const completionRate = totalStarts > 0 ? (totalCompletes / totalStarts) * 100 : 0;

    // Get analytics events
    const { data: analytics, error: analyticsError } = await supabase
      .from('survey_analytics')
      .select('*')
      .eq('survey_id', surveyId);

    if (analyticsError) {
      // console.error removed
    }

    const totalViews = analytics?.filter(a => a.event_type === 'view').length || 0;

    return {
      totalViews,
      totalStarts,
      totalCompletes,
      completionRate,
      averageTime: 0, // Calculate from response data if needed
      dropOffPoints: [],
      responsesByDate: [],
      deviceBreakdown: { desktop: 0, tablet: 0, mobile: 0 },
      locationBreakdown: []
    };
  }
};

export default surveyApi;

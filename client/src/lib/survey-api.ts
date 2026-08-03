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

// Survey Management - API-based implementation
export const surveyApi = {
  // Get all surveys
  async getSurveys(): Promise<Survey[]> {
    try {
      const response = await fetch('/api/surveys');
      if (!response.ok) {
        throw new Error(`Failed to fetch surveys: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching surveys:', error);
      throw error;
    }
  },

  // Get survey by ID
  async getSurvey(id: string): Promise<Survey> {
    try {
      const response = await fetch(`/api/surveys/${id}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch survey: ${response.status}`);
      }
      const data = await response.json();
      return data.survey;
    } catch (error) {
      console.error('Error fetching survey:', error);
      throw error;
    }
  },

  // Create a new survey
  async createSurvey(survey: Omit<Survey, 'id' | 'createdAt' | 'updatedAt'>): Promise<Survey> {
    try {
      const response = await fetch('/api/surveys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(survey),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create survey: ${response.status}`);
      }
      
      const result = await response.json();
      return result.survey;
    } catch (error) {
      console.error('Error creating survey:', error);
      throw error;
    }
  },

  // Update an existing survey
  async updateSurvey(id: string, updates: Partial<Survey>): Promise<Survey> {
    try {
      const response = await fetch(`/api/surveys/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update survey: ${response.status}`);
      }
      
      const result = await response.json();
      return result.survey;
    } catch (error) {
      console.error('Error updating survey:', error);
      throw error;
    }
  },

  // Delete a survey
  async deleteSurvey(id: string): Promise<void> {
    try {
      const response = await fetch(`/api/surveys/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete survey: ${response.status}`);
      }
    } catch (error) {
      console.error('Error deleting survey:', error);
      throw error;
    }
  },

  // Duplicate a survey
  async duplicateSurvey(id: string): Promise<Survey> {
    try {
      const response = await fetch(`/api/surveys/${id}/duplicate`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to duplicate survey: ${response.status}`);
      }
      
      const result = await response.json();
      return result.survey;
    } catch (error) {
      console.error('Error duplicating survey:', error);
      throw error;
    }
  },

  // Publish survey
  async publishSurvey(id: string): Promise<Survey> {
    return this.updateSurvey(id, { status: 'active' });
  },

  // Pause survey
  async pauseSurvey(id: string): Promise<Survey> {
    return this.updateSurvey(id, { status: 'paused' });
  },

  // Archive survey
  async archiveSurvey(id: string): Promise<Survey> {
    return this.updateSurvey(id, { status: 'archived' });
  },

  // Get survey responses
  async getSurveyResponses(surveyId: string): Promise<SurveyResponse[]> {
    try {
      const response = await fetch(`/api/surveys/${surveyId}/responses`);
      if (!response.ok) {
        throw new Error(`Failed to fetch responses: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching survey responses:', error);
      throw error;
    }
  },

  // Get survey analytics
  async getSurveyAnalytics(surveyId: string): Promise<SurveyAnalytics> {
    try {
      const response = await fetch(`/api/surveys/${surveyId}/analytics`);
      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching survey analytics:', error);
      throw error;
    }
  }
};

// Response Management API
export const responseApi = {
  // Submit survey response
  async submitResponse(response: Omit<SurveyResponse, 'id' | 'startedAt'>): Promise<SurveyResponse> {
    try {
      const responseWithTimestamp = {
        ...response,
        startedAt: new Date().toISOString()
      };

      const apiResponse = await fetch('/api/survey-responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(responseWithTimestamp),
      });

      if (!apiResponse.ok) {
        throw new Error(`Failed to submit response: ${apiResponse.status}`);
      }

      const result = await apiResponse.json();
      return result.response;
    } catch (error) {
      console.error('Error submitting response:', error);
      throw error;
    }
  }
};

export default surveyApi;

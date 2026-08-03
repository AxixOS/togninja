/**
 * Enhanced Questionnaire API Endpoints
 * Replacing the broken questionnaire implementation in full-server.js
 */

const { QuestionnaireService } = require('../services/questionnaire-service');
const questionnaireService = new QuestionnaireService();

/**
 * Enhanced questionnaire API handlers
 */
const questionnaireHandlers = {
  
  /**
   * Create questionnaire link - Enhanced version
   * POST /api/admin/create-questionnaire-link
   */
  async createQuestionnaireLink(req, res) {
    try {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body);
          const client_id = payload.client_id || payload.clientId || null;
          const questionnaire_id = payload.questionnaire_id || payload.template_id || null;
          const expiry_days = payload.expiry_days;
          
          const result = await questionnaireService.createQuestionnaireLink(
            client_id, 
            questionnaire_id, 
            expiry_days || 30
          );
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
          
        } catch (error) {
          console.error('❌ Create questionnaire link error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
      });
    } catch (error) {
      console.error('❌ Create questionnaire link handler error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  },
  
  /**
   * Get questionnaire by token - Enhanced version
   * GET /api/questionnaire/:token
   */
  async getQuestionnaireByToken(req, res, token) {
    try {
      const result = await questionnaireService.getQuestionnaireByToken(token);
      
      // Transform the result to match expected frontend format
      const response = {
        token: result.token,
        clientName: result.client?.name || '',
        clientEmail: result.client?.email || '',
        isUsed: result.is_used,
        survey: {
          title: result.questionnaire.title,
          description: 'Help us prepare for your perfect photoshoot experience',
          pages: [
            {
              id: 'page-1',
              title: 'About Your Session',
              questions: result.questionnaire.fields.map((field, index) => ({
                id: field.key,
                type: this.mapFieldType(field.type),
                title: field.label,
                required: field.required || false,
                options: field.options || []
              }))
            }
          ],
          settings: {
            thankYouMessage: 'Thank you for completing the questionnaire! We will review your responses and be in touch soon to discuss your perfect photoshoot.'
          }
        }
      };
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response));
      
    } catch (error) {
      console.error('❌ Get questionnaire by token error:', error.message);
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  },
  
  /**
   * Submit questionnaire response - Enhanced version
   * POST /api/email-questionnaire
   */
  async submitQuestionnaire(req, res) {
    try {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', async () => {
        try {
          const { token, clientName, clientEmail, answers } = JSON.parse(body);
          
          if (!token) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'token is required' }));
            return;
          }
          
          if (!answers || Object.keys(answers).length === 0) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'answers are required' }));
            return;
          }
          
          const result = await questionnaireService.submitQuestionnaireResponse(
            token,
            answers,
            { name: clientName, email: clientEmail }
          );
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
          
        } catch (error) {
          console.error('❌ Submit questionnaire error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
      });
    } catch (error) {
      console.error('❌ Submit questionnaire handler error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  },
  
  /**
   * Get questionnaire responses for admin
   * GET /api/admin/questionnaire-responses
   */
  async getQuestionnaireResponses(req, res) {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const questionnaireId = url.searchParams.get('questionnaire_id');
      const clientId = url.searchParams.get('client_id');
      const limit = parseInt(url.searchParams.get('limit')) || 50;
      const offset = parseInt(url.searchParams.get('offset')) || 0;
      
      const result = await questionnaireService.getQuestionnaireResponses(
        questionnaireId, 
        clientId, 
        limit, 
        offset
      );
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
      
    } catch (error) {
      console.error('❌ Get questionnaire responses error:', error.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  },
  
  /**
   * Attach response to client
   * POST /api/admin/attach-response-to-client
   */
  async attachResponseToClient(req, res) {
    try {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', async () => {
        try {
          const { response_id, client_id } = JSON.parse(body);
          
          if (!response_id || !client_id) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'response_id and client_id are required' }));
            return;
          }
          
          const result = await questionnaireService.attachResponseToClient(response_id, client_id);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
          
        } catch (error) {
          console.error('❌ Attach response to client error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
      });
    } catch (error) {
      console.error('❌ Attach response to client handler error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  },
  
  /**
   * Helper method to map field types to frontend expected types
   */
  mapFieldType(type) {
    const typeMap = {
      'text': 'text',
      'email': 'text',
      'textarea': 'long_text',
      'select': 'single_choice',
      'radio': 'single_choice',
      'checkbox': 'multiple_choice',
      'number': 'text',
      'rating': 'text'
    };
    
    return typeMap[type] || 'text';
  }
};

module.exports = { questionnaireHandlers };
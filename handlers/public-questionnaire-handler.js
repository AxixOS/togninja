/**
 * Enhanced Public Questionnaire Page Handler
 * Replaces the current /q/:slug implementation with proper token-based system
 */

const { QuestionnaireService } = require('../services/questionnaire-service');
const questionnaireService = new QuestionnaireService();

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text ? text.toString().replace(/[&<>"']/g, m => map[m]) : '';
}

/**
 * Enhanced public questionnaire page handler
 * GET /q/:token
 */
async function handlePublicQuestionnairePage(req, res, token) {
  try {
    if (!token) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Questionnaire not found');
      return;
    }

    // Get questionnaire data using enhanced service
    const questionnaireData = await questionnaireService.getQuestionnaireByToken(token);
    
    const questionnaire = questionnaireData.questionnaire;
    const client = questionnaireData.client;
    const fields = questionnaire.fields || [];
    
    // Generate CSS
    const css = `
      body {
        font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
        margin: 0;
        padding: 2rem;
        line-height: 1.6;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        min-height: 100vh;
        color: #333;
      }
      .container {
        max-width: 800px;
        margin: 0 auto;
        background: white;
        border-radius: 20px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.1);
        overflow: hidden;
      }
      .header {
        background: linear-gradient(135deg, #6C2BD9 0%, #9D50BB 100%);
        color: white;
        padding: 2.5rem 2rem;
        text-align: center;
      }
      .logo {
        width: 180px;
        height: auto;
        display: block;
        margin: 0 auto 1rem auto;
        border-radius: 12px;
        box-shadow: 0 6px 16px rgba(0,0,0,0.15);
      }
      .header h1 {
        margin: 0;
        font-size: 2rem;
        font-weight: 600;
      }
      .header p {
        margin: 0.5rem 0 0 0;
        opacity: 0.9;
        font-size: 1.1rem;
      }
      .form-container {
        padding: 2rem;
      }
      .client-info {
        background: #f8f9fa;
        border-radius: 12px;
        padding: 1.5rem;
        margin-bottom: 2rem;
        border-left: 4px solid #6C2BD9;
      }
      .client-info h3 {
        margin: 0 0 1rem 0;
        color: #6C2BD9;
      }
      .form-group {
        margin-bottom: 1.5rem;
      }
      label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 600;
        color: #333;
      }
      .required {
        color: #e74c3c;
      }
      input, select, textarea {
        width: 100%;
        padding: 0.75rem;
        border: 2px solid #e9ecef;
        border-radius: 8px;
        font-size: 1rem;
        transition: border-color 0.3s ease;
        box-sizing: border-box;
      }
      input:focus, select:focus, textarea:focus {
        outline: none;
        border-color: #6C2BD9;
        box-shadow: 0 0 0 3px rgba(108, 43, 217, 0.1);
      }
      .radio-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .radio-option {
        display: flex;
        align-items: center;
        padding: 0.5rem;
        border-radius: 6px;
        transition: background-color 0.2s ease;
      }
      .radio-option:hover {
        background-color: #f8f9fa;
      }
      .radio-option input[type="radio"] {
        width: auto;
        margin-right: 0.5rem;
      }
      .radio-option label {
        margin: 0;
        cursor: pointer;
        font-weight: normal;
      }
      .submit-btn {
        background: linear-gradient(135deg, #6C2BD9 0%, #9D50BB 100%);
        color: white;
        padding: 1rem 2rem;
        border: none;
        border-radius: 12px;
        font-size: 1.1rem;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        width: 100%;
      }
      .submit-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 25px rgba(108, 43, 217, 0.3);
      }
      .submit-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }
      .message {
        padding: 1rem;
        border-radius: 8px;
        margin: 1rem 0;
        text-align: center;
      }
      .message.success {
        background: #d4edda;
        color: #155724;
        border: 1px solid #c3e6cb;
      }
      .message.error {
        background: #f8d7da;
        color: #721c24;
        border: 1px solid #f5c6cb;
      }
      .loading {
        display: none;
        text-align: center;
        padding: 1rem;
      }
      .spinner {
        border: 3px solid #f3f3f3;
        border-top: 3px solid #6C2BD9;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin: 0 auto 1rem;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .footer {
        text-align: center;
        padding: 1.5rem;
        color: #666;
        font-size: 0.9rem;
        border-top: 1px solid #eee;
      }
    `;

    // Generate form fields HTML
    const fieldsHtml = fields.map(field => {
      const isRequired = field.required;
      const requiredAttr = isRequired ? 'required' : '';
      const requiredMark = isRequired ? '<span class="required">*</span>' : '';
      
      switch (field.type) {
        case 'textarea':
          return `
            <div class="form-group">
              <label for="${escapeHtml(field.key)}">${escapeHtml(field.label)} ${requiredMark}</label>
              <textarea 
                id="${escapeHtml(field.key)}" 
                name="${escapeHtml(field.key)}" 
                rows="4" 
                ${requiredAttr}
                placeholder="${escapeHtml(field.placeholder || '')}"
              ></textarea>
            </div>
          `;
          
        case 'select':
          const selectOptions = (field.options || []).map(option => 
            `<option value="${escapeHtml(option.value || option)}">${escapeHtml(option.label || option)}</option>`
          ).join('');
          return `
            <div class="form-group">
              <label for="${escapeHtml(field.key)}">${escapeHtml(field.label)} ${requiredMark}</label>
              <select id="${escapeHtml(field.key)}" name="${escapeHtml(field.key)}" ${requiredAttr}>
                <option value="">Please select...</option>
                ${selectOptions}
              </select>
            </div>
          `;
          
        case 'radio':
          const radioOptions = (field.options || []).map((option, index) => 
            `<div class="radio-option">
              <input 
                type="radio" 
                id="${escapeHtml(field.key)}_${index}" 
                name="${escapeHtml(field.key)}" 
                value="${escapeHtml(option.value || option)}" 
                ${requiredAttr}
              />
              <label for="${escapeHtml(field.key)}_${index}">${escapeHtml(option.label || option)}</label>
            </div>`
          ).join('');
          return `
            <div class="form-group">
              <label>${escapeHtml(field.label)} ${requiredMark}</label>
              <div class="radio-group">
                ${radioOptions}
              </div>
            </div>
          `;
          
        case 'email':
          return `
            <div class="form-group">
              <label for="${escapeHtml(field.key)}">${escapeHtml(field.label)} ${requiredMark}</label>
              <input 
                type="email" 
                id="${escapeHtml(field.key)}" 
                name="${escapeHtml(field.key)}" 
                ${requiredAttr}
                placeholder="${escapeHtml(field.placeholder || 'your@email.com')}"
              />
            </div>
          `;
          
        default: // text, number, etc.
          const inputType = field.type === 'number' ? 'number' : 'text';
          return `
            <div class="form-group">
              <label for="${escapeHtml(field.key)}">${escapeHtml(field.label)} ${requiredMark}</label>
              <input 
                type="${inputType}" 
                id="${escapeHtml(field.key)}" 
                name="${escapeHtml(field.key)}" 
                ${requiredAttr}
                placeholder="${escapeHtml(field.placeholder || '')}"
              />
            </div>
          `;
      }
    }).join('');

    // Generate complete HTML
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${escapeHtml(questionnaire.title)} - New Age Fotografie</title>
        <style>${css}</style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="https://i.postimg.cc/V6wRZZPJ/frontend-logo.jpg" alt="Company Logo" class="logo" />
            <h1>${escapeHtml(questionnaire.title)}</h1>
            <p>Help us prepare for your perfect photoshoot experience</p>
          </div>
          
          <div class="form-container">
            ${client && client.name ? `
              <div class="client-info">
                <h3>Client Information</h3>
                <p><strong>Name:</strong> ${escapeHtml(client.name)}</p>
                ${client.email ? `<p><strong>Email:</strong> ${escapeHtml(client.email)}</p>` : ''}
              </div>
            ` : ''}
            
            <form id="questionnaire-form">
              ${!client || !client.name ? `
                <div class="form-group">
                  <label for="clientName">Your Name <span class="required">*</span></label>
                  <input type="text" id="clientName" name="clientName" required placeholder="Enter your full name" />
                </div>
              ` : ''}
              
              ${!client || !client.email ? `
                <div class="form-group">
                  <label for="clientEmail">Your Email <span class="required">*</span></label>
                  <input type="email" id="clientEmail" name="clientEmail" required placeholder="your@email.com" />
                </div>
              ` : ''}
              
              ${fieldsHtml}
              
              <div class="form-group">
                <button type="submit" class="submit-btn" id="submit-btn">
                  Submit Questionnaire
                </button>
              </div>
            </form>
            
            <div id="loading" class="loading">
              <div class="spinner"></div>
              <p>Submitting your responses...</p>
            </div>
            
            <div id="message"></div>
          </div>
          
          <div class="footer">
            <p>© 2024 New Age Fotografie - Professional Photography Services</p>
          </div>
        </div>

        <script>
          const form = document.getElementById('questionnaire-form');
          const submitBtn = document.getElementById('submit-btn');
          const loading = document.getElementById('loading');
          const messageDiv = document.getElementById('message');
          const localKey = 'qn-${token}';

          // Inline editing support: load draft from localStorage
          try {
            const saved = JSON.parse(localStorage.getItem(localKey) || '{}');
            Object.keys(saved).forEach((k) => {
              const el = document.querySelector('[name="' + k + '"]');
              if (el && saved[k] !== undefined && saved[k] !== null) el.value = saved[k];
            });
          } catch {}

          // Save on input changes
          form.addEventListener('input', (e) => {
            try {
              const fd = new FormData(form);
              const obj = {};
              fd.forEach((v, k) => { obj[k] = v; });
              localStorage.setItem(localKey, JSON.stringify(obj));
            } catch {}
          });
          
          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Show loading state
            submitBtn.disabled = true;
            loading.style.display = 'block';
            messageDiv.innerHTML = '';
            
            // Collect form data
            const formData = new FormData(form);
            const answers = {};
            const clientContact = {};
            
            formData.forEach((value, key) => {
              if (key === 'clientName') {
                clientContact.name = value;
              } else if (key === 'clientEmail') {
                clientContact.email = value;
              } else {
                answers[key] = value;
              }
            });
            
            try {
              const response = await fetch('/api/email-questionnaire', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  token: '${token}',
                  clientName: clientContact.name || '${escapeHtml(client?.name || '')}',
                  clientEmail: clientContact.email || '${escapeHtml(client?.email || '')}',
                  answers: answers
                })
              });
              
              const result = await response.json();
              
              if (result.success) {
                messageDiv.innerHTML = '<div class="message success">Thank you! Your questionnaire has been submitted successfully. We will review your responses and be in touch soon.</div>';
                form.style.display = 'none';
                try { localStorage.removeItem(localKey); } catch {}
              } else {
                throw new Error(result.error || 'Something went wrong');
              }
              
            } catch (error) {
              console.error('Submit error:', error);
              messageDiv.innerHTML = '<div class="message error">Sorry, there was an error submitting your questionnaire. Please try again or contact us directly.</div>';
            } finally {
              // Hide loading state
              submitBtn.disabled = false;
              loading.style.display = 'none';
            }
          });
        </script>
      </body>
      </html>
    `;

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);

  } catch (error) {
    console.error('❌ Error rendering questionnaire page:', error.message);
    
    if (error.message.includes('not found') || error.message.includes('expired')) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head><title>Questionnaire Not Found</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 2rem;">
          <h1>Questionnaire Not Found</h1>
          <p>This questionnaire link may have expired or is no longer available.</p>
          <p>Please contact us directly if you need assistance.</p>
        </body>
        </html>
      `);
    } else {
      res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head><title>Server Error</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 2rem;">
          <h1>Server Error</h1>
          <p>We're experiencing technical difficulties. Please try again later.</p>
        </body>
        </html>
      `);
    }
  }
}

module.exports = { handlePublicQuestionnairePage };
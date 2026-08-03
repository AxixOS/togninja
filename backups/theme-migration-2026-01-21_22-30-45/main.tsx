import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Enhanced error handling for production deployment
if (import.meta.env.PROD) {
  // In production, capture errors but don't suppress them completely
  const originalError = console.error;
  console.error = (...args) => {
    // Log to server if available
    fetch('/api/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: args.join(' '), timestamp: new Date().toISOString() })
    }).catch(() => {}); // Ignore fetch errors
    
    // Still log to console for debugging
    originalError.apply(console, args);
  };
} else {
  // Development: reduce console noise but keep errors visible
  console.log = () => {};
  console.warn = () => {};
  console.info = () => {};
  console.debug = () => {};
}

// Force enable interactions on load
window.addEventListener('load', () => {
  document.body.style.pointerEvents = 'auto';
  document.body.style.userSelect = 'auto';
  document.body.style.overflow = 'auto';
  document.documentElement.style.overflow = 'auto';
});

// Enhanced error boundary and initialization
const initializeApp = () => {
  try {
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found');
    }

    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  } catch (error) {
    console.error('Failed to initialize app:', error);
    
    // Fallback rendering
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="
          display: flex; 
          align-items: center; 
          justify-content: center; 
          min-height: 100vh; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-align: center;
          font-family: system-ui, -apple-system, sans-serif;
        ">
          <div style="
            background: rgba(255,255,255,0.1);
            padding: 40px;
            border-radius: 20px;
            backdrop-filter: blur(10px);
          ">
            <h1 style="margin: 0 0 20px 0; font-size: 2rem;">NEW AGE FOTOGRAFIE</h1>
            <p style="margin: 0 0 20px 0;">Lade Anwendung...</p>
            <p style="margin: 0; opacity: 0.8;">
              Bei Problemen kontaktieren Sie uns: 
              <a href="mailto:hallo@newagefotografie.com" style="color: #fff;">hallo@newagefotografie.com</a>
            </p>
          </div>
        </div>
      `;
      
      // Retry initialization after 3 seconds
      setTimeout(() => window.location.reload(), 3000);
    }
  }
};

// Initialize with DOM ready check
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

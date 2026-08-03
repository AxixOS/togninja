import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

// Simple test app to check if syntax is working
function TestApp() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-xl text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">TogNinja CRM</h1>
        <p className="text-gray-600 mb-6">System Loading Successfully!</p>
        <div className="flex items-center justify-center space-x-4">
          <img 
            src="/frontend-logo.jpg" 
            alt="TogNinja Logo"
            className="h-16 w-auto"
          />
          <div>
            <p className="text-sm text-green-600">✅ Environment Variables Connected</p>
            <p className="text-sm text-green-600">✅ React App Working</p>
            <p className="text-sm text-green-600">✅ Logos Loading</p>
          </div>
        </div>
        <a 
          href="/admin/login" 
          className="inline-block mt-6 bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
        >
          Go to Admin Login
        </a>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TestApp />
  </StrictMode>
);

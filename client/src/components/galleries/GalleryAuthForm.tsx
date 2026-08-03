import React, { useState } from 'react';
import { Mail, Lock, LogIn, Loader2, AlertCircle, User } from 'lucide-react';
import { authenticateGallery } from '../../lib/gallery-api';

interface GalleryAuthFormProps {
  gallerySlug: string;
  isPasswordProtected: boolean;
  onAuthenticated: (token: string) => void;
}

const GalleryAuthForm: React.FC<GalleryAuthFormProps> = ({ 
  gallerySlug, 
  isPasswordProtected, 
  onAuthenticated 
}) => {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Email is required');
      return;
    }
    
    if (isPasswordProtected && !password) {
      setError('Password is required');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const { token } = await authenticateGallery(gallerySlug, { 
        email, 
        firstName,
        lastName,
        password: isPasswordProtected ? password : undefined 
      });
      
      // Store token in localStorage for persistence
      localStorage.setItem(`gallery_token_${gallerySlug}`, token);
      
      // Notify parent component
      onAuthenticated(token);
    } catch (err) {
      // console.error removed
      setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
      <div className="text-center mb-6">
        <div className="bg-purple-100 text-purple-600 rounded-full p-3 inline-block">
          {isPasswordProtected ? (
            <Lock className="h-8 w-8" />
          ) : (
            <Mail className="h-8 w-8" />
          )}
        </div>
        <h2 className="mt-4 text-2xl font-bold text-gray-900">
          {isPasswordProtected ? 'Protected Gallery' : 'Welcome to the Gallery'}
        </h2>
        <p className="mt-2 text-gray-600">
          {isPasswordProtected 
            ? 'Please enter the password to view this gallery'
            : 'Please enter your information to continue'}
        </p>
      </div>
      
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
          <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2" />
          <span>{error}</span>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
              placeholder="you@example.com"
              required
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
              First Name
            </label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
              placeholder="First Name"
            />
          </div>
          
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
              Last Name
            </label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
              placeholder="Last Name"
            />
          </div>
        </div>
        
        {isPasswordProtected && (
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                placeholder="Enter gallery password"
                required
              />
            </div>
          </div>
        )}
        
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
              Authenticating...
            </>
          ) : (
            <>
              <LogIn className="-ml-1 mr-2 h-5 w-5" />
              Enter Gallery
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default GalleryAuthForm;
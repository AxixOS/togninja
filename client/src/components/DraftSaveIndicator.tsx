import React from 'react';
import { Save, CheckCircle, AlertCircle } from 'lucide-react';

interface DraftSaveIndicatorProps {
  status: 'saving' | 'saved' | 'error' | 'idle';
  lastSaved?: string;
}

export const DraftSaveIndicator: React.FC<DraftSaveIndicatorProps> = ({ 
  status, 
  lastSaved 
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'saving':
        return <Save className="w-4 h-4 animate-pulse text-blue-500" />;
      case 'saved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'saving':
        return 'Saving draft...';
      case 'saved':
        return lastSaved ? `Draft saved ${lastSaved}` : 'Draft saved';
      case 'error':
        return 'Failed to save draft';
      default:
        return '';
    }
  };

  if (status === 'idle') return null;

  return (
    <div className="flex items-center gap-1 text-xs text-gray-500 px-3 py-2 bg-gray-50 rounded-md">
      {getStatusIcon()}
      <span>{getStatusText()}</span>
    </div>
  );
};
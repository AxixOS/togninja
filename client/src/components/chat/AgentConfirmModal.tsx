/**
 * Agent Action Confirmation Modal
 * 
 * Shows when Agent V2 needs user confirmation for medium/high-risk actions
 */

import React from 'react';
import { AlertTriangle, CheckCircle, X } from 'lucide-react';

export interface ConfirmationData {
  tool: string;
  args: any;
  reason: string;
  message?: string;
}

interface AgentConfirmModalProps {
  isOpen: boolean;
  data: ConfirmationData | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const AgentConfirmModal: React.FC<AgentConfirmModalProps> = ({
  isOpen,
  data,
  onConfirm,
  onCancel
}) => {
  if (!isOpen || !data) return null;

  // Format tool name for display
  const toolDisplayName = data.tool
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Determine risk level styling
  const isHighRisk = data.tool.includes('send') || data.tool.includes('paid') || data.tool.includes('delete');
  const riskColor = isHighRisk ? 'text-red-600' : 'text-amber-600';
  const riskBgColor = isHighRisk ? 'bg-red-50' : 'bg-amber-50';
  const riskBorderColor = isHighRisk ? 'border-red-200' : 'border-amber-200';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className={`px-6 py-4 border-b ${riskBorderColor} ${riskBgColor}`}>
          <div className="flex items-center gap-3">
            <AlertTriangle className={`w-6 h-6 ${riskColor}`} />
            <h3 className="text-lg font-semibold text-gray-900">
              Confirm Action
            </h3>
            <button
              onClick={onCancel}
              className="ml-auto text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Action Description */}
          <div>
            <p className="text-sm text-gray-600 mb-2">
              The agent wants to perform the following action:
            </p>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <p className="font-semibold text-gray-900">{toolDisplayName}</p>
              {data.message && (
                <p className="text-sm text-gray-600 mt-1">{data.message}</p>
              )}
            </div>
          </div>

          {/* Arguments Preview */}
          <div>
            <p className="text-xs text-gray-500 font-medium mb-2">Details:</p>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 max-h-48 overflow-y-auto">
              {Object.entries(data.args).map(([key, value]) => {
                // Skip internal flags
                if (key === '__confirm') return null;
                
                return (
                  <div key={key} className="mb-2 last:mb-0">
                    <span className="text-xs text-gray-500 capitalize">
                      {key.replace(/_/g, ' ')}:
                    </span>
                    <p className="text-sm text-gray-900 break-words">
                      {typeof value === 'object' 
                        ? JSON.stringify(value, null, 2)
                        : String(value)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Warning for high-risk actions */}
          {isHighRisk && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-900">
                    High-Risk Action
                  </p>
                  <p className="text-xs text-red-700 mt-1">
                    This action cannot be easily undone. Please review carefully before confirming.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex gap-3 justify-end rounded-b-lg">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
              isHighRisk
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-violet-600 hover:bg-violet-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Confirm & Execute
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

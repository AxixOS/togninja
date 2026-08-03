import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, CheckCircle, Circle } from 'lucide-react';

interface PlanStep {
  tool: string;
  args: Record<string, any>;
}

interface Plan {
  steps: PlanStep[];
  explanation: string;
  risk_level: 'low' | 'medium' | 'high';
  estimated_duration: string;
}

interface PlanModalProps {
  isOpen: boolean;
  plan: Plan | null;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const getRiskIcon = (level: string) => {
  switch (level) {
    case 'high': return <AlertTriangle className="w-4 h-4 text-red-500" />;
    case 'medium': return <Circle className="w-4 h-4 text-yellow-500" />;
    case 'low': return <CheckCircle className="w-4 h-4 text-green-500" />;
    default: return <Circle className="w-4 h-4 text-gray-500" />;
  }
};

const getRiskColor = (level: string) => {
  switch (level) {
    case 'high': return 'bg-red-100 text-red-800 border-red-200';
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low': return 'bg-green-100 text-green-800 border-green-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const formatArgs = (args: Record<string, any>): string => {
  const entries = Object.entries(args);
  if (entries.length === 0) return 'No parameters';
  
  return entries.map(([key, value]) => {
    if (typeof value === 'object') {
      return `${key}: ${JSON.stringify(value)}`;
    }
    return `${key}: ${String(value)}`;
  }).join(', ');
};

export function PlanModal({ isOpen, plan, onConfirm, onCancel, loading = false }: PlanModalProps) {
  if (!plan) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Execution Plan
            <Badge className={getRiskColor(plan.risk_level)}>
              {getRiskIcon(plan.risk_level)}
              {plan.risk_level.toUpperCase()} RISK
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Plan Summary */}
          <div className="bg-blue-50 p-4 rounded-lg border">
            <h3 className="font-medium text-blue-900 mb-2">What this will do:</h3>
            <p className="text-blue-800">{plan.explanation}</p>
            <div className="flex items-center gap-2 mt-2 text-sm text-blue-700">
              <Clock className="w-4 h-4" />
              Estimated duration: {plan.estimated_duration}
            </div>
          </div>
          
          {/* Steps List */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">Execution Steps:</h3>
            {plan.steps.map((step, index) => (
              <div key={index} className="flex gap-3 p-3 bg-gray-50 rounded-lg border">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 mb-1">
                    {step.tool.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </div>
                  <div className="text-sm text-gray-600 break-all">
                    {formatArgs(step.args)}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Risk Warning */}
          {plan.risk_level === 'high' && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-900">High Risk Operation</h4>
                  <p className="text-red-800 text-sm mt-1">
                    This plan includes operations that may send emails, create invoices, or make external orders. 
                    Please review carefully before proceeding.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={onConfirm}
            disabled={loading}
            className={plan.risk_level === 'high' ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            {loading ? 'Executing...' : 'Proceed'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
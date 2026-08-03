import type { LandingPagePublishReadinessResult } from '../../types/landingPageEditor.types';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface Props {
  readiness: LandingPagePublishReadinessResult;
}

export default function LandingPagePublishReadinessPanel({ readiness }: Props) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-900">Publish Readiness</h3>

      {readiness.isReady ? (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
          <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
          <p className="text-sm text-green-800">Page is ready to publish</p>
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">Fix critical issues before publishing this page live.</p>
        </div>
      )}

      {/* Errors */}
      {readiness.errors.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-red-700">Critical</p>
          {readiness.errors.map((err, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-red-600">
              <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{err}</span>
            </div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {readiness.warnings.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-amber-700">Recommended</p>
          {readiness.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-amber-600">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Passed */}
      {readiness.completedChecks.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-green-700">Passed</p>
          {readiness.completedChecks.map((c, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-green-600">
              <CheckCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{c}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

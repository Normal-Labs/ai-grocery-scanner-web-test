/**
 * Detailed Error Display Component
 * 
 * Shows comprehensive error information for field testing and debugging.
 * Includes timestamp, error details, and easy screenshot capability.
 */

'use client';

import { useState } from 'react';

export interface ErrorDetails {
  message: string;
  code?: string;
  timestamp?: Date;
  context?: Record<string, unknown>;
  stack?: string;
}

interface DetailedErrorDisplayProps {
  error: string | ErrorDetails;
  onRetry?: () => void;
  onDismiss?: () => void;
  title?: string;
}

export default function DetailedErrorDisplay({
  error,
  onRetry,
  onDismiss,
  title = 'Error',
}: DetailedErrorDisplayProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  // Parse error into structured format
  const errorDetails: ErrorDetails = typeof error === 'string'
    ? { message: error, timestamp: new Date() }
    : { ...error, timestamp: error.timestamp || new Date() };

  // Generate error report for copying
  const generateErrorReport = () => {
    const report = [
      '=== ERROR REPORT ===',
      `Time: ${errorDetails.timestamp?.toISOString()}`,
      `Message: ${errorDetails.message}`,
      errorDetails.code ? `Code: ${errorDetails.code}` : null,
      errorDetails.context ? `Context: ${JSON.stringify(errorDetails.context, null, 2)}` : null,
      errorDetails.stack ? `\nStack Trace:\n${errorDetails.stack}` : null,
      `\nUser Agent: ${navigator.userAgent}`,
      `URL: ${window.location.href}`,
      '==================',
    ].filter(Boolean).join('\n');
    
    return report;
  };

  const copyErrorReport = async () => {
    try {
      await navigator.clipboard.writeText(generateErrorReport());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy error report:', err);
    }
  };

  return (
    <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start flex-1">
          <span className="text-3xl mr-3 flex-shrink-0">⚠️</span>
          <div className="flex-1">
            <h3 className="font-bold text-red-900 text-lg mb-1">{title}</h3>
            <p className="text-red-800 text-sm leading-relaxed">
              {errorDetails.message}
            </p>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-400 hover:text-red-600 ml-2 flex-shrink-0"
            aria-label="Dismiss error"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      {/* Error Code & Timestamp */}
      <div className="bg-red-100 rounded-md p-3 mb-4 font-mono text-xs">
        <div className="flex flex-wrap gap-4">
          <div>
            <span className="text-red-600 font-semibold">Time:</span>{' '}
            <span className="text-red-900">
              {errorDetails.timestamp?.toLocaleString()}
            </span>
          </div>
          {errorDetails.code && (
            <div>
              <span className="text-red-600 font-semibold">Code:</span>{' '}
              <span className="text-red-900">{errorDetails.code}</span>
            </div>
          )}
        </div>
      </div>

      {/* Context Details (Expandable) */}
      {errorDetails.context && Object.keys(errorDetails.context).length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-red-700 hover:text-red-900 font-medium flex items-center gap-1"
          >
            <span>{showDetails ? '▼' : '▶'}</span>
            <span>Technical Details</span>
          </button>
          {showDetails && (
            <div className="mt-2 bg-red-100 rounded-md p-3 font-mono text-xs overflow-auto max-h-48">
              <pre className="text-red-900 whitespace-pre-wrap">
                {JSON.stringify(errorDetails.context, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
          >
            Try Again
          </button>
        )}
        <button
          onClick={copyErrorReport}
          className="px-4 py-2 bg-white border-2 border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors font-medium text-sm flex items-center gap-2"
        >
          {copied ? (
            <>
              <span>✓</span>
              <span>Copied!</span>
            </>
          ) : (
            <>
              <span>📋</span>
              <span>Copy Error Report</span>
            </>
          )}
        </button>
      </div>

      {/* Helper Text */}
      <p className="text-xs text-red-600 mt-4 italic">
        💡 Tip: Take a screenshot or copy this error report to share with support
      </p>
    </div>
  );
}

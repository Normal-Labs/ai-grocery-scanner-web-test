/**
 * Error Handler Utility
 * 
 * Provides user-friendly error messages for different HTTP status codes
 * and error types from the backend.
 */

export interface ApiError {
  statusCode: number;
  errorCode?: string;
  message: string;
  userMessage: string;
  retryable: boolean;
  action?: string;
}

/**
 * Parse error response from API and return user-friendly error
 */
export async function parseApiError(response: Response): Promise<ApiError> {
  const statusCode = response.status;
  let errorData: any = {};
  
  try {
    errorData = await response.json();
  } catch {
    // If response is not JSON, use default error message
    errorData = { error: response.statusText };
  }

  const backendMessage = errorData.error || errorData.message || 'Unknown error';
  const errorCode = errorData.code || errorData.errorCode;

  // Map status codes to user-friendly messages
  switch (statusCode) {
    case 429:
      return {
        statusCode,
        errorCode: errorCode || 'RATE_LIMIT_EXCEEDED',
        message: backendMessage,
        userMessage: 'Too many requests. Please wait a moment and try again.',
        retryable: true,
        action: 'Wait 30-60 seconds before trying again',
      };

    case 400:
      // Bad request - could be validation error or missing data
      if (backendMessage.toLowerCase().includes('barcode')) {
        return {
          statusCode,
          errorCode: errorCode || 'BARCODE_ERROR',
          message: backendMessage,
          userMessage: 'Unable to read the barcode. Please try capturing the image again with better lighting.',
          retryable: true,
          action: 'Ensure the barcode is clearly visible and well-lit',
        };
      }
      
      if (backendMessage.toLowerCase().includes('nutrition') || backendMessage.toLowerCase().includes('label')) {
        return {
          statusCode,
          errorCode: errorCode || 'NUTRITION_LABEL_ERROR',
          message: backendMessage,
          userMessage: 'Unable to read the nutrition label. Please ensure the entire label is visible and in focus.',
          retryable: true,
          action: 'Capture the nutrition label with good lighting and focus',
        };
      }

      if (backendMessage.toLowerCase().includes('ingredient')) {
        return {
          statusCode,
          errorCode: errorCode || 'INGREDIENT_ERROR',
          message: backendMessage,
          userMessage: 'Unable to read the ingredient list. The nutrition facts were captured successfully.',
          retryable: false,
          action: 'You can continue - ingredient list is optional',
        };
      }

      return {
        statusCode,
        errorCode: errorCode || 'INVALID_REQUEST',
        message: backendMessage,
        userMessage: 'Invalid request. Please try again.',
        retryable: true,
        action: 'Check that the image is clear and try again',
      };

    case 401:
      return {
        statusCode,
        errorCode: errorCode || 'UNAUTHORIZED',
        message: backendMessage,
        userMessage: 'Authentication required. Please sign in to continue.',
        retryable: false,
        action: 'Sign in to your account',
      };

    case 403:
      return {
        statusCode,
        errorCode: errorCode || 'FORBIDDEN',
        message: backendMessage,
        userMessage: 'Access denied. You may need to upgrade your account.',
        retryable: false,
        action: 'Check your account permissions',
      };

    case 404:
      return {
        statusCode,
        errorCode: errorCode || 'NOT_FOUND',
        message: backendMessage,
        userMessage: 'Product not found. This might be a new product.',
        retryable: false,
        action: 'Try scanning with all three images (barcode, packaging, nutrition label)',
      };

    case 408:
      return {
        statusCode,
        errorCode: errorCode || 'TIMEOUT',
        message: backendMessage,
        userMessage: 'Request timed out. Please try again.',
        retryable: true,
        action: 'Check your internet connection and try again',
      };

    case 413:
      return {
        statusCode,
        errorCode: errorCode || 'PAYLOAD_TOO_LARGE',
        message: backendMessage,
        userMessage: 'Image file is too large. Please use a smaller image.',
        retryable: true,
        action: 'Reduce image quality or size and try again',
      };

    case 500:
      return {
        statusCode,
        errorCode: errorCode || 'INTERNAL_SERVER_ERROR',
        message: backendMessage,
        userMessage: 'Server error. Our team has been notified.',
        retryable: true,
        action: 'Please try again in a few moments',
      };

    case 502:
    case 503:
    case 504:
      return {
        statusCode,
        errorCode: errorCode || 'SERVICE_UNAVAILABLE',
        message: backendMessage,
        userMessage: 'Service temporarily unavailable. Please try again shortly.',
        retryable: true,
        action: 'Wait a moment and try again',
      };

    default:
      return {
        statusCode,
        errorCode: errorCode || 'UNKNOWN_ERROR',
        message: backendMessage,
        userMessage: 'An unexpected error occurred. Please try again.',
        retryable: true,
        action: 'Try again or contact support if the issue persists',
      };
  }
}

/**
 * Format error for display in UI
 */
export function formatErrorForDisplay(error: ApiError): {
  title: string;
  message: string;
  action?: string;
  retryable: boolean;
} {
  return {
    title: getErrorTitle(error.statusCode),
    message: error.userMessage,
    action: error.action,
    retryable: error.retryable,
  };
}

/**
 * Get error title based on status code
 */
function getErrorTitle(statusCode: number): string {
  if (statusCode === 429) return 'Rate Limit Exceeded';
  if (statusCode >= 400 && statusCode < 500) return 'Request Error';
  if (statusCode >= 500) return 'Server Error';
  return 'Error';
}

/**
 * Check if error is retryable
 */
export function isRetryableError(statusCode: number): boolean {
  return [408, 429, 500, 502, 503, 504].includes(statusCode);
}

/**
 * Get retry delay in milliseconds based on status code
 */
export function getRetryDelay(statusCode: number): number {
  if (statusCode === 429) return 60000; // 60 seconds for rate limit
  if (statusCode === 503) return 5000;  // 5 seconds for service unavailable
  return 2000; // 2 seconds default
}

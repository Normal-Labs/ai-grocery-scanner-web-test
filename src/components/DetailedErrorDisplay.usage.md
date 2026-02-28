# DetailedErrorDisplay Component

A comprehensive error display component designed for field testing and debugging. Shows detailed error information with timestamp, error codes, context, and easy screenshot/copy capabilities.

## Features

- **Detailed Error Information**: Shows error message, code, timestamp, and context
- **Expandable Technical Details**: Context data can be expanded for debugging
- **Copy to Clipboard**: One-click copy of full error report
- **Screenshot-Friendly**: Formatted for easy screenshot sharing
- **Retry & Dismiss Actions**: Built-in action buttons
- **User-Friendly Design**: Clear visual hierarchy with accessible markup

## Usage

### Basic Usage (String Error)

```tsx
import DetailedErrorDisplay from '@/components/DetailedErrorDisplay';

function MyComponent() {
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      {error && (
        <DetailedErrorDisplay
          error={error}
          onRetry={() => {
            setError(null);
            // retry logic
          }}
          onDismiss={() => setError(null)}
        />
      )}
    </>
  );
}
```

### Advanced Usage (Structured Error)

```tsx
import DetailedErrorDisplay, { type ErrorDetails } from '@/components/DetailedErrorDisplay';

function MyComponent() {
  const [error, setError] = useState<ErrorDetails | null>(null);

  const handleError = (err: Error) => {
    setError({
      message: err.message,
      code: 'API_ERROR',
      timestamp: new Date(),
      context: {
        endpoint: '/api/scan',
        userId: 'user-123',
        barcode: '1234567890',
      },
      stack: err.stack,
    });
  };

  return (
    <>
      {error && (
        <DetailedErrorDisplay
          error={error}
          title="Scan Failed"
          onRetry={handleRetry}
          onDismiss={() => setError(null)}
        />
      )}
    </>
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `error` | `string \| ErrorDetails` | Yes | Error message or structured error object |
| `onRetry` | `() => void` | No | Callback when retry button is clicked |
| `onDismiss` | `() => void` | No | Callback when dismiss button is clicked |
| `title` | `string` | No | Error title (default: "Error") |

## ErrorDetails Interface

```typescript
interface ErrorDetails {
  message: string;           // Main error message
  code?: string;             // Error code (e.g., 'API_ERROR', 'NETWORK_ERROR')
  timestamp?: Date;          // When the error occurred
  context?: Record<string, unknown>;  // Additional context data
  stack?: string;            // Stack trace (for development)
}
```

## Error Report Format

When users click "Copy Error Report", they get a formatted report:

```
=== ERROR REPORT ===
Time: 2024-02-28T10:30:45.123Z
Message: Failed to scan product
Code: API_ERROR
Context: {
  "endpoint": "/api/scan",
  "userId": "user-123",
  "barcode": "1234567890"
}

User Agent: Mozilla/5.0...
URL: https://example.com/scan
==================
```

## Best Practices

1. **Always include timestamp**: Helps with debugging time-sensitive issues
2. **Add relevant context**: Include request parameters, user state, etc.
3. **Use error codes**: Makes it easier to categorize and track errors
4. **Sanitize sensitive data**: Don't include passwords, tokens, etc. in context
5. **Include stack traces in development**: Helps with debugging but exclude in production

## Example: API Error Handling

```tsx
try {
  const response = await fetch('/api/scan', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    setError({
      message: errorData.error || 'Request failed',
      code: errorData.code || `HTTP_${response.status}`,
      timestamp: new Date(),
      context: {
        endpoint: '/api/scan',
        status: response.status,
        requestData: data,
      },
    });
  }
} catch (err) {
  setError({
    message: err instanceof Error ? err.message : 'Unknown error',
    code: 'NETWORK_ERROR',
    timestamp: new Date(),
    context: {
      endpoint: '/api/scan',
      errorType: err instanceof Error ? err.name : 'Unknown',
    },
    stack: err instanceof Error ? err.stack : undefined,
  });
}
```

## Accessibility

- Uses semantic HTML with proper ARIA attributes
- Keyboard accessible buttons
- Screen reader friendly error messages
- High contrast colors for readability

## Field Testing Tips

1. **Take Screenshots**: The component is designed to be screenshot-friendly
2. **Copy Error Reports**: Use the copy button to share full error details
3. **Check Timestamp**: Helps correlate errors with server logs
4. **Review Context**: Technical details section shows all relevant data

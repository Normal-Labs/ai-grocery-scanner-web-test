# Gemini API Wrapper Guide (Vertex AI Edition)

## Overview

The `GeminiWrapper` provides enhanced error tracking and quota monitoring for Gemini 2.0 Flash API calls via Vertex AI. It helps diagnose 429 errors by extracting detailed quota information and detecting tier mismatches.

**Key Change**: Migrated from Generative Language API to Vertex AI to resolve "Free Tier: 0" quota issues and access proper Paid Tier limits (2,000 RPM).

## Features

### 1. Vertex AI Integration
- Uses `@google-cloud/vertexai` SDK instead of `@google/generative-ai`
- Proper Paid Tier quota access (2,000 RPM vs 15 RPM)
- Google Cloud authentication (no API keys)
- Better monitoring and enterprise features

### 2. Detailed 429 Error Analysis
- Extracts `QuotaFailure` objects from error details
- Identifies specific quota metrics (RPM, TPM, RPD)
- Detects quota limits and tier (Free vs Paid)
- Logs violation details with actionable recommendations

### 3. Response Header Tracking
- `x-goog-ratelimit-remaining`: Remaining quota
- `x-goog-retry-after`: Seconds until retry allowed
- `retry-after`: Standard retry header
- Additional rate limit headers

### 4. Automatic Retry Logic
- Configurable retry attempts
- Exponential backoff strategy
- Respects `retry-after` headers
- Tracks retry count and total duration

### 5. API Call Monitoring
- Tracks total API calls
- Measures time between calls
- Provides statistics for debugging

## Installation

The wrapper is located at `src/lib/gemini-wrapper.ts` and uses Vertex AI:

```typescript
import { getGeminiWrapper } from '@/lib/gemini-wrapper';
```

**Prerequisites**:
1. Install Vertex AI SDK: `npm install @google-cloud/vertexai`
2. Authenticate with Google Cloud (see [VERTEX_AI_SETUP.md](VERTEX_AI_SETUP.md))
3. Enable Vertex AI API on your project

## Basic Usage

### Simple Text Generation

```typescript
import { getGeminiWrapper } from '@/lib/gemini-wrapper';

const gemini = getGeminiWrapper();

const result = await gemini.generateContent({
  prompt: 'What is the capital of France?',
});

if (result.success) {
  console.log('Response:', result.text);
} else {
  console.error('Error:', result.error);
  if (result.rateLimitInfo) {
    console.log('Rate Limit Info:', result.rateLimitInfo);
  }
}
```

### Image Analysis with Retry

```typescript
const result = await gemini.generateContent({
  prompt: 'Describe this image',
  imageData: base64ImageData,
  imageMimeType: 'image/jpeg',
  maxRetries: 3,
  retryDelayMs: 5000,
});
```

### Complete Example with Error Handling

```typescript
const gemini = getGeminiWrapper();

const result = await gemini.generateContent({
  prompt: 'Extract barcode from this image',
  imageData: base64Data,
  imageMimeType: 'image/jpeg',
  maxRetries: 2,
  retryDelayMs: 5000,
});

if (result.success) {
  console.log('✅ Success!');
  console.log('Text:', result.text);
  console.log('Retries:', result.retryCount);
  console.log('Duration:', result.totalDuration, 'ms');
} else {
  console.error('❌ Failed after', result.retryCount, 'retries');
  console.error('Error:', result.error);
  
  if (result.tierMismatch) {
    console.error('🚨 TIER MISMATCH DETECTED!');
  }
  
  if (result.rateLimitInfo) {
    const info = result.rateLimitInfo;
    console.log('Tier:', info.tierDetected);
    console.log('Quota Metric:', info.quotaMetric);
    console.log('Quota Limit:', info.quotaLimit);
    console.log('Remaining:', info.remainingQuota);
    console.log('Retry After:', info.retryAfter, 'seconds');
  }
}
```

## API Reference

### `GeminiWrapper` Class

#### Constructor
```typescript
new GeminiWrapper(
  projectId?: string,
  location?: string,
  modelName?: string
)
```

**Parameters**:
- `projectId`: Google Cloud project ID (default: from `VERTEX_AI_CONFIG`)
- `location`: Region (default: `us-central1`)
- `modelName`: Model name (default: `gemini-2.0-flash`)

#### Methods

##### `generateContent(options: GeminiCallOptions): Promise<GeminiCallResult>`

Make a Gemini API call with enhanced error tracking.

**Options:**
```typescript
interface GeminiCallOptions {
  prompt: string;              // Required: The text prompt
  imageData?: string;          // Optional: Base64 image data (without data URL prefix)
  imageMimeType?: string;      // Optional: Image MIME type (default: 'image/jpeg')
  temperature?: number;        // Optional: Temperature setting (not yet implemented)
  maxRetries?: number;         // Optional: Max retry attempts (default: 0)
  retryDelayMs?: number;       // Optional: Initial retry delay (default: 5000ms)
}
```

**Result:**
```typescript
interface GeminiCallResult {
  success: boolean;            // Whether the call succeeded
  text?: string;               // Response text (if successful)
  error?: string;              // Error message (if failed)
  rateLimitInfo?: RateLimitInfo; // Rate limit details (if 429 error)
  retryCount?: number;         // Number of retries attempted
  totalDuration?: number;      // Total time in milliseconds
  tierMismatch?: boolean;      // True if tier mismatch detected
}
```

**Rate Limit Info:**
```typescript
interface RateLimitInfo {
  quotaMetric?: string;        // e.g., "Requests Per Minute (RPM)"
  quotaLimit?: string;         // e.g., "2000 RPM (Paid Tier)"
  quotaLocation?: string;      // Service or consumer identifier
  retryAfter?: string;         // Seconds until retry allowed
  remainingQuota?: string;     // Remaining quota
  tierDetected?: 'Free' | 'Paid' | 'Unknown';
  violationDetails?: string[]; // Detailed violation messages
}
```

##### `getStats()`

Get API call statistics.

```typescript
const stats = gemini.getStats();
console.log('Total calls:', stats.totalCalls);
console.log('Last call:', stats.lastCallTimestamp);
console.log('Time since last call:', stats.timeSinceLastCall, 'ms');
```

##### `resetStats()`

Reset API call statistics.

```typescript
gemini.resetStats();
```

### Singleton Helper

#### `getGeminiWrapper(): GeminiWrapper`

Get or create a singleton instance of the wrapper.

```typescript
import { getGeminiWrapper } from '@/lib/gemini-wrapper';

const gemini = getGeminiWrapper();
```

## Error Output Examples

### Vertex AI Success

```
[Gemini Wrapper] 🚀 Initialized with Vertex AI
[Gemini Wrapper] 📍 Project: gen-lang-client-0628770168
[Gemini Wrapper] 🌍 Location: us-central1
[Gemini Wrapper] 🤖 Model: gemini-2.0-flash
[Gemini Wrapper] 📞 API Call #1 (Vertex AI)
[Gemini Wrapper] ⏱️  Time since last call: 0ms
[Gemini Wrapper] ✅ Success in 2309ms (Vertex AI)
[Gemini Wrapper] 📊 Tier Validation: {
  tierDetected: 'Paid',
  remainingQuota: '1999',
  quotaLimit: '2000'
}
```

### Paid Tier Rate Limit (Rare)

```
================================================================================
[Gemini Wrapper] 🚨 API ERROR DETAILS
================================================================================
Retry Attempt: 0
Error Message: [Vertex AI Error]: Resource exhausted
Error Status: 429
Error Status Text: Too Many Requests

📊 RATE LIMIT INFORMATION:
  Tier Detected: Paid
  Quota Metric: Requests Per Minute (RPM)
  Quota Limit: 2,000 RPM (Paid Tier)
  Remaining Quota: 0
  Retry After: 30 seconds

💡 RECOMMENDATIONS:
  • You are on the PAID tier but still hitting limits
  • Consider batching requests or implementing request queuing
  • Issue: Too many requests per minute
  • Solution: Increase delay between calls or use parallel processing
================================================================================
```

## Integration with Existing Code

### Before (Generative Language API)

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_MODEL } from '@/lib/config/gemini';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

const result = await model.generateContent([
  prompt,
  { inlineData: { data: base64Data, mimeType: 'image/jpeg' } },
]);

const text = result.response.text();
```

### After (Vertex AI with Wrapper)

```typescript
import { getGeminiWrapper } from '@/lib/gemini-wrapper';

const gemini = getGeminiWrapper();

const result = await gemini.generateContent({
  prompt,
  imageData: base64Data,
  imageMimeType: 'image/jpeg',
  maxRetries: 2,
  retryDelayMs: 5000,
});

if (result.success) {
  const text = result.text;
  // Process text...
} else {
  console.error('API call failed:', result.error);
  if (result.rateLimitInfo) {
    // Handle rate limit...
  }
}
```

## Authentication

### Development (Local)
```bash
gcloud auth application-default login
gcloud config set project gen-lang-client-0628770168
```

### Production (Vercel/Cloud)
Set environment variable with service account JSON:
```env
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

See [VERTEX_AI_SETUP.md](VERTEX_AI_SETUP.md) for detailed instructions.

## Tier Detection Logic

The wrapper automatically detects your tier based on quota limits:

### Paid Tier Indicators (Vertex AI)
- 2,000 RPM limit
- 10,000 RPD limit
- 4,000,000 TPM limit

### Free Tier Indicators (Should Not See)
- 15 RPM limit
- 1,500 RPD limit
- 1,000,000 TPM limit

If Free tier is detected with Vertex AI, a tier mismatch warning is logged.

## Best Practices

### 1. Always Use Retries for Production
```typescript
const result = await gemini.generateContent({
  prompt: '...',
  maxRetries: 3,
  retryDelayMs: 5000,
});
```

### 2. Monitor API Call Frequency
```typescript
const stats = gemini.getStats();
if (stats.timeSinceLastCall < 1000) {
  console.warn('⚠️  Calls very frequent! Consider adding delay.');
}
```

### 3. Handle Rate Limit Errors Gracefully
```typescript
if (!result.success && result.rateLimitInfo) {
  const retryAfter = parseInt(result.rateLimitInfo.retryAfter || '60');
  
  return NextResponse.json(
    {
      error: 'Rate limit exceeded',
      retryAfter,
      tier: result.rateLimitInfo.tierDetected,
    },
    { status: 429 }
  );
}
```

### 4. Check for Tier Mismatch
```typescript
if (result.tierMismatch) {
  console.error('🚨 TIER MISMATCH: Check project billing and API configuration');
  // Alert admin, log to monitoring service, etc.
}
```

## Troubleshooting

### Issue: Authentication Error

**Error**: "Could not load the default credentials"

**Solution**:
```bash
gcloud auth application-default login
```

### Issue: Permission Denied

**Error**: "Permission denied on resource project"

**Solution**: Grant `aiplatform.user` role:
```bash
gcloud projects add-iam-policy-binding gen-lang-client-0628770168 \
  --member="user:your-email@gmail.com" \
  --role="roles/aiplatform.user"
```

### Issue: API Not Enabled

**Error**: "Vertex AI API has not been used"

**Solution**:
```bash
gcloud services enable aiplatform.googleapis.com --project=gen-lang-client-0628770168
```

### Issue: Still Getting 429 Errors

**Check**:
1. Verify logs show "Vertex AI" (not Generative Language API)
2. Confirm project ID is correct in `.env.local`
3. Check billing is enabled in Google Cloud Console
4. Verify quota increase was approved
5. Check if multiple processes are using same project

## Performance Considerations

### Memory Usage
- Singleton pattern ensures one instance per application
- Statistics tracking uses minimal memory
- No request caching (implement separately if needed)

### Latency
- Adds ~1-2ms overhead per call for tracking
- Retry logic adds delay only on failures
- No impact on successful first-attempt calls
- Vertex AI may have slightly different latency than Generative Language API

## Migration from Generative Language API

### What Changed
1. ✅ SDK: `@google/generative-ai` → `@google-cloud/vertexai`
2. ✅ Authentication: API Key → Google Cloud Auth
3. ✅ Quotas: Free Tier (15 RPM) → Paid Tier (2,000 RPM)
4. ✅ Configuration: Added project ID and location
5. ✅ Error handling: Enhanced for Vertex AI error format

### What Stayed the Same
1. ✅ Model: `gemini-2.0-flash`
2. ✅ Pricing: Same cost per token
3. ✅ Wrapper API: Same interface
4. ✅ Features: All error tracking and retry logic preserved

## Related Documentation

- [Vertex AI Setup Guide](VERTEX_AI_SETUP.md) - Authentication and configuration
- [Gemini API Usage Summary](GEMINI_API_USAGE_SUMMARY.md) - Usage patterns and quotas
- [Gemini Model Config](src/lib/config/gemini.ts) - Model configuration
- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs/generative-ai/start/quickstarts/quickstart-multimodal)

## Support

For issues or questions:
1. Check the detailed error logs
2. Review quota limits in Google Cloud Console
3. Verify authentication is working
4. Check for multiple processes using same project
5. See [VERTEX_AI_SETUP.md](VERTEX_AI_SETUP.md) for troubleshooting

## Features

### 1. Detailed 429 Error Analysis
- Extracts `QuotaFailure` objects from error details
- Identifies specific quota metrics (RPM, TPM, RPD)
- Detects quota limits and tier (Free vs Paid)
- Logs violation details with actionable recommendations

### 2. Response Header Tracking
- `x-goog-ratelimit-remaining`: Remaining quota
- `x-goog-retry-after`: Seconds until retry allowed
- `retry-after`: Standard retry header
- Additional rate limit headers

### 3. Automatic Retry Logic
- Configurable retry attempts
- Exponential backoff strategy
- Respects `retry-after` headers
- Tracks retry count and total duration

### 4. API Call Monitoring
- Tracks total API calls
- Measures time between calls
- Provides statistics for debugging

## Installation

The wrapper is located at `src/lib/gemini-wrapper.ts` and can be imported:

```typescript
import { getGeminiWrapper } from '@/lib/gemini-wrapper';
```

## Basic Usage

### Simple Text Generation

```typescript
import { getGeminiWrapper } from '@/lib/gemini-wrapper';

const gemini = getGeminiWrapper();

const result = await gemini.generateContent({
  prompt: 'What is the capital of France?',
});

if (result.success) {
  console.log('Response:', result.text);
} else {
  console.error('Error:', result.error);
  if (result.rateLimitInfo) {
    console.log('Rate Limit Info:', result.rateLimitInfo);
  }
}
```

### Image Analysis with Retry

```typescript
const result = await gemini.generateContent({
  prompt: 'Describe this image',
  imageData: base64ImageData,
  imageMimeType: 'image/jpeg',
  maxRetries: 3,
  retryDelayMs: 5000,
});
```

### Complete Example with Error Handling

```typescript
const gemini = getGeminiWrapper();

const result = await gemini.generateContent({
  prompt: 'Extract barcode from this image',
  imageData: base64Data,
  imageMimeType: 'image/jpeg',
  maxRetries: 2,
  retryDelayMs: 5000,
});

if (result.success) {
  console.log('✅ Success!');
  console.log('Text:', result.text);
  console.log('Retries:', result.retryCount);
  console.log('Duration:', result.totalDuration, 'ms');
} else {
  console.error('❌ Failed after', result.retryCount, 'retries');
  console.error('Error:', result.error);
  
  if (result.rateLimitInfo) {
    const info = result.rateLimitInfo;
    console.log('Tier:', info.tierDetected);
    console.log('Quota Metric:', info.quotaMetric);
    console.log('Quota Limit:', info.quotaLimit);
    console.log('Remaining:', info.remainingQuota);
    console.log('Retry After:', info.retryAfter, 'seconds');
  }
}
```

## API Reference

### `GeminiWrapper` Class

#### Constructor
```typescript
new GeminiWrapper(apiKey: string, modelName?: string)
```

#### Methods

##### `generateContent(options: GeminiCallOptions): Promise<GeminiCallResult>`

Make a Gemini API call with enhanced error tracking.

**Options:**
```typescript
interface GeminiCallOptions {
  prompt: string;              // Required: The text prompt
  imageData?: string;          // Optional: Base64 image data (without data URL prefix)
  imageMimeType?: string;      // Optional: Image MIME type (default: 'image/jpeg')
  temperature?: number;        // Optional: Temperature setting (not yet implemented)
  maxRetries?: number;         // Optional: Max retry attempts (default: 0)
  retryDelayMs?: number;       // Optional: Initial retry delay (default: 5000ms)
}
```

**Result:**
```typescript
interface GeminiCallResult {
  success: boolean;            // Whether the call succeeded
  text?: string;               // Response text (if successful)
  error?: string;              // Error message (if failed)
  rateLimitInfo?: RateLimitInfo; // Rate limit details (if 429 error)
  retryCount?: number;         // Number of retries attempted
  totalDuration?: number;      // Total time in milliseconds
}
```

**Rate Limit Info:**
```typescript
interface RateLimitInfo {
  quotaMetric?: string;        // e.g., "Requests Per Minute (RPM)"
  quotaLimit?: string;         // e.g., "15 RPM (Free Tier)"
  quotaLocation?: string;      // Service or consumer identifier
  retryAfter?: string;         // Seconds until retry allowed
  remainingQuota?: string;     // Remaining quota
  tierDetected?: 'Free' | 'Paid' | 'Unknown';
  violationDetails?: string[]; // Detailed violation messages
}
```

##### `getStats()`

Get API call statistics.

```typescript
const stats = gemini.getStats();
console.log('Total calls:', stats.totalCalls);
console.log('Last call:', stats.lastCallTimestamp);
console.log('Time since last call:', stats.timeSinceLastCall, 'ms');
```

##### `resetStats()`

Reset API call statistics.

```typescript
gemini.resetStats();
```

### Singleton Helper

#### `getGeminiWrapper(): GeminiWrapper`

Get or create a singleton instance of the wrapper.

```typescript
import { getGeminiWrapper } from '@/lib/gemini-wrapper';

const gemini = getGeminiWrapper();
```

## Error Output Examples

### Free Tier RPM Limit

```
================================================================================
[Gemini Wrapper] 🚨 API ERROR DETAILS
================================================================================
Retry Attempt: 0
Error Message: [GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent: [429 Too Many Requests] Resource exhausted
Error Status: 429

📊 RATE LIMIT INFORMATION:
  Tier Detected: Free
  Quota Metric: Requests Per Minute (RPM)
  Quota Limit: 15 RPM (Free Tier)
  Remaining Quota: 0
  Retry After: 60 seconds

⚠️  QUOTA VIOLATIONS:
  1. aiplatform.googleapis.com/generate_content_requests_per_minute: Quota exceeded for quota metric 'GenerateContent requests per minute' and limit 'GenerateContent requests per minute per project' of service 'aiplatform.googleapis.com'

🔍 RAW ERROR DETAILS:
[
  {
    "@type": "type.googleapis.com/google.rpc.QuotaFailure",
    "violations": [
      {
        "subject": "aiplatform.googleapis.com/generate_content_requests_per_minute",
        "description": "Quota exceeded for quota metric 'GenerateContent requests per minute' and limit 'GenerateContent requests per minute per project' of service 'aiplatform.googleapis.com' for consumer 'project_number:123456789'"
      }
    ]
  }
]

📋 RESPONSE HEADERS:
  x-goog-ratelimit-remaining: 0
  x-goog-retry-after: 60
  retry-after: 60

💡 RECOMMENDATIONS:
  • You are on the FREE tier (15 RPM, 1,500 RPD)
  • Consider upgrading to Paid tier (360 RPM, 10,000 RPD)
  • Increase delays between API calls to 6-8 seconds
  • Issue: Too many requests per minute
  • Solution: Increase delay between calls
================================================================================
```

### Paid Tier TPM Limit

```
================================================================================
[Gemini Wrapper] 🚨 API ERROR DETAILS
================================================================================
Retry Attempt: 1
Error Message: [GoogleGenerativeAI Error]: Token quota exceeded
Error Status: 429

📊 RATE LIMIT INFORMATION:
  Tier Detected: Paid
  Quota Metric: Tokens Per Minute (TPM)
  Quota Limit: 4,000,000 TPM (Paid Tier)
  Remaining Quota: 0
  Retry After: 30 seconds

💡 RECOMMENDATIONS:
  • You are on the PAID tier but still hitting limits
  • Consider batching requests or implementing request queuing
  • Issue: Too many tokens per minute
  • Solution: Reduce prompt size or image resolution
================================================================================
```

## Integration with Existing Code

### Before (Direct API Call)

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_MODEL } from '@/lib/config/gemini';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

const result = await model.generateContent([
  prompt,
  { inlineData: { data: base64Data, mimeType: 'image/jpeg' } },
]);

const text = result.response.text();
```

### After (Using Wrapper)

```typescript
import { getGeminiWrapper } from '@/lib/gemini-wrapper';

const gemini = getGeminiWrapper();

const result = await gemini.generateContent({
  prompt,
  imageData: base64Data,
  imageMimeType: 'image/jpeg',
  maxRetries: 2,
  retryDelayMs: 5000,
});

if (result.success) {
  const text = result.text;
  // Process text...
} else {
  console.error('API call failed:', result.error);
  if (result.rateLimitInfo) {
    // Handle rate limit...
  }
}
```

## Migrating Test Endpoints

### Step 1: Update Imports

```typescript
// Remove:
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_MODEL } from '@/lib/config/gemini';

// Add:
import { getGeminiWrapper } from '@/lib/gemini-wrapper';
```

### Step 2: Replace API Calls

```typescript
// Before:
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

try {
  const result = await model.generateContent([...]);
  const text = result.response.text();
  // Process...
} catch (error) {
  console.error('Error:', error);
}

// After:
const gemini = getGeminiWrapper();

const result = await gemini.generateContent({
  prompt: '...',
  imageData: base64Data,
  maxRetries: 2,
  retryDelayMs: 5000,
});

if (result.success) {
  const text = result.text;
  // Process...
} else {
  console.error('Error:', result.error);
  if (result.rateLimitInfo) {
    // Log detailed rate limit info
  }
}
```

## Tier Detection Logic

The wrapper automatically detects your tier based on quota limits:

### Free Tier Indicators
- 15 RPM limit
- 1,500 RPD limit
- 1,000,000 TPM limit

### Paid Tier Indicators
- 360 RPM limit
- 10,000 RPD limit
- 4,000,000 TPM limit

## Best Practices

### 1. Always Use Retries for Production
```typescript
const result = await gemini.generateContent({
  prompt: '...',
  maxRetries: 3,
  retryDelayMs: 5000,
});
```

### 2. Monitor API Call Frequency
```typescript
const stats = gemini.getStats();
if (stats.timeSinceLastCall < 4000) {
  console.warn('⚠️  Calls too frequent! Consider adding delay.');
}
```

### 3. Handle Rate Limit Errors Gracefully
```typescript
if (!result.success && result.rateLimitInfo) {
  const retryAfter = parseInt(result.rateLimitInfo.retryAfter || '60');
  
  return NextResponse.json(
    {
      error: 'Rate limit exceeded',
      retryAfter,
      tier: result.rateLimitInfo.tierDetected,
    },
    { status: 429 }
  );
}
```

### 4. Log Quota Information for Analysis
```typescript
if (result.rateLimitInfo) {
  // Save to database or logging service
  await logRateLimitEvent({
    timestamp: new Date(),
    tier: result.rateLimitInfo.tierDetected,
    metric: result.rateLimitInfo.quotaMetric,
    limit: result.rateLimitInfo.quotaLimit,
    endpoint: '/api/test-barcode-extraction',
  });
}
```

## Troubleshooting

### Issue: Still Getting 429 Errors

**Check:**
1. Are you using the wrapper with retries enabled?
2. What tier is being detected? (Check logs)
3. What quota metric is failing? (RPM, TPM, or RPD)
4. Are multiple processes using the same API key?

**Solutions:**
- Free tier RPM: Increase delays to 6-8 seconds
- Free tier RPD: Upgrade to paid tier or reduce daily usage
- Paid tier limits: Implement request queuing or batching

### Issue: Tier Detection Shows "Unknown"

**Possible Causes:**
1. Error format changed (Google updated API)
2. Error details not available in response
3. Non-standard quota limits

**Solution:**
Check raw error details in logs and update tier detection logic in `extractRateLimitInfo()`.

### Issue: Retries Not Working

**Check:**
1. Is `maxRetries` set to > 0?
2. Are you checking `result.success` before processing?
3. Is the error actually a 429 (check logs)?

## Performance Considerations

### Memory Usage
- Singleton pattern ensures one instance per application
- Statistics tracking uses minimal memory
- No request caching (implement separately if needed)

### Latency
- Adds ~1-2ms overhead per call for tracking
- Retry logic adds delay only on failures
- No impact on successful first-attempt calls

## Future Enhancements

Potential improvements:
1. Request queuing to prevent 429s proactively
2. Token counting for TPM limit prediction
3. Automatic rate limiting based on tier detection
4. Persistent statistics across server restarts
5. Integration with monitoring services (Datadog, New Relic)

## Related Documentation

- [Gemini API Usage Summary](GEMINI_API_USAGE_SUMMARY.md)
- [Gemini Model Config](src/lib/config/gemini.ts)
- [Test Barcode V2 Example](src/app/api/test-barcode-extraction-v2/route.ts)

## Support

For issues or questions:
1. Check the detailed error logs
2. Review quota limits in Google Cloud Console
3. Verify API key has correct permissions
4. Check for multiple processes using same key

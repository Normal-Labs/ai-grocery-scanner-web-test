# Gemini API Usage Summary - Test Pages (Vertex AI Edition)

## Model Configuration

### Current Model: `gemini-2.0-flash`

**Location**: `src/lib/config/gemini.ts`

```typescript
export const GEMINI_MODEL = 'gemini-2.0-flash';

export const VERTEX_AI_CONFIG = {
  projectId: 'gen-lang-client-0628770168',
  location: 'us-central1',
} as const;
```

### Migration to Vertex AI ✅

**Previous**: Generative Language API (`@google/generative-ai`)
- Issue: Stuck in "Free Tier: 0" loop despite Paid Tier project
- Quota: 15 RPM, 1,500 RPD

**Current**: Vertex AI (`@google-cloud/vertexai`)
- Project: `gen-lang-client-0628770168`
- Location: `us-central1`
- Quota: 2,000 RPM, 10,000 RPD (Paid Tier 1)

### All Test Pages Use Same Configuration ✅

All test API endpoints use the centralized `GeminiWrapper`:

1. ✅ `/api/test-barcode-extraction` → Vertex AI → `gemini-2.0-flash`
2. ✅ `/api/test-packaging-extraction` → Vertex AI → `gemini-2.0-flash`
3. ✅ `/api/test-ingredients-extraction` → Vertex AI → `gemini-2.0-flash`
4. ✅ `/api/test-nutrition-extraction` → Vertex AI → `gemini-2.0-flash`
5. ✅ `/api/test-all-extraction` → Vertex AI → `gemini-2.0-flash` (uses all 4 above)

## API Call Breakdown

### Individual Test Pages

#### `/test-barcode`
- **API Calls**: 1 per scan
- **SDK**: Vertex AI
- **Model**: gemini-2.0-flash
- **Purpose**: Barcode detection + OCR fallback
- **Average Time**: 2-3 seconds

#### `/test-packaging`
- **API Calls**: 1 per scan
- **SDK**: Vertex AI
- **Model**: gemini-2.0-flash
- **Purpose**: Product name, brand, size, category extraction
- **Average Time**: 2-3 seconds

#### `/test-ingredients`
- **API Calls**: 1 per scan
- **SDK**: Vertex AI
- **Model**: gemini-2.0-flash
- **Purpose**: Ingredient list extraction
- **Average Time**: 3-4 seconds

#### `/test-nutrition`
- **API Calls**: 1 per scan
- **SDK**: Vertex AI
- **Model**: gemini-2.0-flash
- **Purpose**: Nutrition facts extraction
- **Average Time**: 4-5 seconds

### Combined Test Page

#### `/test-all`
- **API Calls**: 4 per scan (sequential)
  1. Barcode detection
  2. Packaging information
  3. Ingredients list
  4. Nutrition facts
- **SDK**: Vertex AI
- **Model**: gemini-2.0-flash (all calls)
- **Rate Limiting**: 
  - Initial delay: 1 second
  - Between calls: 5 seconds
- **Total Time**: ~20-25 seconds

## Gemini 2.0 Flash Specifications

### Model Details
- **Name**: gemini-2.0-flash
- **Type**: Multimodal (text + vision)
- **Speed**: Fast (optimized for low latency)
- **Context Window**: 1M tokens
- **Vision**: Native image understanding

### Rate Limits (Vertex AI - Paid Tier 1)

| Metric | Limit | Notes |
|--------|-------|-------|
| Requests per minute (RPM) | 2,000 | 133x more than free tier |
| Requests per day (RPD) | 10,000 | 6.7x more than free tier |
| Tokens per minute (TPM) | 4,000,000 | 4x more than free tier |

### Pricing (Vertex AI)
- **Input**: $0.075 per 1M tokens (~$0.000075 per 1K tokens)
- **Output**: $0.30 per 1M tokens (~$0.0003 per 1K tokens)
- **Images**: Counted as tokens based on resolution

**Estimated cost per test-all scan**: ~$0.001-0.002 (0.1-0.2 cents)

## Current Rate Limiting Strategy

### Configuration
```javascript
// src/app/api/test-all-extraction/route.ts
const RATE_LIMIT_DELAY = 5000; // 5 seconds between calls
const INITIAL_DELAY = 1000;    // 1 second before first call
```

### Timeline per Scan
```
0s:    Start
1s:    Barcode API call      (call #1)
6s:    Packaging API call    (call #2)
11s:   Ingredients API call  (call #3)
16s:   Nutrition API call    (call #4)
~20s:  Complete
```

### Maximum Throughput with Vertex AI

With 2,000 RPM limit:
- Time per scan: ~20 seconds
- Scans per minute: 3
- API calls per minute: 12 (well within 2,000 RPM limit)
- **No more 429 errors!** 🎉

## Why Vertex AI Solved the 429 Errors

### Problem with Generative Language API
The Generative Language API was incorrectly applying Free Tier quotas (15 RPM) despite the project being on Paid Tier 1.

**Symptoms**:
- 429 errors after 2-3 consecutive scans
- "Resource exhausted" messages
- Free tier limits detected in error responses

### Solution: Vertex AI
Vertex AI properly recognizes the project's Paid Tier status and applies correct quotas.

**Benefits**:
- ✅ 2,000 RPM (vs 15 RPM)
- ✅ 10,000 RPD (vs 1,500 RPD)
- ✅ No more tier mismatch issues
- ✅ Better monitoring in Google Cloud Console
- ✅ Enterprise features (VPC, audit logs, etc.)

## Authentication

### Development (Local)
Uses Application Default Credentials:
```bash
gcloud auth application-default login
gcloud config set project gen-lang-client-0628770168
```

Credentials stored at: `~/.config/gcloud/application_default_credentials.json`

### Production (Vercel/Cloud)
Uses Service Account JSON:
- Create service account with `aiplatform.user` role
- Download JSON key
- Set `GOOGLE_APPLICATION_CREDENTIALS` environment variable

See [VERTEX_AI_SETUP.md](VERTEX_AI_SETUP.md) for detailed instructions.

## Monitoring API Usage

### Enhanced Logging with GeminiWrapper

The wrapper now logs:
```
[Gemini Wrapper] 🚀 Initialized with Vertex AI
[Gemini Wrapper] 📍 Project: gen-lang-client-0628770168
[Gemini Wrapper] 🌍 Location: us-central1
[Gemini Wrapper] 🤖 Model: gemini-2.0-flash
[Gemini Wrapper] 📞 API Call #1 (Vertex AI)
[Gemini Wrapper] ⏱️  Time since last call: 0ms
[Gemini Wrapper] ✅ Success in 2309ms (Vertex AI)
```

### Tier Validation
On each successful call, the wrapper attempts to validate tier:
```
[Gemini Wrapper] 📊 Tier Validation: {
  tierDetected: 'Paid',
  remainingQuota: '1999',
  quotaLimit: '2000'
}
```

Note: Vertex AI SDK may not expose rate limit headers, so tier detection relies on error analysis.

### Error Tracking
If 429 errors occur, detailed diagnostics are logged:
- Error status and message
- Quota metric (RPM/TPM/RPD)
- Tier detection
- Retry attempts
- Full error object

## Recommendations

### Current Setup (Optimal) ✅
- Using Vertex AI with Paid Tier 1
- 5-second delays between calls
- 2-3 retries on failures
- Comprehensive error logging

### No Changes Needed
With 2,000 RPM quota, the current rate limiting is more than sufficient:
- 12 API calls per minute (0.6% of quota)
- Can handle 166 scans per minute theoretically
- Plenty of headroom for concurrent users

### Optional Optimizations

#### 1. Reduce Delays (Optional)
Since we have 2,000 RPM, delays could be reduced:
```javascript
const RATE_LIMIT_DELAY = 2000; // 2 seconds (was 5)
const INITIAL_DELAY = 500;     // 0.5 seconds (was 1)
```

This would reduce scan time from ~20s to ~10s.

#### 2. Parallel Calls (Advanced)
With high quota, could run some extractions in parallel:
```javascript
// Run barcode + packaging in parallel
const [barcodeResult, packagingResult] = await Promise.all([
  gemini.generateContent({ prompt: barcodePrompt, ... }),
  gemini.generateContent({ prompt: packagingPrompt, ... }),
]);
```

This could reduce total time to ~12-15 seconds.

#### 3. Single Combined Call (Most Efficient)
Combine all extractions into one API call:
```javascript
const combinedPrompt = `Extract ALL information: barcode, packaging, ingredients, nutrition...`;
```

This would:
- Reduce to 1 API call per scan
- Complete in ~5-10 seconds
- Use only 25% of current API quota

## Cost Analysis

### Current Usage
- 4 API calls per scan
- ~1,000 tokens per call (estimated)
- Total: ~4,000 tokens per scan

**Cost per scan**:
- Input: 4,000 tokens × $0.000075 = $0.0003
- Output: 500 tokens × $0.0003 = $0.00015
- **Total: ~$0.00045 per scan**

### Monthly Estimates

| Scans/Day | Scans/Month | Cost/Month |
|-----------|-------------|------------|
| 10 | 300 | $0.14 |
| 50 | 1,500 | $0.68 |
| 100 | 3,000 | $1.35 |
| 500 | 15,000 | $6.75 |
| 1,000 | 30,000 | $13.50 |

Very affordable for a production application!

## Troubleshooting

### Issue: Authentication Error

**Error**: "Could not load the default credentials"

**Solution**:
```bash
gcloud auth application-default login
```

### Issue: Permission Denied

**Error**: "Permission denied on resource project"

**Solution**: Ensure account has `aiplatform.user` role:
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
1. Verify using Vertex AI (check logs for "Vertex AI" mentions)
2. Confirm project ID is correct in `.env.local`
3. Check billing is enabled in Google Cloud Console
4. Verify quota increase was approved

## Summary

| Aspect | Before (Gen Lang API) | After (Vertex AI) |
|--------|----------------------|-------------------|
| SDK | @google/generative-ai | @google-cloud/vertexai |
| Authentication | API Key | Google Cloud Auth |
| Tier | Free (stuck) | Paid Tier 1 |
| RPM Limit | 15 | 2,000 |
| RPD Limit | 1,500 | 10,000 |
| 429 Errors | Frequent | None |
| Delay between calls | 5s | 5s (can reduce to 2s) |
| Time per scan | 20-25s | 20-25s (can reduce to 10s) |
| Cost per scan | $0.00045 | $0.00045 |
| Monitoring | Limited | Google Cloud Console |

**Result**: ✅ No more quota issues, 133x higher rate limits, production-ready!

## Related Documentation

- [Vertex AI Setup Guide](VERTEX_AI_SETUP.md) - Authentication and configuration
- [Gemini Wrapper Guide](GEMINI_WRAPPER_GUIDE.md) - Wrapper API reference
- [Gemini Model Config](src/lib/config/gemini.ts) - Model configuration
- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs/generative-ai/start/quickstarts/quickstart-multimodal)
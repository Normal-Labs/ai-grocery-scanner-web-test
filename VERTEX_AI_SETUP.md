# Vertex AI Setup Guide

## Overview

We've switched from the Generative Language API to Vertex AI to resolve the "Free Tier: 0" quota issue. Vertex AI provides proper access to your Paid Tier quotas.

## Changes Made

### 1. SDK Migration
- **Old**: `@google/generative-ai` (Generative Language API)
- **New**: `@google-cloud/vertexai` (Vertex AI)

### 2. Configuration
- **Project ID**: `gen-lang-client-0628770168`
- **Location**: `us-central1`
- **Model**: `gemini-2.0-flash`

### 3. Authentication
Vertex AI uses Google Cloud authentication instead of API keys.

## Authentication Setup

### Option 1: Application Default Credentials (Development)

**For local development**, authenticate using gcloud CLI:

```bash
# Install gcloud CLI if not already installed
# https://cloud.google.com/sdk/docs/install

# Authenticate with your Google account
gcloud auth application-default login

# Set the project
gcloud config set project gen-lang-client-0628770168
```

This creates credentials at:
- **macOS/Linux**: `~/.config/gcloud/application_default_credentials.json`
- **Windows**: `%APPDATA%\gcloud\application_default_credentials.json`

### Option 2: Service Account (Production)

**For production deployment**, use a service account:

1. **Create Service Account** (if not exists):
   ```bash
   gcloud iam service-accounts create gemini-api-service \
     --display-name="Gemini API Service Account" \
     --project=gen-lang-client-0628770168
   ```

2. **Grant Permissions**:
   ```bash
   gcloud projects add-iam-policy-binding gen-lang-client-0628770168 \
     --member="serviceAccount:gemini-api-service@gen-lang-client-0628770168.iam.gserviceaccount.com" \
     --role="roles/aiplatform.user"
   ```

3. **Create and Download Key**:
   ```bash
   gcloud iam service-accounts keys create ~/gemini-service-account.json \
     --iam-account=gemini-api-service@gen-lang-client-0628770168.iam.gserviceaccount.com \
     --project=gen-lang-client-0628770168
   ```

4. **Set Environment Variable**:
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="$HOME/gemini-service-account.json"
   ```

   Or add to `.env.local`:
   ```
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/gemini-service-account.json
   ```

### Option 3: Vercel/Production Deployment

For Vercel or other cloud platforms:

1. **Get Service Account JSON** (from Option 2)

2. **Add to Vercel Environment Variables**:
   - Go to Vercel Dashboard → Project Settings → Environment Variables
   - Add `GOOGLE_APPLICATION_CREDENTIALS_JSON` with the entire JSON content
   - Or upload the JSON file and reference its path

3. **Alternative**: Use Vercel's Google Cloud integration

## Verification

After authentication setup, restart your server and check the logs:

```
[Gemini Wrapper] 🚀 Initialized with Vertex AI
[Gemini Wrapper] 📍 Project: gen-lang-client-0628770168
[Gemini Wrapper] 🌍 Location: us-central1
[Gemini Wrapper] 🤖 Model: gemini-2.0-flash
```

## Expected Quota Limits

With Vertex AI and your Paid Tier project, you should see:

- **RPM (Requests Per Minute)**: 2,000 (was 15 on free tier)
- **RPD (Requests Per Day)**: 10,000 (was 1,500 on free tier)
- **TPM (Tokens Per Minute)**: 4,000,000 (was 1,000,000 on free tier)

## Troubleshooting

### Error: "Could not load the default credentials"

**Solution**: Run authentication setup (Option 1 or 2 above)

```bash
gcloud auth application-default login
```

### Error: "Permission denied"

**Solution**: Ensure your account/service account has the `aiplatform.user` role:

```bash
gcloud projects add-iam-policy-binding gen-lang-client-0628770168 \
  --member="user:your-email@gmail.com" \
  --role="roles/aiplatform.user"
```

### Error: "Project not found"

**Solution**: Verify project ID is correct:

```bash
gcloud projects describe gen-lang-client-0628770168
```

### Still seeing Free Tier limits

**Check**:
1. Billing is enabled on the project
2. Vertex AI API is enabled
3. Quota increase request was approved
4. Using correct project ID in `.env.local`

**Enable Vertex AI API**:
```bash
gcloud services enable aiplatform.googleapis.com --project=gen-lang-client-0628770168
```

**Check Billing**:
```bash
gcloud billing projects describe gen-lang-client-0628770168
```

## Environment Variables

Update your `.env.local`:

```env
# Vertex AI Configuration
VERTEX_AI_PROJECT_ID=gen-lang-client-0628770168
VERTEX_AI_LOCATION=us-central1

# Authentication (choose one)
# Option 1: Use Application Default Credentials (no env var needed)
# Option 2: Service Account JSON file path
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
# Option 3: Service Account JSON content (for Vercel)
# GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}
```

## Testing

After setup, test with a scan:

```bash
npm run dev
```

Navigate to `/test-all` and capture an image. Check logs for:

```
[Gemini Wrapper] 📞 API Call #1 (Vertex AI)
[Gemini Wrapper] ✅ Success in 2109ms (Vertex AI)
[Gemini Wrapper] 📊 Tier Validation: {
  tierDetected: 'Paid',
  remainingQuota: '1999',
  quotaLimit: '2000'
}
```

## Benefits of Vertex AI

1. **Proper Tier Access**: No more "Free Tier: 0" loop
2. **Higher Quotas**: 2,000 RPM vs 15 RPM
3. **Better Monitoring**: Google Cloud Console integration
4. **Enterprise Features**: VPC, private endpoints, audit logs
5. **Consistent Billing**: Unified with other GCP services

## Cost Comparison

Both APIs use the same pricing for Gemini 2.0 Flash:

- **Input**: $0.075 per 1M tokens
- **Output**: $0.30 per 1M tokens
- **Images**: Counted as tokens based on resolution

**Estimated cost per test-all scan**: ~$0.001-0.002 (0.1-0.2 cents)

## Migration Checklist

- [x] Install `@google-cloud/vertexai` package
- [x] Update `GeminiWrapper` to use Vertex AI SDK
- [x] Update config with project ID and location
- [x] Add environment variables to `.env.local`
- [ ] Set up authentication (gcloud or service account)
- [ ] Enable Vertex AI API on project
- [ ] Verify billing is enabled
- [ ] Test with a scan
- [ ] Deploy to production with service account

## Support

If you continue to see quota issues:

1. Check Google Cloud Console → IAM & Admin → Quotas
2. Verify project billing status
3. Ensure Vertex AI API is enabled
4. Check service account permissions
5. Review audit logs for authentication errors

## Related Documentation

- [Vertex AI Node.js SDK](https://cloud.google.com/vertex-ai/docs/generative-ai/start/quickstarts/quickstart-multimodal)
- [Authentication Guide](https://cloud.google.com/docs/authentication/getting-started)
- [Quota Management](https://cloud.google.com/vertex-ai/docs/quotas)
- [Gemini Wrapper Guide](GEMINI_WRAPPER_GUIDE.md)

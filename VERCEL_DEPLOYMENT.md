# Vercel Deployment Guide

## Pre-Deployment Checklist

### ✅ Build Status
- Production build: **PASSING** ✓
- TypeScript compilation: **PASSING** ✓
- All routes compiled successfully: **28 routes** ✓

### Required Environment Variables

Configure these in your Vercel project settings (Settings → Environment Variables):

#### 1. Vertex AI Configuration (REQUIRED for extraction features)

**Authentication Method 1: Service Account (Recommended for Production)**
```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

**Authentication Method 2: Application Default Credentials**
- Vercel doesn't support gcloud CLI authentication
- Must use Service Account JSON key

**Vertex AI Project Configuration**
```bash
VERTEX_AI_PROJECT_ID=gen-lang-client-0628770168
VERTEX_AI_LOCATION=us-central1
```

#### 2. Supabase Configuration (REQUIRED)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

#### 3. MongoDB Configuration (REQUIRED for caching)
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
```

#### 4. Optional Configuration
```bash
# Dimension Analysis
DIMENSION_CACHE_TTL_DAYS=30
DIMENSION_ANALYSIS_TIMEOUT_MS=10000

# Development Tier Override
DEV_USER_TIER=premium

# Application URL
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app

# Legacy API Keys (if using old endpoints)
GEMINI_API_KEY=your_api_key
BARCODE_LOOKUP_API_KEY=your_barcode_lookup_key
TAVILY_API_KEY=your_tavily_key
```

## Vertex AI Service Account Setup

### Step 1: Create Service Account

```bash
# Set project
gcloud config set project gen-lang-client-0628770168

# Create service account
gcloud iam service-accounts create vercel-deployment \
  --display-name="Vercel Deployment Service Account"

# Grant Vertex AI User role
gcloud projects add-iam-policy-binding gen-lang-client-0628770168 \
  --member="serviceAccount:vercel-deployment@gen-lang-client-0628770168.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

# Create and download key
gcloud iam service-accounts keys create vercel-key.json \
  --iam-account=vercel-deployment@gen-lang-client-0628770168.iam.gserviceaccount.com
```

### Step 2: Add to Vercel

**Option A: Environment Variable (Recommended)**
1. Open `vercel-key.json`
2. Copy the entire JSON content
3. In Vercel Dashboard → Settings → Environment Variables
4. Add variable: `GOOGLE_APPLICATION_CREDENTIALS_JSON`
5. Paste the JSON content as the value
6. Select all environments (Production, Preview, Development)

**Option B: File Upload (Alternative)**
1. In your project, create a secure location for the key
2. Add to `.gitignore`: `service-account-key.json`
3. Upload via Vercel CLI or add as secret file
4. Set `GOOGLE_APPLICATION_CREDENTIALS=/var/task/service-account-key.json`

### Step 3: Update Code to Handle JSON Credentials

If using Option A (JSON in environment variable), add this to your code:

```typescript
// src/lib/gemini-wrapper.ts or wherever you initialize Vertex AI
import { VertexAI } from '@google-cloud/vertexai';

// Check if credentials are provided as JSON string
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  
  // Vertex AI will use these credentials
  process.env.GOOGLE_APPLICATION_CREDENTIALS = JSON.stringify(credentials);
}

const vertexAI = new VertexAI({
  project: process.env.VERTEX_AI_PROJECT_ID || 'gen-lang-client-0628770168',
  location: process.env.VERTEX_AI_LOCATION || 'us-central1',
});
```

## Deployment Steps

### 1. Connect Repository to Vercel

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Login to Vercel
vercel login

# Link project (run in project root)
vercel link
```

### 2. Configure Environment Variables

```bash
# Add environment variables via CLI
vercel env add VERTEX_AI_PROJECT_ID
vercel env add VERTEX_AI_LOCATION
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add MONGODB_URI
vercel env add GOOGLE_APPLICATION_CREDENTIALS_JSON

# Or configure via Vercel Dashboard:
# https://vercel.com/your-team/ai-grocery-scanner/settings/environment-variables
```

### 3. Deploy

```bash
# Deploy to production
vercel --prod

# Or push to main branch (auto-deploy if connected to Git)
git push origin main
```

## Vercel Configuration

### No vercel.json Required

The project uses Next.js 16 with default Vercel settings. No custom configuration needed.

### Default Vercel Settings

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

### Optional: Custom vercel.json (if needed)

Create `vercel.json` only if you need custom settings:

```json
{
  "buildCommand": "npm run build",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "VERTEX_AI_PROJECT_ID": "gen-lang-client-0628770168",
    "VERTEX_AI_LOCATION": "us-central1"
  },
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 60
    }
  }
}
```

**When to use vercel.json:**
- Custom function timeouts (default is 10s for Hobby, 60s for Pro)
- Specific region deployment
- Custom headers or redirects
- Build command overrides

## Post-Deployment Verification

### 1. Check Build Logs

```bash
vercel logs
```

### 2. Test Endpoints

```bash
# Test health
curl https://your-domain.vercel.app/

# Test barcode extraction
curl -X POST https://your-domain.vercel.app/api/test-barcode-extraction \
  -H "Content-Type: application/json" \
  -d '{"image": "base64_image_data"}'

# Test combined extraction
curl -X POST https://your-domain.vercel.app/api/test-all-extraction \
  -H "Content-Type: application/json" \
  -d '{"image": "base64_image_data"}'
```

### 3. Monitor Vertex AI Usage

Check Google Cloud Console:
- https://console.cloud.google.com/vertex-ai/generative/language/locations/us-central1/publishers/google/model-garden/gemini-2.0-flash

Monitor:
- Request count
- Error rate
- Quota usage
- Cost

## Troubleshooting

### Issue: "Could not load default credentials"

**Cause**: Service account credentials not configured

**Solution**:
1. Verify `GOOGLE_APPLICATION_CREDENTIALS_JSON` is set in Vercel
2. Check JSON is valid (use JSON validator)
3. Ensure service account has `aiplatform.user` role
4. Redeploy after adding credentials

### Issue: "Permission denied on resource project"

**Cause**: Service account lacks permissions

**Solution**:
```bash
gcloud projects add-iam-policy-binding gen-lang-client-0628770168 \
  --member="serviceAccount:vercel-deployment@gen-lang-client-0628770168.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"
```

### Issue: "Vertex AI API has not been used"

**Cause**: API not enabled on project

**Solution**:
```bash
gcloud services enable aiplatform.googleapis.com --project=gen-lang-client-0628770168
```

### Issue: Build fails with TypeScript errors

**Cause**: Type errors in production build

**Solution**:
- Run `npm run build` locally first
- Fix all TypeScript errors
- Commit and push fixes

### Issue: Function timeout

**Cause**: API calls taking too long (>10s on Hobby plan)

**Solution**:
1. Upgrade to Vercel Pro (60s timeout)
2. Or add to `vercel.json`:
```json
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 60
    }
  }
}
```

### Issue: Environment variables not loading

**Cause**: Variables not set for correct environment

**Solution**:
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Ensure variables are checked for:
   - ✓ Production
   - ✓ Preview
   - ✓ Development
3. Redeploy

## Performance Optimization

### 1. Edge Functions (Optional)

For faster response times, consider using Edge Runtime for simple endpoints:

```typescript
// app/api/health/route.ts
export const runtime = 'edge';

export async function GET() {
  return Response.json({ status: 'ok' });
}
```

**Note**: Vertex AI SDK may not work in Edge Runtime. Use Node.js runtime for AI endpoints.

### 2. Caching

Enable caching for static responses:

```typescript
export async function GET() {
  return Response.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
```

### 3. Image Optimization

Use Next.js Image component for optimized images:

```typescript
import Image from 'next/image';

<Image src="/logo.png" width={200} height={200} alt="Logo" />
```

## Cost Monitoring

### Vercel Costs
- **Hobby Plan**: Free (100GB bandwidth, 100 hours compute)
- **Pro Plan**: $20/month (1TB bandwidth, 1000 hours compute)

### Vertex AI Costs
- **Input**: $0.075 per 1M tokens
- **Output**: $0.30 per 1M tokens
- **Estimated**: ~$0.00032 per scan (combined approach)

### Monthly Estimates

| Scans/Month | Vertex AI Cost | Vercel Cost | Total |
|-------------|----------------|-------------|-------|
| 1,000 | $0.32 | Free | $0.32 |
| 10,000 | $3.20 | Free | $3.20 |
| 100,000 | $32.00 | $20 | $52.00 |

## Security Best Practices

### 1. Environment Variables
- ✓ Never commit `.env.local` to Git
- ✓ Use Vercel's encrypted environment variables
- ✓ Rotate service account keys regularly
- ✓ Use different keys for dev/staging/prod

### 2. API Security
- ✓ Implement rate limiting
- ✓ Add authentication for sensitive endpoints
- ✓ Validate all input data
- ✓ Use CORS headers appropriately

### 3. Service Account
- ✓ Use least privilege principle
- ✓ Only grant `aiplatform.user` role
- ✓ Don't grant `owner` or `editor` roles
- ✓ Monitor service account usage

## Monitoring & Alerts

### 1. Vercel Analytics
Enable in Dashboard → Analytics:
- Page views
- API response times
- Error rates
- Geographic distribution

### 2. Google Cloud Monitoring
Set up alerts for:
- Quota usage (>80% of limit)
- Error rate (>5%)
- High latency (>5s)
- Cost threshold ($50/month)

### 3. Supabase Monitoring
Monitor:
- Database connections
- Query performance
- Storage usage
- API request count

## Rollback Strategy

### Quick Rollback

```bash
# List deployments
vercel ls

# Rollback to previous deployment
vercel rollback [deployment-url]
```

### Git-based Rollback

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or rollback to specific commit
git reset --hard [commit-hash]
git push --force origin main
```

## Related Documentation

- [Vertex AI Setup Guide](VERTEX_AI_SETUP.md)
- [Gemini API Usage Summary](GEMINI_API_USAGE_SUMMARY.md)
- [Extraction Prompts Guide](EXTRACTION_PROMPTS_GUIDE.md)
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

## Support

For deployment issues:
1. Check Vercel build logs
2. Review Google Cloud Console for API errors
3. Test locally with production build: `npm run build && npm start`
4. Check environment variables are set correctly
5. Verify service account permissions

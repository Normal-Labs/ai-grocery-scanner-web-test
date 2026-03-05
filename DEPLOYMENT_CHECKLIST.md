# Deployment Checklist

Quick reference for deploying to Vercel.

## ✅ Pre-Deployment Status

- [x] Production build passes
- [x] TypeScript compilation successful
- [x] All 28 routes compiled
- [x] No build errors
- [x] Combined prompt functionality working
- [x] Centralized prompt management implemented

## 🔧 Required Configuration

### 1. Vertex AI Service Account

**Create Service Account:**
```bash
gcloud iam service-accounts create vercel-deployment \
  --display-name="Vercel Deployment Service Account" \
  --project=gen-lang-client-0628770168

gcloud projects add-iam-policy-binding gen-lang-client-0628770168 \
  --member="serviceAccount:vercel-deployment@gen-lang-client-0628770168.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

gcloud iam service-accounts keys create vercel-key.json \
  --iam-account=vercel-deployment@gen-lang-client-0628770168.iam.gserviceaccount.com
```

### 2. Vercel Environment Variables

**Required:**
```bash
VERTEX_AI_PROJECT_ID=gen-lang-client-0628770168
VERTEX_AI_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS_JSON=<paste JSON from vercel-key.json>
NEXT_PUBLIC_SUPABASE_URL=<your_supabase_url>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your_key>
SUPABASE_SERVICE_ROLE_KEY=<your_service_key>
MONGODB_URI=<your_mongodb_uri>
```

**Optional:**
```bash
DIMENSION_CACHE_TTL_DAYS=30
DIMENSION_ANALYSIS_TIMEOUT_MS=10000
DEV_USER_TIER=premium
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

### 3. Deploy

```bash
# Via CLI
vercel --prod

# Or via Git
git push origin main
```

## 🧪 Post-Deployment Testing

```bash
# Test homepage
curl https://your-domain.vercel.app/

# Test barcode extraction
curl -X POST https://your-domain.vercel.app/api/test-barcode-extraction \
  -H "Content-Type: application/json" \
  -d '{"image": "base64_image_data"}'

# Test combined extraction (1 API call)
curl -X POST https://your-domain.vercel.app/api/test-all-extraction \
  -H "Content-Type: application/json" \
  -d '{"image": "base64_image_data"}'
```

## 📊 Expected Performance

| Metric | Value |
|--------|-------|
| Build time | ~2-3 minutes |
| API response time | 3-5 seconds (combined) |
| Scans per minute | 12-20 |
| Cost per scan | ~$0.00032 |
| Quota usage | <1% of 2,000 RPM |

## 🚨 Common Issues

### "Could not load default credentials"
→ Add `GOOGLE_APPLICATION_CREDENTIALS_JSON` to Vercel environment variables

### "Permission denied on resource project"
→ Grant `aiplatform.user` role to service account

### "Vertex AI API has not been used"
→ Enable API: `gcloud services enable aiplatform.googleapis.com`

### Build fails with TypeScript errors
→ Run `npm run build` locally first and fix errors

### Function timeout (>10s)
→ Upgrade to Vercel Pro or add timeout config to vercel.json

## 📚 Documentation

- [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) - Complete deployment guide
- [VERTEX_AI_SETUP.md](VERTEX_AI_SETUP.md) - Vertex AI authentication
- [GEMINI_API_USAGE_SUMMARY.md](GEMINI_API_USAGE_SUMMARY.md) - API usage and costs
- [EXTRACTION_PROMPTS_GUIDE.md](EXTRACTION_PROMPTS_GUIDE.md) - Prompt management

## 🎯 Quick Deploy Commands

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Link project
vercel link

# 4. Add environment variables (interactive)
vercel env add VERTEX_AI_PROJECT_ID
vercel env add VERTEX_AI_LOCATION
vercel env add GOOGLE_APPLICATION_CREDENTIALS_JSON
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add MONGODB_URI

# 5. Deploy
vercel --prod
```

## ✨ New Features in This Deployment

- ✅ Combined prompt extraction (1 API call instead of 4)
- ✅ 75% faster processing (3-5s vs 10-15s)
- ✅ 29% lower cost per scan
- ✅ Centralized prompt management
- ✅ Vertex AI integration (2,000 RPM quota)
- ✅ No more 429 errors
- ✅ Production-ready build

## 🔐 Security Notes

- Service account key is sensitive - never commit to Git
- Use Vercel's encrypted environment variables
- Rotate keys regularly
- Monitor usage in Google Cloud Console
- Set up billing alerts

## 📈 Monitoring

**Vercel Dashboard:**
- Analytics → View traffic and performance
- Logs → Check for errors
- Deployments → View deployment history

**Google Cloud Console:**
- Vertex AI → Monitor API usage
- Billing → Track costs
- IAM → Manage service accounts

**Supabase Dashboard:**
- Database → Monitor queries
- API → Check request count
- Storage → Track usage

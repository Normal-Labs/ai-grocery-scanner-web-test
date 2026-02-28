# Vercel Deployment Guide

This guide will help you deploy the AI Grocery Scanner to Vercel with all required environment variables.

## Required Environment Variables

You need to configure these environment variables in your Vercel project settings:

### 1. Supabase Configuration (Required)

Get these from your Supabase project dashboard at https://app.supabase.com/project/_/settings/api

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Important:** 
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are safe to expose (they start with `NEXT_PUBLIC_`)
- `SUPABASE_SERVICE_ROLE_KEY` is **secret** and should NEVER be exposed to the client

### 2. MongoDB Configuration (Required)

Get your connection string from MongoDB Atlas at https://cloud.mongodb.com/

```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
```

This is used for caching AI-generated insights to reduce API costs.

**Important MongoDB Atlas Setup:**
1. Create a database user with read/write permissions
2. **Whitelist Vercel IPs:** Go to Network Access → Add IP Address → "Allow Access from Anywhere" (0.0.0.0/0)
   - Vercel uses dynamic IPs, so you need to allow all IPs
   - Alternatively, you can whitelist specific Vercel IP ranges (see Vercel docs)
3. Make sure your connection string uses `mongodb+srv://` protocol
4. Include `retryWrites=true&w=majority` in the connection string

### 3. Google Gemini API (Required)

Get your API key from https://makersuite.google.com/app/apikey

```bash
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here
```

Or alternatively:
```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Optional API Keys

These are optional but enable additional features:

#### Barcode Lookup API (Tier 3 Discovery)
Get from https://www.barcodelookup.com/
```bash
BARCODE_LOOKUP_API_KEY=your_barcode_lookup_api_key_here
```

#### Tavily Search API (Premium Research Agent)
Get from https://tavily.com/
```bash
TAVILY_API_KEY=your_tavily_api_key_here
```

### 5. Optional Configuration

```bash
# Application URL (auto-detected by Vercel, but can be set manually)
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app

# Development tier override for testing
DEV_USER_TIER=premium

# Dimension analysis cache TTL (days)
DIMENSION_CACHE_TTL_DAYS=30

# Dimension analysis timeout (milliseconds)
DIMENSION_ANALYSIS_TIMEOUT_MS=10000
```

## How to Add Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Click on **Settings** tab
3. Click on **Environment Variables** in the sidebar
4. Add each variable:
   - Enter the **Key** (e.g., `SUPABASE_SERVICE_ROLE_KEY`)
   - Enter the **Value** (your actual key)
   - Select which environments to apply to (Production, Preview, Development)
5. Click **Save**

## Deployment Steps

1. **Connect your repository** to Vercel (if not already connected)

2. **Add all required environment variables** (see above)

3. **Deploy**:
   ```bash
   git push origin main
   ```
   
   Or manually trigger a deployment from the Vercel dashboard.

4. **Verify deployment**:
   - Check the deployment logs for any errors
   - Test the scanner functionality
   - Check that authentication works
   - Verify that scans are being cached

## Troubleshooting

### Error: "Missing SUPABASE_SERVICE_ROLE_KEY"

**Solution:** Add the `SUPABASE_SERVICE_ROLE_KEY` environment variable in Vercel settings. This is required for server-side operations that bypass Row Level Security (RLS).

### Error: "Missing MONGODB_URI"

**Solution:** Add the `MONGODB_URI` environment variable. The app needs MongoDB for caching AI insights.

### Error: "MongoDB connection failed: certificate validation failed"

**Solution:** This is common in serverless environments. Make sure:

1. **Use the correct protocol**: Your MongoDB URI MUST use `mongodb+srv://` (not `mongodb://`)
   ```
   ✅ mongodb+srv://user:pass@cluster.mongodb.net/db?retryWrites=true&w=majority
   ❌ mongodb://user:pass@cluster.mongodb.net/db
   ```

2. **Whitelist Vercel IPs in MongoDB Atlas**:
   - Go to MongoDB Atlas dashboard
   - Click "Network Access" in the left sidebar
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (0.0.0.0/0)
   - Click "Confirm"
   - **Wait 2-3 minutes** for changes to propagate

3. **Verify your connection string format**:
   ```
   mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/DATABASE?retryWrites=true&w=majority
   ```
   - Replace USERNAME with your database username
   - Replace PASSWORD with your database password (URL-encode special characters!)
   - Replace CLUSTER with your cluster name
   - Replace DATABASE with your database name (e.g., `ai_grocery_scanner`)
   - Keep `?retryWrites=true&w=majority` at the end

4. **URL-encode special characters in password**:
   - If your password contains special characters, they must be URL-encoded
   - Example: `p@ssw0rd!` becomes `p%40ssw0rd%21`
   - Use an online URL encoder or JavaScript's `encodeURIComponent()`

5. **Check MongoDB Atlas cluster status**:
   - Make sure your cluster is running (not paused)
   - Free tier (M0) clusters pause after inactivity

6. **Redeploy after changes**:
   - After updating environment variables in Vercel, you must redeploy
   - Go to Vercel dashboard → Deployments → Redeploy

**Still not working?**
- Check Vercel function logs for the exact error message
- Verify your MongoDB Atlas user has read/write permissions
- Try connecting from your local machine first to verify credentials
- Contact MongoDB Atlas support if the issue persists

### Error: "Missing GOOGLE_GENERATIVE_AI_API_KEY"

**Solution:** Add either `GOOGLE_GENERATIVE_AI_API_KEY` or `GEMINI_API_KEY` to enable AI analysis.

### Authentication not working

**Solution:** 
1. Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are set correctly
2. Check that your Supabase project has authentication enabled
3. Verify the site URL is configured in Supabase (Settings > Authentication > Site URL)

### Scans failing with 500 errors

**Solution:**
1. Check Vercel deployment logs for specific error messages
2. Verify all required environment variables are set
3. Test database connections (Supabase and MongoDB)
4. Check API key validity (Gemini, Barcode Lookup, Tavily)

## Post-Deployment Checklist

- [ ] All required environment variables are set
- [ ] Deployment completed successfully
- [ ] Authentication works (sign up, sign in, sign out)
- [ ] Product scanning works
- [ ] Error reporting works (test with DetailedErrorDisplay)
- [ ] Cache is working (check MongoDB for cached entries)
- [ ] Premium features work (if Tavily API key is set)

## Security Notes

1. **Never commit** `.env.local` to git (it's in `.gitignore`)
2. **Never expose** `SUPABASE_SERVICE_ROLE_KEY` to the client
3. **Rotate keys** if they are accidentally exposed
4. **Use environment-specific** keys for development vs production
5. **Monitor usage** of API keys to detect unauthorized access

## Support

If you encounter issues:
1. Check the error message in the DetailedErrorDisplay component
2. Use the "Copy Error Report" button to get full error details
3. Check Vercel deployment logs
4. Review Supabase logs
5. Check MongoDB Atlas logs

## Next Steps

After successful deployment:
1. Set up monitoring (Vercel Analytics, Sentry, etc.)
2. Configure custom domain (if desired)
3. Set up CI/CD for automated testing
4. Monitor API usage and costs
5. Gather user feedback from beta testers

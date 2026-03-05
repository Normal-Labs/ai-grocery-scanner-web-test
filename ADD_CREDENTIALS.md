# How to Add Vertex AI Credentials

## For Local Development

You have two options:

### Option 1: Use Service Account JSON (Recommended for consistency with Vercel)

1. Open your service account JSON file:
   ```
   /Users/christophermehmed/Downloads/gen-lang-client-0628770168-3334b0cae0bb.json
   ```

2. Copy the ENTIRE JSON content (it should look like this):
   ```json
   {
     "type": "service_account",
     "project_id": "gen-lang-client-0628770168",
     "private_key_id": "...",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
     "client_email": "...",
     "client_id": "...",
     "auth_uri": "https://accounts.google.com/o/oauth2/auth",
     "token_uri": "https://oauth2.googleapis.com/token",
     "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
     "client_x509_cert_url": "..."
   }
   ```

3. Add to your `.env.local` file:
   ```bash
   # Add this line (paste the entire JSON on one line, or use the method below)
   GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type":"service_account","project_id":"gen-lang-client-0628770168",...}'
   ```

   **IMPORTANT**: The JSON must be on a single line, or you can use this format:
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS_JSON=$(cat /Users/christophermehmed/Downloads/gen-lang-client-0628770168-3334b0cae0bb.json)
   ```

### Option 2: Use File Path (Simpler for local dev)

1. Move the service account file to your project:
   ```bash
   cp /Users/christophermehmed/Downloads/gen-lang-client-0628770168-3334b0cae0bb.json ./service-account-key.json
   ```

2. Add to `.gitignore`:
   ```bash
   echo "service-account-key.json" >> .gitignore
   ```

3. Add to your `.env.local`:
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json
   ```

### Option 3: Use gcloud CLI (Easiest for local dev)

If you already have gcloud configured:

```bash
# Login with application default credentials
gcloud auth application-default login

# Set project
gcloud config set project gen-lang-client-0628770168
```

Then you don't need to add anything to `.env.local` - it will use your gcloud credentials automatically.

## Quick Fix (Recommended)

Run these commands in your terminal:

```bash
# Copy service account to project
cp /Users/christophermehmed/Downloads/gen-lang-client-0628770168-3334b0cae0bb.json ./service-account-key.json

# Add to .gitignore
echo "service-account-key.json" >> .gitignore

# Add to .env.local
echo "GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json" >> .env.local

# Restart your dev server
npm run dev
```

## For Vercel Deployment

In Vercel Dashboard → Settings → Environment Variables:

1. Add variable: `GOOGLE_APPLICATION_CREDENTIALS_JSON`
2. Value: Paste the ENTIRE JSON content from the service account file
3. Select all environments (Production, Preview, Development)
4. Save

## Verify It's Working

After adding credentials, restart your dev server and check the logs:

```
[Gemini Wrapper] 🔑 Using credentials from GOOGLE_APPLICATION_CREDENTIALS_JSON
[Gemini Wrapper] 🚀 Initialized with Vertex AI
[Gemini Wrapper] 📍 Project: gen-lang-client-0628770168
[Gemini Wrapper] 🌍 Location: us-central1
[Gemini Wrapper] 🤖 Model: gemini-2.0-flash
```

If you see this, credentials are working!

## Troubleshooting

### Error: "Unable to authenticate your request"
- Check that the JSON is valid (use a JSON validator)
- Ensure the service account has `aiplatform.user` role
- Verify the project ID matches: `gen-lang-client-0628770168`

### Error: "Permission denied on resource project"
- Grant the service account proper permissions:
  ```bash
  gcloud projects add-iam-policy-binding gen-lang-client-0628770168 \
    --member="serviceAccount:vercel-deployment@gen-lang-client-0628770168.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user"
  ```

### Error: "Vertex AI API has not been used"
- Enable the API:
  ```bash
  gcloud services enable aiplatform.googleapis.com --project=gen-lang-client-0628770168
  ```

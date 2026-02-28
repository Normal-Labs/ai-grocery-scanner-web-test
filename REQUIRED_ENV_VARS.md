# Required Environment Variables - Quick Reference

## ⚠️ Critical - App Won't Work Without These

### Supabase (Authentication & Database)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # ⚠️ SECRET - Server-side only
```
**Get from:** https://app.supabase.com/project/_/settings/api

### MongoDB (AI Insights Cache)
```bash
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
```
**Get from:** https://cloud.mongodb.com/

### Google Gemini (AI Analysis)
```bash
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSy...
```
**Get from:** https://makersuite.google.com/app/apikey

---

## 📋 How to Add in Vercel

1. Go to: https://vercel.com/[your-username]/[your-project]/settings/environment-variables
2. Add each variable above
3. Select: ✅ Production ✅ Preview ✅ Development
4. Click "Save"
5. Redeploy your app

---

## ✅ Verification

After adding variables and redeploying:

1. Visit your app
2. Try to sign up/sign in
3. Try to scan a product
4. If you see errors, use the "Copy Error Report" button and check what's missing

---

## 🔒 Security Reminder

- `SUPABASE_SERVICE_ROLE_KEY` is **SECRET** - never expose to client
- All other keys starting with `NEXT_PUBLIC_` are safe to expose
- Never commit `.env.local` to git

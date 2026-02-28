# MongoDB Atlas Setup for Vercel Deployment

This guide will help you configure MongoDB Atlas to work with your Vercel deployment.

## Quick Setup Steps

### 1. Create MongoDB Atlas Account
1. Go to https://cloud.mongodb.com/
2. Sign up or sign in
3. Create a new project (or use existing)

### 2. Create a Cluster
1. Click "Build a Database"
2. Choose "M0 Free" tier (sufficient for testing)
3. Select a cloud provider and region (choose one close to your users)
4. Click "Create"

### 3. Create Database User
1. Go to "Database Access" in the left sidebar
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Enter username and password (save these!)
5. Set "Database User Privileges" to "Read and write to any database"
6. Click "Add User"

### 4. Configure Network Access (Critical for Vercel!)
1. Go to "Network Access" in the left sidebar
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere"
   - This adds `0.0.0.0/0` to the whitelist
   - **Required** because Vercel uses dynamic IPs
4. Click "Confirm"

**Security Note:** While allowing all IPs might seem insecure, your database is still protected by:
- Username/password authentication
- TLS/SSL encryption
- MongoDB's built-in security features

### 5. Get Connection String
1. Go to "Database" in the left sidebar
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Select "Node.js" as the driver
5. Copy the connection string

It will look like:
```
mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

### 6. Modify Connection String
Replace `<username>` and `<password>` with your actual credentials, and add your database name:

**Before:**
```
mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

**After:**
```
mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/ai_grocery_scanner?retryWrites=true&w=majority
```

**Important:**
- Replace `<username>` with your database username
- Replace `<password>` with your database password
- Add `/ai_grocery_scanner` (or your preferred database name) before the `?`
- Keep `?retryWrites=true&w=majority` at the end

### 7. Add to Vercel Environment Variables
1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add:
   - **Key:** `MONGODB_URI`
   - **Value:** Your modified connection string
   - **Environments:** Production, Preview, Development
4. Click "Save"
5. Redeploy your application

## Troubleshooting

### Error: "certificate validation failed"

**Cause:** TLS/SSL certificate issues in serverless environment

**Solution:** The code has been updated with proper TLS settings. Make sure:
1. You're using `mongodb+srv://` (not `mongodb://`)
2. Your connection string includes `retryWrites=true&w=majority`
3. You've whitelisted 0.0.0.0/0 in Network Access

### Error: "Authentication failed"

**Cause:** Incorrect username or password

**Solution:**
1. Double-check your username and password
2. Make sure special characters in password are URL-encoded
   - Example: `p@ssw0rd!` becomes `p%40ssw0rd%21`
3. Recreate the database user if needed

### Error: "Connection timeout"

**Cause:** Network access not configured

**Solution:**
1. Go to MongoDB Atlas → Network Access
2. Make sure 0.0.0.0/0 is in the IP Access List
3. Wait a few minutes for changes to propagate

### Error: "Database not found"

**Cause:** Database name not in connection string

**Solution:**
Make sure your connection string includes the database name:
```
mongodb+srv://user:pass@cluster.mongodb.net/DATABASE_NAME?retryWrites=true&w=majority
                                                          ^^^^^^^^^^^^
```

## Verifying the Connection

After deployment, check your Vercel logs:
1. Go to Vercel dashboard → Your project → Deployments
2. Click on the latest deployment
3. Go to "Functions" tab
4. Look for logs containing "MongoDB client connected successfully"

If you see this message, your MongoDB connection is working!

## Collections Created by the App

The app will automatically create these collections:
- `cache_entries` - Stores cached AI insights
- `dimension_cache` - Stores dimension analysis results

You can view these in MongoDB Atlas:
1. Go to "Database" → "Browse Collections"
2. Select your database
3. View the collections and documents

## Performance Tips

1. **Create Indexes:** The app automatically creates indexes on first run
2. **Monitor Usage:** Check MongoDB Atlas dashboard for usage metrics
3. **Upgrade if Needed:** Free tier (M0) has limits:
   - 512 MB storage
   - Shared RAM
   - No backups
   - Consider upgrading for production use

## Security Best Practices

1. **Rotate Credentials:** Change database password periodically
2. **Use Strong Passwords:** Generate random passwords
3. **Monitor Access:** Check MongoDB Atlas logs for suspicious activity
4. **Backup Data:** Upgrade to paid tier for automatic backups
5. **Separate Environments:** Use different databases for dev/staging/production

## Cost Considerations

- **Free Tier (M0):** $0/month - Good for testing and small apps
- **Shared Tier (M2):** ~$9/month - Better performance
- **Dedicated Tier (M10+):** $57+/month - Production-ready

For beta testing, the free tier should be sufficient!

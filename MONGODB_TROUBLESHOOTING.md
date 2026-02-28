# MongoDB Connection Troubleshooting

Quick diagnostic checklist for fixing MongoDB connection issues in Vercel deployment.

## ✅ Pre-Flight Checklist

Before deploying, verify:

### 1. Connection String Format
```bash
# ✅ CORRECT FORMAT
mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority

# ❌ WRONG - Missing mongodb+srv://
mongodb://username:password@cluster.mongodb.net/database

# ❌ WRONG - Missing database name
mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority

# ❌ WRONG - Missing query parameters
mongodb+srv://username:password@cluster.mongodb.net/database
```

### 2. Special Characters in Password
If your password contains special characters, they MUST be URL-encoded:

**⚠️ CRITICAL: Only encode the PASSWORD, not the entire URI!**

```bash
# ❌ WRONG - Entire URI encoded (will break connection)
mongodb%3A%2F%2Fuser%3Apass%40cluster.mongodb.net%2Fdb

# ✅ CORRECT - Only password encoded
mongodb+srv://myuser:MyP%40ss%3Aword%21@cluster.mongodb.net/db?retryWrites=true&w=majority
                      ^^^^^^^^^^^^^^^^^^
                      Only this part is encoded!
```

| Character | Encoded |
|-----------|---------|
| `@` | `%40` |
| `:` | `%3A` |
| `/` | `%2F` |
| `?` | `%3F` |
| `#` | `%23` |
| `[` | `%5B` |
| `]` | `%5D` |
| `!` | `%21` |
| `$` | `%24` |
| `&` | `%26` |
| `'` | `%27` |
| `(` | `%28` |
| `)` | `%29` |
| `*` | `%2A` |
| `+` | `%2B` |
| `,` | `%2C` |
| `;` | `%3B` |
| `=` | `%3D` |

**Example:**
```bash
# Original password: p@ss:w0rd!
# Encoded password: p%40ss%3Aw0rd%21

# ✅ CORRECT - Only password is encoded:
mongodb+srv://myuser:p%40ss%3Aw0rd%21@cluster.mongodb.net/mydb?retryWrites=true&w=majority

# ❌ WRONG - Entire URI encoded (will cause "port number" error):
mongodb%3A%2F%2Fmyuser%3Ap%40ss%3Aw0rd%21%40cluster.mongodb.net%2Fmydb
```

**⚠️ Common Mistake:** Encoding the entire URI will make it look like it has a port number and break the connection!

### 3. MongoDB Atlas Network Access
- [ ] Go to MongoDB Atlas → Network Access
- [ ] Click "Add IP Address"
- [ ] Select "Allow Access from Anywhere" (0.0.0.0/0)
- [ ] Click "Confirm"
- [ ] **Wait 2-3 minutes** for changes to propagate

### 4. Database User Permissions
- [ ] Go to MongoDB Atlas → Database Access
- [ ] Verify user exists
- [ ] Check permissions: "Read and write to any database"
- [ ] Verify username and password are correct

### 5. Cluster Status
- [ ] Go to MongoDB Atlas → Database
- [ ] Verify cluster is running (not paused)
- [ ] Free tier (M0) clusters auto-pause after inactivity

## 🔍 Diagnostic Steps

### Step 1: Test Connection Locally

Create a test file `test-mongo.js`:

```javascript
const { MongoClient } = require('mongodb');

const uri = 'YOUR_MONGODB_URI_HERE';

async function test() {
  try {
    const client = new MongoClient(uri);
    await client.connect();
    console.log('✅ Connected successfully!');
    await client.close();
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

test();
```

Run:
```bash
node test-mongo.js
```

If this fails locally, your connection string is incorrect.

### Step 2: Verify Environment Variable in Vercel

1. Go to Vercel dashboard → Your project → Settings → Environment Variables
2. Find `MONGODB_URI`
3. Click "Edit" to verify the value
4. Make sure there are no extra spaces or line breaks
5. Verify it's enabled for Production, Preview, and Development

### Step 3: Check Vercel Function Logs

1. Go to Vercel dashboard → Your project → Deployments
2. Click on the latest deployment
3. Go to "Functions" tab
4. Look for MongoDB connection errors
5. Check the exact error message

### Step 4: Verify MongoDB Atlas Logs

1. Go to MongoDB Atlas → Your cluster
2. Click "Metrics" tab
3. Check "Connections" graph
4. Look for connection attempts from Vercel

## 🐛 Common Error Messages

### "certificate validation failed"

**Cause:** Using `mongodb://` instead of `mongodb+srv://` or network access not configured

**Fix:**
1. Change to `mongodb+srv://`
2. Whitelist 0.0.0.0/0 in Network Access
3. Wait 2-3 minutes
4. Redeploy

### "Authentication failed"

**Cause:** Wrong username/password or special characters not encoded

**Fix:**
1. Verify username and password in MongoDB Atlas
2. URL-encode special characters in password
3. Update MONGODB_URI in Vercel
4. Redeploy

### "Connection timeout"

**Cause:** Network access not configured or cluster paused

**Fix:**
1. Check Network Access whitelist (0.0.0.0/0)
2. Verify cluster is running (not paused)
3. Check MongoDB Atlas status page
4. Try increasing timeout in connection string:
   ```
   ?retryWrites=true&w=majority&serverSelectionTimeoutMS=10000
   ```

### "mongodb+srv URI cannot have port number"

**Cause:** The entire URI was URL-encoded instead of just the password

**Fix:**
1. **DO NOT encode the entire URI!**
2. Only encode special characters in the password
3. The URI should look like:
   ```
   mongodb+srv://user:ENCODED_PASSWORD@cluster.mongodb.net/db?retryWrites=true&w=majority
   ```
4. If you see `%3A%2F%2F` or similar in your URI, you've encoded too much
5. Get a fresh connection string from MongoDB Atlas and only encode the password part

**Example of what NOT to do:**
```bash
# ❌ WRONG - Entire URI encoded
mongodb%3A%2F%2Fuser%3Apass%40cluster.mongodb.net%2Fdb

# ✅ CORRECT - Only password encoded
mongodb+srv://user:p%40ss@cluster.mongodb.net/db?retryWrites=true&w=majority
```

### "Database not found"

**Cause:** Database name missing from connection string

**Fix:**
Add database name before the `?`:
```
mongodb+srv://user:pass@cluster.mongodb.net/DATABASE_NAME?retryWrites=true&w=majority
                                                          ^^^^^^^^^^^^^
```

## 🔧 Quick Fixes

### Fix 1: Regenerate Connection String

1. Go to MongoDB Atlas → Database
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Copy the NEW connection string
5. Replace `<password>` with your actual password (URL-encoded!)
6. Add database name: `/ai_grocery_scanner?`
7. Update in Vercel
8. Redeploy

### Fix 2: Create New Database User

1. Go to MongoDB Atlas → Database Access
2. Click "Add New Database User"
3. Use a simple password (no special characters)
4. Set permissions: "Read and write to any database"
5. Click "Add User"
6. Update connection string with new credentials
7. Update in Vercel
8. Redeploy

### Fix 3: Reset Network Access

1. Go to MongoDB Atlas → Network Access
2. Delete all existing IP addresses
3. Click "Add IP Address"
4. Select "Allow Access from Anywhere" (0.0.0.0/0)
5. Click "Confirm"
6. Wait 5 minutes
7. Redeploy in Vercel

## 📞 Still Not Working?

If you've tried everything above:

1. **Check MongoDB Atlas Status**: https://status.mongodb.com/
2. **Check Vercel Status**: https://www.vercel-status.com/
3. **Try a different MongoDB cluster**: Create a new cluster and test
4. **Contact Support**:
   - MongoDB Atlas: https://support.mongodb.com/
   - Vercel: https://vercel.com/support

## 💡 Pro Tips

1. **Use simple passwords during testing**: Avoid special characters until you confirm connection works
2. **Test locally first**: Always test connection string locally before deploying
3. **Check logs immediately**: After deployment, check Vercel function logs right away
4. **Wait for propagation**: Network Access changes take 2-3 minutes to take effect
5. **Keep credentials secure**: Never commit `.env.local` to git

## ✅ Success Indicators

You'll know it's working when you see in Vercel function logs:
```
MongoDB client connected successfully
```

And in your app:
- No error messages
- Scans complete successfully
- Products are cached (check MongoDB Atlas → Browse Collections)

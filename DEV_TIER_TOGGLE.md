# Development Tier Toggle

## Overview

For development and testing, you can easily switch between free and premium tiers without setting up authentication or subscription systems.

## Methods

### Method 1: Request Body Parameter (Recommended)

Add `devUserTier` to your API request:

```bash
# Test as FREE tier user (only Health dimension)
curl -X POST http://localhost:3000/api/scan-multi-tier \
  -H "Content-Type: application/json" \
  -d '{
    "barcode": "0044000034207",
    "userId": "test-user",
    "sessionId": "test-session",
    "devUserTier": "free"
  }'

# Test as PREMIUM tier user (all 5 dimensions)
curl -X POST http://localhost:3000/api/scan-multi-tier \
  -H "Content-Type: application/json" \
  -d '{
    "barcode": "0044000034207",
    "userId": "test-user",
    "sessionId": "test-session",
    "devUserTier": "premium"
  }'
```

### Method 2: Environment Variable

Set the `DEV_USER_TIER` environment variable in your `.env.local`:

```bash
# .env.local
DEV_USER_TIER=premium  # or 'free'
```

Then restart your development server:

```bash
npm run dev
```

All requests will use the tier specified in the environment variable.

## Tier Differences

### Free Tier
- **Available Dimensions**: Health only
- **Locked Dimensions**: Processing, Allergens, Responsibly Produced, Environmental Impact
- **Response**: Includes `upgradePrompt` message
- **Use Case**: Test limited access, upgrade prompts

Example response:
```json
{
  "userTier": "free",
  "availableDimensions": ["health"],
  "upgradePrompt": "Upgrade to Premium to see all 5 dimensions",
  "dimensionAnalysis": {
    "dimensions": {
      "health": {
        "score": 75,
        "explanation": "...",
        "available": true,
        "locked": false
      },
      "processing": {
        "score": 60,
        "explanation": "...",
        "available": false,
        "locked": true
      }
      // ... other locked dimensions
    }
  }
}
```

### Premium Tier
- **Available Dimensions**: All 5 (Health, Processing, Allergens, Responsibly Produced, Environmental Impact)
- **Locked Dimensions**: None
- **Response**: No upgrade prompt
- **Use Case**: Test full feature access

Example response:
```json
{
  "userTier": "premium",
  "availableDimensions": [
    "health",
    "processing",
    "allergens",
    "responsiblyProduced",
    "environmentalImpact"
  ],
  "dimensionAnalysis": {
    "dimensions": {
      "health": {
        "score": 75,
        "explanation": "...",
        "available": true,
        "locked": false
      },
      "processing": {
        "score": 60,
        "explanation": "...",
        "available": true,
        "locked": false
      }
      // ... all dimensions available
    }
  }
}
```

## Testing Scenarios

### Scenario 1: Free Tier User Experience
```bash
curl -X POST http://localhost:3000/api/scan-multi-tier \
  -H "Content-Type: application/json" \
  -d '{
    "barcode": "0044000034207",
    "userId": "free-user",
    "sessionId": "session-1",
    "devUserTier": "free"
  }'
```

**Expected**:
- ✅ Product identified
- ✅ Health dimension visible
- ✅ Other 4 dimensions locked
- ✅ Upgrade prompt shown

### Scenario 2: Premium Tier User Experience
```bash
curl -X POST http://localhost:3000/api/scan-multi-tier \
  -H "Content-Type: application/json" \
  -d '{
    "barcode": "0044000034207",
    "userId": "premium-user",
    "sessionId": "session-2",
    "devUserTier": "premium"
  }'
```

**Expected**:
- ✅ Product identified
- ✅ All 5 dimensions visible
- ✅ No locked dimensions
- ✅ No upgrade prompt

### Scenario 3: Skip Dimension Analysis
```bash
curl -X POST http://localhost:3000/api/scan-multi-tier \
  -H "Content-Type: application/json" \
  -d '{
    "barcode": "0044000034207",
    "userId": "test-user",
    "sessionId": "session-3",
    "skipDimensionAnalysis": true
  }'
```

**Expected**:
- ✅ Product identified
- ✅ `dimensionStatus: "skipped"`
- ✅ No dimension analysis performed
- ✅ Faster response time

## Important Notes

### Caching Behavior
- **Full analysis is always cached** regardless of user tier
- If a free tier user scans a product, the full 5-dimension analysis is cached
- If that user upgrades to premium, they instantly get all 5 dimensions from cache
- This optimizes for future premium access

### Development Only
- The `devUserTier` parameter is for **development only**
- In production, user tier is determined from authentication context
- Remove or ignore `devUserTier` in production deployments

### Priority Order
1. Request body `devUserTier` (highest priority)
2. Environment variable `DEV_USER_TIER`
3. Default to `'free'` tier

## Logs to Watch

When using tier toggle, you'll see these logs:

```
[Scan API Multi-Tier] 🔧 DEV MODE: User tier set to 'premium'
[Integration Layer] 🔧 DEV MODE: Using tier 'premium' from DEV_USER_TIER
```

## API Info Endpoint

Check the API configuration:

```bash
curl http://localhost:3000/api/scan-multi-tier
```

Response includes development section:
```json
{
  "development": {
    "tierToggle": "Set devUserTier to 'free' or 'premium' in request body",
    "envVariable": "Or set DEV_USER_TIER environment variable"
  }
}
```

## Frontend Integration

When building the UI, you can add a toggle switch:

```typescript
const [userTier, setUserTier] = useState<'free' | 'premium'>('free');

const scanProduct = async () => {
  const response = await fetch('/api/scan-multi-tier', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      barcode: '0044000034207',
      userId: 'test-user',
      sessionId: 'test-session',
      devUserTier: userTier, // Toggle between 'free' and 'premium'
    }),
  });
  
  const data = await response.json();
  console.log('User Tier:', data.userTier);
  console.log('Available Dimensions:', data.availableDimensions);
};
```

## Troubleshooting

### Tier not changing?
- Check logs for `🔧 DEV MODE` messages
- Verify spelling: must be exactly `'free'` or `'premium'`
- Restart dev server if using environment variable

### Still seeing free tier?
- Request body parameter overrides environment variable
- Check if `devUserTier` is being passed in request
- Default is `'free'` if neither is set

### Want to test production behavior?
- Don't set `devUserTier` in request
- Don't set `DEV_USER_TIER` in environment
- System will default to `'free'` tier

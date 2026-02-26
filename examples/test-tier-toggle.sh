#!/bin/bash

# Test Tier Toggle Examples
# Run these commands to test free vs premium tier behavior

echo "=========================================="
echo "Testing Tier Toggle Feature"
echo "=========================================="
echo ""

# Test 1: Free Tier
echo "📋 Test 1: FREE TIER (only Health dimension)"
echo "-------------------------------------------"
curl -X POST http://localhost:3000/api/scan-multi-tier \
  -H "Content-Type: application/json" \
  -d '{
    "barcode": "0044000034207",
    "userId": "test-user-free",
    "sessionId": "session-free",
    "devUserTier": "free"
  }' | jq '.userTier, .availableDimensions, .upgradePrompt'

echo ""
echo ""

# Test 2: Premium Tier
echo "💎 Test 2: PREMIUM TIER (all 5 dimensions)"
echo "-------------------------------------------"
curl -X POST http://localhost:3000/api/scan-multi-tier \
  -H "Content-Type: application/json" \
  -d '{
    "barcode": "0044000034207",
    "userId": "test-user-premium",
    "sessionId": "session-premium",
    "devUserTier": "premium"
  }' | jq '.userTier, .availableDimensions, .upgradePrompt'

echo ""
echo ""

# Test 3: Skip Dimension Analysis
echo "⏭️  Test 3: SKIP DIMENSION ANALYSIS"
echo "-------------------------------------------"
curl -X POST http://localhost:3000/api/scan-multi-tier \
  -H "Content-Type: application/json" \
  -d '{
    "barcode": "0044000034207",
    "userId": "test-user-skip",
    "sessionId": "session-skip",
    "skipDimensionAnalysis": true
  }' | jq '.dimensionStatus, .processingTimeMs'

echo ""
echo ""

# Test 4: API Info
echo "ℹ️  Test 4: API INFORMATION"
echo "-------------------------------------------"
curl http://localhost:3000/api/scan-multi-tier | jq '.development'

echo ""
echo ""
echo "=========================================="
echo "✅ Tests Complete"
echo "=========================================="

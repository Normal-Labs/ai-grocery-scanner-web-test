# Scan Location Tracking - Feature Overview

## Date: March 6, 2026

## Status: ✅ FULLY IMPLEMENTED (Not Currently Used)

---

## Executive Summary

The application has a **complete location tracking system** for recording where products are scanned to track product availability by location. The infrastructure is fully built and tested, but **not currently integrated into the main scanning pages** (`/test-all`, `/scan`, `/history`).

---

## Feature Overview

### Purpose
Track where users scan products to build a crowdsourced database of product availability at physical store locations. This enables:
- Finding which stores carry specific products
- Discovering what products are available at nearby stores
- Building a real-time inventory map based on user scans

### How It Works
1. User scans a product
2. Browser requests geolocation permission
3. If granted, captures GPS coordinates (latitude/longitude)
4. System finds or creates nearby store (within 100m threshold)
5. Records product sighting at that store with timestamp
6. Updates inventory database

---

## Implementation Status

### ✅ Fully Implemented Components

#### 1. Geolocation Service (`src/lib/geolocation.ts`)
- Browser Geolocation API wrapper
- Permission handling
- High accuracy GPS mode
- Graceful error handling
- Timeout management (10 seconds)

**Key Functions**:
- `getCurrentPosition()` - Get user's current location
- `isGeolocationSupported()` - Check browser support
- `requestGeolocationPermission()` - Explicit permission request
- `watchPosition()` - Continuous location tracking (for future use)

#### 2. Database Schema (Supabase)

**stores table**:
```sql
- id (UUID, primary key)
- name (text)
- address (text)
- latitude (numeric)
- longitude (numeric)
- created_at (timestamp)
- updated_at (timestamp)
```

**store_inventory table**:
```sql
- id (UUID, primary key)
- store_id (UUID, foreign key → stores.id)
- product_id (UUID, foreign key → products.id)
- last_seen_at (timestamp)
- created_at (timestamp)
- updated_at (timestamp)
- UNIQUE constraint on (product_id, store_id)
```

**PostGIS Extensions**:
- Spatial indexing for efficient proximity queries
- `ST_DWithin` for radius searches
- Geography type for accurate distance calculations

#### 3. Repository Classes

**StoreRepository** (`src/lib/supabase/repositories/StoreRepository.ts`):
- `findNearby(lat, lng, radiusMeters)` - Find stores within radius
- `findOrCreateNearby(lat, lng, name, address)` - Find or create store (100m threshold)
- `create(data)` - Create new store

**InventoryRepository** (`src/lib/supabase/repositories/InventoryRepository.ts`):
- `recordSighting(productId, storeId)` - Record product at store
- `getStoresForProduct(productId)` - Find all stores carrying a product
- `getProductsAtStore(storeId)` - Find all products at a store
- `getProductsNearLocation(lat, lng, radius)` - Find products at nearby stores

#### 4. Orchestrator Integration

**ScanOrchestrator** (`src/lib/orchestrator/ScanOrchestrator.ts`):
- Accepts optional `location` parameter in scan requests
- Processes location after successful product identification
- Finds or creates nearby store
- Records inventory sighting
- Continues scan even if location processing fails

**ScanRequest Type**:
```typescript
interface ScanRequest {
  barcode?: string;
  image?: string;
  userId: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  // ... other fields
}
```

#### 5. Tests
- ✅ Geolocation integration tests (`src/app/__tests__/geolocation-integration.test.tsx`)
- ✅ StoreRepository tests
- ✅ InventoryRepository tests
- ✅ ScanOrchestrator location processing tests

---

## Current Integration Status

### ❌ Not Integrated Into UI

**Pages that DON'T use location tracking**:
- `/test-all` - Main AI analysis page
- `/scan` - Multi-tier scanning page
- `/history` - Scan history page

**Why Not Integrated**:
- Feature was built but not connected to UI
- No geolocation request in scan flow
- No location data passed to API endpoints
- No store name/address collection from user

---

## Requirements Satisfied

From original specifications:

### Geolocation Requirements (9.x)
- ✅ **9.1**: Request geolocation permission from browser
- ✅ **9.2**: Capture latitude and longitude if permission granted
- ✅ **9.3**: Allow operation to proceed if permission denied
- ✅ **9.4**: Use high accuracy enabled
- ✅ **9.6**: Find or create store near coordinates, record inventory

### Database Requirements (3.x, 4.x)
- ✅ **3.2**: Create stores table with name, address, location
- ✅ **3.3**: Define location column as geography(POINT, 4326)
- ✅ **3.4**: Create spatial index for efficient proximity queries
- ✅ **3.5**: Support queries for stores within specified radius
- ✅ **4.1**: Create store_inventory table
- ✅ **4.2**: Enforce foreign key constraints
- ✅ **4.3**: Create composite unique index on (product_id, store_id)
- ✅ **4.4**: Record or update store_inventory when product scanned
- ✅ **4.5**: Return all stores carrying a specific product
- ✅ **4.6**: Return products available at stores within radius

### Repository Requirements (7.x)
- ✅ **7.1**: Implement repository classes for data access
- ✅ **7.2**: Create separate repository methods
- ✅ **7.3**: Design framework-agnostic methods
- ✅ **7.4**: Return typed results
- ✅ **7.5**: Handle errors consistently

---

## How to Enable Location Tracking

### Option 1: Quick Integration (30 minutes)

**Step 1**: Add geolocation to scan flow
```tsx
// src/app/test-all/page.tsx
import { getCurrentPosition } from '@/lib/geolocation';

const handleScanComplete = async (scanData) => {
  // Get location
  const locationResult = await getCurrentPosition();
  
  // Prepare request
  const requestBody = {
    ...scanData,
    location: locationResult.coordinates, // null if denied
  };
  
  // Send to API
  const response = await fetch('/api/test-all-extraction', {
    method: 'POST',
    body: JSON.stringify(requestBody),
  });
};
```

**Step 2**: Update API to accept location
```typescript
// src/app/api/test-all-extraction/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { image, imageMimeType, productId, location } = body;
  
  // ... existing extraction logic ...
  
  // After successful extraction, if location provided:
  if (location && productData.id) {
    try {
      const store = await storeRepository.findOrCreateNearby(
        location.latitude,
        location.longitude,
        'Unknown Store', // Could prompt user for store name
        'Unknown Address' // Could use reverse geocoding
      );
      
      await inventoryRepository.recordSighting(
        productData.id,
        store.id
      );
    } catch (error) {
      // Log but don't fail the scan
      console.error('Location processing failed:', error);
    }
  }
  
  // ... return response ...
}
```

**Step 3**: Test
- Scan a product
- Grant location permission
- Verify store created in database
- Verify inventory recorded

---

### Option 2: Full Integration with Store Selection (2-4 hours)

**Additional Features**:
1. Prompt user for store name/chain
2. Show nearby stores for selection
3. Allow manual store entry
4. Display "Last seen at" information
5. Show product availability map

**UI Components Needed**:
- Store selection modal
- Nearby stores list
- Location permission prompt
- Store search/autocomplete
- Product availability indicator

---

## Use Cases

### 1. Find Stores Carrying a Product
```typescript
import { inventoryRepository } from '@/lib/supabase/repositories/InventoryRepository';

// Get all stores that have this product
const stores = await inventoryRepository.getStoresForProduct(productId);

console.log('Available at:', stores.map(s => s.name));
```

### 2. Find Products at Nearby Stores
```typescript
import { inventoryRepository } from '@/lib/supabase/repositories/InventoryRepository';

// Get products available within 5km
const results = await inventoryRepository.getProductsNearLocation(
  37.7749,  // latitude
  -122.4194, // longitude
  5000      // 5km radius in meters
);

results.forEach(({ product, stores }) => {
  console.log(`${product.name} at ${stores.length} nearby stores`);
});
```

### 3. Check Product Availability
```typescript
// When viewing a product, show where it's available
const stores = await inventoryRepository.getStoresForProduct(productId);

if (stores.length > 0) {
  return (
    <div>
      <h3>Available at {stores.length} stores</h3>
      <ul>
        {stores.map(store => (
          <li key={store.id}>{store.name} - {store.address}</li>
        ))}
      </ul>
    </div>
  );
}
```

---

## Privacy & Permissions

### Browser Permission
- Requires user consent via browser prompt
- Can be denied without affecting scan functionality
- Permission persists per domain
- User can revoke in browser settings

### Data Stored
- **Coordinates**: Latitude/longitude (not stored directly)
- **Store Location**: Approximate location (within 100m)
- **Timestamp**: When product was last seen
- **No PII**: No user identity linked to location

### Privacy Policy Considerations
- Disclose location data collection
- Explain purpose (product availability tracking)
- Allow opt-out
- Data retention policy
- User rights (access, deletion)

---

## Performance Considerations

### Spatial Queries
- PostGIS spatial index for fast proximity searches
- Efficient `ST_DWithin` queries
- Sub-second query times for typical radius searches

### Database Size
- Stores table: Grows slowly (one per physical location)
- Inventory table: Grows with unique product-store combinations
- Automatic deduplication via unique constraint

### API Impact
- Optional feature (doesn't slow down scans if disabled)
- Async processing (doesn't block scan response)
- Graceful degradation (scan succeeds even if location fails)

---

## Future Enhancements

### Short-term (1-2 weeks)
1. **Store Name Collection**: Prompt user for store name
2. **Reverse Geocoding**: Auto-fill address from coordinates
3. **Store Chain Detection**: Recognize major chains
4. **UI Integration**: Add location toggle to scanner

### Medium-term (1-2 months)
1. **Product Availability Map**: Visual map of where products are available
2. **Store Search**: Find products at specific stores
3. **Nearby Products**: "What's available near me?"
4. **Inventory Freshness**: Show how recently product was seen

### Long-term (3-6 months)
1. **Crowdsourced Inventory**: Community-driven availability data
2. **Out of Stock Reporting**: Users report when products unavailable
3. **Price Tracking**: Add price data to inventory
4. **Shopping Lists**: "Where can I find all items on my list?"
5. **Store Recommendations**: Suggest stores based on shopping patterns

---

## Technical Details

### Geolocation Accuracy
- **High Accuracy Mode**: Uses GPS (10-50m accuracy)
- **Low Accuracy Mode**: Uses WiFi/cell towers (100-1000m accuracy)
- **Timeout**: 10 seconds
- **Cache**: No cached positions (always fresh)

### Store Matching Algorithm
1. Search for stores within 100m of coordinates
2. If found, return closest store
3. If not found, create new store
4. Prevents duplicate stores for same location

### Inventory Upsert Logic
```sql
INSERT INTO store_inventory (product_id, store_id, last_seen_at)
VALUES ($1, $2, NOW())
ON CONFLICT (product_id, store_id)
DO UPDATE SET last_seen_at = NOW()
```

### Distance Calculations
- Uses PostGIS geography type
- Accurate for global coordinates
- Returns distance in meters
- Accounts for Earth's curvature

---

## Testing

### Manual Testing Checklist
- [ ] Request location permission → Prompt appears
- [ ] Grant permission → Coordinates captured
- [ ] Deny permission → Scan continues without location
- [ ] Scan same product at same location → Updates timestamp
- [ ] Scan different product at same location → New inventory record
- [ ] Scan same product at different location → New store + inventory
- [ ] Query stores for product → Returns correct stores
- [ ] Query products near location → Returns correct products

### Automated Tests
- ✅ Geolocation permission handling
- ✅ Coordinate capture
- ✅ Store creation
- ✅ Store finding (within threshold)
- ✅ Inventory recording
- ✅ Inventory upsert (update existing)
- ✅ Spatial queries
- ✅ Error handling

---

## API Endpoints (If Integrated)

### POST /api/test-all-extraction
**Request**:
```json
{
  "image": "base64...",
  "imageMimeType": "image/jpeg",
  "location": {
    "latitude": 37.7749,
    "longitude": -122.4194
  }
}
```

**Response** (unchanged):
```json
{
  "success": true,
  "product": { ... },
  "steps": { ... }
}
```

### GET /api/products/:productId/stores
**Response**:
```json
{
  "product": { ... },
  "stores": [
    {
      "id": "store-uuid",
      "name": "Whole Foods Market",
      "address": "123 Main St",
      "latitude": 37.7749,
      "longitude": -122.4194,
      "lastSeenAt": "2026-03-06T10:30:00Z"
    }
  ]
}
```

### GET /api/stores/nearby?lat=37.7749&lng=-122.4194&radius=5000
**Response**:
```json
{
  "stores": [
    {
      "id": "store-uuid",
      "name": "Whole Foods Market",
      "address": "123 Main St",
      "distance": 0.5,
      "productCount": 42
    }
  ]
}
```

---

## Database Queries

### Find Stores Carrying Product
```sql
SELECT s.*
FROM stores s
JOIN store_inventory si ON si.store_id = s.id
WHERE si.product_id = $1
ORDER BY si.last_seen_at DESC;
```

### Find Products at Nearby Stores
```sql
SELECT p.*, s.*, 
       ST_Distance(s.location, ST_MakePoint($2, $1)::geography) as distance
FROM products p
JOIN store_inventory si ON si.product_id = p.id
JOIN stores s ON s.id = si.store_id
WHERE ST_DWithin(s.location, ST_MakePoint($2, $1)::geography, $3)
ORDER BY distance;
```

### Find or Create Store
```sql
-- Find nearby
SELECT *, ST_Distance(location, ST_MakePoint($2, $1)::geography) as distance
FROM stores
WHERE ST_DWithin(location, ST_MakePoint($2, $1)::geography, 100)
ORDER BY distance
LIMIT 1;

-- Create if not found
INSERT INTO stores (name, address, latitude, longitude)
VALUES ($1, $2, $3, $4)
RETURNING *;
```

---

## Conclusion

**Current State**:
- ✅ Complete infrastructure built and tested
- ✅ All database tables and indexes created
- ✅ Repository classes implemented
- ✅ Orchestrator integration ready
- ❌ Not integrated into UI
- ❌ Not used in production

**To Enable**:
1. Add geolocation request to scan flow (5 minutes)
2. Pass location to API endpoint (5 minutes)
3. Update API to process location (10 minutes)
4. Test end-to-end (10 minutes)

**Total Time**: ~30 minutes for basic integration

**Recommendation**:
- **For MVP**: Keep disabled (simpler UX, fewer permissions)
- **For Future**: Enable with store selection UI (better UX)
- **For Enterprise**: Enable with full inventory features

The infrastructure is production-ready and waiting to be activated whenever you decide to enable location-based features.

---

**Prepared By**: Kiro AI Assistant  
**Date**: March 6, 2026  
**Status**: Infrastructure complete, UI integration pending

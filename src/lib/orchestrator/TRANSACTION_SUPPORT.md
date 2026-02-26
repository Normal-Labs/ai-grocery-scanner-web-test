# Transaction Support in Scan Orchestrator

## Overview

The Scan Orchestrator implements transaction support to ensure data consistency across multiple data stores (Supabase Product Repository and MongoDB Cache Service). This addresses Requirements 12.4 and 12.5 from the multi-tier product identification specification.

## Requirements

- **Requirement 12.4**: The Scan Orchestrator SHALL use transactions when updating multiple data stores
- **Requirement 12.5**: If a database update fails, then the Scan Orchestrator SHALL roll back related changes

## Implementation

### Transaction Wrapper Method

The `executeTransaction<T>()` method provides a generic transaction wrapper that:
1. Executes an operation that returns both a result and a rollback function
2. Captures the rollback function for use in case of failure
3. Automatically invokes rollback if the operation fails
4. Logs data consistency errors if rollback fails

```typescript
private async executeTransaction<T>(
  operation: () => Promise<{
    result: T;
    rollback: () => Promise<void>;
  }>
): Promise<T>
```

### Multi-Store Update Method

The `updateProductAndCache()` method implements atomic updates across both stores:

```typescript
private async updateProductAndCache(
  productData: ProductData,
  cacheKey: string,
  cacheKeyType: 'barcode' | 'imageHash',
  tier: Tier,
  confidence: ConfidenceScore,
  productId?: string
): Promise<ProductData>
```

**Process:**
1. Captures previous cache state for rollback
2. Updates Product Repository (Supabase)
3. Updates Cache Service (MongoDB)
4. Returns rollback function that can restore previous state

**Rollback Logic:**
- If cache update fails after product save: Restores previous cache state
- If both fail: Attempts to rollback cache changes
- Logs data consistency errors if rollback fails

## Usage in Tier Methods

### Tier 1 (Direct Barcode Scanning)
- **Read-only operation**: No transaction needed
- Simple cache update after database read
- Cache failure is non-critical (logged but doesn't fail the operation)

### Tier 2 (Visual Text Extraction)
- **Read-only operation**: No transaction needed
- Simple cache update after database read
- Cache failure is non-critical (logged but doesn't fail the operation)

### Tier 3 (Discovery Search)
- **Write operation**: Uses transaction support in Discovery Service
- `persistDiscoveredBarcode()` implements rollback logic
- Captures previous cache states before updates
- Rolls back cache changes if database update fails

### Tier 4 (Comprehensive Image Analysis)
- **Write operation**: Uses `updateProductAndCache()` for new products
- Existing products: Simple cache update (read-only DB operation)
- New products: Full transactional update with rollback support

## Retry Logic

The Product Repository implements retry logic with exponential backoff:

```typescript
async withTransaction<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T>
```

**Retry Schedule:**
- Attempt 1: Immediate
- Attempt 2: 100ms delay
- Attempt 3: 200ms delay
- Attempt 4: 400ms delay

This satisfies Requirement 12.7: Retry failed operations up to 3 times with exponential backoff.

## Limitations

### Supabase Transaction Limitations

The current implementation has a limitation: **Supabase database changes cannot be fully rolled back** without native transaction support. This is because:

1. Supabase client doesn't expose PostgreSQL transaction APIs directly
2. Each operation is auto-committed
3. Rolling back would require DELETE/UPDATE operations that could fail

**Mitigation Strategies:**
1. Cache rollback is fully implemented
2. Operations are ordered (DB first, then cache) to minimize inconsistency window
3. Data consistency errors are logged for monitoring
4. In production, consider using Supabase Edge Functions with PostgreSQL transactions

### Future Improvements

For production systems, consider:
1. **Saga Pattern**: Implement compensating transactions for each operation
2. **Event Sourcing**: Store all changes as events that can be replayed/reversed
3. **Two-Phase Commit**: Coordinate commits across both stores
4. **Supabase Edge Functions**: Use PostgreSQL transactions directly

## Error Handling

### Data Consistency Errors

When a rollback fails, the system logs a **DATA CONSISTENCY ERROR**:

```
⚠️  DATA CONSISTENCY ERROR: Failed to rollback transaction
```

These errors should be monitored and trigger manual reconciliation.

### Logging

All transaction operations are logged with context:
- `🔄 Starting transaction`
- `✅ Transaction completed successfully`
- `❌ Transaction failed`
- `🔄 Rolling back transaction`
- `✅ Rollback completed`
- `❌ Rollback failed`

## Testing

Transaction support is tested in `src/lib/__tests__/transaction-support.test.ts`:

1. **Retry Logic**: Verifies exponential backoff works correctly
2. **Method Existence**: Confirms transaction methods are available
3. **Rollback Support**: Validates snapshot/restore methods exist

## Monitoring

To monitor transaction health:

1. **Search logs for**: `DATA CONSISTENCY ERROR`
2. **Track metrics**:
   - Transaction success rate
   - Rollback frequency
   - Retry attempts per transaction
3. **Alert on**:
   - High rollback rates (>5%)
   - Failed rollbacks (any occurrence)
   - Excessive retries (>2 attempts per transaction)

## Related Files

- `src/lib/orchestrator/ScanOrchestratorMultiTier.ts` - Main orchestrator with transaction support
- `src/lib/supabase/repositories/ProductRepositoryMultiTier.ts` - Repository with retry logic
- `src/lib/mongodb/cache-service.ts` - Cache service with snapshot/restore
- `src/lib/services/discovery-service.ts` - Discovery service with transaction support
- `src/lib/__tests__/transaction-support.test.ts` - Transaction tests

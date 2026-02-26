# Retry Logic Implementation

## Overview

This document describes the retry logic implementation for database operations in the multi-tier product identification system, fulfilling **Requirement 12.7**.

## Specification

**Requirement 12.7**: The Scan Orchestrator SHALL retry failed database operations up to 3 times with exponential backoff (100ms, 200ms, 400ms).

## Implementation Details

### 1. Product Repository - Core Retry Logic

The `ProductRepositoryMultiTier` class provides a `withTransaction()` method that implements the retry logic with exponential backoff:

**Location**: `src/lib/supabase/repositories/ProductRepositoryMultiTier.ts`

**Features**:
- Retries up to 3 times (4 total attempts including the initial attempt)
- Exponential backoff delays: 100ms, 200ms, 400ms
- Logs retry attempts and final failures
- Logs data consistency errors (Requirement 12.6)

**Usage Example**:
```typescript
const product = await this.productRepository.withTransaction(async () => {
  return await this.productRepository.findByBarcode(barcode);
});
```

### 2. Scan Orchestrator - Database Operations

The `ScanOrchestratorMultiTier` class wraps all database read operations with retry logic:

**Location**: `src/lib/orchestrator/ScanOrchestratorMultiTier.ts`

**Operations with Retry Logic**:
- **Tier 1**: `findByBarcode()` - Wrapped in `withTransaction()`
- **Tier 2**: `searchByMetadata()` - Wrapped in `withTransaction()`
- **Tier 4**: `searchByMetadata()` - Wrapped in `withTransaction()`

**Write Operations**: The `updateProductAndCache()` method uses the `executeTransaction()` method which provides rollback support. The underlying database writes in the Product Repository already use `withTransaction()` internally.

### 3. Error Reporter Service - Database Operations

The `ErrorReporterService` class implements retry logic for its database operations:

**Location**: `src/lib/services/error-reporter.ts`

**Operations with Retry Logic**:
- **`storeErrorReport()`**: Stores error reports to Supabase with retry logic
  - Retries up to 3 times with exponential backoff (100ms, 200ms, 400ms)
  - Logs retry attempts and final failures
  
- **`flagProductForReview()`**: Flags products for manual review with retry logic
  - Retries up to 3 times with exponential backoff (100ms, 200ms, 400ms)
  - Logs retry attempts and final failures
  - Does not throw on failure (non-critical operation)

### 4. Discovery Service - Database Operations

The `DiscoveryService` class implements retry logic for barcode persistence:

**Location**: `src/lib/services/discovery-service.ts`

**Operations with Retry Logic**:
- **`persistDiscoveredBarcode()`**: Saves discovered barcodes with retry logic
  - Retries up to 3 times with exponential backoff (100ms, 200ms, 400ms)
  - Includes rollback support for cache updates
  - Logs retry attempts and final failures
  - Logs data consistency errors on rollback failures

## Retry Logic Pattern

All retry implementations follow this pattern:

```typescript
let lastError: Error | null = null;
const maxRetries = 3;

for (let attempt = 0; attempt <= maxRetries; attempt++) {
  try {
    // Perform database operation
    const result = await databaseOperation();
    
    if (attempt > 0) {
      console.log(`✅ Operation succeeded on attempt ${attempt + 1}`);
    }
    
    return result;
    
  } catch (error) {
    lastError = error as Error;
    
    if (attempt < maxRetries) {
      // Calculate exponential backoff delay (100ms, 200ms, 400ms)
      const delay = Math.min(100 * Math.pow(2, attempt), 400);
      console.log(`⚠️  Operation failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

console.error(`❌ Operation failed after ${maxRetries + 1} attempts`);
throw lastError || new Error('Operation failed');
```

## Logging

All retry logic implementations include comprehensive logging:

1. **Retry Attempts**: Logs each retry attempt with the delay time
2. **Success After Retry**: Logs when an operation succeeds after one or more retries
3. **Final Failures**: Logs when all retry attempts are exhausted
4. **Data Consistency Errors**: Logs data consistency errors (Requirement 12.6)

## Testing

The retry logic is tested in:
- `src/lib/__tests__/transaction-support.test.ts`
  - Tests retry with exponential backoff
  - Tests transaction rollback on failures
  - Tests multi-store transaction coordination

## Benefits

1. **Resilience**: Handles transient database connection issues and timeouts
2. **Data Consistency**: Ensures operations complete successfully or fail gracefully
3. **Observability**: Comprehensive logging helps diagnose issues
4. **Performance**: Exponential backoff prevents overwhelming the database during issues

## Related Requirements

- **Requirement 12.4**: Transactional multi-store updates
- **Requirement 12.5**: Transaction rollback on failure
- **Requirement 12.6**: Data consistency error logging
- **Requirement 12.7**: Database operation retry with exponential backoff

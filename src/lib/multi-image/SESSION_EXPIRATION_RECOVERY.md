# Session Expiration Recovery Implementation

## Overview

This document describes the session expiration recovery implementation for the multi-image product capture system.

**Requirements:** 3.3, 3.4

## Implementation Details

### MultiImageOrchestrator Changes

The `MultiImageOrchestrator.processImage()` method now includes session expiration recovery logic:

1. **Session Validation**: When a `sessionId` is provided, the orchestrator checks if the session is still active by calling `SessionManager.getActiveSession()`.

2. **Expiration Detection**: If the session is not found or has expired, the orchestrator:
   - Sets a `sessionExpired` flag to `true`
   - Creates a new session automatically using `SessionManager.createSession()`
   - Logs the expiration event for monitoring

3. **Product Matching**: When a session has expired:
   - The orchestrator passes `undefined` instead of the expired session to `ProductMatcher.matchProduct()`
   - This allows the ProductMatcher to use barcode or visual similarity matching instead of session context
   - If a match is found, the new session is linked to the existing product

4. **User Communication**: The orchestrator returns:
   - `sessionExpired: boolean` - Flag indicating the session was expired
   - `recoveryMessage: string` - User-friendly message explaining what happened
   - Two types of messages:
     - If product matched: "Your capture session has expired. We automatically linked this image to your existing product and started a new session."
     - If no match: "Your capture session has expired. Starting a new session..."

### Page.tsx Changes

The scan page (`src/app/page.tsx`) has been updated to handle session expiration:

1. **Session ID Update**: When `sessionExpired` is true, the page updates the `sessionId` state with the new session ID.

2. **Recovery Message Display**: The page logs the recovery message (can be enhanced to show a toast notification or banner).

3. **Workflow Continuation**: The workflow continues seamlessly with the new session, maintaining the user's progress.

## User Experience

### Scenario 1: Session Expires with Product Match

1. User captures barcode image (session created)
2. User waits 31+ minutes (session expires)
3. User captures packaging image
4. System detects expired session
5. System creates new session
6. System matches packaging to existing product by barcode
7. System links new session to existing product
8. User sees message: "Your capture session has expired. We automatically linked this image to your existing product and started a new session."
9. User continues capturing remaining images

### Scenario 2: Session Expires without Product Match

1. User captures barcode image (session created)
2. User waits 31+ minutes (session expires)
3. User captures different product's barcode
4. System detects expired session
5. System creates new session
6. System cannot match to existing product
7. System creates new product
8. User sees message: "Your capture session has expired. Starting a new session..."
9. User continues with new product

## Testing

### Manual Testing Steps

1. **Test Session Expiration Detection**:
   - Capture an image to create a session
   - Note the session ID from console logs
   - Wait 31 minutes (or manually expire the session in MongoDB)
   - Capture another image with the same session ID
   - Verify: New session is created, `sessionExpired` flag is true

2. **Test Product Matching on Expiration**:
   - Capture barcode image (e.g., "123456789012")
   - Wait for session to expire
   - Capture packaging image for same product
   - Verify: System matches to existing product, links new session

3. **Test Workflow Continuation**:
   - Start guided capture workflow
   - Capture barcode image
   - Wait for session to expire
   - Capture packaging image
   - Verify: Workflow continues to next step (nutrition label)

### Automated Testing

Unit tests can be added once the test environment is configured to support server-side code with proper mocking of:
- SessionManager
- ProductMatcher
- DataMerger
- ImageClassifier

## Code Locations

- **MultiImageOrchestrator**: `src/lib/multi-image/MultiImageOrchestrator.ts`
  - Lines 130-150: Session expiration detection
  - Lines 180-195: Product matching with expired session handling
  - Lines 230-245: Recovery message generation

- **Page Component**: `src/app/page.tsx`
  - Lines 520-530: Progressive mode session expiration handling
  - Lines 750-760: Guided mode session expiration handling

## Monitoring

The implementation includes console logging for monitoring:

- `[MultiImageOrchestrator] ⚠️  Session expired or not found, creating new session`
- `[MultiImageOrchestrator] ✅ Session expired - recovered by matching to existing product: {productId}`
- `[Scan Page] ⚠️  Session expired: {recoveryMessage}`

These logs can be used to track:
- Session expiration rate
- Recovery success rate (matched vs. new product)
- User impact (how often users experience expiration)

## Future Enhancements

1. **UI Notification**: Display recovery message as a toast notification or banner instead of just logging
2. **Session Extension**: Add "Keep Working" button to extend session before expiration
3. **Session Persistence**: Store session ID in localStorage to survive page refreshes
4. **Expiration Warning**: Show warning 5 minutes before session expires
5. **Analytics**: Track session expiration metrics in analytics dashboard

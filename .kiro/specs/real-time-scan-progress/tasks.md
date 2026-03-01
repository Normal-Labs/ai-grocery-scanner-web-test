# Implementation Plan: Real-Time Scan Progress

## Overview

This implementation plan follows a 5-phase approach to build a real-time progress feedback system for product scanning. The system uses Server-Sent Events (SSE) with polling fallback, progressive result delivery, and maintains backward compatibility with existing scan functionality.

## Tasks

### Phase 1: Core Infrastructure

- [x] 1. Create progress management infrastructure
  - [x] 1.1 Implement ProgressManager class with session management
    - Create `src/lib/progress/ProgressManager.ts`
    - Implement session creation, retrieval, and cleanup methods
    - Add in-memory session storage with Map
    - Implement event emission and buffering
    - Add resource cleanup with 5-second timeout
    - _Requirements: 1.7, 2.6, 7.3, 7.5_
  
  - [ ]* 1.2 Write property test for ProgressManager
    - **Property 6: Resource Cleanup on Disconnect**
    - **Validates: Requirements 2.6, 7.5**
  
  - [ ]* 1.3 Write unit tests for ProgressManager
    - Test session creation and cleanup
    - Test concurrent session handling
    - Test event buffering and emission
    - _Requirements: 7.3, 7.5_

- [x] 2. Implement progress event emission
  - [x] 2.1 Create ProgressEmitter class
    - Create `src/lib/progress/ProgressEmitter.ts`
    - Implement IProgressEmitter interface
    - Add methods for emitting progress, partial, and final events
    - Implement error event emission
    - Add rate limiting (max 1 event per 100ms)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 5.2, 7.2_
  
  - [ ]* 2.2 Write property test for event emission
    - **Property 1: Stage Event Emission**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 8.1, 8.2, 8.3, 8.4, 10.3**
  
  - [ ]* 2.3 Write property test for event structure
    - **Property 2: Event Structure Completeness**
    - **Validates: Requirements 1.7**
  
  - [ ]* 2.4 Write property test for event ordering
    - **Property 3: Event Chronological Ordering**
    - **Validates: Requirements 1.8, 10.4**
  
  - [ ]* 2.5 Write property test for rate limiting
    - **Property 19: Event Rate Limiting**
    - **Validates: Requirements 7.2**

- [x] 3. Add SSE streaming to scan API endpoint
  - [x] 3.1 Modify /api/scan route to support streaming
    - Update `src/app/api/scan/route.ts`
    - Add streaming parameter detection
    - Implement ReadableStream for SSE
    - Set appropriate headers (Content-Type: text/event-stream)
    - Integrate ProgressManager and ProgressEmitter
    - Maintain backward compatibility for non-streaming requests
    - _Requirements: 2.1, 2.3, 6.1, 6.2, 6.5_
  
  - [ ]* 3.2 Write property test for backward compatibility
    - **Property 15: Backward Compatibility for Non-Streaming Clients**
    - **Validates: Requirements 6.1, 6.3, 6.5**
  
  - [ ]* 3.3 Write property test for client capability detection
    - **Property 16: Client Capability Detection**
    - **Validates: Requirements 6.2**
  
  - [ ]* 3.4 Write unit tests for API route
    - Test SSE stream creation
    - Test non-streaming fallback
    - Test authentication handling
    - _Requirements: 6.1, 6.2_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

### Phase 2: Frontend Integration

- [x] 5. Create useScanWithProgress hook
  - [x] 5.1 Implement hook with SSE support
    - Create `src/hooks/useScanWithProgress.ts`
    - Add state management for progress, partialResult, isLoading, error
    - Implement scanWithSSE function using EventSource
    - Add event parsing and state updates
    - Implement connection error handling
    - _Requirements: 4.1, 4.2, 6.4, 2.5_
  
  - [ ]* 5.2 Write property test for progress state availability
    - **Property 17: Progress State Availability**
    - **Validates: Requirements 6.4**
  
  - [ ]* 5.3 Write property test for frontend reconnection
    - **Property 5: Frontend Reconnection Behavior**
    - **Validates: Requirements 2.5**
  
  - [ ]* 5.4 Write unit tests for useScanWithProgress
    - Test SSE connection establishment
    - Test event parsing
    - Test state updates
    - Test error handling
    - _Requirements: 4.2, 2.5_

- [x] 6. Implement polling fallback
  - [x] 6.1 Create polling endpoint
    - Create `src/app/api/scan/progress/route.ts`
    - Implement GET handler for session progress
    - Return current session status and events
    - Handle session not found errors
    - _Requirements: 2.2_
  
  - [x] 6.2 Add polling support to useScanWithProgress
    - Implement scanWithPolling function
    - Add automatic fallback from SSE to polling
    - Implement polling interval (500ms)
    - Add polling cleanup on completion
    - _Requirements: 2.2, 2.5_
  
  - [ ]* 6.3 Write unit tests for polling
    - Test polling endpoint responses
    - Test SSE to polling fallback
    - Test polling cleanup
    - _Requirements: 2.2_

- [x] 7. Enhance ProgressTracker component
  - [x] 7.1 Extend ProgressTracker for scan stages
    - Update `src/components/ProgressTracker.tsx`
    - Add SCAN_STEP_INFO mapping for all stages
    - Add support for displaying partial results
    - Add timeout warning display (30 seconds)
    - Add retry button for errors
    - Implement smooth transitions between stages
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.7, 5.1, 5.3, 5.4_
  
  - [ ]* 7.2 Write property test for UI state synchronization
    - **Property 9: UI State Synchronization**
    - **Validates: Requirements 4.2, 4.3, 4.7**
  
  - [ ]* 7.3 Write unit tests for ProgressTracker
    - Test stage display updates
    - Test partial result rendering
    - Test error message display
    - Test retry button functionality
    - Test timeout warning
    - _Requirements: 4.2, 4.3, 5.1, 5.3_

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

### Phase 3: Progressive Delivery & Orchestrator Integration

- [x] 9. Enhance ScanOrchestrator with progress events
  - [x] 9.1 Add progress emission to ScanOrchestrator
    - Update `src/lib/orchestrators/ScanOrchestrator.ts`
    - Add optional progressEmitter parameter to processScan
    - Emit "barcode_check" event at start
    - Emit "cache_check" event before cache lookup
    - Emit "database_check" event before database queries
    - Emit "ai_research" event before AI calls
    - Emit final result event on completion
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.8_
  
  - [ ]* 9.2 Write property test for non-blocking emission
    - **Property 18: Non-Blocking Event Emission**
    - **Validates: Requirements 7.1**
  
  - [ ]* 9.3 Write integration tests for ScanOrchestrator
    - Test event emission at all stages
    - Test event ordering
    - Test backward compatibility (no emitter)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.8_

- [ ] 10. Enhance ScanOrchestratorMultiTier with progress events
  - [ ] 10.1 Add progress emission to ScanOrchestratorMultiTier
    - Update `src/lib/orchestrators/ScanOrchestratorMultiTier.ts`
    - Add optional progressEmitter parameter to scan method
    - Emit tier-specific events (tier1, tier2, tier3, tier4)
    - Include tier number in event metadata
    - Emit tier transition events on fallback
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_
  
  - [ ]* 10.2 Write property test for tier metadata
    - **Property 22: Tier Metadata Inclusion**
    - **Validates: Requirements 8.6**
  
  - [ ]* 10.3 Write property test for tier transitions
    - **Property 21: Tier Transition Event Emission**
    - **Validates: Requirements 8.5**
  
  - [ ]* 10.4 Write property test for concurrent session isolation
    - **Property 20: Concurrent Session Isolation**
    - **Validates: Requirements 7.3**

- [ ] 11. Implement progressive result delivery
  - [ ] 11.1 Add partial result emission for premium scans
    - Update ScanOrchestratorMultiTier to detect product identification completion
    - Emit partial result with product information
    - Continue with dimension analysis after partial emission
    - Emit dimension-specific progress events (health, preservatives, allergies, sustainability, carbon)
    - Emit final result with complete insights
    - _Requirements: 3.1, 3.2, 1.6_
  
  - [ ]* 11.2 Write property test for progressive delivery trigger
    - **Property 7: Progressive Delivery Trigger**
    - **Validates: Requirements 3.1**
  
  - [ ]* 11.3 Write property test for final response completeness
    - **Property 8: Final Response Completeness**
    - **Validates: Requirements 3.2**
  
  - [ ]* 11.4 Write property test for partial vs complete indication
    - **Property 10: Partial vs Complete Response Indication**
    - **Validates: Requirements 3.6**
  
  - [ ]* 11.5 Write property test for non-progressive fallback
    - **Property 11: Non-Progressive Fallback**
    - **Validates: Requirements 3.5**
  
  - [ ] 11.6 Update frontend to display partial results
    - Modify useScanWithProgress to handle partial events
    - Update ProgressTracker to show product info immediately
    - Add smooth transition to complete results
    - _Requirements: 3.3, 3.4_
  
  - [ ]* 11.7 Write integration tests for progressive delivery
    - Test partial result display
    - Test final result update
    - Test non-progressive scenarios
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

### Phase 4: Error Handling & Robustness

- [ ] 13. Implement comprehensive error handling
  - [ ] 13.1 Add connection error handling
    - Implement connection interruption detection in ProgressManager
    - Add automatic reconnection logic in useScanWithProgress
    - Continue backend processing on disconnect (for caching)
    - Display connection error messages in UI
    - _Requirements: 2.4, 2.5, 5.5, 5.6_
  
  - [ ]* 13.2 Write property test for connection interruption handling
    - **Property 4: Connection Interruption Handling**
    - **Validates: Requirements 2.4**
  
  - [ ]* 13.3 Write property test for backend processing continuation
    - **Property 14: Backend Processing Continuation**
    - **Validates: Requirements 5.6**
  
  - [ ] 13.2 Add scan processing error handling
    - Implement error event emission in orchestrators
    - Add retryable flag to error events
    - Display user-friendly error messages
    - Add retry button functionality
    - _Requirements: 5.2, 5.3, 5.4_
  
  - [ ]* 13.5 Write property test for error event emission
    - **Property 12: Error Event Emission**
    - **Validates: Requirements 5.2**
  
  - [ ]* 13.6 Write property test for error display
    - **Property 13: Error Display**
    - **Validates: Requirements 5.3**
  
  - [ ] 13.7 Add timeout handling
    - Implement 30-second timeout warning in frontend
    - Continue processing after timeout warning
    - Add timeout event type
    - _Requirements: 5.1_
  
  - [ ] 13.8 Add resource exhaustion protection
    - Implement session limits per user (max 3)
    - Add session timeout cleanup (60 seconds)
    - Implement memory monitoring
    - Add graceful degradation for high load
    - _Requirements: 7.5_
  
  - [ ]* 13.9 Write unit tests for error scenarios
    - Test connection errors
    - Test processing errors
    - Test timeout warnings
    - Test resource limits
    - _Requirements: 2.4, 5.1, 5.2, 5.3_

- [ ] 14. Add logging and monitoring
  - [ ] 14.1 Implement progress event logging
    - Add logging to ProgressManager for all events
    - Log connection establishment and disconnection
    - Log session duration on completion
    - Log complete event sequence for successful scans
    - Log failure stage and error details for failed scans
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  
  - [ ]* 14.2 Write property test for progress event logging
    - **Property 23: Progress Event Logging**
    - **Validates: Requirements 9.1**
  
  - [ ]* 14.3 Write property test for connection lifecycle logging
    - **Property 24: Connection Lifecycle Logging**
    - **Validates: Requirements 9.2, 9.3**
  
  - [ ]* 14.4 Write property test for scan duration logging
    - **Property 25: Scan Duration Logging**
    - **Validates: Requirements 9.4**
  
  - [ ]* 14.5 Write property test for success sequence logging
    - **Property 26: Success Sequence Logging**
    - **Validates: Requirements 9.5**
  
  - [ ]* 14.6 Write property test for failure detail logging
    - **Property 27: Failure Detail Logging**
    - **Validates: Requirements 9.6**

- [ ] 15. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

### Phase 5: Testing, Optimization & Documentation

- [ ] 16. Complete integration testing
  - [ ]* 16.1 Write end-to-end test for SSE flow
    - Test complete scan with SSE streaming
    - Verify all progress events received
    - Verify final result correctness
    - _Requirements: 2.1, 4.1, 4.2_
  
  - [ ]* 16.2 Write end-to-end test for polling flow
    - Test complete scan with polling fallback
    - Verify progress updates via polling
    - Verify final result correctness
    - _Requirements: 2.2_
  
  - [ ]* 16.3 Write end-to-end test for progressive delivery
    - Test premium scan with partial results
    - Verify partial result received first
    - Verify final result with all insights
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [ ]* 16.4 Write end-to-end test for multi-tier scan
    - Test tier progression and events
    - Verify tier metadata in events
    - Test tier fallback scenarios
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_
  
  - [ ]* 16.5 Write end-to-end test for error scenarios
    - Test connection interruption recovery
    - Test scan failure with retry
    - Test timeout warning display
    - _Requirements: 2.4, 2.5, 5.1, 5.2, 5.3, 5.4_
  
  - [ ]* 16.6 Write end-to-end test for backward compatibility
    - Test non-streaming client behavior
    - Verify traditional response format
    - Verify no breaking changes
    - _Requirements: 6.1, 6.2, 6.5_
  
  - [ ]* 16.7 Write end-to-end test for concurrent scans
    - Test multiple simultaneous scans
    - Verify session isolation
    - Verify no cross-contamination
    - _Requirements: 7.3_

- [ ] 17. Performance optimization and validation
  - [ ] 17.1 Optimize event emission performance
    - Profile event emission overhead
    - Ensure non-blocking behavior
    - Optimize rate limiting implementation
    - Verify <100ms event frequency
    - _Requirements: 7.1, 7.2_
  
  - [ ] 17.2 Optimize resource cleanup
    - Profile session cleanup timing
    - Ensure cleanup within 5 seconds
    - Optimize memory usage
    - Add memory leak detection
    - _Requirements: 7.5_
  
  - [ ] 17.3 Test Vercel deployment constraints
    - Test SSE within execution time limits
    - Test connection handling in serverless
    - Test cold start performance
    - Verify polling fallback reliability
    - _Requirements: 2.3_
  
  - [ ]* 17.4 Run performance benchmarks
    - Measure scan throughput with/without streaming
    - Measure memory usage under load
    - Measure event emission latency
    - Verify no performance degradation
    - _Requirements: 7.1, 7.2, 7.5_

- [ ] 18. Final integration and polish
  - [ ] 18.1 Update scan components to use new hook
    - Update existing scan UI components
    - Replace useScan with useScanWithProgress where appropriate
    - Ensure smooth user experience
    - Test all scan flows end-to-end
    - _Requirements: 4.1, 4.2, 4.3, 4.7_
  
  - [ ] 18.2 Add TypeScript types and documentation
    - Export all public interfaces
    - Add JSDoc comments to public APIs
    - Create type definitions file
    - Document usage examples
    - _Requirements: All_
  
  - [ ] 18.3 Create usage examples and documentation
    - Document how to use useScanWithProgress
    - Document SSE vs polling behavior
    - Document error handling patterns
    - Add code examples for common scenarios
    - _Requirements: All_

- [ ] 19. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific examples, edge cases, and integration points
- The implementation uses TypeScript throughout
- SSE is the primary transport with polling as fallback
- Backward compatibility is maintained for existing scan functionality
- All 27 correctness properties from the design document are covered

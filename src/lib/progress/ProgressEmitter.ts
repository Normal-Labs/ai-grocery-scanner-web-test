/**
 * Progress Emitter
 * 
 * Interface and implementation for emitting progress events during scan operations.
 * Provides rate limiting and error handling for event emission.
 */

import { ProgressManager, ProgressEvent } from './ProgressManager';

export interface IProgressEmitter {
  emit(stage: string, message: string, metadata?: any): void;
  emitPartialResult(data: any): void;
  emitFinalResult(data: any): void;
  emitError(error: Error): void;
}

export class ProgressEmitter implements IProgressEmitter {
  private lastEmitTime: number = 0;
  private readonly MIN_EMIT_INTERVAL_MS = 100; // Rate limit: max 1 event per 100ms
  private pendingEmit: NodeJS.Timeout | null = null;

  constructor(
    private sessionId: string,
    private manager: ProgressManager
  ) {}

  /**
   * Emit a progress event
   */
  emit(stage: string, message: string, metadata?: any): void {
    const event: ProgressEvent = {
      type: 'progress',
      stage,
      message,
      timestamp: Date.now(),
      metadata,
    };

    this.emitWithRateLimit(event);
  }

  /**
   * Emit a partial result (e.g., product info before dimension analysis)
   */
  emitPartialResult(data: any): void {
    const event: ProgressEvent = {
      type: 'partial',
      timestamp: Date.now(),
      data,
    };

    // Partial results bypass rate limiting
    this.manager.emitEvent(this.sessionId, event);
  }

  /**
   * Emit the final result
   */
  emitFinalResult(data: any): void {
    // Clear any pending emits
    if (this.pendingEmit) {
      clearTimeout(this.pendingEmit);
      this.pendingEmit = null;
    }

    this.manager.completeSession(this.sessionId, data);
  }

  /**
   * Emit an error event
   */
  emitError(error: Error): void {
    // Clear any pending emits
    if (this.pendingEmit) {
      clearTimeout(this.pendingEmit);
      this.pendingEmit = null;
    }

    this.manager.errorSession(this.sessionId, error);
  }

  /**
   * Emit event with rate limiting
   */
  private emitWithRateLimit(event: ProgressEvent): void {
    const now = Date.now();
    const timeSinceLastEmit = now - this.lastEmitTime;

    if (timeSinceLastEmit >= this.MIN_EMIT_INTERVAL_MS) {
      // Emit immediately
      this.manager.emitEvent(this.sessionId, event);
      this.lastEmitTime = now;
    } else {
      // Schedule emit after rate limit period
      if (this.pendingEmit) {
        clearTimeout(this.pendingEmit);
      }

      const delay = this.MIN_EMIT_INTERVAL_MS - timeSinceLastEmit;
      this.pendingEmit = setTimeout(() => {
        this.manager.emitEvent(this.sessionId, event);
        this.lastEmitTime = Date.now();
        this.pendingEmit = null;
      }, delay);
    }
  }
}

/**
 * Stage definitions for scan progress
 */
export enum ScanStage {
  BARCODE_CHECK = 'barcode_check',
  CACHE_CHECK = 'cache_check',
  DATABASE_CHECK = 'database_check',
  AI_RESEARCH = 'ai_research',
  PRODUCT_IDENTIFICATION = 'product_identification',
  DIMENSION_HEALTH = 'dimension_health',
  DIMENSION_PRESERVATIVES = 'dimension_preservatives',
  DIMENSION_ALLERGIES = 'dimension_allergies',
  DIMENSION_SUSTAINABILITY = 'dimension_sustainability',
  DIMENSION_CARBON = 'dimension_carbon',
  COMPLETE = 'complete',
}

/**
 * Multi-tier scan stages
 */
export enum MultiTierStage {
  TIER1_CACHE = 'tier1',
  TIER2_EXTRACT = 'tier2',
  TIER3_DISCOVER = 'tier3',
  TIER4_ANALYZE = 'tier4',
  TIER_TRANSITION = 'tier_transition',
}

/**
 * User-friendly stage messages
 */
export const STAGE_MESSAGES: Record<string, string> = {
  [ScanStage.BARCODE_CHECK]: 'Checking for barcode',
  [ScanStage.CACHE_CHECK]: 'Checking cache',
  [ScanStage.DATABASE_CHECK]: 'Checking databases',
  [ScanStage.AI_RESEARCH]: 'Performing AI research',
  [ScanStage.PRODUCT_IDENTIFICATION]: 'Identifying product',
  [ScanStage.DIMENSION_HEALTH]: 'Analyzing health insights',
  [ScanStage.DIMENSION_PRESERVATIVES]: 'Analyzing preservatives',
  [ScanStage.DIMENSION_ALLERGIES]: 'Checking for allergens',
  [ScanStage.DIMENSION_SUSTAINABILITY]: 'Evaluating sustainability',
  [ScanStage.DIMENSION_CARBON]: 'Calculating carbon footprint',
  [MultiTierStage.TIER1_CACHE]: 'Checking barcode in cache',
  [MultiTierStage.TIER2_EXTRACT]: 'Extracting text from image',
  [MultiTierStage.TIER3_DISCOVER]: 'Discovering product via API',
  [MultiTierStage.TIER4_ANALYZE]: 'Analyzing image with AI',
  [MultiTierStage.TIER_TRANSITION]: 'Trying alternative approach',
};

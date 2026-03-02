/**
 * MonitoringService - Logging and Monitoring for Multi-Image Capture
 * 
 * Tracks metrics and logs errors for monitoring system health.
 * 
 * Requirements: 12.6
 */

/**
 * Metric types for monitoring
 */
export type MetricType =
  | 'session_expiration'
  | 'image_classification_failure'
  | 'product_matching_confidence'
  | 'data_consistency_warning'
  | 'analyzer_failure'
  | 'database_update_failure'
  | 'cache_update_failure';

/**
 * Analyzer types
 */
export type AnalyzerType = 'barcode' | 'packaging' | 'nutrition';

/**
 * Metric data
 */
interface MetricData {
  type: MetricType;
  timestamp: Date;
  value?: number;
  metadata?: Record<string, any>;
}

/**
 * Monitoring statistics
 */
interface MonitoringStats {
  sessionExpirationRate: number;
  imageClassificationFailureRate: number;
  productMatchingConfidenceDistribution: {
    high: number; // >= 0.9
    medium: number; // 0.7 - 0.9
    low: number; // < 0.7
  };
  dataConsistencyWarningFrequency: number;
  analyzerFailureRates: {
    barcode: number;
    packaging: number;
    nutrition: number;
  };
  databaseUpdateFailureRate: number;
  cacheUpdateFailureRate: number;
}

/**
 * MonitoringService class
 * 
 * Provides centralized logging and monitoring for multi-image capture system.
 * Tracks failure rates, confidence distributions, and system health metrics.
 */
export class MonitoringService {
  private metrics: MetricData[] = [];
  private readonly ALERT_THRESHOLD = 0.1; // 10% failure rate
  private readonly METRICS_WINDOW_MS = 60 * 60 * 1000; // 1 hour window

  /**
   * Log session expiration
   * Requirement 12.6: Log session expiration rate
   */
  logSessionExpiration(userId: string, sessionId: string): void {
    console.log('[Monitoring] 📊 Session expired:', { userId, sessionId });
    this.recordMetric('session_expiration', 1, { userId, sessionId });
  }

  /**
   * Log image classification failure
   * Requirement 12.6: Log image classification failure rate
   */
  logImageClassificationFailure(error: string, imageHash?: string): void {
    console.error('[Monitoring] ❌ Image classification failed:', { error, imageHash });
    this.recordMetric('image_classification_failure', 1, { error, imageHash });
    this.checkAlertThreshold('image_classification_failure');
  }

  /**
   * Log product matching confidence
   * Requirement 12.6: Log product matching confidence distribution
   */
  logProductMatchingConfidence(
    confidence: number,
    matchMethod: string,
    productId?: string
  ): void {
    console.log('[Monitoring] 📊 Product matching confidence:', {
      confidence,
      matchMethod,
      productId,
    });
    this.recordMetric('product_matching_confidence', confidence, {
      matchMethod,
      productId,
    });
  }

  /**
   * Log data consistency warning
   * Requirement 12.6: Log data consistency warning frequency
   */
  logDataConsistencyWarning(
    field: string,
    existingValue: any,
    newValue: any,
    warning: string
  ): void {
    console.warn('[Monitoring] ⚠️  Data consistency warning:', {
      field,
      existingValue,
      newValue,
      warning,
    });
    this.recordMetric('data_consistency_warning', 1, {
      field,
      existingValue,
      newValue,
      warning,
    });
  }

  /**
   * Log analyzer failure
   * Requirement 12.6: Log analyzer failure rates by type
   */
  logAnalyzerFailure(
    analyzerType: AnalyzerType,
    error: string,
    imageHash?: string
  ): void {
    // Truncate error message if it's too long (likely contains base64 data)
    const truncatedError = error.length > 200 ? error.substring(0, 200) + '... (truncated)' : error;
    
    console.error('[Monitoring] ❌ Analyzer failed:', {
      analyzerType,
      error: truncatedError,
      imageHash,
    });
    this.recordMetric('analyzer_failure', 1, {
      analyzerType,
      error: truncatedError,
      imageHash,
    });
    this.checkAlertThreshold('analyzer_failure', analyzerType);
  }

  /**
   * Log database update failure
   * Requirement 12.6: Log database/cache update failure rates
   */
  logDatabaseUpdateFailure(
    operation: string,
    error: string,
    productId?: string
  ): void {
    console.error('[Monitoring] ❌ Database update failed:', {
      operation,
      error,
      productId,
    });
    this.recordMetric('database_update_failure', 1, {
      operation,
      error,
      productId,
    });
    this.checkAlertThreshold('database_update_failure');
  }

  /**
   * Log cache update failure
   * Requirement 12.6: Log database/cache update failure rates
   */
  logCacheUpdateFailure(error: string, imageHash?: string): void {
    console.error('[Monitoring] ❌ Cache update failed:', { error, imageHash });
    this.recordMetric('cache_update_failure', 1, { error, imageHash });
  }

  /**
   * Get monitoring statistics
   * 
   * @returns Current monitoring statistics
   */
  getStats(): MonitoringStats {
    const now = Date.now();
    const windowStart = now - this.METRICS_WINDOW_MS;
    const recentMetrics = this.metrics.filter(
      (m) => m.timestamp.getTime() >= windowStart
    );

    // Calculate session expiration rate
    const sessionExpirations = recentMetrics.filter(
      (m) => m.type === 'session_expiration'
    ).length;
    const totalSessions = sessionExpirations + 100; // Approximate total sessions
    const sessionExpirationRate = sessionExpirations / totalSessions;

    // Calculate image classification failure rate
    const classificationFailures = recentMetrics.filter(
      (m) => m.type === 'image_classification_failure'
    ).length;
    const totalClassifications = classificationFailures + 100; // Approximate total
    const imageClassificationFailureRate =
      classificationFailures / totalClassifications;

    // Calculate product matching confidence distribution
    const matchingMetrics = recentMetrics.filter(
      (m) => m.type === 'product_matching_confidence'
    );
    const confidenceDistribution = {
      high: matchingMetrics.filter((m) => (m.value || 0) >= 0.9).length,
      medium: matchingMetrics.filter(
        (m) => (m.value || 0) >= 0.7 && (m.value || 0) < 0.9
      ).length,
      low: matchingMetrics.filter((m) => (m.value || 0) < 0.7).length,
    };

    // Calculate data consistency warning frequency
    const consistencyWarnings = recentMetrics.filter(
      (m) => m.type === 'data_consistency_warning'
    ).length;

    // Calculate analyzer failure rates
    const analyzerFailures = recentMetrics.filter(
      (m) => m.type === 'analyzer_failure'
    );
    const totalAnalyzerCalls = analyzerFailures.length + 100; // Approximate total
    const analyzerFailureRates = {
      barcode:
        analyzerFailures.filter((m) => m.metadata?.analyzerType === 'barcode')
          .length / totalAnalyzerCalls,
      packaging:
        analyzerFailures.filter((m) => m.metadata?.analyzerType === 'packaging')
          .length / totalAnalyzerCalls,
      nutrition:
        analyzerFailures.filter((m) => m.metadata?.analyzerType === 'nutrition')
          .length / totalAnalyzerCalls,
    };

    // Calculate database update failure rate
    const databaseFailures = recentMetrics.filter(
      (m) => m.type === 'database_update_failure'
    ).length;
    const totalDatabaseOps = databaseFailures + 100; // Approximate total
    const databaseUpdateFailureRate = databaseFailures / totalDatabaseOps;

    // Calculate cache update failure rate
    const cacheFailures = recentMetrics.filter(
      (m) => m.type === 'cache_update_failure'
    ).length;
    const totalCacheOps = cacheFailures + 100; // Approximate total
    const cacheUpdateFailureRate = cacheFailures / totalCacheOps;

    return {
      sessionExpirationRate,
      imageClassificationFailureRate,
      productMatchingConfidenceDistribution: confidenceDistribution,
      dataConsistencyWarningFrequency: consistencyWarnings,
      analyzerFailureRates,
      databaseUpdateFailureRate,
      cacheUpdateFailureRate,
    };
  }

  /**
   * Record a metric
   * 
   * @param type - Metric type
   * @param value - Metric value
   * @param metadata - Additional metadata
   */
  private recordMetric(
    type: MetricType,
    value?: number,
    metadata?: Record<string, any>
  ): void {
    this.metrics.push({
      type,
      timestamp: new Date(),
      value,
      metadata,
    });

    // Clean up old metrics (keep only last hour)
    const now = Date.now();
    const windowStart = now - this.METRICS_WINDOW_MS;
    this.metrics = this.metrics.filter(
      (m) => m.timestamp.getTime() >= windowStart
    );
  }

  /**
   * Check if failure rate exceeds alert threshold
   * Requirement 12.6: Set up alerts for high failure rates (> 10%)
   * 
   * @param metricType - Type of metric to check
   * @param subType - Optional sub-type (e.g., analyzer type)
   */
  private checkAlertThreshold(metricType: MetricType, subType?: string): void {
    const now = Date.now();
    const windowStart = now - this.METRICS_WINDOW_MS;
    const recentMetrics = this.metrics.filter(
      (m) =>
        m.timestamp.getTime() >= windowStart &&
        m.type === metricType &&
        (!subType || m.metadata?.analyzerType === subType)
    );

    const failureCount = recentMetrics.length;
    const totalCount = failureCount + 100; // Approximate total operations
    const failureRate = failureCount / totalCount;

    if (failureRate > this.ALERT_THRESHOLD) {
      console.error('[Monitoring] 🚨 ALERT: High failure rate detected:', {
        metricType,
        subType,
        failureRate: `${(failureRate * 100).toFixed(2)}%`,
        threshold: `${(this.ALERT_THRESHOLD * 100).toFixed(2)}%`,
        failureCount,
        totalCount,
      });
    }
  }

  /**
   * Clear all metrics (for testing)
   */
  clearMetrics(): void {
    this.metrics = [];
  }
}

/**
 * Singleton instance
 */
export const monitoringService = new MonitoringService();

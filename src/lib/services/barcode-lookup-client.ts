/**
 * Barcode Lookup API Client
 * 
 * Handles communication with the Barcode Lookup API for product discovery.
 * Implements rate limiting (100 requests/minute) and exponential backoff.
 */

import type { ProductMetadata } from '../types/multi-tier';

export interface BarcodeLookupResult {
  barcode: string;
  format: string;
  product_name?: string;
  brand?: string;
  category?: string;
  confidence: number;
}

export interface BarcodeLookupResponse {
  products: BarcodeLookupResult[];
}

/**
 * Circuit breaker states for API failure handling
 */
enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

/**
 * Rate limiter for API requests
 */
class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  canMakeRequest(): boolean {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    return this.requests.length < this.maxRequests;
  }

  recordRequest(): void {
    this.requests.push(Date.now());
  }

  getWaitTime(): number {
    if (this.requests.length === 0) return 0;
    const oldestRequest = this.requests[0];
    const timeElapsed = Date.now() - oldestRequest;
    return Math.max(0, this.windowMs - timeElapsed);
  }
}

/**
 * Circuit breaker for API failure handling
 */
class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private readonly failureThreshold: number = 5;
  private readonly resetTimeout: number = 60000; // 1 minute

  recordSuccess(): void {
    this.failureCount = 0;
    this.state = CircuitState.CLOSED;
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
      console.warn('[Circuit Breaker] Circuit opened due to failures');
    }
  }

  canMakeRequest(): boolean {
    if (this.state === CircuitState.CLOSED) {
      return true;
    }

    if (this.state === CircuitState.OPEN) {
      const timeSinceFailure = Date.now() - this.lastFailureTime;
      if (timeSinceFailure >= this.resetTimeout) {
        console.log('[Circuit Breaker] Attempting half-open state');
        this.state = CircuitState.HALF_OPEN;
        return true;
      }
      return false;
    }

    // HALF_OPEN state - allow one request to test
    return true;
  }

  getState(): CircuitState {
    return this.state;
  }
}

/**
 * Barcode Lookup API Client
 */
export class BarcodeLookupClient {
  private readonly apiKey: string;
  private readonly baseUrl: string = 'https://api.barcodelookup.com/v3';
  private rateLimiter: RateLimiter;
  private circuitBreaker: CircuitBreaker;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.BARCODE_LOOKUP_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('[Barcode Lookup] API key not configured');
    }

    this.rateLimiter = new RateLimiter(100, 60000); // 100 requests per minute
    this.circuitBreaker = new CircuitBreaker();
  }

  /**
   * Search for products by metadata (name, brand, category)
   */
  async searchProducts(metadata: ProductMetadata): Promise<BarcodeLookupResult[]> {
    if (!this.apiKey) {
      throw new Error('Barcode Lookup API key is not configured');
    }

    // Check circuit breaker
    if (!this.circuitBreaker.canMakeRequest()) {
      throw new Error('Barcode Lookup API circuit breaker is open');
    }

    // Check rate limit
    if (!this.rateLimiter.canMakeRequest()) {
      const waitTime = this.rateLimiter.getWaitTime();
      throw new Error(`Rate limit exceeded. Wait ${Math.ceil(waitTime / 1000)}s`);
    }

    // Build search query from metadata
    const searchTerms: string[] = [];
    if (metadata.productName) searchTerms.push(metadata.productName);
    if (metadata.brandName) searchTerms.push(metadata.brandName);
    if (metadata.size) searchTerms.push(metadata.size);

    const query = searchTerms.join(' ').trim();
    if (!query) {
      throw new Error('No search terms available in metadata');
    }

    console.log(`[Barcode Lookup] Searching for: "${query}"`);

    try {
      const response = await this.makeRequestWithRetry(query);
      this.circuitBreaker.recordSuccess();
      this.rateLimiter.recordRequest();
      return response;
    } catch (error) {
      this.circuitBreaker.recordFailure();
      throw error;
    }
  }

  /**
   * Make API request with exponential backoff retry
   */
  private async makeRequestWithRetry(
    query: string,
    attempt: number = 1,
    maxAttempts: number = 3
  ): Promise<BarcodeLookupResult[]> {
    try {
      const url = `${this.baseUrl}/products?search=${encodeURIComponent(query)}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      // Handle rate limit response
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 1000 * Math.pow(2, attempt);
        
        if (attempt < maxAttempts) {
          console.log(`[Barcode Lookup] Rate limited, retrying in ${waitTime}ms (attempt ${attempt}/${maxAttempts})`);
          await this.sleep(waitTime);
          return this.makeRequestWithRetry(query, attempt + 1, maxAttempts);
        }
        
        throw new Error('Rate limit exceeded after retries');
      }

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data: BarcodeLookupResponse = await response.json();
      
      if (!data.products || data.products.length === 0) {
        console.log('[Barcode Lookup] No products found');
        return [];
      }

      console.log(`[Barcode Lookup] Found ${data.products.length} products`);
      return data.products;

    } catch (error) {
      if (attempt < maxAttempts) {
        const waitTime = 1000 * Math.pow(2, attempt); // Exponential backoff
        console.log(`[Barcode Lookup] Error, retrying in ${waitTime}ms (attempt ${attempt}/${maxAttempts})`);
        await this.sleep(waitTime);
        return this.makeRequestWithRetry(query, attempt + 1, maxAttempts);
      }
      
      throw error;
    }
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get circuit breaker status
   */
  getStatus() {
    return {
      circuitState: this.circuitBreaker.getState(),
      canMakeRequest: this.circuitBreaker.canMakeRequest() && this.rateLimiter.canMakeRequest(),
    };
  }
}

// Singleton instance
export const barcodeLookupClient = new BarcodeLookupClient();

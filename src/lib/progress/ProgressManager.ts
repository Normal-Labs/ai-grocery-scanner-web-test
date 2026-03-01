/**
 * Progress Manager
 * 
 * Manages progress sessions and event distribution for real-time scan progress tracking.
 * Handles session lifecycle, event emission, and resource cleanup.
 */

export interface ProgressEvent {
  type: 'progress' | 'partial' | 'complete' | 'error';
  timestamp: number;
  stage?: string;
  message?: string;
  metadata?: Record<string, any>;
  data?: any;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
    details?: any;
  };
}

export interface ProgressSession {
  sessionId: string;
  userId: string;
  startTime: number;
  lastEventTime: number;
  events: ProgressEvent[];
  controller?: ReadableStreamDefaultController;
  status: 'active' | 'complete' | 'error';
  result?: any;
  error?: Error;
  connectionError?: Error;
}

export class ProgressManager {
  private sessions: Map<string, ProgressSession> = new Map();
  private readonly MAX_SESSIONS_PER_USER = 3;
  private readonly SESSION_TIMEOUT_MS = 60000; // 60 seconds
  private readonly CLEANUP_DELAY_MS = 5000; // 5 seconds
  private cleanupTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Create a new progress session
   */
  createSession(userId: string): string {
    // Clean up old sessions for this user
    this.cleanupUserSessions(userId);

    // Check session limit
    const userSessions = Array.from(this.sessions.values())
      .filter(s => s.userId === userId && s.status === 'active');

    if (userSessions.length >= this.MAX_SESSIONS_PER_USER) {
      throw new Error('Too many concurrent scans. Please wait for existing scans to complete.');
    }

    // Create new session
    const sessionId = crypto.randomUUID();
    const session: ProgressSession = {
      sessionId,
      userId,
      startTime: Date.now(),
      lastEventTime: Date.now(),
      events: [],
      status: 'active',
    };

    this.sessions.set(sessionId, session);
    console.log(`[ProgressManager] Session created: ${sessionId} for user: ${userId}`);

    return sessionId;
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): ProgressSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Emit a progress event to a session
   */
  emitEvent(sessionId: string, event: ProgressEvent): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.warn(`[ProgressManager] Session not found: ${sessionId}`);
      return;
    }

    // Update event timestamp if not set
    if (!event.timestamp) {
      event.timestamp = Date.now();
    }

    // Add event to session
    session.events.push(event);
    session.lastEventTime = Date.now();

    // Log event
    console.log(`[ProgressManager] Event emitted for session ${sessionId}:`, {
      type: event.type,
      stage: event.stage,
      message: event.message,
      timestamp: event.timestamp,
    });

    // Send event through stream controller if available
    if (session.controller) {
      try {
        const encoder = new TextEncoder();
        const data = `data: ${JSON.stringify(event)}\n\n`;
        session.controller.enqueue(encoder.encode(data));
      } catch (error) {
        console.error(`[ProgressManager] Error sending event to stream:`, error);
        session.connectionError = error as Error;
      }
    }
  }

  /**
   * Complete a session with final result
   */
  completeSession(sessionId: string, result: any): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.warn(`[ProgressManager] Session not found: ${sessionId}`);
      return;
    }

    session.status = 'complete';
    session.result = result;

    const duration = Date.now() - session.startTime;
    console.log(`[ProgressManager] Session completed: ${sessionId}, duration: ${duration}ms`);
    console.log(`[ProgressManager] Event sequence for ${sessionId}:`, 
      session.events.map(e => ({ type: e.type, stage: e.stage, message: e.message }))
    );

    // Emit complete event
    this.emitEvent(sessionId, {
      type: 'complete',
      timestamp: Date.now(),
      data: result,
    });

    // Schedule cleanup
    this.scheduleCleanup(sessionId);
  }

  /**
   * Mark a session as errored
   */
  errorSession(sessionId: string, error: Error): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.warn(`[ProgressManager] Session not found: ${sessionId}`);
      return;
    }

    session.status = 'error';
    session.error = error;

    const lastEvent = session.events[session.events.length - 1];
    console.error(`[ProgressManager] Session failed: ${sessionId}, stage: ${lastEvent?.stage}, error:`, error);

    // Emit error event
    this.emitEvent(sessionId, {
      type: 'error',
      timestamp: Date.now(),
      error: {
        code: 'SCAN_ERROR',
        message: error.message,
        retryable: true,
        details: error,
      },
    });

    // Schedule cleanup
    this.scheduleCleanup(sessionId);
  }

  /**
   * Handle connection error
   */
  handleConnectionError(sessionId: string, error: Error): void {
    console.error(`[ProgressManager] Connection error for session ${sessionId}:`, error);

    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.connectionError = error;
    // Don't stop processing - continue for caching
  }

  /**
   * Clean up a session and release resources
   */
  cleanup(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    console.log(`[ProgressManager] Cleaning up session: ${sessionId}`);

    // Close stream controller if it exists and is not already closed
    if (session.controller) {
      try {
        // Check if the controller's desiredSize is null (indicates it's closed)
        // @ts-ignore - desiredSize exists but TypeScript doesn't know about it
        if (session.controller.desiredSize !== null) {
          session.controller.close();
        }
      } catch (error) {
        // Ignore errors if controller is already closed
        if (error instanceof Error && error.message.includes('already closed')) {
          // Expected - controller was already closed
        } else {
          console.error(`[ProgressManager] Error closing stream controller:`, error);
        }
      }
    }

    // Clear cleanup timer
    const timer = this.cleanupTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.cleanupTimers.delete(sessionId);
    }

    // Remove session
    this.sessions.delete(sessionId);
    console.log(`[ProgressManager] Session cleaned up: ${sessionId}`);
  }

  /**
   * Schedule cleanup for a session
   */
  private scheduleCleanup(sessionId: string): void {
    // Clear existing timer if any
    const existingTimer = this.cleanupTimers.get(sessionId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule new cleanup
    const timer = setTimeout(() => {
      this.cleanup(sessionId);
    }, this.CLEANUP_DELAY_MS);

    this.cleanupTimers.set(sessionId, timer);
  }

  /**
   * Clean up old sessions for a user
   */
  private cleanupUserSessions(userId: string): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        const isTimedOut = now - session.lastEventTime > this.SESSION_TIMEOUT_MS;
        const isInactive = session.status !== 'active';

        if (isTimedOut || isInactive) {
          this.cleanup(sessionId);
        }
      }
    }
  }

  /**
   * Set stream controller for a session
   */
  setController(sessionId: string, controller: ReadableStreamDefaultController): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.controller = controller;
      console.log(`[ProgressManager] Stream controller set for session: ${sessionId}`);
    }
  }

  /**
   * Get all sessions (for debugging/monitoring)
   */
  getAllSessions(): ProgressSession[] {
    return Array.from(this.sessions.values());
  }
}

// Singleton instance
export const progressManager = new ProgressManager();

/**
 * SessionManager - Multi-Image Capture Session Management
 * 
 * Manages capture sessions in MongoDB with 30-minute TTL.
 * Tracks multi-image submissions and extends session lifetime on each update.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 12.1, 12.3, 12.4, 12.5
 */

import { Collection } from 'mongodb';
import { getMongoClient } from '@/lib/mongodb/client';
import { MultiImageSessionDocument } from '@/lib/mongodb/types';
import { monitoringService } from './MonitoringService';

/**
 * Capture session interface (without MongoDB _id)
 */
export interface CaptureSession {
  sessionId: string;
  userId: string;
  productId: string | null;
  capturedImageTypes: ('barcode' | 'packaging' | 'nutrition_label')[];
  imageHashes: Array<{
    hash: string;
    imageType: 'barcode' | 'packaging' | 'nutrition_label';
    timestamp: Date;
  }>;
  workflowMode: 'guided' | 'progressive';
  createdAt: Date;
  lastUpdatedAt: Date;
  expiresAt: Date;
  status: 'active' | 'completed' | 'expired';
}

/**
 * SessionManager class
 * 
 * Provides methods for creating, updating, and managing multi-image capture sessions.
 */
export class SessionManager {
  private static readonly COLLECTION_NAME = 'multi_image_sessions';
  private static readonly SESSION_TTL_MINUTES = 30;

  /**
   * Get MongoDB collection with indexes
   * Requirements: 3.1, 3.2, 12.1, 12.2
   */
  private async getCollection(): Promise<Collection<MultiImageSessionDocument>> {
    const db = await getMongoClient();
    const collection = db.collection<MultiImageSessionDocument>(SessionManager.COLLECTION_NAME);
    
    // Ensure indexes exist (idempotent operation)
    await this.ensureIndexes(collection);
    
    return collection;
  }

  /**
   * Ensure required indexes exist
   * Requirements: 3.1, 3.3, 12.1
   */
  private async ensureIndexes(collection: Collection<MultiImageSessionDocument>): Promise<void> {
    try {
      // Create unique index on sessionId for fast lookups
      await collection.createIndex(
        { sessionId: 1 },
        { unique: true, name: 'sessionId_unique' }
      );

      // Create compound index on userId + status for querying active sessions
      await collection.createIndex(
        { userId: 1, status: 1 },
        { name: 'userId_status' }
      );

      // Create TTL index on expiresAt for automatic expiration (30 minutes)
      // Requirement 3.3: Session expires after 30 minutes of inactivity
      await collection.createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0, name: 'expiresAt_ttl' }
      );

      console.log('[SessionManager] ✅ Indexes ensured');
    } catch (error) {
      // Log error but don't throw - indexes might already exist
      console.error('[SessionManager] ⚠️  Error ensuring indexes:', error);
    }
  }

  /**
   * Create new session
   * Requirements: 3.1, 3.2
   * 
   * @param userId - User ID from Supabase Auth
   * @param workflowMode - Workflow type (guided or progressive)
   * @returns Promise resolving to new CaptureSession
   */
  async createSession(userId: string, workflowMode: 'guided' | 'progressive' = 'progressive'): Promise<CaptureSession> {
    try {
      const collection = await this.getCollection();
      
      const now = new Date();
      const expiresAt = new Date(now.getTime() + SessionManager.SESSION_TTL_MINUTES * 60 * 1000);
      
      const session: MultiImageSessionDocument = {
        sessionId: crypto.randomUUID(),
        userId,
        productId: null,
        capturedImageTypes: [],
        imageHashes: [],
        workflowMode,
        createdAt: now,
        lastUpdatedAt: now,
        expiresAt,
        status: 'active',
      };

      await collection.insertOne(session);
      
      console.log('[SessionManager] ✅ Created session:', {
        sessionId: session.sessionId,
        userId,
        workflowMode,
        expiresAt,
      });

      // Return without _id
      const { _id, ...sessionWithoutId } = session;
      return sessionWithoutId as CaptureSession;
    } catch (error) {
      console.error('[SessionManager] ❌ Failed to create session:', {
        userId,
        workflowMode,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Failed to create capture session. Please try again.');
    }
  }

  /**
   * Get active session for user and optional product
   * Requirements: 3.1, 3.5
   * 
   * @param userId - User ID from Supabase Auth
   * @param productId - Optional product ID to filter by
   * @returns Promise resolving to CaptureSession or null if not found
   */
  async getActiveSession(userId: string, productId?: string): Promise<CaptureSession | null> {
    try {
      const collection = await this.getCollection();
      
      const query: any = {
        userId,
        status: 'active',
      };
      
      if (productId) {
        query.productId = productId;
      }
      
      const session = await collection.findOne(query, {
        sort: { lastUpdatedAt: -1 }, // Get most recent session
      });
      
      if (!session) {
        console.log('[SessionManager] ℹ️  No active session found:', { userId, productId });
        return null;
      }
      
      // Return without _id
      const { _id, ...sessionWithoutId } = session;
      return sessionWithoutId as CaptureSession;
    } catch (error) {
      console.error('[SessionManager] ❌ Failed to get active session:', {
        userId,
        productId,
        error: error instanceof Error ? error.message : String(error),
      });
      // Return null instead of throwing - session lookup failure should not block workflow
      return null;
    }
  }
  /**
   * Get a specific session by sessionId
   *
   * @param sessionId - Session ID to retrieve
   * @returns Promise resolving to session or null if not found/expired
   */
  async getSessionById(sessionId: string): Promise<CaptureSession | null> {
    try {
      const collection = await this.getCollection();

      const session = await collection.findOne({
        sessionId,
        status: 'active',
      });

      if (!session) {
        console.log('[SessionManager] ℹ️  Session not found or expired:', sessionId);
        return null;
      }

      // Return without _id
      const { _id, ...sessionWithoutId } = session;
      return sessionWithoutId as CaptureSession;
    } catch (error) {
      console.error('[SessionManager] ❌ Failed to get session by ID:', {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }


  /**
   * Update session with new image
   * Requirements: 3.2, 3.3
   * 
   * @param sessionId - Session ID to update
   * @param imageHash - Hash of the captured image
   * @param imageType - Type of image captured
   * @param productId - Optional product ID (set after first image)
   * @returns Promise resolving to updated CaptureSession
   * @throws Error if session not found
   */
  async updateSession(
    sessionId: string,
    imageHash: string,
    imageType: 'barcode' | 'packaging' | 'nutrition_label',
    productId?: string
  ): Promise<CaptureSession> {
    try {
      const collection = await this.getCollection();
      
      const now = new Date();
      const expiresAt = new Date(now.getTime() + SessionManager.SESSION_TTL_MINUTES * 60 * 1000);
      
      const update: any = {
        $set: {
          lastUpdatedAt: now,
          expiresAt, // Extend TTL on each update (Requirement 3.3)
        },
        $push: {
          imageHashes: {
            hash: imageHash,
            imageType,
            timestamp: now,
          },
        },
        $addToSet: {
          capturedImageTypes: imageType, // Add to set (no duplicates)
        },
      };
      
      // Set productId if provided and not already set
      if (productId) {
        update.$set.productId = productId;
      }
      
      const result = await collection.findOneAndUpdate(
        { sessionId },
        update,
        { returnDocument: 'after' }
      );
      
      if (!result) {
        console.error('[SessionManager] ❌ Session not found for update:', { sessionId });
        throw new Error('Session not found. Your session may have expired. Please start a new capture.');
      }
      
      console.log('[SessionManager] ✅ Updated session:', {
        sessionId,
        imageType,
        capturedTypes: result.capturedImageTypes,
        expiresAt,
      });
      
      // Return without _id
      const { _id, ...sessionWithoutId } = result;
      return sessionWithoutId as CaptureSession;
    } catch (error) {
      console.error('[SessionManager] ❌ Failed to update session:', {
        sessionId,
        imageType,
        error: error instanceof Error ? error.message : String(error),
      });
      
      // Re-throw with user-friendly message if not already a user-friendly error
      if (error instanceof Error && error.message.includes('Session not found')) {
        throw error;
      }
      throw new Error('Failed to update capture session. Please try again.');
    }
  }

  /**
   * Close session (mark as completed)
   * Requirements: 3.1
   * 
   * @param sessionId - Session ID to close
   * @returns Promise resolving when session is closed
   */
  async closeSession(sessionId: string): Promise<void> {
    try {
      const collection = await this.getCollection();
      
      const result = await collection.updateOne(
        { sessionId },
        {
          $set: {
            status: 'completed',
            lastUpdatedAt: new Date(),
          },
        }
      );
      
      if (result.matchedCount === 0) {
        console.warn('[SessionManager] ⚠️  Session not found for closing:', sessionId);
        // Don't throw - closing a non-existent session is not critical
        return;
      }
      
      console.log('[SessionManager] ✅ Closed session:', sessionId);
    } catch (error) {
      console.error('[SessionManager] ❌ Failed to close session:', {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - session closure failure should not block workflow
    }
  }

  /**
   * Restore active sessions on app restart
   * Requirements: 12.3, 12.4
   * 
   * @param userId - User ID from Supabase Auth
   * @returns Promise resolving to array of active CaptureSession
   */
  async restoreActiveSessions(userId: string): Promise<CaptureSession[]> {
    try {
      const collection = await this.getCollection();
      
      const now = new Date();
      
      // Find active sessions that haven't expired
      const sessions = await collection.find({
        userId,
        status: 'active',
        expiresAt: { $gt: now }, // Not expired
      }).toArray();
      
      console.log('[SessionManager] ✅ Restored sessions:', {
        userId,
        count: sessions.length,
      });
      
      // Return without _id
      return sessions.map(({ _id, ...session }) => session as CaptureSession);
    } catch (error) {
      console.error('[SessionManager] ❌ Failed to restore sessions:', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      // Return empty array instead of throwing - restoration failure should not block app startup
      return [];
    }
  }

  /**
   * Clean up expired sessions
   * Requirements: 3.4, 12.4, 12.6
   * 
   * Note: MongoDB TTL index handles automatic cleanup, but this method
   * can be used for manual cleanup or to mark sessions as expired.
   * 
   * @returns Promise resolving to count of removed sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const collection = await this.getCollection();
      
      const now = new Date();
      
      // Find expired sessions before marking them
      const expiredSessions = await collection.find({
        status: 'active',
        expiresAt: { $lt: now },
      }).toArray();
      
      // Log each expired session
      expiredSessions.forEach(session => {
        monitoringService.logSessionExpiration(session.userId, session.sessionId);
      });
      
      // Mark expired sessions
      const result = await collection.updateMany(
        {
          status: 'active',
          expiresAt: { $lt: now },
        },
        {
          $set: {
            status: 'expired',
            lastUpdatedAt: now,
          },
        }
      );
      
      console.log('[SessionManager] ✅ Cleaned up expired sessions:', result.modifiedCount);
      
      return result.modifiedCount;
    } catch (error) {
      console.error('[SessionManager] ❌ Failed to cleanup expired sessions:', {
        error: error instanceof Error ? error.message : String(error),
      });
      // Return 0 instead of throwing - cleanup failure should not block workflow
      return 0;
    }
  }

  /**
   * Get all active sessions for a user (for handling multiple active sessions)
   * Requirement 3.5: Support multiple concurrent sessions for different products
   * 
   * @param userId - User ID from Supabase Auth
   * @returns Promise resolving to array of active CaptureSession
   */
  async getAllActiveSessions(userId: string): Promise<CaptureSession[]> {
    try {
      const collection = await this.getCollection();
      
      const sessions = await collection.find({
        userId,
        status: 'active',
      }).sort({ lastUpdatedAt: -1 }).toArray();
      
      console.log('[SessionManager] ✅ Retrieved all active sessions:', {
        userId,
        count: sessions.length,
      });
      
      // Return without _id
      return sessions.map(({ _id, ...session }) => session as CaptureSession);
    } catch (error) {
      console.error('[SessionManager] ❌ Failed to get all active sessions:', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      // Return empty array instead of throwing
      return [];
    }
  }
}

/**
 * Singleton instance
 */
export const sessionManager = new SessionManager();

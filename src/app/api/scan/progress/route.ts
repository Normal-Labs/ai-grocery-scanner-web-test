/**
 * Scan Progress Polling Endpoint
 * 
 * GET /api/scan/progress?sessionId={sessionId}
 * 
 * Provides polling-based progress updates for clients that cannot maintain SSE connections.
 * Returns current session status and all events since session creation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { progressManager } from '@/lib/progress/ProgressManager';

interface ProgressResponse {
  status: 'active' | 'complete' | 'error';
  events: any[];
  complete: boolean;
  error?: string;
}

/**
 * GET handler for /api/scan/progress endpoint
 * 
 * Returns the current progress state for a given session ID.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    const session = progressManager.getSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const response: ProgressResponse = {
      status: session.status,
      events: session.events,
      complete: session.status !== 'active',
    };

    if (session.status === 'error' && session.error) {
      response.error = session.error.message;
    }

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('[Progress API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

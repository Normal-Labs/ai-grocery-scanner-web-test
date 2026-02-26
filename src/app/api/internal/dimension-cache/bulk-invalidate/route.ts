/**
 * Bulk Dimension Cache Invalidation Endpoint
 * 
 * POST /api/internal/dimension-cache/bulk-invalidate
 * Invalidates dimension cache for multiple products
 * 
 * Requirements: 13.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { dimensionCacheService } from '@/lib/cache/DimensionCacheService';

interface BulkInvalidateRequest {
  category?: string;
  productIds?: string[];
}

export async function POST(request: NextRequest) {
  try {
    console.log('[Dimension Cache API] 📥 Bulk invalidation requested');

    const body: BulkInvalidateRequest = await request.json();

    // Validate request
    if (!body.category && (!body.productIds || body.productIds.length === 0)) {
      return NextResponse.json(
        { error: 'Either category or productIds must be provided' },
        { status: 400 }
      );
    }

    console.log('[Dimension Cache API] 🗑️  Bulk invalidation:', {
      category: body.category,
      productIdsCount: body.productIds?.length || 0,
    });

    // Perform bulk invalidation
    const deletedCount = await dimensionCacheService.bulkInvalidate({
      category: body.category,
      productIds: body.productIds,
    });

    console.log('[Dimension Cache API] ✅ Bulk invalidation completed:', deletedCount, 'entries');

    return NextResponse.json({
      success: true,
      message: `Invalidated ${deletedCount} dimension cache entries`,
      deletedCount,
      filter: {
        category: body.category,
        productIdsCount: body.productIds?.length || 0,
      },
    });

  } catch (error) {
    console.error('[Dimension Cache API] ❌ Bulk invalidation failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to bulk invalidate dimension cache',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

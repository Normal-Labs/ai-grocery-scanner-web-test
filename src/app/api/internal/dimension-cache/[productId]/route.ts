/**
 * Manual Dimension Cache Invalidation Endpoint
 * 
 * DELETE /api/internal/dimension-cache/:productId
 * Invalidates dimension cache for a specific product
 * 
 * Requirements: 13.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { dimensionCacheService } from '@/lib/cache/DimensionCacheService';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    console.log('[Dimension Cache API] 🗑️  Manual invalidation requested for product:', productId);

    // Invalidate dimension cache
    await dimensionCacheService.invalidate(productId);

    console.log('[Dimension Cache API] ✅ Cache invalidated successfully');

    return NextResponse.json({
      success: true,
      message: `Dimension cache invalidated for product: ${productId}`,
      productId,
    });

  } catch (error) {
    console.error('[Dimension Cache API] ❌ Invalidation failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to invalidate dimension cache',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

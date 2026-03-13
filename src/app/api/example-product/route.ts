/**
 * Example Product API Endpoint
 * 
 * GET /api/example-product
 * 
 * Returns a hardcoded example product from the database
 * for the "Try an example" feature on the home page.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // Fetch the example product
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', '155ed71b-0074-436a-a3be-0cd3a215d4ca')
      .single();

    if (error || !product) {
      console.error('[Example Product API] Failed to load product:', error);
      return NextResponse.json(
        { error: 'Failed to load example product' },
        { status: 404 }
      );
    }

    console.log('[Example Product API] Loaded example product:', product.name);

    // Transform to extraction result format
    const extractionResult = {
      steps: {
        barcode: {
          name: 'Barcode Detection',
          status: product.metadata?.extraction_steps?.barcode?.status || 'success',
          data: product.metadata?.extraction_steps?.barcode?.data || { barcode: product.barcode },
          confidence: product.metadata?.extraction_steps?.barcode?.confidence || 1,
        },
        packaging: {
          name: 'Packaging Information',
          status: product.metadata?.extraction_steps?.packaging?.status || 'success',
          data: product.metadata?.extraction_steps?.packaging?.data || {
            productName: product.name,
            brand: product.brand,
            size: product.size,
            category: product.category,
          },
          confidence: product.metadata?.extraction_steps?.packaging?.confidence || 1,
        },
        ingredients: {
          name: 'Ingredients List',
          status: product.metadata?.extraction_steps?.ingredients?.status || 'success',
          data: product.metadata?.extraction_steps?.ingredients?.data || { ingredients: product.ingredients },
          confidence: product.metadata?.extraction_steps?.ingredients?.confidence || 1,
        },
        nutrition: {
          name: 'Nutrition Facts',
          status: product.metadata?.extraction_steps?.nutrition?.status || 'success',
          data: product.metadata?.extraction_steps?.nutrition?.data || product.nutrition_facts,
          confidence: product.metadata?.extraction_steps?.nutrition?.confidence || 1,
        },
      },
      healthDimension: product.metadata?.health_dimension,
      processingDimension: product.metadata?.processing_dimension,
      allergensDimension: product.metadata?.allergens_dimension,
      productId: product.id,
      cached: true,
      savedToDb: true,
      totalProcessingTime: 0,
      imageSize: 0,
      timestamp: new Date(),
    };

    return NextResponse.json(extractionResult);
  } catch (error) {
    console.error('[Example Product API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

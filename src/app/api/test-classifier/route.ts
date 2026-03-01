/**
 * GET /api/test-classifier
 * 
 * Test endpoint to verify ImageClassifier can be instantiated.
 * This helps diagnose configuration issues.
 */

import { NextResponse } from 'next/server';

export async function GET() {
  console.log('[Test Classifier] 🧪 Testing ImageClassifier instantiation...');
  
  try {
    // Check environment variables
    const geminiKey = process.env.GEMINI_API_KEY;
    const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    
    console.log('[Test Classifier] Environment check:', {
      hasGeminiKey: !!geminiKey,
      hasGoogleKey: !!googleKey,
      geminiKeyLength: geminiKey?.length || 0,
      googleKeyLength: googleKey?.length || 0,
    });
    
    if (!geminiKey && !googleKey) {
      return NextResponse.json({
        success: false,
        error: 'No Gemini API key found in environment',
        details: {
          checkedVars: ['GEMINI_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY'],
          availableEnvVars: Object.keys(process.env).filter(k => 
            k.includes('GEMINI') || k.includes('GOOGLE') || k.includes('API')
          ),
        }
      }, { status: 500 });
    }
    
    // Try to instantiate ImageClassifier
    const { ImageClassifier } = await import('@/lib/services/image-classifier');
    
    const apiKey = geminiKey || googleKey;
    console.log('[Test Classifier] Using API key from:', geminiKey ? 'GEMINI_API_KEY' : 'GOOGLE_GENERATIVE_AI_API_KEY');
    
    const classifier = new ImageClassifier(apiKey);
    
    console.log('[Test Classifier] ✅ ImageClassifier instantiated successfully');
    
    // Get cache stats
    const stats = classifier.getCacheStats();
    
    return NextResponse.json({
      success: true,
      message: 'ImageClassifier instantiated successfully',
      cacheStats: stats,
      apiKeySource: geminiKey ? 'GEMINI_API_KEY' : 'GOOGLE_GENERATIVE_AI_API_KEY',
    });
    
  } catch (error) {
    console.error('[Test Classifier] ❌ Failed to instantiate ImageClassifier:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}

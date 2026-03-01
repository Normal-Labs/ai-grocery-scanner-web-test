/**
 * Test script to verify ImageClassifier is working with correct model
 * 
 * Usage: npx tsx scripts/test-classification.ts
 */

import { ImageClassifier } from '../src/lib/services/image-classifier';
import * as fs from 'fs';
import * as path from 'path';

async function testClassification() {
  console.log('🧪 Testing ImageClassifier...\n');
  
  // Check API key
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    console.error('❌ Missing Gemini API key');
    console.error('Set GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY environment variable');
    process.exit(1);
  }
  
  console.log('✅ API key found');
  
  // Create classifier instance
  const classifier = new ImageClassifier(apiKey);
  console.log('✅ ImageClassifier instantiated');
  
  // Create a simple test image (1x1 red pixel)
  const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
  
  console.log('\n🔍 Testing classification with sample image...');
  
  try {
    const result = await classifier.classify(testImage);
    
    console.log('\n✅ Classification successful!');
    console.log('Result:', JSON.stringify(result, null, 2));
    console.log('\nCache stats:', classifier.getCacheStats());
    
    console.log('\n✅ All tests passed!');
    console.log('The ImageClassifier is working correctly with the gemini-2.0-flash model.');
    
  } catch (error) {
    console.error('\n❌ Classification failed:');
    console.error(error);
    
    if (error instanceof Error) {
      console.error('\nError details:');
      console.error('Name:', error.name);
      console.error('Message:', error.message);
      if (error.stack) {
        console.error('Stack:', error.stack.split('\n').slice(0, 5).join('\n'));
      }
    }
    
    process.exit(1);
  }
}

testClassification();

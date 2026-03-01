/**
 * Check Environment Variables
 * 
 * This script checks if all required environment variables are set.
 */

console.log('🔍 Checking environment variables...\n');

const requiredVars = [
  'GEMINI_API_KEY',
  'GOOGLE_GENERATIVE_AI_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'MONGODB_URI',
];

const optionalVars = [
  'BARCODE_LOOKUP_API_KEY',
  'TAVILY_API_KEY',
  'DEV_USER_TIER',
];

console.log('📋 Required Variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    const masked = value.substring(0, 10) + '...' + value.substring(value.length - 4);
    console.log(`  ✅ ${varName}: ${masked}`);
  } else {
    console.log(`  ❌ ${varName}: NOT SET`);
  }
});

console.log('\n📋 Optional Variables:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    const masked = value.length > 20 
      ? value.substring(0, 10) + '...' + value.substring(value.length - 4)
      : value;
    console.log(`  ✅ ${varName}: ${masked}`);
  } else {
    console.log(`  ⚪ ${varName}: NOT SET (optional)`);
  }
});

console.log('\n🔑 API Key Status:');
const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (geminiKey) {
  console.log('  ✅ Gemini API key is available');
  console.log(`     Source: ${process.env.GEMINI_API_KEY ? 'GEMINI_API_KEY' : 'GOOGLE_GENERATIVE_AI_API_KEY'}`);
} else {
  console.log('  ❌ Gemini API key is MISSING');
  console.log('     Please set either GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY in .env.local');
}

console.log('\n✅ Environment check complete');

/**
 * Manual test script for rate limiting
 * 
 * This script tests the rate limiting functionality by making
 * multiple requests to the /api/analyze endpoint.
 * 
 * Usage: node test-rate-limit.js
 * 
 * Note: The dev server must be running on http://localhost:3000
 */

const mockImageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=';

async function testRateLimit() {
  console.log('Testing rate limiting on /api/analyze endpoint...\n');
  
  const baseUrl = 'http://localhost:3000/api/analyze';
  let successCount = 0;
  let rateLimitCount = 0;
  let errorCount = 0;
  
  try {
    // Make 12 requests (limit is 10)
    for (let i = 1; i <= 12; i++) {
      try {
        const response = await fetch(baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imageData: mockImageData })
        });
        
        // Try to parse JSON, but handle HTML responses
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = { error: 'Non-JSON response' };
        }
        
        if (response.status === 429) {
          rateLimitCount++;
          console.log(`Request ${i}: ❌ Rate limited (429) - ${data.error || 'Rate limit exceeded'}`);
          const retryAfter = response.headers.get('Retry-After');
          if (retryAfter) {
            console.log(`  Retry-After header: ${retryAfter} seconds`);
          }
        } else if (response.status === 200) {
          successCount++;
          console.log(`Request ${i}: ✅ Success (200)`);
        } else {
          errorCount++;
          console.log(`Request ${i}: ⚠️  Status ${response.status} - ${data.error || 'Unknown error'}`);
        }
      } catch (err) {
        errorCount++;
        console.log(`Request ${i}: ⚠️  Error - ${err.message}`);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n--- Test Results ---');
    console.log(`Successful/Error requests: ${successCount + errorCount}`);
    console.log(`Rate limited requests: ${rateLimitCount}`);
    console.log(`\nExpected behavior:`);
    console.log(`  - First 10 requests: Success or error (but NOT rate limited)`);
    console.log(`  - Requests 11-12: Rate limited (429 status)`);
    
    if (rateLimitCount >= 2 && (successCount + errorCount) >= 10) {
      console.log('\n✅ Rate limiting is working correctly!');
      console.log('   First 10 requests were processed, subsequent requests were rate limited.');
    } else if (rateLimitCount >= 2) {
      console.log('\n✅ Rate limiting is working!');
      console.log(`   ${rateLimitCount} requests were rate limited as expected.`);
    } else {
      console.log('\n❌ Rate limiting may not be working as expected');
      console.log(`   Expected at least 2 rate limited requests, got ${rateLimitCount}`);
    }
    
  } catch (error) {
    console.error('Error during test:', error.message);
    console.log('\nMake sure the dev server is running: npm run dev');
  }
}

testRateLimit();

// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Set test environment variables
process.env.MONGODB_URI = 'mongodb://localhost:27017/test_db';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-anon-key';

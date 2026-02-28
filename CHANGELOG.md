# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added - 2026-02-28

#### Error Reporting for Field Testing
- **DetailedErrorDisplay Component**: New component that shows comprehensive error information
  - Displays error message, timestamp, and error code
  - Shows technical context (barcode, tier, response status, etc.)
  - Expandable technical details section
  - "Copy Error Report" button for easy sharing with support
  - Screenshot-friendly layout for field testing
  - Located at: `src/components/DetailedErrorDisplay.tsx`

#### User Testing Instructions
- Added comprehensive testing instructions to main pages
- "How to Analyze Products" section with best practices
- "Help Us Test" section with step-by-step testing guide
- Clear guidance on using error reporting features

#### Deployment Documentation
- **VERCEL_DEPLOYMENT.md**: Complete Vercel deployment guide
  - Environment variable setup instructions
  - MongoDB Atlas configuration steps
  - Troubleshooting common deployment issues
  - Security best practices
  - Post-deployment checklist

- **MONGODB_SETUP.md**: Step-by-step MongoDB Atlas setup
  - Account creation and cluster setup
  - Database user configuration
  - Network access configuration for Vercel
  - Connection string formatting
  - Troubleshooting guide

- **REQUIRED_ENV_VARS.md**: Quick reference for critical environment variables
  - Minimal setup guide
  - Links to get API keys
  - Verification steps

### Fixed - 2026-02-28

#### Next.js 15 Compatibility
- Fixed dynamic route params to handle Promise type (Next.js 15 breaking change)
- Updated `src/app/api/internal/dimension-cache/[productId]/route.ts`

#### TypeScript Type Issues
- Fixed Supabase type inference issues across multiple repositories
- Added type assertions for Supabase queries in serverless environment
- Fixed Product type mismatches (removed `last_scanned_at`, added required fields)
- Added missing Supabase types: `Store`, `StoreWithDistance`, `StoreInventory`, `StoreInventoryInsert`, `StoreInsert`
- Fixed ProductInsert to require `brand` field
- Fixed distance field naming (`distance_meters` → `distance` in kilometers)

#### MongoDB Configuration
- Added TLS/SSL configuration for serverless environments
- Fixed certificate validation issues in Vercel deployment
- Added proper TLS settings: `tls: true`, `tlsAllowInvalidCertificates: false`
- Updated MongoDB client in `src/lib/mongodb/client.ts`

#### Code Quality
- Fixed all TypeScript compilation errors for production build
- Added proper null checks for optional fields
- Improved error handling with structured error objects
- Added fallback values for brand extraction

### Changed - 2026-02-28

#### Documentation Updates
- Updated README.md with new features and deployment info
- Updated DOCS_INDEX.md to include deployment guides
- Updated .env.local.example with all required variables
- Added links to deployment documentation throughout

#### Component Updates
- Updated InsightsDisplay to use inline badges instead of SmartBadge
- Enhanced error display across all pages (main page, scan page)
- Improved error context capture for debugging

### Security - 2026-02-28

#### Environment Variables
- Documented `SUPABASE_SERVICE_ROLE_KEY` as required (server-side only)
- Added security warnings about never exposing service role key to client
- Updated deployment guides with security best practices

## Version History

### Beta Testing Phase (Current)
- Multi-tier product identification system
- Integrated dimension analysis
- Supabase authentication
- MongoDB caching
- Enhanced error reporting for field testing

### Initial Development
- Basic product scanning
- Gemini AI integration
- Camera capture functionality
- Smart badge system

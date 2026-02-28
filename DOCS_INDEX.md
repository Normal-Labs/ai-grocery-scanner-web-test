# Documentation Index

Quick reference to all documentation files in this project.

## Getting Started

- **[README.md](README.md)** - Project overview and quick start
- **[SETUP.md](SETUP.md)** - Detailed setup instructions
- **[CHANGELOG.md](CHANGELOG.md)** - Recent changes and updates

## Deployment

- **[VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md)** - Complete Vercel deployment guide with troubleshooting
- **[MONGODB_SETUP.md](MONGODB_SETUP.md)** - Step-by-step MongoDB Atlas configuration
- **[MONGODB_TROUBLESHOOTING.md](MONGODB_TROUBLESHOOTING.md)** - Detailed MongoDB connection troubleshooting
- **[REQUIRED_ENV_VARS.md](REQUIRED_ENV_VARS.md)** - Quick reference for critical environment variables

## System Status

- **[IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)** - Current implementation status and system architecture

## User Guides

- **[SCANNER_USAGE.md](SCANNER_USAGE.md)** - How to use the barcode scanner
- **[MULTI_TIER_TESTING.md](MULTI_TIER_TESTING.md)** - Testing guide for all 4 tiers
- **[DEV_TIER_TOGGLE.md](DEV_TIER_TOGGLE.md)** - Development tier toggle for testing dimension analysis

## Technical Documentation

- **[COST_OPTIMIZATION.md](COST_OPTIMIZATION.md)** - Cost analysis and optimization strategies

## Specifications

### Multi-Tier Product Identification
- **[.kiro/specs/multi-tier-product-identification/](/.kiro/specs/multi-tier-product-identification/)**
  - `requirements.md` - System requirements
  - `design.md` - Architecture and design
  - `tasks.md` - Implementation task list

### Integrated Dimension Analysis
- **[.kiro/specs/integrated-product-scan-analysis/](/.kiro/specs/integrated-product-scan-analysis/)**
  - `requirements.md` - Dimension analysis requirements
  - `design.md` - Architecture and design
  - `tasks.md` - Implementation task list

## Database

- **[supabase/migrations/](supabase/migrations/)** - Database schema migrations
  - `20240101000000_initial_schema.sql` - Initial product and store schema
  - `20260225000000_multi_tier_schema.sql` - Multi-tier scan logging
  - `20260226000000_dimension_analysis_schema.sql` - Dimension analysis fields
  - `20260227000000_fix_product_search.sql` - Improved product duplicate detection

## Quick Links

### I want to...
- **Get started**: Read [SETUP.md](SETUP.md)
- **Deploy to Vercel**: Follow [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md)
- **Set up MongoDB**: Use [MONGODB_SETUP.md](MONGODB_SETUP.md)
- **See required env vars**: Check [REQUIRED_ENV_VARS.md](REQUIRED_ENV_VARS.md)
- **Understand the system**: Check [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)
- **Test the system**: Use [MULTI_TIER_TESTING.md](MULTI_TIER_TESTING.md)
- **Test dimension analysis**: Read [DEV_TIER_TOGGLE.md](DEV_TIER_TOGGLE.md)
- **See implementation details**: Check spec files in `.kiro/specs/`
- **Optimize costs**: Review [COST_OPTIMIZATION.md](COST_OPTIMIZATION.md)

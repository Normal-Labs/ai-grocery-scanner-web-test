# Documentation Index

## Overview

Complete documentation for the Product Hero nutrition analysis application, including extraction testing, database schema, and deployment guides.

## Quick Start

- [Setup Guide](SETUP.md) - Initial setup and configuration
- [Required Environment Variables](REQUIRED_ENV_VARS.md) - Environment configuration
- [MongoDB Setup](MONGODB_SETUP.md) - Database setup instructions

## Extraction Testing

### Test Pages
- [Extraction Testing Overview](EXTRACTION_TESTING.md) - All test pages and usage
- [Barcode Test Page](/test-barcode) - Test barcode detection
- [Packaging Test Page](/test-packaging) - Test product info extraction
- [Ingredients Test Page](/test-ingredients) - Test ingredient list extraction
- [Nutrition Test Page](/test-nutrition) - Test nutrition facts extraction

### Extraction Guides
- [Ingredients Extraction Guide](INGREDIENTS_EXTRACTION_GUIDE.md) - Detailed ingredient extraction strategy
- [Nutrition Extraction Guide](NUTRITION_EXTRACTION_GUIDE.md) - Detailed nutrition facts extraction strategy
- [Extraction Diagnostics](EXTRACTION_DIAGNOSTICS.md) - Troubleshooting extraction issues

## Database & Schema

- [Products Dev Migration](PRODUCTS_DEV_MIGRATION.md) - products_dev table schema and usage
- [Ingredients Column Migration](INGREDIENTS_COLUMN_MIGRATION.md) - TEXT[] column for ingredients
- [MongoDB Setup](MONGODB_SETUP.md) - MongoDB configuration
- [MongoDB Troubleshooting](MONGODB_TROUBLESHOOTING.md) - Common MongoDB issues

## UI & Components

- [Camera UI Improvements](CAMERA_UI_IMPROVEMENTS.md) - Standardized camera interface
- [Scanner Usage Guide](SCANNER_USAGE.md) - How to use the scanner
- [Product Hero Toggle](PRODUCT_HERO.md) - Feature toggle documentation

## Configuration

- [Gemini Model Config](GEMINI_MODEL_CONFIG.md) - AI model configuration
- [Dev Tier Toggle](DEV_TIER_TOGGLE.md) - Development tier configuration
- [Cost Optimization](COST_OPTIMIZATION.md) - API cost optimization strategies

## Testing & Quality

- [Build Test Results](BUILD_TEST_RESULTS.md) - Test suite results
- [Multi-Tier Testing](MULTI_TIER_TESTING.md) - Testing across tiers
- [Camera UI Testing](CAMERA_UI_IMPROVEMENTS.md#testing-checklist) - UI test checklist

## Deployment

- [Vercel Deployment](VERCEL_DEPLOYMENT.md) - Deploy to Vercel
- [Deployment Checklist](DEPLOYMENT_CHECKLIST.md) - Pre-deployment checklist
- [Nutrition Analysis Deployment](NUTRITION_ANALYSIS_DEPLOYMENT.md) - Nutrition feature deployment

## Release Notes

- [Changelog](CHANGELOG.md) - Version history
- [Release Notes v1.0](RELEASE_NOTES_v1.0.md) - Version 1.0 release notes
- [Implementation Status](IMPLEMENTATION_STATUS.md) - Feature implementation status

## Architecture

### Test Pages Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Test Pages                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  /test-barcode          /test-packaging                     │
│  ┌──────────────┐       ┌──────────────┐                   │
│  │ BarcodeScanner│       │ ImageScanner │                   │
│  └──────┬───────┘       └──────┬───────┘                   │
│         │                       │                            │
│         v                       v                            │
│  /api/test-barcode    /api/test-packaging                   │
│                                                              │
│  /test-ingredients      /test-nutrition                     │
│  ┌──────────────┐       ┌──────────────┐                   │
│  │ ImageScanner │       │ ImageScanner │                   │
│  └──────┬───────┘       └──────┬───────┘                   │
│         │                       │                            │
│         v                       v                            │
│  /api/test-ingredients /api/test-nutrition                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                          │
                          v
┌─────────────────────────────────────────────────────────────┐
│                  Supabase products_dev                       │
├─────────────────────────────────────────────────────────────┤
│  - barcode (VARCHAR)                                         │
│  - name, brand, size, category (VARCHAR)                    │
│  - ingredients (TEXT[])                                      │
│  - nutrition_facts (JSONB)                                   │
│  - metadata (JSONB)                                          │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema

```sql
-- products_dev table (mirrors products table)
CREATE TABLE products_dev (
  id UUID PRIMARY KEY,
  barcode VARCHAR(50),
  name VARCHAR(255),
  brand VARCHAR(255),
  size VARCHAR(100),
  category VARCHAR(100),
  ingredients TEXT[],           -- Array of ingredients
  nutrition_facts JSONB,        -- Structured nutrition data
  image_url TEXT,
  metadata JSONB,               -- Extraction metadata
  flagged_for_review BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## Key Features

### Extraction Types

1. **Barcode Extraction**
   - Browser BarcodeDetector API
   - OCR fallback with Gemini Vision
   - Saves to `barcode` column

2. **Packaging Extraction**
   - Product name, brand, size, category
   - Saves to respective columns

3. **Ingredients Extraction**
   - Complete ingredient list
   - Sub-ingredients preserved
   - Saves to `ingredients` TEXT[] column

4. **Nutrition Facts Extraction**
   - Serving size, calories, macros
   - Vitamins and minerals
   - Saves to `nutrition_facts` JSONB column

### Camera Interface

All test pages use standardized camera interface:
- Close button (top-right)
- Dynamic instruction text
- Cancel and Capture buttons (bottom)
- Clean, unobstructed view

## Development Workflow

1. **Test Extraction**: Use test pages to validate extraction
2. **Analyze Results**: Query products_dev table
3. **Refine Prompts**: Update API endpoints based on results
4. **Validate Changes**: Re-test with same images
5. **Deploy**: Update production extraction logic

## Support & Troubleshooting

- [Extraction Diagnostics](EXTRACTION_DIAGNOSTICS.md) - Debug extraction issues
- [MongoDB Troubleshooting](MONGODB_TROUBLESHOOTING.md) - Database issues
- [Gemini Model Config](GEMINI_MODEL_CONFIG.md) - Model configuration issues

## Contributing

When adding new features:
1. Create test page first (e.g., `/test-new-feature`)
2. Document extraction strategy
3. Update schema if needed
4. Add to this index

## Migration Order

When setting up from scratch:

1. Run base schema migration
2. Run `20260305000001_recreate_products_dev_table.sql`
3. Run `20260305000002_add_ingredients_column.sql`
4. Run `20260305000003_add_nutrition_facts_column.sql`
5. Test each extraction type

## Environment Variables

See [REQUIRED_ENV_VARS.md](REQUIRED_ENV_VARS.md) for complete list.

Key variables:
- `GOOGLE_GENERATIVE_AI_API_KEY` - Gemini API key
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service key

## License

[Add license information]

## Contact

[Add contact information]

Quick reference to all documentation files in this project.

## Getting Started

- **[README.md](README.md)** - Project overview and quick start
- **[SETUP.md](SETUP.md)** - Detailed setup instructions
- **[CHANGELOG.md](CHANGELOG.md)** - Recent changes and updates
- **[RELEASE_NOTES_v1.0.md](RELEASE_NOTES_v1.0.md)** - Version 1.0 release notes

## Deployment

- **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Pre-deployment verification checklist
- **[BUILD_TEST_RESULTS.md](BUILD_TEST_RESULTS.md)** - Latest build status and testing results
- **[VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md)** - Complete Vercel deployment guide with troubleshooting
- **[NUTRITION_ANALYSIS_DEPLOYMENT.md](NUTRITION_ANALYSIS_DEPLOYMENT.md)** - Nutrition analysis feature deployment checklist
- **[MONGODB_SETUP.md](MONGODB_SETUP.md)** - Step-by-step MongoDB Atlas configuration
- **[MONGODB_TROUBLESHOOTING.md](MONGODB_TROUBLESHOOTING.md)** - Detailed MongoDB connection troubleshooting
- **[REQUIRED_ENV_VARS.md](REQUIRED_ENV_VARS.md)** - Quick reference for critical environment variables

## Features

- **[PRODUCT_HERO.md](PRODUCT_HERO.md)** - Product Hero multi-image capture workflow
- **[SCANNER_USAGE.md](SCANNER_USAGE.md)** - How to use the barcode scanner
- **[DEV_TIER_TOGGLE.md](DEV_TIER_TOGGLE.md)** - Development tier toggle for testing dimension analysis

## System Status

- **[IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)** - Current implementation status and system architecture

## User Guides

- **[MULTI_TIER_TESTING.md](MULTI_TIER_TESTING.md)** - Testing guide for all 4 tiers
- **[scripts/TESTING_GUIDE.md](scripts/TESTING_GUIDE.md)** - Nutrition analysis feature testing guide

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

### Nutritional Health Analysis
- **[.kiro/specs/nutritional-health-analysis/](/.kiro/specs/nutritional-health-analysis/)**
  - `requirements.md` - Nutrition analysis requirements
  - `design.md` - Architecture and design
  - `tasks.md` - Implementation task list

## Database

- **[supabase/migrations/](supabase/migrations/)** - Database schema migrations
  - `20240101000000_initial_schema.sql` - Initial product and store schema
  - `20260225000000_multi_tier_schema.sql` - Multi-tier scan logging
  - `20260226000000_dimension_analysis_schema.sql` - Dimension analysis fields
  - `20260227000000_fix_product_search.sql` - Improved product duplicate detection
  - `add_nutrition_fields_to_products.sql` - Nutrition data fields for products table

## Quick Links

### I want to...
- **Get started**: Read [SETUP.md](SETUP.md)
- **Deploy to production**: Check [BUILD_TEST_RESULTS.md](BUILD_TEST_RESULTS.md) then follow [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
- **Deploy to Vercel**: Follow [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md)
- **Set up MongoDB**: Use [MONGODB_SETUP.md](MONGODB_SETUP.md)
- **See required env vars**: Check [REQUIRED_ENV_VARS.md](REQUIRED_ENV_VARS.md)
- **Understand the system**: Check [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)
- **Test the system**: Use [MULTI_TIER_TESTING.md](MULTI_TIER_TESTING.md)
- **Test dimension analysis**: Read [DEV_TIER_TOGGLE.md](DEV_TIER_TOGGLE.md)
- **Test nutrition analysis**: Follow [scripts/TESTING_GUIDE.md](scripts/TESTING_GUIDE.md)
- **Use Product Hero**: Read [PRODUCT_HERO.md](PRODUCT_HERO.md)
- **See implementation details**: Check spec files in `.kiro/specs/`
- **Optimize costs**: Review [COST_OPTIMIZATION.md](COST_OPTIMIZATION.md)


### Multi-Image Product Capture
- **[.kiro/specs/multi-image-product-capture/](/.kiro/specs/multi-image-product-capture/)**
  - `requirements.md` - Product Hero requirements
  - `design.md` - Architecture and design
  - `tasks.md` - Implementation task list
  - `IMPROVEMENTS.md` - Bug fixes and improvements log

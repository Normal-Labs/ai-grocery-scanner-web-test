# Gemini Model Configuration

## Current Model

All Gemini API calls use: **`gemini-2.0-flash`**

## Configuration File

The model is configured in: `src/lib/config/gemini.ts`

```typescript
export const GEMINI_MODEL = 'gemini-2.0-flash';
```

## Why gemini-2.0-flash?

1. **Availability**: The `gemini-1.5-flash` model is deprecated and returns 404 errors
2. **Performance**: 2.0 models are faster and more capable than 1.5 models
3. **Consistency**: Using the same model across all services ensures consistent behavior
4. **Stability**: The non-experimental version is more stable than `-exp` variants

## Services Using Gemini

All these services use the configured model:

1. **GeminiClient** (`src/lib/services/gemini-client.ts`)
   - OCR text extraction
   - Image analysis
   - Dimension analysis

2. **NutritionParser** (`src/lib/services/nutrition-parser.ts`)
   - Nutrition facts extraction
   - Serving size detection
   - Macro/micronutrient parsing

3. **IngredientParser** (`src/lib/services/ingredient-parser.ts`)
   - Ingredient list extraction
   - Allergen detection
   - Additive identification

4. **ImageClassifier** (`src/lib/services/image-classifier.ts`)
   - Image type classification
   - Barcode/packaging/nutrition label detection

5. **Test Barcode Extraction** (`src/app/api/test-barcode-extraction/route.ts`)
   - Barcode OCR fallback
   - Test page functionality

## Changing the Model

To change the model used across the entire application:

1. Edit `src/lib/config/gemini.ts`
2. Update the `GEMINI_MODEL` constant
3. Rebuild the application: `npm run build`

```typescript
// Example: Switch to experimental model
export const GEMINI_MODEL = 'gemini-2.0-flash-exp';
```

## Available Models

| Model | Status | Use Case |
|-------|--------|----------|
| `gemini-2.0-flash-exp` | Experimental | Latest features, may be unstable |
| `gemini-2.0-flash` | ✅ Stable | **Recommended** - Production use |
| `gemini-1.5-flash` | ❌ Deprecated | Returns 404 errors |
| `gemini-1.5-pro` | ❌ Deprecated | Returns 404 errors |

## Error: Model Not Found

If you see this error:
```
[404 Not Found] models/gemini-1.5-flash is not found for API version v1beta
```

**Solution**: The model name is outdated. Update to `gemini-2.0-flash`:

1. Check `src/lib/config/gemini.ts`
2. Verify `GEMINI_MODEL = 'gemini-2.0-flash'`
3. Search codebase for any hardcoded `gemini-1.5-flash` references
4. Update and rebuild

## Temperature Settings

Different tasks use different temperature settings (configured in `gemini.ts`):

- **Extraction** (0.1): Low temperature for consistent, deterministic extraction
- **Analysis** (0.2): Slightly higher for nuanced analysis
- **Creative** (0.7): Higher for creative or varied responses

## Timeout Settings

Configured timeouts for different operations:

- **Extraction**: 10 seconds
- **Analysis**: 15 seconds
- **Dimension Analysis**: 20 seconds

## Retry Configuration

Exponential backoff retry settings:

- **Max Attempts**: 3
- **Initial Backoff**: 1 second
- **Backoff Multiplier**: 2x (1s → 2s → 4s)

## Testing

To verify the model is working:

1. Navigate to `/test-barcode`
2. Scan a barcode
3. Check console logs for model name
4. Verify no 404 errors

## Monitoring

Track these metrics to ensure model is working:

- API success rate
- Average response time
- Error rate by error type
- Model version in use

## Troubleshooting

### 404 Model Not Found
- Update to `gemini-2.0-flash`
- Check API key is valid
- Verify internet connectivity

### Slow Response Times
- Check timeout settings
- Consider using `-exp` variant for speed
- Review image sizes (compress if needed)

### Inconsistent Results
- Lower temperature for extraction tasks
- Increase temperature for analysis tasks
- Review prompt engineering

## Future Updates

When Google releases new models:

1. Test new model with `/test-barcode` page
2. Compare performance and accuracy
3. Update `GEMINI_MODEL` in config
4. Document changes in CHANGELOG.md
5. Notify team of model change

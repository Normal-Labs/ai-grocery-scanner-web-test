/**
 * Dimension Analysis Prompts
 * 
 * Centralized location for all product dimension analysis prompts.
 * Each dimension can be used individually or combined for comprehensive analysis.
 * 
 * Dimensions:
 * - Health: Nutritional value and health impact
 * - Processing: Level of processing and preservatives
 * - Allergens: Allergen presence and risks
 * - Responsibility: Ethical sourcing and production
 * - Environmental: Sustainability and environmental impact
 */

/**
 * Health Dimension Analysis Prompt
 * 
 * Analyzes nutritional value, beneficial ingredients, and overall health impact.
 * Score: 0-100 (100 = excellent health profile)
 */
export const HEALTH_DIMENSION_PROMPT = `HEALTH DIMENSION ANALYSIS (Score 0-100):

Analyze the health impact of this product based on:

POSITIVE FACTORS (increase score):
- High protein content (>10g per serving)
- High fiber content (>5g per serving)
- Rich in vitamins and minerals (>20% DV for multiple nutrients)
- Whole food ingredients (whole grains, fruits, vegetables, nuts)
- Low or no added sugars (<5g per serving)
- Low sodium (<140mg per serving)
- Healthy fats (omega-3, monounsaturated)
- Natural, minimally processed ingredients
- Organic or non-GMO certifications

NEGATIVE FACTORS (decrease score):
- High added sugars (>10g per serving)
- High sodium (>400mg per serving)
- Trans fats (any amount)
- High saturated fat (>5g per serving)
- Low nutritional value (empty calories)
- Artificial ingredients
- Ultra-processed ingredients
- High calorie density with low nutrients

SCORING GUIDELINES:
- 90-100: Excellent - Whole foods, high nutrients, minimal negatives
- 80-89: Very Good - Nutritious with minor concerns
- 70-79: Good - Balanced nutrition, some processed ingredients
- 60-69: Fair - Moderate nutrition, some concerns
- 50-59: Below Average - Limited nutrition, multiple concerns
- 40-49: Poor - Low nutrition, high in negatives
- 30-39: Very Poor - Minimal nutrition, many negatives
- 0-29: Extremely Poor - Harmful ingredients, no nutritional value

CRITICAL: Return ONLY valid JSON with no additional text, explanations, or markdown formatting.

Return this exact JSON structure:
{
  "score": 0-100,
  "explanation": "2-3 sentence summary of health impact",
  "key_factors": [
    "Positive factor 1",
    "Positive factor 2",
    "Negative factor 1",
    "Concern or warning"
  ],
  "confidence": 0.0-1.0
}`;

/**
 * Processing Dimension Analysis Prompt
 * 
 * Analyzes level of processing, artificial additives, and preservatives.
 * Score: 0-100 (100 = minimally processed, no artificial additives)
 */
export const PROCESSING_DIMENSION_PROMPT = `PROCESSING DIMENSION ANALYSIS (Score 0-100):

Analyze the processing level and additives in this product:

MINIMAL PROCESSING (high score 80-100):
- Whole, unprocessed ingredients
- Simple ingredient list (<5 ingredients)
- No artificial additives
- Natural preservation methods (salt, vinegar, fermentation)
- Recognizable ingredients
- Fresh or frozen whole foods

MODERATE PROCESSING (medium score 50-79):
- Some processed ingredients
- Moderate ingredient list (5-15 ingredients)
- Natural preservatives (vitamin E, citric acid)
- Some refined ingredients (flour, sugar)
- Pasteurization or basic processing

HEAVY PROCESSING (low score 20-49):
- Many processed ingredients
- Long ingredient list (>15 ingredients)
- Multiple additives and preservatives
- Refined and modified ingredients
- Chemical preservatives
- Artificial flavors or colors

ULTRA-PROCESSED (very low score 0-19):
- Mostly artificial ingredients
- Extensive ingredient list (>25 ingredients)
- Multiple artificial preservatives (BHA, BHT, TBHQ, sodium benzoate, potassium sorbate)
- Artificial sweeteners (aspartame, sucralose, saccharin, acesulfame potassium)
- Artificial colors (Red 40, Yellow 5, Blue 1, etc.)
- Modified starches, hydrolyzed proteins
- Industrial ingredients not found in home kitchens

SPECIFIC ADDITIVES TO FLAG:
Preservatives:
- BHA (butylated hydroxyanisole)
- BHT (butylated hydroxytoluene)
- TBHQ (tertiary butylhydroquinone)
- Sodium benzoate
- Potassium sorbate
- Sodium nitrite/nitrate

Artificial Sweeteners:
- Aspartame
- Sucralose (Splenda)
- Saccharin (Sweet'N Low)
- Acesulfame potassium (Ace-K)

Artificial Colors:
- Red 40, Red 3, Allura Red
- Yellow 5, Yellow 6, Tartrazine, Sunset Yellow
- Blue 1, Blue 2, Brilliant Blue
- Green 3, Fast Green
- Caramel color (if from ammonia process)

CRITICAL: Return ONLY valid JSON with no additional text, explanations, or markdown formatting.

Return this exact JSON structure:
{
  "score": 0-100,
  "explanation": "2-3 sentence summary of processing level",
  "key_factors": [
    "Processing level indicator",
    "Specific additives found",
    "Preservatives present",
    "Overall assessment"
  ],
  "additives_detected": {
    "preservatives": ["list of preservatives found"],
    "artificial_sweeteners": ["list of sweeteners found"],
    "artificial_colors": ["list of colors found"],
    "other_additives": ["list of other concerning additives"]
  },
  "confidence": 0.0-1.0
}`;

/**
 * Allergens Dimension Analysis Prompt
 * 
 * Analyzes presence of common allergens and cross-contamination risks.
 * Score: 0-100 (100 = no allergens, low risk)
 */
export const ALLERGENS_DIMENSION_PROMPT = `ALLERGENS DIMENSION ANALYSIS (Score 0-100):

Analyze allergen presence and risks in this product:

8 MAJOR ALLERGENS (FDA/FALCPA):
1. Milk/Dairy: milk, cream, butter, cheese, whey, casein, lactose, yogurt, ghee
2. Eggs: eggs, albumin, mayonnaise, meringue, lysozyme
3. Fish: fish, anchovy, bass, cod, salmon, tuna, tilapia, halibut, trout
4. Shellfish: crab, lobster, shrimp, prawn, crayfish, clam, oyster, mussel, scallop
5. Tree Nuts: almonds, cashews, walnuts, pecans, pistachios, hazelnuts, macadamias, brazil nuts, pine nuts
6. Peanuts: peanuts, groundnuts
7. Wheat: wheat, flour, gluten, semolina, durum, spelt, farina, graham
8. Soybeans: soy, soybeans, tofu, edamame, tempeh, miso, soya lecithin

ADDITIONAL COMMON ALLERGENS:
- Sesame seeds
- Mustard
- Celery
- Lupin
- Sulfites (>10ppm)
- Corn (increasingly common)

SCORING GUIDELINES:
- 90-100: No major allergens, no cross-contamination warnings
- 80-89: 1 common allergen (e.g., wheat in bread)
- 70-79: 2 common allergens or 1 severe allergen
- 60-69: 3 allergens or cross-contamination warning
- 50-59: 4 allergens or multiple severe allergens
- 40-49: 5 allergens or high cross-contamination risk
- 30-39: 6+ allergens or multiple severe allergens
- 0-29: 7+ allergens or extreme allergen risk

SEVERITY CONSIDERATIONS:
- High severity: peanuts, tree nuts, shellfish, fish (can cause anaphylaxis)
- Medium severity: milk, eggs, soy, wheat (common but usually less severe)
- Cross-contamination: "may contain", "processed in facility with"

CRITICAL: Return ONLY valid JSON with no additional text, explanations, or markdown formatting.

Return this exact JSON structure:
{
  "score": 0-100,
  "explanation": "2-3 sentence summary of allergen profile",
  "key_factors": [
    "Major allergens present",
    "Severity assessment",
    "Cross-contamination risks",
    "Allergen-free claims if any"
  ],
  "allergens_detected": {
    "major_allergens": ["list of 8 major allergens found"],
    "other_allergens": ["list of other allergens found"],
    "cross_contamination_warnings": ["list of warnings"],
    "allergen_free_claims": ["list of claims like 'gluten-free', 'dairy-free'"]
  },
  "confidence": 0.0-1.0
}`;

/**
 * Responsibility Dimension Analysis Prompt
 * 
 * Analyzes ethical sourcing, fair trade, labor practices, and social responsibility.
 * Score: 0-100 (100 = highly responsible, ethical production)
 */
export const RESPONSIBILITY_DIMENSION_PROMPT = `RESPONSIBILITY DIMENSION ANALYSIS (Score 0-100):

Analyze the ethical and social responsibility aspects of this product:

POSITIVE INDICATORS (increase score):
- Fair Trade certification (Fair Trade USA, Fair Trade International)
- Organic certification (USDA Organic, EU Organic)
- B Corporation certification
- Rainforest Alliance certification
- UTZ certification
- Direct trade or farmer-owned cooperatives
- Living wage commitments
- Worker welfare programs
- Community development initiatives
- Transparent supply chain
- Local sourcing
- Small-scale or family-owned production
- Women-owned or minority-owned business
- Social enterprise model

ANIMAL WELFARE (if applicable):
- Certified Humane
- Animal Welfare Approved
- Free-range or pasture-raised
- Cage-free
- No antibiotics or hormones
- Grass-fed
- Marine Stewardship Council (for seafood)

NEGATIVE INDICATORS (decrease score):
- Known labor violations
- Child labor concerns
- Unfair wages
- Poor working conditions
- Lack of transparency
- Controversial sourcing
- Factory farming (if animal products)
- Exploitation concerns

SCORING GUIDELINES:
- 90-100: Multiple certifications, strong ethical commitments, transparent
- 80-89: Fair Trade or equivalent, good practices visible
- 70-79: Some ethical indicators, organic or similar certification
- 60-69: Basic ethical standards, limited transparency
- 50-59: No clear ethical indicators, standard industry practices
- 40-49: Some concerns, lack of transparency
- 30-39: Known issues, poor practices
- 0-29: Serious ethical violations, exploitation

NOTE: If no information is visible on packaging, score 50-60 (neutral/unknown)

CRITICAL: Return ONLY valid JSON with no additional text, explanations, or markdown formatting.

Return this exact JSON structure:
{
  "score": 0-100,
  "explanation": "2-3 sentence summary of responsibility profile",
  "key_factors": [
    "Certifications present",
    "Ethical indicators",
    "Transparency level",
    "Concerns or unknowns"
  ],
  "certifications_found": ["list of certifications visible on packaging"],
  "confidence": 0.0-1.0
}`;

/**
 * Environmental Dimension Analysis Prompt
 * 
 * Analyzes environmental impact, packaging sustainability, and eco-friendliness.
 * Score: 0-100 (100 = minimal environmental impact, highly sustainable)
 */
export const ENVIRONMENTAL_DIMENSION_PROMPT = `ENVIRONMENTAL DIMENSION ANALYSIS (Score 0-100):

Analyze the environmental impact and sustainability of this product:

PACKAGING ASSESSMENT:
Positive (increase score):
- Recyclable packaging (paper, cardboard, glass, aluminum)
- Minimal packaging
- Recycled content (post-consumer recycled materials)
- Biodegradable or compostable packaging
- Reusable container
- Plastic-free packaging
- FSC-certified paper/cardboard
- Concentrated formula (less shipping weight)

Negative (decrease score):
- Excessive packaging (multiple layers)
- Non-recyclable plastics (#3, #6, #7)
- Mixed materials (hard to recycle)
- Single-use plastic
- Styrofoam/polystyrene
- Black plastic (not recyclable)
- Plastic film or wrap

ENVIRONMENTAL CERTIFICATIONS:
- Carbon Neutral certification
- Climate Neutral certification
- Certified B Corporation (environmental standards)
- USDA Organic (environmental benefits)
- Regenerative Organic Certified
- Salmon-Safe (for agriculture)
- Demeter Biodynamic
- Leaping Bunny (cruelty-free)
- Vegan certification (lower carbon footprint)

PRODUCT CHARACTERISTICS:
Positive:
- Plant-based (lower carbon footprint than animal products)
- Locally sourced (less transportation)
- Seasonal ingredients
- Water-efficient production
- Renewable energy in production
- Zero waste production claims

Negative:
- High carbon footprint ingredients (beef, lamb, air-freighted foods)
- Water-intensive ingredients (almonds, rice in drought areas)
- Palm oil (deforestation concerns) unless RSPO certified
- Overfished species
- Imported from far distances
- Energy-intensive production

SCORING GUIDELINES:
- 90-100: Minimal packaging, multiple eco-certifications, sustainable ingredients
- 80-89: Recyclable packaging, some certifications, low-impact ingredients
- 70-79: Mostly recyclable, organic or similar, moderate impact
- 60-69: Standard packaging, some recyclable, average impact
- 50-59: Mixed packaging, no certifications, moderate concerns
- 40-49: Excessive packaging, high-impact ingredients
- 30-39: Non-recyclable packaging, multiple environmental concerns
- 0-29: Extremely wasteful, severe environmental impact

CRITICAL: Return ONLY valid JSON with no additional text, explanations, or markdown formatting.

Return this exact JSON structure:
{
  "score": 0-100,
  "explanation": "2-3 sentence summary of environmental impact",
  "key_factors": [
    "Packaging assessment",
    "Certifications present",
    "Product characteristics",
    "Overall sustainability"
  ],
  "packaging_details": {
    "materials": ["list of packaging materials"],
    "recyclable": true/false,
    "recycled_content": true/false,
    "concerns": ["list of packaging concerns"]
  },
  "certifications_found": ["list of environmental certifications"],
  "confidence": 0.0-1.0
}`;

/**
 * Dimension Analysis Prompts Object
 * 
 * Provides easy access to individual dimension prompts.
 */
export const DimensionPrompts = {
  health: HEALTH_DIMENSION_PROMPT,
  processing: PROCESSING_DIMENSION_PROMPT,
  allergens: ALLERGENS_DIMENSION_PROMPT,
  responsibility: RESPONSIBILITY_DIMENSION_PROMPT,
  environmental: ENVIRONMENTAL_DIMENSION_PROMPT,
} as const;

/**
 * Dimension names type
 */
export type DimensionName = keyof typeof DimensionPrompts;

/**
 * All dimension names
 */
export const ALL_DIMENSIONS: DimensionName[] = [
  'health',
  'processing',
  'allergens',
  'responsibility',
  'environmental',
];

/**
 * Combine multiple dimension analysis prompts into a single comprehensive prompt
 * 
 * @param dimensions - Array of dimension names to include (e.g., ['health', 'processing'])
 * @param productContext - Optional product context (name, brand, category)
 * @returns Combined prompt string
 * 
 * @example
 * // Analyze all dimensions
 * const prompt = combineDimensionPrompts(['health', 'processing', 'allergens', 'responsibility', 'environmental']);
 * 
 * @example
 * // Analyze only health and allergens
 * const prompt = combineDimensionPrompts(['health', 'allergens']);
 * 
 * @example
 * // Analyze with product context
 * const prompt = combineDimensionPrompts(['health', 'processing'], {
 *   name: 'Organic Granola',
 *   brand: 'Nature Valley',
 *   category: 'Breakfast Foods'
 * });
 */
export function combineDimensionPrompts(
  dimensions: DimensionName[],
  productContext?: {
    name?: string;
    brand?: string;
    category?: string;
  }
): string {
  if (dimensions.length === 0) {
    throw new Error('At least one dimension must be specified');
  }

  // Validate dimension names
  const invalidDimensions = dimensions.filter(d => !ALL_DIMENSIONS.includes(d));
  if (invalidDimensions.length > 0) {
    throw new Error(`Invalid dimension names: ${invalidDimensions.join(', ')}`);
  }

  let prompt = 'Analyze this product across the following dimensions:\n\n';

  // Add product context if provided
  if (productContext) {
    prompt += 'PRODUCT CONTEXT:\n';
    if (productContext.name) prompt += `- Name: ${productContext.name}\n`;
    if (productContext.brand) prompt += `- Brand: ${productContext.brand}\n`;
    if (productContext.category) prompt += `- Category: ${productContext.category}\n`;
    prompt += '\n';
  }

  // Add each dimension prompt
  dimensions.forEach((dimension, index) => {
    prompt += `DIMENSION ${index + 1}: ${dimension.toUpperCase()}\n\n`;
    prompt += DimensionPrompts[dimension];
    prompt += '\n\n';
    prompt += '---\n\n';
  });

  // Add response format instructions
  prompt += 'Return a JSON object with analysis for each dimension:\n\n';
  prompt += '{\n';
  prompt += '  "dimensions": {\n';
  dimensions.forEach((dimension, index) => {
    const comma = index < dimensions.length - 1 ? ',' : '';
    prompt += `    "${dimension}": {\n`;
    prompt += '      "score": 0-100,\n';
    prompt += '      "explanation": "...",\n';
    prompt += '      "key_factors": ["...", "...", "..."],\n';
    prompt += '      "confidence": 0.0-1.0\n';
    prompt += `    }${comma}\n`;
  });
  prompt += '  },\n';
  prompt += '  "overall_confidence": 0.0-1.0\n';
  prompt += '}\n\n';
  prompt += 'Return ONLY the JSON object, no additional text or markdown formatting.';

  return prompt;
}

/**
 * Get a single dimension prompt
 * 
 * @param dimension - Dimension name
 * @returns Dimension prompt string
 * 
 * @example
 * const healthPrompt = getDimensionPrompt('health');
 */
export function getDimensionPrompt(dimension: DimensionName): string {
  return DimensionPrompts[dimension];
}

/**
 * Get all dimension prompts combined
 * 
 * @param productContext - Optional product context
 * @returns Combined prompt for all dimensions
 * 
 * @example
 * const allDimensionsPrompt = getAllDimensionsPrompt();
 */
export function getAllDimensionsPrompt(productContext?: {
  name?: string;
  brand?: string;
  category?: string;
}): string {
  return combineDimensionPrompts(ALL_DIMENSIONS, productContext);
}

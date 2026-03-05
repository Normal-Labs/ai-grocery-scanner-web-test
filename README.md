# AI Grocery Scanner

A mobile-first web application that enables consumers to capture images of grocery products and receive instant AI-powered insights about health, sustainability, carbon impact, preservatives, and allergens using Gemini 2.0 Flash.

## Features

- 📸 **Camera Capture**: Use your device camera to scan grocery products (no barcode entry required)
- 🦸 **Product Hero Mode**: Guided multi-image capture workflow (barcode → packaging → nutrition label) for complete product profiles
- 🤖 **AI Analysis**: Powered by Google's Gemini 2.0 Flash with Research Agent for deep product insights
- 🥗 **Nutrition Label Analysis**: Scan nutrition facts labels for instant health scoring, allergen detection, and ingredient analysis
- 🏷️ **Smart Badges**: Visual indicators for Health, Sustainability, Carbon Impact, Preservatives, and Allergens
- ⚡ **Smart Caching**: Image-based caching with MongoDB for instant repeat scans
- 🔐 **Authentication**: Secure user authentication with Supabase Auth
- 📊 **Data Source Indicators**: Clear visual feedback showing whether data came from cache or fresh AI analysis
- 📱 **Mobile-First**: Optimized for iPhone Safari and mobile browsers
- 🔒 **Secure**: API keys protected server-side, security headers configured
- 💾 **Persistent Storage**: Scan history and product data stored in Supabase and MongoDB
- 🐛 **Detailed Error Reporting**: Enhanced error display with timestamp, context, and copy-to-clipboard for field testing

## Tech Stack

- **Framework**: Next.js 16 with App Router and Turbopack
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4
- **AI**: Vercel AI SDK + Google Gemini 2.0 Flash + Tavily Search API
- **Authentication**: Supabase Auth
- **Databases**: 
  - MongoDB Atlas (AI insights cache)
  - Supabase (product registry, user data, inventory tracking)
- **Testing**: Jest + React Testing Library + fast-check (property-based testing)

## Documentation

📚 **[Complete Documentation Index](DOCS_INDEX.md)** - Start here for all documentation

### Quick Links

- **Setup & Configuration**
  - [Setup Guide](SETUP.md)
  - [Required Environment Variables](REQUIRED_ENV_VARS.md)
  - [MongoDB Setup](MONGODB_SETUP.md)

- **Extraction Testing**
  - [Extraction Testing Overview](EXTRACTION_TESTING.md)
  - [Ingredients Extraction Guide](INGREDIENTS_EXTRACTION_GUIDE.md)
  - [Nutrition Extraction Guide](NUTRITION_EXTRACTION_GUIDE.md)

- **Database & Schema**
  - [Products Dev Migration](PRODUCTS_DEV_MIGRATION.md)
  - [Ingredients Column Migration](INGREDIENTS_COLUMN_MIGRATION.md)

- **Deployment**
  - [Vercel Deployment](VERCEL_DEPLOYMENT.md)
  - [Deployment Checklist](DEPLOYMENT_CHECKLIST.md)

### Test Pages

Test and validate extraction functionality:
- `/test-barcode` - Barcode detection testing
- `/test-packaging` - Product info extraction testing
- `/test-ingredients` - Ingredient list extraction testing
- `/test-nutrition` - Nutrition facts extraction testing

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm or yarn
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))
- Tavily API key ([Get one here](https://tavily.com/)) - for Research Agent
- MongoDB Atlas account ([Sign up here](https://www.mongodb.com/cloud/atlas))
- Supabase account ([Sign up here](https://supabase.com/))

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ai-grocery-scanner
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

4. Edit `.env.local` and add your API keys and database credentials:
```bash
# Required
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ai_grocery_scanner?retryWrites=true&w=majority
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Optional
TAVILY_API_KEY=your_tavily_api_key
BARCODE_LOOKUP_API_KEY=your_barcode_lookup_api_key
RATE_LIMIT_MAX_REQUESTS=10
RATE_LIMIT_WINDOW_MS=60000
```

See [REQUIRED_ENV_VARS.md](REQUIRED_ENV_VARS.md) for a quick reference of all environment variables.

### Development

Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Testing

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Run tests with coverage:
```bash
npm run test:coverage
```

### Building for Production

Build the application:
```bash
npm run build
```

Start the production server:
```bash
npm start
```

## Project Structure

```
ai-grocery-scanner/
├── src/
│   ├── app/              # Next.js App Router pages and API routes
│   │   ├── api/
│   │   │   └── analyze/  # Image analysis API endpoint
│   │   ├── page.tsx      # Main scanner page
│   │   └── layout.tsx    # Root layout
│   ├── components/       # React components
│   │   ├── CameraCapture.tsx
│   │   ├── ImagePreview.tsx
│   │   ├── ScanButton.tsx
│   │   ├── InsightsDisplay.tsx
│   │   └── SmartBadge.tsx
│   ├── hooks/            # Custom React hooks
│   │   ├── useCamera.ts
│   │   └── useAnalysis.ts
│   └── lib/              # Utility functions and types
│       ├── types.ts      # TypeScript type definitions
│       ├── gemini.ts     # Gemini API utilities
│       └── storage.ts    # LocalStorage utilities
├── public/               # Static assets
├── .env.local.example    # Environment variables template
├── jest.config.js        # Jest configuration
├── jest.setup.js         # Jest setup file
├── next.config.ts        # Next.js configuration
├── tailwind.config.ts    # Tailwind CSS configuration
└── tsconfig.json         # TypeScript configuration
```

## Configuration

### Environment Variables

**Required:**
- `GOOGLE_GENERATIVE_AI_API_KEY`: Your Gemini API key for AI analysis
- `MONGODB_URI`: MongoDB Atlas connection string for caching AI insights
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Your Supabase publishable API key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (server-side only, never expose to client)

**Optional:**
- `TAVILY_API_KEY`: Your Tavily API key for web search (Research Agent)
- `BARCODE_LOOKUP_API_KEY`: Your Barcode Lookup API key for Tier 3 discovery
- `NEXT_PUBLIC_APP_URL`: Application URL for production
- `RATE_LIMIT_MAX_REQUESTS`: Maximum requests per time window (default: 10)
- `RATE_LIMIT_WINDOW_MS`: Rate limit time window in milliseconds (default: 60000)
- `DEV_USER_TIER`: Development tier override ('free' or 'premium')

See [REQUIRED_ENV_VARS.md](REQUIRED_ENV_VARS.md) for a quick reference guide.

### Architecture

**Cache-First Flow:**
1. User scans product image
2. System generates image hash for cache lookup
3. Check MongoDB cache for existing insights
4. If cache hit: Return instant results ⚡
5. If cache miss: Call Gemini AI → Save to cache → Return results
6. Product metadata saved to Supabase for tracking

**Data Sources:**
- **MongoDB**: AI-generated insights cache (30-day TTL)
- **Supabase**: User authentication, product registry, store locations, inventory tracking
- **Gemini 2.0 Flash**: Fresh AI analysis with Research Agent capabilities

### Security Headers

The application includes comprehensive security headers configured in `next.config.ts`:
- Content Security Policy (CSP)
- Strict Transport Security (HSTS)
- X-Frame-Options
- X-Content-Type-Options
- And more...

### Image Optimization

Next.js image optimization is configured for optimal performance:
- AVIF and WebP format support
- Responsive image sizes for various devices
- Automatic lazy loading

## Deployment

### Vercel (Recommended)

See [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) for complete deployment instructions.

**Quick steps:**
1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables (see [REQUIRED_ENV_VARS.md](REQUIRED_ENV_VARS.md))
4. Configure MongoDB Atlas network access (see [MONGODB_SETUP.md](MONGODB_SETUP.md))
5. Deploy!

**Important:** Make sure to:
- Add `SUPABASE_SERVICE_ROLE_KEY` to Vercel environment variables
- Whitelist Vercel IPs (0.0.0.0/0) in MongoDB Atlas Network Access
- Use `mongodb+srv://` protocol in your MongoDB connection string

### Other Platforms

The application can be deployed to any platform that supports Next.js:
- Netlify
- AWS Amplify
- Google Cloud Run
- Docker containers

For detailed troubleshooting, see [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md).

## Browser Support

- Safari iOS 15+
- Chrome (mobile and desktop)
- Firefox (mobile and desktop)
- Edge (mobile and desktop)

## License

MIT

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting PRs.

## Support

For issues and questions, please open an issue on GitHub.

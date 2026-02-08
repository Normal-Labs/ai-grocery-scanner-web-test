# AI Grocery Scanner

A mobile-first web application that enables consumers to capture images of grocery products and receive instant AI-powered insights about health, sustainability, carbon impact, preservatives, and allergens using Gemini 2.0 Flash.

## Features

- 📸 **Camera Capture**: Use your device camera to scan grocery products
- 🤖 **AI Analysis**: Powered by Google's Gemini 2.0 Flash for multimodal image analysis
- 🏷️ **Smart Badges**: Visual indicators for Health, Sustainability, Carbon Impact, Preservatives, and Allergens
- 📱 **Mobile-First**: Optimized for iPhone Safari and mobile browsers
- 🔒 **Secure**: API keys protected server-side, security headers configured
- 💾 **Local Storage**: Recent scans saved locally for quick review

## Tech Stack

- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4
- **AI SDK**: Vercel AI SDK + Google Generative AI
- **Testing**: Jest + React Testing Library + fast-check (property-based testing)

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm or yarn
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

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

4. Edit `.env.local` and add your Gemini API key:
```
GOOGLE_GENERATIVE_AI_API_KEY=your_actual_api_key_here
```

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

- `GOOGLE_GENERATIVE_AI_API_KEY` (required): Your Gemini API key
- `NEXT_PUBLIC_APP_URL` (optional): Application URL for production
- `RATE_LIMIT_MAX_REQUESTS` (optional): Maximum requests per time window (default: 10)
- `RATE_LIMIT_WINDOW_MS` (optional): Rate limit time window in milliseconds (default: 60000)

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

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Other Platforms

The application can be deployed to any platform that supports Next.js:
- Netlify
- AWS Amplify
- Google Cloud Run
- Docker containers

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

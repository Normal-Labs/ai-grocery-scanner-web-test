#!/bin/bash

# Setup Vertex AI Credentials for Local Development
# This script helps you configure authentication for the Gemini API

echo "🔐 Vertex AI Credentials Setup"
echo "================================"
echo ""

# Check if service account file exists in Downloads
SERVICE_ACCOUNT_FILE="/Users/christophermehmed/Downloads/gen-lang-client-0628770168-3334b0cae0bb.json"

if [ -f "$SERVICE_ACCOUNT_FILE" ]; then
    echo "✅ Found service account file in Downloads"
    echo ""
    echo "Choose setup method:"
    echo "1) Copy service account to project (recommended)"
    echo "2) Use gcloud CLI authentication"
    echo ""
    read -p "Enter choice (1 or 2): " choice
    
    if [ "$choice" = "1" ]; then
        # Copy service account to project
        echo ""
        echo "📋 Copying service account to project..."
        cp "$SERVICE_ACCOUNT_FILE" ./service-account-key.json
        
        # Add to .gitignore if not already there
        if ! grep -q "service-account-key.json" .gitignore 2>/dev/null; then
            echo "service-account-key.json" >> .gitignore
            echo "✅ Added service-account-key.json to .gitignore"
        fi
        
        # Add to .env.local if not already there
        if ! grep -q "GOOGLE_APPLICATION_CREDENTIALS=" .env.local 2>/dev/null; then
            echo "" >> .env.local
            echo "# Vertex AI Authentication (Local Development)" >> .env.local
            echo "GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json" >> .env.local
            echo "✅ Added GOOGLE_APPLICATION_CREDENTIALS to .env.local"
        else
            echo "⚠️  GOOGLE_APPLICATION_CREDENTIALS already exists in .env.local"
            echo "   Please verify it points to: ./service-account-key.json"
        fi
        
        echo ""
        echo "✅ Setup complete!"
        echo ""
        echo "Next steps:"
        echo "1. Restart your dev server: npm run dev"
        echo "2. Test the /test-all page"
        echo ""
        
    elif [ "$choice" = "2" ]; then
        echo ""
        echo "🔑 Setting up gcloud authentication..."
        echo ""
        echo "Run these commands:"
        echo ""
        echo "  gcloud auth application-default login"
        echo "  gcloud config set project gen-lang-client-0628770168"
        echo ""
        echo "Then restart your dev server: npm run dev"
        echo ""
    else
        echo "❌ Invalid choice"
        exit 1
    fi
else
    echo "❌ Service account file not found at:"
    echo "   $SERVICE_ACCOUNT_FILE"
    echo ""
    echo "Options:"
    echo "1) Download the service account key from Google Cloud Console"
    echo "2) Use gcloud CLI authentication:"
    echo "   gcloud auth application-default login"
    echo "   gcloud config set project gen-lang-client-0628770168"
    echo ""
fi

#!/bin/bash

# TankManage Build Script for Production Deployment

echo "🚀 Building TankManage for production..."

# Check if we're in the right directory
if [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install

# Build the frontend
echo "🔨 Building frontend..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Frontend build completed successfully!"
    echo "📁 Build output: frontend/dist/"
    echo ""
    echo "🎯 Next steps:"
    echo "1. Upload the contents of frontend/dist/ to Cloudflare Pages"
    echo "2. Set environment variable VITE_API_URL to your backend API URL"
    echo "3. Configure your domain tankmanage.teamskrn.xyz in Cloudflare"
    echo ""
    echo "📖 See DEPLOYMENT.md for detailed instructions"
else
    echo "❌ Frontend build failed!"
    exit 1
fi 
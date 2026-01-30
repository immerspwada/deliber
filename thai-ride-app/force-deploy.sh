#!/bin/bash

# 🚀 Force Deploy to Vercel Production
# This script forces a new deployment to Vercel

echo "🚀 Force Deploy to Vercel Production"
echo "===================================="
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found"
    echo ""
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
    echo ""
fi

# Check Vercel login status
echo "🔐 Checking Vercel login status..."
vercel whoami &> /dev/null
if [ $? -ne 0 ]; then
    echo "❌ Not logged in to Vercel"
    echo ""
    echo "Please run: vercel login"
    exit 1
fi

echo "✅ Logged in to Vercel"
echo ""

# Show current git status
echo "📊 Current Git Status:"
echo "-------------------"
git log --oneline -1
echo ""

# Build locally first to check for errors
echo "🔨 Building locally to check for errors..."
npm run build

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Build failed! Please fix errors before deploying."
    exit 1
fi

echo ""
echo "✅ Local build successful"
echo ""

# Deploy to production
echo "🚀 Deploying to Vercel Production..."
echo "-----------------------------------"
vercel --prod --yes

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Wait 30 seconds for deployment to propagate"
    echo "2. Hard refresh browser: Cmd + Shift + R"
    echo "3. Check Network tab for new bundle hash"
    echo "4. Test the ⏰ History button"
else
    echo ""
    echo "❌ Deployment failed!"
    echo ""
    echo "💡 Troubleshooting:"
    echo "1. Check Vercel dashboard: https://vercel.com/dashboard"
    echo "2. Check build logs for errors"
    echo "3. Try: vercel --prod --force"
fi

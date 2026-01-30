#!/bin/bash

# 🔧 Clear Cache and Restart Dev Server
# =====================================
# Fixes browser cache issues with Vite HMR

echo "🛑 Stopping dev server..."
pkill -f "vite" 2>/dev/null || killall node 2>/dev/null || true

echo "🗑️  Clearing Vite cache..."
rm -rf node_modules/.vite

echo "🗑️  Clearing dist folder..."
rm -rf dist

echo "🗑️  Clearing other caches..."
rm -rf .cache 2>/dev/null || true

echo ""
echo "✅ Cache cleared!"
echo ""
echo "📋 Next steps:"
echo "   1. Run: npm run dev"
echo "   2. In browser:"
echo "      - Open DevTools (F12)"
echo "      - Go to Application tab"
echo "      - Click 'Clear site data'"
echo "      - Unregister all Service Workers"
echo "   3. Hard refresh:"
echo "      - Mac: Cmd + Shift + R"
echo "      - Windows: Ctrl + Shift + R"
echo ""
echo "🚀 Starting dev server..."
npm run dev

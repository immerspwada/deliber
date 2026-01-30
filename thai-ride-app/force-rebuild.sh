#!/bin/bash

echo "🔥 Force Rebuild - Clearing Everything..."

# 1. Kill all processes
pkill -f "vite"
pkill -f "node"
sleep 2

# 2. Remove all caches
echo "📦 Removing caches..."
rm -rf node_modules/.vite
rm -rf dist
rm -rf .nuxt
rm -rf .output

# 3. Remove node_modules (optional - uncomment if needed)
# echo "🗑️  Removing node_modules..."
# rm -rf node_modules
# rm -rf package-lock.json
# npm install

# 4. Start fresh
echo "🚀 Starting dev server..."
npm run dev

echo ""
echo "✅ Complete! Now do these steps:"
echo "1. Open http://localhost:5173/admin/customers"
echo "2. Press Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)"
echo "3. Open DevTools → Application → Clear site data"
echo "4. Reload again"

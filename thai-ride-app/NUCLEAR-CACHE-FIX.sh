#!/bin/bash

# 🔥 NUCLEAR CACHE FIX - Admin Customers History Button
# ======================================================
# This script performs a complete cache purge

echo "🔥 NUCLEAR CACHE FIX - Starting..."
echo ""

# Step 1: Kill ALL Node/Vite processes
echo "1️⃣ Killing all Node/Vite processes..."
pkill -9 -f "vite" 2>/dev/null || true
pkill -9 -f "node" 2>/dev/null || true
killall -9 node 2>/dev/null || true
sleep 2

# Step 2: Remove ALL cache directories
echo "2️⃣ Removing all cache directories..."
rm -rf node_modules/.vite
rm -rf node_modules/.cache
rm -rf .vite
rm -rf .cache
rm -rf dist
rm -rf .nuxt
rm -rf .output
rm -rf .vercel/.output

# Step 3: Clear npm cache
echo "3️⃣ Clearing npm cache..."
npm cache clean --force 2>/dev/null || true

# Step 4: Remove lock files (optional - uncomment if needed)
# echo "4️⃣ Removing lock files..."
# rm -f package-lock.json
# rm -f yarn.lock
# rm -f pnpm-lock.yaml

echo ""
echo "✅ Cache cleared successfully!"
echo ""
echo "📋 CRITICAL NEXT STEPS:"
echo ""
echo "1. Start dev server:"
echo "   npm run dev"
echo ""
echo "2. In your browser (MUST DO ALL):"
echo "   a) Open DevTools (F12 or Cmd+Option+I)"
echo "   b) Go to 'Application' tab"
echo "   c) Click 'Clear site data' button"
echo "   d) Check ALL boxes and click 'Clear site data'"
echo "   e) Go to 'Service Workers' section"
echo "   f) Click 'Unregister' for ALL service workers"
echo "   g) Close DevTools"
echo ""
echo "3. Hard refresh (CRITICAL):"
echo "   Mac: Cmd + Shift + R (hold all 3 keys)"
echo "   Windows: Ctrl + Shift + R (hold all 3 keys)"
echo "   OR: Right-click reload → 'Empty Cache and Hard Reload'"
echo ""
echo "4. If STILL not working:"
echo "   - Close browser completely"
echo "   - Reopen browser"
echo "   - Navigate to http://localhost:5173/admin/customers"
echo ""
echo "🎯 Expected result:"
echo "   You should see 3 buttons: [👁️ View] [🕐 History] [🚫 Suspend]"
echo ""

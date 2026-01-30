#!/bin/bash

# 🔥 NUCLEAR OPTION: Complete localhost cache reset
# This will force your browser to load fresh code

echo "🔥 NUCLEAR CACHE RESET - Force localhost to work"
echo "================================================"
echo ""

# Step 1: Kill dev server
echo "1️⃣ Killing dev server..."
pkill -f "vite" || true
sleep 2

# Step 2: Clear ALL Vite caches
echo "2️⃣ Clearing Vite caches..."
rm -rf node_modules/.vite
rm -rf .vite
rm -rf dist
rm -rf .nuxt
rm -rf .output

# Step 3: Clear browser caches (instructions)
echo ""
echo "3️⃣ NOW DO THIS IN YOUR BROWSER:"
echo "   ================================"
echo "   1. Open Chrome DevTools (Cmd+Option+I)"
echo "   2. Right-click the refresh button"
echo "   3. Select 'Empty Cache and Hard Reload'"
echo "   4. OR use keyboard: Cmd+Shift+R (hold all 3 keys)"
echo ""
echo "   🚨 CRITICAL: You MUST do this or it won't work!"
echo ""

# Step 4: Add cache-busting query param to force reload
echo "4️⃣ Adding cache-busting timestamp..."
TIMESTAMP=$(date +%s)
echo "   Timestamp: $TIMESTAMP"

# Step 5: Start dev server with fresh cache
echo ""
echo "5️⃣ Starting dev server with fresh cache..."
echo "   Server will start in 3 seconds..."
sleep 3

npm run dev &
DEV_PID=$!

echo ""
echo "✅ Dev server started (PID: $DEV_PID)"
echo ""
echo "📍 NEXT STEPS:"
echo "   1. Wait for server to be ready (check terminal)"
echo "   2. Open: http://localhost:5173/admin/customers?v=$TIMESTAMP"
echo "   3. Do hard refresh: Cmd+Shift+R"
echo "   4. Click the history button (clock icon)"
echo ""
echo "🎯 If it STILL doesn't work, try INCOGNITO mode:"
echo "   Cmd+Shift+N → http://localhost:5173/admin/customers"
echo ""

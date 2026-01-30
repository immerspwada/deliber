#!/bin/bash

echo "🔥 FIXING HISTORY BUTTON - Complete Cache Clear"
echo "================================================"
echo ""

# Step 1: Kill all Vite processes
echo "1️⃣ Killing Vite processes..."
pkill -f "vite" 2>/dev/null
pkill -f "node.*vite" 2>/dev/null
sleep 2
echo "✅ Vite stopped"
echo ""

# Step 2: Clear Vite cache
echo "2️⃣ Clearing Vite cache..."
rm -rf node_modules/.vite
rm -rf dist
echo "✅ Vite cache cleared"
echo ""

# Step 3: Start dev server
echo "3️⃣ Starting fresh dev server..."
npm run dev &
DEV_PID=$!
echo "✅ Dev server starting (PID: $DEV_PID)"
echo ""

# Wait for server to start
echo "⏳ Waiting for server to start (10 seconds)..."
sleep 10
echo ""

echo "================================================"
echo "✅ SERVER READY!"
echo "================================================"
echo ""
echo "📋 NOW DO THESE STEPS IN BROWSER:"
echo ""
echo "1. Open: http://localhost:5173/admin/customers"
echo "2. Open DevTools (F12 or Cmd+Option+I)"
echo "3. Go to 'Application' tab"
echo "4. Click 'Storage' → 'Clear site data'"
echo "5. Go to 'Service Workers' → Unregister all"
echo "6. Press Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)"
echo ""
echo "🎯 You should now see 3 buttons:"
echo "   👁️  ดูรายละเอียด"
echo "   🕐 ดูประวัติลูกค้า  ← THIS ONE!"
echo "   🚫 ระงับการใช้งาน"
echo ""
echo "================================================"

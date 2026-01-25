#!/bin/bash

# Fix Vite HMR Cache Issue
# This script clears Vite's cache and restarts the dev server

echo "🔧 Fixing Vite cache issue..."
echo ""

# Step 1: Clear Vite cache
echo "1️⃣ Clearing Vite cache..."
rm -rf node_modules/.vite
echo "✅ Vite cache cleared"
echo ""

# Step 2: Clear browser cache instruction
echo "2️⃣ Now do a hard refresh in your browser:"
echo "   • Mac: Cmd + Shift + R"
echo "   • Windows/Linux: Ctrl + Shift + R"
echo ""

# Step 3: Restart instruction
echo "3️⃣ Restart your dev server:"
echo "   npm run dev"
echo ""

echo "✅ Done! The handleStatusChange function should now work."

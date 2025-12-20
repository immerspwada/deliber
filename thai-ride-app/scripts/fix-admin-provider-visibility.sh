#!/bin/bash

# Quick Fix Script: Admin Provider Visibility
# แก้ไขปัญหา customer@demo.com ไม่ปรากฏใน /admin/providers

echo "🔧 Admin Provider Visibility Fix Script"
echo "========================================"
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

echo "✓ Supabase CLI found"
echo ""

# Check if we're in the right directory
if [ ! -f "supabase/migrations/100_fix_admin_provider_visibility.sql" ]; then
    echo "❌ Migration file not found. Are you in the thai-ride-app directory?"
    exit 1
fi

echo "✓ Migration file found"
echo ""

# Run the migration
echo "📦 Running migration..."
supabase db push

if [ $? -eq 0 ]; then
    echo "✅ Migration applied successfully!"
else
    echo "❌ Migration failed. Check the error above."
    exit 1
fi

echo ""
echo "🔍 Running debug queries..."
echo ""

# Run debug queries
supabase db execute --file debug-provider-check.sql

echo ""
echo "✅ Fix completed!"
echo ""
echo "Next steps:"
echo "1. Open http://localhost:5173/admin/login"
echo "2. Login with admin@demo.com / admin1234"
echo "3. Go to /admin/providers"
echo "4. Check if customer@demo.com appears in the list"
echo ""
echo "If you still don't see the provider:"
echo "- Check browser console for errors"
echo "- Check Supabase logs"
echo "- Run: npm run dev and check terminal logs"

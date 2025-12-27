#!/bin/bash
# =====================================================
# Deploy Admin Dashboard Fix
# =====================================================

echo "🚀 Deploying Admin Dashboard Fix..."

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first."
    echo "   npm install -g supabase"
    exit 1
fi

# Navigate to project directory
cd "$(dirname "$0")/.." || exit 1

echo "📦 Running migration 179_complete_admin_fix.sql..."

# Push the migration
supabase db push

if [ $? -eq 0 ]; then
    echo "✅ Migration deployed successfully!"
    echo ""
    echo "🔍 Testing Admin Functions..."
    
    # Run diagnostic script
    supabase db execute --file scripts/diagnose-admin-issues.sql
    
    echo ""
    echo "✅ Admin Dashboard Fix Complete!"
    echo ""
    echo "📋 Next Steps:"
    echo "   1. Refresh Admin Dashboard at /admin"
    echo "   2. Check browser console for any errors"
    echo "   3. Verify data is showing in all sections"
else
    echo "❌ Migration failed. Check the error above."
    exit 1
fi

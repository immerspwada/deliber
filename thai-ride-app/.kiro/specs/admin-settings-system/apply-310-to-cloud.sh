#!/bin/bash

# Apply Migration 310 to Supabase Cloud
# =====================================

echo "🚀 Admin Settings System - Cloud Deployment"
echo "==========================================="
echo ""

# Check if project is linked
if [ ! -f ".supabase/config.toml" ]; then
    echo "❌ Project not linked to Supabase Cloud"
    echo ""
    echo "Please run:"
    echo "  npx supabase link --project-ref YOUR_PROJECT_REF"
    echo ""
    exit 1
fi

echo "✅ Project linked"
echo ""

# Check if migration 310 exists
if [ ! -f "supabase/migrations/310_comprehensive_admin_settings_system.sql" ]; then
    echo "❌ Migration 310 not found"
    exit 1
fi

echo "✅ Migration 310 found"
echo ""

# Ask for confirmation
echo "This will apply migration 310 to your Supabase Cloud project."
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled"
    exit 0
fi

echo ""
echo "📤 Applying migration 310..."
echo ""

# Apply migration
npx supabase db push

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration applied successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Update .env with your Supabase credentials"
    echo "2. Change USE_MOCK = false in src/views/AdminSettingsView.vue"
    echo "3. Run: npm run dev"
    echo "4. Visit: http://localhost:5173/admin/settings"
    echo ""
else
    echo ""
    echo "❌ Migration failed"
    echo ""
    echo "Try applying manually:"
    echo "1. Go to Supabase Dashboard → SQL Editor"
    echo "2. Copy content from supabase/migrations/310_comprehensive_admin_settings_system.sql"
    echo "3. Paste and Run"
    echo ""
    exit 1
fi


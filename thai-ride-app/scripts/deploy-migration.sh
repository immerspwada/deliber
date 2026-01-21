#!/bin/bash

# 🚀 Production Migration Deployment Script
# Apply Service Favorites & Promotions Migration

set -e

echo "🔍 Checking Supabase CLI..."
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

echo "📋 Checking project link..."
if [ ! -f "supabase/.temp/project-ref" ]; then
    echo "❌ Project not linked. Please run:"
    echo "supabase link --project-ref YOUR_PROJECT_REF"
    exit 1
fi

PROJECT_REF=$(cat supabase/.temp/project-ref 2>/dev/null || echo "")
if [ -z "$PROJECT_REF" ]; then
    echo "❌ No project reference found. Please link your project first."
    exit 1
fi

echo "🎯 Target Project: $PROJECT_REF"

echo "📊 Checking current migration status..."
supabase migration list --linked

echo "🚀 Applying migration 241_service_favorites_and_promotions.sql..."
if [ -f "supabase/migrations/241_service_favorites_and_promotions.sql" ]; then
    supabase db push --linked
    echo "✅ Migration applied successfully!"
else
    echo "❌ Migration file not found: supabase/migrations/241_service_favorites_and_promotions.sql"
    exit 1
fi

echo "🔄 Generating TypeScript types..."
supabase gen types typescript --linked > src/types/database.ts
echo "✅ Types generated successfully!"

echo "🧪 Testing database functions..."
echo "Testing get_user_favorite_services function..."
supabase sql --linked --execute "SELECT get_user_favorite_services('00000000-0000-0000-0000-000000000000');"

echo "Testing get_service_promotions function..."
supabase sql --linked --execute "SELECT get_service_promotions(NULL);"

echo "🎉 Migration deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Restart your development server"
echo "2. Test the favorite services functionality"
echo "3. Verify promotions are loading correctly"
echo "4. Check console for any remaining errors"
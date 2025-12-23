#!/bin/bash

# =====================================================
# Generate TypeScript Types from Supabase
# =====================================================

echo "🔧 Generating TypeScript types from Supabase..."
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found!"
    echo ""
    echo "📦 Install Supabase CLI:"
    echo "   npm install -g supabase"
    echo "   or"
    echo "   brew install supabase/tap/supabase"
    echo ""
    exit 1
fi

# Check if we're in the right directory
if [ ! -d "supabase" ]; then
    echo "❌ Error: supabase directory not found"
    echo "   Please run this script from the project root"
    exit 1
fi

# Backup existing types
if [ -f "src/types/database.ts" ]; then
    echo "📦 Backing up existing types..."
    cp src/types/database.ts src/types/database.ts.backup
    echo "✅ Backup created: src/types/database.ts.backup"
fi

# Generate types
echo ""
echo "🔄 Generating types..."
supabase gen types typescript --local > src/types/database.ts

if [ $? -eq 0 ]; then
    echo "✅ Types generated successfully!"
    echo ""
    echo "📄 File: src/types/database.ts"
    echo ""
    
    # Show file size
    SIZE=$(wc -c < src/types/database.ts)
    echo "📊 Size: $SIZE bytes"
    
    # Count tables
    TABLES=$(grep -c "Tables:" src/types/database.ts || echo "0")
    echo "📋 Tables: $TABLES"
    
    echo ""
    echo "✨ Done! Types are ready to use."
else
    echo "❌ Failed to generate types"
    echo ""
    echo "💡 Troubleshooting:"
    echo "   1. Make sure Supabase is running: supabase start"
    echo "   2. Check your supabase/config.toml"
    echo "   3. Verify migrations are applied"
    exit 1
fi
